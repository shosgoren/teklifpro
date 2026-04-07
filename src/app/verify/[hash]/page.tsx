'use client'

import { useEffect, useState, useMemo } from 'react'
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

const translations: Record<string, Record<string, string>> = {
  tr: {
    headerBadge: 'TeklifPro Belge Do\u011frulama',
    loading: 'Belge do\u011frulan\u0131yor...',
    errorTitle: 'Do\u011frulama Hatas\u0131',
    errorDefault: 'Do\u011frulama ba\u015far\u0131s\u0131z',
    errorConnection: 'Ba\u011flant\u0131 hatas\u0131',
    verifiedTitle: 'Belge Do\u011fruland\u0131',
    verifiedDesc: 'Bu belge TeklifPro taraf\u0131ndan olu\u015fturulmu\u015f ve do\u011frulanm\u0131\u015ft\u0131r',
    proposalNo: 'Teklif No',
    company: 'Firma',
    customer: 'M\u00fc\u015fteri',
    createdAt: 'Olu\u015fturulma Tarihi',
    status: 'Durum',
    signer: '\u0130mzalayan',
    hashLabel: 'Do\u011frulama Kodu (SHA-256)',
    notVerifiedTitle: 'Belge Do\u011frulanamad\u0131',
    notVerifiedDesc: 'Bu do\u011frulama kodu ile e\u015fle\u015fen bir belge bulunamad\u0131. Belge de\u011fi\u015ftirilmi\u015f veya ge\u00e7ersiz olabilir.',
    queriedCode: 'Sorgulanan Kod',
    footer: 'TeklifPro - Dijital Teklif Y\u00f6netimi',
    statusDraft: 'Taslak',
    statusSent: 'G\u00f6nderildi',
    statusViewed: 'G\u00f6r\u00fcnt\u00fclendi',
    statusAccepted: 'Kabul Edildi',
    statusRejected: 'Reddedildi',
    statusRevisionRequested: 'Revizyon \u0130stendi',
    statusRevised: 'Revize Edildi',
    statusExpired: 'S\u00fcresi Doldu',
    statusCancelled: '\u0130ptal Edildi',
  },
  en: {
    headerBadge: 'TeklifPro Document Verification',
    loading: 'Verifying document...',
    errorTitle: 'Verification Error',
    errorDefault: 'Verification failed',
    errorConnection: 'Connection error',
    verifiedTitle: 'Document Verified',
    verifiedDesc: 'This document was created and verified by TeklifPro',
    proposalNo: 'Proposal No',
    company: 'Company',
    customer: 'Customer',
    createdAt: 'Created Date',
    status: 'Status',
    signer: 'Signed By',
    hashLabel: 'Verification Code (SHA-256)',
    notVerifiedTitle: 'Document Not Verified',
    notVerifiedDesc: 'No document matching this verification code was found. The document may have been altered or is invalid.',
    queriedCode: 'Queried Code',
    footer: 'TeklifPro - Digital Proposal Management',
    statusDraft: 'Draft',
    statusSent: 'Sent',
    statusViewed: 'Viewed',
    statusAccepted: 'Accepted',
    statusRejected: 'Rejected',
    statusRevisionRequested: 'Revision Requested',
    statusRevised: 'Revised',
    statusExpired: 'Expired',
    statusCancelled: 'Cancelled',
  },
}

function detectLocale(): string {
  if (typeof window === 'undefined') return 'tr'
  const path = window.location.pathname
  if (path.startsWith('/en')) return 'en'
  return 'tr'
}

const STATUS_KEY_MAP: Record<string, string> = {
  DRAFT: 'statusDraft',
  SENT: 'statusSent',
  VIEWED: 'statusViewed',
  ACCEPTED: 'statusAccepted',
  REJECTED: 'statusRejected',
  REVISION_REQUESTED: 'statusRevisionRequested',
  REVISED: 'statusRevised',
  EXPIRED: 'statusExpired',
  CANCELLED: 'statusCancelled',
}

export default function VerifyPage() {
  const params = useParams()
  const hash = params.hash as string
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const locale = useMemo(detectLocale, [])
  const t = (key: string) => translations[locale]?.[key] ?? translations.tr[key] ?? key
  const dateLocale = locale === 'en' ? 'en-US' : 'tr-TR'

  useEffect(() => {
    if (!hash) return
    fetch(`/api/proposals/verify?hash=${encodeURIComponent(hash)}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setResult(res.data)
        } else {
          setError(res.error || t('errorDefault'))
        }
      })
      .catch(() => setError(t('errorConnection')))
      .finally(() => setLoading(false))
  }, [hash])

  const getStatusLabel = (status: string): string => {
    const key = STATUS_KEY_MAP[status]
    return key ? t(key) : status
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200 mb-4">
            <Shield className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-sm text-gray-700">{t('headerBadge')}</span>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
              <p className="text-sm text-gray-500">{t('loading')}</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">{t('errorTitle')}</h2>
              <p className="text-sm text-gray-500">{error}</p>
            </div>
          ) : result?.verified ? (
            <>
              {/* Success Banner */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white mb-1">{t('verifiedTitle')}</h2>
                <p className="text-emerald-100 text-sm">{t('verifiedDesc')}</p>
              </div>

              {/* Details */}
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">{t('proposalNo')}</p>
                    <p className="font-semibold text-gray-900">{result.proposalNumber}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Building2 className="w-5 h-5 text-blue-500 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">{t('company')}</p>
                    <p className="font-semibold text-gray-900">{result.companyName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <User className="w-5 h-5 text-blue-500 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">{t('customer')}</p>
                    <p className="font-semibold text-gray-900">{result.customerName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Calendar className="w-5 h-5 text-blue-500 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">{t('createdAt')}</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(result.createdAt!).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {result.status && (
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${result.status === 'ACCEPTED' ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                    <CheckCircle className={`w-5 h-5 shrink-0 ${result.status === 'ACCEPTED' ? 'text-emerald-500' : 'text-gray-400'}`} />
                    <div>
                      <p className="text-xs text-gray-400">{t('status')}</p>
                      <p className="font-semibold text-gray-900">{getStatusLabel(result.status)}</p>
                    </div>
                  </div>
                )}

                {result.signerName && result.signedAt && (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                    <Shield className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">{t('signer')}</p>
                      <p className="font-semibold text-gray-900">{result.signerName}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(result.signedAt).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Hash */}
                <div className="mt-4 p-3 bg-slate-100 rounded-xl">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{t('hashLabel')}</p>
                  <p className="text-[11px] font-mono text-gray-600 break-all">{result.hash}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">{t('notVerifiedTitle')}</h2>
              <p className="text-sm text-gray-500 mb-4">
                {t('notVerifiedDesc')}
              </p>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{t('queriedCode')}</p>
                <p className="text-[11px] font-mono text-gray-600 break-all">{hash}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-400">{t('footer')}</p>
        </div>
      </div>
    </div>
  )
}
