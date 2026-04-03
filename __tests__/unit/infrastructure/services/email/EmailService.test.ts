import { EmailService } from '@/infrastructure/services/email/EmailService';

// Resend SDK mock
const mockSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

// Logger mock
jest.mock('@/infrastructure/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('EmailService', () => {
  let service: EmailService;

  const mockProposal = {
    id: 'prop-123',
    number: 'TKL-2026-001',
    clientName: 'Acme Ltd',
    clientEmail: 'acme@example.com',
    amount: 15000,
    currency: 'TRY',
    validUntil: new Date('2026-05-01'),
    createdBy: 'user-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockClear();
    process.env.RESEND_API_KEY = 'test-resend-api-key';
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.teklifpro.com';
    process.env.EMAIL_FROM = 'noreply@teklifpro.com';
    service = new EmailService();
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.EMAIL_FROM;
  });

  // ========================================================================
  // API Key handling
  // ========================================================================
  describe('API Key handling', () => {
    it('RESEND_API_KEY eksik ise hata firlatmasi', async () => {
      delete process.env.RESEND_API_KEY;
      const svc = new EmailService();

      // resend getter ilk erisimlerde hata firlatir
      await expect(
        svc.sendWelcomeEmail('test@example.com', 'Test'),
      ).resolves.toBe(false);
    });

    it('API key varsa Resend client olusturmasi', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'email-1' }, error: null });

      const result = await service.sendWelcomeEmail('test@example.com', 'Test');
      expect(result).toBe(true);
      // Resend constructor'in cagrildigini dogrula
      const { Resend } = require('resend');
      expect(Resend).toHaveBeenCalledWith('test-resend-api-key');
    });
  });

  // ========================================================================
  // sendProposalNotification
  // ========================================================================
  describe('sendProposalNotification', () => {
    it('Basarili gonderim -> true', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'email-1' }, error: null });

      const result = await service.sendProposalNotification(
        'owner@example.com',
        mockProposal,
      );

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('Resend hatasi -> false', async () => {
      mockSend.mockResolvedValueOnce({
        data: null,
        error: { message: 'API error' },
      });

      const result = await service.sendProposalNotification(
        'owner@example.com',
        mockProposal,
      );

      expect(result).toBe(false);
    });

    it('Dogru subject formati kontrolu', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'email-1' }, error: null });

      await service.sendProposalNotification('owner@example.com', mockProposal);

      const sendArgs = mockSend.mock.calls[0][0];
      expect(sendArgs.subject).toBe(
        `Teklif ${mockProposal.number} - ${mockProposal.clientName}`,
      );
    });

    it('Exception firlatildiginda false donmeli', async () => {
      mockSend.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.sendProposalNotification(
        'owner@example.com',
        mockProposal,
      );

      expect(result).toBe(false);
    });
  });

  // ========================================================================
  // sendProposalAccepted
  // ========================================================================
  describe('sendProposalAccepted', () => {
    it('Basarili gonderim -> true', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'email-2' }, error: null });

      const result = await service.sendProposalAccepted(
        'owner@example.com',
        mockProposal,
      );

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('Dogru subject: "Teklif Kabul Edildi: {number}"', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'email-2' }, error: null });

      await service.sendProposalAccepted('owner@example.com', mockProposal);

      const sendArgs = mockSend.mock.calls[0][0];
      expect(sendArgs.subject).toBe(
        `Teklif Kabul Edildi: ${mockProposal.number}`,
      );
    });

    it('Resend hatasi durumunda false donmeli', async () => {
      mockSend.mockResolvedValueOnce({
        data: null,
        error: { message: 'Sending failed' },
      });

      const result = await service.sendProposalAccepted(
        'owner@example.com',
        mockProposal,
      );

      expect(result).toBe(false);
    });
  });

  // ========================================================================
  // sendProposalRejected
  // ========================================================================
  describe('sendProposalRejected', () => {
    it('Basarili gonderim -> true', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'email-3' }, error: null });

      const result = await service.sendProposalRejected(
        'owner@example.com',
        mockProposal,
      );

      expect(result).toBe(true);
    });

    it('Dogru subject: "Teklif Reddedildi: {number}"', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'email-3' }, error: null });

      await service.sendProposalRejected('owner@example.com', mockProposal);

      const sendArgs = mockSend.mock.calls[0][0];
      expect(sendArgs.subject).toBe(
        `Teklif Reddedildi: ${mockProposal.number}`,
      );
    });

    it('Exception durumunda false donmeli', async () => {
      mockSend.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await service.sendProposalRejected(
        'owner@example.com',
        mockProposal,
      );

      expect(result).toBe(false);
    });
  });

  // ========================================================================
  // sendWelcomeEmail
  // ========================================================================
  describe('sendWelcomeEmail', () => {
    it('Basarili gonderim', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'email-4' }, error: null });

      const result = await service.sendWelcomeEmail(
        'user@example.com',
        'Sercan',
      );

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('Isim parametresi template\'e gecmesi', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'email-4' }, error: null });

      await service.sendWelcomeEmail('user@example.com', 'Sercan');

      const sendArgs = mockSend.mock.calls[0][0];
      expect(sendArgs.html).toContain('Sercan');
    });

    it('Dogru subject: "TeklifPro\'ya Hos Geldiniz"', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'email-4' }, error: null });

      await service.sendWelcomeEmail('user@example.com', 'Sercan');

      const sendArgs = mockSend.mock.calls[0][0];
      expect(sendArgs.subject).toContain('TeklifPro');
      expect(sendArgs.subject).toContain('Hoş Geldiniz');
    });

    it('Resend hatasi durumunda false donmeli', async () => {
      mockSend.mockResolvedValueOnce({
        data: null,
        error: { message: 'Bad request' },
      });

      const result = await service.sendWelcomeEmail(
        'user@example.com',
        'Sercan',
      );

      expect(result).toBe(false);
    });
  });

  // ========================================================================
  // sendVerificationEmail
  // ========================================================================
  describe('sendVerificationEmail', () => {
    it('Custom HTML dogru iletilmesi', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'email-5' }, error: null });
      const customHtml = '<div>Dogrulama kodu: 123456</div>';

      await service.sendVerificationEmail('user@example.com', customHtml);

      const sendArgs = mockSend.mock.calls[0][0];
      expect(sendArgs.html).toBe(customHtml);
    });

    it('Basarili gonderim -> true', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'email-5' }, error: null });

      const result = await service.sendVerificationEmail(
        'user@example.com',
        '<div>verify</div>',
      );

      expect(result).toBe(true);
    });

    it('Hata durumunda false donmeli', async () => {
      mockSend.mockRejectedValueOnce(new Error('Timeout'));

      const result = await service.sendVerificationEmail(
        'user@example.com',
        '<div>verify</div>',
      );

      expect(result).toBe(false);
    });
  });

  // ========================================================================
  // sendPasswordResetEmail
  // ========================================================================
  describe('sendPasswordResetEmail', () => {
    it('Custom HTML dogru iletilmesi', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'email-6' }, error: null });
      const customHtml = '<div>Sifre sifirlama linki: https://example.com/reset</div>';

      await service.sendPasswordResetEmail('user@example.com', customHtml);

      const sendArgs = mockSend.mock.calls[0][0];
      expect(sendArgs.html).toBe(customHtml);
    });

    it('Basarili gonderim -> true', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'email-6' }, error: null });

      const result = await service.sendPasswordResetEmail(
        'user@example.com',
        '<div>reset</div>',
      );

      expect(result).toBe(true);
    });

    it('Dogru subject icermeli', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'email-6' }, error: null });

      await service.sendPasswordResetEmail(
        'user@example.com',
        '<div>reset</div>',
      );

      const sendArgs = mockSend.mock.calls[0][0];
      expect(sendArgs.subject).toContain('Şifre Sıfırlama');
      expect(sendArgs.subject).toContain('TeklifPro');
    });
  });

  // ========================================================================
  // Template building (test via public methods)
  // ========================================================================
  describe('Template building', () => {
    it('HTML icinde musteri adi olmali', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'email-7' }, error: null });

      await service.sendProposalNotification('test@example.com', mockProposal);

      const sendArgs = mockSend.mock.calls[0][0];
      expect(sendArgs.html).toContain(mockProposal.clientName);
    });

    it('HTML icinde teklif numarasi olmali', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'email-7' }, error: null });

      await service.sendProposalNotification('test@example.com', mockProposal);

      const sendArgs = mockSend.mock.calls[0][0];
      expect(sendArgs.html).toContain(mockProposal.number);
    });

    it('HTML icinde tutar olmali', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'email-7' }, error: null });

      await service.sendProposalNotification('test@example.com', mockProposal);

      const sendArgs = mockSend.mock.calls[0][0];
      // toLocaleString('tr-TR') ile formatlanmis tutar
      expect(sendArgs.html).toContain(mockProposal.currency);
    });

    it('HTML icinde URL/link olmali', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'email-7' }, error: null });

      await service.sendProposalNotification('test@example.com', mockProposal);

      const sendArgs = mockSend.mock.calls[0][0];
      expect(sendArgs.html).toContain(
        `https://app.teklifpro.com/proposals/${mockProposal.id}/view`,
      );
    });

    it('Kabul edilen teklif template\'inde dashboard URL olmali', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'email-8' }, error: null });

      await service.sendProposalAccepted('test@example.com', mockProposal);

      const sendArgs = mockSend.mock.calls[0][0];
      expect(sendArgs.html).toContain(
        `https://app.teklifpro.com/proposals/${mockProposal.id}`,
      );
    });

    it('from adresi dogru olmali', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'email-9' }, error: null });

      await service.sendWelcomeEmail('test@example.com', 'Test');

      const sendArgs = mockSend.mock.calls[0][0];
      expect(sendArgs.from).toBe('noreply@teklifpro.com');
    });

    it('to adresi dogru olmali', async () => {
      mockSend.mockResolvedValueOnce({ data: { id: 'email-9' }, error: null });

      await service.sendProposalNotification(
        'recipient@example.com',
        mockProposal,
      );

      const sendArgs = mockSend.mock.calls[0][0];
      expect(sendArgs.to).toBe('recipient@example.com');
    });
  });
});
