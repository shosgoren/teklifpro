'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { LiveTranscript } from '@/presentation/components/molecules/LiveTranscript';
import type { ProcessingStepProps } from './types';

export function ProcessingStep({
  transcript,
  parseResult,
  t,
}: ProcessingStepProps) {
  return (
    <motion.div
      key="processing"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex flex-col items-center gap-6 py-8"
    >
      <div className="relative">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
      </div>

      <div className="text-center">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {transcript ? t('preparingProposal') : t('recognizingSpeech')}
        </p>
      </div>

      {transcript && (
        <LiveTranscript
          text={transcript}
          isProcessing={!parseResult}
          className="w-full"
        />
      )}
    </motion.div>
  );
}
