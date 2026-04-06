/**
 * @jest-environment node
 *
 * Tests for ParasutClient sales invoice + e-fatura methods
 */

import { ParasutClient } from '@/infrastructure/services/parasut/ParasutClient'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock prisma
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

describe('ParasutClient - Sales Invoices', () => {
  let client: ParasutClient

  beforeEach(() => {
    mockFetch.mockReset()
    ParasutClient.resetRateLimit()
    client = new ParasutClient('tenant-1', 'company-1')
    ;(client as any).accessToken = 'test-token'
    ;(client as any).tokenExpiry = new Date(Date.now() + 3600000)
  })

  // ==================== getSalesInvoices ====================
  describe('getSalesInvoices', () => {
    it('should fetch paginated invoices', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { id: '1', type: 'sales_invoices', attributes: { net_total: 1000 } },
            { id: '2', type: 'sales_invoices', attributes: { net_total: 2000 } },
          ],
          meta: { current_page: 1, total_count: 2, per_page: 25 },
        }),
      })

      const result = await client.getSalesInvoices(1, 25)
      expect(result.data).toHaveLength(2)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('sales_invoices'),
        expect.anything()
      )
    })

    it('should support filter options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], meta: { current_page: 1, total_count: 0, per_page: 25 } }),
      })

      await client.getSalesInvoices(1, 25, { filter: { payment_status: 'unpaid' } })
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('filter%5Bpayment_status%5D=unpaid'),
        expect.anything()
      )
    })
  })

  // ==================== getSalesInvoice ====================
  describe('getSalesInvoice', () => {
    it('should fetch single invoice with included relations', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: '123',
            type: 'sales_invoices',
            attributes: { net_total: 5000, payment_status: 'unpaid' },
            relationships: {
              contact: { data: { id: '10', type: 'contacts' } },
              active_e_document: { data: null },
            },
          },
          included: [],
        }),
      })

      const result = await client.getSalesInvoice('123')
      expect(result.data.id).toBe('123')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('sales_invoices/123?include='),
        expect.anything()
      )
    })
  })

  // ==================== createSalesInvoice ====================
  describe('createSalesInvoice', () => {
    it('should create a new invoice', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: '456',
            type: 'sales_invoices',
            attributes: { net_total: 1500, payment_status: 'unpaid' },
          },
        }),
      })

      const result = await client.createSalesInvoice({
        data: {
          type: 'sales_invoices',
          attributes: {
            item_type: 'invoice',
            issue_date: '2026-04-06',
            currency: 'TRL',
          },
          relationships: {
            contact: { data: { id: '10', type: 'contacts' } },
            details: {
              data: [{
                type: 'sales_invoice_details',
                attributes: { quantity: 2, unit_price: 750, vat_rate: 20 },
              }],
            },
          },
        },
      })

      expect(result.data.id).toBe('456')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('sales_invoices'),
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  // ==================== updateSalesInvoice ====================
  describe('updateSalesInvoice', () => {
    it('should update an existing invoice', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { id: '456', type: 'sales_invoices', attributes: { net_total: 2000 } },
        }),
      })

      const result = await client.updateSalesInvoice('456', {
        data: {
          type: 'sales_invoices',
          attributes: {
            item_type: 'invoice',
            issue_date: '2026-04-06',
            description: 'Updated',
          },
          relationships: {
            contact: { data: { id: '10', type: 'contacts' } },
            details: { data: [] },
          },
        },
      })

      expect(result.data.id).toBe('456')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('sales_invoices/456'),
        expect.objectContaining({ method: 'PUT' })
      )
    })
  })

  // ==================== deleteSalesInvoice ====================
  describe('deleteSalesInvoice', () => {
    it('should delete an invoice', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      await client.deleteSalesInvoice('456')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('sales_invoices/456'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  // ==================== archiveSalesInvoice ====================
  describe('archiveSalesInvoice', () => {
    it('should archive an invoice', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      await client.archiveSalesInvoice('456')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('sales_invoices/456/archive'),
        expect.objectContaining({ method: 'PATCH' })
      )
    })
  })

  // ==================== unarchiveSalesInvoice ====================
  describe('unarchiveSalesInvoice', () => {
    it('should unarchive an invoice', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      await client.unarchiveSalesInvoice('456')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('sales_invoices/456/unarchive'),
        expect.objectContaining({ method: 'PATCH' })
      )
    })
  })

  // ==================== paySalesInvoice ====================
  describe('paySalesInvoice', () => {
    it('should create a payment for invoice', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'pay-1', type: 'payments' } }),
      })

      const result = await client.paySalesInvoice('456', {
        account_id: 'bank-1',
        date: '2026-04-06',
        amount: 1500,
      })

      expect(result.data.id).toBe('pay-1')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('sales_invoices/456/payments'),
        expect.objectContaining({ method: 'POST' })
      )
    })
  })
})

describe('ParasutClient - E-Fatura / E-Arsiv', () => {
  let client: ParasutClient

  beforeEach(() => {
    mockFetch.mockReset()
    ParasutClient.resetRateLimit()
    client = new ParasutClient('tenant-1', 'company-1')
    ;(client as any).accessToken = 'test-token'
    ;(client as any).tokenExpiry = new Date(Date.now() + 3600000)
  })

  // ==================== createEInvoice ====================
  describe('createEInvoice', () => {
    it('should send e-invoice to GIB', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'einv-1',
            type: 'e_invoices',
            attributes: { status: 'waiting', uuid: null },
          },
        }),
      })

      const result = await client.createEInvoice({
        data: {
          type: 'e_invoices',
          attributes: {
            scenario: 'basic',
            to: 'urn:mail:muhasebe@firma.com',
          },
          relationships: {
            invoice: { data: { id: '456', type: 'sales_invoices' } },
          },
        },
      })

      expect(result.data.id).toBe('einv-1')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('e_invoices'),
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  // ==================== createEArchive ====================
  describe('createEArchive', () => {
    it('should create e-archive invoice', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'earc-1',
            type: 'e_archives',
            attributes: { status: 'waiting', uuid: null },
          },
        }),
      })

      const result = await client.createEArchive({
        data: {
          type: 'e_archives',
          attributes: {
            note: 'Test e-arsiv',
          },
          relationships: {
            invoice: { data: { id: '456', type: 'sales_invoices' } },
          },
        },
      })

      expect(result.data.id).toBe('earc-1')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('e_archives'),
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  // ==================== getEInvoice ====================
  describe('getEInvoice', () => {
    it('should fetch e-invoice status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'einv-1',
            type: 'e_invoices',
            attributes: {
              status: 'done',
              uuid: 'abc-123',
              invoice_number: 'GIB2026000001',
            },
          },
        }),
      })

      const result = await client.getEInvoice('einv-1')
      expect(result.data.attributes.status).toBe('done')
    })
  })

  // ==================== getEArchive ====================
  describe('getEArchive', () => {
    it('should fetch e-archive status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'earc-1',
            type: 'e_archives',
            attributes: { status: 'processing', uuid: null },
          },
        }),
      })

      const result = await client.getEArchive('earc-1')
      expect(result.data.attributes.status).toBe('processing')
    })
  })

  // ==================== getEInvoicePdf ====================
  describe('getEInvoicePdf', () => {
    it('should get PDF download URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { attributes: { url: 'https://parasut.com/pdfs/einv-1.pdf' } },
        }),
      })

      const result = await client.getEInvoicePdf('einv-1')
      expect(result.data.attributes.url).toContain('.pdf')
    })
  })
})

describe('ParasutClient - convertOfferToInvoice', () => {
  let client: ParasutClient

  beforeEach(() => {
    mockFetch.mockReset()
    ParasutClient.resetRateLimit()
    client = new ParasutClient('tenant-1', 'company-1')
    ;(client as any).accessToken = 'test-token'
    ;(client as any).tokenExpiry = new Date(Date.now() + 3600000)
  })

  it('should convert accepted proposal to sales invoice', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { id: 'inv-999', type: 'sales_invoices', attributes: {} },
      }),
    })

    const invoiceId = await client.convertOfferToInvoice({
      parasutOfferId: 'offer-100',
      title: 'Test Teklif',
      currency: 'TRY',
      expiresAt: null,
      notes: 'Test note',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      customer: {
        parasutId: 'contact-50',
        taxNumber: '1234567890',
        taxOffice: 'Istanbul',
        address: 'Test Adres',
        city: 'Istanbul',
        district: 'Kadıköy',
        phone: '+905551234567',
      },
      items: [
        {
          name: 'Ürün A',
          description: 'Açıklama',
          quantity: 5,
          unitPrice: 100,
          vatRate: 20,
          discountRate: 10,
          product: { parasutId: 'prod-1' },
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
    })

    expect(invoiceId).toBe('inv-999')

    // Verify the request body
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.data.type).toBe('sales_invoices')
    expect(callBody.data.attributes.item_type).toBe('invoice')
    expect(callBody.data.attributes.currency).toBe('TRL')
    expect(callBody.data.attributes.invoice_discount_type).toBe('percentage')
    expect(callBody.data.attributes.invoice_discount).toBe(10)
    expect(callBody.data.relationships.contact.data.id).toBe('contact-50')
    expect(callBody.data.relationships.sales_offer.data.id).toBe('offer-100')
    expect(callBody.data.relationships.details.data).toHaveLength(2)

    // First item should have product relationship
    expect(callBody.data.relationships.details.data[0].relationships.product.data.id).toBe('prod-1')
    // Second item should not have product relationship
    expect(callBody.data.relationships.details.data[1].relationships).toBeUndefined()
  })

  it('should throw if customer has no parasutId', async () => {
    await expect(
      client.convertOfferToInvoice({
        parasutOfferId: 'offer-100',
        title: 'Test',
        currency: 'TRY',
        expiresAt: null,
        notes: null,
        discountType: null,
        discountValue: null,
        customer: {
          parasutId: null,
          taxNumber: null,
          taxOffice: null,
          address: null,
          city: null,
          district: null,
          phone: null,
        },
        items: [],
      })
    ).rejects.toThrow('Customer does not have a Parasut ID')
  })
})

describe('ParasutClient - pullSalesInvoiceStatus', () => {
  let client: ParasutClient

  beforeEach(() => {
    mockFetch.mockReset()
    ParasutClient.resetRateLimit()
    client = new ParasutClient('tenant-1', 'company-1')
    ;(client as any).accessToken = 'test-token'
    ;(client as any).tokenExpiry = new Date(Date.now() + 3600000)
  })

  it('should pull invoice status with e-document info', async () => {
    // First call: getSalesInvoice
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 'inv-1',
          type: 'sales_invoices',
          attributes: {
            payment_status: 'unpaid',
            net_total: 1200,
            gross_total: 1000,
            total_vat: 200,
            invoice_id: 2026001,
            updated_at: '2026-04-06T10:00:00Z',
          },
          relationships: {
            active_e_document: { data: { id: 'einv-5', type: 'e_invoices' } },
          },
        },
      }),
    })

    // Second call: getEInvoice
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 'einv-5',
          type: 'e_invoices',
          attributes: { status: 'done' },
        },
      }),
    })

    const result = await client.pullSalesInvoiceStatus('inv-1')

    expect(result.paymentStatus).toBe('unpaid')
    expect(result.netTotal).toBe(1200)
    expect(result.grossTotal).toBe(1000)
    expect(result.totalVat).toBe(200)
    expect(result.invoiceNumber).toBe(2026001)
    expect(result.eDocumentStatus).toBe('done')
    expect(result.eDocumentId).toBe('einv-5')
  })

  it('should return null e-document fields when no e-document', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 'inv-2',
          type: 'sales_invoices',
          attributes: {
            payment_status: 'paid',
            net_total: 500,
            gross_total: 416,
            total_vat: 84,
            invoice_id: null,
            updated_at: '2026-04-06T10:00:00Z',
          },
          relationships: {
            active_e_document: { data: null },
          },
        },
      }),
    })

    const result = await client.pullSalesInvoiceStatus('inv-2')

    expect(result.paymentStatus).toBe('paid')
    expect(result.eDocumentStatus).toBeNull()
    expect(result.eDocumentId).toBeNull()
  })
})
