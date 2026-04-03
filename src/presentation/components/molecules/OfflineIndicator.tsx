'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, WifiOff, Clock } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

interface OfflineIndicatorProps {
  pendingCount: number
  isProcessing: boolean
  className?: string
}

export function OfflineIndicator({ pendingCount, isProcessing, className }: OfflineIndicatorProps) {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    setIsOffline(!navigator.onLine)

    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Hide when online and nothing pending and not processing
  if (!isOffline && pendingCount === 0 && !isProcessing) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          'rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-2',
          isOffline
            ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
            : isProcessing
              ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
              : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400',
          className,
        )}
      >
        {isOffline ? (
          <>
            <WifiOff className="h-4 w-4 flex-shrink-0" />
            <span>Cevrimdisi - kayitlar kuyrukta</span>
            {pendingCount > 0 && (
              <span className="ml-auto text-xs bg-red-200 dark:bg-red-800 rounded-full px-2 py-0.5">
                {pendingCount}
              </span>
            )}
          </>
        ) : isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
            <span>Isleniyor...</span>
          </>
        ) : (
          <>
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span>{pendingCount} bekleyen teklif</span>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
