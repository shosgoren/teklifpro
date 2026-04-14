'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';
import type { ProposalItem, ProposalStatus } from './types';
import { STATUS_COLORS } from './types';

interface ProposalItemsTableProps {
  proposal: {
    createdAt: string;
    proposalNumber: string;
    expiresAt?: string;
    status: string;
    customer?: {
      name: string;
      email?: string;
      phone?: string;
    };
    tenant?: {
      name?: string;
      email?: string;
      phone?: string;
    };
    subtotal?: number | string;
    discountAmount?: number | string;
    vatTotal?: number | string;
    grandTotal?: number | string;
    notes?: string;
    paymentTerms?: string;
    deliveryTerms?: string;
    title?: string;
    proposalType?: string;
  };
  items: ProposalItem[];
  status: ProposalStatus;
  statusLabel: (s: string) => string;
  formatDate: (dateStr: string) => string;
  formatAmount: (amount: number) => string;
}

export function ProposalItemsTable({ proposal, items, status, statusLabel, formatDate, formatAmount }: ProposalItemsTableProps) {
  const t = useTranslations('proposals');
  const isUnofficial = proposal.proposalType === 'UNOFFICIAL';

  return (
    <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden">
      <div className="p-6 md:p-8">
        {/* Company Header */}
        <div className="mb-8 pb-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{proposal.tenant?.name || 'Şirket Adı'}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {[proposal.tenant?.phone, proposal.tenant?.email].filter(Boolean).join(' | ') || ''}
          </p>
        </div>

        {/* Proposal Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{t('proposalDate')}</p>
            <p className="text-gray-900 dark:text-white font-semibold text-sm">{formatDate(proposal.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{t('proposalNo')}</p>
            <p className="text-gray-900 dark:text-white font-semibold text-sm">{proposal.proposalNumber}</p>
          </div>
          {proposal.expiresAt && (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{t('validity')}</p>
              <p className="text-gray-900 dark:text-white font-semibold text-sm">{formatDate(proposal.expiresAt)}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{t('list.status')}</p>
            <Badge className={`${STATUS_COLORS[status] || ''} w-fit text-xs`}>
              {statusLabel(status) || status}
            </Badge>
          </div>
        </div>

        {/* Customer Info in Preview */}
        {proposal.customer && (
          <div className="mb-8">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">{t('customer')}</p>
            <p className="text-gray-900 dark:text-white font-semibold">{proposal.customer.name}</p>
            {proposal.customer.email && <p className="text-gray-500 dark:text-gray-400 text-sm">{proposal.customer.email}</p>}
            {proposal.customer.phone && <p className="text-gray-500 dark:text-gray-400 text-sm">{proposal.customer.phone}</p>}
          </div>
        )}

        {/* Line Items */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">{t('lineItems')}</p>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('productService')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('quantity')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('unitPrice')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('discount')}</th>
                  {!isUnofficial && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('vat')}</th>}
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('total')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: ProposalItem, idx: number) => (
                  <tr
                    key={item.id}
                    className={`border-t border-gray-100 dark:border-gray-800 ${
                      idx % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-900/50' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{formatAmount(Number(item.unitPrice) || 0)}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">%{Number(item.discountRate) || 0}</td>
                    {!isUnofficial && <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">%{Number(item.vatRate) || 0}</td>}
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                      {formatAmount(Number(item.lineTotal) || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {items.map((item: ProposalItem) => (
              <div
                key={item.id}
                className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 p-4"
              >
                <p className="font-semibold text-gray-900 dark:text-white mb-2">{item.name}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-400 text-xs">{t('quantity')}</span>
                    <p className="text-gray-700 dark:text-gray-300">{item.quantity}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs">{t('unitPrice')}</span>
                    <p className="text-gray-700 dark:text-gray-300">{formatAmount(Number(item.unitPrice) || 0)}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs">{t('discount')}</span>
                    <p className="text-gray-700 dark:text-gray-300">%{Number(item.discountRate) || 0}</p>
                  </div>
                  {!isUnofficial && <div>
                    <span className="text-gray-400 text-xs">{t('vat')}</span>
                    <p className="text-gray-700 dark:text-gray-300">%{Number(item.vatRate) || 0}</p>
                  </div>}
                </div>
                <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{t('total')}</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {formatAmount(Number(item.lineTotal) || 0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-full md:w-72 space-y-2">
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>{t('araToplam')}</span>
              <span>{formatAmount(Number(proposal.subtotal) || 0)}</span>
            </div>
            {Number(proposal.discountAmount) > 0 && (
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>{t('iskonto')}</span>
                <span>-{formatAmount(Number(proposal.discountAmount))}</span>
              </div>
            )}
            {!isUnofficial && (
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>{t('kdv')}</span>
                <span>{formatAmount(Number(proposal.vatTotal) || 0)}</span>
              </div>
            )}
            {/* Grand total with gradient bg */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-4 mt-2">
              <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
                <span>{t('genelToplam')}</span>
                <span>{formatAmount(Number(proposal.grandTotal) || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {proposal.notes && (
          <div className="mb-6 p-4 bg-gray-50/80 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">{t('notesLabel')}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{proposal.notes}</p>
          </div>
        )}

        {/* Terms */}
        {(proposal.paymentTerms || proposal.deliveryTerms) && (
          <div className="p-4 bg-gray-50/80 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">{t('termsLabel')}</p>
            {proposal.paymentTerms && <p className="text-sm text-gray-700 dark:text-gray-300">{t('paymentPrefix')} {proposal.paymentTerms}</p>}
            {proposal.deliveryTerms && <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{t('deliveryPrefix')} {proposal.deliveryTerms}</p>}
          </div>
        )}
      </div>
    </Card>
  );
}
