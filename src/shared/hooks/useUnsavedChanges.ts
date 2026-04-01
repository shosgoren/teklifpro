'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useConfirm } from '@/shared/components/confirm-dialog'
import { useTranslations } from 'next-intl'

/**
 * Hook to warn users when they try to navigate away from a page with unsaved changes.
 * - Intercepts browser close/refresh via beforeunload
 * - Intercepts in-app link clicks via click event delegation
 * - Provides a markDirty/markClean API for form tracking
 */
export function useUnsavedChanges() {
  const confirm = useConfirm()
  const t = useTranslations('common')
  const isDirtyRef = useRef(false)

  const markDirty = useCallback(() => {
    isDirtyRef.current = true
  }, [])

  const markClean = useCallback(() => {
    isDirtyRef.current = false
  }, [])

  // Browser close / refresh guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // In-app navigation guard via link click interception
  useEffect(() => {
    const handler = async (e: MouseEvent) => {
      if (!isDirtyRef.current) return

      const anchor = (e.target as HTMLElement).closest('a[href]')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return

      // Only intercept same-origin navigation
      try {
        const url = new URL(href, window.location.origin)
        if (url.origin !== window.location.origin) return
        if (url.pathname === window.location.pathname) return
      } catch {
        return
      }

      e.preventDefault()
      e.stopPropagation()

      const ok = await confirm({
        title: t('unsavedChangesTitle'),
        message: t('unsavedChangesMessage'),
        confirmText: t('unsavedChangesLeave'),
        cancelText: t('unsavedChangesStay'),
        variant: 'warning',
      })

      if (ok) {
        isDirtyRef.current = false
        window.location.href = href
      }
    }

    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [confirm, t])

  return { markDirty, markClean, isDirtyRef }
}
