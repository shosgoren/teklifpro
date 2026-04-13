export type ProposalStatus = 'DRAFT' | 'READY' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUESTED' | 'REVISED' | 'EXPIRED' | 'CANCELLED' | 'INVOICED';

export const STATUS_COLORS: Record<ProposalStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  READY: 'bg-cyan-100 text-cyan-800',
  SENT: 'bg-blue-100 text-blue-800',
  VIEWED: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  REVISION_REQUESTED: 'bg-orange-100 text-orange-800',
  REVISED: 'bg-purple-100 text-purple-800',
  EXPIRED: 'bg-slate-700 text-white',
  CANCELLED: 'bg-gray-200 text-gray-600',
  INVOICED: 'bg-indigo-100 text-indigo-800',
};

export interface ProposalItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number | string;
  discountRate: number | string;
  vatRate: number | string;
  lineTotal: number | string;
}

export interface ProposalActivity {
  id: string;
  type: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export const ACTIVITY_ICON_COLORS: Record<string, string> = {
  CREATED: 'from-blue-500 to-blue-600',
  READY: 'from-cyan-500 to-cyan-600',
  SENT: 'from-indigo-500 to-indigo-600',
  VIEWED: 'from-amber-500 to-amber-600',
  ACCEPTED: 'from-emerald-500 to-emerald-600',
  REJECTED: 'from-red-500 to-red-600',
  REVISION_REQUESTED: 'from-orange-500 to-orange-600',
  REVISED: 'from-purple-500 to-purple-600',
  UPDATED: 'from-violet-500 to-violet-600',
  CANCELLED: 'from-gray-500 to-gray-600',
  EXPIRED: 'from-slate-500 to-slate-600',
  INVOICED: 'from-indigo-500 to-indigo-600',
  WHATSAPP_SENT: 'from-green-500 to-green-600',
  WHATSAPP_DELIVERED: 'from-green-500 to-green-600',
  WHATSAPP_READ: 'from-green-600 to-green-700',
  LINK_CLICKED: 'from-cyan-500 to-cyan-600',
  FOLLOWUP_SENT: 'from-sky-500 to-sky-600',
  E_FATURA_SENT: 'from-teal-500 to-teal-600',
  E_ARSIV_SENT: 'from-teal-500 to-teal-600',
};

export const ACTIVITY_KEY_MAP: Record<string, string> = {
  CREATED: 'activity.created',
  SENT: 'activity.sent',
  VIEWED: 'activity.viewed',
  ACCEPTED: 'activity.accepted',
  REJECTED: 'activity.rejected',
  REVISION_REQUESTED: 'activity.revisionRequested',
  REVISED: 'activity.revised',
  UPDATED: 'activity.updated',
  CANCELLED: 'activity.cancelled',
  EXPIRED: 'activity.expired',
  INVOICED: 'activity.invoiced',
  WHATSAPP_SENT: 'activity.whatsappSent',
  WHATSAPP_DELIVERED: 'activity.whatsappDelivered',
  WHATSAPP_READ: 'activity.whatsappRead',
  LINK_CLICKED: 'activity.linkClicked',
  FOLLOWUP_SENT: 'activity.followupSent',
  E_FATURA_SENT: 'activity.eFaturaSent',
  E_ARSIV_SENT: 'activity.eArsivSent',
};
