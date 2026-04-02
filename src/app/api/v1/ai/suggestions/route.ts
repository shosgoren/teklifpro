// POST /api/v1/ai/suggestions — AI destekli teklif onerileri
// Urun onerisi, fiyat optimizasyonu, kabul tahmini, takip onerisi

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import aiProposalService from '@/infrastructure/services/ai/AiProposalService';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
import { Logger } from '@/infrastructure/logger';
import { aiRequestSchema } from '@/shared/validations/ai';

const logger = new Logger('AISuggestionsAPI');

const requestSchema = aiRequestSchema;

// --- POST Handler ---

async function handlePost(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)!;

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz istek', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const tenantId = session.tenant.id;

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
    logger.error('AI Suggestions API error', error);

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

export const POST = withAuth(handlePost, ['ai.use']);
