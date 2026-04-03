/**
 * VoiceSpeechCommands - Client-side speech recognition for simple voice commands
 *
 * Listens for Turkish command words ("onayla", "iptal", "gönder", etc.)
 * and maps them to action strings the UI can handle.
 */

// Web Speech API types (not all browsers expose these globally)
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

/** Mapping from Turkish trigger words to normalized command strings */
const COMMAND_MAP: Record<string, string> = {
  // approve
  onayla: 'approve',
  onay: 'approve',
  evet: 'approve',
  tamam: 'approve',
  // cancel
  iptal: 'cancel',
  'vazgeç': 'cancel',
  'hayır': 'cancel',
  // send
  'gönder': 'send',
  yolla: 'send',
  // edit
  'düzenle': 'edit',
  'değiştir': 'edit',
  // undo
  'geri al': 'undo',
  geri: 'undo',
}

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export class VoiceSpeechCommands {
  private recognition: SpeechRecognitionInstance | null = null
  private listening = false

  /**
   * Check whether the Web Speech Recognition API is available.
   */
  isSupported(): boolean {
    return getSpeechRecognitionCtor() !== null
  }

  /**
   * Start continuous speech recognition in Turkish.
   * Recognised words are matched against the command map and the
   * callback is invoked with the normalised command string.
   */
  startListening(onCommand: (command: string) => void): void {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return

    // If already listening, stop first
    this.stopListening()

    const recognition = new Ctor()
    recognition.lang = 'tr-TR'
    recognition.continuous = true
    recognition.interimResults = false

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const lastResult = event.results[event.results.length - 1]
      if (!lastResult?.[0]) return

      const transcript = lastResult[0].transcript.trim().toLowerCase()

      // Check multi-word commands first (e.g. "geri al")
      for (const [trigger, command] of Object.entries(COMMAND_MAP)) {
        if (transcript.includes(trigger)) {
          onCommand(command)
          return
        }
      }
    }

    recognition.onerror = (event) => {
      // 'no-speech' is common and not a real failure
      if (event.error === 'no-speech') return
      // 'aborted' happens on intentional stop
      if (event.error === 'aborted') return
    }

    // Auto-restart on unexpected end while still "listening"
    recognition.onend = () => {
      if (this.listening && this.recognition) {
        try {
          this.recognition.start()
        } catch {
          // Ignore — may fail if the page is unloading
        }
      }
    }

    this.recognition = recognition
    this.listening = true
    recognition.start()
  }

  /**
   * Stop listening and release the recognition instance.
   */
  stopListening(): void {
    this.listening = false
    if (this.recognition) {
      try {
        this.recognition.stop()
      } catch {
        // Ignore
      }
      this.recognition = null
    }
  }
}
