'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Dynamically loads tenant's logo as favicon.
 * Uses MutationObserver to prevent Next.js metadata from overriding the favicon
 * on client-side navigation. Caches in sessionStorage to avoid API calls.
 */
export function DynamicFavicon() {
  const pathname = usePathname()
  const logoRef = useRef<string | null>(null)
  const observerRef = useRef<MutationObserver | null>(null)

  // Load tenant logo once
  useEffect(() => {
    let cancelled = false

    async function loadFavicon() {
      // Check sessionStorage cache first
      const cached = sessionStorage.getItem('tenant_favicon')
      if (cached) {
        logoRef.current = cached
        applyFavicon(cached)
        startObserver()
        return
      }

      try {
        const res = await fetch('/api/v1/settings/logo')
        if (!res.ok) return
        const json = await res.json()
        const logo = json?.data?.logo
        if (cancelled || !logo) return

        sessionStorage.setItem('tenant_favicon', logo)
        logoRef.current = logo
        applyFavicon(logo)
        startObserver()
      } catch {
        // Keep default favicon on error
      }
    }

    loadFavicon()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-apply on every route change (Next.js metadata may override)
  useEffect(() => {
    const logo = logoRef.current || sessionStorage.getItem('tenant_favicon')
    if (logo) {
      // Small delay to run after Next.js metadata update
      const timer = setTimeout(() => applyFavicon(logo), 50)
      return () => clearTimeout(timer)
    }
  }, [pathname])

  // MutationObserver: detect when Next.js changes favicon back and override it
  function startObserver() {
    if (observerRef.current) return

    observerRef.current = new MutationObserver((mutations) => {
      const logo = logoRef.current
      if (!logo) return

      for (const mutation of mutations) {
        // Check if a favicon link was added or modified
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (
              node instanceof HTMLLinkElement &&
              (node.rel === 'icon' || node.rel === 'shortcut icon') &&
              node.href !== logo
            ) {
              node.href = logo
            }
          }
        }
        if (
          mutation.type === 'attributes' &&
          mutation.target instanceof HTMLLinkElement &&
          (mutation.target.rel === 'icon' || mutation.target.rel === 'shortcut icon') &&
          mutation.target.href !== logo
        ) {
          mutation.target.href = logo
        }
      }
    })

    observerRef.current.observe(document.head, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href'],
    })
  }

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect()
    }
  }, [])

  return null
}

function applyFavicon(url: string) {
  const links = document.querySelectorAll<HTMLLinkElement>(
    'link[rel="icon"], link[rel="shortcut icon"]'
  )
  links.forEach(link => { link.href = url })

  if (links.length === 0) {
    const link = document.createElement('link')
    link.rel = 'icon'
    link.href = url
    document.head.appendChild(link)
  }
}
