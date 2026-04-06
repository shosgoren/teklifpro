export interface Tenant {
  id: string;
  name: string;
  address?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  taxNumber?: string;
  logo?: string;
  companySignature?: string;
  companySeal?: string;
  companySignerName?: string;
  companySignerTitle?: string;
}
