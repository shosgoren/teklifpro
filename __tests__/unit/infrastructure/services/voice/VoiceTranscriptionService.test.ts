import { VoiceTranscriptionService } from '@/infrastructure/services/voice/VoiceTranscriptionService';
import { VOICE_PROPOSAL_LIMITS } from '@/infrastructure/services/voice/types';

// OpenAI mock
const mockCreate = jest.fn();
jest.mock('openai', () =>
  jest.fn().mockImplementation(() => ({
    audio: {
      transcriptions: {
        create: mockCreate,
      },
    },
  })),
);

// Logger mock
jest.mock('@/infrastructure/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('VoiceTranscriptionService', () => {
  let service: VoiceTranscriptionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VoiceTranscriptionService('test-api-key');
  });

  // ── transcribe ──
  describe('transcribe', () => {
    it('Base64 veriyi File objesine donusturur ve Whisper API cagrisini yapar', async () => {
      const fakeAudio = Buffer.from('fake-audio-data').toString('base64');
      const dataUrl = `data:audio/webm;base64,${fakeAudio}`;

      mockCreate.mockResolvedValueOnce({
        text: 'test transkripsiyon',
        language: 'tr',
        duration: 5.2,
        segments: [{ avg_logprob: -0.3, no_speech_prob: 0.01 }],
      });

      await service.transcribe(dataUrl, 'tr');

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.model).toBe('whisper-1');
      expect(callArgs.language).toBe('tr');
      expect(callArgs.response_format).toBe('verbose_json');
      expect(callArgs.file).toBeInstanceOf(File);
    });

    it('TranscriptionResult dondurmeli (text, language, duration)', async () => {
      const fakeAudio = Buffer.from('fake-audio').toString('base64');

      mockCreate.mockResolvedValueOnce({
        text: 'ABC Firmasina yuz adet M8 civata',
        language: 'tr',
        duration: 8.5,
        segments: [
          { avg_logprob: -0.2, no_speech_prob: 0.02 },
          { avg_logprob: -0.15, no_speech_prob: 0.01 },
        ],
      });

      const result = await service.transcribe(fakeAudio, 'tr');

      expect(result).toEqual(
        expect.objectContaining({
          text: 'ABC Firmasina yuz adet M8 civata',
          language: 'tr',
          duration: 8.5,
        }),
      );
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('API hatasi durumunda hatayi firlatmali', async () => {
      const fakeAudio = Buffer.from('fake-audio').toString('base64');
      const apiError = new Error('OpenAI API rate limit exceeded');

      mockCreate.mockRejectedValueOnce(apiError);

      await expect(service.transcribe(fakeAudio, 'tr')).rejects.toThrow(
        'OpenAI API rate limit exceeded',
      );
    });

    it('data:audio olmayan data URL icin MIME type webm olarak varsayilmali', async () => {
      // Base64 without data URL prefix => defaults to audio/webm
      const rawBase64 = Buffer.from('raw-audio-bytes').toString('base64');

      mockCreate.mockResolvedValueOnce({
        text: 'test',
        language: 'tr',
        duration: 1.0,
        segments: [],
      });

      const result = await service.transcribe(rawBase64, 'tr');

      expect(result.text).toBe('test');
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.file.name).toBe('recording.webm');
    });
  });

  // ── checkRateLimit ──
  describe('checkRateLimit', () => {
    it('Limit icindeyken izin vermeli (true donmeli)', () => {
      const tenantId = `tenant-allow-${Date.now()}`;
      const allowed = service.checkRateLimit(tenantId, 'STARTER');
      expect(allowed).toBe(true);
    });

    it('Limit asildiginda engellemeli (false donmeli)', () => {
      const tenantId = `tenant-block-${Date.now()}`;
      const limit = VOICE_PROPOSAL_LIMITS.STARTER; // 20

      // Limiti doldur
      for (let i = 0; i < limit; i++) {
        service.checkRateLimit(tenantId, 'STARTER');
      }

      // Limit asildi, artik false donmeli
      const blocked = service.checkRateLimit(tenantId, 'STARTER');
      expect(blocked).toBe(false);
    });

    it('Gunluk sifirlama sonrasi yeniden izin vermeli', () => {
      const tenantId = `tenant-reset-${Date.now()}`;
      const limit = VOICE_PROPOSAL_LIMITS.STARTER;

      // Limiti doldur
      for (let i = 0; i < limit; i++) {
        service.checkRateLimit(tenantId, 'STARTER');
      }

      // Limit doldu
      expect(service.checkRateLimit(tenantId, 'STARTER')).toBe(false);

      // Zamani ileri sar (1 gun + 1ms)
      const oneDayMs = 24 * 60 * 60 * 1000;
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + oneDayMs + 1);

      // Sifirlandi, tekrar izin vermeli
      const allowed = service.checkRateLimit(tenantId, 'STARTER');
      expect(allowed).toBe(true);

      jest.restoreAllMocks();
    });
  });
});
