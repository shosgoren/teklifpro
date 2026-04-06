/**
 * @jest-environment node
 *
 * Tests for ParasutClient purchase bills + product categories methods
 */

import { ParasutClient } from '@/infrastructure/services/parasut/ParasutClient'

const mockFetch = jest.fn()
global.fetch = mockFetch

jest.mock('@/shared/utils/prisma', () => ({
  prisma: {
    tenant: {
      findUnique: jest.fn().mockResolvedValue({
        parasutCompanyId: 'test-company',
        parasutClientId: 'test-client',
        parasutClientSecret: 'test-secret',
        parasutUsername: 'test-user',
        parasutPassword: 'test-pass',
        parasutAccessToken: 'valid-access-token',
        parasutRefreshToken: 'valid-refresh-token',
        parasutTokenExpiry: new Date(Date.now() + 3600000),
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    supplier: {
      findFirst: jest.fn().mockResolvedValue({ id: 'supp-1' }),
    },
    purchaseBill: {
      upsert: jest.fn().mockResolvedValue({ id: 'pb-1' }),
    },
    productCategory: {
      upsert: jest.fn().mockResolvedValue({ id: 'cat-1' }),
    },
    parasutSyncLog: {
      create: jest.fn().mockResolvedValue({ id: 'sync-1' }),
    },
  },
}))

jest.mock('@/infrastructure/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}))

describe('ParasutClient - Purchase Bills', () => {
  let client: ParasutClient

  beforeEach(() => {
    mockFetch.mockReset()
    ParasutClient.resetRateLimit()
    client = new ParasutClient('tenant-1', 'company-1')
    ;(client as any).accessToken = 'test-token'
    ;(client as any).tokenExpiry = new Date(Date.now() + 3600000)
  })

  describe('getPurchaseBills', () => {
    it('should fetch paginated purchase bills', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { id: '1', type: 'purchase_bills', attributes: { net_total: 5000, payment_status: 'unpaid' } },
            { id: '2', type: 'purchase_bills', attributes: { net_total: 3000, payment_status: 'paid' } },
          ],
          meta: { current_page: 1, total_count: 2, per_page: 25 },
        }),
      })

      const result = await client.getPurchaseBills(1, 25)
      expect(result.data).toHaveLength(2)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('purchase_bills'),
        expect.anything()
      )
    })

    it('should support filter options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], meta: { current_page: 1, total_count: 0, per_page: 25 } }),
      })

      await client.getPurchaseBills(1, 25, { filter: { payment_status: 'unpaid' } })
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('filter%5Bpayment_status%5D=unpaid'),
        expect.anything()
      )
    })
  })

  describe('getPurchaseBill', () => {
    it('should fetch single purchase bill with details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: '100',
            type: 'purchase_bills',
            attributes: { net_total: 8000, payment_status: 'unpaid', issue_date: '2026-04-01' },
            relationships: {
              supplier: { data: { id: '50', type: 'contacts' } },
              details: { data: [{ id: 'd1', type: 'purchase_bill_details' }] },
            },
          },
          included: [],
        }),
      })

      const result = await client.getPurchaseBill('100')
      expect(result.data.id).toBe('100')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('purchase_bills/100?include='),
        expect.anything()
      )
    })
  })

  describe('createPurchaseBill', () => {
    it('should create a new purchase bill', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { id: '200', type: 'purchase_bills', attributes: { net_total: 1500 } },
        }),
      })

      const result = await client.createPurchaseBill({
        data: {
          type: 'purchase_bills',
          attributes: {
            item_type: 'purchase_bill',
            issue_date: '2026-04-06',
            currency: 'TRL',
          },
          relationships: {
            supplier: { data: { id: '50', type: 'contacts' } },
            details: {
              data: [{
                type: 'purchase_bill_details',
                attributes: { quantity: 100, unit_price: 15, vat_rate: 20 },
              }],
            },
          },
        },
      })

      expect(result.data.id).toBe('200')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('purchase_bills'),
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  describe('deletePurchaseBill', () => {
    it('should delete a purchase bill', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      await client.deletePurchaseBill('200')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('purchase_bills/200'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('payPurchaseBill', () => {
    it('should create a payment for purchase bill', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'pay-1', type: 'payments' } }),
      })

      const result = await client.payPurchaseBill('200', {
        account_id: 'bank-1',
        date: '2026-04-06',
        amount: 1500,
      })

      expect(result.data.id).toBe('pay-1')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('purchase_bills/200/payments'),
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  describe('syncAllPurchaseBills', () => {
    it('should sync purchase bills from Parasut to DB', async () => {
      // First page with 2 bills
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'pb-1',
              type: 'purchase_bills',
              attributes: {
                description: 'Bill 1',
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
            {
              id: 'pb-2',
              type: 'purchase_bills',
              attributes: {
                description: 'Bill 2',
                issue_date: '2026-04-02',
                due_date: null,
                payment_status: 'paid',
                gross_total: 500,
                total_vat: 100,
                net_total: 600,
                currency: 'TRL',
              },
              relationships: {
                supplier: { data: null },
              },
            },
          ],
          meta: { current_page: 1, total_count: 2, per_page: 25 },
        }),
      })

      const result = await client.syncAllPurchaseBills()

      expect(result.synced).toBe(2)
      expect(result.errors).toBe(0)
    })
  })
})

describe('ParasutClient - Product Categories', () => {
  let client: ParasutClient

  beforeEach(() => {
    mockFetch.mockReset()
    ParasutClient.resetRateLimit()
    client = new ParasutClient('tenant-1', 'company-1')
    ;(client as any).accessToken = 'test-token'
    ;(client as any).tokenExpiry = new Date(Date.now() + 3600000)
  })

  describe('getProductCategories', () => {
    it('should fetch product categories', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { id: '1', type: 'item_categories', attributes: { name: 'Elektronik', category_type: 'Product', bg_color: '#FF0000' } },
            { id: '2', type: 'item_categories', attributes: { name: 'Gıda', category_type: 'Product', bg_color: '#00FF00' } },
          ],
          meta: { current_page: 1, total_count: 2, per_page: 25 },
        }),
      })

      const result = await client.getProductCategories(1, 25)
      expect(result.data).toHaveLength(2)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('item_categories'),
        expect.anything()
      )
    })

    it('should filter by Product category_type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], meta: { current_page: 1, total_count: 0, per_page: 25 } }),
      })

      await client.getProductCategories()
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('filter%5Bcategory_type%5D=Product'),
        expect.anything()
      )
    })
  })

  describe('syncProductCategories', () => {
    it('should sync categories from Parasut to DB', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'cat-1',
              type: 'item_categories',
              attributes: {
                name: 'Hırdavat',
                category_type: 'Product',
                bg_color: '#AABB00',
                text_color: '#FFFFFF',
                parent_id: null,
              },
            },
          ],
          meta: { current_page: 1, total_count: 1, per_page: 25 },
        }),
      })

      const result = await client.syncProductCategories()
      expect(result.synced).toBe(1)
      expect(result.errors).toBe(0)
    })

    it('should skip non-Product categories', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'cat-contact',
              type: 'item_categories',
              attributes: {
                name: 'VIP Müşteriler',
                category_type: 'Contact',
                bg_color: null,
                text_color: null,
                parent_id: null,
              },
            },
          ],
          meta: { current_page: 1, total_count: 1, per_page: 25 },
        }),
      })

      const result = await client.syncProductCategories()
      expect(result.synced).toBe(0)
    })
  })
})
