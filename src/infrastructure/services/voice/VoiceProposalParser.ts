import Anthropic from '@anthropic-ai/sdk';
import Fuse from 'fuse.js';
import { prisma } from '@/shared/utils/prisma';
import { Logger } from '@/infrastructure/logger';
import {
  VoiceParseResult,
  VoiceEditResult,
  VoiceEditChange,
  ParsedCustomer,
  ParsedItem,
} from './types';
import { buildGlossaryPrompt } from './glossary';

const logger = new Logger('VoiceProposalParser');

// ============================================================================
// CACHE
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 dakika

// ============================================================================
// DB ENTITY TYPES
// ============================================================================

interface CustomerRecord {
  id: string;
  name: string;
}

interface ProductRecord {
  id: string;
  name: string;
  listPrice: number | null;
  unit: string | null;
}

// ============================================================================
// VOICE PROPOSAL PARSER
// ============================================================================

class VoiceProposalParser {
  private client: Anthropic;
  private model = 'claude-sonnet-4-20250514';
  private cache = new Map<string, CacheEntry<unknown>>();

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Ses dökümünü analiz edip yapılandırılmış teklif verisine dönüştür
   */
  async parse(
    transcript: string,
    tenantId: string,
    language?: string,
  ): Promise<VoiceParseResult> {
    try {
      logger.info('Parsing voice transcript', {
        tenantId,
        transcriptLength: transcript.length,
      });

      // 1. Tenant verilerini getir (cache'li)
      const [customers, products] = await Promise.all([
        this.getCustomers(tenantId),
        this.getProducts(tenantId),
      ]);

      // 2. Context prompt oluştur
      const customerList = customers
        .map((c) => `- ${c.name} (ID: ${c.id})`)
        .join('\n');

      const productList = products
        .map(
          (p) =>
            `- ${p.name} (ID: ${p.id}, Fiyat: ${p.listPrice ?? 'N/A'}, Birim: ${p.unit ?? 'adet'})`,
        )
        .join('\n');

      const glossaryPrompt = buildGlossaryPrompt();

      const systemPrompt = `Sen TeklifPro ERP asistanısın. Ses dökümünü analiz et ve yapılandırılmış JSON döndür.
Müşteri listesindeki isimlerle fuzzy match yap. Listede yoksa new_customer: true.
Ürün listesindeki isimlerle fuzzy match yap. Fiyat belirtilmemişse listPrice kullan.

${glossaryPrompt}

Müşteri Listesi:
${customerList || '(Müşteri bulunamadı)'}

Ürün Kataloğu:
${productList || '(Ürün bulunamadı)'}

Yanıtını SADECE aşağıdaki JSON formatında döndür, başka metin ekleme:
{
  "customer": {
    "query": "söylenen müşteri adı",
    "matchedId": "eşleşen müşteri ID veya null",
    "matchedName": "eşleşen müşteri adı veya null",
    "confidence": 0.0-1.0,
    "isNewCustomer": false
  },
  "items": [
    {
      "name": "ürün adı",
      "matchedProductId": "eşleşen ürün ID veya null",
      "matchedProductName": "eşleşen ürün adı veya null",
      "quantity": 1,
      "unitPrice": 100.00,
      "unit": "adet",
      "vatRate": 20,
      "confidence": 0.0-1.0
    }
  ],
  "discountRate": 0,
  "paymentTerms": null,
  "deliveryTerms": null,
  "notes": null,
  "overallConfidence": 0.0-1.0
}`;

      const userPrompt = `Dil: ${language || 'tr'}

Ses Dökümü:
"""
${transcript}
"""`;

      // 3. Claude'u çağır
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const responseText =
        message.content[0].type === 'text' ? message.content[0].text : '';

      // 4. JSON yanıtını ayrıştır
      const parsed = this.parseJsonResponse(responseText);
      if (!parsed) {
        throw new Error('Claude returned invalid JSON');
      }

      // 5. Fuse.js ile müşteri/ürün eşleşmelerini doğrula ve iyileştir
      const result = this.refineWithFuzzyMatch(
        parsed,
        customers,
        products,
        transcript,
      );

      logger.info('Parse completed', {
        customerMatched: !!result.customer.matchedId,
        itemCount: result.items.length,
        overallConfidence: result.overallConfidence,
      });

      return result;
    } catch (error) {
      logger.error('Parse failed', error);
      throw error;
    }
  }

  /**
   * Mevcut teklifi düzenleme komutuyla güncelle
   */
  async edit(
    currentProposal: VoiceParseResult,
    editCommand: string,
    tenantId: string,
  ): Promise<VoiceEditResult> {
    try {
      logger.info('Editing proposal via voice command', {
        tenantId,
        editCommand,
      });

      const [customers, products] = await Promise.all([
        this.getCustomers(tenantId),
        this.getProducts(tenantId),
      ]);

      const productList = products
        .map(
          (p) =>
            `- ${p.name} (ID: ${p.id}, Fiyat: ${p.listPrice ?? 'N/A'}, Birim: ${p.unit ?? 'adet'})`,
        )
        .join('\n');

      const customerList = customers
        .map((c) => `- ${c.name} (ID: ${c.id})`)
        .join('\n');

      const systemPrompt = `Mevcut teklif JSON'u ve düzenleme komutu verildi. Güncellenmiş JSON'u döndür.
Sadece geçerli JSON döndür, başka metin ekleme.
Ürün veya müşteri değişikliği varsa aşağıdaki listelerden eşleştir.

Müşteri Listesi:
${customerList || '(Müşteri bulunamadı)'}

Ürün Kataloğu:
${productList || '(Ürün bulunamadı)'}

JSON formatı mevcut yapıyla aynı olmalıdır.`;

      const userPrompt = `Mevcut Teklif:
${JSON.stringify(currentProposal, null, 2)}

Düzenleme Komutu:
"""
${editCommand}
"""`;

      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const responseText =
        message.content[0].type === 'text' ? message.content[0].text : '';

      const updatedRaw = this.parseJsonResponse(responseText);
      if (!updatedRaw) {
        throw new Error('Claude returned invalid JSON for edit');
      }

      const updatedProposal = this.refineWithFuzzyMatch(
        updatedRaw,
        customers,
        products,
        currentProposal.rawTranscript,
      );

      // Compute diff between old and new
      const changes = this.computeChanges(currentProposal, updatedProposal);

      logger.info('Edit completed', { changeCount: changes.length });

      return { updatedProposal, changes };
    } catch (error) {
      logger.error('Edit failed', error);
      throw error;
    }
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Tenant müşterilerini getir (cache'li, top 50 active)
   */
  private async getCustomers(tenantId: string): Promise<CustomerRecord[]> {
    const cacheKey = `customers:${tenantId}`;
    const cached = this.getFromCache<CustomerRecord[]>(cacheKey);
    if (cached) return cached;

    try {
      const customers = await prisma.customer.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true },
        take: 50,
        orderBy: { updatedAt: 'desc' },
      });

      const result = customers as CustomerRecord[];
      this.setInCache(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Failed to fetch customers', error);
      return [];
    }
  }

  /**
   * Tenant ürünlerini getir (cache'li)
   */
  private async getProducts(tenantId: string): Promise<ProductRecord[]> {
    const cacheKey = `products:${tenantId}`;
    const cached = this.getFromCache<ProductRecord[]>(cacheKey);
    if (cached) return cached;

    try {
      const products = await prisma.product.findMany({
        where: { tenantId },
        select: { id: true, name: true, listPrice: true, unit: true },
        take: 100,
      });

      const result = products.map((p: Record<string, unknown>) => ({
        id: p.id as string,
        name: p.name as string,
        listPrice: p.listPrice != null ? Number(p.listPrice) : null,
        unit: (p.unit as string) || null,
      }));

      this.setInCache(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Failed to fetch products', error);
      return [];
    }
  }

  /**
   * Fuse.js ile Claude'un eşleşmelerini doğrula ve iyileştir
   */
  private refineWithFuzzyMatch(
    parsed: Record<string, unknown>,
    customers: CustomerRecord[],
    products: ProductRecord[],
    rawTranscript: string,
  ): VoiceParseResult {
    // Fuse instances
    const customerFuse = new Fuse(customers, {
      keys: ['name'],
      threshold: 0.4,
      includeScore: true,
    });

    const productFuse = new Fuse(products, {
      keys: ['name'],
      threshold: 0.4,
      includeScore: true,
    });

    // Refine customer match
    const rawCustomer = (parsed.customer || {}) as Record<string, unknown>;
    const customerQuery = (rawCustomer.query as string) || '';
    let customer: ParsedCustomer = {
      query: customerQuery,
      matchedId: (rawCustomer.matchedId as string) || null,
      matchedName: (rawCustomer.matchedName as string) || null,
      confidence: (rawCustomer.confidence as number) || 0,
      isNewCustomer: (rawCustomer.isNewCustomer as boolean) || false,
    };

    if (customerQuery && customers.length > 0) {
      const fuseResult = customerFuse.search(customerQuery);
      if (fuseResult.length > 0) {
        const best = fuseResult[0];
        const fuseConfidence = 1 - (best.score || 0);
        // Use Fuse result if it's more confident or Claude didn't find a match
        if (!customer.matchedId || fuseConfidence > customer.confidence) {
          customer = {
            query: customerQuery,
            matchedId: best.item.id,
            matchedName: best.item.name,
            confidence: fuseConfidence,
            isNewCustomer: false,
          };
        }
      } else if (!customer.matchedId) {
        customer.isNewCustomer = true;
      }
    }

    // Refine item matches
    const rawItems = (parsed.items || []) as Array<Record<string, unknown>>;
    const items: ParsedItem[] = rawItems.map((rawItem) => {
      const itemName = (rawItem.name as string) || '';
      let item: ParsedItem = {
        name: itemName,
        matchedProductId: (rawItem.matchedProductId as string) || null,
        matchedProductName: (rawItem.matchedProductName as string) || null,
        quantity: (rawItem.quantity as number) || 1,
        unitPrice: (rawItem.unitPrice as number) || null,
        unit: (rawItem.unit as string) || 'adet',
        vatRate: (rawItem.vatRate as number) || 20,
        confidence: (rawItem.confidence as number) || 0,
      };

      if (itemName && products.length > 0) {
        const fuseResult = productFuse.search(itemName);
        if (fuseResult.length > 0) {
          const best = fuseResult[0];
          const fuseConfidence = 1 - (best.score || 0);
          if (!item.matchedProductId || fuseConfidence > item.confidence) {
            const matchedProduct = best.item;
            item = {
              ...item,
              matchedProductId: matchedProduct.id,
              matchedProductName: matchedProduct.name,
              confidence: fuseConfidence,
              // If no price specified by user, use the product's listPrice
              unitPrice:
                item.unitPrice ?? matchedProduct.listPrice ?? null,
              unit: item.unit || matchedProduct.unit || 'adet',
            };
          }
        }
      }

      return item;
    });

    // Calculate overall confidence
    const confidences = [
      customer.confidence,
      ...items.map((i) => i.confidence),
    ];
    const overallConfidence =
      confidences.length > 0
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : 0;

    return {
      customer,
      items,
      discountRate: (parsed.discountRate as number) || 0,
      paymentTerms: (parsed.paymentTerms as string) || null,
      deliveryTerms: (parsed.deliveryTerms as string) || null,
      notes: (parsed.notes as string) || null,
      overallConfidence,
      rawTranscript,
    };
  }

  /**
   * Eski ve yeni teklif arasındaki farkları hesapla
   */
  private computeChanges(
    oldProposal: VoiceParseResult,
    newProposal: VoiceParseResult,
  ): VoiceEditChange[] {
    const changes: VoiceEditChange[] = [];

    // Customer change
    if (oldProposal.customer.matchedId !== newProposal.customer.matchedId) {
      changes.push({
        field: 'customer',
        oldValue: oldProposal.customer.matchedName || oldProposal.customer.query,
        newValue: newProposal.customer.matchedName || newProposal.customer.query,
        description: `Müşteri değiştirildi: ${oldProposal.customer.matchedName || oldProposal.customer.query} → ${newProposal.customer.matchedName || newProposal.customer.query}`,
      });
    }

    // Discount change
    if (oldProposal.discountRate !== newProposal.discountRate) {
      changes.push({
        field: 'discountRate',
        oldValue: oldProposal.discountRate,
        newValue: newProposal.discountRate,
        description: `İskonto oranı: %${oldProposal.discountRate} → %${newProposal.discountRate}`,
      });
    }

    // Payment terms change
    if (oldProposal.paymentTerms !== newProposal.paymentTerms) {
      changes.push({
        field: 'paymentTerms',
        oldValue: oldProposal.paymentTerms,
        newValue: newProposal.paymentTerms,
        description: `Ödeme koşulları: ${oldProposal.paymentTerms || '(yok)'} → ${newProposal.paymentTerms || '(yok)'}`,
      });
    }

    // Delivery terms change
    if (oldProposal.deliveryTerms !== newProposal.deliveryTerms) {
      changes.push({
        field: 'deliveryTerms',
        oldValue: oldProposal.deliveryTerms,
        newValue: newProposal.deliveryTerms,
        description: `Teslimat koşulları: ${oldProposal.deliveryTerms || '(yok)'} → ${newProposal.deliveryTerms || '(yok)'}`,
      });
    }

    // Notes change
    if (oldProposal.notes !== newProposal.notes) {
      changes.push({
        field: 'notes',
        oldValue: oldProposal.notes,
        newValue: newProposal.notes,
        description: 'Notlar güncellendi',
      });
    }

    // Items changes - compare by index and detect additions/removals
    const maxLen = Math.max(
      oldProposal.items.length,
      newProposal.items.length,
    );
    for (let i = 0; i < maxLen; i++) {
      const oldItem = oldProposal.items[i];
      const newItem = newProposal.items[i];

      if (!oldItem && newItem) {
        changes.push({
          field: `items[${i}]`,
          oldValue: null,
          newValue: newItem,
          description: `Yeni kalem eklendi: ${newItem.name} x${newItem.quantity}`,
        });
      } else if (oldItem && !newItem) {
        changes.push({
          field: `items[${i}]`,
          oldValue: oldItem,
          newValue: null,
          description: `Kalem silindi: ${oldItem.name}`,
        });
      } else if (oldItem && newItem) {
        // Compare individual fields
        if (oldItem.quantity !== newItem.quantity) {
          changes.push({
            field: `items[${i}].quantity`,
            oldValue: oldItem.quantity,
            newValue: newItem.quantity,
            description: `${newItem.name} miktar: ${oldItem.quantity} → ${newItem.quantity}`,
          });
        }
        if (oldItem.unitPrice !== newItem.unitPrice) {
          changes.push({
            field: `items[${i}].unitPrice`,
            oldValue: oldItem.unitPrice,
            newValue: newItem.unitPrice,
            description: `${newItem.name} birim fiyat: ${oldItem.unitPrice} → ${newItem.unitPrice}`,
          });
        }
        if (oldItem.matchedProductId !== newItem.matchedProductId) {
          changes.push({
            field: `items[${i}].product`,
            oldValue: oldItem.matchedProductName || oldItem.name,
            newValue: newItem.matchedProductName || newItem.name,
            description: `Ürün değiştirildi: ${oldItem.matchedProductName || oldItem.name} → ${newItem.matchedProductName || newItem.name}`,
          });
        }
      }
    }

    return changes;
  }

  /**
   * JSON yanıtını ayrıştır
   */
  private parseJsonResponse(text: string): Record<string, unknown> | null {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn('No JSON found in response');
        return null;
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.warn('JSON parse error', error);
      return null;
    }
  }

  /**
   * Cache'den değer al
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  /**
   * Cache'e değer kaydet
   */
  private setInCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const voiceProposalParser = new VoiceProposalParser();

export default voiceProposalParser;
export { VoiceProposalParser };
