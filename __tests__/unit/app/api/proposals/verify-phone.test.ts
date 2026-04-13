/**
 * @jest-environment node
 */

// Use fake timers to prevent setInterval in the route module from keeping Jest open
jest.useFakeTimers()

import { NextRequest } from 'next/server'
import crypto from 'crypto'

// ============================================================
// Mock bagimliliklar
// ============================================================
jest.mock('@/infrastructure/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}))

const mockFindFirst = jest.fn()

jest.mock('@/shared/utils/prisma', () => ({
  prisma: {
    proposal: {
      findFirst: (...args: any[]) => mockFindFirst(...args),
    },
  },
}))

// ============================================================
// Helper: Mock NextRequest olustur
// ============================================================
function createMockRequest(
  method: string,
  url: string,
  options?: {
    body?: string
    headers?: Record<string, string>
  },
): NextRequest {
  const urlObj = new URL(url, 'http://localhost:3000')

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
// Verify Phone Testleri
// ============================================================
describe('Proposals Verify Phone API', () => {
  let POST: (request: NextRequest) => Promise<Response>

  const VALID_TOKEN = 'abc12345-test-token-xyz'
  const CUSTOMER_PHONE = '+90 555 123 4567'
  const CORRECT_LAST4 = '4567'

  const mockProposal = {
    id: 'proposal-1',
    customer: { phone: CUSTOMER_PHONE },
  }

  beforeEach(async () => {
    jest.resetModules()
    mockFindFirst.mockReset()
    process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret'
    // Re-import to reset in-memory rate limit map
    const route = await import('@/app/api/proposals/verify-phone/route')
    POST = route.POST
  })

  // --------------------------------------------------------
  // 400 - Eksik parametreler
  // --------------------------------------------------------
  describe('Eksik parametreler', () => {
    it('Token eksikse 400 donmeli', async () => {
      const request = createMockRequest(
        'POST',
        '/api/proposals/verify-phone',
        { body: JSON.stringify({ lastFourDigits: '1234' }) },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Token ve son 4 hane gerekli')
    })

    it('lastFourDigits eksikse 400 donmeli', async () => {
      const request = createMockRequest(
        'POST',
        '/api/proposals/verify-phone',
        { body: JSON.stringify({ token: VALID_TOKEN }) },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Token ve son 4 hane gerekli')
    })

    it('Her iki parametre de eksikse 400 donmeli', async () => {
      const request = createMockRequest(
        'POST',
        '/api/proposals/verify-phone',
        { body: JSON.stringify({}) },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Token ve son 4 hane gerekli')
    })
  })

  // --------------------------------------------------------
  // 400 - lastFourDigits format dogrulama
  // --------------------------------------------------------
  describe('lastFourDigits format dogrulama', () => {
    it('3 haneli deger ile 400 donmeli', async () => {
      const request = createMockRequest(
        'POST',
        '/api/proposals/verify-phone',
        { body: JSON.stringify({ token: VALID_TOKEN, lastFourDigits: '123' }) },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Son 4 hane sadece rakam olmalı')
    })

    it('5 haneli deger ile 400 donmeli', async () => {
      const request = createMockRequest(
        'POST',
        '/api/proposals/verify-phone',
        {
          body: JSON.stringify({
            token: VALID_TOKEN,
            lastFourDigits: '12345',
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Son 4 hane sadece rakam olmalı')
    })

    it('Harf iceren deger ile 400 donmeli', async () => {
      const request = createMockRequest(
        'POST',
        '/api/proposals/verify-phone',
        {
          body: JSON.stringify({
            token: VALID_TOKEN,
            lastFourDigits: 'abcd',
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Son 4 hane sadece rakam olmalı')
    })

    it('Ozel karakter iceren deger ile 400 donmeli', async () => {
      const request = createMockRequest(
        'POST',
        '/api/proposals/verify-phone',
        {
          body: JSON.stringify({
            token: VALID_TOKEN,
            lastFourDigits: '12-4',
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Son 4 hane sadece rakam olmalı')
    })
  })

  // --------------------------------------------------------
  // 404 - Teklif bulunamadi
  // --------------------------------------------------------
  describe('Teklif bulunamadi', () => {
    it('Proposal yoksa 404 donmeli', async () => {
      mockFindFirst.mockResolvedValue(null)

      const request = createMockRequest(
        'POST',
        '/api/proposals/verify-phone',
        {
          body: JSON.stringify({
            token: VALID_TOKEN,
            lastFourDigits: '1234',
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Teklif bulunamadı')
    })

    it('Proposal var ama telefon numarasi yoksa 404 donmeli', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'proposal-1',
        customer: { phone: null },
      })

      const request = createMockRequest(
        'POST',
        '/api/proposals/verify-phone',
        {
          body: JSON.stringify({
            token: VALID_TOKEN,
            lastFourDigits: '1234',
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Teklif bulunamadı')
    })

    it('Prisma dogru parametrelerle cagirilmali', async () => {
      mockFindFirst.mockResolvedValue(null)

      const request = createMockRequest(
        'POST',
        '/api/proposals/verify-phone',
        {
          body: JSON.stringify({
            token: VALID_TOKEN,
            lastFourDigits: '1234',
          }),
        },
      )

      await POST(request)

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { publicToken: VALID_TOKEN, deletedAt: null },
        select: { id: true, customer: { select: { phone: true } } },
      })
    })
  })

  // --------------------------------------------------------
  // 400 - Telefon numarasi eslesmedi
  // --------------------------------------------------------
  describe('Telefon numarasi eslesmedi', () => {
    it('Yanlis son 4 hane ile 400 donmeli', async () => {
      mockFindFirst.mockResolvedValue(mockProposal)

      const request = createMockRequest(
        'POST',
        '/api/proposals/verify-phone',
        {
          body: JSON.stringify({
            token: VALID_TOKEN,
            lastFourDigits: '9999',
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Telefon numarası eşleşmedi')
    })
  })

  // --------------------------------------------------------
  // 200 - Basarili dogrulama
  // --------------------------------------------------------
  describe('Basarili dogrulama', () => {
    it('Dogru son 4 hane ile 200 donmeli', async () => {
      mockFindFirst.mockResolvedValue(mockProposal)

      const request = createMockRequest(
        'POST',
        '/api/proposals/verify-phone',
        {
          body: JSON.stringify({
            token: VALID_TOKEN,
            lastFourDigits: CORRECT_LAST4,
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('Bosluk ve tire iceren telefon numarasi dogru parse edilmeli', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'proposal-2',
        customer: { phone: '+90 (555) 987-6543' },
      })

      const request = createMockRequest(
        'POST',
        '/api/proposals/verify-phone',
        {
          body: JSON.stringify({
            token: VALID_TOKEN,
            lastFourDigits: '6543',
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('Response cookie set edilmeli', async () => {
      mockFindFirst.mockResolvedValue(mockProposal)

      const request = createMockRequest(
        'POST',
        '/api/proposals/verify-phone',
        {
          body: JSON.stringify({
            token: VALID_TOKEN,
            lastFourDigits: CORRECT_LAST4,
          }),
        },
      )

      const response = await POST(request)

      // Cookie header kontrolu
      const setCookie = response.headers.get('set-cookie')
      expect(setCookie).toBeTruthy()

      // Cookie adi pv_ + token ilk 8 karakter
      const expectedCookieName = `pv_${VALID_TOKEN.substring(0, 8)}`
      expect(setCookie).toContain(expectedCookieName)
    })

    it('Cookie httpOnly ve sameSite=lax olmali', async () => {
      mockFindFirst.mockResolvedValue(mockProposal)

      const request = createMockRequest(
        'POST',
        '/api/proposals/verify-phone',
        {
          body: JSON.stringify({
            token: VALID_TOKEN,
            lastFourDigits: CORRECT_LAST4,
          }),
        },
      )

      const response = await POST(request)
      const setCookie = response.headers.get('set-cookie') || ''

      expect(setCookie.toLowerCase()).toContain('httponly')
      expect(setCookie.toLowerCase()).toContain('samesite=lax')
    })

    it('Cookie path /proposal/{token} olmali', async () => {
      mockFindFirst.mockResolvedValue(mockProposal)

      const request = createMockRequest(
        'POST',
        '/api/proposals/verify-phone',
        {
          body: JSON.stringify({
            token: VALID_TOKEN,
            lastFourDigits: CORRECT_LAST4,
          }),
        },
      )

      const response = await POST(request)
      const setCookie = response.headers.get('set-cookie') || ''

      expect(setCookie).toContain(`Path=/proposal/${VALID_TOKEN}`)
    })
  })

  // --------------------------------------------------------
  // HMAC Cookie formati
  // --------------------------------------------------------
  describe('HMAC cookie formati', () => {
    it('Cookie degeri token:expiry:hmac formatinda olmali', async () => {
      const secret = 'test-secret'
      process.env.NEXTAUTH_SECRET = secret

      // Re-import after setting env
      jest.resetModules()
      const route = await import('@/app/api/proposals/verify-phone/route')
      POST = route.POST

      mockFindFirst.mockResolvedValue(mockProposal)

      const request = createMockRequest(
        'POST',
        '/api/proposals/verify-phone',
        {
          body: JSON.stringify({
            token: VALID_TOKEN,
            lastFourDigits: CORRECT_LAST4,
          }),
        },
      )

      const now = Date.now()
      jest.spyOn(Date, 'now').mockReturnValue(now)

      const response = await POST(request)
      const setCookie = response.headers.get('set-cookie') || ''

      // Cookie degerini ayikla
      const cookieName = `pv_${VALID_TOKEN.substring(0, 8)}`
      const cookieMatch = setCookie.match(new RegExp(`${cookieName}=([^;]+)`))
      expect(cookieMatch).toBeTruthy()

      const cookieValue = decodeURIComponent(cookieMatch![1])
      const parts = cookieValue.split(':')

      // Format: token:expiry:hmac
      expect(parts.length).toBe(3)
      expect(parts[0]).toBe(VALID_TOKEN)

      const expiry = parseInt(parts[1], 10)
      expect(expiry).toBe(now + 24 * 60 * 60 * 1000)

      // HMAC dogrulamasi
      const payload = `${VALID_TOKEN}:${expiry}`
      const expectedHmac = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex')
      expect(parts[2]).toBe(expectedHmac)

      jest.spyOn(Date, 'now').mockRestore()
    })
  })

  // --------------------------------------------------------
  // 429 - Rate limiting
  // --------------------------------------------------------
  describe('Rate limiting', () => {
    it('5 basarisiz denemeden sonra 429 donmeli', async () => {
      mockFindFirst.mockResolvedValue(mockProposal)

      const ip = '192.168.1.100'

      // 5 basarisiz deneme yap
      for (let i = 0; i < 5; i++) {
        const request = createMockRequest(
          'POST',
          '/api/proposals/verify-phone',
          {
            body: JSON.stringify({
              token: VALID_TOKEN,
              lastFourDigits: '0000',
            }),
            headers: { 'x-forwarded-for': ip },
          },
        )

        const response = await POST(request)
        expect(response.status).toBe(400) // Her biri yanlis esleme
      }

      // 6. deneme 429 olmali
      const blockedRequest = createMockRequest(
        'POST',
        '/api/proposals/verify-phone',
        {
          body: JSON.stringify({
            token: VALID_TOKEN,
            lastFourDigits: CORRECT_LAST4,
          }),
          headers: { 'x-forwarded-for': ip },
        },
      )

      const blockedResponse = await POST(blockedRequest)
      const blockedData = await blockedResponse.json()

      expect(blockedResponse.status).toBe(429)
      expect(blockedData.success).toBe(false)
      expect(blockedData.error).toContain('Çok fazla yanlış deneme')
    })

    it('Rate limit farkli IP adresleri icin bagimsiz olmali', async () => {
      mockFindFirst.mockResolvedValue(mockProposal)

      const ip1 = '10.0.0.1'
      const ip2 = '10.0.0.2'

      // ip1 ile 5 basarisiz deneme
      for (let i = 0; i < 5; i++) {
        const request = createMockRequest(
          'POST',
          '/api/proposals/verify-phone',
          {
            body: JSON.stringify({
              token: VALID_TOKEN,
              lastFourDigits: '0000',
            }),
            headers: { 'x-forwarded-for': ip1 },
          },
        )
        await POST(request)
      }

      // ip1 bloke olmali
      const blocked = createMockRequest(
        'POST',
        '/api/proposals/verify-phone',
        {
          body: JSON.stringify({
            token: VALID_TOKEN,
            lastFourDigits: CORRECT_LAST4,
          }),
          headers: { 'x-forwarded-for': ip1 },
        },
      )
      const blockedResp = await POST(blocked)
      expect(blockedResp.status).toBe(429)

      // ip2 hala erisebilmeli
      const request2 = createMockRequest(
        'POST',
        '/api/proposals/verify-phone',
        {
          body: JSON.stringify({
            token: VALID_TOKEN,
            lastFourDigits: CORRECT_LAST4,
          }),
          headers: { 'x-forwarded-for': ip2 },
        },
      )
      const response2 = await POST(request2)
      expect(response2.status).toBe(200)
    })

    it('Basarili dogrulama sonrasi rate limit sifirlenmali', async () => {
      mockFindFirst.mockResolvedValue(mockProposal)

      const ip = '172.16.0.1'

      // 3 basarisiz deneme
      for (let i = 0; i < 3; i++) {
        const request = createMockRequest(
          'POST',
          '/api/proposals/verify-phone',
          {
            body: JSON.stringify({
              token: VALID_TOKEN,
              lastFourDigits: '0000',
            }),
            headers: { 'x-forwarded-for': ip },
          },
        )
        await POST(request)
      }

      // Basarili dogrulama
      const successRequest = createMockRequest(
        'POST',
        '/api/proposals/verify-phone',
        {
          body: JSON.stringify({
            token: VALID_TOKEN,
            lastFourDigits: CORRECT_LAST4,
          }),
          headers: { 'x-forwarded-for': ip },
        },
      )
      const successResponse = await POST(successRequest)
      expect(successResponse.status).toBe(200)

      // Tekrar 5 basarisiz deneme yapabilmeli (sifirlanmis olmali)
      for (let i = 0; i < 4; i++) {
        const request = createMockRequest(
          'POST',
          '/api/proposals/verify-phone',
          {
            body: JSON.stringify({
              token: VALID_TOKEN,
              lastFourDigits: '0000',
            }),
            headers: { 'x-forwarded-for': ip },
          },
        )
        const resp = await POST(request)
        expect(resp.status).toBe(400) // Hala 400, henuz bloke degil
      }
    })
  })

  // --------------------------------------------------------
  // x-forwarded-for header parsing
  // --------------------------------------------------------
  describe('IP adresi cikarma', () => {
    it('x-forwarded-for birden fazla IP icerdiginde ilkini kullanmali', async () => {
      mockFindFirst.mockResolvedValue(mockProposal)

      // Her iki IP icin ayni sonucu bekleriz - ilk IP kullanilacak
      const request = createMockRequest(
        'POST',
        '/api/proposals/verify-phone',
        {
          body: JSON.stringify({
            token: VALID_TOKEN,
            lastFourDigits: CORRECT_LAST4,
          }),
          headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
        },
      )

      const response = await POST(request)
      expect(response.status).toBe(200)
    })
  })

  // --------------------------------------------------------
  // 500 - Sunucu hatasi
  // --------------------------------------------------------
  describe('Sunucu hatasi', () => {
    it('Beklenmeyen hata durumunda 500 donmeli', async () => {
      mockFindFirst.mockRejectedValue(new Error('DB connection failed'))

      const request = createMockRequest(
        'POST',
        '/api/proposals/verify-phone',
        {
          body: JSON.stringify({
            token: VALID_TOKEN,
            lastFourDigits: '1234',
          }),
        },
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Bir hata oluştu')
    })
  })
})
