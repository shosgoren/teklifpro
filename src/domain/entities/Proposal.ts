export interface ProposalItem {
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount?: number;
  tax?: number;
  total: number;
}

export interface ProposalCustomer {
  companyName: string;
  name: string;
  title?: string;
  address?: string;
  phone?: string;
  email?: string;
  taxNumber?: string;
}

export interface Proposal {
  id: string;
  number: string;
  date: Date | string;
  validUntil: Date | string;
  status: string;
  customer: ProposalCustomer;
  items: ProposalItem[];
  subtotal: number;
  discountAmount?: number;
  taxAmount?: number;
  total: number;
  paymentTerms?: string;
  deliveryTerms?: string;
  notes?: string;
}
