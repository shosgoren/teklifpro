'use client';

import { motion } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { VoiceProposalPreview } from '@/presentation/components/organisms/VoiceProposalPreview';
import { VoiceEditHistory } from '@/presentation/components/molecules/VoiceEditHistory';
import type { PreviewStepProps } from './types';

export function PreviewStep({
  parseResult,
  isApproving,
  isListeningCommands,
  editHistory,
  editChanges,
  historyIndex,
  locale,
  onEdit,
  onVoiceEdit,
  onApprove,
  onRetry,
  onHistoryChange,
  t,
}: PreviewStepProps) {
  return (
    <motion.div
      key="preview"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      <VoiceProposalPreview
        data={parseResult}
        onEdit={() => {
          // Navigate to manual edit page
          window.location.href = `/${locale}/proposals/new?voiceData=${encodeURIComponent(JSON.stringify(parseResult))}`
        }}
        onVoiceEdit={onVoiceEdit}
        onApprove={onApprove}
        onRetry={onRetry}
        isLoading={isApproving}
      />

      {/* Voice command listening indicator */}
      {isListeningCommands && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
        >
          <Volume2 className="h-4 w-4 text-blue-500 animate-pulse" />
          <span className="text-xs text-blue-600 dark:text-blue-400">
            {t('listeningCommands')}
          </span>
        </motion.div>
      )}

      {/* Edit History (undo/redo) - shown when there are multiple versions */}
      {editHistory.length > 1 && (
        <VoiceEditHistory
          history={editHistory}
          currentIndex={historyIndex}
          onChange={onHistoryChange}
          changes={editChanges}
          className="mt-4"
        />
      )}
    </motion.div>
  );
}
