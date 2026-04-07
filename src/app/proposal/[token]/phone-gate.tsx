'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Phone, Loader2, AlertCircle } from 'lucide-react'

interface PhoneGateProps {
  token: string
  maskedPhone: string
  tenantName: string
  tenantLogo: string | null
}

const translations: Record<string, Record<string, string>> = {
  tr: {
    title: 'Kimlik Do\u011frulama',
    description: 'Bu teklif size \u00f6zel g\u00f6nderilmi\u015ftir. Eri\u015fim i\u00e7in telefon numaran\u0131z\u0131n son 4 hanesini giriniz.',
    verifying: 'Do\u011frulan\u0131yor...',
    errorDefault: 'Do\u011frulama ba\u015far\u0131s\u0131z',
    errorGeneric: 'Bir hata olu\u015ftu',
    formLabel: 'Do\u011frulama kodu',
    digitLabel: 'Do\u011frulama kodu rakam',
    footer: 'TeklifPro ile g\u00fcvenli teklif y\u00f6netimi',
  },
  en: {
    title: 'Identity Verification',
    description: 'This proposal was sent exclusively to you. Please enter the last 4 digits of your phone number to access it.',
    verifying: 'Verifying...',
    errorDefault: 'Verification failed',
    errorGeneric: 'An error occurred',
    formLabel: 'Verification code',
    digitLabel: 'Verification code digit',
    footer: 'Secure proposal management with TeklifPro',
  },
}

function detectLocale(): string {
  if (typeof window === 'undefined') return 'tr'
  const path = window.location.pathname
  if (path.startsWith('/en')) return 'en'
  return 'tr'
}

export default function PhoneGate({ token, maskedPhone, tenantName, tenantLogo }: PhoneGateProps) {
  const router = useRouter()
  const [digits, setDigits] = useState(['', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const locale = useMemo(detectLocale, [])
  const t = (key: string) => translations[locale]?.[key] ?? translations.tr[key] ?? key

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newDigits = [...digits]
    newDigits[index] = value.slice(-1)
    setDigits(newDigits)
    setError(null)

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 4 digits entered
    if (value && index === 3) {
      const code = [...newDigits.slice(0, 3), value.slice(-1)].join('')
      if (code.length === 4) {
        handleVerify(code)
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (pasted.length === 4) {
      setDigits(pasted.split(''))
      handleVerify(pasted)
    }
  }

  const handleVerify = async (code: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/proposals/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lastFourDigits: code }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || t('errorDefault'))
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorGeneric'))
      setDigits(['', '', '', ''])
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
          {/* Logo / Company */}
          <div className="mb-6">
            {tenantLogo ? (
              <img src={tenantLogo} alt={tenantName} className="h-12 mx-auto mb-2 object-contain" />
            ) : (
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <span className="text-white font-bold text-lg">{tenantName.charAt(0)}</span>
              </div>
            )}
            <p className="text-sm text-gray-500">{tenantName}</p>
          </div>

          {/* Shield Icon */}
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-blue-500" />
          </div>

          <h1 className="text-lg font-bold text-gray-900 mb-1">{t('title')}</h1>
          <p className="text-sm text-gray-500 mb-6">
            {t('description')}
          </p>

          {/* Masked Phone */}
          <div className="flex items-center justify-center gap-2 mb-6 p-3 bg-gray-50 rounded-2xl">
            <Phone className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-mono text-gray-600 tracking-normal sm:tracking-wider">{maskedPhone}</span>
          </div>

          {/* 4 Digit Input */}
          <div className="flex justify-center gap-3 mb-6" role="form" aria-label={t('formLabel')} onPaste={handlePaste}>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={isLoading}
                aria-label={`${t('digitLabel')} ${i + 1}`}
                className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-50 bg-white"
              />
            ))}
          </div>

          {/* Error */}
          <div aria-live="polite">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl mb-4">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">{t('verifying')}</span>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">{t('footer')}</p>
      </div>
    </div>
  )
}
