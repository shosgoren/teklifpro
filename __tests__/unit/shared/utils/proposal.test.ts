import {
  generateProposalNumber,
  generatePublicToken,
  formatCurrency,
  calculateLineTotal,
  calculateProposalTotals,
} from '@/shared/utils/proposal';

describe('Proposal Utilities', () => {
  // Teklif numarası oluşturma testleri
  describe('generateProposalNumber', () => {
    it('Belirtilen formatta teklif numarası oluşturmalıdır: TKL-YYYYMM-XXXX', () => {
      const proposalNumber = generateProposalNumber();
      const regex = /^TKL-\d{6}-\d{4}$/;
      expect(proposalNumber).toMatch(regex);
    });

    it('Oluşturulan numarada geçerli yıl-ay bilgisi içermeli', () => {
      const proposalNumber = generateProposalNumber();
      const now = new Date();
      const currentYearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      expect(proposalNumber).toContain(currentYearMonth);
    });

    it('Her çağrıda farklı numara oluşturmalıdır', () => {
      const num1 = generateProposalNumber();
      const num2 = generateProposalNumber();
      expect(num1).not.toBe(num2);
    });

    it('Numarada sıra numarası son 4 basamakta olmalı', () => {
      const proposalNumber = generateProposalNumber();
      const parts = proposalNumber.split('-');
      const sequenceNumber = parts[2];
      expect(parseInt(sequenceNumber, 10)).toBeGreaterThanOrEqual(0);
      expect(parseInt(sequenceNumber, 10)).toBeLessThanOrEqual(9999);
    });
  });

  // Herkese açık token oluşturma testleri
  describe('generatePublicToken', () => {
    it('24 karakterli token oluşturmalıdır', () => {
      const token = generatePublicToken();
      expect(token).toHaveLength(24);
    });

    it('Alphanumerik karakterlerden oluşmalıdır', () => {
      const token = generatePublicToken();
      const alphanumericRegex = /^[a-zA-Z0-9]+$/;
      expect(token).toMatch(alphanumericRegex);
    });

    it('Her çağrıda farklı token oluşturmalıdır', () => {
      const token1 = generatePublicToken();
      const token2 = generatePublicToken();
      expect(token1).not.toBe(token2);
    });

    it('Özel karakterler içermemeli', () => {
      for (let i = 0; i < 10; i++) {
        const token = generatePublicToken();
        expect(token).not.toMatch(/[!@#$%^&*()_+=\[\]{};':"\\|,.<>\/?]/);
      }
    });
  });

  // Para birimi formatlama testleri
  describe('formatCurrency', () => {
    it('Türk Lirası olarak düzgün biçimlendirilmelidir', () => {
      expect(formatCurrency(1234.56, 'TRY')).toBe('₺1.234,56');
      expect(formatCurrency(1000, 'TRY')).toBe('₺1.000,00');
      expect(formatCurrency(0.5, 'TRY')).toBe('₺0,50');
    });

    it('Sıfır değeri işlenmeli', () => {
      expect(formatCurrency(0, 'TRY')).toBe('₺0,00');
    });

    it('Büyük sayılar doğru biçimlenmeli', () => {
      expect(formatCurrency(1000000, 'TRY')).toBe('₺1.000.000,00');
      expect(formatCurrency(999999.99, 'TRY')).toBe('₺999.999,99');
    });

    it('Küçük ondalık değerler biçimlendirilmeli', () => {
      expect(formatCurrency(0.01, 'TRY')).toBe('₺0,01');
      expect(formatCurrency(0.1, 'TRY')).toBe('₺0,10');
    });

    it('Negatif değerler işlenmeli', () => {
      const result = formatCurrency(-1234.56, 'TRY');
      expect(result).toContain('-');
      expect(result).toContain('₺');
    });

    it('Çok küçük ondalık sayılar yuvarlanmalı', () => {
      expect(formatCurrency(10.555, 'TRY')).toBe('₺10,56');
      expect(formatCurrency(10.554, 'TRY')).toBe('₺10,55');
    });
  });

  // Satır toplamı hesaplama testleri
  describe('calculateLineTotal', () => {
    it('Quantity * unitPrice hesaplaması yapmalıdır', () => {
      // Miktar: 5, Birim Fiyat: 100 => 500
      expect(calculateLineTotal(5, 100, 0)).toBe(500);
    });

    it('İndirim yüzdesini uygulamalıdır', () => {
      // Miktar: 10, Birim Fiyat: 100, İndirim: 10% => (10 * 100) * (1 - 10/100) = 900
      expect(calculateLineTotal(10, 100, 10)).toBe(900);
    });

    it('%20 indirim doğru hesaplanmalı', () => {
      // Miktar: 100, Birim Fiyat: 50, İndirim: 20% => (100 * 50) * 0.8 = 4000
      expect(calculateLineTotal(100, 50, 20)).toBe(4000);
    });

    it('İndirim sıfır iken toplam fiyat hesaplanmalı', () => {
      expect(calculateLineTotal(5, 100, 0)).toBe(500);
    });

    it('Ondalık sayılarla çalışmalı', () => {
      // Miktar: 2.5, Birim Fiyat: 50.5, İndirim: 5%
      const result = calculateLineTotal(2.5, 50.5, 5);
      expect(result).toBeCloseTo(119.9375);
    });

    it('Miktar sıfır iken sıfır döndürmeli', () => {
      expect(calculateLineTotal(0, 100, 10)).toBe(0);
    });

    it('Birim fiyat sıfır iken sıfır döndürmeli', () => {
      expect(calculateLineTotal(10, 0, 10)).toBe(0);
    });

    it('Negatif indirim (artış) işlemli', () => {
      // Miktar: 10, Birim Fiyat: 100, "İndirim": -10% => (10 * 100) * 1.1 = 1100
      expect(calculateLineTotal(10, 100, -10)).toBe(1100);
    });

    it('%100 indirim sıfır sonuç vermeli', () => {
      expect(calculateLineTotal(10, 100, 100)).toBe(0);
    });
  });

  // Teklif toplamları hesaplama testleri
  describe('calculateProposalTotals', () => {
    it('Boş ürün listesiyle toplam sıfır olmalı', () => {
      const result = calculateProposalTotals([], 0);
      expect(result.subtotal).toBe(0);
      expect(result.tax).toBe(0);
      expect(result.discount).toBe(0);
      expect(result.grandTotal).toBe(0);
    });

    it('Tek ürünle doğru toplam hesaplamalı', () => {
      const items = [
        { quantity: 2, unitPrice: 100, discount: 0 },
      ];
      const result = calculateProposalTotals(items, 0);
      // Subtotal: 200
      // Tax (KDV 20%): 40
      // Grand Total: 240
      expect(result.subtotal).toBe(200);
      expect(result.tax).toBe(40);
      expect(result.discount).toBe(0);
      expect(result.grandTotal).toBe(240);
    });

    it('Çok ürünle toplamları doğru hesaplamalı', () => {
      const items = [
        { quantity: 2, unitPrice: 100, discount: 0 },
        { quantity: 1, unitPrice: 200, discount: 0 },
        { quantity: 5, unitPrice: 50, discount: 0 },
      ];
      // Toplam: 200 + 200 + 250 = 650
      const result = calculateProposalTotals(items, 0);
      expect(result.subtotal).toBe(650);
      expect(result.tax).toBe(130); // 650 * 0.2
      expect(result.grandTotal).toBe(780);
    });

    it('KDV %20 oranında hesaplanmalı', () => {
      const items = [
        { quantity: 1, unitPrice: 1000, discount: 0 },
      ];
      const result = calculateProposalTotals(items, 0);
      expect(result.tax).toBe(200); // 1000 * 0.2
    });

    it('İndirim tutarını doğru hesaplamalı', () => {
      const items = [
        { quantity: 1, unitPrice: 100, discount: 0 },
      ];
      // Genel indirim: 50 TL
      const result = calculateProposalTotals(items, 50);
      expect(result.subtotal).toBe(100);
      expect(result.discount).toBe(50);
      // (100 - 50) * 1.2 = 60
      expect(result.grandTotal).toBe(60);
    });

    it('Ürün seviyesi indirimini uygulamalı', () => {
      const items = [
        { quantity: 10, unitPrice: 100, discount: 10 }, // 900
      ];
      const result = calculateProposalTotals(items, 0);
      // Subtotal: 900
      // Tax: 180
      // Grand Total: 1080
      expect(result.subtotal).toBe(900);
      expect(result.tax).toBe(180);
      expect(result.grandTotal).toBe(1080);
    });

    it('Ürün ve genel indirim kombinasyonunu işlemli', () => {
      const items = [
        { quantity: 10, unitPrice: 100, discount: 10 }, // 900
      ];
      // Genel indirim: 50
      const result = calculateProposalTotals(items, 50);
      // Subtotal: 900
      // Discount: 50
      // Tax: (900 - 50) * 0.2 = 170
      // Grand Total: 1020
      expect(result.subtotal).toBe(900);
      expect(result.discount).toBe(50);
      expect(result.grandTotal).toBe(1020);
    });

    it('Çok büyük tutarları işlemli', () => {
      const items = [
        { quantity: 1000, unitPrice: 10000, discount: 0 },
      ];
      const result = calculateProposalTotals(items, 0);
      expect(result.subtotal).toBe(10000000);
      expect(result.tax).toBe(2000000);
      expect(result.grandTotal).toBe(12000000);
    });

    it('Ondalık sayılarla doğru hesaplama yapmalı', () => {
      const items = [
        { quantity: 2.5, unitPrice: 99.99, discount: 5 },
      ];
      const result = calculateProposalTotals(items, 0);
      expect(result.subtotal).toBeCloseTo(237.475);
      expect(result.tax).toBeCloseTo(47.495);
      expect(result.grandTotal).toBeCloseTo(284.97);
    });

    it('Sıfır indirim listesi işlemli', () => {
      const items = [
        { quantity: 1, unitPrice: 100, discount: 0 },
        { quantity: 1, unitPrice: 100, discount: 0 },
        { quantity: 1, unitPrice: 100, discount: 0 },
      ];
      const result = calculateProposalTotals(items, 0);
      expect(result.subtotal).toBe(300);
      expect(result.tax).toBe(60);
      expect(result.grandTotal).toBe(360);
    });
  });
});
