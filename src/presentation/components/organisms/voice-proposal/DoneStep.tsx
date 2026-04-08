'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, ExternalLink, Send, Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { DoneStepProps } from './types';

export function DoneStep({
  createdProposalId,
  isSendingWhatsApp,
  whatsAppSent,
  locale,
  onWhatsAppSend,
  onRetry,
  t,
}: DoneStepProps) {
  const whatsAppLink = createdProposalId
    ? `https://wa.me/?text=${encodeURIComponent(t('whatsAppShareText', { url: `${window.location.origin}/${locale}/proposals/${createdProposalId}` }))}`
    : '#';

  return (
    <motion.div
      key="done"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="flex flex-col items-center gap-6 py-8"
    >
      {/* Success animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.1 }}
        className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-xl shadow-emerald-500/30"
      >
        <CheckCircle2 className="h-10 w-10 text-white" />
      </motion.div>

      <div className="text-center">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          {t('proposalCreatedTitle')}
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          {t('proposalCreatedDesc')}
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {/* View proposal */}
        <Button
          onClick={() => {
            window.location.href = `/${locale}/proposals/${createdProposalId}`
          }}
          className="gap-2 w-full"
        >
          <ExternalLink className="h-4 w-4" />
          {t('viewProposal')}
        </Button>

        {/* WhatsApp Send via API */}
        <Button
          variant="outline"
          onClick={onWhatsAppSend}
          disabled={isSendingWhatsApp || whatsAppSent}
          className="gap-2 w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
        >
          {isSendingWhatsApp ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : whatsAppSent ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {whatsAppSent ? t('whatsAppSent') : t('whatsAppSend')}
        </Button>

        {/* Fallback: open WhatsApp manually */}
        <Button
          variant="ghost"
          asChild
          className="gap-2 w-full text-slate-500 text-xs"
        >
          <a href={whatsAppLink} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-3 w-3" />
            {t('manualWhatsAppLink')}
          </a>
        </Button>

        {/* Create another */}
        <Button
          variant="ghost"
          onClick={onRetry}
          className="text-slate-500"
        >
          {t('newVoiceProposal')}
        </Button>
      </div>
    </motion.div>
  );
}
