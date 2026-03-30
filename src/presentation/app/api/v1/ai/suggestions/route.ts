// POST /api/v1/ai/suggestions — AI destekli teklif önerileri
// Ürün önerisi, fiyat optimizasyonu, kabul tahmini, takip önerisi

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { aiProposalService } from '@/infrastructure/services/ai/AiProposalService';

// --- Zod Şemaları ---

const suggestProductsSchema = z.object({
  action: z.literal('suggest-products'),
  customerId: z.string().uuid(),
});

const suggestPricingSchema = z.object({
  action: z.literal('suggest-pricing'),
  customerId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    discount: z.number().min(0).max(100).optional(),
  })),
});

const predictAcceptanceSchema = z.object({
  action: z.literal('predict-acceptance'),
  proposalData: z.object({
    customerId: z.string(),
    totalAmount: z.number(),
    itemCount: z.number(),
    averageDiscount: z.number(),
    currency: z.string().optional(),
  }),
});

const suggestFollowUpSchema = z.object({
  action: z.literal('suggest-followup'),
  proposalId: z.string().uuid(),
});

const improveTextSchema = z.object({
  action: z.literal('improve-text'),
  text: z.string().min(10).max(5000),
  locale: z.enum(['tr', 'en']).optional().default('tr'),
});

const generateNoteSchema = z.object({
  action: z.literal('generate-note'),
  customerName: z.string(),
  items: z.array(z.object({
    productName: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
  })),
  locale: z.enum(['tr', 'en']).optional().default('tr'),
});

const requestSchema = z.discriminatedUnion('action', [
  suggestProductsSchema,
  suggestPricingSchema,
  predictAcceptanceSchema,
  suggestFollowUpSchema,
  improveTextSchema,
  generateNoteSchema,
]);

// --- POST Handler ---

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz istek', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Tenant ID — gerçek uygulamada auth middleware'den gelir
    const tenantId = request.headers.get('x-tenant-id') || 'default';

    let result: any;

    switch (data.action) {
      case 'suggest-products': {
        result = await aiProposalService.suggestProducts(data.customerId, tenantId);
        break;
      }

      case 'suggest-pricing': {
        result = await aiProposalService.suggestPricing(data.items, data.customerId);
        break;
      }

      case 'predict-acceptance': {
        result = await aiProposalService.predictAcceptance(data.proposalData);
        break;
      }

      case 'suggest-followup': {
        result = await aiProposalService.suggestFollowUp(data.proposalId, tenantId);
        break;
      }

      case 'improve-text': {
        result = await aiProposalService.improveProposalText(data.text, data.locale);
        break;
      }

      case 'generate-note': {
        result = await aiProposalService.generateProposalNote(
          data.items as any,
          data.customerName,
          data.locale
        );
        break;
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        action: data.action,
        timestamp: new Date().toISOString(),
        model: 'claude-sonnet-4-20250514',
      },
    });
  } catch (error: any) {
    console.error('[AI Suggestions API] Hata:', error);

    // Rate limit aşımı
    if (error.message?.includes('rate limit') || error.message?.includes('Rate limit')) {
      return NextResponse.json(
        { success: false, error: 'AI istek limiti aşıldı. Lütfen biraz bekleyin.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    return NextResponse.json(
      { success: false, error: 'AI önerisi oluşturulurken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
