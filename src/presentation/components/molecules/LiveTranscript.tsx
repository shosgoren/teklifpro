'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/shared/utils/cn'

interface LiveTranscriptProps {
  text: string
  isProcessing: boolean
  className?: string
}

export function LiveTranscript({ text, isProcessing, className }: LiveTranscriptProps) {
  const [visibleWordCount, setVisibleWordCount] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevTextRef = useRef('')

  const words = text.split(/\s+/).filter(Boolean)

  // Typewriter: reveal words one by one when text changes
  useEffect(() => {
    // If text changed (new content arrived), animate from previous length
    const prevWords = prevTextRef.current.split(/\s+/).filter(Boolean)
    const startFrom = prevWords.length
    prevTextRef.current = text

    if (words.length <= startFrom) {
      setVisibleWordCount(words.length)
      return
    }

    setVisibleWordCount(startFrom)
    let current = startFrom

    const interval = setInterval(() => {
      current++
      setVisibleWordCount(current)
      if (current >= words.length) {
        clearInterval(interval)
      }
    }, 60) // ~60ms per word for typewriter effect

    return () => clearInterval(interval)
  }, [text]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [visibleWordCount])

  const visibleText = words.slice(0, visibleWordCount).join(' ')

  return (
    <div
      ref={containerRef}
      className={cn(
        'max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700',
        'bg-slate-50 dark:bg-slate-900 p-4',
        'font-mono text-sm leading-relaxed',
        'scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600',
        className
      )}
    >
      <p
        className={cn(
          'whitespace-pre-wrap transition-opacity duration-300',
          isProcessing ? 'text-slate-600 dark:text-slate-400 opacity-70' : 'text-slate-900 dark:text-slate-100 opacity-100'
        )}
      >
        {visibleText || (isProcessing ? 'Dinleniyor...' : '')}
        {isProcessing && (
          <span className="inline-block w-0.5 h-4 ml-1 bg-blue-500 align-middle animate-pulse" />
        )}
      </p>
    </div>
  )
}
