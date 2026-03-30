import * as Sentry from '@sentry/nextjs';

/**
 * Sentry Client-Side Konfigürasyonu
 * Browser tarafında hataları yakalamak ve analitik toplamak için kullanılır.
 */
Sentry.init({
  // Sentry DSN - ortam değişkeninden alınır
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Şu anki ortam (development, staging, production)
  environment: process.env.NODE_ENV,

  // Traces sampling rate - tüm işlemlerin ne kadarının track edileceği
  // Production'da %20, diğer ortamlarda %100
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // Session replay sampling rates
  // Tüm sessionların %10'unu, hata olanların %100'ünü kayıt et
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Sentry integrations
  integrations: [
    // Session replay kaydını etkinleştir
    // maskAllText: false - metin içeriğini maskeleme
    // blockAllMedia: false - medya dosyalarını engelleme
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),

    // Browser tracing integrationu - performans metrikleri
    Sentry.browserTracingIntegration(),
  ],

  /**
   * Sentry'ye gönderilecek olayları filtreleme
   * PII (Personally Identifiable Information) verilerini hariç tutar
   */
  beforeSend(event) {
    // Hassas veri filtreleme: İstek cookies'lerini kaldır
    if (event.request?.cookies) {
      delete event.request.cookies;
    }

    return event;
  },

  /**
   * Belirli hata tiplerini ignore et
   * Uyarı: bu hataları tamamen ignore etmek yerine,
   * hata oranı ve sıklığını dikkate alarak ayarlayın
   */
  ignoreErrors: [
    // ResizeObserver loop - bazı third-party kütüphanelerin sık kütuphaneleri
    'ResizeObserver loop',

    // Non-Error exception - eski JavaScript kodlarında yaygın
    'Non-Error exception captured',
  ],
});
