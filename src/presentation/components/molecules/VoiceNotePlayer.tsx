'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Play, Pause, Volume2 } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

interface VoiceNotePlayerProps {
  audioData: string // base64 data URL
  duration?: number | null // seconds
  senderName?: string
  className?: string
  label?: string
}

export function VoiceNotePlayer({
  audioData,
  duration,
  senderName,
  className,
  label,
}: VoiceNotePlayerProps) {
  const t = useTranslations('voiceProposal')
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isValid, setIsValid] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const animRef = useRef<number | null>(null)

  const blobUrlRef = useRef<string | null>(null)

  // Security: validate audio data URL on mount + create blob URL for better compatibility
  useEffect(() => {
    if (!audioData.startsWith('data:audio/') || !audioData.includes(';base64,')) {
      setIsValid(false)
      return
    }
    // Convert data URL to blob URL for better cross-browser audio playback
    try {
      const [header, base64] = audioData.split(';base64,')
      const mimeType = header.replace('data:', '')
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: mimeType })
      blobUrlRef.current = URL.createObjectURL(blob)
    } catch {
      setIsValid(false)
    }
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [audioData])

  if (!isValid) return null

  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause()
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const updateProgress = useCallback(() => {
    if (audioRef.current) {
      const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100
      setProgress(isNaN(pct) ? 0 : pct)
      setCurrentTime(audioRef.current.currentTime)
      if (!audioRef.current.paused) {
        animRef.current = requestAnimationFrame(updateProgress)
      }
    }
  }, [])

  const togglePlay = useCallback(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      if (animRef.current) cancelAnimationFrame(animRef.current)
      setIsPlaying(false)
      return
    }

    if (!audioRef.current) {
      audioRef.current = new Audio(blobUrlRef.current || audioData)
      audioRef.current.onended = () => {
        setIsPlaying(false)
        setProgress(0)
        setCurrentTime(0)
        if (animRef.current) cancelAnimationFrame(animRef.current)
        audioRef.current = null
      }
    }

    audioRef.current.onerror = () => {
      setIsPlaying(false)
      audioRef.current = null
    }
    audioRef.current.play().then(() => {
      setIsPlaying(true)
      animRef.current = requestAnimationFrame(updateProgress)
    }).catch(() => {
      setIsPlaying(false)
      audioRef.current = null
    })
  }, [audioData, isPlaying, updateProgress])

  return (
    <div className={cn(
      'rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 shadow-lg shadow-blue-500/20 relative overflow-hidden',
      className
    )}>
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
      <div className="absolute -bottom-6 -left-6 w-16 h-16 rounded-full bg-white/5" />

      <div className="relative flex items-center gap-4">
        {/* Play button */}
        <button
          type="button"
          onClick={togglePlay}
          className={cn(
            'w-14 h-14 rounded-xl flex items-center justify-center transition-all shrink-0',
            isPlaying
              ? 'bg-white/20 backdrop-blur-sm'
              : 'bg-white/25 hover:bg-white/30 hover:scale-105'
          )}
        >
          {isPlaying
            ? <Pause className="h-6 w-6 text-white" />
            : <Play className="h-6 w-6 text-white ml-0.5" />
          }
        </button>

        <div className="flex-1 min-w-0">
          {/* Label */}
          <div className="flex items-center gap-2 mb-2">
            <Volume2 className="h-3.5 w-3.5 text-blue-200" />
            <p className="text-xs text-blue-200 font-medium truncate">
              {label || (senderName ? t('voiceMessageFrom', { name: senderName }) : t('voiceMessage'))}
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Duration */}
          <div className="flex justify-between mt-1.5">
            <span className="text-[11px] text-blue-200 font-mono">
              {formatTime(currentTime)}
            </span>
            <span className="text-[11px] text-blue-200 font-mono">
              {formatTime(duration || 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
