/**
 * @jest-environment jsdom
 */

import { VoiceConfirmation } from '@/infrastructure/services/voice/VoiceConfirmation'

// ── Mocks ──

interface MockUtterance {
  text: string
  lang: string
  rate: number
  pitch: number
  voice: any
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}

let lastUtterance: MockUtterance

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(window as any).SpeechSynthesisUtterance = class {
  text: string
  lang = ''
  rate = 1
  pitch = 1
  voice: any = null
  onend: (() => void) | null = null
  onerror: ((e: { error: string }) => void) | null = null

  constructor(text: string) {
    this.text = text
    lastUtterance = this
  }
}

const mockSpeechSynthesis = {
  speak: jest.fn((utterance: MockUtterance) => {
    // Auto-resolve by calling onend
    setTimeout(() => utterance.onend?.(), 0)
  }),
  cancel: jest.fn(),
  getVoices: jest.fn(() => [
    { lang: 'tr-TR', name: 'Turkish' },
    { lang: 'en-US', name: 'English' },
  ]),
}

Object.defineProperty(window, 'speechSynthesis', {
  value: mockSpeechSynthesis,
  writable: true,
  configurable: true,
})

// ── Tests ──

describe('VoiceConfirmation', () => {
  let vc: VoiceConfirmation

  beforeEach(() => {
    vc = new VoiceConfirmation()
    jest.clearAllMocks()
  })

  describe('isSupported', () => {
    it('returns true when speechSynthesis exists on window', () => {
      expect(vc.isSupported()).toBe(true)
    })

    it('returns false when speechSynthesis does not exist', () => {
      const original = (window as any).speechSynthesis
      delete (window as any).speechSynthesis
      expect(vc.isSupported()).toBe(false)
      ;(window as any).speechSynthesis = original
    })
  })

  describe('speak', () => {
    it('creates SpeechSynthesisUtterance with correct text and locale', async () => {
      const promise = vc.speak('Merhaba', 'tr-TR')
      await promise

      expect(lastUtterance.text).toBe('Merhaba')
      expect(lastUtterance.lang).toBe('tr-TR')
      expect(lastUtterance.rate).toBe(0.9)
      expect(lastUtterance.pitch).toBe(1.0)
    })

    it('selects a Turkish voice when available', async () => {
      await vc.speak('Test', 'tr-TR')

      expect(lastUtterance.voice).toEqual(
        expect.objectContaining({ lang: 'tr-TR' }),
      )
    })

    it('calls speechSynthesis.speak', async () => {
      await vc.speak('Test')

      expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(1)
    })
  })

  describe('speakProposalConfirmation', () => {
    it('builds the correct Turkish confirmation text', async () => {
      await vc.speakProposalConfirmation('Ahmet Bey', 15000, 'TL')

      expect(lastUtterance.text).toBe(
        'Teklif hazır. Ahmet Bey için 15000 TL tutarında taslak oluşturuldu. Onaylıyor musunuz?',
      )
    })

    it('defaults currency to TL', async () => {
      await vc.speakProposalConfirmation('Mehmet Bey', 5000)

      expect(lastUtterance.text).toContain('5000 TL')
    })
  })

  describe('stop', () => {
    it('calls speechSynthesis.cancel()', () => {
      vc.stop()

      expect(mockSpeechSynthesis.cancel).toHaveBeenCalledTimes(1)
    })
  })
})
