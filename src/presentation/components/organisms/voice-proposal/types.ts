import type { VoiceParseResult, VoiceEditChange } from '@/infrastructure/services/voice/types';

export type Step = 'RECORDING' | 'PROCESSING' | 'PREVIEW' | 'DONE';

export interface VoiceProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale: string;
}

export interface RecordingStepProps {
  isRecording: boolean;
  volume: number;
  recordingTime: number;
  countdown: number | null;
  isEditMode: boolean;
  error: string | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onClearError: () => void;
  t: (key: string, values?: Record<string, any>) => string;
}

export interface ProcessingStepProps {
  transcript: string;
  parseResult: VoiceParseResult | null;
  t: (key: string) => string;
}

export interface PreviewStepProps {
  parseResult: VoiceParseResult;
  isApproving: boolean;
  isListeningCommands: boolean;
  editHistory: VoiceParseResult[];
  editChanges: VoiceEditChange[][];
  historyIndex: number;
  locale: string;
  onEdit: () => void;
  onVoiceEdit: () => void;
  onApprove: () => void;
  onRetry: () => void;
  onHistoryChange: (index: number) => void;
  t: (key: string) => string;
}

export interface DoneStepProps {
  createdProposalId: string | null;
  isSendingWhatsApp: boolean;
  whatsAppSent: boolean;
  locale: string;
  onWhatsAppSend: () => void;
  onRetry: () => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}
