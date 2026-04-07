export interface Customer {
  id: string;
  name: string;
  shortName: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  address: string;
  taxNumber: string;
  isActive: boolean;
  balance: number;
  lastSyncAt: string | null;
  syncedFromParasut: boolean;
  createdAt: string;
}

export type FilterStatus = 'all' | 'active' | 'inactive';
