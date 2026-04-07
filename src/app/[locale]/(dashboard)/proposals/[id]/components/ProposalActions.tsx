'use client';

import { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';
import {
  Edit, MessageCircle, Mail, Link, Download, Trash2,
  CheckCircle, QrCode,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/shared/components/ui/dialog';
import { toast } from 'sonner';
import type { ProposalStatus } from './types';

interface ProposalActionsProps {
  status: ProposalStatus;
  proposalNumber: string;
  proposalLink: string;
  showQR: boolean;
  onShowQRChange: (show: boolean) => void;
  onMakeReady: () => void;
  onEdit: () => void;
  onSendWhatsApp: () => void;
  onSendEmail: () => void;
  onCopyLink: () => void;
  onDownloadPDF: () => void;
  onDelete: () => void;
}

export function ProposalActions({
  status, proposalNumber, proposalLink,
  showQR, onShowQRChange,
  onMakeReady, onEdit, onSendWhatsApp, onSendEmail,
  onCopyLink, onDownloadPDF, onDelete,
}: ProposalActionsProps) {
  const t = useTranslations('proposals');

  return (
    <>
      {/* ===== QR Code Dialog ===== */}
      <Dialog open={showQR} onOpenChange={onShowQRChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">{t('qrCode')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {proposalLink && (
              <div className="p-4 bg-white rounded-2xl shadow-inner">
                <QRCodeSVG
                  value={proposalLink}
                  size={220}
                  level="M"
                  includeMargin
                />
              </div>
            )}
            <p className="text-sm text-gray-500 text-center max-w-xs">
              {t('qrCodeDesc')}
            </p>
            <p className="text-xs text-gray-400 font-mono break-all text-center px-4">
              {proposalNumber}
            </p>
            <button
              onClick={() => {
                if (!proposalLink) return;
                navigator.clipboard.writeText(proposalLink);
                toast.success(t('linkCopied'));
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-sm font-medium transition-colors"
            >
              <Link className="h-4 w-4" />
              {t('copyLink')}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Mobile Sticky Bottom Bar ===== */}
      <div className="md:hidden fixed bottom-[60px] left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-2 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        {status === 'DRAFT' && (
          <button
            onClick={onMakeReady}
            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl transition-colors text-sm font-medium"
          >
            <CheckCircle className="h-4 w-4" />
            Hazirla
          </button>
        )}
        <button
          onClick={onEdit}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-sm font-medium"
        >
          <Edit className="h-4 w-4" />
          Duzenle
        </button>
        <button
          onClick={onSendWhatsApp}
          className="inline-flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors"
          title="WhatsApp"
        >
          <MessageCircle className="h-4 w-4" />
        </button>
        <button
          onClick={onSendEmail}
          className="inline-flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors"
          title="E-posta"
        >
          <Mail className="h-4 w-4" />
        </button>
        <button
          onClick={onCopyLink}
          className="inline-flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors"
          title="Link Kopyala"
        >
          <Link className="h-4 w-4" />
        </button>
        <button
          onClick={() => onShowQRChange(true)}
          className="inline-flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors"
          title="QR Kod"
        >
          <QrCode className="h-4 w-4" />
        </button>
        <button
          onClick={onDownloadPDF}
          className="inline-flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors"
          title="PDF"
        >
          <Download className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="inline-flex items-center justify-center w-10 h-10 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-xl transition-colors"
          title="Sil"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}
