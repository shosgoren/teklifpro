import {
  sanitizeHtml,
  sanitizeEmail,
  sanitizePhone,
  sanitizeTaxNumber,
  sanitizeInput,
  maskEmail,
  maskPhone,
} from '@/shared/utils/sanitize';

describe('Sanitization Utilities', () => {
  // HTML temizleme testleri
  describe('sanitizeHtml', () => {
    it('Script etiketlerini kaldırmalıdır', () => {
      const input = '<p>Merhaba</p><script>alert("XSS")</script>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('script');
      expect(result).not.toContain('alert');
    });

    it('Güvenli HTML etiketlerini korumalıdır', () => {
      const input = '<p>Merhaba <strong>Dünya</strong></p>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
    });

    it('onclick etiketlerini kaldırmalıdır', () => {
      const input = '<div onclick="alert(\'xss\')">Tıkla</div>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onclick');
    });

    it('Tehlikeli iframe etiketlerini kaldırmalıdır', () => {
      const input = '<iframe src="http://malicious.com"></iframe>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('iframe');
    });

    it('Em, strong, b, i etiketlerini korumalıdır', () => {
      const input = '<p><em>Eğimli</em> <strong>Kalın</strong> <b>Kalın2</b> <i>Eğimli2</i></p>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<em>');
      expect(result).toContain('<strong>');
    });

    it('Boş string girişi işlemli', () => {
      expect(sanitizeHtml('')).toBe('');
    });

    it('Yalnızca metin girişi işlemli', () => {
      const input = 'Düz metin';
      const result = sanitizeHtml(input);
      expect(result).toContain('Düz metin');
    });

    it('img etiketlerini kaldırmalıdır', () => {
      const input = '<img src="x" onerror="alert(\'xss\')" />';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onerror');
    });

    it('style etiketlerini kaldırmalıdır', () => {
      const input = '<div style="background: url(javascript:alert(1))">XSS</div>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('javascript');
    });
  });

  // E-posta temizleme testleri
  describe('sanitizeEmail', () => {
    it('Geçerli e-postaları doğrulamalı ve döndürmeli', () => {
      expect(sanitizeEmail('user@example.com')).toBe('user@example.com');
      expect(sanitizeEmail('john.doe@company.co.uk')).toBe('john.doe@company.co.uk');
    });

    it('Boş string döndürmeli veya hata fırlatmalı', () => {
      const result = sanitizeEmail('');
      expect(result === '' || result === null).toBe(true);
    });

    it('@olmayan e-postayı işlemli', () => {
      const result = sanitizeEmail('notanemail');
      expect(result === '' || result === null || result === 'notanemail').toBe(true);
    });

    it('Türkçe karakterli e-postayı işlemli', () => {
      const result = sanitizeEmail('kullanıcı@example.com');
      // Türkçe karakterler genellikle geçersiz kabul edilir
      expect(typeof result).toBe('string');
    });

    it('Whitespace içeren e-postayı temizlemeli', () => {
      const result = sanitizeEmail('  user@example.com  ');
      expect(result).toBe('user@example.com');
    });

    it('Büyük harfleri küçültmeli', () => {
      const result = sanitizeEmail('User@Example.COM');
      expect(result).toBe('user@example.com');
    });

    it('Çoklu @ işareti içeren e-postayı reddetmeli', () => {
      const result = sanitizeEmail('user@@example.com');
      expect(result === '' || result === null).toBe(true);
    });

    it('Geçersiz alan adı yapısını işlemli', () => {
      const result = sanitizeEmail('user@.com');
      expect(typeof result).toBe('string');
    });
  });

  // Telefon numarası temizleme testleri
  describe('sanitizePhone', () => {
    it('Türkçe telefon numarası biçimlendirilmeli', () => {
      const result = sanitizePhone('05551234567');
      expect(result).toMatch(/^(?:\+90 5|05)\d{9}$/);
    });

    it('+90 ile başlayan numarayı işlemli', () => {
      const result = sanitizePhone('+905551234567');
      expect(result).toMatch(/^(?:\+90 5|05)\d{9}$/);
    });

    it('Boşluk ve sembol içeren numarayı temizlemeli', () => {
      const result = sanitizePhone('0555 123-4567');
      expect(result).toMatch(/^0?\d{10}$/);
    });

    it('Geçersiz numarayı işlemli', () => {
      const result = sanitizePhone('123');
      expect(typeof result).toBe('string');
    });

    it('11 basamak numarayı işlemli', () => {
      const result = sanitizePhone('05551234567');
      expect(result.replace(/\D/g, '')).toHaveLength(11);
    });

    it('Türkçe formatı kullanmalı (0 ön eki)', () => {
      const result = sanitizePhone('05551234567');
      expect(result.startsWith('0') || result.startsWith('+90')).toBe(true);
    });

    it('Boş string işlemli', () => {
      expect(sanitizePhone('')).toBe('');
    });

    it('Null/undefined işlemli', () => {
      expect(sanitizePhone(null as any)).toEqual(null);
      expect(sanitizePhone(undefined as any)).toEqual(undefined);
    });
  });

  // Vergi numarası temizleme testleri
  describe('sanitizeTaxNumber', () => {
    it('10 basamak vergi numarası geçerli olmalı', () => {
      const result = sanitizeTaxNumber('1234567890');
      expect(result).toBe('1234567890');
    });

    it('9 basamaktan az olmalı reddedilmeli', () => {
      const result = sanitizeTaxNumber('123456789');
      expect(result === '' || result === null).toBe(true);
    });

    it('10 basamaktan fazla olmalı reddedilmeli', () => {
      const result = sanitizeTaxNumber('12345678901');
      expect(result === '' || result === null).toBe(true);
    });

    it('Harf içeren numarayı reddedilmeli', () => {
      const result = sanitizeTaxNumber('123456789A');
      expect(result === '' || result === null).toBe(true);
    });

    it('Boş string işlemli', () => {
      expect(sanitizeTaxNumber('')).toBe('');
    });

    it('Whitespace temizlemeli', () => {
      const result = sanitizeTaxNumber('  1234567890  ');
      expect(result).toBe('1234567890');
    });

    it('Özel karakterler kaldırmalı', () => {
      const result = sanitizeTaxNumber('1234-567-890');
      expect(result).toBe('1234567890');
    });

    it('Geçerli TC vergi numarası formunu doğrulamalı', () => {
      const validTaxNumber = '3470732469';
      const result = sanitizeTaxNumber(validTaxNumber);
      expect(result).toHaveLength(10);
      expect(/^\d{10}$/.test(result)).toBe(true);
    });
  });

  // Giriş temizleme testleri (XSS önleme)
  describe('sanitizeInput', () => {
    it('Script etiketlerini kaldırmalıdır', () => {
      const input = 'Normal text<script>alert("xss")</script>';
      const result = sanitizeInput(input);
      expect(result).not.toContain('<script>');
    });

    it('javascript: protokolünü kaldırmalıdır', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const result = sanitizeInput(input);
      expect(result).not.toContain('javascript:');
    });

    it('Event handler\'ları kaldırmalıdır', () => {
      const input = '<img src=x onerror="alert(\'xss\')">';
      const result = sanitizeInput(input);
      expect(result).not.toContain('onerror');
    });

    it('Data URL\'lerini işlemli', () => {
      const input = '<img src="data:text/html,<script>alert(1)</script>">';
      const result = sanitizeInput(input);
      expect(result).not.toContain('script');
    });

    it('Normal metin korunmalı', () => {
      const input = 'Bu sadece normal bir metindir';
      const result = sanitizeInput(input);
      expect(result).toContain('normal');
    });

    it('HTML varlıkları işlemli', () => {
      const input = '&lt;script&gt;';
      const result = sanitizeInput(input);
      expect(typeof result).toBe('string');
    });

    it('Boş string işlemli', () => {
      expect(sanitizeInput('')).toBe('');
    });

    it('Unicode karakterlerini korumalı', () => {
      const input = 'Merhaba Dünya 你好';
      const result = sanitizeInput(input);
      expect(result).toContain('Merhaba');
    });
  });

  // E-posta maskeleme testleri
  describe('maskEmail', () => {
    it('E-postayı s***n@gmail.com formatında maskelemeli', () => {
      const result = maskEmail('selman@gmail.com');
      expect(result).toMatch(/^.{1}\*{3}.*@.*\.com$/);
    });

    it('Çok kısa e-postayı işlemli', () => {
      const result = maskEmail('a@b.co');
      expect(typeof result).toBe('string');
      expect(result).toContain('@');
    });

    it('Alan adı kısmını korumalı', () => {
      const result = maskEmail('john.doe@company.com');
      expect(result).toContain('@company.com');
    });

    it('Orta kısım yıldız ile maskelemeli', () => {
      const result = maskEmail('testuser@example.com');
      expect(result).toContain('*');
    });

    it('Boş string işlemli', () => {
      const result = maskEmail('');
      expect(typeof result).toBe('string');
    });

    it('Çok uzun e-postayı işlemli', () => {
      const result = maskEmail('verylongemailaddress@verylongdomainname.com');
      expect(result).toContain('@');
      expect(result).toContain('*');
    });

    it('Başlangıç ve son karakteri göstermeli', () => {
      const result = maskEmail('example@test.com');
      expect(result[0]).toBe('e');
      expect(result.endsWith('.com')).toBe(true);
    });
  });

  // Telefon maskeleme testleri
  describe('maskPhone', () => {
    it('Telefon numarasını +90 5** *** **34 formatında maskelemeli', () => {
      const result = maskPhone('905551234567');
      // Format: +90 5** *** **67
      expect(result).toMatch(/\+90 5\*{2} \*{3} \*{2}\d{2}/);
    });

    it('0 ile başlayan numarayı işlemli', () => {
      const result = maskPhone('05551234567');
      expect(result).toContain('*');
    });

    it('Son 2 basamağı göstermeli', () => {
      const result = maskPhone('905551234567');
      expect(result.slice(-2)).toBe('67');
    });

    it('Başlangıç kısmını göstermeli', () => {
      const result = maskPhone('905551234567');
      expect(result).toContain('5');
    });

    it('Boş string işlemli', () => {
      const result = maskPhone('');
      expect(typeof result).toBe('string');
    });

    it('Çok kısa numarayı işlemli', () => {
      const result = maskPhone('555');
      expect(typeof result).toBe('string');
    });

    it('Türk numarası formatını kullanmalı', () => {
      const result = maskPhone('905551234567');
      expect(result.startsWith('+90')).toBe(true);
    });

    it('Orta kısım tamamen maskelemeli', () => {
      const result = maskPhone('905551234567');
      expect(result).toMatch(/\*/);
    });
  });
});
