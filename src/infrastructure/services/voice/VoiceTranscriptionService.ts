import OpenAI from 'openai';
import { Logger } from '@/infrastructure/logger';
import {
  TranscriptionResult,
  VOICE_PROPOSAL_LIMITS,
  VOICE_MAX_DURATION_MS,
} from './types';

const logger = new Logger('VoiceTranscriptionService');

// ============================================================================
// RATE LIMITING
// ============================================================================

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();

function isRateLimited(
  tenantId: string,
  plan: keyof typeof VOICE_PROPOSAL_LIMITS,
): boolean {
  const now = Date.now();
  const key = `voice:${tenantId}`;
  const bucket = rateBuckets.get(key);

  // Reset daily
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + oneDayMs });
    return false;
  }

  if (bucket.count >= VOICE_PROPOSAL_LIMITS[plan]) {
    logger.warn(`Rate limit reached for tenant ${tenantId} on plan ${plan}`, {
      count: bucket.count,
      limit: VOICE_PROPOSAL_LIMITS[plan],
    });
    return true;
  }

  bucket.count++;
  return false;
}

// ============================================================================
// VOICE TRANSCRIPTION SERVICE
// ============================================================================

class VoiceTranscriptionService {
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Ses verisini Whisper API ile metne dönüştür
   *
   * @param audioBase64 - Base64 encoded audio data (with or without data URL prefix)
   * @param language - BCP-47 language code (default: 'tr')
   * @returns TranscriptionResult with text, language, duration, confidence
   */
  async transcribe(
    audioBase64: string,
    language?: string,
  ): Promise<TranscriptionResult> {
    try {
      logger.info('Starting transcription', { language: language || 'tr' });

      // Strip data URL prefix if present (e.g. "data:audio/webm;base64,...")
      const base64Data = audioBase64.includes(',')
        ? audioBase64.split(',')[1]
        : audioBase64;

      // Detect MIME type from data URL or default to webm
      let mimeType = 'audio/webm';
      let extension = 'webm';
      const dataUrlMatch = audioBase64.match(
        /^data:(audio\/[a-zA-Z0-9.+-]+);base64,/,
      );
      if (dataUrlMatch) {
        mimeType = dataUrlMatch[1];
        const extMap: Record<string, string> = {
          'audio/webm': 'webm',
          'audio/mp4': 'mp4',
          'audio/mpeg': 'mp3',
          'audio/wav': 'wav',
          'audio/ogg': 'ogg',
          'audio/flac': 'flac',
        };
        extension = extMap[mimeType] || 'webm';
      }

      // Convert base64 to Buffer then to File object for OpenAI SDK
      const buffer = Buffer.from(base64Data, 'base64');

      // Validate audio size - rough duration estimate (assume ~16kbps minimum)
      const estimatedDurationMs = (buffer.length / 2000) * 1000;
      if (estimatedDurationMs > VOICE_MAX_DURATION_MS * 1.5) {
        throw new Error(
          `Audio too long: estimated ${Math.round(estimatedDurationMs / 1000)}s exceeds limit`,
        );
      }

      const file = new File([buffer], `recording.${extension}`, {
        type: mimeType,
      });

      // Call Whisper API with verbose_json for detailed response
      const response = await this.client.audio.transcriptions.create({
        model: 'whisper-1',
        file,
        language: language || 'tr',
        response_format: 'verbose_json',
      });

      // verbose_json returns additional fields
      const verboseResponse = response as unknown as {
        text: string;
        language: string;
        duration: number;
        segments?: Array<{
          avg_logprob: number;
          no_speech_prob: number;
        }>;
      };

      // Calculate confidence from segment log probabilities
      let confidence = 0.85; // default reasonable confidence
      if (
        verboseResponse.segments &&
        verboseResponse.segments.length > 0
      ) {
        const avgLogProb =
          verboseResponse.segments.reduce(
            (sum, seg) => sum + seg.avg_logprob,
            0,
          ) / verboseResponse.segments.length;
        // Convert log probability to 0-1 confidence scale
        // avg_logprob typically ranges from -1 (low) to 0 (high)
        confidence = Math.max(0, Math.min(1, 1 + avgLogProb));
      }

      const result: TranscriptionResult = {
        text: verboseResponse.text || '',
        language: verboseResponse.language || language || 'tr',
        duration: verboseResponse.duration || 0,
        confidence,
      };

      logger.info('Transcription completed', {
        textLength: result.text.length,
        duration: result.duration,
        confidence: result.confidence,
      });

      return result;
    } catch (error) {
      logger.error('Transcription failed', error);
      throw error;
    }
  }

  /**
   * Rate limit kontrolü yap
   */
  checkRateLimit(
    tenantId: string,
    plan: keyof typeof VOICE_PROPOSAL_LIMITS = 'STARTER',
  ): boolean {
    return !isRateLimited(tenantId, plan);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const voiceTranscriptionService = new VoiceTranscriptionService();

export default voiceTranscriptionService;
export { VoiceTranscriptionService };
