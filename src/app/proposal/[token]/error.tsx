'use client'

import { useMemo } from 'react';

const dictionaries = {
  tr: {
    heading: 'Bir hata oluştu',
    defaultMessage: 'Teklif yüklenirken sorun oluştu.',
    retry: 'Tekrar Dene',
  },
  en: {
    heading: 'An error occurred',
    defaultMessage: 'There was a problem loading the proposal.',
    retry: 'Try Again',
  },
} as const;

type Locale = keyof typeof dictionaries;

function getLocaleFromPath(): Locale {
  if (typeof window === 'undefined') return 'tr';
  const pathLocale = window.location.pathname.split('/')[1];
  return pathLocale === 'en' ? 'en' : 'tr';
}

export default function ProposalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const locale = getLocaleFromPath();
  const t = useMemo(() => dictionaries[locale], [locale]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t.heading}</h2>
        <p className="text-gray-500 mb-4 text-sm">{error.message || t.defaultMessage}</p>
        <button
          onClick={reset}
          className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {t.retry}
        </button>
      </div>
    </div>
  )
}
