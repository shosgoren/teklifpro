import { VoiceProposalParser } from '@/infrastructure/services/voice/VoiceProposalParser';
import type { VoiceParseResult } from '@/infrastructure/services/voice/types';

// ── OpenAI mock ──
const mockChatCreate = jest.fn();
jest.mock('openai', () =>
  jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockChatCreate,
      },
    },
  })),
);

// ── Fuse.js mock ──
const mockFuseSearch = jest.fn();
jest.mock('fuse.js', () =>
  jest.fn().mockImplementation(() => ({
    search: mockFuseSearch,
  })),
);

// ── Prisma mock ──
const mockCustomerFindMany = jest.fn();
const mockProductFindMany = jest.fn();
jest.mock('@/shared/utils/prisma', () => ({
  prisma: {
    customer: {
      findMany: (...args: unknown[]) => mockCustomerFindMany(...args),
    },
    product: {
      findMany: (...args: unknown[]) => mockProductFindMany(...args),
    },
  },
}));

// ── Logger mock ──
jest.mock('@/infrastructure/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

// ── Test verileri ──
const mockCustomers = [
  { id: 'cust-1', name: 'ABC Muhendislik' },
  { id: 'cust-2', name: 'XYZ Insaat' },
];

const mockProducts = [
  { id: 'prod-1', name: 'M8 Civata', listPrice: 2.5, unit: 'adet' },
  { id: 'prod-2', name: 'M10 Somun', listPrice: 3.0, unit: 'adet' },
  { id: 'prod-3', name: 'Celik Levha 2mm', listPrice: 150, unit: 'kg' },
];

const sampleParseResult: VoiceParseResult = {
  customer: {
    query: 'ABC Muhendislik',
    matchedId: 'cust-1',
    matchedName: 'ABC Muhendislik',
    confidence: 0.95,
    isNewCustomer: false,
  },
  items: [
    {
      name: 'M8 Civata',
      matchedProductId: 'prod-1',
      matchedProductName: 'M8 Civata',
      quantity: 100,
      unitPrice: 2.5,
      unit: 'adet',
      vatRate: 20,
      confidence: 0.9,
    },
  ],
  discountRate: 0,
  paymentTerms: null,
  deliveryTerms: null,
  notes: null,
  overallConfidence: 0.925,
  rawTranscript: 'ABC Muhendislik icin yuz adet M8 civata',
};

describe('VoiceProposalParser', () => {
  let parser: VoiceProposalParser;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCustomerFindMany.mockResolvedValue(mockCustomers);
    mockProductFindMany.mockResolvedValue(mockProducts);

    // Fuse.js default: musteri ve urun eslesmesi
    mockFuseSearch.mockReturnValue([]);

    parser = new VoiceProposalParser('test-openai-key');
  });

  // ── parse ──
  describe('parse', () => {
    it('AI cagirisinda musteri listesi ve urun katalogu prompt icinde olmali', async () => {
      const claudeResponse = JSON.stringify({
        customer: {
          query: 'ABC Muhendislik',
          matchedId: 'cust-1',
          matchedName: 'ABC Muhendislik',
          confidence: 0.95,
          isNewCustomer: false,
        },
        items: [
          {
            name: 'M8 Civata',
            matchedProductId: 'prod-1',
            matchedProductName: 'M8 Civata',
            quantity: 100,
            unitPrice: 2.5,
            unit: 'adet',
            vatRate: 20,
            confidence: 0.9,
          },
        ],
        discountRate: 0,
        paymentTerms: null,
        deliveryTerms: null,
        notes: null,
        overallConfidence: 0.925,
      });

      mockChatCreate.mockResolvedValueOnce({
        choices: [{ message: { content: claudeResponse } }],
      });

      await parser.parse('ABC Muhendislik icin yuz adet M8 civata', 'tenant-1', 'tr');

      expect(mockChatCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockChatCreate.mock.calls[0][0];
      const systemMsg = callArgs.messages.find((m: { role: string }) => m.role === 'system')?.content;

      // System prompt icinde musteri listesi olmali
      expect(systemMsg).toContain('ABC Muhendislik');
      expect(systemMsg).toContain('XYZ Insaat');
      // System prompt icinde urun katalogu olmali
      expect(systemMsg).toContain('M8 Civata');
      expect(systemMsg).toContain('M10 Somun');
      expect(systemMsg).toContain('Celik Levha 2mm');
    });

    it('VoiceParseResult dondurmeli (eslesen musteri ve kalemler ile)', async () => {
      const claudeResponse = JSON.stringify({
        customer: {
          query: 'ABC Muhendislik',
          matchedId: 'cust-1',
          matchedName: 'ABC Muhendislik',
          confidence: 0.95,
          isNewCustomer: false,
        },
        items: [
          {
            name: 'M8 Civata',
            matchedProductId: 'prod-1',
            matchedProductName: 'M8 Civata',
            quantity: 100,
            unitPrice: 2.5,
            unit: 'adet',
            vatRate: 20,
            confidence: 0.9,
          },
        ],
        discountRate: 5,
        paymentTerms: '30 gun vadeli',
        deliveryTerms: null,
        notes: null,
        overallConfidence: 0.92,
      });

      mockChatCreate.mockResolvedValueOnce({
        choices: [{ message: { content: claudeResponse } }],
      });

      const result = await parser.parse(
        'ABC Muhendislik icin yuz adet M8 civata yuzde bes iskonto otuz gun vadeli',
        'tenant-1',
      );

      expect(result.customer).toBeDefined();
      expect(result.customer.query).toBe('ABC Muhendislik');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('M8 Civata');
      expect(result.items[0].quantity).toBe(100);
      expect(result.rawTranscript).toContain('ABC Muhendislik');
    });

    it('Musteri eslesmezse isNewCustomer=true olmali', async () => {
      const claudeResponse = JSON.stringify({
        customer: {
          query: 'Yeni Firma Ltd',
          matchedId: null,
          matchedName: null,
          confidence: 0,
          isNewCustomer: true,
        },
        items: [],
        discountRate: 0,
        paymentTerms: null,
        deliveryTerms: null,
        notes: null,
        overallConfidence: 0,
      });

      mockChatCreate.mockResolvedValueOnce({
        choices: [{ message: { content: claudeResponse } }],
      });

      // Fuse.js da esleme bulamiyor
      mockFuseSearch.mockReturnValue([]);

      const result = await parser.parse(
        'Yeni Firma Ltd icin bir teklif hazirlayalim',
        'tenant-1',
      );

      expect(result.customer.isNewCustomer).toBe(true);
      expect(result.customer.matchedId).toBeNull();
    });

    it('Fiyat belirtilmezse urunun listPrice degerini kullanmali', async () => {
      const claudeResponse = JSON.stringify({
        customer: {
          query: 'ABC Muhendislik',
          matchedId: 'cust-1',
          matchedName: 'ABC Muhendislik',
          confidence: 0.9,
          isNewCustomer: false,
        },
        items: [
          {
            name: 'M8 Civata',
            matchedProductId: 'prod-1',
            matchedProductName: 'M8 Civata',
            quantity: 200,
            unitPrice: null, // fiyat belirtilmemis
            unit: 'adet',
            vatRate: 20,
            confidence: 0.85,
          },
        ],
        discountRate: 0,
        paymentTerms: null,
        deliveryTerms: null,
        notes: null,
        overallConfidence: 0.87,
      });

      mockChatCreate.mockResolvedValueOnce({
        choices: [{ message: { content: claudeResponse } }],
      });

      // Fuse.js urun eslestirsin
      mockFuseSearch.mockReturnValue([
        { item: { id: 'prod-1', name: 'M8 Civata', listPrice: 2.5, unit: 'adet' }, score: 0.05 },
      ]);

      const result = await parser.parse(
        'ABC Muhendislik icin ikiyuz adet M8 civata',
        'tenant-1',
      );

      // unitPrice null oldugu icin listPrice (2.5) kullanilmali
      expect(result.items[0].unitPrice).toBe(2.5);
    });

    it('Bos transkript icin hata firlatmali', async () => {
      mockChatCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'no json here' } }],
      });

      await expect(parser.parse('', 'tenant-1')).rejects.toThrow();
    });
  });

  // ── edit ──
  describe('edit', () => {
    it('Mevcut JSON ve duzenleme komutunu AI a gondermeli', async () => {
      const editResponse = JSON.stringify({
        ...sampleParseResult,
        discountRate: 10,
      });

      mockChatCreate.mockResolvedValueOnce({
        choices: [{ message: { content: editResponse } }],
      });

      await parser.edit(sampleParseResult, 'iskontoyu yuzde on yap', 'tenant-1');

      expect(mockChatCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockChatCreate.mock.calls[0][0];
      const userMsg = callArgs.messages.find((m: { role: string }) => m.role === 'user')?.content;

      // Mevcut teklif JSON icermeli
      expect(userMsg).toContain('ABC Muhendislik');
      expect(userMsg).toContain('M8 Civata');
      // Duzenleme komutu icermeli
      expect(userMsg).toContain('iskontoyu yuzde on yap');
    });

    it('Degisiklik dizisi (changes) ile alan aciklamalari dondurmeli', async () => {
      const editResponse = JSON.stringify({
        customer: sampleParseResult.customer,
        items: sampleParseResult.items,
        discountRate: 10,
        paymentTerms: '60 gun vadeli',
        deliveryTerms: null,
        notes: null,
        overallConfidence: 0.92,
      });

      mockChatCreate.mockResolvedValueOnce({
        choices: [{ message: { content: editResponse } }],
      });

      const result = await parser.edit(
        sampleParseResult,
        'iskontoyu yuzde on yap ve vadeyi altmis gun yap',
        'tenant-1',
      );

      expect(result.changes).toBeDefined();
      expect(Array.isArray(result.changes)).toBe(true);

      // discountRate ve paymentTerms degismeli
      const discountChange = result.changes.find((c) => c.field === 'discountRate');
      expect(discountChange).toBeDefined();
      expect(discountChange!.oldValue).toBe(0);
      expect(discountChange!.newValue).toBe(10);
      expect(discountChange!.description).toBeTruthy();

      const paymentChange = result.changes.find((c) => c.field === 'paymentTerms');
      expect(paymentChange).toBeDefined();
    });

    it('Kalem ekleme/silme/degistirme degisikliklerini algilamali', async () => {
      const editResponse = JSON.stringify({
        customer: sampleParseResult.customer,
        items: [
          // Mevcut kalem degistirildi (miktar artti)
          {
            name: 'M8 Civata',
            matchedProductId: 'prod-1',
            matchedProductName: 'M8 Civata',
            quantity: 200, // 100 -> 200
            unitPrice: 2.5,
            unit: 'adet',
            vatRate: 20,
            confidence: 0.9,
          },
          // Yeni kalem eklendi
          {
            name: 'M10 Somun',
            matchedProductId: 'prod-2',
            matchedProductName: 'M10 Somun',
            quantity: 50,
            unitPrice: 3.0,
            unit: 'adet',
            vatRate: 20,
            confidence: 0.85,
          },
        ],
        discountRate: 0,
        paymentTerms: null,
        deliveryTerms: null,
        notes: null,
        overallConfidence: 0.9,
      });

      mockChatCreate.mockResolvedValueOnce({
        choices: [{ message: { content: editResponse } }],
      });

      const result = await parser.edit(
        sampleParseResult,
        'M8 civatayi ikiyuz yap ve elli adet M10 somun ekle',
        'tenant-1',
      );

      // Miktar degisikligi
      const qtyChange = result.changes.find((c) => c.field === 'items[0].quantity');
      expect(qtyChange).toBeDefined();
      expect(qtyChange!.oldValue).toBe(100);
      expect(qtyChange!.newValue).toBe(200);

      // Yeni kalem eklenmis
      const addChange = result.changes.find((c) => c.field === 'items[1]');
      expect(addChange).toBeDefined();
      expect(addChange!.oldValue).toBeNull();
      expect(addChange!.description).toContain('eklendi');
    });
  });

  // ── fuzzy matching ──
  describe('fuzzy matching', () => {
    it('Fuse.js kullanarak AI eslemelerini dogrulamali', async () => {
      const claudeResponse = JSON.stringify({
        customer: {
          query: 'ABC Muh.',
          matchedId: null,
          matchedName: null,
          confidence: 0.5,
          isNewCustomer: false,
        },
        items: [
          {
            name: 'M8 civata',
            matchedProductId: null,
            matchedProductName: null,
            quantity: 100,
            unitPrice: null,
            unit: 'adet',
            vatRate: 20,
            confidence: 0.5,
          },
        ],
        discountRate: 0,
        paymentTerms: null,
        deliveryTerms: null,
        notes: null,
        overallConfidence: 0.5,
      });

      mockChatCreate.mockResolvedValueOnce({
        choices: [{ message: { content: claudeResponse } }],
      });

      // Fuse.js musteri eslestirsin
      mockFuseSearch
        .mockReturnValueOnce([
          { item: { id: 'cust-1', name: 'ABC Muhendislik' }, score: 0.1 },
        ])
        // Fuse.js urun eslestirsin
        .mockReturnValueOnce([
          { item: { id: 'prod-1', name: 'M8 Civata', listPrice: 2.5, unit: 'adet' }, score: 0.05 },
        ]);

      const result = await parser.parse('ABC Muh icin yuz adet M8 civata', 'tenant-1');

      // Fuse.js ile iyilestirilmis eslesme
      expect(result.customer.matchedId).toBe('cust-1');
      expect(result.customer.matchedName).toBe('ABC Muhendislik');
      expect(result.customer.confidence).toBeGreaterThan(0.5);
      expect(result.items[0].matchedProductId).toBe('prod-1');
    });
  });

  // ── glossary ──
  describe('glossary', () => {
    it('Prompt icinde sozluk bilgileri bulunmali', async () => {
      const claudeResponse = JSON.stringify({
        customer: {
          query: 'test',
          matchedId: null,
          matchedName: null,
          confidence: 0,
          isNewCustomer: true,
        },
        items: [],
        discountRate: 0,
        paymentTerms: null,
        deliveryTerms: null,
        notes: null,
        overallConfidence: 0,
      });

      mockChatCreate.mockResolvedValueOnce({
        choices: [{ message: { content: claudeResponse } }],
      });

      await parser.parse('test', 'tenant-1');

      const callArgs = mockChatCreate.mock.calls[0][0];
      const systemMsg = callArgs.messages.find((m: { role: string }) => m.role === 'system')?.content;
      // Glossary promptu system icinde olmali
      expect(systemMsg).toContain('Teknik Terim');
      expect(systemMsg).toContain('M8');
      expect(systemMsg).toContain('mm');
    });
  });
});
