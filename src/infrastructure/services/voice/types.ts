/**
 * Shared types for Voice Proposal feature
 */

// ── Transcription ──

export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  confidence: number;
}

// ── Parsing ──

export interface ParsedCustomer {
  query: string;
  matchedId: string | null;
  matchedName: string | null;
  confidence: number;
  isNewCustomer: boolean;
}

export interface ParsedItem {
  name: string;
  matchedProductId: string | null;
  matchedProductName: string | null;
  quantity: number;
  unitPrice: number | null;
  unit: string;
  vatRate: number;
  confidence: number;
}

export interface VoiceParseResult {
  customer: ParsedCustomer;
  items: ParsedItem[];
  discountRate: number;
  paymentTerms: string | null;
  deliveryTerms: string | null;
  notes: string | null;
  overallConfidence: number;
  rawTranscript: string;
}

// ── Edit ──

export interface VoiceEditResult {
  updatedProposal: VoiceParseResult;
  changes: VoiceEditChange[];
}

export interface VoiceEditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  description: string;
}

// ── Voice Activity Detection ──

export interface VADOptions {
  silenceThreshold: number;     // dB level below which is "silence" (default: -45)
  silenceDuration: number;      // ms of silence before auto-stop (default: 3000)
  maxDuration: number;          // max recording duration ms (default: 120000)
  countdownDuration: number;    // countdown before auto-stop ms (default: 3000)
  onSilenceStart?: () => void;
  onSilenceEnd?: () => void;
  onCountdownTick?: (secondsLeft: number) => void;
  onAutoStop?: () => void;
  onVolumeChange?: (volume: number) => void;
}

// ── API Request/Response ──

export interface VoiceTranscribeRequest {
  audioData: string;  // base64 audio
  language?: string;  // default: 'tr'
}

export interface VoiceTranscribeResponse {
  success: boolean;
  data?: TranscriptionResult;
  error?: string;
}

export interface VoiceParseRequest {
  transcript: string;
  tenantId: string;
  language?: string;
}

export interface VoiceParseResponse {
  success: boolean;
  data?: VoiceParseResult;
  error?: string;
}

export interface VoiceEditRequest {
  currentProposal: VoiceParseResult;
  editCommand: string;
  tenantId: string;
}

export interface VoiceEditResponse {
  success: boolean;
  data?: VoiceEditResult;
  error?: string;
}

// ── Beta Limits ──

export const VOICE_PROPOSAL_LIMITS = {
  STARTER: 20,        // günlük sesli teklif limiti
  PROFESSIONAL: 50,
  ENTERPRISE: 999,
} as const;

export const VOICE_MAX_DURATION_MS = 120_000;  // 2 dakika
export const VOICE_SILENCE_THRESHOLD_DB = -45;
export const VOICE_SILENCE_DURATION_MS = 3_000;
export const VOICE_COUNTDOWN_MS = 3_000;
