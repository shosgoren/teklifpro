import { useLocale } from 'next-intl';

export function useCurrency() {
  // For now, return default TRY — in future this will fetch from tenant settings
  const currency = 'TRY';
  const intlLocale = useLocale();
  const locale = intlLocale === 'en' ? 'en-US' : 'tr-TR';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return { currency, locale, formatCurrency };
}
