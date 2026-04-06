/**
 * ParasutClient - Parasut V4 API Adapter
 *
 * Parasut OAuth2 token yonetimi + CRUD islemleri
 * Her tenant kendi Parasut credential'larini DB'ye kaydeder
 * Token otomatik yenilenir (refresh_token ile)
 *
 * API Docs: https://apidocs.parasut.com/
 */

import { prisma } from '@/shared/utils/prisma'
import { Logger } from '@/infrastructure/logger'
import type {
  ParasutCredentials,
  ParasutTokenResponse,
  ParasutContact,
  ParasutProduct,
  ParasutContactPerson,
  ParasutPaginatedResponse,
  ParasutSalesOffer,
  ParasutSalesOfferDetail,
  ParasutSalesOfferCreateData,
  ParasutSharingData,
  ParasutSalesInvoice,
  ParasutSalesInvoiceCreateData,
  ParasutEInvoiceCreateData,
  ParasutEArchiveCreateData,
  ParasutEDocument,
  ParasutPurchaseBill,
  ParasutPurchaseBillCreateData,
  ParasutProductCategory,
} from '@/shared/types'

const PARASUT_API_URL = process.env.PARASUT_API_URL || 'https://api.parasut.com/v4'
const PARASUT_AUTH_URL = process.env.PARASUT_AUTH_URL || 'https://auth.parasut.com/oauth/token'

const logger = new Logger('ParasutClient')

export class ParasutClient {
  private tenantId: string
  private companyId: string
  private accessToken: string | null = null
  private refreshToken: string | null = null
  private tokenExpiry: Date | null = null

  constructor(tenantId: string, companyId: string) {
    this.tenantId = tenantId
    this.companyId = companyId
  }

  // ==================== FACTORY ====================

  /**
   * Tenant'in Parasut bilgileriyle client olustur
   * DB'den credential ve token bilgilerini okur
   */
  static async forTenant(tenantId: string): Promise<ParasutClient> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        parasutCompanyId: true,
        parasutClientId: true,
        parasutClientSecret: true,
        parasutUsername: true,
        parasutPassword: true,
        parasutAccessToken: true,
        parasutRefreshToken: true,
        parasutTokenExpiry: true,
      },
    })

    if (!tenant?.parasutCompanyId || !tenant?.parasutClientId) {
      throw new Error('PARASUT_NOT_CONFIGURED')
    }

    const client = new ParasutClient(tenantId, tenant.parasutCompanyId)
    client.accessToken = tenant.parasutAccessToken
    client.refreshToken = tenant.parasutRefreshToken
    client.tokenExpiry = tenant.parasutTokenExpiry

    return client
  }

  // ==================== AUTH ====================

  /**
   * Ilk kez token al (username + password ile)
   * Kullanici onboarding'de Parasut bilgilerini girdiginde cagirilir
   */
  async authenticate(credentials: ParasutCredentials): Promise<boolean> {
    try {
      const response = await fetch(PARASUT_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'password',
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          username: credentials.username,
          password: credentials.password,
          redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        logger.error(`Auth failed: ${response.status}`, error)
        return false
      }

      const tokenData: ParasutTokenResponse = await response.json()
      await this.saveTokens(tokenData, credentials)

      return true
    } catch (error) {
      logger.error('Auth error', error)
      return false
    }
  }

  /**
   * Refresh token ile yeni access_token al
   */
  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false

    const tenant = await prisma.tenant.findUnique({
      where: { id: this.tenantId },
      select: { parasutClientId: true, parasutClientSecret: true },
    })

    if (!tenant?.parasutClientId) return false

    try {
      const response = await fetch(PARASUT_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          client_id: tenant.parasutClientId,
          client_secret: tenant.parasutClientSecret,
          refresh_token: this.refreshToken,
        }),
      })

      if (!response.ok) return false

      const tokenData: ParasutTokenResponse = await response.json()
      await this.saveTokens(tokenData)

      return true
    } catch (error) {
      logger.error('Parasut token refresh failed', error)
      return false
    }
  }

  /**
   * Token'lari DB'ye kaydet ve in-memory cache'i guncelle
   */
  private async saveTokens(
    tokenData: ParasutTokenResponse,
    credentials?: ParasutCredentials
  ): Promise<void> {
    const expiry = new Date(Date.now() + tokenData.expires_in * 1000)

    this.accessToken = tokenData.access_token
    this.refreshToken = tokenData.refresh_token
    this.tokenExpiry = expiry

    const updateData: Record<string, unknown> = {
      parasutAccessToken: tokenData.access_token,
      parasutRefreshToken: tokenData.refresh_token,
      parasutTokenExpiry: expiry,
      parasutSyncEnabled: true,
    }

    if (credentials) {
      updateData.parasutCompanyId = credentials.companyId
      updateData.parasutClientId = credentials.clientId
      updateData.parasutClientSecret = credentials.clientSecret
      updateData.parasutUsername = credentials.username
      updateData.parasutPassword = credentials.password
    }

    await prisma.tenant.update({
      where: { id: this.tenantId },
      data: updateData,
    })
  }

  /**
   * Gecerli token al — suresi dolduysa otomatik yenile
   */
  private async getValidToken(): Promise<string> {
    // Token var ve suresi dolmamis (5dk buffer)
    if (
      this.accessToken &&
      this.tokenExpiry &&
      this.tokenExpiry > new Date(Date.now() + 5 * 60 * 1000)
    ) {
      return this.accessToken
    }

    // Refresh dene
    const refreshed = await this.refreshAccessToken()
    if (refreshed && this.accessToken) {
      return this.accessToken
    }

    throw new Error('PARASUT_TOKEN_EXPIRED')
  }

  // ==================== RATE LIMITING ====================
  // Parasut limit: 10 requests per 10 seconds
  private static requestTimestamps: number[] = []

  /** Reset rate limiter — for testing only */
  static resetRateLimit(): void {
    ParasutClient.requestTimestamps = []
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now()
    const windowMs = 10_000 // 10 seconds
    const maxRequests = 9 // Stay under 10 to be safe

    // Remove timestamps older than the window
    ParasutClient.requestTimestamps = ParasutClient.requestTimestamps.filter(
      (ts) => now - ts < windowMs
    )

    if (ParasutClient.requestTimestamps.length >= maxRequests) {
      // Wait until the oldest request falls outside the window
      const oldestInWindow = ParasutClient.requestTimestamps[0]
      const waitMs = windowMs - (now - oldestInWindow) + 100 // +100ms buffer
      if (waitMs > 0) {
        logger.info(`Rate limit: waiting ${waitMs}ms before Parasut API call`)
        await new Promise((resolve) => setTimeout(resolve, waitMs))
      }
    }

    ParasutClient.requestTimestamps.push(Date.now())
  }

  // ==================== API HELPERS ====================

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    await this.waitForRateLimit()
    const token = await this.getValidToken()

    const response = await fetch(
      `${PARASUT_API_URL}/${this.companyId}/${endpoint}`,
      {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      }
    )

    if (response.status === 401) {
      // Token expired, try refresh
      const refreshed = await this.refreshAccessToken()
      if (refreshed) {
        return this.request<T>(endpoint, options)
      }
      throw new Error('PARASUT_UNAUTHORIZED')
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`PARASUT_API_ERROR: ${response.status} - ${JSON.stringify(error)}`)
    }

    return response.json()
  }

  // ==================== CONTACTS (Musteriler) ====================

  /**
   * Tum musterileri cek (pagination ile)
   */
  async getContacts(page = 1, perPage = 25): Promise<ParasutPaginatedResponse<ParasutContact>> {
    return this.request<ParasutPaginatedResponse<ParasutContact>>(
      `contacts?page[number]=${page}&page[size]=${perPage}&filter[account_type]=customer&include=contact_people`
    )
  }

  /**
   * Tek musteri detayi
   */
  async getContact(id: string): Promise<{ data: ParasutContact; included?: ParasutContactPerson[] }> {
    return this.request<{ data: ParasutContact; included?: ParasutContactPerson[] }>(
      `contacts/${id}?include=contact_people`
    )
  }

  /**
   * Musteri ara
   */
  async searchContacts(query: string): Promise<ParasutPaginatedResponse<ParasutContact>> {
    return this.request<ParasutPaginatedResponse<ParasutContact>>(
      `contacts?filter[name]=${encodeURIComponent(query)}&filter[account_type]=customer`
    )
  }

  // ==================== PRODUCTS (Urunler) ====================

  /**
   * Tum urunleri cek
   */
  async getProducts(page = 1, perPage = 25): Promise<ParasutPaginatedResponse<ParasutProduct>> {
    return this.request<ParasutPaginatedResponse<ParasutProduct>>(
      `products?page[number]=${page}&page[size]=${perPage}`
    )
  }

  /**
   * Tek urun detayi
   */
  async getProduct(id: string): Promise<{ data: ParasutProduct }> {
    return this.request<{ data: ParasutProduct }>(`products/${id}`)
  }

  /**
   * Urun ara
   */
  async searchProducts(query: string): Promise<ParasutPaginatedResponse<ParasutProduct>> {
    return this.request<ParasutPaginatedResponse<ParasutProduct>>(
      `products?filter[name]=${encodeURIComponent(query)}`
    )
  }

  // ==================== SYNC OPERATIONS ====================

  /**
   * Tum musterileri Parasut'ten cek ve DB'ye senkronize et
   */
  async syncAllContacts(): Promise<{ synced: number; errors: number }> {
    let page = 1
    let synced = 0
    let errors = 0
    let hasMore = true

    while (hasMore) {
      const response = await this.getContacts(page, 25)

      for (const contact of response.data) {
        try {
          await prisma.customer.upsert({
            where: {
              tenantId_parasutId: {
                tenantId: this.tenantId,
                parasutId: contact.id,
              },
            },
            create: {
              tenantId: this.tenantId,
              parasutId: contact.id,
              name: contact.attributes.name,
              shortName: contact.attributes.short_name,
              companyType: 'COMPANY',
              taxNumber: contact.attributes.tax_number,
              taxOffice: contact.attributes.tax_office,
              email: contact.attributes.email,
              phone: contact.attributes.phone,
              fax: contact.attributes.fax,
              address: contact.attributes.address,
              city: contact.attributes.city,
              district: contact.attributes.district,
              balance: contact.attributes.balance ? parseFloat(contact.attributes.balance) : 0,
              lastSyncAt: new Date(),
            },
            update: {
              name: contact.attributes.name,
              shortName: contact.attributes.short_name,
              taxNumber: contact.attributes.tax_number,
              taxOffice: contact.attributes.tax_office,
              email: contact.attributes.email,
              phone: contact.attributes.phone,
              fax: contact.attributes.fax,
              address: contact.attributes.address,
              city: contact.attributes.city,
              district: contact.attributes.district,
              balance: contact.attributes.balance ? parseFloat(contact.attributes.balance) : 0,
              lastSyncAt: new Date(),
            },
          })

          // Sync contact people (ilgili kisiler)
          if (contact.relationships?.contact_people?.data) {
            for (const cpRef of contact.relationships.contact_people.data) {
              const cpData = response.included?.find(
                (inc) => inc.id === cpRef.id && inc.type === 'contact_people'
              ) as unknown as ParasutContactPerson | undefined

              if (cpData) {
                const customer = await prisma.customer.findFirst({
                  where: { tenantId: this.tenantId, parasutId: contact.id },
                })

                if (customer) {
                  await prisma.customerContact.upsert({
                    where: {
                      id: `parasut_${cpData.id}`,
                    },
                    create: {
                      id: `parasut_${cpData.id}`,
                      customerId: customer.id,
                      name: cpData.attributes.name,
                      email: cpData.attributes.email,
                      phone: cpData.attributes.phone,
                      title: cpData.attributes.title,
                    },
                    update: {
                      name: cpData.attributes.name,
                      email: cpData.attributes.email,
                      phone: cpData.attributes.phone,
                      title: cpData.attributes.title,
                    },
                  })
                }
              }
            }
          }

          synced++
        } catch (err) {
          logger.error(`Contact sync error (${contact.id})`, err)
          errors++
        }
      }

      hasMore = page < response.meta.total_pages
      page++
    }

    // Sync log olustur
    await prisma.parasutSyncLog.create({
      data: {
        tenantId: this.tenantId,
        entityType: 'customer',
        direction: 'PULL',
        status: errors > 0 ? 'PARTIAL' : 'COMPLETED',
        recordCount: synced,
        errorCount: errors,
        completedAt: new Date(),
      },
    })

    // Tenant'in son sync zamanini guncelle
    await prisma.tenant.update({
      where: { id: this.tenantId },
      data: { parasutLastSyncAt: new Date() },
    })

    return { synced, errors }
  }

  /**
   * Tum urunleri Parasut'ten cek ve DB'ye senkronize et
   */
  async syncAllProducts(): Promise<{ synced: number; errors: number }> {
    let page = 1
    let synced = 0
    let errors = 0
    let hasMore = true

    while (hasMore) {
      const response = await this.getProducts(page, 25)

      for (const product of response.data) {
        try {
          await prisma.product.upsert({
            where: {
              tenantId_parasutId: {
                tenantId: this.tenantId,
                parasutId: product.id,
              },
            },
            create: {
              tenantId: this.tenantId,
              parasutId: product.id,
              code: product.attributes.code,
              name: product.attributes.name,
              unit: product.attributes.unit || 'Adet',
              listPrice: product.attributes.list_price
                ? parseFloat(product.attributes.list_price)
                : 0,
              currency: product.attributes.currency || 'TRY',
              vatRate: product.attributes.vat_rate
                ? parseFloat(product.attributes.vat_rate)
                : 20,
              trackStock: product.attributes.inventory_tracking || false,
              lastSyncAt: new Date(),
            },
            update: {
              code: product.attributes.code,
              name: product.attributes.name,
              unit: product.attributes.unit || 'Adet',
              listPrice: product.attributes.list_price
                ? parseFloat(product.attributes.list_price)
                : 0,
              currency: product.attributes.currency || 'TRY',
              vatRate: product.attributes.vat_rate
                ? parseFloat(product.attributes.vat_rate)
                : 20,
              trackStock: product.attributes.inventory_tracking || false,
              lastSyncAt: new Date(),
            },
          })
          synced++
        } catch (err) {
          logger.error(`Product sync error (${product.id})`, err)
          errors++
        }
      }

      hasMore = page < response.meta.total_pages
      page++
    }

    await prisma.parasutSyncLog.create({
      data: {
        tenantId: this.tenantId,
        entityType: 'product',
        direction: 'PULL',
        status: errors > 0 ? 'PARTIAL' : 'COMPLETED',
        recordCount: synced,
        errorCount: errors,
        completedAt: new Date(),
      },
    })

    return { synced, errors }
  }

  /**
   * Baglanti testi — Parasut API'ye erisim var mi kontrol et
   */
  async testConnection(): Promise<{ success: boolean; companyName?: string; error?: string }> {
    try {
      const response = await this.request<{ data: { attributes: { name: string } } }>('')
      return {
        success: true,
        companyName: response?.data?.attributes?.name || 'Bağlantı başarılı',
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bilinmeyen hata',
      }
    }
  }

  // ==================== BANK ACCOUNTS (Banka Hesaplari) ====================

  /**
   * Parasut'tan banka hesaplarini cek
   */
  async getBankAccounts(): Promise<Array<{
    bankName: string
    branchName: string
    accountHolder: string
    iban: string
    currency: string
  }>> {
    const response = await this.request<{
      data: Array<{
        id: string
        type: string
        attributes: {
          name: string
          currency: string
          bank_name: string
          bank_branch: string
          iban: string
          account_type: string
        }
      }>
    }>('bank_accounts?page[size]=25')

    if (!response?.data) return []

    return response.data
      .filter(acc => acc.attributes.iban) // Only accounts with IBAN
      .map(acc => ({
        bankName: acc.attributes.bank_name || acc.attributes.name || '',
        branchName: acc.attributes.bank_branch || '',
        accountHolder: '', // Parasut doesn't expose this, will use tenant name
        iban: acc.attributes.iban,
        currency: acc.attributes.currency || 'TRY',
      }))
  }

  /**
   * Parasut'tan banka hesaplarini cekip tenant'a kaydet
   */
  async syncBankAccounts(): Promise<{ synced: number }> {
    const accounts = await this.getBankAccounts()

    if (accounts.length > 0) {
      await prisma.tenant.update({
        where: { id: this.tenantId },
        data: { bankAccounts: accounts },
      })
    }

    return { synced: accounts.length }
  }

  // ==================== SALES OFFERS (Teklifler) ====================

  /**
   * Tum teklifleri listele (pagination ile)
   */
  async getSalesOffers(
    page = 1,
    perPage = 25,
    options?: { status?: string; archived?: boolean }
  ): Promise<ParasutPaginatedResponse<ParasutSalesOffer>> {
    let url = `sales_offers?page[number]=${page}&page[size]=${perPage}&include=contact`
    if (options?.status) url += `&filter[status]=${options.status}`
    if (options?.archived !== undefined) url += `&filter[archived]=${options.archived}`
    return this.request<ParasutPaginatedResponse<ParasutSalesOffer>>(url)
  }

  /**
   * Tek teklif detayi (line items dahil)
   */
  async getSalesOffer(id: string): Promise<{
    data: ParasutSalesOffer
    included?: Array<ParasutSalesOfferDetail | Record<string, unknown>>
  }> {
    return this.request(`sales_offers/${id}?include=details.product,contact`)
  }

  /**
   * Yeni teklif olustur
   */
  async createSalesOffer(
    body: ParasutSalesOfferCreateData
  ): Promise<{ data: ParasutSalesOffer }> {
    return this.request<{ data: ParasutSalesOffer }>('sales_offers', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /**
   * Teklif guncelle
   */
  async updateSalesOffer(
    id: string,
    body: ParasutSalesOfferCreateData
  ): Promise<{ data: ParasutSalesOffer }> {
    return this.request<{ data: ParasutSalesOffer }>(`sales_offers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  /**
   * Teklif sil
   */
  async deleteSalesOffer(id: string): Promise<void> {
    await this.request<void>(`sales_offers/${id}`, { method: 'DELETE' })
  }

  /**
   * Teklif durumunu guncelle (accepted/rejected/waiting)
   */
  async updateSalesOfferStatus(
    id: string,
    status: 'accepted' | 'rejected' | 'waiting'
  ): Promise<{ data: ParasutSalesOffer }> {
    return this.request<{ data: ParasutSalesOffer }>(
      `sales_offers/${id}/update_status`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          data: {
            id,
            type: 'sales_offers',
            attributes: { status },
          },
        }),
      }
    )
  }

  /**
   * Teklif PDF olustur (async job dondurur)
   */
  async generateSalesOfferPdf(
    id: string
  ): Promise<{ data: { id: string; type: string; attributes: { url: string; status: string } } }> {
    return this.request(`sales_offers/${id}/pdf`, { method: 'POST' })
  }

  /**
   * Teklif arsivle
   */
  async archiveSalesOffer(id: string): Promise<{ data: ParasutSalesOffer }> {
    return this.request<{ data: ParasutSalesOffer }>(
      `sales_offers/${id}/archive`,
      { method: 'PATCH' }
    )
  }

  /**
   * Teklif arsivden cikar
   */
  async unarchiveSalesOffer(id: string): Promise<{ data: ParasutSalesOffer }> {
    return this.request<{ data: ParasutSalesOffer }>(
      `sales_offers/${id}/unarchive`,
      { method: 'PATCH' }
    )
  }

  /**
   * Teklif detay satirlarini getir
   */
  async getSalesOfferDetails(
    id: string
  ): Promise<{ data: ParasutSalesOfferDetail[] }> {
    return this.request<{ data: ParasutSalesOfferDetail[] }>(
      `sales_offers/${id}/details`
    )
  }

  /**
   * Teklifi e-posta ile gonder (Parasut uzerinden)
   */
  async shareSalesOffer(body: ParasutSharingData): Promise<{ data: Record<string, unknown> }> {
    return this.request<{ data: Record<string, unknown> }>('sharings', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /**
   * Async job durumunu kontrol et (PDF gibi)
   */
  async getTrackableJob(
    id: string
  ): Promise<{ data: { id: string; type: string; attributes: { url: string; status: string; result: string | null } } }> {
    return this.request(`trackable_jobs/${id}`)
  }

  // ==================== PROPOSAL SYNC ====================

  /**
   * TeklifPro proposal'ini Parasut sales_offer'a donustur ve push et
   * Returns the Parasut offer ID
   */
  async pushProposal(proposal: {
    id: string
    title: string
    description: string | null
    currency: string
    subtotal: number
    discountType: string | null
    discountValue: number | null
    grandTotal: number
    expiresAt: Date | null
    notes: string | null
    customer: {
      parasutId: string | null
      taxNumber: string | null
      taxOffice: string | null
      address: string | null
      city: string | null
      district: string | null
      phone: string | null
    }
    items: Array<{
      name: string
      description: string | null
      quantity: number
      unitPrice: number
      vatRate: number
      discountRate: number
      product: { parasutId: string | null } | null
    }>
  }): Promise<string> {
    if (!proposal.customer.parasutId) {
      throw new Error('Customer does not have a Parasut ID. Sync the customer first.')
    }

    // Map TeklifPro currency to Parasut currency
    const currencyMap: Record<string, string> = {
      TRY: 'TRL', USD: 'USD', EUR: 'EUR', GBP: 'GBP',
    }

    const issueDate = new Date().toISOString().split('T')[0]
    const dueDate = proposal.expiresAt
      ? proposal.expiresAt.toISOString().split('T')[0]
      : undefined

    const details = proposal.items.map((item) => {
      const detail: {
        type: 'sales_offer_details'
        attributes: {
          quantity: number
          unit_price: number
          vat_rate: number
          description: string
          discount_type?: string
          discount_value?: number
        }
        relationships?: {
          product: { data: { id: string; type: 'products' } }
        }
      } = {
        type: 'sales_offer_details' as const,
        attributes: {
          quantity: item.quantity,
          unit_price: item.unitPrice,
          vat_rate: item.vatRate,
          description: item.name + (item.description ? ` - ${item.description}` : ''),
          discount_type: item.discountRate > 0 ? 'percentage' : undefined,
          discount_value: item.discountRate > 0 ? item.discountRate : undefined,
        },
      }
      if (item.product?.parasutId) {
        detail.relationships = {
          product: { data: { id: item.product.parasutId, type: 'products' } },
        }
      }
      return detail
    })

    const body: ParasutSalesOfferCreateData = {
      data: {
        type: 'sales_offers',
        attributes: {
          issue_date: issueDate,
          due_date: dueDate,
          description: proposal.title,
          currency: currencyMap[proposal.currency] || 'TRL',
          content: proposal.notes || undefined,
          billing_address: proposal.customer.address || undefined,
          billing_phone: proposal.customer.phone || undefined,
          tax_office: proposal.customer.taxOffice || undefined,
          tax_number: proposal.customer.taxNumber || undefined,
          city: proposal.customer.city || undefined,
          district: proposal.customer.district || undefined,
          invoice_discount_type: proposal.discountType === 'PERCENTAGE' ? 'percentage' : proposal.discountType === 'FIXED' ? 'amount' : undefined,
          invoice_discount: proposal.discountValue ? Number(proposal.discountValue) : undefined,
        },
        relationships: {
          contact: {
            data: { id: proposal.customer.parasutId, type: 'contacts' },
          },
          details: { data: details },
        },
      },
    }

    const result = await this.createSalesOffer(body)
    return result.data.id
  }

  /**
   * Parasut'taki teklif durumunu TeklifPro'ya cek
   */
  async pullSalesOfferStatus(parasutOfferId: string): Promise<{
    status: 'waiting' | 'accepted' | 'rejected'
    netTotal: number
    grossTotal: number
    totalVat: number
    totalDiscount: number
    updatedAt: string
  }> {
    const result = await this.getSalesOffer(parasutOfferId)
    const attrs = result.data.attributes
    return {
      status: attrs.status as 'waiting' | 'accepted' | 'rejected',
      netTotal: attrs.net_total,
      grossTotal: attrs.gross_total,
      totalVat: attrs.total_vat,
      totalDiscount: attrs.total_discount,
      updatedAt: attrs.updated_at,
    }
  }

  // ==================== SALES INVOICES ====================

  /**
   * Fatura listesi getir
   */
  async getSalesInvoices(
    page = 1,
    perPage = 25,
    options?: { filter?: Record<string, string> }
  ): Promise<ParasutPaginatedResponse<ParasutSalesInvoice>> {
    const params = new URLSearchParams({
      'page[number]': String(page),
      'page[size]': String(perPage),
    })
    if (options?.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        params.append(`filter[${key}]`, value)
      })
    }
    return this.request<ParasutPaginatedResponse<ParasutSalesInvoice>>(
      `sales_invoices?${params.toString()}`
    )
  }

  /**
   * Tek fatura detay getir
   */
  async getSalesInvoice(id: string): Promise<{ data: ParasutSalesInvoice; included?: unknown[] }> {
    return this.request<{ data: ParasutSalesInvoice; included?: unknown[] }>(
      `sales_invoices/${id}?include=details,contact,active_e_document`
    )
  }

  /**
   * Yeni fatura olustur
   */
  async createSalesInvoice(
    body: ParasutSalesInvoiceCreateData
  ): Promise<{ data: ParasutSalesInvoice }> {
    return this.request<{ data: ParasutSalesInvoice }>('sales_invoices', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /**
   * Fatura guncelle
   */
  async updateSalesInvoice(
    id: string,
    body: ParasutSalesInvoiceCreateData
  ): Promise<{ data: ParasutSalesInvoice }> {
    return this.request<{ data: ParasutSalesInvoice }>(`sales_invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  /**
   * Fatura sil
   */
  async deleteSalesInvoice(id: string): Promise<void> {
    await this.request(`sales_invoices/${id}`, { method: 'DELETE' })
  }

  /**
   * Fatura odeme durumu
   */
  async paySalesInvoice(
    id: string,
    paymentData: {
      account_id: string
      date: string
      amount: number
      exchange_rate?: number
    }
  ): Promise<{ data: { id: string; type: string; attributes: Record<string, unknown> } }> {
    return this.request<{ data: { id: string; type: string; attributes: Record<string, unknown> } }>(`sales_invoices/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'payments',
          attributes: paymentData,
        },
      }),
    })
  }

  /**
   * Fatura arsivle
   */
  async archiveSalesInvoice(id: string): Promise<void> {
    await this.request(`sales_invoices/${id}/archive`, { method: 'PATCH' })
  }

  /**
   * Fatura arsivden cikar
   */
  async unarchiveSalesInvoice(id: string): Promise<void> {
    await this.request(`sales_invoices/${id}/unarchive`, { method: 'PATCH' })
  }

  // ==================== E-FATURA / E-ARSIV ====================

  /**
   * E-Fatura gonder (GIB'e e-fatura olarak iletir)
   * Alicinin e-fatura mukellifi olmasi gerekir
   */
  async createEInvoice(body: ParasutEInvoiceCreateData): Promise<{ data: ParasutEDocument }> {
    return this.request<{ data: ParasutEDocument }>('e_invoices', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /**
   * E-Arsiv fatura olustur (GIB'e e-arsiv olarak gonderir)
   * E-fatura mukellifi olmayan alicilar icin
   */
  async createEArchive(body: ParasutEArchiveCreateData): Promise<{ data: ParasutEDocument }> {
    return this.request<{ data: ParasutEDocument }>('e_archives', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /**
   * E-Fatura durum sorgula
   */
  async getEInvoice(id: string): Promise<{ data: ParasutEDocument }> {
    return this.request<{ data: ParasutEDocument }>(`e_invoices/${id}`)
  }

  /**
   * E-Arsiv durum sorgula
   */
  async getEArchive(id: string): Promise<{ data: ParasutEDocument }> {
    return this.request<{ data: ParasutEDocument }>(`e_archives/${id}`)
  }

  /**
   * E-Fatura PDF indir
   */
  async getEInvoicePdf(id: string): Promise<{ data: { attributes: { url: string } } }> {
    return this.request<{ data: { attributes: { url: string } } }>(`e_invoices/${id}/pdf`)
  }

  /**
   * E-Arsiv PDF indir
   */
  async getEArchivePdf(id: string): Promise<{ data: { attributes: { url: string } } }> {
    return this.request<{ data: { attributes: { url: string } } }>(`e_archives/${id}/pdf`)
  }

  // ==================== PROPOSAL → INVOICE CONVERSION ====================

  /**
   * Kabul edilmis teklifi faturaya donustur
   * Parasut'ta once sales_offer'dan sales_invoice olusturur
   */
  async convertOfferToInvoice(proposal: {
    parasutOfferId: string
    title: string
    currency: string
    expiresAt: Date | null
    notes: string | null
    customer: {
      parasutId: string | null
      taxNumber: string | null
      taxOffice: string | null
      address: string | null
      city: string | null
      district: string | null
      phone: string | null
    }
    items: Array<{
      name: string
      description: string | null
      quantity: number
      unitPrice: number
      vatRate: number
      discountRate: number
      product: { parasutId: string | null } | null
    }>
    discountType: string | null
    discountValue: number | null
  }): Promise<string> {
    if (!proposal.customer.parasutId) {
      throw new Error('Customer does not have a Parasut ID. Sync the customer first.')
    }

    const currencyMap: Record<string, string> = {
      TRY: 'TRL', USD: 'USD', EUR: 'EUR', GBP: 'GBP',
    }

    const issueDate = new Date().toISOString().split('T')[0]

    const details = proposal.items.map((item) => {
      const detail: {
        type: 'sales_invoice_details'
        attributes: {
          quantity: number
          unit_price: number
          vat_rate: number
          description: string
          discount_type?: string
          discount_value?: number
        }
        relationships?: {
          product: { data: { id: string; type: 'products' } }
        }
      } = {
        type: 'sales_invoice_details' as const,
        attributes: {
          quantity: item.quantity,
          unit_price: item.unitPrice,
          vat_rate: item.vatRate,
          description: item.name + (item.description ? ` - ${item.description}` : ''),
          discount_type: item.discountRate > 0 ? 'percentage' : undefined,
          discount_value: item.discountRate > 0 ? item.discountRate : undefined,
        },
      }
      if (item.product?.parasutId) {
        detail.relationships = {
          product: { data: { id: item.product.parasutId, type: 'products' } },
        }
      }
      return detail
    })

    const body: ParasutSalesInvoiceCreateData = {
      data: {
        type: 'sales_invoices',
        attributes: {
          item_type: 'invoice',
          issue_date: issueDate,
          description: proposal.title,
          currency: currencyMap[proposal.currency] || 'TRL',
          billing_address: proposal.customer.address || undefined,
          billing_phone: proposal.customer.phone || undefined,
          tax_office: proposal.customer.taxOffice || undefined,
          tax_number: proposal.customer.taxNumber || undefined,
          city: proposal.customer.city || undefined,
          district: proposal.customer.district || undefined,
          invoice_discount_type: proposal.discountType === 'PERCENTAGE' ? 'percentage' : proposal.discountType === 'FIXED' ? 'amount' : undefined,
          invoice_discount: proposal.discountValue ? Number(proposal.discountValue) : undefined,
        },
        relationships: {
          contact: {
            data: { id: proposal.customer.parasutId, type: 'contacts' },
          },
          details: { data: details },
          sales_offer: {
            data: { id: proposal.parasutOfferId, type: 'sales_offers' },
          },
        },
      },
    }

    const result = await this.createSalesInvoice(body)
    return result.data.id
  }

  /**
   * Parasut'taki fatura durumunu cek
   */
  async pullSalesInvoiceStatus(parasutInvoiceId: string): Promise<{
    paymentStatus: string
    netTotal: number
    grossTotal: number
    totalVat: number
    invoiceNumber: number | null
    eDocumentStatus: string | null
    eDocumentId: string | null
    updatedAt: string
  }> {
    const result = await this.getSalesInvoice(parasutInvoiceId)
    const attrs = result.data.attributes
    const eDoc = result.data.relationships?.active_e_document?.data

    let eDocStatus: string | null = null
    if (eDoc?.id) {
      try {
        const eDocResult = eDoc.type === 'e_invoices'
          ? await this.getEInvoice(eDoc.id)
          : await this.getEArchive(eDoc.id)
        eDocStatus = eDocResult.data.attributes.status
      } catch {
        // E-document may not be accessible
      }
    }

    return {
      paymentStatus: attrs.payment_status,
      netTotal: attrs.net_total,
      grossTotal: attrs.gross_total,
      totalVat: attrs.total_vat,
      invoiceNumber: attrs.invoice_id,
      eDocumentStatus: eDocStatus,
      eDocumentId: eDoc?.id || null,
      updatedAt: attrs.updated_at,
    }
  }

  // ==================== PURCHASE BILLS ====================

  /**
   * Alis faturalari listesi
   */
  async getPurchaseBills(
    page = 1,
    perPage = 25,
    options?: { filter?: Record<string, string> }
  ): Promise<ParasutPaginatedResponse<ParasutPurchaseBill>> {
    const params = new URLSearchParams({
      'page[number]': String(page),
      'page[size]': String(perPage),
    })
    if (options?.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        params.append(`filter[${key}]`, value)
      })
    }
    return this.request<ParasutPaginatedResponse<ParasutPurchaseBill>>(
      `purchase_bills?${params.toString()}`
    )
  }

  /**
   * Tek alis faturasi detay
   */
  async getPurchaseBill(id: string): Promise<{ data: ParasutPurchaseBill; included?: unknown[] }> {
    return this.request<{ data: ParasutPurchaseBill; included?: unknown[] }>(
      `purchase_bills/${id}?include=details,supplier`
    )
  }

  /**
   * Alis faturasi olustur
   */
  async createPurchaseBill(
    body: ParasutPurchaseBillCreateData
  ): Promise<{ data: ParasutPurchaseBill }> {
    return this.request<{ data: ParasutPurchaseBill }>('purchase_bills', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /**
   * Alis faturasi sil
   */
  async deletePurchaseBill(id: string): Promise<void> {
    await this.request(`purchase_bills/${id}`, { method: 'DELETE' })
  }

  /**
   * Alis faturasi odeme
   */
  async payPurchaseBill(
    id: string,
    paymentData: { account_id: string; date: string; amount: number }
  ): Promise<{ data: { id: string; type: string; attributes: Record<string, unknown> } }> {
    return this.request<{ data: { id: string; type: string; attributes: Record<string, unknown> } }>(`purchase_bills/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify({ data: { type: 'payments', attributes: paymentData } }),
    })
  }

  /**
   * Tum alis faturalarini Parasut'tan cek ve DB'ye kaydet
   */
  async syncAllPurchaseBills(): Promise<{ synced: number; errors: number }> {
    let page = 1
    let synced = 0
    let errors = 0
    let hasMore = true

    while (hasMore) {
      try {
        const result = await this.getPurchaseBills(page, 25)
        if (!result.data || result.data.length === 0) break

        for (const bill of result.data) {
          try {
            const attrs = bill.attributes
            const supplierId = bill.relationships?.supplier?.data?.id || null

            // Find or skip supplier matching
            let dbSupplierId: string | null = null
            if (supplierId) {
              const supplier = await prisma.supplier.findFirst({
                where: { tenantId: this.tenantId, parasutId: supplierId },
                select: { id: true },
              })
              dbSupplierId = supplier?.id || null
            }

            await prisma.purchaseBill.upsert({
              where: {
                tenantId_parasutId: { tenantId: this.tenantId, parasutId: bill.id },
              },
              create: {
                tenantId: this.tenantId,
                parasutId: bill.id,
                supplierId: dbSupplierId,
                description: attrs.description,
                issueDate: new Date(attrs.issue_date),
                dueDate: attrs.due_date ? new Date(attrs.due_date) : null,
                status: attrs.payment_status === 'paid' ? 'PAID' : 'RECEIVED',
                subtotal: attrs.gross_total,
                vatTotal: attrs.total_vat,
                grandTotal: attrs.net_total,
                currency: attrs.currency === 'TRL' ? 'TRY' : (attrs.currency || 'TRY'),
                lastSyncAt: new Date(),
              },
              update: {
                description: attrs.description,
                issueDate: new Date(attrs.issue_date),
                dueDate: attrs.due_date ? new Date(attrs.due_date) : null,
                status: attrs.payment_status === 'paid' ? 'PAID' : 'RECEIVED',
                subtotal: attrs.gross_total,
                vatTotal: attrs.total_vat,
                grandTotal: attrs.net_total,
                lastSyncAt: new Date(),
              },
            })
            synced++
          } catch (err) {
            errors++
            logger.error('Purchase bill sync error', { billId: bill.id, error: err })
          }
        }

        hasMore = result.data.length === 25
        page++
      } catch (err) {
        logger.error('Purchase bills page fetch error', { page, error: err })
        break
      }
    }

    await prisma.parasutSyncLog.create({
      data: {
        tenantId: this.tenantId,
        entityType: 'purchase_bill',
        direction: 'PULL',
        status: errors === 0 ? 'COMPLETED' : (synced > 0 ? 'PARTIAL' : 'FAILED'),
        recordCount: synced,
        errorCount: errors,
        completedAt: new Date(),
      },
    })

    return { synced, errors }
  }

  // ==================== PRODUCT CATEGORIES ====================

  /**
   * Urun kategorileri listesi
   */
  async getProductCategories(
    page = 1,
    perPage = 25
  ): Promise<ParasutPaginatedResponse<ParasutProductCategory>> {
    const params = new URLSearchParams({
      'page[number]': String(page),
      'page[size]': String(perPage),
      'filter[category_type]': 'Product',
    })
    return this.request<ParasutPaginatedResponse<ParasutProductCategory>>(
      `item_categories?${params.toString()}`
    )
  }

  /**
   * Tum urun kategorilerini Parasut'tan cek ve DB'ye kaydet
   */
  async syncProductCategories(): Promise<{ synced: number; errors: number }> {
    let page = 1
    let synced = 0
    let errors = 0
    let hasMore = true

    while (hasMore) {
      try {
        const result = await this.getProductCategories(page, 25)
        if (!result.data || result.data.length === 0) break

        for (const cat of result.data) {
          try {
            const attrs = cat.attributes
            if (attrs.category_type !== 'Product') continue

            await prisma.productCategory.upsert({
              where: {
                tenantId_parasutId: { tenantId: this.tenantId, parasutId: cat.id },
              },
              create: {
                tenantId: this.tenantId,
                parasutId: cat.id,
                name: attrs.name,
                bgColor: attrs.bg_color,
                textColor: attrs.text_color,
                lastSyncAt: new Date(),
              },
              update: {
                name: attrs.name,
                bgColor: attrs.bg_color,
                textColor: attrs.text_color,
                lastSyncAt: new Date(),
              },
            })
            synced++
          } catch (err) {
            errors++
            logger.error('Category sync error', { catId: cat.id, error: err })
          }
        }

        hasMore = result.data.length === 25
        page++
      } catch (err) {
        logger.error('Categories page fetch error', { page, error: err })
        break
      }
    }

    await prisma.parasutSyncLog.create({
      data: {
        tenantId: this.tenantId,
        entityType: 'product_category',
        direction: 'PULL',
        status: errors === 0 ? 'COMPLETED' : (synced > 0 ? 'PARTIAL' : 'FAILED'),
        recordCount: synced,
        errorCount: errors,
        completedAt: new Date(),
      },
    })

    return { synced, errors }
  }
}
