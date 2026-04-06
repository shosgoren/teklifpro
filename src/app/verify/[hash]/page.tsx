'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Shield, CheckCircle, XCircle, FileText, Building2, User, Calendar, Loader2 } from 'lucide-react'

interface VerificationResult {
  verified: boolean
  proposalNumber?: string
  companyName?: string
  customerName?: string
  status?: string
  createdAt?: string
  signedAt?: string
  signerName?: string
  hash: string
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Taslak', SENT: 'Gönderildi', VIEWED: 'Görüntülendi',
  ACCEPTED: 'Kabul Edildi', REJECTED: 'Reddedildi', REVISION_REQUESTED: 'Revizyon İstendi',
  REVISED: 'Revize Edildi', EXPIRED: 'Süresi Doldu', CANCELLED: 'İptal Edildi',
}

export default function VerifyPage() {
  const params = useParams()
  const hash = params.hash as string
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hash) return
    fetch(`/api/proposals/verify?hash=${encodeURIComponent(hash)}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setResult(res.data)
        } else {
          setError(res.error || 'Doğrulama başarısız')
        }
      })
      .catch(() => setError('Bağlantı hatası'))
      .finally(() => setLoading(false))
  }, [hash])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 mb-4">
            <Shield className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-sm text-gray-700">TeklifPro Belge Doğrulama</span>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
              <p className="text-sm text-gray-500">Belge doğrulanıyor...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Doğrulama Hatası</h2>
              <p className="text-sm text-gray-500">{error}</p>
            </div>
          ) : result?.verified ? (
            <>
              {/* Success Banner */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white mb-1">Belge Doğrulandı</h2>
                <p className="text-emerald-100 text-sm">Bu belge TeklifPro tarafından oluşturulmuş ve doğrulanmıştır</p>
              </div>

              {/* Details */}
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Teklif No</p>
                    <p className="font-semibold text-gray-900">{result.proposalNumber}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Building2 className="w-5 h-5 text-blue-500 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Firma</p>
                    <p className="font-semibold text-gray-900">{result.companyName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <User className="w-5 h-5 text-blue-500 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Müşteri</p>
                    <p className="font-semibold text-gray-900">{result.customerName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Calendar className="w-5 h-5 text-blue-500 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Oluşturulma Tarihi</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(result.createdAt!).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {result.status && (
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${result.status === 'ACCEPTED' ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                    <CheckCircle className={`w-5 h-5 shrink-0 ${result.status === 'ACCEPTED' ? 'text-emerald-500' : 'text-gray-400'}`} />
                    <div>
                      <p className="text-xs text-gray-400">Durum</p>
                      <p className="font-semibold text-gray-900">{STATUS_LABELS[result.status] || result.status}</p>
                    </div>
                  </div>
                )}

                {result.signerName && result.signedAt && (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                    <Shield className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">İmzalayan</p>
                      <p className="font-semibold text-gray-900">{result.signerName}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(result.signedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Hash */}
                <div className="mt-4 p-3 bg-slate-100 rounded-xl">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Doğrulama Kodu (SHA-256)</p>
                  <p className="text-[11px] font-mono text-gray-600 break-all">{result.hash}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Belge Doğrulanamadı</h2>
              <p className="text-sm text-gray-500 mb-4">
                Bu doğrulama kodu ile eşleşen bir belge bulunamadı.
                Belge değiştirilmiş veya geçersiz olabilir.
              </p>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Sorgulanan Kod</p>
                <p className="text-[11px] font-mono text-gray-600 break-all">{hash}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-400">TeklifPro - Dijital Teklif Yönetimi</p>
        </div>
      </div>
    </div>
  )
}
