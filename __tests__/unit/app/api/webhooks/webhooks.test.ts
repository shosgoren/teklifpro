/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import crypto from 'crypto'

// ============================================================
// Mock bağımlılıklar
// ============================================================
jest.mock('@/infrastructure/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}))

// ============================================================
// Helper: Mock NextRequest oluştur
// ============================================================
function createMockRequest(
  method: string,
  url: string,
  options?: {
    body?: string
    headers?: Record<string, string>
    searchParams?: Record<string, string>
  },
): NextRequest {
  const urlObj = new URL(url, 'http://localhost:3000')
  if (options?.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      urlObj.searchParams.set(key, value)
    })
  }

  return new NextRequest(urlObj.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...(options?.body !== undefined && { body: options.body }),
  })
}

// ============================================================
// WhatsApp Webhook Testleri
// ============================================================
describe('WhatsApp Webhook', () => {
  const VERIFY_TOKEN = 'test-verify-token'
  const ACCESS_TOKEN = 'test-whatsapp-access-token'

  let GET: (request: NextRequest) => Promise<Response>
  let POST: (request: NextRequest) => Promise<Response>

  beforeAll(() => {
    process.env.WHATSAPP_VERIFY_TOKEN = VERIFY_TOKEN
    process.env.WHATSAPP_ACCESS_TOKEN = ACCESS_TOKEN
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'test-phone-id'
  })

  beforeEach(async () => {
    jest.resetModules()
    const whatsappRoute = await import(
      '@/app/api/v1/webhooks/whatsapp/route'
    )
    GET = whatsappRoute.GET
    POST = whatsappRoute.POST
  })

  // --------------------------------------------------------
  // GET - Webhook Doğrulama
  // --------------------------------------------------------
  describe('GET - Webhook Dogrulama', () => {
    it('Dogru verify_token ile 200 + challenge donmeli', async () => {
      const request = createMockRequest('GET', '/api/v1/webhooks/whatsapp', {
        searchParams: {
          'hub.mode': 'subscribe',
          'hub.verify_token': VERIFY_TOKEN,
          'hub.challenge': 'test-challenge-123',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.hub.challenge).toBe('test-challenge-123')
    })

    it('Yanlis verify_token ile 403 donmeli', async () => {
      const request = createMockRequest('GET', '/api/v1/webhooks/whatsapp', {
        searchParams: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'yanlis-token',
          'hub.challenge': 'test-challenge',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Invalid token')
    })

    it('Eksik parametreler ile 400 donmeli - hub.mode eksik', async () => {
      const request = createMockRequest('GET', '/api/v1/webhooks/whatsapp', {
        searchParams: {
          'hub.verify_token': VERIFY_TOKEN,
          'hub.challenge': 'test-challenge',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(400)
    })

    it('Eksik parametreler ile 400 donmeli - hub.verify_token eksik', async () => {
      const request = createMockRequest('GET', '/api/v1/webhooks/whatsapp', {
        searchParams: {
          'hub.mode': 'subscribe',
          'hub.challenge': 'test-challenge',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(400)
    })

    it('Eksik parametreler ile 400 donmeli - hub.challenge eksik', async () => {
      const request = createMockRequest('GET', '/api/v1/webhooks/whatsapp', {
        searchParams: {
          'hub.mode': 'subscribe',
          'hub.verify_token': VERIFY_TOKEN,
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(400)
    })

    it('Gecersiz mode ile 400 donmeli', async () => {
      const request = createMockRequest('GET', '/api/v1/webhooks/whatsapp', {
        searchParams: {
          'hub.mode': 'unsubscribe',
          'hub.verify_token': VERIFY_TOKEN,
          'hub.challenge': 'test-challenge',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid mode')
    })
  })

  // --------------------------------------------------------
  // POST - Status Updates & Mesajlar
  // --------------------------------------------------------
  describe('POST - Webhook Events', () => {
    function createSignature(body: string): string {
      const hash = crypto
        .createHmac('sha256', ACCESS_TOKEN)
        .update(body)
        .digest('hex')
      return `sha256=${hash}`
    }

    function createWhatsAppPayload(overrides?: Record<string, any>) {
      return {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+905551234567',
                    phone_number_id: 'test-phone-id',
                  },
                  ...overrides,
                },
                field: 'messages',
              },
            ],
          },
        ],
      }
    }

    it('Gecerli mesaj status update ile 200 donmeli', async () => {
      const payload = createWhatsAppPayload({
        statuses: [
          {
            id: 'msg-123',
            status: 'delivered',
            timestamp: '1234567890',
            recipient_id: '+905559876543',
          },
        ],
      })
      const body = JSON.stringify(payload)
      const signature = createSignature(body)

      const request = createMockRequest('POST', '/api/v1/webhooks/whatsapp', {
        body,
        headers: { 'x-hub-signature-256': signature },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('Gecerli signature ile gelen mesaj 200 donmeli', async () => {
      const payload = createWhatsAppPayload({
        messages: [
          {
            from: '+905551234567',
            id: 'msg-456',
            timestamp: '1234567890',
            type: 'text',
            text: { body: 'Merhaba' },
          },
        ],
      })
      const body = JSON.stringify(payload)
      const signature = createSignature(body)

      const request = createMockRequest('POST', '/api/v1/webhooks/whatsapp', {
        body,
        headers: { 'x-hub-signature-256': signature },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('Gecersiz signature ile 403 donmeli', async () => {
      const payload = createWhatsAppPayload({
        statuses: [
          {
            id: 'msg-789',
            status: 'sent',
            timestamp: '1234567890',
            recipient_id: '+905559876543',
          },
        ],
      })
      const body = JSON.stringify(payload)

      const request = createMockRequest('POST', '/api/v1/webhooks/whatsapp', {
        body,
        headers: { 'x-hub-signature-256': 'sha256=gecersiz-signature' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Invalid signature')
    })

    it('Eksik signature header ile 403 donmeli', async () => {
      const payload = createWhatsAppPayload({
        statuses: [
          {
            id: 'msg-000',
            status: 'read',
            timestamp: '1234567890',
            recipient_id: '+905559876543',
          },
        ],
      })
      const body = JSON.stringify(payload)

      const request = createMockRequest('POST', '/api/v1/webhooks/whatsapp', {
        body,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Invalid signature')
    })

    it('Gecersiz payload object ile 400 donmeli', async () => {
      const payload = { object: 'invalid_object', entry: [] }
      const body = JSON.stringify(payload)
      const signature = createSignature(body)

      const request = createMockRequest('POST', '/api/v1/webhooks/whatsapp', {
        body,
        headers: { 'x-hub-signature-256': signature },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid payload')
    })

    it('Interactive button payload ile 200 donmeli', async () => {
      const payload = createWhatsAppPayload({
        messages: [
          {
            from: '+905551234567',
            id: 'msg-btn-1',
            timestamp: '1234567890',
            type: 'interactive',
            button: { payload: 'action:proposal_view:prop-123' },
          },
        ],
      })
      const body = JSON.stringify(payload)
      const signature = createSignature(body)

      const request = createMockRequest('POST', '/api/v1/webhooks/whatsapp', {
        body,
        headers: { 'x-hub-signature-256': signature },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('Hata iceran payload ile 200 donmeli (retry onleme)', async () => {
      const payload = createWhatsAppPayload({
        errors: [{ code: 131047, message: 'Message failed' }],
      })
      const body = JSON.stringify(payload)
      const signature = createSignature(body)

      const request = createMockRequest('POST', '/api/v1/webhooks/whatsapp', {
        body,
        headers: { 'x-hub-signature-256': signature },
      })

      const response = await POST(request)

      // Hata olsa bile 200 donmeli (WhatsApp retry onleme)
      expect(response.status).toBe(200)
    })
  })
})

// ============================================================
// Parasut Webhook Testleri
// ============================================================
describe('Parasut Webhook', () => {
  const WEBHOOK_SECRET = 'test-parasut-webhook-secret'

  let POST: (request: NextRequest) => Promise<Response>
  let GET: () => Promise<Response>

  beforeAll(() => {
    process.env.PARASUT_WEBHOOK_SECRET = WEBHOOK_SECRET
  })

  beforeEach(async () => {
    jest.resetModules()
    const parasutRoute = await import('@/app/api/v1/webhooks/parasut/route')
    POST = parasutRoute.POST
    GET = parasutRoute.GET
  })

  function createSignature(body: string): string {
    return crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(body)
      .digest('hex')
  }

  function createParasutPayload(
    eventType: string,
    resourceType: string,
    attributes: Record<string, any> = {},
  ) {
    return {
      event_type: eventType,
      created_at: new Date().toISOString(),
      id: `event-${Date.now()}-${Math.random()}`,
      resource_type: resourceType,
      data: {
        id: `resource-${Date.now()}`,
        type: resourceType,
        attributes,
      },
    }
  }

  // --------------------------------------------------------
  // Contact Olaylari
  // --------------------------------------------------------
  describe('Contact gunceleme trigger', () => {
    it('contact.updated olayi ile sync islemi basarili olmali', async () => {
      const payload = createParasutPayload('contact.updated', 'contact', {
        name: 'Ali Yilmaz',
        email: 'ali@example.com',
        phone: '+905551234567',
        tax_number: '1234567890',
        tax_office: 'Istanbul',
      })
      const body = JSON.stringify(payload)
      const signature = createSignature(body)

      const request = createMockRequest('POST', '/api/v1/webhooks/parasut', {
        body,
        headers: {
          'x-parasut-webhook-signature': signature,
          'x-tenant-id': 'tenant-123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.syncLogId).toBeDefined()
    })

    it('contact.created olayi ile sync islemi basarili olmali', async () => {
      const payload = createParasutPayload('contact.created', 'contact', {
        name: 'Yeni Musteri',
        email: 'yeni@example.com',
      })
      const body = JSON.stringify(payload)
      const signature = createSignature(body)

      const request = createMockRequest('POST', '/api/v1/webhooks/parasut', {
        body,
        headers: {
          'x-parasut-webhook-signature': signature,
          'x-tenant-id': 'tenant-123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  // --------------------------------------------------------
  // Product Olaylari
  // --------------------------------------------------------
  describe('Product gunceleme trigger', () => {
    it('product.updated olayi ile sync islemi basarili olmali', async () => {
      const payload = createParasutPayload('product.updated', 'product', {
        name: 'Urun A',
        code: 'PRD-001',
        unit_type: 'adet',
        list_price: 150.00,
        archived: false,
      })
      const body = JSON.stringify(payload)
      const signature = createSignature(body)

      const request = createMockRequest('POST', '/api/v1/webhooks/parasut', {
        body,
        headers: {
          'x-parasut-webhook-signature': signature,
          'x-tenant-id': 'tenant-456',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.syncLogId).toBeDefined()
    })

    it('product.created olayi ile sync islemi basarili olmali', async () => {
      const payload = createParasutPayload('product.created', 'product', {
        name: 'Yeni Urun',
        code: 'PRD-NEW',
        unit_type: 'kg',
        list_price: 250.00,
        archived: false,
      })
      const body = JSON.stringify(payload)
      const signature = createSignature(body)

      const request = createMockRequest('POST', '/api/v1/webhooks/parasut', {
        body,
        headers: {
          'x-parasut-webhook-signature': signature,
          'x-tenant-id': 'tenant-456',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('Arsivlenmis urun skipped status ile donmeli', async () => {
      const payload = createParasutPayload('product.updated', 'product', {
        name: 'Arsivli Urun',
        code: 'PRD-ARC',
        unit_type: 'adet',
        list_price: 0,
        archived: true,
      })
      const body = JSON.stringify(payload)
      const signature = createSignature(body)

      const request = createMockRequest('POST', '/api/v1/webhooks/parasut', {
        body,
        headers: {
          'x-parasut-webhook-signature': signature,
          'x-tenant-id': 'tenant-789',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  // --------------------------------------------------------
  // Signature Dogrulama
  // --------------------------------------------------------
  describe('Signature dogrulama', () => {
    it('Gecersiz signature ile 403 donmeli', async () => {
      const payload = createParasutPayload('contact.updated', 'contact', {
        name: 'Test',
      })
      const body = JSON.stringify(payload)

      const request = createMockRequest('POST', '/api/v1/webhooks/parasut', {
        body,
        headers: {
          'x-parasut-webhook-signature': 'gecersiz-signature',
          'x-tenant-id': 'tenant-123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Invalid signature')
    })

    it('Eksik signature header ile 403 donmeli', async () => {
      const payload = createParasutPayload('contact.updated', 'contact', {
        name: 'Test',
      })
      const body = JSON.stringify(payload)

      const request = createMockRequest('POST', '/api/v1/webhooks/parasut', {
        body,
        headers: { 'x-tenant-id': 'tenant-123' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Invalid signature')
    })
  })

  // --------------------------------------------------------
  // Payload Dogrulama
  // --------------------------------------------------------
  describe('Payload dogrulama', () => {
    it('Eksik event_type ile 400 donmeli', async () => {
      const payload = { data: { id: '1', type: 'contact', attributes: {} } }
      const body = JSON.stringify(payload)
      const signature = createSignature(body)

      const request = createMockRequest('POST', '/api/v1/webhooks/parasut', {
        body,
        headers: {
          'x-parasut-webhook-signature': signature,
          'x-tenant-id': 'tenant-123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid payload')
    })

    it('Eksik data ile 400 donmeli', async () => {
      const payload = { event_type: 'contact.updated' }
      const body = JSON.stringify(payload)
      const signature = createSignature(body)

      const request = createMockRequest('POST', '/api/v1/webhooks/parasut', {
        body,
        headers: {
          'x-parasut-webhook-signature': signature,
          'x-tenant-id': 'tenant-123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid payload')
    })
  })

  // --------------------------------------------------------
  // Bilinmeyen Event Type
  // --------------------------------------------------------
  describe('Bilinmeyen event type', () => {
    it('Bilinmeyen event type ile 200 donmeli (skipped)', async () => {
      const payload = createParasutPayload('invoice.created', 'invoice', {
        total: 1000,
      })
      const body = JSON.stringify(payload)
      const signature = createSignature(body)

      const request = createMockRequest('POST', '/api/v1/webhooks/parasut', {
        body,
        headers: {
          'x-parasut-webhook-signature': signature,
          'x-tenant-id': 'tenant-123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  // --------------------------------------------------------
  // Tenant ID cikarma
  // --------------------------------------------------------
  describe('Tenant ID cikarma', () => {
    it('x-tenant-id header ile tenant belirlemeli', async () => {
      const payload = createParasutPayload('contact.updated', 'contact', {
        name: 'Tenant Test',
      })
      const body = JSON.stringify(payload)
      const signature = createSignature(body)

      const request = createMockRequest('POST', '/api/v1/webhooks/parasut', {
        body,
        headers: {
          'x-parasut-webhook-signature': signature,
          'x-tenant-id': 'tenant-specific-id',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('tenant_id query param ile tenant belirlemeli', async () => {
      const payload = createParasutPayload('contact.created', 'contact', {
        name: 'Query Param Test',
      })
      const body = JSON.stringify(payload)
      const signature = createSignature(body)

      const request = createMockRequest(
        'POST',
        '/api/v1/webhooks/parasut?tenant_id=tenant-from-query',
        {
          body,
          headers: { 'x-parasut-webhook-signature': signature },
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  // --------------------------------------------------------
  // GET endpoint
  // --------------------------------------------------------
  describe('GET endpoint', () => {
    it('200 ile bilgi mesaji donmeli', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBeDefined()
    })
  })
})

// ============================================================
// NOT: PayTR Webhook
// ============================================================
// PayTR webhook route dosyasi bulunamadi (src/app/api/v1/webhooks/ altinda).
// Sadece PayTRService.ts mevcut (infrastructure/services/payment/).
// PayTR webhook route olusturuldugunda bu testler eklenmelidir.
