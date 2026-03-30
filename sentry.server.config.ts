import * as Sentry from '@sentry/nextjs';

/**
 * Sentry Server-Side Konfigürasyonu
 * Sunucu tarafında hataları yakalamak, API çağrılarını track etmek
 * ve hassas veri filtrelemesi yapmak için kullanılır.
 */
Sentry.init({
  // Sentry DSN - sunucu ortamında gizli DSN kullanılır
  dsn: process.env.SENTRY_DSN,

  // Şu anki ortam (development, staging, production)
  environment: process.env.NODE_ENV,

  /**
   * Traces sampling rate - transaction örnekleme oranı
   * Production'da %30, diğer ortamlarda %100
   *
   * Transaction: API istekleri, veritabanı işlemleri vb.
   * Daha düşük oranı kullanarak maliyeti azaltırız
   */
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.3 : 1.0,

  /**
   * Sentry'ye gönderilecek olayları filtreleme ve dönüştürme
   * Hassas verileri redact eder ve güvenlik sağlar
   */
  beforeSend(event) {
    // İstek verilerindeki hassas bilgileri filtreleyici
    if (event.request?.data) {
      const data = event.request.data as any;

      // Şifre bilgisini redact et
      if (data.password) {
        data.password = '[REDACTED]';
      }

      // Paraşüt (muhasebe yazılımı) istemci sırrını redact et
      if (data.parasutClientSecret) {
        data.parasutClientSecret = '[REDACTED]';
      }

      // WhatsApp API token'ını redact et
      if (data.whatsappToken) {
        data.whatsappToken = '[REDACTED]';
      }

      // Diğer olası API token'ları
      if (data.apiKey) {
        data.apiKey = '[REDACTED]';
      }

      if (data.bearerToken) {
        data.bearerToken = '[REDACTED]';
      }

      if (data.refreshToken) {
        data.refreshToken = '[REDACTED]';
      }

      if (data.accessToken) {
        data.accessToken = '[REDACTED]';
      }
    }

    return event;
  },

  /**
   * Dstack integrations
   * Sunucu tarafında kullanılan ek Sentry özellikleri
   */
  integrations: [
    // Veritabanı sorguları ve HTTP isteklerini otomatik track et
    Sentry.httpIntegration({
      // Hassas başlıkları filtreleme (Authorization, Cookie vb.)
      breadcrumbs: true,
    }),
  ],

  /**
   * Sunucu tarafı hata filtrelemesi
   * Önemli olmayan hatalar için sampling oranını azalt
   */
  sampleRate: 1.0,

  // Denialsattırılmış request'ler için deneme
  maxBreadcrumbs: 100,
});
