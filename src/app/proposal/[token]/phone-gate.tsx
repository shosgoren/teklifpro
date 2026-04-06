'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Phone, Loader2, AlertCircle } from 'lucide-react'

interface PhoneGateProps {
  token: string
  maskedPhone: string
  tenantName: string
  tenantLogo: string | null
}

export default function PhoneGate({ token, maskedPhone, tenantName, tenantLogo }: PhoneGateProps) {
  const router = useRouter()
  const [digits, setDigits] = useState(['', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

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
        throw new Error(data.error || 'Doğrulama başarısız')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu')
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

          <h1 className="text-lg font-bold text-gray-900 mb-1">Kimlik Dogrulama</h1>
          <p className="text-sm text-gray-500 mb-6">
            Bu teklif size ozel gonderilmistir. Erisim icin telefon numaranizin son 4 hanesini giriniz.
          </p>

          {/* Masked Phone */}
          <div className="flex items-center justify-center gap-2 mb-6 p-3 bg-gray-50 rounded-2xl">
            <Phone className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-mono text-gray-600 tracking-wider">{maskedPhone}</span>
          </div>

          {/* 4 Digit Input */}
          <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
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
                className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-50 bg-white"
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl mb-4">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Dogrulanıyor...</span>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">TeklifPro ile guvenli teklif yonetimi</p>
      </div>
    </div>
  )
}
