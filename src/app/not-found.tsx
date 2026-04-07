'use client';

import { useMemo } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Link } from '@/presentation/components/atoms/Link';
import { FileQuestion } from 'lucide-react';
import { useRouter } from 'next/navigation';

const translations: Record<string, Record<string, string>> = {
  tr: {
    heading: 'Sayfa Bulunamad\u0131',
    description: 'Arad\u0131\u011f\u0131n\u0131z sayfa mevcut de\u011fil veya ta\u015f\u0131nm\u0131\u015f olabilir. L\u00fctfen ana sayfaya d\u00f6n\u00fcp devam edin.',
    errorCode: '404 - Sayfa Bulunamad\u0131',
    goHome: 'Ana Sayfaya D\u00f6n',
    goDashboard: "Dashboard'a Git",
    needHelp: 'Yard\u0131ma m\u0131 ihtiyac\u0131n\u0131z var?',
    helpCenter: 'Yard\u0131m Merkezi',
    contact: '\u0130leti\u015fim',
  },
  en: {
    heading: 'Page Not Found',
    description: 'The page you are looking for does not exist or may have been moved. Please return to the home page to continue.',
    errorCode: '404 - Page Not Found',
    goHome: 'Go to Home Page',
    goDashboard: 'Go to Dashboard',
    needHelp: 'Need help?',
    helpCenter: 'Help Center',
    contact: 'Contact',
  },
};

function detectLocale(): string {
  if (typeof window === 'undefined') return 'tr';
  const path = window.location.pathname;
  if (path.startsWith('/en')) return 'en';
  return 'tr';
}

/**
 * Custom 404 Not Found Page
 *
 * Displayed when a page is not found in the application.
 * Provides helpful navigation options to redirect the user.
 */
export default function NotFoundPage(): JSX.Element {
  const router = useRouter();
  const locale = useMemo(detectLocale, []);
  const t = (key: string) => translations[locale]?.[key] ?? translations.tr[key] ?? key;

  const handleGoHome = (): void => {
    router.push('/');
  };

  const handleGoDashboard = (): void => {
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-md mx-auto">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-blue-100 rounded-full">
            <FileQuestion
              className="w-16 h-16 text-blue-600"
              strokeWidth={1.5}
            />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          {t('heading')}
        </h1>

        {/* Description */}
        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
          {t('description')}
        </p>

        {/* Error Code */}
        <div className="mb-8 text-sm text-gray-500 font-mono bg-gray-100 py-2 px-4 rounded-lg">
          {t('errorCode')}
        </div>

        {/* Primary Button */}
        <Button
          onClick={handleGoHome}
          className="w-full mb-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
        >
          {t('goHome')}
        </Button>

        {/* Secondary Button */}
        <Button
          onClick={handleGoDashboard}
          variant="outline"
          className="w-full text-blue-600 border border-blue-600 hover:bg-blue-50 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
        >
          {t('goDashboard')}
        </Button>

        {/* Helpful Links */}
        <div className="mt-10 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-4">{t('needHelp')}</p>
          <div className="space-y-2">
            <Link
              href="/help"
              className="block text-blue-600 hover:text-blue-800 hover:underline text-sm"
            >
              {t('helpCenter')}
            </Link>
            <Link
              href="/contact"
              className="block text-blue-600 hover:text-blue-800 hover:underline text-sm"
            >
              {t('contact')}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
