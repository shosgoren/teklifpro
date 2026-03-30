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
