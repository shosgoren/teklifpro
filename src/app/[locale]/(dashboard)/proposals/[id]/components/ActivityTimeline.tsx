'use client';

import { useTranslations } from 'next-intl';
import {
  Clock, Eye, CheckCircle, XCircle, AlertCircle, FileText, Mail,
  Send, Edit, Ban, Timer, Receipt, MessageSquare, MousePointerClick,
  Bell, FileCheck, Archive, RefreshCw, CheckCheck,
} from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import type { ProposalActivity } from './types';
import { ACTIVITY_ICON_COLORS, ACTIVITY_KEY_MAP } from './types';

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'CREATED': return <FileText className="h-4 w-4" />;
    case 'UPDATED': return <Edit className="h-4 w-4" />;
    case 'SENT': return <Send className="h-4 w-4" />;
    case 'VIEWED': return <Eye className="h-4 w-4" />;
    case 'ACCEPTED': return <CheckCircle className="h-4 w-4" />;
    case 'REJECTED': return <XCircle className="h-4 w-4" />;
    case 'REVISION_REQUESTED': return <AlertCircle className="h-4 w-4" />;
    case 'REVISED': return <RefreshCw className="h-4 w-4" />;
    case 'CANCELLED': return <Ban className="h-4 w-4" />;
    case 'EXPIRED': return <Timer className="h-4 w-4" />;
    case 'INVOICED': return <Receipt className="h-4 w-4" />;
    case 'WHATSAPP_SENT': return <Send className="h-4 w-4" />;
    case 'WHATSAPP_DELIVERED': return <CheckCheck className="h-4 w-4" />;
    case 'WHATSAPP_READ': return <Eye className="h-4 w-4" />;
    case 'LINK_CLICKED': return <MousePointerClick className="h-4 w-4" />;
    case 'FOLLOWUP_SENT': return <Bell className="h-4 w-4" />;
    case 'E_FATURA_SENT': return <FileCheck className="h-4 w-4" />;
    case 'E_ARSIV_SENT': return <Archive className="h-4 w-4" />;
    default: return <Clock className="h-4 w-4" />;
  }
};

/** Determine if an activity is a customer action vs internal/system */
function getActorBadge(type: string, metadata?: Record<string, unknown>): { label: string; className: string } | null {
  const customerActions = ['VIEWED', 'ACCEPTED', 'REJECTED', 'REVISION_REQUESTED', 'LINK_CLICKED'];
  const systemActions = ['EXPIRED', 'WHATSAPP_DELIVERED', 'WHATSAPP_READ'];

  if (customerActions.includes(type)) {
    return { label: 'Müşteri', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
  }
  if (systemActions.includes(type)) {
    return { label: 'Sistem', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' };
  }
  if (metadata?.automatic) {
    return { label: 'Otomatik', className: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' };
  }
  if (['CREATED', 'UPDATED', 'SENT', 'CANCELLED', 'INVOICED', 'E_FATURA_SENT', 'E_ARSIV_SENT', 'FOLLOWUP_SENT'].includes(type)) {
    return { label: 'Ekip', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
  }
  return null;
}

/** Build metadata detail lines from activity metadata */
function getMetadataDetails(type: string, metadata?: Record<string, unknown>): string[] {
  if (!metadata) return [];
  const details: string[] = [];

  // Send method and recipient
  if (metadata.method && metadata.sentTo) {
    const methodLabel = metadata.method === 'whatsapp' ? 'WhatsApp' : metadata.method === 'email' ? 'E-posta' : String(metadata.method);
    details.push(`${methodLabel} ile ${metadata.sentTo} adresine`);
  } else if (metadata.sentTo) {
    details.push(`Alıcı: ${metadata.sentTo}`);
  }

  // Bulk send
  if (metadata.bulkSend) {
    details.push('Toplu gönderim');
  }

  // Changed fields for UPDATED
  if (type === 'UPDATED' && Array.isArray(metadata.changes) && metadata.changes.length > 0) {
    const fieldLabels: Record<string, string> = {
      title: 'Başlık', description: 'Açıklama', notes: 'Notlar',
      status: 'Durum', items: 'Kalemler', grandTotal: 'Toplam',
      paymentTerms: 'Ödeme koşulları', deliveryTerms: 'Teslimat koşulları',
      termsConditions: 'Genel şartlar', expiresAt: 'Geçerlilik tarihi',
      discountType: 'İndirim tipi', discountValue: 'İndirim değeri',
      currency: 'Para birimi', contactId: 'İlgili kişi',
    };
    const labels = (metadata.changes as string[]).map(f => fieldLabels[f] || f);
    details.push(`Değişen: ${labels.join(', ')}`);
  }

  // Signer info for ACCEPTED
  if (metadata.signerName) {
    details.push(`İmzalayan: ${metadata.signerName}`);
  }

  // Customer note
  if (metadata.customerNote) {
    details.push(`Not: ${metadata.customerNote}`);
  }

  // Rejection reason
  if (metadata.rejectionReason) {
    details.push(`Neden: ${metadata.rejectionReason}`);
  }

  // Revision note
  if (metadata.revisionNote) {
    details.push(`Talep: ${metadata.revisionNote}`);
  }

  // Followup number
  if (metadata.followupNumber) {
    details.push(`Hatırlatma #${metadata.followupNumber}`);
  }

  // WhatsApp message content
  if (metadata.content && type === 'WHATSAPP_READ') {
    details.push(`Mesaj: ${String(metadata.content).substring(0, 100)}`);
  }

  // Parasut source
  if (metadata.source === 'parasut_webhook') {
    details.push('Paraşüt entegrasyonu');
  }

  return details;
}

interface ActivityTimelineProps {
  activities: ProposalActivity[];
  formatDateTime: (dateStr: string) => string;
}

export function ActivityTimeline({ activities, formatDateTime }: ActivityTimelineProps) {
  const t = useTranslations('proposals');

  const getActivityLabel = (type: string) => {
    const key = ACTIVITY_KEY_MAP[type];
    return key ? t(key as Parameters<typeof t>[0]) : type;
  };

  return (
    <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden">
      <div className="p-5">
        <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-5">{t('activityHistory')}</h3>
        <div className="space-y-0">
          {activities.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">{t('noActivity')}</p>
          ) : (
            activities.map((activity: ProposalActivity, idx: number) => {
              const badge = getActorBadge(activity.type, activity.metadata);
              const metaDetails = getMetadataDetails(activity.type, activity.metadata);

              return (
                <div key={activity.id} className="flex gap-3">
                  {/* Timeline column */}
                  <div className="flex flex-col items-center">
                    <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${ACTIVITY_ICON_COLORS[activity.type] || 'from-gray-400 to-gray-500'} text-white flex items-center justify-center shrink-0 shadow-sm`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    {idx < activities.length - 1 && (
                      <div className="w-px flex-1 min-h-[16px] bg-gray-200 dark:bg-gray-700" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex-1 pb-4 pt-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{getActivityLabel(activity.type)}</p>
                      {badge && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badge.className}`}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatDateTime(activity.createdAt)}</p>
                    {activity.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{activity.description}</p>
                    )}
                    {metaDetails.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {metaDetails.map((detail, i) => (
                          <p key={i} className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
                            {detail}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Card>
  );
}
