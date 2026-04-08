'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { OfflineIndicator } from '@/presentation/components/molecules/OfflineIndicator'
import { VoiceActivityDetector } from '@/infrastructure/services/voice/VoiceActivityDetector'
import { VoiceConfirmation } from '@/infrastructure/services/voice/VoiceConfirmation'
import { VoiceSpeechCommands } from '@/infrastructure/services/voice/VoiceSpeechCommands'
import { OfflineQueueService } from '@/infrastructure/services/voice/OfflineQueueService'
import type { VoiceParseResult, VoiceEditChange } from '@/infrastructure/services/voice/types'
import { VOICE_MAX_DURATION_MS } from '@/infrastructure/services/voice/types'
import { Logger } from '@/infrastructure/logger'
import type { Step, VoiceProposalModalProps } from './voice-proposal/types'
import { RecordingStep } from './voice-proposal/RecordingStep'
import { ProcessingStep } from './voice-proposal/ProcessingStep'
import { PreviewStep } from './voice-proposal/PreviewStep'
import { DoneStep } from './voice-proposal/DoneStep'

const logger = new Logger('VoiceProposalModal')

export function VoiceProposalModal({ isOpen, onClose, locale }: VoiceProposalModalProps) {
  const t = useTranslations('voiceProposal')
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
  const [countdown, setCountdown] = useState<number | null>(null)
  const [editHistory, setEditHistory] = useState<VoiceParseResult[]>([])
  const [editChanges, setEditChanges] = useState<VoiceEditChange[][]>([])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false)
  const [whatsAppSent, setWhatsAppSent] = useState(false)
  const [isListeningCommands, setIsListeningCommands] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [isQueueProcessing, setIsQueueProcessing] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const vadRef = useRef<VoiceActivityDetector | null>(null)
  const voiceConfirmationRef = useRef<VoiceConfirmation | null>(null)
  const speechCommandsRef = useRef<VoiceSpeechCommands | null>(null)
  const offlineQueueRef = useRef<OfflineQueueService | null>(null)

  // Cleanup everything on close / unmount
  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (vadRef.current) vadRef.current.stop()
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop() } catch { /* ignore */ }
    }
    if (voiceConfirmationRef.current) {
      voiceConfirmationRef.current.stop()
      voiceConfirmationRef.current = null
    }
    if (speechCommandsRef.current) {
      speechCommandsRef.current.stopListening()
      speechCommandsRef.current = null
    }
    mediaRecorderRef.current = null
    streamRef.current = null
    vadRef.current = null
    timerRef.current = null
    setIsListeningCommands(false)
    if (offlineQueueRef.current) {
      offlineQueueRef.current.stopAutoSync()
      offlineQueueRef.current = null
    }
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  // Online/offline event listeners
  useEffect(() => {
    setIsOffline(!navigator.onLine)

    const handleOnline = async () => {
      setIsOffline(false)
      // Auto-process queue when coming back online
      if (offlineQueueRef.current) {
        const count = await offlineQueueRef.current.getPendingCount()
        if (count > 0) {
          setIsQueueProcessing(true)
          try {
            await offlineQueueRef.current.processQueue()
            setPendingCount(0)
          } catch {
            // Silently handle
          } finally {
            setIsQueueProcessing(false)
            const remaining = await offlineQueueRef.current!.getPendingCount()
            setPendingCount(remaining)
          }
        }
      }
    }

    const handleOffline = () => {
      setIsOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

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
      setCountdown(null)
      setEditHistory([])
      setEditChanges([])
      setHistoryIndex(0)
      setIsSendingWhatsApp(false)
      setWhatsAppSent(false)
      setIsListeningCommands(false)

      // Initialize OfflineQueueService
      const queue = new OfflineQueueService()
      offlineQueueRef.current = queue
      queue.init().then(async () => {
        queue.startAutoSync()
        const count = await queue.getPendingCount()
        setPendingCount(count)
      }).catch(() => {
        setError(t('errorOfflineStorage'))
      })
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

  // ── Start Recording ──
  const startRecording = useCallback(async () => {
    setError(null)
    setCountdown(null)
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
        if (vadRef.current) { vadRef.current.stop(); vadRef.current = null }
        stream.getTracks().forEach(t => t.stop())
        streamRef.current = null

        const blob = new Blob(chunksRef.current, { type: mimeType })
        if (blob.size < 100) {
          setError(t('errorNoAudio'))
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

      // Voice Activity Detection
      const vad = new VoiceActivityDetector({
        silenceThreshold: -45,
        silenceDuration: 3000,
        maxDuration: VOICE_MAX_DURATION_MS,
        countdownDuration: 3000,
        onVolumeChange: (vol) => setVolume(vol),
        onSilenceStart: () => setCountdown(3),
        onSilenceEnd: () => setCountdown(null),
        onCountdownTick: (sec) => setCountdown(sec),
        onAutoStop: () => stopRecording(),
      })
      vad.start(stream)
      vadRef.current = vad

      // Timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (err) {
      logger.error('Mic access failed', err)
      setError(t('errorMicPermission'))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stop Recording ──
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (vadRef.current) {
      vadRef.current.stop()
      vadRef.current = null
    }
    setIsRecording(false)
    setVolume(0)
    setCountdown(null)
  }, [])

  // ── Process Audio: Transcribe -> Parse ──
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
        throw new Error(transcribeData.error || t('errorSpeechRecognition'))
      }

      setTranscript(transcribeData.data.text)

      // Validate transcript has enough content
      const wordCount = transcribeData.data.text.trim().split(/\s+/).length
      if (wordCount < 3) {
        setError(t('errorNotEnoughInfo'))
        setStep('RECORDING')
        return
      }

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
        throw new Error(parseData.error || t('errorProposalCreate'))
      }

      if (isEditMode) {
        const editData = parseData.data as { updatedProposal: VoiceParseResult; changes: VoiceEditChange[] }
        const result = editData.updatedProposal
        const changes = editData.changes ?? []

        // Push to history (truncate any redo entries beyond current index)
        setEditHistory(prev => {
          const truncated = prev.slice(0, historyIndex + 1)
          return [...truncated, result]
        })
        setEditChanges(prev => {
          const truncated = prev.slice(0, historyIndex + 1)
          return [...truncated, changes]
        })
        setHistoryIndex(prev => prev + 1)
        setParseResult(result)
      } else {
        const result = parseData.data as VoiceParseResult
        if (result.items.length === 0) {
          setError(t('errorNoProduct'))
          setStep('RECORDING')
          return
        }
        // Initialize history with the first parse result
        setEditHistory([result])
        setEditChanges([[]])
        setHistoryIndex(0)
        setParseResult(result)
      }

      setStep('PREVIEW')
    } catch (err) {
      // If offline, enqueue for later processing
      if (!navigator.onLine && offlineQueueRef.current) {
        try {
          await offlineQueueRef.current.enqueue(audioBase64, 'tr')
          const count = await offlineQueueRef.current.getPendingCount()
          setPendingCount(count)
          setError(t('errorOfflineQueued'))
          setStep('DONE')
          return
        } catch (queueErr) {
          logger.error('Offline queue enqueue failed', queueErr)
        }
      }

      logger.error('Process audio failed', err)
      if (isEditMode && parseResult) {
        setError(t('errorEditFailed'))
        setStep('PREVIEW')
        return
      }
      setError(err instanceof Error ? err.message : t('errorGeneric'))
      setStep('RECORDING')
    }
  }, [isEditMode, parseResult, historyIndex])

  // ── Stop voice confirmation & speech commands ──
  const stopVoiceServices = useCallback(() => {
    if (voiceConfirmationRef.current) {
      voiceConfirmationRef.current.stop()
      voiceConfirmationRef.current = null
    }
    if (speechCommandsRef.current) {
      speechCommandsRef.current.stopListening()
      speechCommandsRef.current = null
    }
    setIsListeningCommands(false)
  }, [])

  // ── Approve -> Create draft proposal ──
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
        throw new Error(data.error?.message || data.error || t('errorProposalCreate'))
      }

      setCreatedProposalId(data.data.id)
      setStep('DONE')
    } catch (err) {
      logger.error('Approve failed', err)
      setError(err instanceof Error ? err.message : t('errorProposalApprove'))
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

  // ── History navigation (undo/redo) ──
  const handleHistoryChange = useCallback((index: number) => {
    if (index >= 0 && index < editHistory.length) {
      setHistoryIndex(index)
      setParseResult(editHistory[index])
    }
  }, [editHistory])

  // ── TTS confirmation & speech command listener on PREVIEW ──
  useEffect(() => {
    if (step !== 'PREVIEW' || !parseResult) {
      stopVoiceServices()
      return
    }

    // Speak the proposal confirmation via TTS
    const vc = new VoiceConfirmation()
    voiceConfirmationRef.current = vc

    if (vc.isSupported()) {
      const customerName = parseResult.customer.matchedName || parseResult.customer.query
      const total = parseResult.items.reduce((sum, item) => {
        return sum + item.quantity * (item.unitPrice ?? 0)
      }, 0)

      vc.speakProposalConfirmation(customerName, total).catch(() => {
        // TTS failure is not critical
      })
    }

    // Start listening for voice commands
    const sc = new VoiceSpeechCommands()
    speechCommandsRef.current = sc

    if (sc.isSupported()) {
      setIsListeningCommands(true)
      sc.startListening((command) => {
        switch (command) {
          case 'approve':
            handleApprove()
            break
          case 'cancel':
            handleRetry()
            break
          case 'edit':
            handleVoiceEdit()
            break
          case 'undo':
            if (historyIndex > 0) {
              handleHistoryChange(historyIndex - 1)
            }
            break
          default:
            break
        }
      })
    }

    return () => {
      stopVoiceServices()
    }
  }, [step, parseResult]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── WhatsApp send via API ──
  const handleWhatsAppSend = useCallback(async () => {
    if (!createdProposalId) return
    setIsSendingWhatsApp(true)

    try {
      const res = await fetch(`/api/v1/proposals/${createdProposalId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'whatsapp' }),
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error?.message || data.error || t('errorWhatsApp'))
      }

      setWhatsAppSent(true)
    } catch (err) {
      logger.error('WhatsApp send failed', err)
      setError(err instanceof Error ? err.message : t('errorWhatsApp'))
    } finally {
      setIsSendingWhatsApp(false)
    }
  }, [createdProposalId])

  // ── Retry: start fresh ──
  const handleRetry = useCallback(() => {
    stopVoiceServices()
    setIsEditMode(false)
    setParseResult(null)
    setTranscript('')
    setStep('RECORDING')
    setError(null)
    setEditHistory([])
    setEditChanges([])
    setHistoryIndex(0)
    setCountdown(null)
    setIsSendingWhatsApp(false)
    setWhatsAppSent(false)
    setIsListeningCommands(false)
  }, [stopVoiceServices])

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
                {step === 'DONE' ? t('titleDone') : isEditMode ? t('titleEdit') : t('title')}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {step === 'RECORDING' && (isEditMode ? t('subtitleRecordingEdit') : t('subtitleRecording'))}
                {step === 'PROCESSING' && t('subtitleProcessing')}
                {step === 'PREVIEW' && t('subtitlePreview')}
                {step === 'DONE' && t('subtitleDone')}
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
            {/* Offline indicator */}
            <OfflineIndicator
              pendingCount={pendingCount}
              isProcessing={isQueueProcessing}
              className="mb-4"
            />

            <AnimatePresence mode="wait">
              {step === 'RECORDING' && (
                <RecordingStep
                  isRecording={isRecording}
                  volume={volume}
                  recordingTime={recordingTime}
                  countdown={countdown}
                  isEditMode={isEditMode}
                  error={error}
                  onStartRecording={startRecording}
                  onStopRecording={stopRecording}
                  onClearError={() => setError(null)}
                  t={t}
                />
              )}

              {step === 'PROCESSING' && (
                <ProcessingStep
                  transcript={transcript}
                  parseResult={parseResult}
                  t={t}
                />
              )}

              {step === 'PREVIEW' && parseResult && (
                <PreviewStep
                  parseResult={parseResult}
                  isApproving={isApproving}
                  isListeningCommands={isListeningCommands}
                  editHistory={editHistory}
                  editChanges={editChanges}
                  historyIndex={historyIndex}
                  locale={locale}
                  onEdit={handleVoiceEdit}
                  onVoiceEdit={handleVoiceEdit}
                  onApprove={handleApprove}
                  onRetry={handleRetry}
                  onHistoryChange={handleHistoryChange}
                  t={t}
                />
              )}

              {step === 'DONE' && (
                <DoneStep
                  createdProposalId={createdProposalId}
                  isSendingWhatsApp={isSendingWhatsApp}
                  whatsAppSent={whatsAppSent}
                  locale={locale}
                  onWhatsAppSend={handleWhatsAppSend}
                  onRetry={handleRetry}
                  t={t}
                />
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
