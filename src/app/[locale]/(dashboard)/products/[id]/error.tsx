'use client';

import { Button } from '@/shared/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ProductDetailError({ error, reset }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="p-3 bg-red-100 rounded-full mb-4">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Ürün Detayı yüklenirken hata oluştu
      </h2>
      <p className="text-gray-500 text-sm mb-6 text-center max-w-md">
        Sayfa yüklenirken beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.
      </p>
      {process.env.NODE_ENV === 'development' && error.message && (
        <p className="text-xs text-red-600 font-mono mb-4 max-w-lg truncate">
          {error.message}
        </p>
      )}
      <Button onClick={reset} variant="outline" size="sm">
        <RefreshCw className="w-4 h-4 mr-2" />
        Tekrar Dene
      </Button>
    </div>
  );
}
