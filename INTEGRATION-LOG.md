# TeklifPro - Entegrasyon Test Günlüğü

Son güncelleme: 2026-04-03

## Genel Durum

| Entegrasyon | Kod Durumu | Unit Test | Gerçek API Testi | Production |
|-------------|-----------|-----------|-----------------|------------|
| Parasut V4  | ✅ Tamamlandı | ✅ Mevcut | ❌ Bekliyor | ❌ Bekliyor |
| WhatsApp    | ✅ Tamamlandı | ✅ Mevcut | ❌ Bekliyor | ❌ Bekliyor |
| PayTR       | ⚠️ Kısmi | ✅ Mevcut | ❌ Bekliyor | ❌ Bekliyor |
| Resend      | ✅ Tamamlandı | ✅ Mevcut | ❌ Bekliyor | ❌ Bekliyor |
| Claude AI   | ⚠️ Stub | ✅ Mevcut | ❌ Bekliyor | ❌ Bekliyor |

## Detaylı Durum

### 1. Parasut V4 API

- **Servis:** `src/infrastructure/services/parasut/ParasutClient.ts`
- **Endpoint'ler:**
  - `authenticate()` — OAuth2 password grant ile token al
  - `refreshAccessToken()` — Refresh token ile yenileme (private, otomatik)
  - `getContacts(page, perPage)` — Müşteri listesi (pagination + include contact_people)
  - `getContact(id)` — Tek müşteri detayı
  - `searchContacts(query)` — Müşteri arama (filter[name])
  - `getProducts(page, perPage)` — Ürün listesi
  - `getProduct(id)` — Tek ürün detayı
  - `searchProducts(query)` — Ürün arama
  - `syncAllContacts()` — Tüm müşterileri DB'ye senkronize et (upsert, contact_people dahil)
  - `syncAllProducts()` — Tüm ürünleri DB'ye senkronize et (upsert)
  - `testConnection()` — Bağlantı testi
  - `getBankAccounts()` — Banka hesaplarını çek (IBAN filtreli)
  - `syncBankAccounts()` — Banka hesaplarını tenant'a kaydet
- **Webhook:** `src/app/api/v1/webhooks/parasut/route.ts`
  - POST handler: HMAC-SHA256 imza doğrulama (`x-parasut-webhook-signature`)
  - Desteklenen event'ler: `contact.created`, `contact.updated`, `product.created`, `product.updated`
  - Idempotency kontrolü (in-memory Set, production'da Redis/DB önerisi var)
  - Tenant ID: header veya query param'dan alınıyor
  - DB işlemleri henüz simüle edilmiş durumda (yorum satırlarında)
- **Token Yönetimi:** OAuth2 password grant + refresh token, DB'ye kaydediliyor, 5 dk buffer ile otomatik yenileme, 401 retry mekanizması
- **Unit Test:** ✅ `__tests__/unit/infrastructure/services/parasut/ParasutClient.test.ts` + `__tests__/unit/app/api/webhooks/webhooks.test.ts`
- **Gerçek API Testi:** ❌ Bekliyor — Parasut sandbox hesabı gerekli
- **Notlar:**
  - API URL default: `https://api.parasut.com/v4`, Auth URL: `https://auth.parasut.com/oauth/token`
  - Her tenant kendi Parasut credential'larını DB'ye kaydediyor (multi-tenant)
  - SyncLog tablosu kullanılıyor (`parasutSyncLog`)
  - Webhook handler'daki DB işlemleri henüz gerçek Prisma çağrılarına dönüştürülmemiş (simüle edilmiş)

### 2. WhatsApp Business Cloud API

- **Servis:** `src/infrastructure/services/whatsapp/WhatsAppService.ts`
- **Endpoint'ler:**
  - `sendProposalLink(params)` — İnteraktif CTA butonlu teklif linki gönder, başarısız olursa template mesaja fallback
  - `sendTextMessage(to, text)` — Serbest metin mesajı (24 saat penceresi içinde)
  - `sendTemplate(params)` — Template mesaj gönder (header, body, button parametreleri)
  - `sendInteractiveMessage(params)` — İnteraktif butonlu mesaj (private)
  - `verifyWebhookSignature(rawBody, signature)` — HMAC-SHA256 webhook imza doğrulama
  - `formatPhoneNumber(phone)` — Türkiye telefon numarası formatlama (private)
- **Webhook:** `src/app/api/v1/webhooks/whatsapp/route.ts`
  - GET handler: Hub verification (mode, token, challenge)
  - POST handler: İmza doğrulama, mesaj durumu takibi (sent/delivered/read/failed), gelen mesaj işleme
  - İnteraktif buton tıklama takibi (`action:proposal_view:` prefix)
  - Idempotency kontrolü (in-memory Set)
  - DB işlemleri henüz simüle edilmiş durumda (yorum satırlarında)
- **Unit Test:** ✅ `__tests__/unit/infrastructure/services/whatsapp/WhatsAppService.test.ts` + `__tests__/unit/app/api/webhooks/webhooks.test.ts`
- **Gerçek API Testi:** ❌ Bekliyor — WhatsApp Business hesabı + Meta onaylı template gerekli
- **Notlar:**
  - API URL: `https://graph.facebook.com/v18.0`
  - Tenant bazlı config: `fromTenantConfig()` factory metodu
  - Template adı: `proposal_notification` (Türkçe)
  - Webhook handler'daki ProposalActivity kayıtları henüz gerçek DB çağrılarına dönüştürülmemiş

### 3. PayTR Ödeme Gateway

- **Servis:** `src/infrastructure/services/payment/PayTRService.ts`
- **Endpoint'ler:**
  - `getPaymentToken(params, userIp)` — iFrame API için HMAC-SHA256 token üretimi
  - `createSubscription(tenantId, plan, period)` — Abonelik oluştur (kısmen stub — gerçek API çağrısı yok, placeholder token döndürüyor)
  - `cancelSubscription(tenantId)` — Abonelik iptal (tamamen stub — simüle edilmiş)
  - `verifyWebhookHash(data)` — Webhook hash doğrulama
  - `handlePaymentCallback(data)` — Ödeme callback işleme (hash doğrulama + tenant ID parse)
- **Plan Fiyatları:** starter: 2900/29000, professional: 9900/99000, enterprise: 29900/299000 (kuruş cinsinden)
- **Unit Test:** ✅ `__tests__/unit/infrastructure/services/payment/PayTRService.test.ts`
- **Gerçek API Testi:** ❌ Bekliyor — PayTR test mağazası gerekli
- **Notlar:**
  - `createSubscription()` gerçek PayTR API çağrısı yapmıyor, placeholder token döndürüyor
  - `cancelSubscription()` tamamen simüle edilmiş
  - `handlePaymentCallback()` içinde DB güncelleme çağrıları yorum satırında
  - Merchant OID formatı: `SUB_{tenantId}_{timestamp}`
  - Singleton instance export ediliyor (`paytrService`)

### 4. Resend E-posta Servisi

- **Servis:** `src/infrastructure/services/email/EmailService.ts`
- **Endpoint'ler:**
  - `sendProposalNotification(to, proposal)` — Teklif gönderim bildirimi
  - `sendProposalAccepted(to, proposal)` — Teklif kabul bildirimi
  - `sendProposalRejected(to, proposal)` — Teklif red bildirimi
  - `sendProposalRevisionRequested(to, proposal, note)` — Revizyon isteği bildirimi
  - `sendWelcomeEmail(to, name)` — Hoş geldin e-postası
  - `sendTrialExpiring(to, name, daysLeft)` — Deneme süresi uyarısı
  - `sendVerificationEmail(to, html)` — E-posta doğrulama
  - `sendPasswordResetEmail(to, html)` — Şifre sıfırlama
- **Template'ler:** Tüm e-postalar inline HTML template ile gönderiliyor (harici template engine yok)
- **Unit Test:** ✅ `__tests__/unit/infrastructure/services/email/EmailService.test.ts` (Resend SDK mock ile)
- **Gerçek API Testi:** ❌ Bekliyor — Resend API key + doğrulanmış domain gerekli
- **Notlar:**
  - Resend SDK kullanıyor (`resend` npm paketi)
  - Lazy initialization: `_resend` ilk kullanımda oluşturuluyor
  - Default from: `noreply@teklifpro.com`
  - Singleton instance export ediliyor (`emailService`)
  - `RESEND_API_KEY` env variable zorunlu

### 5. Claude AI (Yapay Zeka) Servisi

- **Servis:** `src/infrastructure/services/ai/AiProposalService.ts`
- **Client:** `AnthropicStub` — Gerçek `@anthropic-ai/sdk` yerine stub class kullanılıyor. Her çağrıda `{}` boş JSON döndürüyor.
- **Endpoint'ler:**
  - `suggestProducts(customerId, tenantId)` — Müşteri geçmişine dayalı ürün önerileri
  - `suggestPricing(items, customerId)` — Fiyatlandırma önerileri
  - `generateProposalNote(items, customerName, locale)` — Profesyonel kapak notu üretimi
  - `predictAcceptance(proposalData)` — Teklif kabul olasılığı tahmini
  - `suggestFollowUp(proposalId, tenantId)` — Takip önerileri
  - `improveProposalText(text, locale)` — Metin iyileştirme
- **Altyapı:**
  - Rate limiting: Tenant başına saat/50 çağrı
  - Cache: 5 dakika TTL, in-memory Map
  - Retry: 3 deneme, üstel backoff (1s, 2s, 4s)
  - Model: `claude-sonnet-4-20250514`
- **Unit Test:** ✅ `__tests__/unit/infrastructure/services/ai/AiProposalService.test.ts` (stub client ile)
- **Gerçek API Testi:** ❌ Bekliyor — `@anthropic-ai/sdk` paketi entegre edilmeli
- **Notlar:**
  - **AnthropicStub** kullanılıyor, gerçek SDK değil. Tüm AI çağrıları boş JSON döndürüyor.
  - Gerçek entegrasyon için: stub'ı kaldır, `@anthropic-ai/sdk` yükle, `ANTHROPIC_API_KEY` env variable ekle
  - Prisma ile müşteri geçmişi ve ürün kataloğu sorguları çalışıyor (DB'ye bağımlı)
  - Singleton instance export ediliyor (`aiProposalService`)

## Test Ortamları

Gerçek API testleri için aşağıdaki hesap ve yapılandırmalar gereklidir:

| Entegrasyon | Gerekli Hesap / Araç | Env Variables |
|-------------|----------------------|---------------|
| Parasut V4 | Parasut sandbox/test hesabı | `PARASUT_API_URL`, `PARASUT_AUTH_URL`, `PARASUT_WEBHOOK_SECRET` + tenant DB'de: `parasutCompanyId`, `parasutClientId`, `parasutClientSecret`, `parasutUsername`, `parasutPassword` |
| WhatsApp | Meta Business hesabı, WhatsApp Business API onayı, onaylı mesaj template'i | `WHATSAPP_API_URL`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` |
| PayTR | PayTR test mağazası (sandbox) | `PAYTR_MERCHANT_ID`, `PAYTR_MERCHANT_KEY`, `PAYTR_MERCHANT_SALT` |
| Resend | Resend hesabı + doğrulanmış domain | `RESEND_API_KEY`, `EMAIL_FROM` |
| Claude AI | Anthropic API hesabı + `@anthropic-ai/sdk` npm paketi | `ANTHROPIC_API_KEY` |

## Bilinen Kısıtlamalar

1. **Claude AI stub durumunda:** `AnthropicStub` class'ı kullanılıyor, tüm AI çağrıları boş `{}` döndürüyor. Gerçek SDK entegrasyonu yapılmamış. Ürün önerileri, fiyatlandırma, kabul tahmini gibi tüm AI özellikleri şu an çalışmıyor.

2. **PayTR kısmen stub:** `createSubscription()` gerçek PayTR iFrame API çağrısı yapmıyor, placeholder token döndürüyor. `cancelSubscription()` tamamen simüle edilmiş. Sadece `getPaymentToken()` ve `verifyWebhookHash()` gerçek hash hesaplaması yapıyor.

3. **Webhook handler'larda DB işlemleri simüle:** Hem WhatsApp hem Parasut webhook handler'larında veritabanı kayıt işlemleri yorum satırlarında bırakılmış. Mesaj durumu güncelleme, contact/product sync gibi işlemler henüz gerçek Prisma çağrılarına dönüştürülmemiş.

4. **Idempotency in-memory:** Hem WhatsApp hem Parasut webhook handler'ları idempotency kontrolü için in-memory `Set` kullanıyor. Production'da Redis veya veritabanı tabanlı çözüm gerekli. Set boyutu sınırı: WhatsApp 1000, Parasut 10000 — aşıldığında `clear()` ile sıfırlanıyor (veri kaybı riski).

5. **WhatsApp template onayı gerekli:** `proposal_notification` template'inin Meta tarafından onaylanması gerekiyor. Onay olmadan template mesajlar gönderilemez.

6. **Resend domain doğrulaması:** `noreply@teklifpro.com` adresi üzerinden gönderim yapılabilmesi için `teklifpro.com` domaininin Resend'de doğrulanması gerekli.

7. **Multi-tenant token yönetimi:** Parasut OAuth2 token'ları tenant bazında DB'de saklanıyor. Token yenileme başarısız olursa kullanıcının tekrar giriş yapması gerekiyor (`PARASUT_TOKEN_EXPIRED` hatası).
