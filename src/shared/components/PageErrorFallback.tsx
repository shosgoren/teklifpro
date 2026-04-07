'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

interface PageErrorFallbackProps {
  onRetry?: () => void
}

export function PageErrorFallback({ onRetry }: PageErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] px-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7 text-red-500 dark:text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          Something went wrong
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          An unexpected error occurred while rendering this page. Please try again.
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        )}
      </div>
    </div>
  )
}
