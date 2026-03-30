import {
  formatCurrency,
  parseCurrency,
  convertCurrency,
  getCurrencySymbol,
  getDefaultCurrency,
  validateCurrencyAmount,
  calculateWithCurrency,
} from '@/shared/utils/currency';

describe('Currency Utilities', () => {
  // Para birimi formatlama testleri
  describe('formatCurrency', () => {
    it('Türk Lirası (TRY) formatını doğru uygulamalı', () => {
      expect(formatCurrency(1234.56, 'TRY')).toBe('₺1.234,56');
      expect(formatCurrency(1000, 'TRY')).toBe('₺1.000,00');
    });

    it('Amerikan Doları (USD) formatını doğru uygulamalı', () => {
      expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
      expect(formatCurrency(1000, 'USD')).toBe('$1,000.00');
    });

    it('Euro (EUR) formatını doğru uygulamalı', () => {
      expect(formatCurrency(1234.56, 'EUR')).toBe('€1.234,56');
      expect(formatCurrency(1000, 'EUR')).toBe('€1.000,00');
    });

    it('Sıfır değer düzgün biçimlenmeli', () => {
      expect(formatCurrency(0, 'TRY')).toBe('₺0,00');
      expect(formatCurrency(0, 'USD')).toBe('$0.00');
    });

    it('Çok büyük sayıları biçimlendirmeli', () => {
      expect(formatCurrency(1000000, 'TRY')).toBe('₺1.000.000,00');
      expect(formatCurrency(1000000, 'USD')).toBe('$1,000,000.00');
    });

    it('Negatif değerleri işlemli', () => {
      const tryResult = formatCurrency(-1234.56, 'TRY');
      const usdResult = formatCurrency(-1234.56, 'USD');
      expect(tryResult).toContain('-');
      expect(usdResult).toContain('-');
    });

    it('Ondalık sayıları doğru yuvarlama', () => {
      expect(formatCurrency(10.556, 'TRY')).toBe('₺10,56');
      expect(formatCurrency(10.554, 'TRY')).toBe('₺10,55');
    });

    it('Çok küçük ondalık değerleri işlemli', () => {
      expect(formatCurrency(0.01, 'TRY')).toBe('₺0,01');
      expect(formatCurrency(0.1, 'USD')).toBe('$0.10');
    });
  });

  // Para birimi ayrıştırma testleri
  describe('parseCurrency', () => {
    it('Türk Lirası formatını ayrıştırmalı', () => {
      expect(parseCurrency('₺1.234,56', 'TRY')).toBe(1234.56);
      expect(parseCurrency('₺1.000,00', 'TRY')).toBe(1000);
    });

    it('Amerikan Doları formatını ayrıştırmalı', () => {
      expect(parseCurrency('$1,234.56', 'USD')).toBe(1234.56);
      expect(parseCurrency('$1,000.00', 'USD')).toBe(1000);
    });

    it('Euro formatını ayrıştırmalı', () => {
      expect(parseCurrency('€1.234,56', 'EUR')).toBe(1234.56);
      expect(parseCurrency('€1.000,00', 'EUR')).toBe(1000);
    });

    it('Sembol olmayan metni işlemli', () => {
      expect(parseCurrency('1234.56', 'USD')).toBe(1234.56);
      expect(parseCurrency('1.234,56', 'TRY')).toBe(1234.56);
    });

    it('Negatif değerleri doğru ayrıştırmalı', () => {
      expect(parseCurrency('-₺1.234,56', 'TRY')).toBe(-1234.56);
      expect(parseCurrency('-$1,234.56', 'USD')).toBe(-1234.56);
    });

    it('Boşluk içeren metni işlemli', () => {
      expect(parseCurrency('₺ 1.234,56', 'TRY')).toBe(1234.56);
      expect(parseCurrency('$ 1,234.56', 'USD')).toBe(1234.56);
    });

    it('Geçersiz metni işlemli (NaN döndermeli)', () => {
      expect(isNaN(parseCurrency('abc', 'TRY'))).toBe(true);
    });

    it('Sıfırı doğru ayrıştırmalı', () => {
      expect(parseCurrency('₺0,00', 'TRY')).toBe(0);
      expect(parseCurrency('$0.00', 'USD')).toBe(0);
    });
  });

  // Para birimi dönüştürme testleri
  describe('convertCurrency', () => {
    it('TRY\'den USD\'ye dönüştürmeli', () => {
      // 1000 TRY -> ~35 USD (örnek kur)
      const result = convertCurrency(1000, 'TRY', 'USD');
      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe('number');
    });

    it('USD\'den EUR\'ye dönüştürmeli', () => {
      const result = convertCurrency(100, 'USD', 'EUR');
      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe('number');
    });

    it('Aynı para birimine dönüştürme orijinal değer döndürmeli', () => {
      expect(convertCurrency(1000, 'TRY', 'TRY')).toBe(1000);
      expect(convertCurrency(500, 'USD', 'USD')).toBe(500);
    });

    it('Sıfır tutarı işlemli', () => {
      expect(convertCurrency(0, 'TRY', 'USD')).toBe(0);
    });

    it('Negatif tutarı işlemli', () => {
      const result = convertCurrency(-1000, 'TRY', 'USD');
      expect(result).toBeLessThan(0);
    });

    it('Çok büyük tutarları işlemli', () => {
      const result = convertCurrency(1000000, 'TRY', 'USD');
      expect(result).toBeGreaterThan(0);
      expect(isFinite(result)).toBe(true);
    });

    it('Ondalık tutarları korumali', () => {
      const result = convertCurrency(99.99, 'USD', 'EUR');
      expect(typeof result).toBe('number');
      expect(isNaN(result)).toBe(false);
    });

    it('Kur oranları makul olmalı (TRY > USD)', () => {
      const result = convertCurrency(100, 'TRY', 'USD');
      expect(result).toBeLessThan(100);
    });
  });

  // Para birimi sembolü alma testleri
  describe('getCurrencySymbol', () => {
    it('TRY sembolü ₺ döndürmeli', () => {
      expect(getCurrencySymbol('TRY')).toBe('₺');
    });

    it('USD sembolü $ döndürmeli', () => {
      expect(getCurrencySymbol('USD')).toBe('$');
    });

    it('EUR sembolü € döndürmeli', () => {
      expect(getCurrencySymbol('EUR')).toBe('€');
    });

    it('GBP sembolü £ döndürmeli', () => {
      expect(getCurrencySymbol('GBP')).toBe('£');
    });

    it('JPY sembolü ¥ döndürmeli', () => {
      expect(getCurrencySymbol('JPY')).toBe('¥');
    });

    it('Geçersiz para birimi işlemli', () => {
      const result = getCurrencySymbol('INVALID');
      expect(typeof result).toBe('string');
    });

    it('Küçük harfleri işlemli', () => {
      expect(getCurrencySymbol('try')).toBe('₺');
      expect(getCurrencySymbol('usd')).toBe('$');
    });
  });

  // Varsayılan para birimi alma testleri
  describe('getDefaultCurrency', () => {
    it('Varsayılan para birimi TRY döndürmeli', () => {
      expect(getDefaultCurrency()).toBe('TRY');
    });

    it('TRY sembolü ₺ döndürmeli', () => {
      const symbol = getCurrencySymbol(getDefaultCurrency());
      expect(symbol).toBe('₺');
    });

    it('Tutarlı değer döndürmeli', () => {
      const cur1 = getDefaultCurrency();
      const cur2 = getDefaultCurrency();
      expect(cur1).toBe(cur2);
    });
  });

  // Para birimi tutarı doğrulama testleri
  describe('validateCurrencyAmount', () => {
    it('Pozitif sayıları geçerli kabul etmeli', () => {
      expect(validateCurrencyAmount(100)).toBe(true);
      expect(validateCurrencyAmount(0.01)).toBe(true);
    });

    it('Sıfırı geçerli kabul etmeli', () => {
      expect(validateCurrencyAmount(0)).toBe(true);
    });

    it('Negatif sayıları reddetmeli', () => {
      expect(validateCurrencyAmount(-100)).toBe(false);
      expect(validateCurrencyAmount(-0.01)).toBe(false);
    });

    it('Sonsuzu reddetmeli', () => {
      expect(validateCurrencyAmount(Infinity)).toBe(false);
      expect(validateCurrencyAmount(-Infinity)).toBe(false);
    });

    it('NaN\'ı reddetmeli', () => {
      expect(validateCurrencyAmount(NaN)).toBe(false);
    });

    it('Çok büyük sonlu sayıları geçerli kabul etmeli', () => {
      expect(validateCurrencyAmount(1000000000)).toBe(true);
    });

    it('Ondalık sayıları geçerli kabul etmeli', () => {
      expect(validateCurrencyAmount(123.456789)).toBe(true);
    });

    it('Çok küçük ondalık sayıları geçerli kabul etmeli', () => {
      expect(validateCurrencyAmount(0.001)).toBe(true);
    });
  });

  // Formatlanmış çıktılı hesaplama testleri
  describe('calculateWithCurrency', () => {
    it('Basit toplama yapmalı ve formatlamalı', () => {
      const result = calculateWithCurrency(100, 'add', 50, 'TRY');
      expect(result).toContain('₺');
      expect(result).toContain('150');
    });

    it('Çıkartma yapmalı ve formatlamalı', () => {
      const result = calculateWithCurrency(100, 'subtract', 30, 'TRY');
      expect(result).toContain('₺');
      expect(result).toContain('70');
    });

    it('Çarpma yapmalı ve formatlamalı', () => {
      const result = calculateWithCurrency(100, 'multiply', 2, 'USD');
      expect(result).toContain('$');
      expect(result).toContain('200');
    });

    it('Bölme yapmalı ve formatlamalı', () => {
      const result = calculateWithCurrency(100, 'divide', 2, 'EUR');
      expect(result).toContain('€');
      expect(result).toContain('50');
    });

    it('Sıfıra bölme işlemli', () => {
      const result = calculateWithCurrency(100, 'divide', 0, 'TRY');
      expect(typeof result).toBe('string');
    });

    it('Negatif sonuç işlemli', () => {
      const result = calculateWithCurrency(30, 'subtract', 100, 'TRY');
      expect(result).toContain('-');
      expect(result).toContain('70');
    });

    it('Ondalık sonuç formatlamalı', () => {
      const result = calculateWithCurrency(100, 'divide', 3, 'USD');
      expect(result).toContain('$');
      expect(result).toContain('33');
    });

    it('Büyük sayılarla çalışmalı', () => {
      const result = calculateWithCurrency(1000000, 'multiply', 2, 'TRY');
      expect(result).toContain('₺');
      expect(result).toContain('2.000.000');
    });
  });
});
