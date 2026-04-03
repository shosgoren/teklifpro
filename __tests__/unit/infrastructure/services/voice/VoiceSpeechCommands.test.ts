import { VoiceSpeechCommands } from '@/infrastructure/services/voice/VoiceSpeechCommands'

// ── Mock SpeechRecognition ──

type ResultCallback = (event: { results: { length: number; [index: number]: { 0: { transcript: string } } } }) => void

let mockRecognitionInstance: {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: jest.Mock
  stop: jest.Mock
  abort: jest.Mock
  onresult: ResultCallback | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}

const MockSpeechRecognition = jest.fn(() => {
  mockRecognitionInstance = {
    lang: '',
    continuous: false,
    interimResults: false,
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
    onresult: null,
    onerror: null,
    onend: null,
  }
  return mockRecognitionInstance
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).window = {
  ...(globalThis as any).window,
  webkitSpeechRecognition: MockSpeechRecognition,
}

// Helper to simulate a recognized phrase
function simulateRecognition(transcript: string) {
  if (!mockRecognitionInstance?.onresult) throw new Error('No onresult handler')
  mockRecognitionInstance.onresult({
    results: {
      length: 1,
      0: { 0: { transcript } },
    },
  })
}

// ── Tests ──

describe('VoiceSpeechCommands', () => {
  let vsc: VoiceSpeechCommands
  let onCommand: jest.Mock

  beforeEach(() => {
    vsc = new VoiceSpeechCommands()
    onCommand = jest.fn()
    jest.clearAllMocks()
  })

  afterEach(() => {
    vsc.stopListening()
  })

  describe('isSupported', () => {
    it('returns true when webkitSpeechRecognition exists', () => {
      expect(vsc.isSupported()).toBe(true)
    })
  })

  describe('startListening', () => {
    it('starts recognition in Turkish', () => {
      vsc.startListening(onCommand)

      expect(mockRecognitionInstance.lang).toBe('tr-TR')
      expect(mockRecognitionInstance.continuous).toBe(true)
      expect(mockRecognitionInstance.start).toHaveBeenCalled()
    })
  })

  describe('command mapping', () => {
    beforeEach(() => {
      vsc.startListening(onCommand)
    })

    it.each([
      ['onayla', 'approve'],
      ['evet', 'approve'],
      ['tamam', 'approve'],
    ])('maps "%s" to "approve"', (word, expected) => {
      simulateRecognition(word)
      expect(onCommand).toHaveBeenCalledWith(expected)
    })

    it.each([
      ['iptal', 'cancel'],
      ['vazgeç', 'cancel'],
      ['hayır', 'cancel'],
    ])('maps "%s" to "cancel"', (word, expected) => {
      simulateRecognition(word)
      expect(onCommand).toHaveBeenCalledWith(expected)
    })

    it.each([
      ['gönder', 'send'],
      ['yolla', 'send'],
    ])('maps "%s" to "send"', (word, expected) => {
      simulateRecognition(word)
      expect(onCommand).toHaveBeenCalledWith(expected)
    })

    it.each([
      ['düzenle', 'edit'],
      ['değiştir', 'edit'],
    ])('maps "%s" to "edit"', (word, expected) => {
      simulateRecognition(word)
      expect(onCommand).toHaveBeenCalledWith(expected)
    })

    it.each([
      ['geri al', 'undo'],
      ['geri', 'undo'],
    ])('maps "%s" to "undo"', (word, expected) => {
      simulateRecognition(word)
      expect(onCommand).toHaveBeenCalledWith(expected)
    })
  })

  describe('stopListening', () => {
    it('calls recognition.stop()', () => {
      vsc.startListening(onCommand)
      vsc.stopListening()

      expect(mockRecognitionInstance.stop).toHaveBeenCalled()
    })
  })
})
