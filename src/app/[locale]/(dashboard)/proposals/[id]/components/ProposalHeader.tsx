'use client';

import { useTranslations } from 'next-intl';
import {
  Edit, MessageCircle, Mail, Link, Download, Trash2,
  ChevronRight, CheckCircle, QrCode,
} from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import type { ProposalStatus } from './types';

interface ProposalHeaderProps {
  proposalNumber: string;
  title?: string;
  status: ProposalStatus;
  statusLabel: (s: string) => string;
  onNavigateBack: () => void;
  onMakeReady: () => void;
  onEdit: () => void;
  onSendWhatsApp: () => void;
  onSendEmail: () => void;
  onCopyLink: () => void;
  onShowQR: () => void;
  onDownloadPDF: () => void;
  onDelete: () => void;
}

export function ProposalHeader({
  proposalNumber, title, status, statusLabel,
  onNavigateBack, onMakeReady, onEdit, onSendWhatsApp, onSendEmail,
  onCopyLink, onShowQR, onDownloadPDF, onDelete,
}: ProposalHeaderProps) {
  const t = useTranslations('proposals');
  const tc = useTranslations('common');
  const td = useTranslations('proposalDetail');

  return (
    <div className="relative overflow-hidden rounded-b-3xl md:rounded-b-none">
      <div className="relative rounded-2xl bg-gradient-to-br from-mint-600 to-mint-700 p-6 mx-4 mt-4 md:mx-6 md:mt-6 shadow-lg">
        {/* Decorative circle */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-10 -translate-x-6" />

        {/* Breadcrumb */}
        <div className="relative z-10 mb-4 flex items-center gap-2 text-sm">
          <button
            onClick={onNavigateBack}
            className="text-white/60 hover:text-white transition-colors"
          >
            {t('breadcrumbTitle')}
          </button>
          <ChevronRight className="h-4 w-4 text-white/40" />
          <span className="text-white/90 font-medium">{proposalNumber}</span>
        </div>

        {/* Title & Status */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">{proposalNumber}</h1>
            {title && (
              <p className="text-white/70 text-sm md:text-base">{title}</p>
            )}
          </div>
          <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm px-3 py-1 text-sm font-medium w-fit">
            {statusLabel(status) || status}
          </Badge>
        </div>

        {/* Desktop Action Buttons */}
        <div className="relative z-10 hidden md:flex flex-wrap gap-2">
          {status === 'DRAFT' && (
            <button
              onClick={onMakeReady}
              className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/80 hover:bg-cyan-500 text-white rounded-xl backdrop-blur-sm transition-colors text-sm font-medium"
              title={t('makeReady')}
            >
              <CheckCircle className="h-4 w-4" />
              <span>{t('makeReady')}</span>
            </button>
          )}
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur-sm transition-colors text-sm font-medium"
            title={tc('edit')}
          >
            <Edit className="h-4 w-4" />
            <span>{tc('edit')}</span>
          </button>
          <button
            onClick={onSendWhatsApp}
            className="inline-flex items-center justify-center w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur-sm transition-colors"
            title={td('sendWhatsApp')}
            aria-label={td('sendWhatsApp')}
          >
            <MessageCircle className="h-4 w-4" />
          </button>
          <button
            onClick={onSendEmail}
            className="inline-flex items-center justify-center w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur-sm transition-colors"
            title={td('sendEmail')}
            aria-label={td('sendEmail')}
          >
            <Mail className="h-4 w-4" />
          </button>
          <button
            onClick={onCopyLink}
            className="inline-flex items-center justify-center w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur-sm transition-colors"
            title={td('copyLink')}
            aria-label={td('copyLink')}
          >
            <Link className="h-4 w-4" />
          </button>
          <button
            onClick={onShowQR}
            className="inline-flex items-center justify-center w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur-sm transition-colors"
            title={td('qrCode')}
            aria-label={td('qrCode')}
          >
            <QrCode className="h-4 w-4" />
          </button>
          <button
            onClick={onDownloadPDF}
            className="inline-flex items-center justify-center w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur-sm transition-colors"
            title={td('downloadPDF')}
            aria-label={td('downloadPDF')}
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="inline-flex items-center justify-center w-10 h-10 bg-red-500/30 hover:bg-red-500/50 text-white rounded-xl backdrop-blur-sm transition-colors ml-auto"
            title={td('delete')}
            aria-label={td('delete')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
