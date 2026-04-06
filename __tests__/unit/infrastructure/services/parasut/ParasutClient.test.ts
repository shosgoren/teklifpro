/**
 * ParasutClient Unit Tests
 *
 * Tests the actual ParasutClient API: constructor, forTenant factory,
 * testConnection, getContacts, getProducts, syncAllContacts, and error handling.
 */

// ==================== MOCKS ====================

const mockPrisma = {
  tenant: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  customer: {
    upsert: jest.fn(),
    findFirst: jest.fn(),
  },
  customerContact: {
    upsert: jest.fn(),
  },
  product: {
    upsert: jest.fn(),
  },
  parasutSyncLog: {
    create: jest.fn(),
  },
}

jest.mock('@/shared/utils/prisma', () => ({
  prisma: mockPrisma,
}))

jest.mock('@/infrastructure/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

import { ParasutClient } from '@/infrastructure/services/parasut/ParasutClient'

// ==================== HELPERS ====================

const TENANT_ID = 'tenant-123'
const COMPANY_ID = 'company-456'
const ACCESS_TOKEN = 'test-access-token'
const REFRESH_TOKEN = 'test-refresh-token'

/** Create a client with a valid (non-expired) token pre-loaded */
function createAuthenticatedClient(): ParasutClient {
  const client = new ParasutClient(TENANT_ID, COMPANY_ID)
  // Set private fields via object access
  ;(client as any).accessToken = ACCESS_TOKEN
  ;(client as any).refreshToken = REFRESH_TOKEN
  ;(client as any).tokenExpiry = new Date(Date.now() + 3600 * 1000) // 1 hour from now
  return client
}

function mockFetchOk(data: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => data,
  })
}

function mockFetchError(status: number, body: unknown = {}) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => body,
  })
}

// ==================== TESTS ====================

describe('ParasutClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ParasutClient.resetRateLimit()
  })

  // --------------------------------------------------
  // 1. Constructor and basic setup
  // --------------------------------------------------
  describe('constructor', () => {
    it('should create instance with tenantId and companyId', () => {
      const client = new ParasutClient(TENANT_ID, COMPANY_ID)
      expect(client).toBeInstanceOf(ParasutClient)
      expect((client as any).tenantId).toBe(TENANT_ID)
      expect((client as any).companyId).toBe(COMPANY_ID)
    })

    it('should initialize with null token fields', () => {
      const client = new ParasutClient(TENANT_ID, COMPANY_ID)
      expect((client as any).accessToken).toBeNull()
      expect((client as any).refreshToken).toBeNull()
      expect((client as any).tokenExpiry).toBeNull()
    })
  })

  // --------------------------------------------------
  // 1b. Static factory: forTenant
  // --------------------------------------------------
  describe('forTenant', () => {
    it('should create client from DB credentials', async () => {
      const tokenExpiry = new Date(Date.now() + 3600_000)
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({
        parasutCompanyId: COMPANY_ID,
        parasutClientId: 'client-id',
        parasutClientSecret: 'client-secret',
        parasutUsername: 'user',
        parasutPassword: 'pass',
        parasutAccessToken: ACCESS_TOKEN,
        parasutRefreshToken: REFRESH_TOKEN,
        parasutTokenExpiry: tokenExpiry,
      })

      const client = await ParasutClient.forTenant(TENANT_ID)
      expect(client).toBeInstanceOf(ParasutClient)
      expect((client as any).tenantId).toBe(TENANT_ID)
      expect((client as any).companyId).toBe(COMPANY_ID)
      expect((client as any).accessToken).toBe(ACCESS_TOKEN)
      expect((client as any).refreshToken).toBe(REFRESH_TOKEN)
      expect((client as any).tokenExpiry).toBe(tokenExpiry)
    })

    it('should throw PARASUT_NOT_CONFIGURED when tenant has no parasut credentials', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({
        parasutCompanyId: null,
        parasutClientId: null,
      })

      await expect(ParasutClient.forTenant(TENANT_ID)).rejects.toThrow('PARASUT_NOT_CONFIGURED')
    })

    it('should throw PARASUT_NOT_CONFIGURED when tenant not found', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(null)

      await expect(ParasutClient.forTenant(TENANT_ID)).rejects.toThrow('PARASUT_NOT_CONFIGURED')
    })
  })

  // --------------------------------------------------
  // 2. testConnection
  // --------------------------------------------------
  describe('testConnection', () => {
    it('should return success with companyName on successful connection', async () => {
      const client = createAuthenticatedClient()
      mockFetchOk({ data: { attributes: { name: 'Acme Corp' } } })

      const result = await client.testConnection()

      expect(result).toEqual({
        success: true,
        companyName: 'Acme Corp',
      })
    })

    it('should send Authorization header with Bearer token', async () => {
      const client = createAuthenticatedClient()
      mockFetchOk({ data: { attributes: { name: 'Test' } } })

      await client.testConnection()

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain(`/${COMPANY_ID}/`)
      expect(options.headers.Authorization).toBe(`Bearer ${ACCESS_TOKEN}`)
    })

    it('should return fallback companyName when attributes.name is empty', async () => {
      const client = createAuthenticatedClient()
      mockFetchOk({ data: { attributes: {} } })

      const result = await client.testConnection()

      expect(result.success).toBe(true)
      expect(result.companyName).toBe('Bağlantı başarılı')
    })

    it('should return success:false with error message on API error', async () => {
      const client = createAuthenticatedClient()
      // API returns non-ok -- the request() method will throw, testConnection catches it
      mockFetchError(500, { error: 'Internal Server Error' })

      const result = await client.testConnection()

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should return success:false on network error', async () => {
      const client = createAuthenticatedClient()
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await client.testConnection()

      expect(result).toEqual({
        success: false,
        error: 'Network error',
      })
    })
  })

  // --------------------------------------------------
  // 3. getContacts
  // --------------------------------------------------
  describe('getContacts', () => {
    const mockContactsResponse = {
      data: [
        {
          id: '1',
          type: 'contacts',
          attributes: {
            name: 'Firma A',
            short_name: 'FA',
            email: 'a@example.com',
            phone: '555-0001',
          },
        },
        {
          id: '2',
          type: 'contacts',
          attributes: {
            name: 'Firma B',
            short_name: 'FB',
            email: 'b@example.com',
            phone: '555-0002',
          },
        },
      ],
      meta: { total_count: 2, total_pages: 1, current_page: 1, per_page: 25 },
    }

    it('should return paginated contacts with default pagination (page=1, perPage=25)', async () => {
      const client = createAuthenticatedClient()
      mockFetchOk(mockContactsResponse)

      const result = await client.getContacts()

      expect(result.data).toHaveLength(2)
      expect(result.data[0].attributes.name).toBe('Firma A')
      expect(result.meta.total_pages).toBe(1)

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('page[number]=1')
      expect(url).toContain('page[size]=25')
      expect(url).toContain('filter[account_type]=customer')
      expect(url).toContain('include=contact_people')
    })

    it('should use custom pagination parameters', async () => {
      const client = createAuthenticatedClient()
      mockFetchOk({ data: [], meta: { total_count: 0, total_pages: 0, current_page: 3, per_page: 50 } })

      await client.getContacts(3, 50)

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('page[number]=3')
      expect(url).toContain('page[size]=50')
    })

    it('should return empty data array when no contacts exist', async () => {
      const client = createAuthenticatedClient()
      mockFetchOk({ data: [], meta: { total_count: 0, total_pages: 0, current_page: 1, per_page: 25 } })

      const result = await client.getContacts()

      expect(result.data).toEqual([])
    })
  })

  // --------------------------------------------------
  // 4. getProducts
  // --------------------------------------------------
  describe('getProducts', () => {
    const mockProductsResponse = {
      data: [
        {
          id: '10',
          type: 'products',
          attributes: {
            name: 'Urun A',
            code: 'UA-001',
            list_price: '100.00',
            currency: 'TRY',
            unit: 'Adet',
            vat_rate: '20',
          },
        },
        {
          id: '11',
          type: 'products',
          attributes: {
            name: 'Urun B',
            code: 'UB-002',
            list_price: '250.50',
            currency: 'USD',
            unit: 'Kg',
            vat_rate: '10',
          },
        },
      ],
      meta: { total_count: 2, total_pages: 1, current_page: 1, per_page: 25 },
    }

    it('should return paginated products with default pagination', async () => {
      const client = createAuthenticatedClient()
      mockFetchOk(mockProductsResponse)

      const result = await client.getProducts()

      expect(result.data).toHaveLength(2)
      expect(result.data[0].attributes.name).toBe('Urun A')
      expect(result.data[1].attributes.code).toBe('UB-002')

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('page[number]=1')
      expect(url).toContain('page[size]=25')
    })

    it('should use custom pagination parameters', async () => {
      const client = createAuthenticatedClient()
      mockFetchOk({ data: [], meta: { total_count: 0, total_pages: 0, current_page: 2, per_page: 10 } })

      await client.getProducts(2, 10)

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('page[number]=2')
      expect(url).toContain('page[size]=10')
    })

    it('should return empty data array when no products exist', async () => {
      const client = createAuthenticatedClient()
      mockFetchOk({ data: [], meta: { total_count: 0, total_pages: 0, current_page: 1, per_page: 25 } })

      const result = await client.getProducts()

      expect(result.data).toEqual([])
    })
  })

  // --------------------------------------------------
  // 5. syncAllContacts (uses prisma internally)
  // --------------------------------------------------
  describe('syncAllContacts', () => {
    const makePage = (
      contacts: Array<{ id: string; name: string }>,
      currentPage: number,
      totalPages: number
    ) => ({
      data: contacts.map((c) => ({
        id: c.id,
        type: 'contacts',
        attributes: {
          name: c.name,
          short_name: null,
          tax_number: null,
          tax_office: null,
          email: null,
          phone: null,
          fax: null,
          address: null,
          city: null,
          district: null,
          balance: '0',
        },
        relationships: {},
      })),
      meta: { total_count: contacts.length, total_pages: totalPages, current_page: currentPage, per_page: 25 },
    })

    it('should sync contacts across multiple pages and return synced count', async () => {
      const client = createAuthenticatedClient()

      // Page 1 - two contacts
      mockFetchOk(makePage([{ id: '1', name: 'A' }, { id: '2', name: 'B' }], 1, 2))
      // Page 2 - one contact
      mockFetchOk(makePage([{ id: '3', name: 'C' }], 2, 2))

      mockPrisma.customer.upsert.mockResolvedValue({})
      mockPrisma.parasutSyncLog.create.mockResolvedValue({})
      mockPrisma.tenant.update.mockResolvedValue({})

      const result = await client.syncAllContacts()

      expect(result).toEqual({ synced: 3, errors: 0 })
      expect(mockPrisma.customer.upsert).toHaveBeenCalledTimes(3)
      expect(mockFetch).toHaveBeenCalledTimes(2) // 2 pages
    })

    it('should upsert customer with correct tenantId_parasutId compound key', async () => {
      const client = createAuthenticatedClient()
      mockFetchOk(makePage([{ id: '42', name: 'Test Contact' }], 1, 1))
      mockPrisma.customer.upsert.mockResolvedValue({})
      mockPrisma.parasutSyncLog.create.mockResolvedValue({})
      mockPrisma.tenant.update.mockResolvedValue({})

      await client.syncAllContacts()

      expect(mockPrisma.customer.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId_parasutId: {
              tenantId: TENANT_ID,
              parasutId: '42',
            },
          },
          create: expect.objectContaining({
            tenantId: TENANT_ID,
            parasutId: '42',
            name: 'Test Contact',
          }),
          update: expect.objectContaining({
            name: 'Test Contact',
          }),
        })
      )
    })

    it('should count errors when individual contact upsert fails', async () => {
      const client = createAuthenticatedClient()
      mockFetchOk(
        makePage(
          [
            { id: '1', name: 'Good' },
            { id: '2', name: 'Bad' },
            { id: '3', name: 'Also Good' },
          ],
          1,
          1
        )
      )

      mockPrisma.customer.upsert
        .mockResolvedValueOnce({}) // '1' succeeds
        .mockRejectedValueOnce(new Error('DB error')) // '2' fails
        .mockResolvedValueOnce({}) // '3' succeeds

      mockPrisma.parasutSyncLog.create.mockResolvedValue({})
      mockPrisma.tenant.update.mockResolvedValue({})

      const result = await client.syncAllContacts()

      expect(result).toEqual({ synced: 2, errors: 1 })
    })

    it('should create parasutSyncLog with COMPLETED status when no errors', async () => {
      const client = createAuthenticatedClient()
      mockFetchOk(makePage([{ id: '1', name: 'A' }], 1, 1))
      mockPrisma.customer.upsert.mockResolvedValue({})
      mockPrisma.parasutSyncLog.create.mockResolvedValue({})
      mockPrisma.tenant.update.mockResolvedValue({})

      await client.syncAllContacts()

      expect(mockPrisma.parasutSyncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          entityType: 'customer',
          direction: 'PULL',
          status: 'COMPLETED',
          recordCount: 1,
          errorCount: 0,
        }),
      })
    })

    it('should create parasutSyncLog with PARTIAL status when there are errors', async () => {
      const client = createAuthenticatedClient()
      mockFetchOk(makePage([{ id: '1', name: 'A' }], 1, 1))
      mockPrisma.customer.upsert.mockRejectedValueOnce(new Error('fail'))
      mockPrisma.parasutSyncLog.create.mockResolvedValue({})
      mockPrisma.tenant.update.mockResolvedValue({})

      await client.syncAllContacts()

      expect(mockPrisma.parasutSyncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'PARTIAL',
          recordCount: 0,
          errorCount: 1,
        }),
      })
    })

    it('should update tenant parasutLastSyncAt after sync', async () => {
      const client = createAuthenticatedClient()
      mockFetchOk(makePage([], 1, 1))
      mockPrisma.parasutSyncLog.create.mockResolvedValue({})
      mockPrisma.tenant.update.mockResolvedValue({})

      await client.syncAllContacts()

      expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        data: { parasutLastSyncAt: expect.any(Date) },
      })
    })

    it('should sync contact people when relationships exist', async () => {
      const client = createAuthenticatedClient()

      const responseWithContactPeople = {
        data: [
          {
            id: '1',
            type: 'contacts',
            attributes: {
              name: 'Firma X',
              short_name: null,
              tax_number: null,
              tax_office: null,
              email: null,
              phone: null,
              fax: null,
              address: null,
              city: null,
              district: null,
              balance: '0',
            },
            relationships: {
              contact_people: {
                data: [{ id: 'cp-1', type: 'contact_people' }],
              },
            },
          },
        ],
        included: [
          {
            id: 'cp-1',
            type: 'contact_people',
            attributes: {
              name: 'Ali Veli',
              email: 'ali@firma.com',
              phone: '555-9999',
              title: 'Mudur',
            },
          },
        ],
        meta: { total_count: 1, total_pages: 1, current_page: 1, per_page: 25 },
      }

      mockFetchOk(responseWithContactPeople)
      mockPrisma.customer.upsert.mockResolvedValue({})
      mockPrisma.customer.findFirst.mockResolvedValue({ id: 'db-customer-1' })
      mockPrisma.customerContact.upsert.mockResolvedValue({})
      mockPrisma.parasutSyncLog.create.mockResolvedValue({})
      mockPrisma.tenant.update.mockResolvedValue({})

      await client.syncAllContacts()

      expect(mockPrisma.customerContact.upsert).toHaveBeenCalledWith({
        where: { id: 'parasut_cp-1' },
        create: expect.objectContaining({
          id: 'parasut_cp-1',
          customerId: 'db-customer-1',
          name: 'Ali Veli',
          email: 'ali@firma.com',
        }),
        update: expect.objectContaining({
          name: 'Ali Veli',
          email: 'ali@firma.com',
        }),
      })
    })
  })

  // --------------------------------------------------
  // 6. Error handling
  // --------------------------------------------------
  describe('Error Handling', () => {
    it('should throw PARASUT_TOKEN_EXPIRED when no valid token and refresh fails', async () => {
      const client = new ParasutClient(TENANT_ID, COMPANY_ID)
      // No token set, refreshToken is null so refreshAccessToken returns false immediately

      await expect(client.testConnection()).resolves.toEqual({
        success: false,
        error: 'PARASUT_TOKEN_EXPIRED',
      })
    })

    it('should throw PARASUT_API_ERROR on non-401 HTTP errors from request()', async () => {
      const client = createAuthenticatedClient()
      mockFetchError(500, { error: 'Internal Server Error' })

      await expect(client.getContacts()).rejects.toThrow('PARASUT_API_ERROR')
    })

    it('should attempt token refresh on 401 and retry the request', async () => {
      const client = createAuthenticatedClient()

      // First call returns 401
      mockFetchError(401, { error: 'Unauthorized' })
      // refreshAccessToken reads tenant from DB
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({
        parasutClientId: 'cid',
        parasutClientSecret: 'csecret',
      })
      // refresh token fetch succeeds
      mockFetchOk({
        access_token: 'new-token',
        refresh_token: 'new-refresh',
        expires_in: 3600,
      })
      // saveTokens updates DB
      mockPrisma.tenant.update.mockResolvedValueOnce({})
      // Retry the original request -- but getValidToken will use the new token
      // The retried request via request() calls getValidToken again, token is fresh
      mockFetchOk({
        data: [],
        meta: { total_count: 0, total_pages: 0, current_page: 1, per_page: 25 },
      })

      const result = await client.getContacts()

      expect(result.data).toEqual([])
      // 3 fetch calls: original 401 + refresh token + retry
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should throw PARASUT_UNAUTHORIZED when 401 and refresh fails', async () => {
      const client = createAuthenticatedClient()

      // First call returns 401
      mockFetchError(401, { error: 'Unauthorized' })
      // refreshAccessToken reads tenant from DB
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({
        parasutClientId: 'cid',
        parasutClientSecret: 'csecret',
      })
      // refresh token fetch fails
      mockFetchError(401, { error: 'invalid refresh token' })

      await expect(client.getContacts()).rejects.toThrow('PARASUT_UNAUTHORIZED')
    })

    it('should propagate network errors from fetch', async () => {
      const client = createAuthenticatedClient()
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))

      await expect(client.getProducts()).rejects.toThrow('ECONNREFUSED')
    })

    it('should handle json parse error in error response gracefully', async () => {
      const client = createAuthenticatedClient()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => { throw new Error('not json') },
      })

      await expect(client.getContacts()).rejects.toThrow('PARASUT_API_ERROR')
    })
  })

  // --------------------------------------------------
  // Token expiry and auto-refresh behavior
  // --------------------------------------------------
  describe('Token expiry handling', () => {
    it('should use cached token when not expired (with 5min buffer)', async () => {
      const client = createAuthenticatedClient()
      // Token is set 1 hour in the future, well within buffer
      mockFetchOk({ data: { attributes: { name: 'OK' } } })

      await client.testConnection()

      // Only 1 fetch call (no refresh)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should refresh token when within 5 minute buffer of expiry', async () => {
      const client = createAuthenticatedClient()
      // Set token to expire in 4 minutes (within 5min buffer)
      ;(client as any).tokenExpiry = new Date(Date.now() + 4 * 60 * 1000)

      // refreshAccessToken reads tenant
      mockPrisma.tenant.findUnique.mockResolvedValueOnce({
        parasutClientId: 'cid',
        parasutClientSecret: 'csecret',
      })
      // refresh succeeds
      mockFetchOk({
        access_token: 'refreshed-token',
        refresh_token: 'refreshed-refresh',
        expires_in: 3600,
      })
      // saveTokens
      mockPrisma.tenant.update.mockResolvedValueOnce({})
      // actual API call
      mockFetchOk({ data: { attributes: { name: 'Company' } } })

      const result = await client.testConnection()

      expect(result.success).toBe(true)
      // 2 fetch calls: refresh + actual request
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  // --------------------------------------------------
  // authenticate
  // --------------------------------------------------
  describe('authenticate', () => {
    it('should return true on successful authentication', async () => {
      const client = createAuthenticatedClient()

      mockFetchOk({
        access_token: 'new-at',
        refresh_token: 'new-rt',
        expires_in: 7200,
      })
      mockPrisma.tenant.update.mockResolvedValueOnce({})

      const result = await client.authenticate({
        clientId: 'cid',
        clientSecret: 'csecret',
        username: 'user@example.com',
        password: 'pass123',
        companyId: COMPANY_ID,
      })

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(1)

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('oauth/token')
      const body = JSON.parse(options.body)
      expect(body.grant_type).toBe('password')
      expect(body.username).toBe('user@example.com')
    })

    it('should return false when auth endpoint returns non-ok', async () => {
      const client = createAuthenticatedClient()
      mockFetchError(401, { error: 'invalid_credentials' })

      const result = await client.authenticate({
        clientId: 'cid',
        clientSecret: 'csecret',
        username: 'bad@user.com',
        password: 'wrong',
        companyId: COMPANY_ID,
      })

      expect(result).toBe(false)
    })

    it('should return false on network error during authentication', async () => {
      const client = createAuthenticatedClient()
      mockFetch.mockRejectedValueOnce(new Error('Network down'))

      const result = await client.authenticate({
        clientId: 'cid',
        clientSecret: 'csecret',
        username: 'user@example.com',
        password: 'pass',
        companyId: COMPANY_ID,
      })

      expect(result).toBe(false)
    })

    it('should save credentials to DB on successful auth', async () => {
      const client = createAuthenticatedClient()
      mockFetchOk({
        access_token: 'at',
        refresh_token: 'rt',
        expires_in: 3600,
      })
      mockPrisma.tenant.update.mockResolvedValueOnce({})

      await client.authenticate({
        clientId: 'my-cid',
        clientSecret: 'my-csecret',
        username: 'me@co.com',
        password: 'pw',
        companyId: 'comp-id',
      })

      expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        data: expect.objectContaining({
          parasutAccessToken: 'at',
          parasutRefreshToken: 'rt',
          parasutClientId: 'my-cid',
          parasutClientSecret: 'my-csecret',
          parasutUsername: 'me@co.com',
          parasutSyncEnabled: true,
        }),
      })
    })
  })

  // --------------------------------------------------
  // Sales Offers - getSalesOffers
  // --------------------------------------------------
  describe('getSalesOffers', () => {
    const mockOffersResponse = {
      data: [
        {
          id: '100',
          type: 'sales_offers',
          attributes: {
            description: 'Teklif A',
            status: 'waiting',
            net_total: 1000,
            gross_total: 1200,
            total_vat: 200,
            total_discount: 0,
            issue_date: '2026-04-01',
            due_date: '2026-04-15',
            currency: 'TRL',
            updated_at: '2026-04-01T10:00:00Z',
          },
        },
        {
          id: '101',
          type: 'sales_offers',
          attributes: {
            description: 'Teklif B',
            status: 'accepted',
            net_total: 5000,
            gross_total: 5900,
            total_vat: 900,
            total_discount: 100,
            issue_date: '2026-03-20',
            due_date: '2026-04-20',
            currency: 'TRL',
            updated_at: '2026-03-25T15:00:00Z',
          },
        },
      ],
      meta: { total_count: 2, total_pages: 1, current_page: 1, per_page: 25 },
    }

    it('should return paginated sales offers with default pagination', async () => {
      const client = createAuthenticatedClient()
      mockFetchOk(mockOffersResponse)

      const result = await client.getSalesOffers()

      expect(result.data).toHaveLength(2)
      expect(result.data[0].attributes.description).toBe('Teklif A')
      expect(result.meta.total_pages).toBe(1)

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('sales_offers')
      expect(url).toContain('page[number]=1')
      expect(url).toContain('page[size]=25')
      expect(url).toContain('include=contact')
    })

    it('should append status filter when provided', async () => {
      const client = createAuthenticatedClient()
      mockFetchOk({ data: [], meta: { total_count: 0, total_pages: 0, current_page: 1, per_page: 25 } })

      await client.getSalesOffers(1, 25, { status: 'accepted' })

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('filter[status]=accepted')
    })

    it('should append archived filter when provided', async () => {
      const client = createAuthenticatedClient()
      mockFetchOk({ data: [], meta: { total_count: 0, total_pages: 0, current_page: 1, per_page: 25 } })

      await client.getSalesOffers(1, 25, { archived: false })

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('filter[archived]=false')
    })

    it('should use custom pagination parameters', async () => {
      const client = createAuthenticatedClient()
      mockFetchOk({ data: [], meta: { total_count: 0, total_pages: 0, current_page: 2, per_page: 10 } })

      await client.getSalesOffers(2, 10)

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('page[number]=2')
      expect(url).toContain('page[size]=10')
    })
  })

  // --------------------------------------------------
  // Sales Offers - getSalesOffer (single)
  // --------------------------------------------------
  describe('getSalesOffer', () => {
    it('should return single sales offer with details and contact included', async () => {
      const mockOfferDetail = {
        data: {
          id: '100',
          type: 'sales_offers',
          attributes: {
            description: 'Teklif Detay',
            status: 'waiting',
            net_total: 1000,
            gross_total: 1200,
            total_vat: 200,
            total_discount: 0,
            issue_date: '2026-04-01',
            due_date: '2026-04-15',
            currency: 'TRL',
            updated_at: '2026-04-01T10:00:00Z',
          },
        },
        included: [
          { id: 'd1', type: 'sales_offer_details', attributes: { quantity: 5, unit_price: 200 } },
        ],
      }

      const client = createAuthenticatedClient()
      mockFetchOk(mockOfferDetail)

      const result = await client.getSalesOffer('100')

      expect(result.data.id).toBe('100')
      expect(result.data.attributes.description).toBe('Teklif Detay')
      expect(result.included).toHaveLength(1)

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('sales_offers/100')
      expect(url).toContain('include=details.product,contact')
    })
  })

  // --------------------------------------------------
  // Sales Offers - createSalesOffer
  // --------------------------------------------------
  describe('createSalesOffer', () => {
    it('should POST to sales_offers with JSONAPI body and return created offer', async () => {
      const createBody = {
        data: {
          type: 'sales_offers' as const,
          attributes: {
            issue_date: '2026-04-06',
            description: 'New Offer',
            currency: 'TRL',
          },
          relationships: {
            contact: { data: { id: '50', type: 'contacts' } },
            details: { data: [] },
          },
        },
      }

      const mockResponse = {
        data: {
          id: '200',
          type: 'sales_offers',
          attributes: {
            description: 'New Offer',
            status: 'waiting',
            net_total: 0,
            gross_total: 0,
            total_vat: 0,
            total_discount: 0,
            issue_date: '2026-04-06',
            currency: 'TRL',
            updated_at: '2026-04-06T12:00:00Z',
          },
        },
      }

      const client = createAuthenticatedClient()
      mockFetchOk(mockResponse)

      const result = await client.createSalesOffer(createBody as any)

      expect(result.data.id).toBe('200')
      expect(result.data.attributes.description).toBe('New Offer')

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('sales_offers')
      expect(options.method).toBe('POST')
      const sentBody = JSON.parse(options.body)
      expect(sentBody.data.type).toBe('sales_offers')
      expect(sentBody.data.attributes.description).toBe('New Offer')
      expect(sentBody.data.relationships.contact.data.id).toBe('50')
    })
  })

  // --------------------------------------------------
  // Sales Offers - updateSalesOffer
  // --------------------------------------------------
  describe('updateSalesOffer', () => {
    it('should PUT to sales_offers/:id with updated body', async () => {
      const updateBody = {
        data: {
          type: 'sales_offers' as const,
          attributes: {
            description: 'Updated Offer',
            currency: 'USD',
          },
          relationships: {
            contact: { data: { id: '50', type: 'contacts' } },
            details: { data: [] },
          },
        },
      }

      const mockResponse = {
        data: {
          id: '200',
          type: 'sales_offers',
          attributes: {
            description: 'Updated Offer',
            status: 'waiting',
            net_total: 0,
            gross_total: 0,
            total_vat: 0,
            total_discount: 0,
            currency: 'USD',
            updated_at: '2026-04-06T14:00:00Z',
          },
        },
      }

      const client = createAuthenticatedClient()
      mockFetchOk(mockResponse)

      const result = await client.updateSalesOffer('200', updateBody as any)

      expect(result.data.attributes.description).toBe('Updated Offer')

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('sales_offers/200')
      expect(options.method).toBe('PUT')
    })
  })

  // --------------------------------------------------
  // Sales Offers - deleteSalesOffer
  // --------------------------------------------------
  describe('deleteSalesOffer', () => {
    it('should DELETE sales_offers/:id', async () => {
      const client = createAuthenticatedClient()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => undefined,
      })

      await client.deleteSalesOffer('200')

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('sales_offers/200')
      expect(options.method).toBe('DELETE')
    })
  })

  // --------------------------------------------------
  // Sales Offers - updateSalesOfferStatus
  // --------------------------------------------------
  describe('updateSalesOfferStatus', () => {
    it.each(['accepted', 'rejected', 'waiting'] as const)(
      'should PATCH status to %s',
      async (status) => {
        const mockResponse = {
          data: {
            id: '100',
            type: 'sales_offers',
            attributes: {
              status,
              description: 'Some Offer',
              net_total: 1000,
              gross_total: 1200,
              total_vat: 200,
              total_discount: 0,
              updated_at: '2026-04-06T15:00:00Z',
            },
          },
        }

        const client = createAuthenticatedClient()
        mockFetchOk(mockResponse)

        const result = await client.updateSalesOfferStatus('100', status)

        expect(result.data.attributes.status).toBe(status)

        const [url, options] = mockFetch.mock.calls[0]
        expect(url).toContain('sales_offers/100/update_status')
        expect(options.method).toBe('PATCH')
        const sentBody = JSON.parse(options.body)
        expect(sentBody.data.id).toBe('100')
        expect(sentBody.data.type).toBe('sales_offers')
        expect(sentBody.data.attributes.status).toBe(status)
      }
    )
  })

  // --------------------------------------------------
  // Sales Offers - generateSalesOfferPdf
  // --------------------------------------------------
  describe('generateSalesOfferPdf', () => {
    it('should POST to sales_offers/:id/pdf and return job data', async () => {
      const mockResponse = {
        data: {
          id: 'job-555',
          type: 'trackable_jobs',
          attributes: { url: '', status: 'running' },
        },
      }

      const client = createAuthenticatedClient()
      mockFetchOk(mockResponse)

      const result = await client.generateSalesOfferPdf('100')

      expect(result.data.id).toBe('job-555')
      expect(result.data.attributes.status).toBe('running')

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('sales_offers/100/pdf')
      expect(options.method).toBe('POST')
    })
  })

  // --------------------------------------------------
  // Sales Offers - pushProposal
  // --------------------------------------------------
  describe('pushProposal', () => {
    const baseProposal = {
      id: 'prop-1',
      title: 'Test Teklif',
      description: 'Aciklama',
      currency: 'TRY',
      subtotal: 1000,
      discountType: 'PERCENTAGE' as const,
      discountValue: 10,
      grandTotal: 900,
      expiresAt: new Date('2026-05-01'),
      notes: 'Notlar burada',
      customer: {
        parasutId: 'parasut-cust-1',
        taxNumber: '1234567890',
        taxOffice: 'Kadikoy VD',
        address: 'Istanbul',
        city: 'Istanbul',
        district: 'Kadikoy',
        phone: '555-1234',
      },
      items: [
        {
          name: 'Urun A',
          description: 'Detay A',
          quantity: 5,
          unitPrice: 100,
          vatRate: 20,
          discountRate: 10,
          product: { parasutId: 'parasut-prod-1' },
        },
        {
          name: 'Hizmet B',
          description: null,
          quantity: 1,
          unitPrice: 500,
          vatRate: 20,
          discountRate: 0,
          product: null,
        },
      ],
    }

    it('should throw when customer has no parasutId', async () => {
      const client = createAuthenticatedClient()
      const proposal = {
        ...baseProposal,
        customer: { ...baseProposal.customer, parasutId: null },
      }

      await expect(client.pushProposal(proposal)).rejects.toThrow(
        'Customer does not have a Parasut ID'
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should map TRY currency to TRL for Parasut', async () => {
      const client = createAuthenticatedClient()
      mockFetchOk({ data: { id: 'new-offer-1', type: 'sales_offers', attributes: {} } })

      await client.pushProposal(baseProposal)

      const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(sentBody.data.attributes.currency).toBe('TRL')
    })

    it('should keep USD/EUR/GBP currencies as-is', async () => {
      const client = createAuthenticatedClient()
      mockFetchOk({ data: { id: 'new-offer-2', type: 'sales_offers', attributes: {} } })

      await client.pushProposal({ ...baseProposal, currency: 'USD' })

      const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(sentBody.data.attributes.currency).toBe('USD')
    })

    it('should map line items with product parasutId as relationships', async () => {
      const client = createAuthenticatedClient()
      mockFetchOk({ data: { id: 'new-offer-3', type: 'sales_offers', attributes: {} } })

      await client.pushProposal(baseProposal)

      const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const details = sentBody.data.relationships.details.data

      expect(details).toHaveLength(2)
      // First item has product parasutId
      expect(details[0].relationships.product.data.id).toBe('parasut-prod-1')
      expect(details[0].relationships.product.data.type).toBe('products')
      expect(details[0].attributes.quantity).toBe(5)
      expect(details[0].attributes.unit_price).toBe(100)
      expect(details[0].attributes.vat_rate).toBe(20)
      expect(details[0].attributes.discount_type).toBe('percentage')
      expect(details[0].attributes.discount_value).toBe(10)
      // Second item has no product
      expect(details[1].relationships).toBeUndefined()
      expect(details[1].attributes.discount_type).toBeUndefined()
      expect(details[1].attributes.discount_value).toBeUndefined()
    })

    it('should set contact relationship with customer parasutId', async () => {
      const client = createAuthenticatedClient()
      mockFetchOk({ data: { id: 'new-offer-4', type: 'sales_offers', attributes: {} } })

      await client.pushProposal(baseProposal)

      const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(sentBody.data.relationships.contact.data.id).toBe('parasut-cust-1')
      expect(sentBody.data.relationships.contact.data.type).toBe('contacts')
    })

    it('should map customer billing fields to Parasut attributes', async () => {
      const client = createAuthenticatedClient()
      mockFetchOk({ data: { id: 'new-offer-5', type: 'sales_offers', attributes: {} } })

      await client.pushProposal(baseProposal)

      const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const attrs = sentBody.data.attributes
      expect(attrs.billing_address).toBe('Istanbul')
      expect(attrs.billing_phone).toBe('555-1234')
      expect(attrs.tax_office).toBe('Kadikoy VD')
      expect(attrs.tax_number).toBe('1234567890')
      expect(attrs.city).toBe('Istanbul')
      expect(attrs.district).toBe('Kadikoy')
      expect(attrs.content).toBe('Notlar burada')
    })

    it('should map PERCENTAGE discount type correctly', async () => {
      const client = createAuthenticatedClient()
      mockFetchOk({ data: { id: 'new-offer-6', type: 'sales_offers', attributes: {} } })

      await client.pushProposal(baseProposal)

      const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(sentBody.data.attributes.invoice_discount_type).toBe('percentage')
      expect(sentBody.data.attributes.invoice_discount).toBe(10)
    })

    it('should map FIXED discount type to amount', async () => {
      const client = createAuthenticatedClient()
      mockFetchOk({ data: { id: 'new-offer-7', type: 'sales_offers', attributes: {} } })

      await client.pushProposal({ ...baseProposal, discountType: 'FIXED', discountValue: 50 })

      const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(sentBody.data.attributes.invoice_discount_type).toBe('amount')
      expect(sentBody.data.attributes.invoice_discount).toBe(50)
    })

    it('should set due_date from expiresAt', async () => {
      const client = createAuthenticatedClient()
      mockFetchOk({ data: { id: 'new-offer-8', type: 'sales_offers', attributes: {} } })

      await client.pushProposal(baseProposal)

      const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(sentBody.data.attributes.due_date).toBe('2026-05-01')
    })

    it('should return the Parasut offer ID', async () => {
      const client = createAuthenticatedClient()
      mockFetchOk({ data: { id: 'returned-id-999', type: 'sales_offers', attributes: {} } })

      const result = await client.pushProposal(baseProposal)

      expect(result).toBe('returned-id-999')
    })
  })

  // --------------------------------------------------
  // Sales Offers - pullSalesOfferStatus
  // --------------------------------------------------
  describe('pullSalesOfferStatus', () => {
    it('should return mapped status fields from Parasut offer', async () => {
      const mockResponse = {
        data: {
          id: '100',
          type: 'sales_offers',
          attributes: {
            status: 'accepted',
            net_total: 1000,
            gross_total: 1200,
            total_vat: 200,
            total_discount: 50,
            updated_at: '2026-04-05T18:00:00Z',
            description: 'Some offer',
            issue_date: '2026-04-01',
            currency: 'TRL',
          },
        },
        included: [],
      }

      const client = createAuthenticatedClient()
      mockFetchOk(mockResponse)

      const result = await client.pullSalesOfferStatus('100')

      expect(result).toEqual({
        status: 'accepted',
        netTotal: 1000,
        grossTotal: 1200,
        totalVat: 200,
        totalDiscount: 50,
        updatedAt: '2026-04-05T18:00:00Z',
      })

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('sales_offers/100')
    })
  })

  // --------------------------------------------------
  // Sales Offers - shareSalesOffer
  // --------------------------------------------------
  describe('shareSalesOffer', () => {
    it('should POST sharing data to sharings endpoint', async () => {
      const sharingBody = {
        data: {
          type: 'sharings',
          attributes: {
            email: 'musteri@example.com',
            sending_type: 'email',
          },
          relationships: {
            sharable: {
              data: { id: '100', type: 'sales_offers' },
            },
          },
        },
      }

      const mockResponse = { data: { id: 'sharing-1', type: 'sharings' } }

      const client = createAuthenticatedClient()
      mockFetchOk(mockResponse)

      const result = await client.shareSalesOffer(sharingBody as any)

      expect(result.data).toBeDefined()

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('sharings')
      expect(options.method).toBe('POST')
      const sentBody = JSON.parse(options.body)
      expect(sentBody.data.type).toBe('sharings')
      expect(sentBody.data.relationships.sharable.data.id).toBe('100')
      expect(sentBody.data.relationships.sharable.data.type).toBe('sales_offers')
    })
  })

  // --------------------------------------------------
  // Sales Offers - Error cases
  // --------------------------------------------------
  describe('Sales Offers Error Handling', () => {
    it('should throw PARASUT_API_ERROR on 404 for getSalesOffer', async () => {
      const client = createAuthenticatedClient()
      mockFetchError(404, { errors: [{ title: 'Not Found' }] })

      await expect(client.getSalesOffer('nonexistent')).rejects.toThrow('PARASUT_API_ERROR')
    })

    it('should throw PARASUT_API_ERROR on 422 for createSalesOffer', async () => {
      const client = createAuthenticatedClient()
      mockFetchError(422, { errors: [{ title: 'Validation Error', detail: 'Contact is required' }] })

      await expect(
        client.createSalesOffer({ data: { type: 'sales_offers', attributes: {} } } as any)
      ).rejects.toThrow('PARASUT_API_ERROR')
    })

    it('should throw PARASUT_API_ERROR on 500 for deleteSalesOffer', async () => {
      const client = createAuthenticatedClient()
      mockFetchError(500, { error: 'Internal Server Error' })

      await expect(client.deleteSalesOffer('100')).rejects.toThrow('PARASUT_API_ERROR')
    })
  })
})
