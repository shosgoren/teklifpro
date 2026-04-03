'use client'

import { useMemo } from 'react'
import { cn } from '@/shared/utils/cn'

interface VoiceActivityIndicatorProps {
  isActive: boolean
  volume: number // 0-100
  className?: string
}

const BAR_COUNT = 24

export function VoiceActivityIndicator({ isActive, volume, className }: VoiceActivityIndicatorProps) {
  // Generate stable random offsets for each bar (only on mount)
  const offsets = useMemo(
    () => Array.from({ length: BAR_COUNT }, () => Math.random()),
    []
  )

  return (
    <div className={cn('flex items-end justify-center gap-[3px] h-12', className)}>
      {offsets.map((offset, i) => {
        // Base height is sin-wave for visual shape, modulated by volume
        const sinBase = Math.sin((i / BAR_COUNT) * Math.PI)
        const volumeFactor = isActive ? volume / 100 : 0
        const randomVariation = offset * 0.3
        const height = isActive
          ? Math.max(8, (sinBase * 0.6 + randomVariation + 0.1) * volumeFactor * 100)
          : 8 + offset * 8

        return (
          <div
            key={i}
            className={cn(
              'w-1.5 rounded-full transition-all duration-150 ease-out',
              isActive
                ? 'bg-red-500 dark:bg-red-400'
                : 'bg-gray-300 dark:bg-gray-600'
            )}
            style={{
              height: `${Math.min(height, 100)}%`,
              transitionDelay: `${i * 10}ms`,
            }}
          />
        )
      })}
    </div>
  )
}
