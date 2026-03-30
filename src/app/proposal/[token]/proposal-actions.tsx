'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, RotateCw, XCircle, Loader2, AlertCircle } from 'lucide-react'

interface ProposalActionsProps {
  proposalId: string
}

type ModalType = 'accept' | 'reject' | 'revision' | null

export default function ProposalActions({ proposalId }: ProposalActionsProps) {
  const router = useRouter()
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state for modals
  const [revisionNote, setRevisionNote] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [customerNote, setCustomerNote] = useState('')

  // Handle Accept
  const handleAccept = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/proposals/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId,
          action: 'ACCEPTED',
          customerNote: customerNote.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Teklifin kabulü başarısız oldu')
      }

      // Success - refresh page to show status
      router.refresh()
      setActiveModal(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Reject
  const handleReject = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/proposals/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId,
          action: 'REJECTED',
          rejectionReason: rejectionReason.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Teklifin reddi başarısız oldu')
      }

      // Success - refresh page to show status
      router.refresh()
      setActiveModal(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Revision Request
  const handleRevisionRequest = async () => {
    if (!revisionNote.trim()) {
      setError('Lütfen revize talebinizi açıklayınız')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/proposals/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId,
          action: 'REVISION_REQUESTED',
          revisionNote: revisionNote.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Revize talebiniz gönderilemedi')
      }

      // Success - refresh page to show status
      router.refresh()
      setActiveModal(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const closeModal = () => {
    if (!isLoading) {
      setActiveModal(null)
      setError(null)
      setRevisionNote('')
      setRejectionReason('')
      setCustomerNote('')
    }
  }

  return (
    <>
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch">
        {/* Accept Button */}
        <button
          onClick={() => setActiveModal('accept')}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle className="w-5 h-5" />
          <span>Teklifi Kabul Et</span>
        </button>

        {/* Revision Button */}
        <button
          onClick={() => setActiveModal('revision')}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCw className="w-5 h-5" />
          <span>Revize Talep Et</span>
        </button>

        {/* Reject Button */}
        <button
          onClick={() => setActiveModal('reject')}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <XCircle className="w-5 h-5" />
          <span>Teklifi Reddet</span>
        </button>
      </div>

      {/* Modal Overlay */}
      {activeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-96 overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {activeModal === 'accept' && 'Teklifi Kabul Edin'}
                {activeModal === 'revision' && 'Revize Talep Edin'}
                {activeModal === 'reject' && 'Teklifi Reddedin'}
              </h3>
              <button
                onClick={closeModal}
                disabled={isLoading}
                className="text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Kapat</span>
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              {error && (
                <div className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Accept Modal Content */}
              {activeModal === 'accept' && (
                <>
                  <p className="text-gray-700">
                    Teklifi kabul etmek istediğinizden emin misiniz? Bu işlem
                    geri alınamaz.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notunuz (Opsiyonel)
                    </label>
                    <textarea
                      value={customerNote}
                      onChange={(e) => setCustomerNote(e.target.value)}
                      placeholder="Ek notlarınızı buraya yazabilirsiniz..."
                      disabled={isLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      rows={3}
                    />
                  </div>
                </>
              )}

              {/* Revision Modal Content */}
              {activeModal === 'revision' && (
                <>
                  <p className="text-gray-700">
                    Lütfen ne tür revizyonları talep etmek istediğinizi açıklayınız.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Revize Talebiniz
                    </label>
                    <textarea
                      value={revisionNote}
                      onChange={(e) => setRevisionNote(e.target.value)}
                      placeholder="Örn: Fiyatları % 10 düşürebilir misiniz? Teslim tarihini uzatabilir misiniz?"
                      disabled={isLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      rows={4}
                    />
                  </div>
                </>
              )}

              {/* Reject Modal Content */}
              {activeModal === 'reject' && (
                <>
                  <p className="text-gray-700">
                    Teklifi reddetmek üzeresiniz. Reddetme nedeninizi girmek ister misiniz?
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reddetme Nedeni (Opsiyonel)
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Örn: Fiyat fazla, Başka bir tedarikçi seçtik, vb."
                      disabled={isLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3 justify-end sticky bottom-0">
              <button
                onClick={closeModal}
                disabled={isLoading}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                İptal
              </button>
              <button
                onClick={
                  activeModal === 'accept'
                    ? handleAccept
                    : activeModal === 'revision'
                      ? handleRevisionRequest
                      : handleReject
                }
                disabled={isLoading}
                className={`flex items-center gap-2 px-4 py-2 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  activeModal === 'accept'
                    ? 'bg-green-600 hover:bg-green-700'
                    : activeModal === 'revision'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {activeModal === 'accept'
                    ? 'Kabul Et'
                    : activeModal === 'revision'
                      ? 'Gönder'
                      : 'Reddet'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
