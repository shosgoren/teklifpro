'use client'

export default function ProposalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Bir hata oluştu</h2>
        <p className="text-gray-500 mb-4 text-sm">{error.message || 'Teklif yüklenirken sorun oluştu.'}</p>
        <button
          onClick={reset}
          className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  )
}
