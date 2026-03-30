import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Özel metrikler
const errorRate = new Rate('errors');
const requestDuration = new Trend('http_req_duration');
const successCount = new Counter('successes');

// Test ayarları
export const options = {
  // Stages: yüklemenin aşamaları
  stages: [
    { duration: '2m', target: 50 }, // 0'dan 50 user'a ramp up (2 dakika)
    { duration: '5m', target: 50 }, // 50 user'da steady state (5 dakika)
    { duration: '1m', target: 0 }, // 50'den 0'a ramp down (1 dakika)
  ],

  // Başarı kriterleri
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed': ['rate<0.01'],
    'errors': ['rate<0.05'],
  },

  // VU ayarları
  vus: 1,
  duration: '8m',
};

// Test verisi
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/v1`;
const API_KEY = __ENV.API_KEY || 'test-api-key';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

// Test kullanıcısı
const testUser = {
  email: 'test@teklifpro.dev',
  password: 'TestPassword123!',
};

// Varsayılan headerlar
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`,
};

// Health check
export function setup() {
  console.log(`Başlangıç: ${BASE_URL}'ye bağlanılıyor`);

  const res = http.get(`${BASE_URL}/api/health`, {
    timeout: '5s',
  });

  check(res, {
    'health check başarılı': (r) => r.status === 200,
  });

  return { token: AUTH_TOKEN };
}

// Ana test fonksiyonu
export default function (data) {
  const token = data.token || AUTH_TOKEN;
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // Kimlik doğrulama testi
  group('Kimlik Doğrulama', function () {
    const loginPayload = JSON.stringify({
      email: testUser.email,
      password: testUser.password,
    });

    const res = http.post(`${API_BASE}/auth/login`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: '10s',
    });

    const success = check(res, {
      'login başarılı': (r) => r.status === 200,
      'token alındı': (r) => r.json('access_token') !== undefined,
      'response süresi < 500ms': (r) => r.timings.duration < 500,
    });

    if (!success) {
      errorRate.add(1);
    } else {
      successCount.add(1);
    }

    requestDuration.add(res.timings.duration);
    sleep(1);
  });

  // Teklifler listesi testi
  group('Teklifler Listesi', function () {
    const res = http.get(`${API_BASE}/proposals?limit=20&offset=0`, {
      headers: authHeaders,
      timeout: '10s',
    });

    const success = check(res, {
      'liste başarılı': (r) => r.status === 200,
      'response array': (r) => Array.isArray(r.json()),
      'response süresi < 500ms': (r) => r.timings.duration < 500,
    });

    if (!success) {
      errorRate.add(1);
    } else {
      successCount.add(1);
    }

    requestDuration.add(res.timings.duration);
    sleep(1);
  });

  // Teklif oluşturma testi
  group('Teklif Oluşturma', function () {
    const proposalPayload = JSON.stringify({
      title: `Teklif - ${Date.now()}`,
      customerId: 'cust-123',
      items: [
        {
          productId: 'prod-1',
          quantity: 2,
          unitPrice: 100,
          description: 'Test ürün',
        },
      ],
      discountRate: 0,
      taxRate: 18,
      notes: 'Test notları',
    });

    const res = http.post(`${API_BASE}/proposals`, proposalPayload, {
      headers: authHeaders,
      timeout: '10s',
    });

    const success = check(res, {
      'teklif oluşturuldu': (r) => r.status === 201,
      'ID döndü': (r) => r.json('id') !== undefined,
      'response süresi < 800ms': (r) => r.timings.duration < 800,
    });

    if (!success) {
      errorRate.add(1);
    } else {
      successCount.add(1);
    }

    requestDuration.add(res.timings.duration);
    sleep(2);
  });

  // Arama testi
  group('Arama', function () {
    const query = 'teklif';
    const res = http.get(`${API_BASE}/search?q=${query}&type=proposals`, {
      headers: authHeaders,
      timeout: '10s',
    });

    const success = check(res, {
      'arama başarılı': (r) => r.status === 200,
      'sonuçlar döndü': (r) => r.json('results') !== undefined,
      'response süresi < 700ms': (r) => r.timings.duration < 700,
    });

    if (!success) {
      errorRate.add(1);
    } else {
      successCount.add(1);
    }

    requestDuration.add(res.timings.duration);
    sleep(1);
  });

  // Müşteriler testi
  group('Müşteriler', function () {
    const res = http.get(`${API_BASE}/customers?limit=50`, {
      headers: authHeaders,
      timeout: '10s',
    });

    const success = check(res, {
      'müşteriler alındı': (r) => r.status === 200,
      'array döndü': (r) => Array.isArray(r.json()),
      'response süresi < 500ms': (r) => r.timings.duration < 500,
    });

    if (!success) {
      errorRate.add(1);
    } else {
      successCount.add(1);
    }

    requestDuration.add(res.timings.duration);
    sleep(1);
  });

  // Ürünler testi
  group('Ürünler', function () {
    const res = http.get(`${API_BASE}/products?limit=50`, {
      headers: authHeaders,
      timeout: '10s',
    });

    const success = check(res, {
      'ürünler alındı': (r) => r.status === 200,
      'array döndü': (r) => Array.isArray(r.json()),
      'response süresi < 500ms': (r) => r.timings.duration < 500,
    });

    if (!success) {
      errorRate.add(1);
    } else {
      successCount.add(1);
    }

    requestDuration.add(res.timings.duration);
    sleep(1);
  });

  // Dashboard istatistikleri testi
  group('Dashboard İstatistikleri', function () {
    const res = http.get(`${API_BASE}/dashboard/stats`, {
      headers: authHeaders,
      timeout: '10s',
    });

    const success = check(res, {
      'istatistikler alındı': (r) => r.status === 200,
      'stats döndü': (r) => r.json('stats') !== undefined,
      'response süresi < 800ms': (r) => r.timings.duration < 800,
    });

    if (!success) {
      errorRate.add(1);
    } else {
      successCount.add(1);
    }

    requestDuration.add(res.timings.duration);
    sleep(2);
  });

  // Rastgele bekleme süresi
  sleep(__VU % 2 === 0 ? 2 : 3);
}

// Teardown
export function teardown(data) {
  console.log('Load test tamamlandı');
}
