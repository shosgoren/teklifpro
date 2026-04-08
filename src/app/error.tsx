'use client';

import { Button } from '@/shared/components/ui/button';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo } from 'react';

/**
 * Custom Error Page (Error Boundary)
 *
 * Caught and displayed when an error occurs in the application.
 * Only works as a client component with 'use client'.
 *
 * Props:
 * - error: Error object with the thrown error
 * - reset: Function to reset the error boundary and retry
 */
interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const dictionaries = {
  tr: {
    heading: 'Bir Hata Oluştu',
    description:
      'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyiniz veya ana sayfaya dönüp devam edin.',
    errorDetails: 'Hata Detayları:',
    serverError: '500 - İç Sunucu Hatası',
    retry: 'Tekrar Dene',
    goHome: 'Ana Sayfaya Dön',
    contactPrompt: 'Sorun devam ederse lütfen iletişime geçin',
    contactSupport: 'Destek Ekibine Ulaş',
  },
  en: {
    heading: 'An Error Occurred',
    description:
      'An unexpected error occurred. Please try again or return to the home page.',
    errorDetails: 'Error Details:',
    serverError: '500 - Internal Server Error',
    retry: 'Try Again',
    goHome: 'Go to Home Page',
    contactPrompt: 'If the problem persists, please contact us',
    contactSupport: 'Contact Support',
  },
} as const;

type Locale = keyof typeof dictionaries;

function getLocaleFromPath(): Locale {
  if (typeof window === 'undefined') return 'tr';
  const pathLocale = window.location.pathname.split('/')[1];
  return pathLocale === 'en' ? 'en' : 'tr';
}

export default function ErrorPage({
  error,
  reset,
}: ErrorPageProps): JSX.Element {
  const locale = getLocaleFromPath();
  const t = useMemo(() => dictionaries[locale], [locale]);

  // Log error details for debugging
  useEffect(() => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by error boundary:', {
        name: error.name,
        message: error.message,
        digest: error.digest,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    }

    // Send to error tracking service in production (e.g., Sentry)
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error);
      // Example: logErrorToService(error);
    }
  }, [error]);

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-md mx-auto">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-red-100 rounded-full animate-pulse">
            <AlertCircle
              className="w-16 h-16 text-red-600"
              strokeWidth={1.5}
            />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          {t.heading}
        </h1>

        {/* Description */}
        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
          {t.description}
        </p>

        {/* Error Message (Development Only) */}
        {isDevelopment && error.message && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4 text-left">
            <h2 className="text-sm font-semibold text-red-800 mb-2">
              {t.errorDetails}
            </h2>
            <p className="text-xs text-red-700 font-mono break-words">
              {error.message}
            </p>
            {error.stack && (
              <details className="mt-3">
                <summary className="text-xs font-semibold text-red-800 cursor-pointer hover:text-red-900">
                  Stack Trace
                </summary>
                <pre className="mt-2 text-xs text-red-700 overflow-auto max-h-40 bg-red-100 p-2 rounded border border-red-200">
                  {error.stack}
                </pre>
              </details>
            )}
            {error.digest && (
              <p className="text-xs text-red-600 mt-2">
                <strong>Digest:</strong> {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Error Code - Always Visible */}
        <div className="mb-8 text-sm text-gray-500 font-mono bg-gray-100 py-2 px-4 rounded-lg">
          {t.serverError}
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          {/* Retry Button */}
          <Button
            onClick={reset}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            {t.retry}
          </Button>

          {/* Go Home Button */}
          <Link href="/" className="block">
            <Button
              variant="outline"
              className="w-full text-blue-600 border border-blue-600 hover:bg-blue-50 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              {t.goHome}
            </Button>
          </Link>
        </div>

        {/* Support Info */}
        <div className="mt-10 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-3">
            {t.contactPrompt}
          </p>
          <Link
            href="/contact"
            className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium"
          >
            {t.contactSupport}
          </Link>
        </div>

        {/* Environment Info (Development Only) */}
        {isDevelopment && (
          <div className="mt-6 pt-4 border-t border-gray-200 text-left">
            <p className="text-xs text-gray-500 font-mono">
              Environment: {process.env.NODE_ENV}
            </p>
            <p className="text-xs text-gray-500 font-mono">
              Time: {new Date().toLocaleString(locale === 'en' ? 'en-US' : 'tr-TR')}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
