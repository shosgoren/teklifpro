import OpenAI from 'openai';
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

/**
 * VoiceEditResult genişletilmiş tipi.
 * Düzenleme komutu hangi kaleme uygulanacağını belirleyemediğinde
 * (birden fazla kalem varken komut muğlak ise) ambiguous: true döner.
 */
export interface VoiceEditResultExtended extends VoiceEditResult {
  ambiguous?: boolean;
  /** Kullanıcının belirsiz komutu */
  ambiguousCommand?: string;
  /** Hangi kalemlerin etkilenebileceğine dair seçenekler */
  ambiguousOptions?: Array<{
    itemIndex: number;
    itemName: string;
  }>;
}

const logger = new Logger('VoiceProposalParser');

// ============================================================================
// PROVIDER CONFIG
// ============================================================================

/**
 * AI provider seçimi. Şu an GPT-4o aktif.
 * Claude'a geçmek için: provider'ı 'anthropic' yapın ve ANTHROPIC_API_KEY ayarlayın.
 */
type AIProvider = 'openai' | 'anthropic';
const ACTIVE_PROVIDER: AIProvider = 'openai';

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
  private openaiClient: OpenAI | null = null;
  private apiKey?: string;
  private provider: AIProvider;
  private model: string;
  private cache = new Map<string, CacheEntry<unknown>>();

  constructor(apiKey?: string, provider: AIProvider = ACTIVE_PROVIDER) {
    this.apiKey = apiKey;
    this.provider = provider;
    this.model = provider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-20250514';
  }

  private getOpenAIClient(): OpenAI {
    if (!this.openaiClient) {
      this.openaiClient = new OpenAI({
        apiKey: this.apiKey || process.env.OPENAI_API_KEY,
      });
    }
    return this.openaiClient;
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

${glossaryPrompt}

MÜŞTERI EŞLEŞTİRME KURALLARI:
- Müşteri listesindeki isimlerle fuzzy/fonetik eşleştirme yap (farklı telaffuz, kısaltma veya yazım olabilir).
- Eşleşme bulunursa matchedId ve matchedName doldur, isNewCustomer: false.
- Listede hiç benzer müşteri yoksa matchedId: null, matchedName: null, isNewCustomer: true yap.
- Güven skoru (confidence): 1.0 = kesin eşleşme, 0.5 = belirsiz, 0.0 = hiç eşleşme yok.

ÜRÜN EŞLEŞTİRME KURALLARI:
- Ürün kataloğundaki isimlerle fuzzy/fonetik eşleştirme yap.
- Eşleşme bulunursa matchedProductId ve matchedProductName doldur.
- Katalogda hiç benzer ürün yoksa matchedProductId: null, matchedProductName: null yap.
  Bu durumda name alanına kullanıcının söylediği ürün adını yaz (ham haliyle).
- Fiyat belirtilmemişse katalogdaki listPrice değerini unitPrice olarak kullan.
- Birim belirtilmemişse katalogdaki unit değerini kullan, o da yoksa "adet" varsayılan.
- vatRate belirtilmemişse 20 kullan.

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
      "name": "ürün adı (kullanıcının söylediği, ham)",
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

      // 3. AI çağır (GPT-4o veya Claude)
      const responseText = await this.callAI(systemPrompt, userPrompt);

      // 4. JSON yanıtını ayrıştır
      const parsed = this.parseJsonResponse(responseText);
      if (!parsed) {
        throw new Error('AI returned invalid JSON');
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
  ): Promise<VoiceEditResultExtended> {
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

      const systemPrompt = `Sen TeklifPro ERP asistanısın. Mevcut teklif JSON'u ve bir düzenleme komutu verilecek.
Komutu yorumlayıp güncellenmiş teklif JSON'unu döndür. SADECE geçerli JSON döndür, başka metin ekleme.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEMEL KURALLAR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. SADECE komutta açıkça belirtilen alanları değiştir.
2. Komutta bahsedilmeyen hiçbir alanı DEĞİŞTİRME — birebir kopyala.
3. Özellikle: ürün adları (name), matchedProductId, matchedProductName — komutta ürün değişikliği istenmedikçe dokunma.
4. Yanıt her zaman mevcut teklif yapısıyla TAMAMEN aynı JSON şemasında olmalı.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESTEKLENEN KOMUT TİPLERİ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

** YENİ KALEM EKLEME **
Örnek: "50 adet M10 somun da ekle", "listeye paslanmaz civata ekle"
→ items dizisine yeni bir eleman ekle.
→ Ürün kataloğundan fuzzy match yap; bulunursa matchedProductId/matchedProductName doldur, fiyatı listPrice'dan al.
→ Katalogda yoksa matchedProductId: null, matchedProductName: null — adı name alanına yaz.
→ Miktar/birim/fiyat belirtilmişse kullan, yoksa katalog değerlerini kullan.

** KALEM SİLME **
Örnek: "çelik levhayı çıkar", "M8 civatayı kaldır", "ilk kalemi sil"
→ Belirtilen kalemi items dizisinden çıkar.
→ Hangi kalemi kastettiğini ürün adı, sıra numarası veya bağlam üzerinden anla.

** ÜRÜN DEĞİŞTİRME (SWAP) **
Örnek: "M8 civata yerine M10 civata koy", "çelik boruyu paslanmaz boruyla değiştir"
→ Belirtilen kalemi bul, ürün bilgilerini (name, matchedProductId, matchedProductName, unitPrice, unit) katalogdaki yeni ürünle güncelle.
→ Miktar ve diğer alanlar değişmez.

** MÜŞTERİ DEĞİŞTİRME **
Örnek: "müşteriyi XYZ İnşaat yap", "müşteriyi Ahmet Bey olarak değiştir"
→ customer nesnesini güncelle: query, matchedId, matchedName, confidence alanlarını değiştir.
→ Müşteri listesinde eşleşme varsa matchedId/matchedName doldur. Yoksa matchedId: null, isNewCustomer: true.

** KALEM ALANI DEĞİŞTİRME **
- "miktarı X yap" / "X adet yap" → SADECE ilgili kalemin quantity alanı.
- "fiyatı X yap" / "X liraya çek" → SADECE ilgili kalemin unitPrice alanı.
- "birimi X yap" (kg, metre vb.) → SADECE ilgili kalemin unit alanı.
- "KDV'yi %X yap" → SADECE ilgili kalemin vatRate alanı.
- Birden fazla kalem varken komut hangi kaleme ait olduğunu açıkça belirtiyorsa SADECE o kalemi değiştir.

** GLOBAL ALAN DEĞİŞTİRME **
- "iskontoyu %X yap" → discountRate.
- "ödeme koşulunu X yap" → paymentTerms.
- "teslimat koşulunu X yap" → deliveryTerms.
- "not ekle / notu değiştir" → notes.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BELİRSİZ KOMUT DURUMU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Eğer komut hangi kaleme uygulanacağını belirtmiyorsa VE birden fazla kalem varsa:
→ Teklifi DEĞİŞTİRME.
→ Aşağıdaki JSON formatında yanıt döndür:

{
  "ambiguous": true,
  "ambiguousCommand": "kullanıcının komutu",
  "ambiguousOptions": [
    { "itemIndex": 0, "itemName": "Kalem 1 adı" },
    { "itemIndex": 1, "itemName": "Kalem 2 adı" }
  ]
}

Örnek: Teklifte "M8 Civata" ve "M10 Somun" varken kullanıcı sadece "miktarı 20 yap" derse → ambiguous: true döndür.
Örnek: Tek kalem varsa veya komut kalemi açıkça belirtiyorsa → ambiguous durumu YOK, doğrudan değişikliği yap.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KATALOG VE MÜŞTERİ LİSTESİ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ürün veya müşteri değişikliği AÇIKÇA istenirse aşağıdaki listelerden fuzzy eşleştirme yap:

Müşteri Listesi:
${customerList || '(Müşteri bulunamadı)'}

Ürün Kataloğu:
${productList || '(Ürün bulunamadı)'}

Katalogda olmayan bir ürün eklenirse: matchedProductId: null, matchedProductName: null — adı name alanına yaz.
Listede olmayan bir müşteri belirtilirse: matchedId: null, isNewCustomer: true.`;

      const userPrompt = `Mevcut Teklif:
${JSON.stringify(currentProposal, null, 2)}

Düzenleme Komutu:
"""
${editCommand}
"""`;

      const responseText = await this.callAI(systemPrompt, userPrompt);

      const updatedRaw = this.parseJsonResponse(responseText);
      if (!updatedRaw) {
        throw new Error('AI returned invalid JSON for edit');
      }

      // Handle ambiguous command: AI could not determine which item to update
      if (updatedRaw.ambiguous === true) {
        logger.info('Edit command is ambiguous', {
          command: updatedRaw.ambiguousCommand,
          optionCount: (updatedRaw.ambiguousOptions as unknown[])?.length ?? 0,
        });
        return {
          updatedProposal: currentProposal,
          changes: [],
          ambiguous: true,
          ambiguousCommand: (updatedRaw.ambiguousCommand as string) || editCommand,
          ambiguousOptions: (updatedRaw.ambiguousOptions as Array<{
            itemIndex: number;
            itemName: string;
          }>) || [],
        };
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
  // AI PROVIDER ABSTRACTION
  // ==========================================================================

  /**
   * AI sağlayıcıya göre istek gönder (OpenAI GPT-4o veya Anthropic Claude)
   */
  private async callAI(systemPrompt: string, userPrompt: string): Promise<string> {
    if (this.provider === 'openai') {
      const response = await this.getOpenAIClient().chat.completions.create({
        model: this.model,
        max_tokens: 2048,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      });
      return response.choices[0]?.message?.content || '';
    }

    // Anthropic Claude (opsiyonel - ANTHROPIC_API_KEY gerekli)
    // Bu dalı kullanmak için: provider'ı 'anthropic' yapın
    // ve @anthropic-ai/sdk paketini yükleyin
    throw new Error(
      'Anthropic provider şu an devre dışı. ACTIVE_PROVIDER değerini "openai" olarak kullanın ' +
      'veya Anthropic SDK kurulumu yapıp bu metodu güncelleyin.'
    );
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
