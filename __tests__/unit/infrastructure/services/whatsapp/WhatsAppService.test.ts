import { WhatsAppService } from '@/infrastructure/services/whatsapp/WhatsAppService';
import crypto from 'crypto';

// Test icin mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as jest.Mock;

describe('WhatsAppService', () => {
  let service: WhatsAppService;
  const testPhoneNumberId = 'test-phone-number-id';
  const testAccessToken = 'test-access-token';
  const testAppSecret = 'test-app-secret';

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    process.env.WHATSAPP_APP_SECRET = testAppSecret;
    service = new WhatsAppService(testPhoneNumberId, testAccessToken, testAppSecret);
  });

  // ==================== Constructor & Factory ====================

  describe('Constructor & Factory', () => {
    it('fromTenantConfig ile service olusturmali', () => {
      const config = {
        whatsappPhoneId: 'tenant-phone-id',
        whatsappAccessToken: 'tenant-access-token',
      };

      const tenantService = WhatsAppService.fromTenantConfig(config);
      expect(tenantService).toBeInstanceOf(WhatsAppService);
    });
  });

  // ==================== formatPhoneNumber (sendTextMessage uzerinden) ====================

  describe('formatPhoneNumber', () => {
    const setupMockResponse = () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          messaging_product: 'whatsapp',
          contacts: [{ input: '905321234567', wa_id: '905321234567' }],
          messages: [{ id: 'msg-1' }],
        }),
      });
    };

    it('0532 123 4567 formatini 905321234567 olarak donusturmeli', async () => {
      setupMockResponse();
      await service.sendTextMessage('0532 123 4567', 'Test');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.to).toBe('905321234567');
    });

    it('+90 532 123 4567 formatini 905321234567 olarak donusturmeli', async () => {
      setupMockResponse();
      await service.sendTextMessage('+90 532 123 4567', 'Test');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.to).toBe('905321234567');
    });

    it('5321234567 formatini 905321234567 olarak donusturmeli', async () => {
      setupMockResponse();
      await service.sendTextMessage('5321234567', 'Test');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.to).toBe('905321234567');
    });

    it('905321234567 formatini degistirmemeli (zaten dogru format)', async () => {
      setupMockResponse();
      await service.sendTextMessage('905321234567', 'Test');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.to).toBe('905321234567');
    });

    it('(0532) 123-4567 formatini 905321234567 olarak donusturmeli', async () => {
      setupMockResponse();
      await service.sendTextMessage('(0532) 123-4567', 'Test');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.to).toBe('905321234567');
    });
  });

  // ==================== verifyWebhookSignature ====================

  describe('verifyWebhookSignature', () => {
    const rawBody = '{"entry":[{"changes":[]}]}';

    it('Gecerli imza ile true dondurmeli', () => {
      const expectedHash = crypto
        .createHmac('sha256', testAppSecret)
        .update(rawBody)
        .digest('hex');
      const signature = `sha256=${expectedHash}`;

      const result = service.verifyWebhookSignature(rawBody, signature);
      expect(result).toBe(true);
    });

    it('Gecersiz imza ile false dondurmeli', () => {
      const signature = 'sha256=invalidhashvalue1234567890abcdef1234567890abcdef1234567890abcdef';

      const result = service.verifyWebhookSignature(rawBody, signature);
      expect(result).toBe(false);
    });

    it('Bos imza ile false dondurmeli', () => {
      const result = service.verifyWebhookSignature(rawBody, '');
      expect(result).toBe(false);
    });

    it('Farkli uzunlukta imza ile false dondurmeli (timingSafeEqual guard)', () => {
      const result = service.verifyWebhookSignature(rawBody, 'sha256=kisa');
      expect(result).toBe(false);
    });
  });

  // ==================== sendTextMessage ====================

  describe('sendTextMessage', () => {
    it('Basarili gonderim durumunda mesaj ID dondurmeli', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          messaging_product: 'whatsapp',
          contacts: [{ input: '905321234567', wa_id: '905321234567' }],
          messages: [{ id: 'wamid.test123' }],
        }),
      });

      const result = await service.sendTextMessage('905321234567', 'Merhaba');
      expect(result.messages[0].id).toBe('wamid.test123');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1]?.headers?.Authorization).toContain('Bearer');
      expect(callArgs[1]?.headers?.['Content-Type']).toBe('application/json');
    });

    it('API hatasi durumunda hata firlatmali (400)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: { message: 'Invalid phone number', type: 'OAuthException' },
        }),
      });

      await expect(service.sendTextMessage('invalid', 'Test')).rejects.toThrow(
        'WhatsApp API Error: 400'
      );
    });

    it('Ag hatasi durumunda hata firlatmali', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.sendTextMessage('905321234567', 'Test')).rejects.toThrow(
        'Network error'
      );
    });
  });

  // ==================== sendProposalLink ====================

  describe('sendProposalLink', () => {
    const proposalParams = {
      to: '905321234567',
      customerName: 'Ali Yilmaz',
      proposalNumber: 'TKL-2024-001',
      proposalTitle: 'Web Gelistirme Teklifi',
      grandTotal: '15.000 TL',
      proposalUrl: 'https://app.teklifpro.com/p/abc123',
      companyName: 'Acme Ltd',
    };

    it('Basarili interactive mesaj gonderimi', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          messaging_product: 'whatsapp',
          contacts: [{ input: '905321234567', wa_id: '905321234567' }],
          messages: [{ id: 'wamid.interactive123' }],
        }),
      });

      const result = await service.sendProposalLink(proposalParams);
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('wamid.interactive123');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.type).toBe('interactive');
      expect(body.interactive.body.text).toContain('Ali Yilmaz');
    });

    it('Interactive basarisiz, template fallback basarili olmali', async () => {
      // Interactive mesaj basarisiz
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Template required' } }),
      });

      // Template fallback basarili
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          messaging_product: 'whatsapp',
          contacts: [{ input: '905321234567', wa_id: '905321234567' }],
          messages: [{ id: 'wamid.template123' }],
        }),
      });

      const result = await service.sendProposalLink(proposalParams);
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('wamid.template123');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('Her iki yontem de basarisiz ise hata dondurmeli', async () => {
      // Interactive basarisiz
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Interactive failed' } }),
      });

      // Template de basarisiz
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Template also failed' } }),
      });

      const result = await service.sendProposalLink(proposalParams);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ==================== sendTemplate ====================

  describe('sendTemplate', () => {
    it('Body parametrelerini dogru formatlamali', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          messaging_product: 'whatsapp',
          contacts: [],
          messages: [{ id: 'wamid.tpl1' }],
        }),
      });

      await service.sendTemplate({
        to: '905321234567',
        templateName: 'proposal_notification',
        language: 'tr',
        parameters: {
          '1': 'Ali Yilmaz',
          '2': 'TKL-001',
          '3': '15.000 TL',
        },
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const bodyComponent = body.template.components.find(
        (c: Record<string, unknown>) => c.type === 'body'
      );
      expect(bodyComponent).toBeDefined();
      expect(bodyComponent.parameters).toEqual([
        { type: 'text', text: 'Ali Yilmaz' },
        { type: 'text', text: 'TKL-001' },
        { type: 'text', text: '15.000 TL' },
      ]);
    });

    it('Button parametrelerini dogru formatlamali', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          messaging_product: 'whatsapp',
          contacts: [],
          messages: [{ id: 'wamid.tpl2' }],
        }),
      });

      await service.sendTemplate({
        to: '905321234567',
        templateName: 'proposal_notification',
        language: 'tr',
        parameters: { '1': 'Test' },
        buttonParams: ['https://app.teklifpro.com/p/abc123'],
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const buttonComponent = body.template.components.find(
        (c: Record<string, unknown>) => c.type === 'button'
      );
      expect(buttonComponent).toBeDefined();
      expect(buttonComponent.sub_type).toBe('url');
      expect(buttonComponent.index).toBe(0);
      expect(buttonComponent.parameters).toEqual([
        { type: 'text', text: 'https://app.teklifpro.com/p/abc123' },
      ]);
    });

    it('Header parametrelerini dogru formatlamali', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          messaging_product: 'whatsapp',
          contacts: [],
          messages: [{ id: 'wamid.tpl3' }],
        }),
      });

      await service.sendTemplate({
        to: '905321234567',
        templateName: 'proposal_with_header',
        language: 'tr',
        parameters: { '1': 'Test' },
        headerParams: ['Acme Ltd'],
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const headerComponent = body.template.components.find(
        (c: Record<string, unknown>) => c.type === 'header'
      );
      expect(headerComponent).toBeDefined();
      expect(headerComponent.parameters).toEqual([
        { type: 'text', text: 'Acme Ltd' },
      ]);
    });
  });
});
