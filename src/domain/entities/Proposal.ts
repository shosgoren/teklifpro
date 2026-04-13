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
  logo?: string;
}

export interface ProposalSignature {
  data: string;           // base64 image data
  signerName?: string;
  signerTitle?: string;
  signedAt?: string;      // ISO date
}

export interface Proposal {
  id: string;
  number: string;
  date: Date | string;
  validUntil: Date | string;
  status: string;
  proposalType?: 'OFFICIAL' | 'UNOFFICIAL';
  customer: ProposalCustomer;
  items: ProposalItem[];
  subtotal: number;
  discountAmount?: number;
  taxAmount?: number;
  total: number;
  paymentTerms?: string;
  deliveryTerms?: string;
  notes?: string;
  companySignature?: ProposalSignature;
  companySeal?: string;       // base64 image
  customerSignature?: ProposalSignature;
  verificationHash?: string;
}
