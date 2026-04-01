'use client'

import { useState, useCallback, createContext, useContext, ReactNode } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'default'
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | null>(null)

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx.confirm
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    options: ConfirmOptions
    resolve: (value: boolean) => void
  } | null>(null)

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ options, resolve })
    })
  }, [])

  const handleConfirm = () => {
    state?.resolve(true)
    setState(null)
  }

  const handleCancel = () => {
    state?.resolve(false)
    setState(null)
  }

  const variant = state?.options.variant ?? 'danger'
  const variantStyles = {
    danger: {
      icon: 'bg-red-100 text-red-600',
      button: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-500/25',
    },
    warning: {
      icon: 'bg-amber-100 text-amber-600',
      button: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/25',
    },
    default: {
      icon: 'bg-blue-100 text-blue-600',
      button: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/25',
    },
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[100]">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCancel} />

          {/* Dialog */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm animate-scale-in overflow-hidden">
              {/* Close */}
              <button
                onClick={handleCancel}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-6 text-center">
                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl ${variantStyles[variant].icon} flex items-center justify-center mx-auto mb-4`}>
                  <AlertTriangle className="w-7 h-7" />
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {state.options.title ?? 'Emin misiniz?'}
                </h3>

                {/* Message */}
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {state.options.message}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 px-6 pb-6">
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {state.options.cancelText ?? 'Vazgeç'}
                </button>
                <button
                  onClick={handleConfirm}
                  className={`flex-1 px-4 py-3 text-white rounded-xl font-semibold text-sm shadow-lg transition-all ${variantStyles[variant].button}`}
                >
                  {state.options.confirmText ?? 'Onayla'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
