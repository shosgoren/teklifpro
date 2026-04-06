'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, Square, Play, Pause, Trash2, RotateCcw } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'
import { Logger } from '@/infrastructure/logger'

const logger = new Logger('VoiceNoteRecorder')

// NOTE: Voice notes are stored as base64 in the database (max ~500KB via API validation).
// For scale (high volume tenants), migrate to S3/Supabase Storage with signed URLs.
// See: proposals route.ts validateVoiceNote() for current size limits.

interface VoiceNoteRecorderProps {
  value: string | null // base64 audio data
  duration: number | null
  onChange: (data: string | null, duration: number | null) => void
  maxDuration?: number // seconds
  labels?: {
    record?: string
    recording?: string
    stop?: string
    play?: string
    reRecord?: string
    delete?: string
    maxDurationLabel?: string
  }
}

export function VoiceNoteRecorder({
  value,
  duration,
  onChange,
  maxDuration = 60,
  labels = {},
}: VoiceNoteRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [permissionDenied, setPermissionDenied] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    }
  }, [])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const startRecording = useCallback(async () => {
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

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })

        // Client-side security: validate size (max 500KB)
        if (blob.size > 512_000) {
          logger.warn('Voice note too large', blob.size)
          stream.getTracks().forEach(t => t.stop())
          streamRef.current = null
          return
        }

        // Validate MIME type is audio
        if (!blob.type.startsWith('audio/')) {
          logger.warn('Invalid audio type', blob.type)
          stream.getTracks().forEach(t => t.stop())
          streamRef.current = null
          return
        }

        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = reader.result as string
          // Final check: must be a data:audio/* URL
          if (!base64.startsWith('data:audio/')) {
            logger.warn('Invalid data URL format')
            return
          }
          onChange(base64, recordingTime)
        }
        reader.readAsDataURL(blob)
        stream.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }

      recorder.start(100)
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration - 1) {
            stopRecording()
            return prev + 1
          }
          return prev + 1
        })
      }, 1000)

      setPermissionDenied(false)
    } catch {
      setPermissionDenied(true)
    }
  }, [maxDuration, onChange, recordingTime])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setIsRecording(false)
  }, [])

  const playAudio = useCallback(() => {
    if (!value) return
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setIsPlaying(false)
      return
    }
    const audio = new Audio(value)
    audioRef.current = audio
    audio.onended = () => { setIsPlaying(false); audioRef.current = null }
    audio.play()
    setIsPlaying(true)
  }, [value])

  const deleteRecording = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    setIsPlaying(false)
    setRecordingTime(0)
    onChange(null, null)
  }, [onChange])

  // Recording state
  if (isRecording) {
    return (
      <div className="rounded-2xl border-2 border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20 p-5">
        <div className="flex flex-col items-center gap-4">
          {/* Pulse animation */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20" />
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/30">
              <Mic className="h-7 w-7 text-white" />
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {labels.recording || 'Kayıt yapılıyor...'}
            </p>
            <p className="text-2xl font-bold font-mono text-red-600 dark:text-red-300 mt-1">
              {formatTime(recordingTime)}
            </p>
            <p className="text-xs text-red-500/70 mt-1">
              {labels.maxDurationLabel || `Maks ${maxDuration} saniye`}
            </p>
          </div>

          {/* Recording level bars */}
          <div className="flex items-end gap-1 h-8">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="w-1.5 bg-red-400 dark:bg-red-500 rounded-full animate-pulse"
                style={{
                  height: `${Math.random() * 100}%`,
                  animationDelay: `${i * 50}ms`,
                  animationDuration: `${300 + Math.random() * 400}ms`,
                }}
              />
            ))}
          </div>

          <Button
            type="button"
            onClick={stopRecording}
            className="gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg"
          >
            <Square className="h-4 w-4" />
            {labels.stop || 'Kaydı Durdur'}
          </Button>
        </div>
      </div>
    )
  }

  // Has recording
  if (value) {
    return (
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20 p-4">
        <div className="flex items-center gap-3">
          {/* Play button */}
          <button
            type="button"
            onClick={playAudio}
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0 shadow-lg',
              isPlaying
                ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/25'
                : 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25 hover:scale-105'
            )}
          >
            {isPlaying
              ? <Pause className="h-5 w-5 text-white" />
              : <Play className="h-5 w-5 text-white ml-0.5" />
            }
          </button>

          {/* Waveform placeholder + info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-end gap-0.5 h-6 mb-1">
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-1 rounded-full transition-all',
                    isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-300 dark:bg-emerald-700'
                  )}
                  style={{ height: `${20 + Math.sin(i * 0.5) * 50 + Math.random() * 30}%` }}
                />
              ))}
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              {formatTime(duration || recordingTime)} — {labels.play || 'Sesli not hazır'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => { deleteRecording(); startRecording() }}
              className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 flex items-center justify-center text-amber-600 transition-colors"
              title={labels.reRecord || 'Tekrar kaydet'}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={deleteRecording}
              className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center justify-center text-red-600 transition-colors"
              title={labels.delete || 'Sil'}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Empty state - record button
  return (
    <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-5">
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={startRecording}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 hover:scale-105 transition-transform active:scale-95"
        >
          <Mic className="h-7 w-7 text-white" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold">{labels.record || 'Sesli Not Kaydet'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {labels.maxDurationLabel || `Maks ${maxDuration} saniye`}
          </p>
        </div>
        {permissionDenied && (
          <p className="text-xs text-red-500 text-center">
            Mikrofon izni gerekli. Tarayıcı ayarlarından mikrofon erişimine izin verin.
          </p>
        )}
      </div>
    </div>
  )
}
