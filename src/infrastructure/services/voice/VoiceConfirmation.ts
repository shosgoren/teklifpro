/**
 * VoiceConfirmation - Client-side TTS using Web Speech API
 *
 * Reads proposal confirmation text aloud in Turkish,
 * allowing hands-free approval flow.
 */

export class VoiceConfirmation {
  /**
   * Check if the Web Speech API speechSynthesis is available.
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
  }

  /**
   * Speak the given text using Web Speech API.
   * Selects a Turkish voice when available; falls back to the default voice.
   */
  speak(text: string, locale = 'tr-TR'): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error('speechSynthesis is not supported in this browser'))
        return
      }

      // Cancel any ongoing speech first
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = locale
      utterance.rate = 0.9
      utterance.pitch = 1.0

      // Try to find a matching voice for the requested locale
      const voices = window.speechSynthesis.getVoices()
      const matchingVoice = voices.find((v) => v.lang.startsWith(locale.split('-')[0]))
      if (matchingVoice) {
        utterance.voice = matchingVoice
      }

      utterance.onend = () => resolve()
      utterance.onerror = (event) => {
        // 'canceled' is not a real error — happens when stop() is called
        if (event.error === 'canceled') {
          resolve()
          return
        }
        reject(new Error(`Speech synthesis error: ${event.error}`))
      }

      window.speechSynthesis.speak(utterance)
    })
  }

  /**
   * Build and speak a Turkish confirmation sentence for a proposal draft.
   */
  async speakProposalConfirmation(
    customerName: string,
    total: number,
    currency = 'TL',
  ): Promise<void> {
    const text = `Teklif hazır. ${customerName} için ${total} ${currency} tutarında taslak oluşturuldu. Onaylıyor musunuz?`
    return this.speak(text)
  }

  /**
   * Cancel any ongoing speech immediately.
   */
  stop(): void {
    if (this.isSupported()) {
      window.speechSynthesis.cancel()
    }
  }
}
