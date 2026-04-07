'use client';

import { motion } from 'framer-motion';
import { Mic, Square } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { VoiceActivityIndicator } from '@/presentation/components/molecules/VoiceActivityIndicator';
import type { RecordingStepProps } from './types';

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export function RecordingStep({
  isRecording,
  volume,
  recordingTime,
  countdown,
  isEditMode,
  error,
  onStartRecording,
  onStopRecording,
  onClearError,
  t,
}: RecordingStepProps) {
  return (
    <motion.div
      key="recording"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex flex-col items-center gap-6 py-8"
    >
      {/* Mic button */}
      {!isRecording ? (
        <button
          onClick={onStartRecording}
          className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-xl shadow-emerald-500/30 hover:scale-105 transition-transform active:scale-95"
        >
          <Mic className="h-10 w-10 text-white" />
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-30" />
        </button>
      ) : (
        <>
          {/* Recording indicator */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20" />
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-xl shadow-red-500/30">
              <Mic className="h-10 w-10 text-white" />
            </div>
          </div>

          {/* Activity indicator */}
          <VoiceActivityIndicator
            isActive={isRecording}
            volume={volume}
            className="w-full max-w-xs"
          />

          {/* Timer */}
          <div className="text-center">
            <p className="text-3xl font-bold font-mono text-red-600 dark:text-red-400">
              {formatTime(recordingTime)}
            </p>
            <p className="text-xs text-slate-500 mt-1">{t('maxDuration')}</p>
          </div>

          {/* Silence countdown */}
          {countdown !== null && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
            >
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                {t('silenceDetectedCountdown', { countdown })}
              </p>
              <p className="text-xs text-amber-500 dark:text-amber-500 mt-0.5">
                {t('silenceContinueOrStop')}
              </p>
            </motion.div>
          )}

          {/* Stop button */}
          <Button
            onClick={onStopRecording}
            className="gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg px-8"
          >
            <Square className="h-4 w-4" />
            {t('stop')}
          </Button>
        </>
      )}

      {!isRecording && !isEditMode && (
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-sm text-slate-500">{t('tapToRecord')}</p>
          <div className="text-left space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('exampleUsages')}</p>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• &quot;{t('exampleUsage1')}&quot;</li>
              <li>• &quot;{t('exampleUsage2')}&quot;</li>
              <li>• &quot;{t('exampleUsage3')}&quot;</li>
            </ul>
          </div>
        </div>
      )}

      {!isRecording && isEditMode && (
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-sm text-slate-500">{t('tapToRecordEdit')}</p>
          <div className="text-left space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('exampleEdits')}</p>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• &quot;{t('exampleEdit1')}&quot;</li>
              <li>• &quot;{t('exampleEdit2')}&quot;</li>
              <li>• &quot;{t('exampleEdit3')}&quot;</li>
              <li>• &quot;{t('exampleEdit4')}&quot;</li>
              <li>• &quot;{t('exampleEdit5')}&quot;</li>
              <li>• &quot;{t('exampleEdit6')}&quot;</li>
              <li>• &quot;{t('exampleEdit7')}&quot;</li>
            </ul>
          </div>
        </div>
      )}

      {error && (
        <div className="w-full p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400 text-center">
          {error}
          <Button
            variant="outline"
            size="sm"
            onClick={() => { onClearError(); onStartRecording(); }}
            className="mt-2 mx-auto block"
          >
            {t('retryButton')}
          </Button>
        </div>
      )}
    </motion.div>
  );
}
