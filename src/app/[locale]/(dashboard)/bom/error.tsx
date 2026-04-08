'use client';

import { Button } from '@/shared/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function BomError({ error, reset }: Props) {
  const t = useTranslations('errorPage');

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="p-3 bg-red-100 rounded-full mb-4">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        {t('errorTitle', { page: t('pages.bom') })}
      </h2>
      <p className="text-gray-500 text-sm mb-6 text-center max-w-md">
        {t('errorDescription')}
      </p>
      {process.env.NODE_ENV === 'development' && error.message && (
        <p className="text-xs text-red-600 font-mono mb-4 max-w-lg truncate">
          {error.message}
        </p>
      )}
      <Button onClick={reset} variant="outline" size="sm">
        <RefreshCw className="w-4 h-4 mr-2" />
        {t('retry')}
      </Button>
    </div>
  );
}
