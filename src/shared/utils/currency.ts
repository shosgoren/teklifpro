/**
 * Para Birimi Yönetim Modülü
 * TeklifPro Multi-Currency Support Utility
 *
 * Desteklenen Para Birimleri:
 * - TRY (Türk Lirası)
 * - USD (ABD Doları)
 * - EUR (Euro)
 * - GBP (İngiliz Sterlini)
 */

// ============================================================================
// SABITLER VE TİP TANIMLARI
// ============================================================================

/**
 * Desteklenen para birimi kodları
 */
export type CurrencyCode = 'TRY' | 'USD' | 'EUR' | 'GBP';

/**
 * Para birimi bilgileri
 */
interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
  decimals: number;
}

/**
 * Döviz kur bilgileri
 */
export interface ExchangeRates {
  base: CurrencyCode;
  date: string;
  rates: Record<CurrencyCode, number>;
}

/**
 * Para birimi hesaplama sonuçları
 */
export interface CurrencyCalculation {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  currency: CurrencyCode;
  formatted: {
    subtotal: string;
    tax: string;
    discount: string;
    total: string;
  };
}

/**
 * Teklif Kalemi Arayüzü
 */
export interface ProposalItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

/**
 * Desteklenen para birimleri ve bilgileri
 */
export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  TRY: {
    code: 'TRY',
    symbol: '₺',
    name: 'Türk Lirası',
    locale: 'tr-TR',
    decimals: 2,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'ABD Doları',
    locale: 'en-US',
    decimals: 2,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'de-DE',
    decimals: 2,
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'İngiliz Sterlini',
    locale: 'en-GB',
    decimals: 2,
  },
} as const;

// ============================================================================
// KACHE VE AYARLAR
// ============================================================================

/**
 * Döviz kurlarının bellek içi kachesi
 * Süresi: 1 saat (3.600.000 ms)
 */
interface CacheEntry {
  rates: ExchangeRates;
  timestamp: number;
}

const CACHE_DURATION = 60 * 60 * 1000; // 1 saat
let ratesCache: CacheEntry | null = null;

/**
 * Fallback döviz kurları (API ulaşılamadığında kullanılır)
 */
const FALLBACK_RATES: ExchangeRates = {
  base: 'TRY',
  date: new Date().toISOString().split('T')[0],
  rates: {
    TRY: 1.0,
    USD: 38.5,
    EUR: 41.2,
    GBP: 48.5,
  },
};

// ============================================================================
// TEMEL PARA BİRİMİ FONKSİYONLARI
// ============================================================================

/**
 * Para birimi sembolü al
 * @param code - Para birimi kodu
 * @returns Para birimi sembolü
 */
export function getCurrencySymbol(code: CurrencyCode): string {
  return SUPPORTED_CURRENCIES[code]?.symbol || code;
}

/**
 * Varsayılan para birimini döndür
 * @returns Varsayılan para birimi (TRY)
 */
export function getDefaultCurrency(): CurrencyCode {
  return 'TRY';
}

/**
 * Para birimi kodunun geçerli olup olmadığını kontrol et
 * @param code - Para birimi kodu
 * @returns Geçerli ise true
 */
export function isValidCurrency(code: unknown): code is CurrencyCode {
  return Object.keys(SUPPORTED_CURRENCIES).includes(code as string);
}

/**
 * Para birimi bilgisini al
 * @param code - Para birimi kodu
 * @returns Para birimi bilgileri
 */
export function getCurrencyInfo(code: CurrencyCode): CurrencyInfo {
  return SUPPORTED_CURRENCIES[code];
}

// ============================================================================
// FORMAT VE PARSE FONKSİYONLARI
// ============================================================================

/**
 * Tutarı para birimine göre biçimlendir
 * Intl.NumberFormat kullanarak yerel formata dönüştürür
 *
 * @param amount - Tutarı (sayı)
 * @param currency - Para birimi kodu
 * @param locale - Yerel ayar (isteğe bağlı)
 * @returns Biçimlendirilmiş para birimi metni
 *
 * @example
 * formatCurrency(1234.56, 'TRY') // "1.234,56 ₺"
 * formatCurrency(1234.56, 'USD') // "$1,234.56"
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode,
  locale?: string
): string {
  try {
    if (!Number.isFinite(amount)) {
      throw new Error('Geçersiz tutarı');
    }

    const currencyInfo = SUPPORTED_CURRENCIES[currency];
    const effectiveLocale = locale || currencyInfo.locale;

    const formatter = new Intl.NumberFormat(effectiveLocale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currencyInfo.decimals,
      maximumFractionDigits: currencyInfo.decimals,
    });

    return formatter.format(amount);
  } catch (error) {
    console.error('Para birimi biçimlendirme hatası:', error);
    return `${amount.toFixed(SUPPORTED_CURRENCIES[currency].decimals)} ${currency}`;
  }
}

/**
 * Biçimlendirilmiş para birimi metnini sayıya dönüştür
 *
 * @param value - Biçimlendirilmiş para birimi metni
 * @param currency - Para birimi kodu
 * @returns Sayısal tutar
 *
 * @example
 * parseCurrency("1.234,56 ₺", 'TRY') // 1234.56
 * parseCurrency("$1,234.56", 'USD') // 1234.56
 */
export function parseCurrency(value: string, currency: CurrencyCode): number {
  try {
    if (!value || typeof value !== 'string') {
      throw new Error('Geçersiz para birimi değeri');
    }

    // Sembol, harf ve işaret dışındaki her şeyi kaldır
    const cleaned = value.replace(/[^\d,.\-]/g, '').trim();

    if (!cleaned) {
      return 0;
    }

    // Binlik ve ondalık ayırıcıları tespit et
    const currencyInfo = SUPPORTED_CURRENCIES[currency];
    const decimalSeparator = currencyInfo.locale === 'tr-TR' ? ',' : '.';
    const thousandSeparator = currencyInfo.locale === 'tr-TR' ? '.' : ',';

    // Binlik ayırıcıyı kaldır ve ondalık ayırıcıyı standardlaştır
    let normalized = cleaned
      .replace(new RegExp(`\\${thousandSeparator}`, 'g'), '')
      .replace(decimalSeparator, '.');

    const amount = parseFloat(normalized);

    if (Number.isNaN(amount)) {
      throw new Error('Para birimi ayrıştırma başarısız');
    }

    return amount;
  } catch (error) {
    console.error('Para birimi ayrıştırma hatası:', error);
    return 0;
  }
}

// ============================================================================
// DÖVIZ KURU FONKSİYONLARI
// ============================================================================

/**
 * TCMB XML'den kur bilgilerini ayrıştır
 *
 * @param xmlText - TCMB XML metni
 * @returns Döviz kurları
 */
function parseTCMBXML(xmlText: string): Record<string, number> {
  const rates: Record<string, number> = { TRY: 1.0 };

  try {
    // Basit XML ayrıştırma (DOM/DOMParser kullanılamadığında)
    const usdMatch = xmlText.match(/<Currency\s+code="USD">[\s\S]*?<ForexBuying>([\d.,]+)<\/ForexBuying>/);
    const eurMatch = xmlText.match(/<Currency\s+code="EUR">[\s\S]*?<ForexBuying>([\d.,]+)<\/ForexBuying>/);
    const gbpMatch = xmlText.match(/<Currency\s+code="GBP">[\s\S]*?<ForexBuying>([\d.,]+)<\/ForexBuying>/);

    if (usdMatch?.[1]) {
      rates.USD = parseFloat(usdMatch[1].replace(',', '.'));
    }
    if (eurMatch?.[1]) {
      rates.EUR = parseFloat(eurMatch[1].replace(',', '.'));
    }
    if (gbpMatch?.[1]) {
      rates.GBP = parseFloat(gbpMatch[1].replace(',', '.'));
    }
  } catch (error) {
    console.error('TCMB XML ayrıştırma hatası:', error);
  }

  return rates;
}

/**
 * Döviz kurlarını TCMB API'sinden al
 * Fallback olarak exchangerate-api kullanılır
 *
 * @param baseCurrency - Temel para birimi (varsayılan: TRY)
 * @returns Döviz kurları
 */
export async function getExchangeRates(
  baseCurrency: CurrencyCode = 'TRY'
): Promise<ExchangeRates> {
  const now = Date.now();

  // Kachede geçerli veriler varsa kullan
  if (
    ratesCache &&
    now - ratesCache.timestamp < CACHE_DURATION &&
    ratesCache.rates.base === baseCurrency
  ) {
    return ratesCache.rates;
  }

  try {
    // TCMB API'sinden deneme yap (TRY için)
    if (baseCurrency === 'TRY') {
      const tcmbResponse = await fetch(
        'https://www.tcmb.gov.tr/kurlar/today.xml',
        { method: 'GET' }
      );

      if (tcmbResponse.ok) {
        const xmlText = await tcmbResponse.text();
        const rates = parseTCMBXML(xmlText);

        const result: ExchangeRates = {
          base: 'TRY',
          date: new Date().toISOString().split('T')[0],
          rates: rates as Record<CurrencyCode, number>,
        };

        // Kachele
        ratesCache = { rates: result, timestamp: now };
        return result;
      }
    }

    // exchangerate-api fallback
    const apiUrl = `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`;
    const response = await fetch(apiUrl, { method: 'GET' });

    if (response.ok) {
      const data = await response.json();

      const result: ExchangeRates = {
        base: baseCurrency,
        date: new Date().toISOString().split('T')[0],
        rates: {
          TRY: data.rates.TRY ?? FALLBACK_RATES.rates.TRY,
          USD: data.rates.USD ?? FALLBACK_RATES.rates.USD,
          EUR: data.rates.EUR ?? FALLBACK_RATES.rates.EUR,
          GBP: data.rates.GBP ?? FALLBACK_RATES.rates.GBP,
        } as Record<CurrencyCode, number>,
      };

      // Kachele
      ratesCache = { rates: result, timestamp: now };
      return result;
    }
  } catch (error) {
    console.error('Döviz kurları alma hatası:', error);
  }

  // Fallback: Kachede olan veriler veya statik değerler
  if (ratesCache?.rates.base === baseCurrency) {
    return ratesCache.rates;
  }

  if (baseCurrency === 'TRY') {
    ratesCache = { rates: FALLBACK_RATES, timestamp: now };
    return FALLBACK_RATES;
  }

  // Diğer para birimleri için temel değerler
  const fallbackResult: ExchangeRates = {
    base: baseCurrency,
    date: new Date().toISOString().split('T')[0],
    rates: {
      TRY: 1.0 / FALLBACK_RATES.rates[baseCurrency],
      USD: FALLBACK_RATES.rates.USD / FALLBACK_RATES.rates[baseCurrency],
      EUR: FALLBACK_RATES.rates.EUR / FALLBACK_RATES.rates[baseCurrency],
      GBP: FALLBACK_RATES.rates.GBP / FALLBACK_RATES.rates[baseCurrency],
    } as Record<CurrencyCode, number>,
  };

  ratesCache = { rates: fallbackResult, timestamp: now };
  return fallbackResult;
}

/**
 * Tutarı bir para biriminden diğerine çevir
 *
 * @param amount - Tutarı
 * @param from - Kaynak para birimi
 * @param to - Hedef para birimi
 * @param rates - Döviz kurları
 * @returns Çevrilmiş tutarı
 *
 * @example
 * const rates = await getExchangeRates('TRY');
 * const usdAmount = convertCurrency(1000, 'TRY', 'USD', rates);
 */
export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: ExchangeRates
): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Geçersiz tutarı');
  }

  // Aynı para birimiyse dönüştürmeye gerek yok
  if (from === to) {
    return amount;
  }

  // Kurlar farklı temel birimiyse uyarı ver
  if (rates.base !== from && rates.base !== 'TRY') {
    console.warn(
      `Döviz kurları ${rates.base} temeline göre, ama ${from} temelinden çevrilmeye çalışılıyor`
    );
  }

  try {
    // TRY temel biriminden dönüştür
    let amountInTRY = amount;
    if (from !== 'TRY') {
      amountInTRY = amount / (rates.rates[from] || 1);
    }

    // TRY'den hedef para birimine dönüştür
    let result = amountInTRY;
    if (to !== 'TRY') {
      result = amountInTRY * (rates.rates[to] || 1);
    }

    return Math.round(result * 100) / 100; // 2 ondalak basamağa yuvarlat
  } catch (error) {
    console.error('Para birimi dönüştürme hatası:', error);
    return amount;
  }
}

// ============================================================================
// HESAPLAMA FONKSİYONLARI
// ============================================================================

/**
 * Para birimi tutarının geçerliliğini doğrula
 *
 * @param amount - Tutarı
 * @param currency - Para birimi kodu
 * @returns Geçerli ise true
 */
export function validateCurrencyAmount(
  amount: number,
  currency: CurrencyCode
): boolean {
  // Para biriminin desteklenip desteklenmediğini kontrol et
  if (!isValidCurrency(currency)) {
    return false;
  }

  // Tutarın sayı olup olmadığını kontrol et
  if (!Number.isFinite(amount)) {
    return false;
  }

  // Tutarın negatif olmadığını kontrol et
  if (amount < 0) {
    return false;
  }

  return true;
}

/**
 * Teklif kalemleri üzerinde hesaplamalar yap
 *
 * @param items - Teklif kalemleri
 * @param currency - Para birimi
 * @param taxRate - Vergi oranı (varsayılan: 0.18)
 * @param discountRate - İndirim oranı (varsayılan: 0)
 * @returns Hesaplama sonuçları
 *
 * @example
 * const items = [
 *   { id: '1', description: 'Ürün A', quantity: 2, unitPrice: 100 },
 *   { id: '2', description: 'Ürün B', quantity: 1, unitPrice: 500 }
 * ];
 * const result = calculateWithCurrency(items, 'TRY');
 */
export function calculateWithCurrency(
  items: ProposalItem[],
  currency: CurrencyCode,
  taxRate: number = 0.18,
  discountRate: number = 0
): CurrencyCalculation {
  if (!validateCurrencyAmount(0, currency)) {
    throw new Error('Geçersiz para birimi');
  }

  // Ara toplam hesapla
  let subtotal = 0;
  for (const item of items) {
    if (!item.quantity || !item.unitPrice) {
      continue;
    }

    const itemTotal = item.quantity * item.unitPrice;
    const itemDiscount = item.discount || 0;
    subtotal += itemTotal - itemDiscount;
  }

  // İndirim hesapla (teklif seviyesi)
  const discount = subtotal * discountRate;
  const subtotalAfterDiscount = subtotal - discount;

  // Vergi hesapla
  const tax = subtotalAfterDiscount * taxRate;

  // Toplam hesapla
  const total = subtotalAfterDiscount + tax;

  return {
    subtotal,
    tax,
    discount,
    total,
    currency,
    formatted: {
      subtotal: formatCurrency(subtotal, currency),
      tax: formatCurrency(tax, currency),
      discount: formatCurrency(discount, currency),
      total: formatCurrency(total, currency),
    },
  };
}

// ============================================================================
// YARDIMCI FONKSİYONLARI
// ============================================================================

/**
 * Tüm desteklenen para birimlerin listesini al
 *
 * @returns Para birimi kodları
 */
export function getAllCurrencyCodes(): CurrencyCode[] {
  return Object.keys(SUPPORTED_CURRENCIES) as CurrencyCode[];
}

/**
 * Tüm desteklenen para birimlerin bilgilerini al
 *
 * @returns Para birimi bilgileri dizisi
 */
export function getAllCurrencies(): CurrencyInfo[] {
  return Object.values(SUPPORTED_CURRENCIES);
}

/**
 * Kachede saklanan döviz kurlarını temizle
 */
export function clearRatesCache(): void {
  ratesCache = null;
}
