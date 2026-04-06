// ==================== API Response Types ====================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, string[]>
  }
  meta?: {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
  }
}

// ==================== Parasut Types ====================

export interface ParasutCredentials {
  companyId: string
  clientId: string
  clientSecret: string
  username: string
  password: string
}

export interface ParasutTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
  created_at: number
}

export interface ParasutContact {
  id: string
  type: string
  attributes: {
    name: string
    short_name: string | null
    contact_type: 'customer' | 'supplier'
    tax_number: string | null
    tax_office: string | null
    email: string | null
    phone: string | null
    fax: string | null
    address: string | null
    city: string | null
    district: string | null
    balance: string
    account_type: 'customer' | 'supplier'
    created_at: string
    updated_at: string
  }
  relationships?: {
    contact_people?: {
      data: Array<{ id: string; type: string }>
    }
  }
}

export interface ParasutProduct {
  id: string
  type: string
  attributes: {
    name: string
    code: string | null
    unit: string
    vat_rate: string
    list_price: string
    currency: string
    buying_price: string | null
    inventory_tracking: boolean
    initial_stock_count: string | null
    created_at: string
    updated_at: string
  }
}

export interface ParasutContactPerson {
  id: string
  type: string
  attributes: {
    name: string
    email: string | null
    phone: string | null
    title: string | null
  }
}

export interface ParasutPaginatedResponse<T> {
  data: T[]
  included?: Array<Record<string, unknown>>
  meta: {
    current_page: number
    total_pages: number
    total_count: number
    per_page: number
  }
}

// Sales Offer from Parasut API
export interface ParasutSalesOffer {
  id: string
  type: string
  attributes: {
    content: string | null
    contact_type: string | null
    status: string // 'waiting' | 'accepted' | 'rejected'
    archived: boolean
    net_total: number // grandTotal
    gross_total: number // subtotal
    total_vat: number
    total_discount: number
    description: string | null
    issue_date: string // YYYY-MM-DD
    due_date: string | null
    currency: string // TRL, USD, EUR, GBP
    exchange_rate: number | null
    invoice_discount_type: string | null // 'percentage' | 'amount'
    invoice_discount: number | null
    billing_address: string | null
    billing_phone: string | null
    tax_office: string | null
    tax_number: string | null
    city: string | null
    district: string | null
    order_no: string | null
    created_at: string
    updated_at: string
  }
  relationships?: {
    contact?: { data: { id: string; type: string } | null }
    details?: { data: Array<{ id: string; type: string }> }
    sales_invoice?: { data: { id: string; type: string } | null }
  }
}

export interface ParasutSalesOfferDetail {
  id: string
  type: string
  attributes: {
    description: string | null
    net_total: number
    unit_price: number
    vat_rate: number
    quantity: number
    discount_type: string | null
    discount_value: number | null
    discount: number | null
    detail_no: number | null
    created_at: string
    updated_at: string
  }
  relationships?: {
    product?: { data: { id: string; type: string } | null }
  }
}

export interface ParasutSalesOfferCreateData {
  data: {
    type: 'sales_offers'
    attributes: {
      issue_date: string
      due_date?: string
      description?: string
      currency?: string
      exchange_rate?: number
      invoice_discount_type?: string
      invoice_discount?: number
      billing_address?: string
      billing_phone?: string
      tax_office?: string
      tax_number?: string
      city?: string
      district?: string
      content?: string
    }
    relationships: {
      contact: {
        data: { id: string; type: 'contacts' }
      }
      details: {
        data: Array<{
          type: 'sales_offer_details'
          attributes: {
            quantity: number
            unit_price: number
            vat_rate: number
            discount_type?: string
            discount_value?: number
            description?: string
          }
          relationships?: {
            product?: {
              data: { id: string; type: 'products' }
            }
          }
        }>
      }
    }
  }
}

export interface ParasutSharingData {
  data: {
    type: 'sharing_forms'
    attributes: {
      email: {
        addresses: string
        subject: string
        body: string
      }
      portal?: {
        has_online_collection?: boolean
        has_online_payment_reminder?: boolean
        has_referral_link?: boolean
      }
    }
    relationships: {
      shareable: {
        data: { id: string; type: 'sales_offers' }
      }
    }
  }
}

// ==================== Proposal Types ====================

export type ProposalStatusType =
  | 'DRAFT'
  | 'SENT'
  | 'VIEWED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'REVISION_REQUESTED'
  | 'REVISED'
  | 'EXPIRED'
  | 'CANCELLED'

export interface ProposalItemInput {
  productId?: string
  name: string
  description?: string
  unit: string
  quantity: number
  unitPrice: number
  discountRate: number
  vatRate: number
}

export interface CreateProposalInput {
  customerId: string
  contactId?: string
  templateId?: string
  title: string
  description?: string
  items: ProposalItemInput[]
  discountType?: 'PERCENTAGE' | 'FIXED'
  discountValue?: number
  validityDays?: number
  paymentTerms?: string
  deliveryTerms?: string
  notes?: string
  termsConditions?: string
}

// ==================== WhatsApp Types ====================

export interface WhatsAppSendTemplateParams {
  to: string
  templateName: string
  language: string
  parameters: Record<string, string>
  headerParams?: string[]
  buttonParams?: string[]
}

export interface WhatsAppMessageResponse {
  messaging_product: string
  contacts: Array<{ input: string; wa_id: string }>
  messages: Array<{ id: string }>
}

// ==================== Dashboard Types ====================

export interface DashboardStats {
  totalProposals: number
  sentProposals: number
  acceptedProposals: number
  rejectedProposals: number
  pendingProposals: number
  totalRevenue: number
  acceptanceRate: number
  avgResponseTime: number
}

export interface ProposalSummary {
  id: string
  proposalNumber: string
  title: string
  customerName: string
  grandTotal: number
  status: ProposalStatusType
  createdAt: string
  expiresAt: string | null
  viewCount: number
}
