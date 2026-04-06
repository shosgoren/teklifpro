import { PayTRService } from '@/infrastructure/services/payment/PayTRService';
import crypto from 'crypto';

jest.mock('@/infrastructure/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Test icin mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as jest.Mock;

describe('PayTRService', () => {
  let service: PayTRService;
  const testMerchantId = 'test-merchant-id';
  const testMerchantKey = 'test-merchant-key';
  const testMerchantSalt = 'test-merchant-salt';

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    process.env.PAYTR_MERCHANT_ID = testMerchantId;
    process.env.PAYTR_MERCHANT_KEY = testMerchantKey;
    process.env.PAYTR_MERCHANT_SALT = testMerchantSalt;
    service = new PayTRService();
  });

  // ==================== getPaymentToken ====================

  describe('getPaymentToken', () => {
    const validParams = {
      merchant_oid: 'SUB_tenant1_1234567890',
      email: 'ali@example.com',
      payment_amount: 2900,
      currency: 'TL',
      user_name: 'Ali Yilmaz',
      user_phone: '05321234567',
      user_address: 'Istanbul, Turkiye',
      user_city: 'Istanbul',
      user_country: 'TR',
      merchant_ok_url: 'https://app.teklifpro.com/payment/success',
      merchant_fail_url: 'https://app.teklifpro.com/payment/fail',
    };

    it('Tum zorunlu alanlarla token uretmeli', () => {
      const result = service.getPaymentToken(validParams, '127.0.0.1');

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('merchantId');
      expect(result.merchantId).toBe(testMerchantId);
      expect(result.token).toBeTruthy();
    });

    it('Eksik alan durumunda hata firlatmali', () => {
      const incompleteParams = {
        merchant_oid: 'SUB_tenant1_1234567890',
        email: 'ali@example.com',
        // payment_amount, user_name, vb. eksik
      };

      expect(() => service.getPaymentToken(incompleteParams, '127.0.0.1')).toThrow(
        'Missing required field'
      );
    });

    it('Token formatinin base64 olmasi gerekir', () => {
      const result = service.getPaymentToken(validParams, '127.0.0.1');

      // Base64 regex kontrolu
      const base64Regex = /^[A-Za-z0-9+/]+=*$/;
      expect(base64Regex.test(result.token)).toBe(true);
    });
  });

  // ==================== verifyWebhookHash ====================

  describe('verifyWebhookHash', () => {
    const createValidWebhookData = () => {
      const merchantOid = 'SUB_tenant1_1234567890';
      const status = 'success';
      const totalAmount = 2900;

      const hashString = `${merchantOid}${testMerchantSalt}${status}${totalAmount}`;
      const hash = crypto
        .createHmac('sha256', testMerchantKey)
        .update(hashString)
        .digest('base64');

      return {
        merchant_oid: merchantOid,
        status,
        total_amount: totalAmount,
        hash,
      };
    };

    it('Gecerli hash ile true dondurmeli', () => {
      const data = createValidWebhookData();
      const result = service.verifyWebhookHash(data);
      expect(result).toBe(true);
    });

    it('Gecersiz hash ile false dondurmeli', () => {
      const data = createValidWebhookData();
      data.hash = 'gecersiz-hash-degeri';

      const result = service.verifyWebhookHash(data);
      expect(result).toBe(false);
    });

    it('Manipule edilmis veri ile false dondurmeli', () => {
      const data = createValidWebhookData();
      // Tutari degistir ama hash'i degistirme
      data.total_amount = 9999;

      const result = service.verifyWebhookHash(data);
      expect(result).toBe(false);
    });
  });

  // ==================== handlePaymentCallback ====================

  describe('handlePaymentCallback', () => {
    const createCallbackData = (status: string) => {
      const merchantOid = 'SUB_tenant1_1234567890';
      const totalAmount = 2900;

      const hashString = `${merchantOid}${testMerchantSalt}${status}${totalAmount}`;
      const hash = crypto
        .createHmac('sha256', testMerchantKey)
        .update(hashString)
        .digest('base64');

      return {
        merchant_oid: merchantOid,
        status,
        total_amount: totalAmount,
        hash,
      };
    };

    it('Basarili odeme durumunda tenantId ile success dondurmeli', async () => {
      const data = createCallbackData('success');

      const result = await service.handlePaymentCallback(data);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Payment processed successfully');
      expect(result.tenantId).toBe('tenant1');
    });

    it('Basarisiz odeme durumunda failed dondurmeli', async () => {
      const data = createCallbackData('failed');

      const result = await service.handlePaymentCallback(data);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Payment failed');
      expect(result.tenantId).toBe('tenant1');
    });

    it('Gecersiz hash ile callback reddedilmeli', async () => {
      const data = createCallbackData('success');
      data.hash = 'gecersiz-hash';

      const result = await service.handlePaymentCallback(data);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid webhook signature');
      expect(result.tenantId).toBeUndefined();
    });

    it('Bilinmeyen status durumunda hata mesaji dondurmeli', async () => {
      const data = createCallbackData('pending');

      const result = await service.handlePaymentCallback(data);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Unknown payment status');
    });
  });

  // ==================== getPlanAmount (createSubscription uzerinden) ====================

  describe('getPlanAmount (createSubscription uzerinden)', () => {
    it('Starter monthly plan icin 2900 kurusluk tutar dondurmeli', async () => {
      const result = await service.createSubscription('tenant1', 'starter', 'monthly');
      expect(result.amount).toBe(2900);
    });

    it('Professional monthly plan icin 9900 kurusluk tutar dondurmeli', async () => {
      const result = await service.createSubscription('tenant1', 'professional', 'monthly');
      expect(result.amount).toBe(9900);
    });

    it('Enterprise monthly plan icin 29900 kurusluk tutar dondurmeli', async () => {
      const result = await service.createSubscription('tenant1', 'enterprise', 'monthly');
      expect(result.amount).toBe(29900);
    });

    it('Starter yearly plan icin 29000 kurusluk tutar dondurmeli', async () => {
      const result = await service.createSubscription('tenant1', 'starter', 'yearly');
      expect(result.amount).toBe(29000);
    });
  });

  // ==================== createSubscription ====================

  describe('createSubscription', () => {
    it('merchantOid formatinin SUB_{tenantId}_{timestamp} olmali', async () => {
      const beforeTimestamp = Date.now();
      const result = await service.createSubscription('tenant1', 'starter', 'monthly');
      const afterTimestamp = Date.now();

      expect(result.merchantOid).toMatch(/^SUB_tenant1_\d+$/);

      // Timestamp kontrolu
      const parts = result.merchantOid.split('_');
      const timestamp = parseInt(parts[2], 10);
      expect(timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(timestamp).toBeLessThanOrEqual(afterTimestamp);
    });

    it('Farkli planlar icin dogru tutar hesaplamali', async () => {
      const starter = await service.createSubscription('t1', 'starter', 'monthly');
      const pro = await service.createSubscription('t1', 'professional', 'monthly');
      const enterprise = await service.createSubscription('t1', 'enterprise', 'monthly');

      expect(starter.amount).toBeLessThan(pro.amount);
      expect(pro.amount).toBeLessThan(enterprise.amount);
    });
  });
});
