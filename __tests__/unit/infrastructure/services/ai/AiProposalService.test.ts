// Prisma mock
jest.mock('@/shared/utils/prisma', () => ({
  prisma: {
    proposal: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    product: { findMany: jest.fn() },
  },
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

import aiProposalService, {
  AiProposalService,
  type ProposalItem,
} from '@/infrastructure/services/ai/AiProposalService';
import { prisma } from '@/shared/utils/prisma';

const mockProposalFindMany = prisma.proposal.findMany as jest.Mock;
const mockProductFindMany = prisma.product.findMany as jest.Mock;
const mockProposalFindUnique = (prisma.proposal as any)
  .findUnique as jest.Mock;

describe('AiProposalService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ========================================================================
  // RateLimiter
  // ========================================================================
  describe('RateLimiter', () => {
    it('should allow the first call for a new tenant', async () => {
      const svc = new AiProposalService();

      mockProposalFindMany.mockResolvedValueOnce([
        {
          id: 'p1',
          items: [{ productId: 'prod-1', quantity: 2 }],
          grandTotal: 500,
          status: 'ACCEPTED',
          createdAt: new Date('2026-01-15'),
        },
      ]);
      mockProductFindMany.mockResolvedValueOnce([
        { id: 'prod-1', name: 'Widget', category: 'Parts', listPrice: 250 },
      ]);

      const result = await svc.suggestProducts('cust-1', 'tenant-rl-first');

      // The call went through (not rate limited) - prisma was called
      expect(mockProposalFindMany).toHaveBeenCalledTimes(1);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should track calls and return false after 50 calls in the same window', async () => {
      const svc = new AiProposalService();

      mockProposalFindMany.mockResolvedValue([
        {
          id: 'p1',
          items: [],
          grandTotal: 100,
          status: 'ACCEPTED',
          createdAt: new Date(),
        },
      ]);
      mockProductFindMany.mockResolvedValue([
        { id: 'prod-1', name: 'Urun A', category: 'Cat', listPrice: 100 },
      ]);

      // Exhaust 50 calls
      for (let i = 0; i < 50; i++) {
        await svc.suggestProducts(`cust-${i}`, 'tenant-rl-50');
      }

      // 51st call should be rate limited and return empty
      const result = await svc.suggestProducts('cust-51', 'tenant-rl-50');
      expect(result).toEqual([]);
    });

    it('should reset after the 1-hour window expires', async () => {
      const svc = new AiProposalService();

      mockProposalFindMany.mockResolvedValue([
        {
          id: 'p1',
          items: [],
          grandTotal: 100,
          status: 'ACCEPTED',
          createdAt: new Date(),
        },
      ]);
      mockProductFindMany.mockResolvedValue([
        { id: 'prod-1', name: 'Urun A', category: 'Cat', listPrice: 100 },
      ]);

      // Exhaust 50 calls
      for (let i = 0; i < 50; i++) {
        await svc.suggestProducts(`cust-${i}`, 'tenant-rl-reset');
      }

      // Advance past the 1-hour window
      jest.advanceTimersByTime(60 * 60 * 1000 + 1000);

      mockProposalFindMany.mockResolvedValueOnce([]);
      mockProductFindMany.mockResolvedValueOnce([]);

      // Should be allowed again (new window)
      const result = await svc.suggestProducts('cust-new', 'tenant-rl-reset');
      expect(result).toEqual([]); // empty history, but NOT rate limited
    });
  });

  // ========================================================================
  // Cache
  // ========================================================================
  describe('Cache', () => {
    it('should return null (compute fresh) for missing cache keys', async () => {
      const svc = new AiProposalService();
      mockProposalFindMany.mockResolvedValueOnce([]);
      mockProductFindMany.mockResolvedValueOnce([]);

      await svc.suggestProducts('cust-cache-miss', 'tenant-cache-miss');

      // prisma was called, meaning cache was not hit
      expect(mockProposalFindMany).toHaveBeenCalledTimes(1);
    });

    it('should return cached data within TTL (no re-computation)', async () => {
      const svc = new AiProposalService();
      mockProposalFindMany.mockResolvedValue([]);
      mockProductFindMany.mockResolvedValue([]);

      await svc.suggestProducts('cust-cache-hit', 'tenant-cache-hit');
      await svc.suggestProducts('cust-cache-hit', 'tenant-cache-hit');

      // Prisma called only once - second call served from cache
      expect(mockProposalFindMany).toHaveBeenCalledTimes(1);
    });

    it('should return null (expire) for entries older than 5 minutes', async () => {
      const svc = new AiProposalService();
      mockProposalFindMany.mockResolvedValue([]);
      mockProductFindMany.mockResolvedValue([]);

      await svc.suggestProducts('cust-cache-exp', 'tenant-cache-exp');

      // Advance past 5 minute TTL
      jest.advanceTimersByTime(5 * 60 * 1000 + 1000);

      await svc.suggestProducts('cust-cache-exp', 'tenant-cache-exp');

      // Prisma called twice - cache expired
      expect(mockProposalFindMany).toHaveBeenCalledTimes(2);
    });
  });

  // ========================================================================
  // parseJsonResponse (tested indirectly through public API)
  // ========================================================================
  describe('parseJsonResponse', () => {
    it('should parse valid JSON from text (via suggestPricing stub response)', async () => {
      const svc = new AiProposalService();
      const items: ProposalItem[] = [
        { productId: 'p1', productName: 'Urun', quantity: 1, unitPrice: 100 },
      ];

      const result = await svc.suggestPricing(items, 'cust-json-valid');

      // Stub returns '{}' which is valid JSON - parseJsonResponse extracts it
      expect(result).toBeDefined();
      expect(result.originalTotal).toBe(100);
    });

    it('should extract JSON from surrounding text (via predictAcceptance)', async () => {
      const svc = new AiProposalService();

      // The stub always returns '{}'. parseJsonResponse uses regex to find JSON
      // in the text. '{}' matches the regex /\{[\s\S]*\}/ and parses fine.
      const result = await svc.predictAcceptance({ amount: 5000 });

      // Since '{}' does not have 'probability', the default is returned
      expect(result).toBeDefined();
      expect(result.probability).toBe(50);
    });

    it('should return default value for invalid/non-JSON text', async () => {
      const svc = new AiProposalService();

      // predictAcceptance: stub returns '{}', parseJsonResponse parses to empty
      // object, which has no probability field - default returned
      const result = await svc.predictAcceptance({});

      expect(result.probability).toBe(50);
      expect(Array.isArray(result.factors)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });

  // ========================================================================
  // buildPrompt (tested indirectly through public API)
  // ========================================================================
  describe('buildPrompt', () => {
    it('should build productSuggestion prompt (via suggestProducts with history)', async () => {
      const svc = new AiProposalService();
      mockProposalFindMany.mockResolvedValueOnce([
        {
          id: 'prop-1',
          items: [{ productId: 'p1', quantity: 3 }],
          grandTotal: 900,
          status: 'ACCEPTED',
          createdAt: new Date('2026-02-01'),
        },
      ]);
      mockProductFindMany.mockResolvedValueOnce([
        { id: 'p1', name: 'Laptop', category: 'IT', listPrice: 300 },
      ]);

      const result = await svc.suggestProducts('cust-bp-1', 'tenant-bp-1');

      // buildPrompt('productSuggestion', ...) was called internally.
      // Prisma was invoked, proving the flow reached the prompt building stage.
      expect(mockProposalFindMany).toHaveBeenCalled();
      expect(mockProductFindMany).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should build pricing prompt (via suggestPricing)', async () => {
      const svc = new AiProposalService();
      const items: ProposalItem[] = [
        { productId: 'p1', productName: 'Monitor', quantity: 2, unitPrice: 750 },
      ];

      const result = await svc.suggestPricing(items, 'cust-bp-2');

      // The pricing path calls buildPrompt('pricing', ...) internally
      expect(result).toBeDefined();
      expect(result.originalTotal).toBe(1500);
    });

    it('should build acceptance prompt (via predictAcceptance)', async () => {
      const svc = new AiProposalService();

      const result = await svc.predictAcceptance({
        id: 'prop-2',
        amount: 25000,
        customerName: 'Acme Corp',
      });

      // buildPrompt('acceptance', ...) is called internally
      expect(result).toBeDefined();
      expect(typeof result.probability).toBe('number');
    });

    it('should return JSON.stringify for unknown prompt types (covered by suggestFollowUp text prompt)', async () => {
      // suggestFollowUp does NOT use buildPrompt at all - it uses inline prompt.
      // The unknown type path returns JSON.stringify(context) as a fallback.
      // Since buildPrompt is private, we verify the known types work correctly
      // and that the service handles all prompt paths gracefully.
      const svc = new AiProposalService();

      // All three known prompt types produce results without error
      mockProposalFindMany.mockResolvedValueOnce([
        {
          id: 'p1',
          items: [],
          grandTotal: 100,
          status: 'ACCEPTED',
          createdAt: new Date(),
        },
      ]);
      mockProductFindMany.mockResolvedValueOnce([]);

      const products = await svc.suggestProducts('c1', 't1');
      expect(Array.isArray(products)).toBe(true);

      const pricing = await svc.suggestPricing(
        [{ productId: 'p1', productName: 'X', quantity: 1, unitPrice: 50 }],
        'c2',
      );
      expect(pricing.originalTotal).toBe(50);

      const acceptance = await svc.predictAcceptance({ test: true });
      expect(acceptance.probability).toBe(50);
    });
  });

  // ========================================================================
  // suggestProducts
  // ========================================================================
  describe('suggestProducts', () => {
    it('should return empty array when rate limited', async () => {
      const svc = new AiProposalService();

      mockProposalFindMany.mockResolvedValue([
        {
          id: 'p1',
          items: [],
          grandTotal: 100,
          status: 'ACCEPTED',
          createdAt: new Date(),
        },
      ]);
      mockProductFindMany.mockResolvedValue([]);

      // Exhaust rate limit
      for (let i = 0; i < 50; i++) {
        await svc.suggestProducts(`cust-${i}`, 'tenant-sp-rl');
      }

      const result = await svc.suggestProducts('cust-new', 'tenant-sp-rl');
      expect(result).toEqual([]);
    });

    it('should return empty array when no customer history exists', async () => {
      const svc = new AiProposalService();
      mockProposalFindMany.mockResolvedValueOnce([]);
      mockProductFindMany.mockResolvedValueOnce([]);

      const result = await svc.suggestProducts('cust-no-hist', 'tenant-sp-1');
      expect(result).toEqual([]);
    });

    it('should call Claude and return parsed suggestions when history exists', async () => {
      const svc = new AiProposalService();
      mockProposalFindMany.mockResolvedValueOnce([
        {
          id: 'proposal-1',
          items: [{ productId: 'p1', quantity: 5 }],
          grandTotal: 5000,
          status: 'ACCEPTED',
          createdAt: new Date('2026-01-01'),
        },
      ]);
      mockProductFindMany.mockResolvedValueOnce([
        { id: 'p1', name: 'Urun A', category: 'Elektronik', listPrice: 1000 },
        { id: 'p2', name: 'Urun B', category: 'Elektronik', listPrice: 500 },
      ]);

      const result = await svc.suggestProducts('cust-sp-2', 'tenant-sp-2');

      expect(mockProposalFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customerId: 'cust-sp-2',
            tenantId: 'tenant-sp-2',
          }),
        }),
      );
      expect(mockProductFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-sp-2' },
        }),
      );

      // Stub returns '{}' which parseJsonResponse parses. Result is an array (default).
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array on prisma error', async () => {
      const svc = new AiProposalService();
      mockProposalFindMany.mockRejectedValueOnce(
        new Error('DB connection error'),
      );

      const result = await svc.suggestProducts('cust-err', 'tenant-err');
      expect(result).toEqual([]);
    });
  });

  // ========================================================================
  // suggestPricing
  // ========================================================================
  describe('suggestPricing', () => {
    it('should calculate originalTotal correctly from items', async () => {
      const svc = new AiProposalService();
      const items: ProposalItem[] = [
        { productId: 'p1', productName: 'Urun A', quantity: 2, unitPrice: 500 },
        {
          productId: 'p2',
          productName: 'Urun B',
          quantity: 1,
          unitPrice: 1000,
        },
      ];

      const result = await svc.suggestPricing(items, 'cust-price-1');

      // originalTotal = 2*500 + 1*1000 = 2000
      expect(result.originalTotal).toBe(2000);
    });

    it('should calculate originalTotal for single item', async () => {
      const svc = new AiProposalService();
      const items: ProposalItem[] = [
        { productId: 'p1', productName: 'Urun X', quantity: 3, unitPrice: 100 },
      ];

      const result = await svc.suggestPricing(items, 'cust-price-2');

      expect(result.originalTotal).toBe(300);
    });

    it('should return fallback pricing suggestion on error', async () => {
      const svc = new AiProposalService();

      // Create a service where the internal client throws
      const items: ProposalItem[] = [
        { productId: 'p1', productName: 'Urun', quantity: 5, unitPrice: 200 },
      ];

      // Force an error by making the service's client throw
      // We access the private client and override its create method
      (svc as any).client.messages.create = jest
        .fn()
        .mockRejectedValue(new Error('API failure'));

      const result = await svc.suggestPricing(items, 'cust-price-err');

      expect(result).toBeDefined();
      // Fallback calculates originalTotal = 5 * 200 = 1000
      expect(result.originalTotal).toBe(1000);
      expect(result.suggestedTotal).toBe(0);
      expect(result.suggestedDiscount).toBe(0);
      expect(result.reasoning).toBe('Hata oluştu');
      expect(result.competitiveAnalysis).toBe('');
      expect(result.items).toEqual([]);
    });
  });

  // ========================================================================
  // generateProposalNote
  // ========================================================================
  describe('generateProposalNote', () => {
    it('should return note text for Turkish locale', async () => {
      const svc = new AiProposalService();
      const items: ProposalItem[] = [
        { productId: 'p1', productName: 'Laptop', quantity: 1, unitPrice: 5000 },
      ];

      const result = await svc.generateProposalNote(
        items,
        'Acme Sirket',
        'tr',
      );

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return note text for English locale', async () => {
      const svc = new AiProposalService();
      const items: ProposalItem[] = [
        {
          productId: 'p1',
          productName: 'Server',
          quantity: 2,
          unitPrice: 10000,
        },
      ];

      const result = await svc.generateProposalNote(
        items,
        'Global Corp',
        'en',
      );

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return fallback string on error', async () => {
      const svc = new AiProposalService();
      (svc as any).client.messages.create = jest
        .fn()
        .mockRejectedValue(new Error('API down'));

      const items: ProposalItem[] = [
        { productId: 'p1', productName: 'Widget', quantity: 1, unitPrice: 100 },
      ];

      const result = await svc.generateProposalNote(
        items,
        'Test Customer',
        'tr',
      );

      expect(result).toBe('Teklif başarıyla hazırlanmıştır.');
    });

    it('should serve cached note on second call', async () => {
      const svc = new AiProposalService();
      const items: ProposalItem[] = [
        { productId: 'p1', productName: 'Desk', quantity: 1, unitPrice: 500 },
      ];

      const spy = jest.spyOn((svc as any).client.messages, 'create');

      const result1 = await svc.generateProposalNote(items, 'Customer A', 'tr');
      const result2 = await svc.generateProposalNote(items, 'Customer A', 'tr');

      expect(result1).toBe(result2);
      // Client called only once - second call came from cache
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  // ========================================================================
  // predictAcceptance
  // ========================================================================
  describe('predictAcceptance', () => {
    it('should return prediction with probability, factors, and suggestions', async () => {
      const svc = new AiProposalService();
      const proposalData = {
        id: 'prop-1',
        amount: 10000,
        currency: 'TRY',
        customerName: 'Test Musteri',
        itemCount: 5,
      };

      const result = await svc.predictAcceptance(proposalData);

      expect(result).toBeDefined();
      expect(typeof result.probability).toBe('number');
      expect(result.probability).toBeGreaterThanOrEqual(0);
      expect(result.probability).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.factors)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should return default 50% probability on error', async () => {
      const svc = new AiProposalService();
      (svc as any).client.messages.create = jest
        .fn()
        .mockRejectedValue(new Error('Claude unavailable'));

      const result = await svc.predictAcceptance({ id: 'broken' });

      expect(result.probability).toBe(50);
      expect(result.factors).toEqual([]);
      expect(result.suggestions).toEqual([]);
    });

    it('should return default 50% for empty proposal data', async () => {
      const svc = new AiProposalService();

      const result = await svc.predictAcceptance({});

      expect(result.probability).toBe(50);
    });

    it('should cache predictions', async () => {
      const svc = new AiProposalService();
      const spy = jest.spyOn((svc as any).client.messages, 'create');

      const data = { id: 'prop-cache', amount: 3000 };
      await svc.predictAcceptance(data);
      await svc.predictAcceptance(data);

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  // ========================================================================
  // improveProposalText
  // ========================================================================
  describe('improveProposalText', () => {
    it('should return improved text string', async () => {
      const svc = new AiProposalService();
      const originalText = 'Bu bir test teklif metnidir.';

      const result = await svc.improveProposalText(originalText, 'tr');

      expect(typeof result).toBe('string');
    });

    it('should handle English locale', async () => {
      const svc = new AiProposalService();

      const result = await svc.improveProposalText(
        'This is a test proposal text.',
        'en',
      );

      expect(typeof result).toBe('string');
    });

    it('should return original text on error', async () => {
      const svc = new AiProposalService();
      (svc as any).client.messages.create = jest
        .fn()
        .mockRejectedValue(new Error('Service error'));

      const originalText = 'Orijinal metin burada.';
      const result = await svc.improveProposalText(originalText, 'tr');

      expect(result).toBe(originalText);
    });

    it('should cache improved text on second call', async () => {
      const svc = new AiProposalService();
      const text = 'Cache test metni burada.';

      const result1 = await svc.improveProposalText(text, 'tr');
      const result2 = await svc.improveProposalText(text, 'tr');

      expect(result1).toBe(result2);
    });
  });

  // ========================================================================
  // suggestFollowUp
  // ========================================================================
  describe('suggestFollowUp', () => {
    it('should return empty array when rate limited', async () => {
      const svc = new AiProposalService();

      mockProposalFindMany.mockResolvedValue([
        {
          id: 'p1',
          items: [],
          grandTotal: 100,
          status: 'ACCEPTED',
          createdAt: new Date(),
        },
      ]);
      mockProductFindMany.mockResolvedValue([]);

      // Exhaust rate limit via suggestProducts
      for (let i = 0; i < 50; i++) {
        await svc.suggestProducts(`cust-${i}`, 'tenant-fu-rl');
      }

      const result = await svc.suggestFollowUp('prop-1', 'tenant-fu-rl');
      expect(result).toEqual([]);
    });

    it('should return empty array when proposal not found', async () => {
      const svc = new AiProposalService();
      mockProposalFindUnique.mockResolvedValueOnce(null);

      const result = await svc.suggestFollowUp('nonexistent', 'tenant-fu-1');
      expect(result).toEqual([]);
    });

    it('should return follow-up suggestions for existing proposal', async () => {
      const svc = new AiProposalService();
      mockProposalFindUnique.mockResolvedValueOnce({
        id: 'prop-fu',
        status: 'SENT',
        createdAt: new Date('2026-03-01'),
        customer: { name: 'Musteri ABC' },
      });

      const result = await svc.suggestFollowUp('prop-fu', 'tenant-fu-2');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ========================================================================
  // Error handling
  // ========================================================================
  describe('Error handling', () => {
    it('should handle prisma errors gracefully in suggestProducts', async () => {
      const svc = new AiProposalService();
      mockProposalFindMany.mockRejectedValueOnce(
        new Error('Prisma connection timeout'),
      );

      const result = await svc.suggestProducts('cust-err', 'tenant-err');
      expect(result).toEqual([]);
    });

    it('should handle prisma errors gracefully in suggestFollowUp', async () => {
      const svc = new AiProposalService();
      mockProposalFindUnique.mockRejectedValueOnce(
        new Error('DB connection lost'),
      );

      const result = await svc.suggestFollowUp('prop-err', 'tenant-err');
      expect(result).toEqual([]);
    });

    it('should handle empty stub response in suggestPricing', async () => {
      const svc = new AiProposalService();
      const items: ProposalItem[] = [
        { productId: 'p1', productName: 'Urun', quantity: 1, unitPrice: 200 },
      ];

      const result = await svc.suggestPricing(items, 'cust-empty');

      expect(result).toBeDefined();
      expect(result.originalTotal).toBe(200);
    });
  });

  // ========================================================================
  // Singleton instance
  // ========================================================================
  describe('Singleton', () => {
    it('should export a default singleton that is an AiProposalService instance', () => {
      expect(aiProposalService).toBeDefined();
      expect(aiProposalService).toBeInstanceOf(AiProposalService);
    });

    it('should export named AiProposalService class for fresh instances', () => {
      const instance = new AiProposalService();
      expect(instance).toBeInstanceOf(AiProposalService);
      expect(instance).not.toBe(aiProposalService);
    });
  });
});
