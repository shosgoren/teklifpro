'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, X, Loader2, CheckCircle2, MessageCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/presentation/components/ui/button'
import { cn } from '@/shared/utils/cn'
import { VoiceActivityIndicator } from '@/presentation/components/molecules/VoiceActivityIndicator'
import { LiveTranscript } from '@/presentation/components/molecules/LiveTranscript'
import { VoiceProposalPreview } from '@/presentation/components/organisms/VoiceProposalPreview'
import type { VoiceParseResult } from '@/infrastructure/services/voice/types'
import { VOICE_MAX_DURATION_MS } from '@/infrastructure/services/voice/types'
import { Logger } from '@/infrastructure/logger'

const logger = new Logger('VoiceProposalModal')

type Step = 'RECORDING' | 'PROCESSING' | 'PREVIEW' | 'DONE'

interface VoiceProposalModalProps {
  isOpen: boolean
  onClose: () => void
  locale: string
}

export function VoiceProposalModal({ isOpen, onClose, locale }: VoiceProposalModalProps) {
  const [step, setStep] = useState<Step>('RECORDING')
  const [isEditMode, setIsEditMode] = useState(false)
  const [volume, setVolume] = useState(0)
  const [recordingTime, setRecordingTime] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [parseResult, setParseResult] = useState<VoiceParseResult | null>(null)
  const [createdProposalId, setCreatedProposalId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isApproving, setIsApproving] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup everything on close / unmount
  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop() } catch { /* ignore */ }
    }
    mediaRecorderRef.current = null
    streamRef.current = null
    analyserRef.current = null
    timerRef.current = null
    silenceTimerRef.current = null
    animFrameRef.current = null
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('RECORDING')
      setIsEditMode(false)
      setVolume(0)
      setRecordingTime(0)
      setTranscript('')
      setParseResult(null)
      setCreatedProposalId(null)
      setError(null)
      setIsApproving(false)
      setIsRecording(false)
    } else {
      cleanup()
    }
  }, [isOpen, cleanup])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // ── Volume monitoring via AnalyserNode ──
  const startVolumeMonitor = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const tick = () => {
        analyser.getByteFrequencyData(dataArray)
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        // Normalize to 0-100 range
        setVolume(Math.min(100, Math.round((avg / 128) * 100)))
        animFrameRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch (err) {
      logger.warn('Volume monitor init failed', err)
    }
  }, [])

  // ── Start Recording ──
  const startRecording = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        stream.getTracks().forEach(t => t.stop())
        streamRef.current = null

        const blob = new Blob(chunksRef.current, { type: mimeType })
        if (blob.size < 100) {
          setError('Ses kaydedilemedi. Lutfen tekrar deneyin.')
          setStep('RECORDING')
          setIsRecording(false)
          return
        }

        // Convert to base64
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = reader.result as string
          processAudio(base64)
        }
        reader.readAsDataURL(blob)
      }

      recorder.start(100)
      setIsRecording(true)
      setRecordingTime(0)
      setStep('RECORDING')

      // Volume monitoring
      startVolumeMonitor(stream)

      // Timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const next = prev + 1
          if (next >= VOICE_MAX_DURATION_MS / 1000) {
            stopRecording()
          }
          return next
        })
      }, 1000)

      // Basic silence auto-stop: 3s timer (real VAD comes later)
      // Reset on each volume change handled by the component
    } catch (err) {
      logger.error('Mic access failed', err)
      setError('Mikrofon erisimi reddedildi. Tarayici ayarlarindan mikrofon iznini acin.')
    }
  }, [startVolumeMonitor]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stop Recording ──
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    setIsRecording(false)
    setVolume(0)
  }, [])

  // ── Process Audio: Transcribe → Parse ──
  const processAudio = useCallback(async (audioBase64: string) => {
    setStep('PROCESSING')
    setTranscript('')

    try {
      // Step 1: Transcribe
      const transcribeRes = await fetch('/api/v1/proposals/voice-transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioData: audioBase64, language: 'tr' }),
      })
      const transcribeData = await transcribeRes.json()

      if (!transcribeData.success || !transcribeData.data?.text) {
        throw new Error(transcribeData.error || 'Ses tanima basarisiz oldu')
      }

      setTranscript(transcribeData.data.text)

      // Step 2: Parse or Edit
      const endpoint = isEditMode
        ? '/api/v1/proposals/voice-edit'
        : '/api/v1/proposals/voice-parse'

      const body = isEditMode
        ? {
            currentProposal: parseResult,
            editCommand: transcribeData.data.text,
            tenantId: '', // Will be resolved from session on server
          }
        : {
            transcript: transcribeData.data.text,
            tenantId: '', // Will be resolved from session on server
            language: 'tr',
          }

      const parseRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const parseData = await parseRes.json()

      if (!parseData.success || !parseData.data) {
        throw new Error(parseData.error || 'Teklif olusturulamadi')
      }

      const result = isEditMode
        ? (parseData.data as { updatedProposal: VoiceParseResult }).updatedProposal
        : (parseData.data as VoiceParseResult)

      setParseResult(result)
      setStep('PREVIEW')
    } catch (err) {
      logger.error('Process audio failed', err)
      setError(err instanceof Error ? err.message : 'Bir hata olustu. Lutfen tekrar deneyin.')
      setStep('RECORDING')
    }
  }, [isEditMode, parseResult])

  // ── Approve → Create draft proposal ──
  const handleApprove = useCallback(async () => {
    if (!parseResult) return
    setIsApproving(true)
    setError(null)

    try {
      const res = await fetch('/api/v1/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: parseResult.customer.matchedId,
          customerName: parseResult.customer.matchedName || parseResult.customer.query,
          items: parseResult.items.map(item => ({
            productId: item.matchedProductId,
            name: item.matchedProductName || item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice ?? 0,
            unit: item.unit,
            vatRate: item.vatRate,
          })),
          discountRate: parseResult.discountRate,
          paymentTerms: parseResult.paymentTerms,
          deliveryTerms: parseResult.deliveryTerms,
          notes: parseResult.notes,
          voiceTranscript: parseResult.rawTranscript,
          status: 'DRAFT',
        }),
      })

      const data = await res.json()

      if (!data.success || !data.data?.id) {
        throw new Error(data.error?.message || data.error || 'Teklif olusturulamadi')
      }

      setCreatedProposalId(data.data.id)
      setStep('DONE')
    } catch (err) {
      logger.error('Approve failed', err)
      setError(err instanceof Error ? err.message : 'Teklif onaylanamadi')
    } finally {
      setIsApproving(false)
    }
  }, [parseResult])

  // ── Voice Edit: go back to recording in edit mode ──
  const handleVoiceEdit = useCallback(() => {
    setIsEditMode(true)
    setStep('RECORDING')
    setError(null)
  }, [])

  // ── Retry: start fresh ──
  const handleRetry = useCallback(() => {
    setIsEditMode(false)
    setParseResult(null)
    setTranscript('')
    setStep('RECORDING')
    setError(null)
  }, [])

  // ── WhatsApp link ──
  const whatsAppLink = createdProposalId
    ? `https://wa.me/?text=${encodeURIComponent(`Teklifiniz hazir: ${window.location.origin}/${locale}/proposals/${createdProposalId}`)}`
    : '#'

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={cn(
            'relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl',
            'border border-slate-200 dark:border-slate-700',
            'max-h-[90vh] overflow-hidden flex flex-col'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {step === 'DONE' ? 'Teklif Olusturuldu!' : isEditMode ? 'Sesle Duzenle' : 'Sesli Teklif'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {step === 'RECORDING' && (isEditMode ? 'Degisikliginizi soyleyiniz' : 'Teklifinizi soyleyiniz')}
                {step === 'PROCESSING' && 'Isleniyor...'}
                {step === 'PREVIEW' && 'Teklif onizlemesi'}
                {step === 'DONE' && 'Taslak teklif basariyla olusturuldu'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            <AnimatePresence mode="wait">
              {/* ── RECORDING ── */}
              {step === 'RECORDING' && (
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
                      onClick={startRecording}
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
                        <p className="text-xs text-slate-500 mt-1">Maks 2 dakika</p>
                      </div>

                      {/* Stop button */}
                      <Button
                        onClick={stopRecording}
                        className="gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg px-8"
                      >
                        <Square className="h-4 w-4" />
                        Durdur
                      </Button>
                    </>
                  )}

                  {!isRecording && (
                    <p className="text-sm text-slate-500 text-center max-w-xs">
                      {isEditMode
                        ? 'Degisikliginizi soylemek icin mikrofona basin. Ornegin: "Fiyati 500 lira yap"'
                        : 'Teklifinizi soylemek icin mikrofona basin. Ornegin: "Ahmet Beye 10 adet laptop 15.000 liradan teklif hazirla"'
                      }
                    </p>
                  )}

                  {error && (
                    <div className="w-full p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400 text-center">
                      {error}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setError(null); startRecording() }}
                        className="mt-2 mx-auto block"
                      >
                        Tekrar Dene
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── PROCESSING ── */}
              {step === 'PROCESSING' && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex flex-col items-center gap-6 py-8"
                >
                  <div className="relative">
                    <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                  </div>

                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {transcript ? 'Teklif hazirlaniyor...' : 'Ses taniniyor...'}
                    </p>
                  </div>

                  {transcript && (
                    <LiveTranscript
                      text={transcript}
                      isProcessing={!parseResult}
                      className="w-full"
                    />
                  )}
                </motion.div>
              )}

              {/* ── PREVIEW ── */}
              {step === 'PREVIEW' && parseResult && (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <VoiceProposalPreview
                    data={parseResult}
                    onEdit={() => {
                      // Navigate to manual edit page
                      window.location.href = `/${locale}/proposals/new?voiceData=${encodeURIComponent(JSON.stringify(parseResult))}`
                    }}
                    onVoiceEdit={handleVoiceEdit}
                    onApprove={handleApprove}
                    onRetry={handleRetry}
                    isLoading={isApproving}
                  />
                </motion.div>
              )}

              {/* ── DONE ── */}
              {step === 'DONE' && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center gap-6 py-8"
                >
                  {/* Success animation */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.1 }}
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-xl shadow-emerald-500/30"
                  >
                    <CheckCircle2 className="h-10 w-10 text-white" />
                  </motion.div>

                  <div className="text-center">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Teklif Olusturuldu!
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Taslak teklifiniz basariyla kaydedildi.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 w-full max-w-xs">
                    {/* View proposal */}
                    <Button
                      onClick={() => {
                        window.location.href = `/${locale}/proposals/${createdProposalId}`
                      }}
                      className="gap-2 w-full"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Teklifi Goruntule
                    </Button>

                    {/* WhatsApp */}
                    <Button
                      variant="outline"
                      asChild
                      className="gap-2 w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                    >
                      <a href={whatsAppLink} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp&apos;tan Gonder
                      </a>
                    </Button>

                    {/* Create another */}
                    <Button
                      variant="ghost"
                      onClick={handleRetry}
                      className="text-slate-500"
                    >
                      Yeni Sesli Teklif
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
