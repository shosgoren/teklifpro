/**
 * @jest-environment node
 *
 * Parasut V4 API Integration Tests
 *
 * These tests validate the full request/response cycle against the Parasut API.
 * They use mocked HTTP responses that match the real Parasut API JSON:API format.
 *
 * To run against real API (requires credentials):
 *   PARASUT_LIVE_TEST=true npx jest __tests__/integration/parasut-api.test.ts
 */

import { ParasutClient } from '@/infrastructure/services/parasut/ParasutClient'

const IS_LIVE = process.env.PARASUT_LIVE_TEST === 'true'
const mockFetch = jest.fn()

jest.mock('@/shared/utils/prisma', () => ({
  prisma: {
    tenant: {
      findUnique: jest.fn().mockResolvedValue({
        parasutCompanyId: process.env.PARASUT_COMPANY_ID || 'test-company',
        parasutClientId: process.env.PARASUT_CLIENT_ID || 'test-client',
        parasutClientSecret: process.env.PARASUT_CLIENT_SECRET || 'test-secret',
        parasutUsername: process.env.PARASUT_USERNAME || 'test-user',
        parasutPassword: process.env.PARASUT_PASSWORD || 'test-pass',
        parasutAccessToken: 'mock-token',
        parasutRefreshToken: 'mock-refresh',
        parasutTokenExpiry: new Date(Date.now() + 3600000),
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    customer: { upsert: jest.fn().mockResolvedValue({ id: 'c1' }) },
    product: { upsert: jest.fn().mockResolvedValue({ id: 'p1' }) },
    supplier: { findFirst: jest.fn().mockResolvedValue({ id: 's1' }) },
    purchaseBill: { upsert: jest.fn().mockResolvedValue({ id: 'pb1' }) },
    productCategory: { upsert: jest.fn().mockResolvedValue({ id: 'cat1' }) },
    parasutSyncLog: { create: jest.fn().mockResolvedValue({ id: 'sl1' }) },
  },
}))

jest.mock('@/infrastructure/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
  })),
}))

if (!IS_LIVE) {
  global.fetch = mockFetch
}

describe('Parasut API Integration', () => {
  let client: ParasutClient

  beforeEach(() => {
    if (!IS_LIVE) mockFetch.mockReset()
    ParasutClient.resetRateLimit()
    client = new ParasutClient('tenant-1', process.env.PARASUT_COMPANY_ID || 'test-company')
    ;(client as any).accessToken = 'test-token' // eslint-disable-line
    ;(client as any).tokenExpiry = new Date(Date.now() + 3600000) // eslint-disable-line
  })

  // ==================== CONTACTS ====================
  describe('Contacts API', () => {
    it('should fetch contacts with JSON:API pagination', async () => {
      if (!IS_LIVE) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                id: '101',
                type: 'contacts',
                attributes: {
                  name: 'Acme Corp',
                  short_name: 'Acme',
                  contact_type: 'customer',
                  tax_number: '1234567890',
                  tax_office: 'Kadıköy',
                  email: 'info@acme.com',
                  phone: '+905551234567',
                  address: 'Test Adres',
                  city: 'Istanbul',
                  district: 'Kadıköy',
                  balance: '5000.00',
                  archived: false,
                },
              },
            ],
            meta: { current_page: 1, total_count: 1, per_page: 25 },
          }),
        })
      }

      const result = await client.getContacts(1, 25)
      expect(result.data).toBeDefined()
      expect(Array.isArray(result.data)).toBe(true)
      if (result.data.length > 0) {
        expect(result.data[0].attributes).toHaveProperty('name')
        expect(result.data[0].attributes).toHaveProperty('tax_number')
      }
      expect(result.meta).toBeDefined()
    })

    it('should search contacts by name', async () => {
      if (!IS_LIVE) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              { id: '101', type: 'contacts', attributes: { name: 'Acme Corp' } },
            ],
            meta: { current_page: 1, total_count: 1, per_page: 25 },
          }),
        })
      }

      const result = await client.searchContacts('Acme')
      expect(result.data).toBeDefined()
    })
  })

  // ==================== PRODUCTS ====================
  describe('Products API', () => {
    it('should fetch products with stock info', async () => {
      if (!IS_LIVE) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                id: '201',
                type: 'products',
                attributes: {
                  name: 'Widget A',
                  code: 'WDG-001',
                  unit: 'Adet',
                  list_price: '150.00',
                  currency: 'TRL',
                  vat_rate: 20,
                  inventory_tracking: true,
                  archived: false,
                },
              },
            ],
            meta: { current_page: 1, total_count: 1, per_page: 25 },
          }),
        })
      }

      const result = await client.getProducts(1, 25)
      expect(result.data).toBeDefined()
      if (result.data.length > 0) {
        expect(result.data[0].attributes).toHaveProperty('name')
        expect(result.data[0].attributes).toHaveProperty('list_price')
      }
    })
  })

  // ==================== SALES OFFERS ====================
  describe('Sales Offers API', () => {
    it('should create a sales offer with line items', async () => {
      if (!IS_LIVE) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              id: '301',
              type: 'sales_offers',
              attributes: {
                status: 'waiting',
                net_total: 1200,
                gross_total: 1000,
                total_vat: 200,
                issue_date: '2026-04-06',
                currency: 'TRL',
              },
              relationships: {
                contact: { data: { id: '101', type: 'contacts' } },
                details: { data: [{ id: 'd1', type: 'sales_offer_details' }] },
              },
            },
          }),
        })
      }

      const result = await client.createSalesOffer({
        data: {
          type: 'sales_offers',
          attributes: {
            issue_date: '2026-04-06',
            currency: 'TRL',
            description: 'Integration Test Offer',
          },
          relationships: {
            contact: { data: { id: '101', type: 'contacts' } },
            details: {
              data: [{
                type: 'sales_offer_details',
                attributes: { quantity: 5, unit_price: 200, vat_rate: 20 },
              }],
            },
          },
        },
      })

      expect(result.data.id).toBeDefined()
      expect(result.data.type).toBe('sales_offers')
    })

    it('should get sales offer with included details', async () => {
      if (!IS_LIVE) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              id: '301',
              type: 'sales_offers',
              attributes: {
                status: 'waiting',
                net_total: 1200,
                currency: 'TRL',
              },
            },
            included: [
              {
                id: 'd1',
                type: 'sales_offer_details',
                attributes: { quantity: 5, unit_price: 200, vat_rate: 20 },
              },
            ],
          }),
        })
      }

      const result = await client.getSalesOffer('301')
      expect(result.data.id).toBe('301')
      expect(result.data.attributes.status).toBeDefined()
    })
  })

  // ==================== SALES INVOICES ====================
  describe('Sales Invoices API', () => {
    it('should create a sales invoice', async () => {
      if (!IS_LIVE) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              id: '401',
              type: 'sales_invoices',
              attributes: {
                payment_status: 'unpaid',
                net_total: 1200,
                item_type: 'invoice',
                issue_date: '2026-04-06',
              },
            },
          }),
        })
      }

      const result = await client.createSalesInvoice({
        data: {
          type: 'sales_invoices',
          attributes: {
            item_type: 'invoice',
            issue_date: '2026-04-06',
            currency: 'TRL',
          },
          relationships: {
            contact: { data: { id: '101', type: 'contacts' } },
            details: {
              data: [{
                type: 'sales_invoice_details',
                attributes: { quantity: 5, unit_price: 200, vat_rate: 20 },
              }],
            },
          },
        },
      })

      expect(result.data.id).toBeDefined()
      expect(result.data.attributes.payment_status).toBe('unpaid')
    })
  })

  // ==================== PURCHASE BILLS ====================
  describe('Purchase Bills API', () => {
    it('should fetch purchase bills', async () => {
      if (!IS_LIVE) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                id: '501',
                type: 'purchase_bills',
                attributes: {
                  payment_status: 'unpaid',
                  net_total: 8000,
                  issue_date: '2026-04-01',
                  item_type: 'purchase_bill',
                },
                relationships: {
                  supplier: { data: { id: '102', type: 'contacts' } },
                },
              },
            ],
            meta: { current_page: 1, total_count: 1, per_page: 25 },
          }),
        })
      }

      const result = await client.getPurchaseBills(1, 25)
      expect(result.data).toBeDefined()
      expect(Array.isArray(result.data)).toBe(true)
    })

    it('should sync purchase bills to database', async () => {
      if (!IS_LIVE) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'pb-int-1',
                type: 'purchase_bills',
                attributes: {
                  description: 'Integration Test Bill',
                  issue_date: '2026-04-01',
                  due_date: '2026-05-01',
                  payment_status: 'unpaid',
                  gross_total: 1000,
                  total_vat: 200,
                  net_total: 1200,
                  currency: 'TRL',
                },
                relationships: {
                  supplier: { data: { id: 'sup-1', type: 'contacts' } },
                },
              },
            ],
            meta: { current_page: 1, total_count: 1, per_page: 25 },
          }),
        })
      }

      const result = await client.syncAllPurchaseBills()
      expect(result.synced).toBeGreaterThanOrEqual(0)
      expect(typeof result.errors).toBe('number')
    })
  })

  // ==================== PRODUCT CATEGORIES ====================
  describe('Product Categories API', () => {
    it('should fetch product categories', async () => {
      if (!IS_LIVE) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                id: '601',
                type: 'item_categories',
                attributes: {
                  name: 'Elektronik',
                  category_type: 'Product',
                  bg_color: '#FF5733',
                  text_color: '#FFFFFF',
                  parent_id: null,
                },
              },
            ],
            meta: { current_page: 1, total_count: 1, per_page: 25 },
          }),
        })
      }

      const result = await client.getProductCategories(1, 25)
      expect(result.data).toBeDefined()
      expect(Array.isArray(result.data)).toBe(true)
    })

    it('should sync categories to database', async () => {
      if (!IS_LIVE) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'cat-int-1',
                type: 'item_categories',
                attributes: {
                  name: 'Test Category',
                  category_type: 'Product',
                  bg_color: '#00FF00',
                  text_color: '#000000',
                  parent_id: null,
                },
              },
            ],
            meta: { current_page: 1, total_count: 1, per_page: 25 },
          }),
        })
      }

      const result = await client.syncProductCategories()
      expect(result.synced).toBeGreaterThanOrEqual(0)
    })
  })

  // ==================== E-FATURA ====================
  describe('E-Fatura API', () => {
    it('should send e-invoice', async () => {
      if (!IS_LIVE) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              id: 'einv-int-1',
              type: 'e_invoices',
              attributes: {
                status: 'waiting',
                uuid: null,
                invoice_number: null,
              },
            },
          }),
        })
      }

      const result = await client.createEInvoice({
        data: {
          type: 'e_invoices',
          attributes: {
            scenario: 'basic',
            to: 'urn:mail:test@test.com',
          },
          relationships: {
            invoice: { data: { id: '401', type: 'sales_invoices' } },
          },
        },
      })

      expect(result.data.id).toBeDefined()
      expect(result.data.attributes.status).toBeDefined()
    })

    it('should create e-archive', async () => {
      if (!IS_LIVE) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              id: 'earc-int-1',
              type: 'e_archives',
              attributes: {
                status: 'waiting',
                uuid: null,
              },
            },
          }),
        })
      }

      const result = await client.createEArchive({
        data: {
          type: 'e_archives',
          attributes: { note: 'Integration test' },
          relationships: {
            invoice: { data: { id: '401', type: 'sales_invoices' } },
          },
        },
      })

      expect(result.data.id).toBeDefined()
    })
  })

  // ==================== FULL WORKFLOW ====================
  describe('Full Proposal → Invoice → E-Fatura Workflow', () => {
    it('should complete the full lifecycle', async () => {
      if (!IS_LIVE) {
        // Step 1: Create sales offer
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { id: 'wf-offer-1', type: 'sales_offers', attributes: { status: 'waiting', net_total: 1200 } },
          }),
        })
        // Step 2: Get offer status
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              id: 'wf-offer-1',
              type: 'sales_offers',
              attributes: { status: 'accepted', net_total: 1200, gross_total: 1000, total_vat: 200, total_discount: 0, updated_at: '2026-04-06T12:00:00Z' },
            },
          }),
        })
        // Step 3: Create invoice from offer
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { id: 'wf-inv-1', type: 'sales_invoices', attributes: { payment_status: 'unpaid', net_total: 1200 } },
          }),
        })
        // Step 4: Send e-invoice
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { id: 'wf-einv-1', type: 'e_invoices', attributes: { status: 'processing', uuid: 'abc-123' } },
          }),
        })
      }

      // Step 1: Create offer
      const offer = await client.createSalesOffer({
        data: {
          type: 'sales_offers',
          attributes: { issue_date: '2026-04-06', currency: 'TRL' },
          relationships: {
            contact: { data: { id: '101', type: 'contacts' } },
            details: { data: [{ type: 'sales_offer_details', attributes: { quantity: 5, unit_price: 200, vat_rate: 20 } }] },
          },
        },
      })
      expect(offer.data.id).toBeDefined()

      // Step 2: Check status (simulating acceptance)
      const status = await client.pullSalesOfferStatus(offer.data.id)
      expect(status.status).toBe('accepted')

      // Step 3: Convert to invoice
      const invoice = await client.createSalesInvoice({
        data: {
          type: 'sales_invoices',
          attributes: { item_type: 'invoice', issue_date: '2026-04-06', currency: 'TRL' },
          relationships: {
            contact: { data: { id: '101', type: 'contacts' } },
            details: { data: [{ type: 'sales_invoice_details', attributes: { quantity: 5, unit_price: 200, vat_rate: 20 } }] },
            sales_offer: { data: { id: offer.data.id, type: 'sales_offers' } },
          },
        },
      })
      expect(invoice.data.id).toBeDefined()

      // Step 4: Send e-invoice
      const eInvoice = await client.createEInvoice({
        data: {
          type: 'e_invoices',
          attributes: { scenario: 'basic', to: 'urn:mail:muhasebe@test.com' },
          relationships: {
            invoice: { data: { id: invoice.data.id, type: 'sales_invoices' } },
          },
        },
      })
      expect(eInvoice.data.id).toBeDefined()
      expect(eInvoice.data.attributes.status).toBeDefined()
    })
  })
})
