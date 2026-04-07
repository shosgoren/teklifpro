export function useCurrency() {
  // For now, return default TRY — in future this will fetch from tenant settings
  const currency = 'TRY';
  const locale = 'tr-TR';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return { currency, locale, formatCurrency };
}
