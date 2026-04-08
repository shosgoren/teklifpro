'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { CheckCircle, RotateCw, XCircle, Loader2, AlertCircle, X, PenTool, Eraser } from 'lucide-react'

interface ContactOption {
  id: string
  name: string
  title: string | null
}

interface ProposalActionsProps {
  proposalId: string
  contacts: ContactOption[]
}

type ModalType = 'accept' | 'reject' | 'revision' | null

const proposalActionDict = {
  tr: {
    accept: 'Kabul Et',
    revision: 'Revize',
    reject: 'Reddet',
    cancel: 'İptal',
    send: 'Gönder',
    acceptProposal: 'Teklifi Kabul Et',
    requestRevision: 'Revize Talep Et',
    rejectProposal: 'Teklifi Reddet',
    acceptAriaLabel: 'Teklifi kabul et',
    revisionAriaLabel: 'Teklif için revize talep et',
    rejectAriaLabel: 'Teklifi reddet',
    operationFailed: 'İşlem başarısız oldu',
    errorOccurred: 'Bir hata oluştu',
    enterFullName: 'Lütfen ad soyad giriniz',
    pleaseSign: 'Lütfen imzanızı atınız',
    describeRevision: 'Lütfen revize talebinizi açıklayınız',
    operationSuccess: 'İşlem Başarılı!',
    responseSent: 'Yanıtınız iletildi.',
    confirmAccept: 'Teklifi kabul etmek istediğinize emin misiniz?',
    signerPerson: 'İmzalayan Kişi',
    selectPerson: 'Kişi seçiniz...',
    otherManual: 'Diğer (elle giriş)',
    enterFullNamePlaceholder: 'Ad Soyad giriniz',
    signerFullName: 'İmzalayan kişinin adı soyadı',
    eSignature: 'E-İmza',
    clear: 'Temizle',
    signatureLoading: 'İmza yükleniyor...',
    signWithFingerOrPen: 'Parmağınız veya kaleminizle imzalayın',
    noteOptional: 'Notunuz (Opsiyonel)',
    additionalNotes: 'Ek notlarınız...',
    specifyChanges: 'Lütfen hangi değişiklikleri istediğinizi belirtin.',
    revisionRequest: 'Revize Talebiniz',
    revisionPlaceholder: 'Örn: Fiyatları %10 düşürebilir misiniz?',
    aboutToReject: 'Teklifi reddetmek üzeresiniz.',
    rejectionReasonOptional: 'Reddetme Nedeni (Opsiyonel)',
    rejectionPlaceholder: 'Örn: Fiyat fazla, Başka tedarikçi seçtik...',
  },
  en: {
    accept: 'Accept',
    revision: 'Revise',
    reject: 'Reject',
    cancel: 'Cancel',
    send: 'Send',
    acceptProposal: 'Accept Proposal',
    requestRevision: 'Request Revision',
    rejectProposal: 'Reject Proposal',
    acceptAriaLabel: 'Accept proposal',
    revisionAriaLabel: 'Request revision for proposal',
    rejectAriaLabel: 'Reject proposal',
    operationFailed: 'Operation failed',
    errorOccurred: 'An error occurred',
    enterFullName: 'Please enter your full name',
    pleaseSign: 'Please provide your signature',
    describeRevision: 'Please describe your revision request',
    operationSuccess: 'Success!',
    responseSent: 'Your response has been submitted.',
    confirmAccept: 'Are you sure you want to accept this proposal?',
    signerPerson: 'Signer',
    selectPerson: 'Select a person...',
    otherManual: 'Other (manual entry)',
    enterFullNamePlaceholder: 'Enter full name',
    signerFullName: 'Full name of the signer',
    eSignature: 'E-Signature',
    clear: 'Clear',
    signatureLoading: 'Loading signature...',
    signWithFingerOrPen: 'Sign with your finger or stylus',
    noteOptional: 'Your Note (Optional)',
    additionalNotes: 'Additional notes...',
    specifyChanges: 'Please specify the changes you would like.',
    revisionRequest: 'Your Revision Request',
    revisionPlaceholder: 'E.g.: Can you reduce prices by 10%?',
    aboutToReject: 'You are about to reject this proposal.',
    rejectionReasonOptional: 'Rejection Reason (Optional)',
    rejectionPlaceholder: 'E.g.: Price too high, Chose another supplier...',
  },
} as const

type ProposalActionLocale = keyof typeof proposalActionDict

function getProposalActionLocale(): ProposalActionLocale {
  if (typeof window !== 'undefined') {
    return navigator.language.startsWith('tr') ? 'tr' : 'en'
  }
  return 'tr'
}

export default function ProposalActions({ proposalId, contacts }: ProposalActionsProps) {
  const router = useRouter()
  const locale = getProposalActionLocale()
  const t = proposalActionDict[locale]
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revisionNote, setRevisionNote] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [customerNote, setCustomerNote] = useState('')
  const [signerName, setSignerName] = useState('')
  const [selectedContactId, setSelectedContactId] = useState<string>('')
  const [hasSigned, setHasSigned] = useState(false)
  const [success, setSuccess] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sigCanvasRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [SignatureCanvasComp, setSignatureCanvasComp] = useState<any>(null)

  useEffect(() => {
    import('react-signature-canvas').then((mod) => {
      setSignatureCanvasComp(() => mod.default)
    }).catch(() => {
      // Signature canvas not available — accept will work without signature
    })
  }, [])

  const handleSubmit = async (action: string, body: Record<string, string | undefined>) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/proposals/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId, action, ...body }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || t.operationFailed)
      }
      setSuccess(true)
      setTimeout(() => {
        router.refresh()
        setActiveModal(null)
        setSuccess(false)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorOccurred)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccept = () => {
    if (!signerName.trim()) {
      setError(t.enterFullName)
      return
    }
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
      setError(t.pleaseSign)
      return
    }
    const signatureData = sigCanvasRef.current.getTrimmedCanvas().toDataURL('image/png')

    handleSubmit('ACCEPTED', {
      customerNote: customerNote.trim() || undefined,
      signatureData,
      signerName: signerName.trim(),
      ...(selectedContactId && selectedContactId !== 'other' ? { contactId: selectedContactId } : {}),
    })
  }

  const handleReject = () => handleSubmit('REJECTED', { rejectionReason: rejectionReason.trim() || undefined })

  const handleRevision = () => {
    if (!revisionNote.trim()) {
      setError(t.describeRevision)
      return
    }
    handleSubmit('REVISION_REQUESTED', { revisionNote: revisionNote.trim() })
  }

  const clearSignature = () => {
    sigCanvasRef.current?.clear()
    setHasSigned(false)
  }

  const closeModal = () => {
    if (!isLoading) {
      setActiveModal(null)
      setError(null)
      setRevisionNote('')
      setRejectionReason('')
      setCustomerNote('')
      setSignerName('')
      setSelectedContactId('')
      setHasSigned(false)
      sigCanvasRef.current?.clear()
    }
  }

  return (
    <>
      {/* 3 Buttons in a row */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveModal('accept')}
          disabled={isLoading}
          aria-label={t.acceptAriaLabel}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-2xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 text-sm hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl hover:shadow-emerald-500/30"
        >
          <CheckCircle className="w-4 h-4" />
          <span>{t.accept}</span>
        </button>

        <button
          onClick={() => setActiveModal('revision')}
          disabled={isLoading}
          aria-label={t.revisionAriaLabel}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-2xl hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 text-sm hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl hover:shadow-amber-500/30"
        >
          <RotateCw className="w-4 h-4" />
          <span>{t.revision}</span>
        </button>

        <button
          onClick={() => setActiveModal('reject')}
          disabled={isLoading}
          aria-label={t.rejectAriaLabel}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-2xl hover:from-red-600 hover:to-red-700 transition-all shadow-lg shadow-red-500/25 disabled:opacity-50 text-sm hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl hover:shadow-red-500/30"
        >
          <XCircle className="w-4 h-4" />
          <span>{t.reject}</span>
        </button>
      </div>

      {/* Bottom Sheet Modal — portal to body to escape stacking context from backdrop-blur parent */}
      {activeModal && createPortal(
        <div className="fixed inset-0 z-[60]">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />

          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[85dvh] overflow-hidden animate-slide-up relative">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            {/* Success Overlay */}
            {success && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-t-3xl">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="text-lg font-bold text-gray-900">{t.operationSuccess}</p>
                <p className="text-sm text-gray-500 mt-1">{t.responseSent}</p>
              </div>
            )}

            {/* Header */}
            <div className="px-6 py-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {activeModal === 'accept' && t.acceptProposal}
                {activeModal === 'revision' && t.requestRevision}
                {activeModal === 'reject' && t.rejectProposal}
              </h3>
              <button
                onClick={closeModal}
                disabled={isLoading}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 space-y-4 overflow-y-auto max-h-[60dvh]">
              {error && (
                <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {activeModal === 'accept' && (
                <>
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                    <p className="text-sm text-emerald-800">{t.confirmAccept}</p>
                  </div>

                  {/* Signer Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.signerPerson}</label>
                    {contacts.length > 0 ? (
                      <>
                        <select
                          value={selectedContactId}
                          onChange={(e) => {
                            setSelectedContactId(e.target.value)
                            if (e.target.value && e.target.value !== 'other') {
                              const contact = contacts.find(c => c.id === e.target.value)
                              if (contact) setSignerName(contact.name)
                            } else if (e.target.value === 'other') {
                              setSignerName('')
                            }
                          }}
                          disabled={isLoading}
                          className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50 disabled:opacity-50 appearance-none"
                        >
                          <option value="">{t.selectPerson}</option>
                          {contacts.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name}{c.title ? ` — ${c.title}` : ''}
                            </option>
                          ))}
                          <option value="other">{t.otherManual}</option>
                        </select>
                        {selectedContactId === 'other' && (
                          <input
                            type="text"
                            value={signerName}
                            onChange={(e) => setSignerName(e.target.value)}
                            placeholder={t.enterFullNamePlaceholder}
                            disabled={isLoading}
                            className="w-full mt-2 px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50 disabled:opacity-50"
                          />
                        )}
                      </>
                    ) : (
                      <input
                        type="text"
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        placeholder={t.signerFullName}
                        disabled={isLoading}
                        className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50 disabled:opacity-50"
                      />
                    )}
                  </div>

                  {/* Signature Canvas */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <PenTool className="w-4 h-4" />
                        {t.eSignature}
                      </label>
                      {hasSigned && (
                        <button
                          onClick={clearSignature}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                        >
                          <Eraser className="w-3 h-3" />
                          {t.clear}
                        </button>
                      )}
                    </div>
                    <div className="border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 overflow-hidden relative">
                      {SignatureCanvasComp ? (
                        <SignatureCanvasComp
                          ref={sigCanvasRef}
                          penColor="#1a1a2e"
                          canvasProps={{
                            className: 'w-full',
                            style: { width: '100%', height: '160px' },
                          }}
                          onEnd={() => setHasSigned(true)}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '160px' }} className="flex items-center justify-center">
                          <p className="text-sm text-gray-400">{t.signatureLoading}</p>
                        </div>
                      )}
                      {!hasSigned && SignatureCanvasComp && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <p className="text-sm text-gray-400">{t.signWithFingerOrPen}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Note */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.noteOptional}</label>
                    <textarea
                      value={customerNote}
                      onChange={(e) => setCustomerNote(e.target.value)}
                      placeholder={t.additionalNotes}
                      disabled={isLoading}
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none bg-gray-50 disabled:opacity-50"
                      rows={2}
                    />
                  </div>
                </>
              )}

              {activeModal === 'revision' && (
                <>
                  <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl">
                    <RotateCw className="w-8 h-8 text-amber-500" />
                    <p className="text-sm text-amber-800">{t.specifyChanges}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.revisionRequest}</label>
                    <textarea
                      value={revisionNote}
                      onChange={(e) => setRevisionNote(e.target.value)}
                      placeholder={t.revisionPlaceholder}
                      disabled={isLoading}
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none bg-gray-50 disabled:opacity-50"
                      rows={4}
                    />
                  </div>
                </>
              )}

              {activeModal === 'reject' && (
                <>
                  <div className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl">
                    <XCircle className="w-8 h-8 text-red-500" />
                    <p className="text-sm text-red-800">{t.aboutToReject}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.rejectionReasonOptional}</label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder={t.rejectionPlaceholder}
                      disabled={isLoading}
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none bg-gray-50 disabled:opacity-50"
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 pb-safe">
              <button
                onClick={closeModal}
                disabled={isLoading}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-2xl font-medium text-sm hover:bg-gray-200 disabled:opacity-50"
              >
                {t.cancel}
              </button>
              <button
                onClick={activeModal === 'accept' ? handleAccept : activeModal === 'revision' ? handleRevision : handleReject}
                disabled={isLoading}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white font-semibold rounded-2xl text-sm disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  activeModal === 'accept'
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-xl hover:shadow-emerald-500/30'
                    : activeModal === 'revision'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:shadow-xl hover:shadow-amber-500/30'
                      : 'bg-gradient-to-r from-red-500 to-red-600 hover:shadow-xl hover:shadow-red-500/30'
                }`}
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {activeModal === 'accept' ? t.accept : activeModal === 'revision' ? t.send : t.reject}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  )
}
