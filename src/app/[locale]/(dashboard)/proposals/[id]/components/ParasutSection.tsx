'use client';

import { useLocale, useTranslations } from 'next-intl';
import {
  RefreshCw, CloudUpload, ExternalLink, Send, Loader2,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';

interface ParasutSectionProps {
  parasutOfferId?: string | null;
  parasutLastSyncAt?: string | null;
  parasutInvoiceId?: string | null;
  proposalStatus: string;
  customerEmail?: string;
  parasutLoading: string | null;
  onPush: () => void;
  onPull: () => void;
  onPdf: () => void;
  onShare: () => void;
  onInvoice: () => void;
  onInvoiceStatus: () => void;
  onEFatura: (type: 'e_invoice' | 'e_archive') => void;
}

export function ParasutSection({
  parasutOfferId, parasutLastSyncAt, parasutInvoiceId,
  proposalStatus, customerEmail, parasutLoading,
  onPush, onPull, onPdf, onShare, onInvoice, onInvoiceStatus, onEFatura,
}: ParasutSectionProps) {
  const t = useTranslations('proposals');
  const locale = useLocale();

  return (
    <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden border-t-4 border-t-emerald-500">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('parasut.title')}</h3>
          {parasutOfferId && (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-[10px]">
              {t('parasut.connected')}
            </Badge>
          )}
        </div>

        {parasutOfferId ? (
          <div className="space-y-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('parasut.offerId')}</p>
              <p className="text-sm font-mono font-medium text-gray-900 dark:text-white">{parasutOfferId}</p>
              {parasutLastSyncAt && (
                <p className="text-[10px] text-gray-400 mt-1">
                  {t('parasut.lastSync')} {new Date(parasutLastSyncAt).toLocaleString(locale)}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={!!parasutLoading}
                onClick={onPull}
              >
                {parasutLoading === 'pull' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                {t('parasut.pullStatus')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={!!parasutLoading}
                onClick={onPush}
              >
                {parasutLoading === 'push' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CloudUpload className="h-3 w-3 mr-1" />}
                {t('parasut.update')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={!!parasutLoading}
                onClick={onPdf}
              >
                {parasutLoading === 'pdf' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ExternalLink className="h-3 w-3 mr-1" />}
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={!!parasutLoading || !customerEmail}
                onClick={onShare}
              >
                {parasutLoading === 'share' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                {t('parasut.email')}
              </Button>
            </div>

            {/* Invoice Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">{t('parasut.invoice')}</p>
              {parasutInvoiceId ? (
                <div className="space-y-2">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('parasut.invoiceId')}</p>
                    <p className="text-sm font-mono font-medium text-gray-900 dark:text-white">{parasutInvoiceId}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      disabled={!!parasutLoading}
                      onClick={onInvoiceStatus}
                    >
                      {parasutLoading === 'invoiceStatus' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                      {t('parasut.invoiceStatus')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      disabled={!!parasutLoading}
                      onClick={() => onEFatura('e_invoice')}
                    >
                      {parasutLoading === 'efatura' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                      {t('parasut.eFatura')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs col-span-2"
                      disabled={!!parasutLoading}
                      onClick={() => onEFatura('e_archive')}
                    >
                      {parasutLoading === 'efatura' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                      {t('parasut.eArsiv')}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                  disabled={!!parasutLoading || (proposalStatus !== 'ACCEPTED' && proposalStatus !== 'INVOICED')}
                  onClick={onInvoice}
                >
                  {parasutLoading === 'invoice' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CloudUpload className="h-4 w-4 mr-2" />
                  )}
                  {t('parasut.convertToInvoice')}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('parasut.notSynced')}
            </p>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              size="sm"
              disabled={!!parasutLoading}
              onClick={onPush}
            >
              {parasutLoading === 'push' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CloudUpload className="h-4 w-4 mr-2" />
              )}
              {t('parasut.sendToParasut')}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
