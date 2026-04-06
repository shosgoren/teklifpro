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

export default function ProposalActions({ proposalId, contacts }: ProposalActionsProps) {
  const router = useRouter()
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
        throw new Error(data.error?.message || 'İşlem başarısız oldu')
      }
      setSuccess(true)
      setTimeout(() => {
        router.refresh()
        setActiveModal(null)
        setSuccess(false)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccept = () => {
    if (!signerName.trim()) {
      setError('Lütfen ad soyad giriniz')
      return
    }
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
      setError('Lütfen imzanızı atınız')
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
      setError('Lütfen revize talebinizi açıklayınız')
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
          aria-label="Teklifi kabul et"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-2xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 text-sm hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl hover:shadow-emerald-500/30"
        >
          <CheckCircle className="w-4 h-4" />
          <span>Kabul Et</span>
        </button>

        <button
          onClick={() => setActiveModal('revision')}
          disabled={isLoading}
          aria-label="Teklif için revize talep et"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-2xl hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 text-sm hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl hover:shadow-amber-500/30"
        >
          <RotateCw className="w-4 h-4" />
          <span>Revize</span>
        </button>

        <button
          onClick={() => setActiveModal('reject')}
          disabled={isLoading}
          aria-label="Teklifi reddet"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-2xl hover:from-red-600 hover:to-red-700 transition-all shadow-lg shadow-red-500/25 disabled:opacity-50 text-sm hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl hover:shadow-red-500/30"
        >
          <XCircle className="w-4 h-4" />
          <span>Reddet</span>
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
                <p className="text-lg font-bold text-gray-900">İşlem Başarılı!</p>
                <p className="text-sm text-gray-500 mt-1">Yanıtınız iletildi.</p>
              </div>
            )}

            {/* Header */}
            <div className="px-6 py-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {activeModal === 'accept' && 'Teklifi Kabul Et'}
                {activeModal === 'revision' && 'Revize Talep Et'}
                {activeModal === 'reject' && 'Teklifi Reddet'}
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
                    <p className="text-sm text-emerald-800">Teklifi kabul etmek istediğinize emin misiniz?</p>
                  </div>

                  {/* Signer Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">İmzalayan Kişi</label>
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
                          <option value="">Kişi seçiniz...</option>
                          {contacts.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name}{c.title ? ` — ${c.title}` : ''}
                            </option>
                          ))}
                          <option value="other">Diğer (elle giriş)</option>
                        </select>
                        {selectedContactId === 'other' && (
                          <input
                            type="text"
                            value={signerName}
                            onChange={(e) => setSignerName(e.target.value)}
                            placeholder="Ad Soyad giriniz"
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
                        placeholder="İmzalayan kişinin adı soyadı"
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
                        E-İmza
                      </label>
                      {hasSigned && (
                        <button
                          onClick={clearSignature}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                        >
                          <Eraser className="w-3 h-3" />
                          Temizle
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
                          <p className="text-sm text-gray-400">İmza yükleniyor...</p>
                        </div>
                      )}
                      {!hasSigned && SignatureCanvasComp && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <p className="text-sm text-gray-400">Parmağınız veya kaleminizle imzalayın</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Note */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notunuz (Opsiyonel)</label>
                    <textarea
                      value={customerNote}
                      onChange={(e) => setCustomerNote(e.target.value)}
                      placeholder="Ek notlarınız..."
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
                    <p className="text-sm text-amber-800">Lütfen hangi değişiklikleri istediğinizi belirtin.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Revize Talebiniz</label>
                    <textarea
                      value={revisionNote}
                      onChange={(e) => setRevisionNote(e.target.value)}
                      placeholder="Örn: Fiyatları %10 düşürebilir misiniz?"
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
                    <p className="text-sm text-red-800">Teklifi reddetmek üzeresiniz.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reddetme Nedeni (Opsiyonel)</label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Örn: Fiyat fazla, Başka tedarikçi seçtik..."
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
                İptal
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
                {activeModal === 'accept' ? 'Kabul Et' : activeModal === 'revision' ? 'Gönder' : 'Reddet'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  )
}
