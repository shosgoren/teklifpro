import { prisma } from '@/shared/utils/prisma';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('AiProposalService');

// Stub client replacing @anthropic-ai/sdk
interface ClaudeMessage {
  content: Array<{ type: string; text: string }>;
}

class AnthropicStub {
  messages = {
    create: async (_params: {
      model: string;
      max_tokens: number;
      system: string;
      messages: Array<{ role: string; content: string }>;
    }): Promise<ClaudeMessage> => {
      logger.warn('Anthropic SDK stub called - returning empty response');
      return {
        content: [{ type: 'text', text: '{}' }],
      };
    },
  };
}

// ============================================================================
// TYPES - Türkçe yorumlar ile birlikte
// ============================================================================

export interface ProductSuggestion {
  productId: string;
  productName: string;
  suggestedQuantity: number;
  suggestedDiscount: number;
  reason: string;
  confidence: number; // 0-100
}

export interface PricingSuggestion {
  originalTotal: number;
  suggestedTotal: number;
  suggestedDiscount: number;
  reasoning: string;
  competitiveAnalysis: string;
  items: Array<{
    productId: string;
    currentPrice: number;
    suggestedPrice: number;
    reason: string;
  }>;
}

export interface AcceptancePrediction {
  probability: number; // 0-100
  factors: Array<{
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
  }>;
  suggestions: string[];
}

export interface FollowUpSuggestion {
  action: string;
  timing: string;
  channel: 'whatsapp' | 'email' | 'phone';
  priority: 'high' | 'medium' | 'low';
  message?: string;
}

export interface ProposalItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

// ============================================================================
// CACHE & RATE LIMITING
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 dakika
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 saat
const RATE_LIMIT_MAX = 50; // Saat başına maksimum çağrı

type RateLimitKey = `${string}:${string}`;

class RateLimiter {
  private calls: Map<RateLimitKey, number[]> = new Map();

  isAllowed(tenantId: string): boolean {
    const key: RateLimitKey = `${tenantId}:ai`;
    const now = Date.now();

    if (!this.calls.has(key)) {
      this.calls.set(key, [now]);
      return true;
    }

    const timestamps = this.calls.get(key)!;
    const recentCalls = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);

    if (recentCalls.length >= RATE_LIMIT_MAX) {
      return false;
    }

    recentCalls.push(now);
    this.calls.set(key, recentCalls);
    return true;
  }
}

// ============================================================================
// AI PROPOSAL SERVICE CLASS
// ============================================================================

class AiProposalService {
  private client: AnthropicStub;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private rateLimiter = new RateLimiter();
  private model = 'claude-sonnet-4-20250514';

  constructor() {
    this.client = new AnthropicStub();
  }

  /**
   * Müşteri geçmişini analiz ederek ürün önerileri sunun
   */
  async suggestProducts(
    customerId: string,
    tenantId: string,
  ): Promise<ProductSuggestion[]> {
    try {
      if (!this.rateLimiter.isAllowed(tenantId)) {
        logger.warn(`Rate limit exceeded for tenant: ${tenantId}`);
        return [];
      }

      const cacheKey = `products:${customerId}:${tenantId}`;
      const cached = this.getFromCache<ProductSuggestion[]>(cacheKey);
      if (cached) return cached;

      // Müşteri ve ürün verilerini getir
      const customerHistory = await this.getCustomerHistory(
        customerId,
        tenantId,
      );
      const productCatalog = await this.getProductCatalog(tenantId);

      if (!customerHistory || customerHistory.length === 0) {
        return [];
      }

      const prompt = this.buildPrompt('productSuggestion', {
        customerHistory: JSON.stringify(customerHistory),
        productCatalog: JSON.stringify(productCatalog),
        totalPreviousPurchases: customerHistory.length,
      });

      const systemPrompt = `Sen bir TeklifPro satış danışmanısı AI'ısın. Müşteri satın alma geçmişini analiz ederek
      ilgili ürünler öner. JSON formatında ProductSuggestion[] döndür.`;

      const responseText = await this.callClaude(prompt, systemPrompt);
      const suggestions = this.parseJsonResponse<ProductSuggestion[]>(
        responseText,
        [],
      );

      this.setInCache(cacheKey, suggestions);
      return suggestions;
    } catch (error) {
      logger.error('Error in suggestProducts', error);
      return [];
    }
  }

  /**
   * Müşteri tarihi ve pazar verilerine dayalı fiyatlandırma önerileri
   */
  async suggestPricing(
    items: ProposalItem[],
    customerId: string,
  ): Promise<PricingSuggestion> {
    try {
      const cacheKey = `pricing:${customerId}:${items.map((i) => i.productId).join(',')}`;
      const cached = this.getFromCache<PricingSuggestion>(cacheKey);
      if (cached) return cached;

      const originalTotal = items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      );

      const prompt = this.buildPrompt('pricing', {
        items: JSON.stringify(items),
        originalTotal,
        customerHistory: `Müşteri ${customerId} geçmiş alımlarına göz atıldı`,
      });

      const systemPrompt = `Sen B2B fiyatlandırma uzmanı bir AI'ısın. Ürün marjlarını, müşteri geçmişini ve
      pazar verilerini dikkate alarak fiyatlandırma önerileri yap. JSON formatında PricingSuggestion döndür.`;

      const responseText = await this.callClaude(prompt, systemPrompt);
      const suggestion = this.parseJsonResponse<PricingSuggestion>(
        responseText,
        {
          originalTotal,
          suggestedTotal: originalTotal,
          suggestedDiscount: 0,
          reasoning: 'Veri yetersiz',
          competitiveAnalysis: '',
          items: [],
        },
      );

      this.setInCache(cacheKey, suggestion);
      return suggestion;
    } catch (error) {
      logger.error('Error in suggestPricing', error);
      return {
        originalTotal: items.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0,
        ),
        suggestedTotal: 0,
        suggestedDiscount: 0,
        reasoning: 'Hata oluştu',
        competitiveAnalysis: '',
        items: [],
      };
    }
  }

  /**
   * Teklif için profesyonel bir kapak notu/açıklama oluştur
   */
  async generateProposalNote(
    items: ProposalItem[],
    customerName: string,
    locale: string,
  ): Promise<string> {
    try {
      const cacheKey = `note:${customerName}:${locale}:${items.map((i) => i.productId).join(',')}`;
      const cached = this.getFromCache<string>(cacheKey);
      if (cached) return cached;

      const langStr = locale === 'tr' ? 'Türkçe' : 'İngilizce';

      const prompt = `
Aşağıdaki ürünleri içeren bir TeklifPro teklifi için profesyonel bir kapak notu yaz.
Müşteri adı: ${customerName}
Ürünler: ${JSON.stringify(items)}
Dil: ${langStr}

Notu kısa, çekici ve profesyonel tut. Sadece notu ver, başka birşey yazma.
      `;

      const systemPrompt = `Sen TeklifPro platformunda satış önerileri oluşturan bir profesyonel yazarısın.
      Müşteri adını, ürünleri ve istenen dili dikkate al. Etkileyici ve profesyonel teklifler yaz.`;

      const responseText = await this.callClaude(prompt, systemPrompt);
      const note = responseText.trim();

      this.setInCache(cacheKey, note);
      return note;
    } catch (error) {
      logger.error('Error in generateProposalNote', error);
      return 'Teklif başarıyla hazırlanmıştır.';
    }
  }

  /**
   * Teklif kabul olasılığını tahmin et
   */
  async predictAcceptance(proposalData: any): Promise<AcceptancePrediction> {
    try {
      const cacheKey = `acceptance:${JSON.stringify(proposalData).substring(0, 100)}`;
      const cached = this.getFromCache<AcceptancePrediction>(cacheKey);
      if (cached) return cached;

      const prompt = this.buildPrompt('acceptance', {
        proposalData: JSON.stringify(proposalData),
        description: 'Teklif kabul olasılığı tahmin edilecek',
      });

      const systemPrompt = `Sen TeklifPro geçmiş verilerini analiz eden bir tahmin modelisin.
      Teklif verilerini incele ve 0-100 arası kabul olasılığını tahmin et.
      JSON formatında AcceptancePrediction döndür: { probability, factors, suggestions }`;

      const responseText = await this.callClaude(prompt, systemPrompt);
      const prediction = this.parseJsonResponse<AcceptancePrediction>(
        responseText,
        {
          probability: 50,
          factors: [
            {
              factor: 'Veri yetersiz',
              impact: 'neutral',
              weight: 1,
            },
          ],
          suggestions: ['Müşteri ile doğrudan iletişime geç'],
        },
      );

      this.setInCache(cacheKey, prediction);
      return prediction;
    } catch (error) {
      logger.error('Error in predictAcceptance', error);
      return {
        probability: 50,
        factors: [],
        suggestions: [],
      };
    }
  }

  /**
   * Teklif durumuna göre takip-up eylemlerini öner
   */
  async suggestFollowUp(
    proposalId: string,
    tenantId: string,
  ): Promise<FollowUpSuggestion[]> {
    try {
      if (!this.rateLimiter.isAllowed(tenantId)) {
        return [];
      }

      const cacheKey = `followup:${proposalId}:${tenantId}`;
      const cached = this.getFromCache<FollowUpSuggestion[]>(cacheKey);
      if (cached) return cached;

      // Teklif verilerini getir
      const proposal = await prisma.proposal.findUnique({
        where: { id: proposalId },
        include: { customer: true },
      });

      if (!proposal) {
        return [];
      }

      const daysSinceCreation = Math.floor(
        (Date.now() - proposal.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      const prompt = `
Aşağıdaki teklif için takip-up önerileri yap:
- Teklif ID: ${proposalId}
- Müşteri: ${proposal.customer.name}
- Oluşturma tarihi: ${proposal.createdAt.toISOString()}
- Gün: ${daysSinceCreation}
- Durum: ${proposal.status}

JSON formatında FollowUpSuggestion[] döndür:
[{ action, timing, channel, priority, message? }]
      `;

      const systemPrompt = `Sen TeklifPro satış takip-up danışmanısın.
      Teklif durumuna göre uygun takip-up önerileri yap. En iyi kanalları ve zamanlamayı öner.`;

      const responseText = await this.callClaude(prompt, systemPrompt);
      const suggestions = this.parseJsonResponse<FollowUpSuggestion[]>(
        responseText,
        [],
      );

      this.setInCache(cacheKey, suggestions);
      return suggestions;
    } catch (error) {
      logger.error('Error in suggestFollowUp', error);
      return [];
    }
  }

  /**
   * Teklif metnini iyileştir ve profesyonelleştir
   */
  async improveProposalText(text: string, locale: string): Promise<string> {
    try {
      const cacheKey = `improve:${text.substring(0, 50)}:${locale}`;
      const cached = this.getFromCache<string>(cacheKey);
      if (cached) return cached;

      const langStr = locale === 'tr' ? 'Türkçe' : 'İngilizce';

      const prompt = `
Aşağıdaki teklif metnini daha profesyonel ve ikna edici hale getir.
Dil: ${langStr}

Orijinal metin:
"""
${text}
"""

İyileştirilmiş metni döndür. Sadece metni ver, başka birşey yazma.
      `;

      const systemPrompt = `Sen TeklifPro platformunda metin iyileştirme uzmanısın.
      Satış tekliflerini daha profesyonel, etkileyici ve persuasif hale getir.`;

      const improvedText = await this.callClaude(prompt, systemPrompt);

      this.setInCache(cacheKey, improvedText);
      return improvedText.trim();
    } catch (error) {
      logger.error('Error in improveProposalText', error);
      return text;
    }
  }

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  /**
   * Müşterinin geçmiş tekliflerini ve satın almalarını getir
   */
  private async getCustomerHistory(
    customerId: string,
    tenantId: string,
  ): Promise<any[]> {
    try {
      const proposals = await prisma.proposal.findMany({
        where: {
          customerId,
          tenantId,
          status: { in: ['ACCEPTED'] },
        },
        include: {
          items: true,
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      return proposals.map((p) => ({
        proposalId: p.id,
        items: p.items,
        total: Number(p.grandTotal),
        status: p.status,
        date: p.createdAt.toISOString(),
      }));
    } catch (error) {
      logger.error('Error fetching customer history', error);
      return [];
    }
  }

  /**
   * Kiracının ürün kataloğunu getir
   */
  private async getProductCatalog(tenantId: string): Promise<any[]> {
    try {
      const products = await prisma.product.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          category: true,
          listPrice: true,
        },
        take: 50,
      });

      return products;
    } catch (error) {
      logger.error('Error fetching product catalog', error);
      return [];
    }
  }

  /**
   * Claude API çağrısı yap - hata işleme ve retry ile
   */
  private async callClaude(
    prompt: string,
    systemPrompt: string,
  ): Promise<string> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const message = await this.client.messages.create({
          model: this.model,
          max_tokens: 2048,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const content = message.content[0];
        if (content.type === 'text') {
          return content.text;
        }

        throw new Error('Unexpected response type from Claude');
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          // Üstel backoff: 1s, 2s, 4s
          await this.delay(Math.pow(2, attempt - 1) * 1000);
        }
      }
    }

    throw lastError || new Error('Claude API call failed');
  }

  /**
   * Yapılandırılmış prompt oluştur
   */
  private buildPrompt(type: string, context: object): string {
    switch (type) {
      case 'productSuggestion':
        return `
Aşağıdaki müşteri geçmişini ve ürün kataloğunu analiz ederek ürün önerileri yap.

Müşteri Geçmişi:
${JSON.stringify(context, null, 2)}

Lütfen en iyi 5 ürün önerisini JSON formatında döndür. Her öneride:
- productId, productName, suggestedQuantity, suggestedDiscount, reason, confidence
        `;

      case 'pricing':
        return `
Aşağıdaki teklifte bulunan ürünler için fiyatlandırma önerileri yap.

Veriler:
${JSON.stringify(context, null, 2)}

JSON formatında PricingSuggestion döndür.
        `;

      case 'acceptance':
        return `
Aşağıdaki teklif verilerine dayalı kabul olasılığını tahmin et.

Veriler:
${JSON.stringify(context, null, 2)}

JSON formatında AcceptancePrediction döndür.
        `;

      default:
        return JSON.stringify(context);
    }
  }

  /**
   * JSON yanıtını ayrıştır, başarısız olursa default dön
   */
  private parseJsonResponse<T>(text: string, defaultValue: T): T {
    try {
      // JSON'u metin içinde bul
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (!jsonMatch) {
        return defaultValue;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // If defaultValue is a non-array object and parsed is a non-array object, merge with defaults
      if (
        defaultValue !== null &&
        typeof defaultValue === 'object' &&
        !Array.isArray(defaultValue) &&
        parsed !== null &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed)
      ) {
        return { ...defaultValue, ...parsed } as T;
      }

      // If defaultValue is an array and parsed is an empty non-array object, return defaultValue
      if (
        Array.isArray(defaultValue) &&
        parsed !== null &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed) &&
        Object.keys(parsed).length === 0
      ) {
        return defaultValue;
      }

      return parsed as T;
    } catch (error) {
      logger.warn('JSON parse error', error);
      return defaultValue;
    }
  }

  /**
   * Cache'den değer al
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > CACHE_TTL;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Cache'e değer kaydet
   */
  private setInCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Belirtilen ms kadar bekle
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const aiProposalService = new AiProposalService();

export default aiProposalService;
export { AiProposalService };
