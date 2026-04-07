'use client';

import { useTranslations } from 'next-intl';
import { Eye, Clock, FileText, User, Mail, Phone } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';

interface ProposalSidebarProps {
  proposal: {
    viewCount?: number;
    totalViewDuration?: number;
    viewedAt?: string;
    signatureData?: string;
    signerName?: string;
    signedAt?: string;
    status: string;
    customer?: {
      name: string;
      email?: string;
      phone?: string;
    };
  };
}

export function ProposalSidebar({ proposal }: ProposalSidebarProps) {
  const t = useTranslations('proposals');

  return (
    <>
      {/* View Analytics */}
      <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden">
        <div className="p-5">
          <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">{t('analytics.title')}</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
              <Eye className="h-4 w-4 text-blue-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">{proposal.viewCount || 0}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t('analytics.views')}</p>
            </div>
            <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
              <Clock className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {proposal.totalViewDuration
                  ? proposal.totalViewDuration >= 60
                    ? `${Math.floor(proposal.totalViewDuration / 60)}m`
                    : `${proposal.totalViewDuration}s`
                  : '0s'}
              </p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t('analytics.duration')}</p>
            </div>
            <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
              <FileText className="h-4 w-4 text-amber-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {proposal.viewedAt ? new Date(proposal.viewedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }) : '\u2014'}
              </p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t('analytics.lastView')}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Digital Signature */}
      {proposal.signatureData && proposal.status === 'ACCEPTED' && (
        <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden">
          <div className="p-5">
            <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">{t('signature.title')}</h3>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={proposal.signatureData} alt="Signature" className="max-h-20 mx-auto" />
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
              {proposal.signerName && <span className="font-medium text-gray-700 dark:text-gray-300">{proposal.signerName}</span>}
              {proposal.signedAt && <span>{new Date(proposal.signedAt).toLocaleString('tr-TR')}</span>}
            </div>
          </div>
        </Card>
      )}

      {/* Customer Info Card */}
      {proposal.customer && (
        <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden border-t-4 border-t-blue-500">
          <div className="p-5">
            <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-5">{t('customerInfo')}</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{proposal.customer.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{t('customer')}</p>
                </div>
              </div>
              {proposal.customer.email && (
                <div className="flex items-center gap-3 pl-1">
                  <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                  <a href={`mailto:${proposal.customer.email}`} className="text-blue-600 dark:text-blue-400 hover:underline text-sm truncate">
                    {proposal.customer.email}
                  </a>
                </div>
              )}
              {proposal.customer.phone && (
                <div className="flex items-center gap-3 pl-1">
                  <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                  <a href={`tel:${proposal.customer.phone}`} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
                    {proposal.customer.phone}
                  </a>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
