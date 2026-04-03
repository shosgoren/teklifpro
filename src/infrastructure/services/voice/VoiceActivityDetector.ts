import type { VADOptions } from './types'

/**
 * Client-side Voice Activity Detector using Web Audio API.
 * Each modal instance should create its own VoiceActivityDetector.
 */
export class VoiceActivityDetector {
  private options: Required<Pick<VADOptions, 'silenceThreshold' | 'silenceDuration' | 'maxDuration' | 'countdownDuration'>> & VADOptions
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private animFrameId: number | null = null
  private active = false

  // Silence tracking
  private silenceStartTime: number | null = null
  private isSilent = false
  private countdownInterval: ReturnType<typeof setInterval> | null = null

  // Max duration tracking
  private startTime = 0
  private maxDurationTimer: ReturnType<typeof setTimeout> | null = null

  constructor(options: VADOptions) {
    this.options = {
      ...options,
      silenceThreshold: options.silenceThreshold ?? -45,
      silenceDuration: options.silenceDuration ?? 3000,
      maxDuration: options.maxDuration ?? 120000,
      countdownDuration: options.countdownDuration ?? 3000,
    }
  }

  start(stream: MediaStream): void {
    if (this.active) return
    this.active = true
    this.startTime = Date.now()

    try {
      this.audioContext = new AudioContext()
      const source = this.audioContext.createMediaStreamSource(stream)
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 256
      source.connect(this.analyser)

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount)
      this.silenceStartTime = null
      this.isSilent = false

      const tick = () => {
        if (!this.active || !this.analyser) return

        this.analyser.getByteFrequencyData(dataArray)

        // Calculate RMS volume
        let sumSquares = 0
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = dataArray[i] / 255
          sumSquares += normalized * normalized
        }
        const rms = Math.sqrt(sumSquares / dataArray.length)

        // Convert to dB scale (avoid log(0))
        const db = rms > 0 ? 20 * Math.log10(rms) : -100

        // Normalized volume 0-100
        // Map from [-100, 0] dB to [0, 100]
        const normalizedVolume = Math.max(0, Math.min(100, Math.round((db + 100) * (100 / 100))))
        this.options.onVolumeChange?.(normalizedVolume)

        const now = Date.now()

        if (db < this.options.silenceThreshold) {
          // Below threshold = silence
          if (!this.isSilent) {
            this.isSilent = true
            this.silenceStartTime = now
            this.options.onSilenceStart?.()
            this.startCountdown()
          }
        } else {
          // Above threshold = voice activity
          if (this.isSilent) {
            this.isSilent = false
            this.silenceStartTime = null
            this.options.onSilenceEnd?.()
            this.stopCountdown()
          }
        }

        this.animFrameId = requestAnimationFrame(tick)
      }

      tick()

      // Max duration timer
      this.maxDurationTimer = setTimeout(() => {
        if (this.active) {
          this.options.onAutoStop?.()
        }
      }, this.options.maxDuration)
    } catch {
      this.active = false
    }
  }

  stop(): void {
    this.active = false

    if (this.animFrameId != null) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = null
    }

    this.stopCountdown()

    if (this.maxDurationTimer != null) {
      clearTimeout(this.maxDurationTimer)
      this.maxDurationTimer = null
    }

    if (this.audioContext) {
      try {
        this.audioContext.close()
      } catch {
        // ignore
      }
      this.audioContext = null
    }

    this.analyser = null
    this.isSilent = false
    this.silenceStartTime = null
  }

  isActive(): boolean {
    return this.active
  }

  private startCountdown(): void {
    this.stopCountdown()

    const countdownSeconds = Math.ceil(this.options.countdownDuration / 1000)
    let remaining = countdownSeconds

    this.options.onCountdownTick?.(remaining)

    this.countdownInterval = setInterval(() => {
      remaining -= 1
      if (remaining <= 0) {
        this.stopCountdown()
        if (this.active) {
          this.options.onAutoStop?.()
        }
      } else {
        this.options.onCountdownTick?.(remaining)
      }
    }, 1000)
  }

  private stopCountdown(): void {
    if (this.countdownInterval != null) {
      clearInterval(this.countdownInterval)
      this.countdownInterval = null
    }
  }
}
