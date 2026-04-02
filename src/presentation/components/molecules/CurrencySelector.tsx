'use client';

import React, { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  CurrencyCode,
  SUPPORTED_CURRENCIES,
  getCurrencyInfo,
  getExchangeRates,
  ExchangeRates,
  convertCurrency,
} from '@/shared/utils/currency';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('CurrencySelector');

/**
 * Para Birimi Seçici Bileşeni
 *
 * Özellikler:
 * - Dörtlü para biriminin seçilmesi (TRY, USD, EUR, GBP)
 * - Bayrak emoji + kod + sembol gösterimi
 * - İsteğe bağlı döviz kuru gösterimi
 * - Responsive ve Tailwind CSS desteği
 * - Turkish labeling
 */

interface CurrencySelectorProps {
  /** Seçili para birimi kodu */
  value: CurrencyCode;
  /** Para birimi değiştiğinde çağrılan callback */
  onChange: (code: CurrencyCode) => void;
  /** Döviz kurunu göster (varsayılan: false) */
  showRate?: boolean;
  /** Select bileşeninin devre dışı durumu */
  disabled?: boolean;
  /** CSS sınıfı */
  className?: string;
}

/**
 * Para Birimi Seçici Bileşeni
 *
 * @example
 * ```tsx
 * <CurrencySelector
 *   value="TRY"
 *   onChange={(code) => setCurrency(code)}
 *   showRate={true}
 * />
 * ```
 */
export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  value,
  onChange,
  showRate = false,
  disabled = false,
  className = '',
}) => {
  // Döviz kurları durumu
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Döviz kurlarını yükle
   */
  useEffect(() => {
    if (!showRate) {
      return;
    }

    const fetchRates = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedRates = await getExchangeRates('TRY');
        setRates(fetchedRates);
      } catch (err) {
        logger.error('Doviz kurlari yuklenemedi', err);
        setError('Döviz kurları yüklenemedi');
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
  }, [showRate]);

  /**
   * Para birimi para bayrağı ve metni oluştur
   */
  const getCurrencyLabel = (code: CurrencyCode): string => {
    const flags: Record<CurrencyCode, string> = {
      TRY: '🇹🇷',
      USD: '🇺🇸',
      EUR: '🇪🇺',
      GBP: '🇬🇧',
    };

    const info = getCurrencyInfo(code);
    return `${flags[code]} ${code} ${info.symbol}`;
  };

  /**
   * Para biriminin döviz kurunu al
   */
  const getExchangeRateLabel = (code: CurrencyCode): string => {
    if (!showRate || code === 'TRY' || !rates) {
      return '';
    }

    if (loading) {
      return '...';
    }

    if (error) {
      return '';
    }

    try {
      // TRY'den hedef para birimine dönüştür (1 TRY = ? target)
      const rate = convertCurrency(1, 'TRY', code, rates);
      const currencyInfo = getCurrencyInfo(code);

      return `(1 ₺ = ${rate.toFixed(4)} ${code})`;
    } catch (err) {
      logger.error('Doviz kuru hesaplanamadi', err);
      return '';
    }
  };

  /**
   * Para birimi seçeneğini oluştur
   */
  const renderCurrencyOption = (code: CurrencyCode): React.ReactNode => {
    const label = getCurrencyLabel(code);
    const rateLabel = getExchangeRateLabel(code);

    if (rateLabel) {
      return (
        <div className="flex items-center justify-between w-full gap-2">
          <span>{label}</span>
          <span className="text-xs text-gray-500">{rateLabel}</span>
        </div>
      );
    }

    return label;
  };

  // Seçili para biriminin bilgileri
  const selectedLabel = getCurrencyLabel(value);
  const selectedRateLabel = getExchangeRateLabel(value);

  return (
    <div className={`w-full ${className}`}>
      <Select
        value={value}
        onValueChange={(code) => onChange(code as CurrencyCode)}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Para birimini seç">
            <div className="flex items-center justify-between gap-2">
              <span>{selectedLabel}</span>
              {showRate && selectedRateLabel && (
                <span className="text-xs text-gray-500 ml-auto">
                  {selectedRateLabel}
                </span>
              )}
            </div>
          </SelectValue>
        </SelectTrigger>

        <SelectContent className="w-full min-w-[250px]">
          {/* TRY Seçeneği */}
          <SelectItem value="TRY">
            <div className="flex items-center gap-2">
              <span>{getCurrencyLabel('TRY')}</span>
              {showRate && (
                <span className="text-xs text-gray-500">
                  (Temel para birimi)
                </span>
              )}
            </div>
          </SelectItem>

          {/* USD Seçeneği */}
          <SelectItem value="USD">
            <div className="flex items-center justify-between gap-3 w-full">
              <span>{getCurrencyLabel('USD')}</span>
              {showRate && rates && !loading && !error && (
                <span className="text-xs text-gray-500">
                  (1 ₺ = {convertCurrency(1, 'TRY', 'USD', rates).toFixed(4)} $)
                </span>
              )}
              {loading && (
                <span className="text-xs text-gray-400 animate-pulse">...</span>
              )}
            </div>
          </SelectItem>

          {/* EUR Seçeneği */}
          <SelectItem value="EUR">
            <div className="flex items-center justify-between gap-3 w-full">
              <span>{getCurrencyLabel('EUR')}</span>
              {showRate && rates && !loading && !error && (
                <span className="text-xs text-gray-500">
                  (1 ₺ = {convertCurrency(1, 'TRY', 'EUR', rates).toFixed(4)} €)
                </span>
              )}
              {loading && (
                <span className="text-xs text-gray-400 animate-pulse">...</span>
              )}
            </div>
          </SelectItem>

          {/* GBP Seçeneği */}
          <SelectItem value="GBP">
            <div className="flex items-center justify-between gap-3 w-full">
              <span>{getCurrencyLabel('GBP')}</span>
              {showRate && rates && !loading && !error && (
                <span className="text-xs text-gray-500">
                  (1 ₺ = {convertCurrency(1, 'TRY', 'GBP', rates).toFixed(4)} £)
                </span>
              )}
              {loading && (
                <span className="text-xs text-gray-400 animate-pulse">...</span>
              )}
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Döviz Kuru Yükleme Durumu */}
      {showRate && loading && (
        <p className="text-xs text-gray-400 mt-2 animate-pulse">
          Döviz kurları güncelleniyor...
        </p>
      )}

      {/* Hata Mesajı */}
      {showRate && error && (
        <p className="text-xs text-red-500 mt-2">{error}</p>
      )}

      {/* Kur Bilgisi Göster */}
      {showRate && rates && !loading && !error && value !== 'TRY' && (
        <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-gray-600 border border-blue-100">
          <p className="font-medium mb-1">
            Güncellenme: {rates.date}
          </p>
          <p>
            1 {getCurrencyInfo(value).symbol} = {convertCurrency(1, value, 'TRY', rates).toFixed(2)} ₺
          </p>
        </div>
      )}
    </div>
  );
};

export default CurrencySelector;
