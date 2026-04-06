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
})
