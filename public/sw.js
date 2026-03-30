// TeklifPro Service Worker
// Amaç: Çevrimdışı desteği, cache yönetimi ve arka plan senkronizasyonu

// Cache İsimleri - Versiyon İçeren
const CACHE_NAMES = {
  shell: 'teklifpro-shell-v1',
  api: 'teklifpro-api-v1',
  assets: 'teklifpro-assets-v1'
};

// Pre-cache edilecek kritik sayfalar
const CRITICAL_ASSETS = [
  '/',
  '/tr/dashboard',
  '/tr/login',
  '/offline.html'
];

// API endpoint'leri tanımla
const API_PATTERNS = {
  proposals: /\/api\/proposals/,
  customers: /\/api\/customers/,
  sync: /\/api\/sync/
};

// ========================================
// INSTALL EVENT - İlk kurulum sırasında
// ========================================
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install başlıyor');

  event.waitUntil(
    caches.open(CACHE_NAMES.shell).then((cache) => {
      console.log('Service Worker: Kritik kaynaklar cache\'lenecek');
      return cache.addAll(CRITICAL_ASSETS);
    }).catch((err) => {
      console.error('Service Worker: Install hatası', err);
    })
  );

  // Hemen aktif et
  self.skipWaiting();
});

// ========================================
// ACTIVATE EVENT - Eski cache\'leri temizle
// ========================================
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate başlıyor');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Tanınan cache'ler hariç hepsini sil
          const isKnownCache = Object.values(CACHE_NAMES).includes(cacheName);
          if (!isKnownCache) {
            console.log('Service Worker: Eski cache siliniyor:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // Tüm sayfaları hemen kontrol et
  self.clients.claim();
});

// ========================================
// FETCH EVENT - İstek yönetimi
// ========================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Aynı kaynaktan olmayan istekleri başaramaz
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // Yönlendirme: İstek türüne göre cache stratejisi seç
  if (isApiRequest(url)) {
    // API çağrıları: Network-first + Stale-while-revalidate
    event.respondWith(networkFirstStrategy(request));
  } else if (isAssetRequest(url)) {
    // Resimler, yazı tipleri: Cache-first, uzun TTL
    event.respondWith(cacheFirstStrategy(request, CACHE_NAMES.assets));
  } else if (isDynamicPage(url)) {
    // Dinamik sayfalar: Network-first
    event.respondWith(networkFirstStrategy(request));
  } else {
    // App shell (HTML, CSS, JS): Cache-first + Network fallback
    event.respondWith(cacheFirstStrategy(request, CACHE_NAMES.shell));
  }
});

// ========================================
// CACHE STRATEJİLERİ
// ========================================

/**
 * Cache-First Strategy
 * Önce cache'den al, bulunamazsa network'ten al ve cache'le
 */
function cacheFirstStrategy(request, cacheName) {
  return caches.match(request).then((cachedResponse) => {
    // Cache'de varsa, önce cache'dekini döndür
    if (cachedResponse) {
      // Arka planda network'ten güncelle (stale-while-revalidate)
      updateCacheInBackground(request, cacheName);
      return cachedResponse;
    }

    // Cache'de yoksa network'ten al
    return fetch(request)
      .then((networkResponse) => {
        // Başarılı yanıtı cache'le
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(cacheName).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Network hatası ve cache'de de yoksa offline.html göster
        return caches.match('/offline.html').catch(() => {
          return new Response('Çevrimdışısınız. Lütfen internete bağlanın.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
      });
  });
}

/**
 * Network-First Strategy
 * Önce network'ten al, başarısız olursa cache'den al
 */
function networkFirstStrategy(request) {
  return fetch(request)
    .then((networkResponse) => {
      // Başarılı yanıtı cache'le (GET istekleri için)
      if (networkResponse && networkResponse.status === 200 && request.method === 'GET') {
        const responseToCache = networkResponse.clone();
        const cacheName = isApiRequest(new URL(request.url)) ? CACHE_NAMES.api : CACHE_NAMES.shell;
        caches.open(cacheName).then((cache) => {
          cache.put(request, responseToCache);
        });
      }
      return networkResponse;
    })
    .catch(() => {
      // Network hatası, cache'den al
      return caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log('Service Worker: Cache\'den yanıt gönderiliyor:', request.url);
          return cachedResponse;
        }

        // GET isteği değilse veya cache'de yoksa failed queue'ye ekle
        if (request.method !== 'GET') {
          addToFailedQueue(request);
        }

        // Offline fallback
        return caches.match('/offline.html').catch(() => {
          return new Response('Çevrimdışısınız. Lütfen internete bağlanın.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
      });
    });
}

/**
 * Arka planda cache güncelleme
 */
function updateCacheInBackground(request, cacheName) {
  fetch(request)
    .then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        const responseToCache = networkResponse.clone();
        caches.open(cacheName).then((cache) => {
          cache.put(request, responseToCache);
          // İstemcilere güncellemeyi bildir
          notifyClients({
            type: 'CACHE_UPDATED',
            url: request.url
          });
        });
      }
    })
    .catch(() => {
      // Arka plandaki güncellemeler başarısız olursa sessiz kal
      console.log('Service Worker: Arka plan güncellemesi başarısız:', request.url);
    });
}

// ========================================
// İSTEK TÜRÜ BELİRLEME
// ========================================

function isApiRequest(url) {
  return Object.values(API_PATTERNS).some(pattern => pattern.test(url.pathname));
}

function isAssetRequest(url) {
  return /\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|css|js)$/i.test(url.pathname);
}

function isDynamicPage(url) {
  // /tr/dashboard/proposals/new gibi dinamik sayfalar
  return url.pathname.includes('/dashboard/') || url.pathname.includes('/customers/');
}

// ========================================
// ARKA PLAN SENKRONIZASYONU - İmam başarısız istekleri
// ========================================

const FAILED_QUEUE_KEY = 'teklifpro-failed-queue';

/**
 * Başarısız istekleri kuyruğa ekle
 */
function addToFailedQueue(request) {
  request.clone().text().then((body) => {
    const queueItem = {
      method: request.method,
      url: request.url,
      body: body,
      headers: Array.from(request.headers.entries()),
      timestamp: Date.now()
    };

    // IndexedDB veya localStorage kullan
    if ('indexedDB' in self) {
      const dbRequest = indexedDB.open('teklifpro', 1);
      dbRequest.onsuccess = (e) => {
        const db = e.target.result;
        const transaction = db.transaction(['failedRequests'], 'readwrite');
        transaction.objectStore('failedRequests').add(queueItem);
      };
    }
  });
}

/**
 * Başarısız istekleri yeniden gönder
 */
function retrySyncQueue() {
  if (!('indexedDB' in self)) {
    console.log('Service Worker: IndexedDB desteklenmiyor');
    return;
  }

  const dbRequest = indexedDB.open('teklifpro', 1);
  dbRequest.onsuccess = (e) => {
    const db = e.target.result;
    const transaction = db.transaction(['failedRequests'], 'readwrite');
    const store = transaction.objectStore('failedRequests');
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = () => {
      const items = getAllRequest.result;
      console.log(`Service Worker: ${items.length} başarısız istek yeniden gönderiliyor`);

      items.forEach((item) => {
        const requestHeaders = new Headers(item.headers);
        const request = new Request(item.url, {
          method: item.method,
          headers: requestHeaders,
          body: item.body
        });

        fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              store.delete(item.timestamp);
              notifyClients({
                type: 'SYNC_SUCCESS',
                url: item.url
              });
            }
          })
          .catch(() => {
            console.log('Service Worker: İstek yeniden başarısız:', item.url);
          });
      });
    };
  };
}

// Bağlantı geri geldiğinde senkronizasyonu dene
self.addEventListener('online', () => {
  console.log('Service Worker: İnternet bağlantısı geri geldi');
  retrySyncQueue();
  notifyClients({ type: 'ONLINE' });
});

self.addEventListener('offline', () => {
  console.log('Service Worker: İnternet bağlantısı kesildi');
  notifyClients({ type: 'OFFLINE' });
});

// ========================================
// PUSH NOTIFICATIONS - Teklif durum güncellemeleri
// ========================================
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push bildirimi alındı');

  let notificationData = {
    title: 'TeklifPro',
    body: 'Bildiriminiz var',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    tag: 'teklifpro-notification'
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data
      };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      actions: [
        {
          action: 'open',
          title: 'Aç'
        },
        {
          action: 'close',
          title: 'Kapat'
        }
      ]
    })
  );
});

// Bildirim tıklamalarını işle
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Zaten açık bir pencere varsa onu odakla
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === '/tr/dashboard' && 'focus' in client) {
            return client.focus();
          }
        }
        // Yok ise yeni pencere aç
        if (clients.openWindow) {
          return clients.openWindow('/tr/dashboard');
        }
      })
    );
  }
});

// ========================================
// İSTEMCİ BİLDİRİMLERİ
// ========================================

/**
 * Tüm açık istemcileri bilgilendir
 */
function notifyClients(message) {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage(message);
    });
  });
}

// ========================================
// MESSAGE EVENT - İstemci iletişimi
// ========================================
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  console.log('Service Worker: Mesaj alındı:', type);

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (type === 'CLEAR_CACHE') {
    clearSpecificCache(payload.cacheName);
  } else if (type === 'RETRY_SYNC') {
    retrySyncQueue();
  }
});

/**
 * Belirli bir cache'i temizle
 */
function clearSpecificCache(cacheName) {
  if (cacheName && Object.values(CACHE_NAMES).includes(cacheName)) {
    caches.delete(cacheName).then(() => {
      console.log('Service Worker: Cache silindi:', cacheName);
      notifyClients({
        type: 'CACHE_CLEARED',
        cacheName: cacheName
      });
    });
  }
}

console.log('TeklifPro Service Worker başlatıldı');
