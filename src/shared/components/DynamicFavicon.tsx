'use client'

import { useEffect } from 'react'

/**
 * Dynamically loads tenant's logo as favicon.
 * Caches in sessionStorage to avoid API calls on every navigation.
 * Falls back to static favicon if API fails or user is not authenticated.
 */
export function DynamicFavicon() {
  useEffect(() => {
    let cancelled = false

    async function loadFavicon() {
      // Check sessionStorage cache first
      const cached = sessionStorage.getItem('tenant_favicon')
      if (cached) {
        applyFavicon(cached)
        return
      }

      try {
        const res = await fetch('/api/v1/settings/logo')
        if (!res.ok) return
        const json = await res.json()
        const logo = json?.data?.logo
        if (cancelled || !logo) return

        // Cache for this session
        sessionStorage.setItem('tenant_favicon', logo)
        applyFavicon(logo)
      } catch {
        // Keep default favicon on error (not authenticated, network issue, etc.)
      }
    }

    loadFavicon()
    return () => { cancelled = true }
  }, [])

  return null
}

function applyFavicon(url: string) {
  const links = document.querySelectorAll<HTMLLinkElement>(
    'link[rel="icon"], link[rel="shortcut icon"]'
  )
  links.forEach(link => { link.href = url })

  // If no existing icon link, create one
  if (links.length === 0) {
    const link = document.createElement('link')
    link.rel = 'icon'
    link.href = url
    document.head.appendChild(link)
  }
}
