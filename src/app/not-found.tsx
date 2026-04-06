'use client';

import { Button } from '@/shared/components/ui/button';
import { Link } from '@/presentation/components/atoms/Link';
import { FileQuestion } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * Custom 404 Not Found Page
 *
 * Displayed when a page is not found in the application.
 * Provides helpful navigation options to redirect the user.
 */
export default function NotFoundPage(): JSX.Element {
  const router = useRouter();

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
          Sayfa Bulunamadı
        </h1>

        {/* Description */}
        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
          Aradığınız sayfa mevcut değil veya taşınmış olabilir. Lütfen ana
          sayfaya dönüp devam edin.
        </p>

        {/* Error Code */}
        <div className="mb-8 text-sm text-gray-500 font-mono bg-gray-100 py-2 px-4 rounded-lg">
          404 - Sayfa Bulunamadı
        </div>

        {/* Primary Button */}
        <Button
          onClick={handleGoHome}
          className="w-full mb-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
        >
          Ana Sayfaya Dön
        </Button>

        {/* Secondary Button */}
        <Button
          onClick={handleGoDashboard}
          variant="outline"
          className="w-full text-blue-600 border border-blue-600 hover:bg-blue-50 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
        >
          Dashboard'a Git
        </Button>

        {/* Helpful Links */}
        <div className="mt-10 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-4">Yardıma mı ihtiyacınız var?</p>
          <div className="space-y-2">
            <Link
              href="/help"
              className="block text-blue-600 hover:text-blue-800 hover:underline text-sm"
            >
              Yardım Merkezi
            </Link>
            <Link
              href="/contact"
              className="block text-blue-600 hover:text-blue-800 hover:underline text-sm"
            >
              İletişim
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
