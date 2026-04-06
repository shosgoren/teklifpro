import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/utils/prisma';
import { getServerSessionWithAuth } from '@/infrastructure/middleware/authMiddleware';
import { Logger } from '@/infrastructure/logger';
import { whatsappSchema } from '@/shared/validations/integrations';

const logger = new Logger('OnboardingWhatsAppAPI');

// Simple rate limit: 10 req/min per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = Date.now();
    const key = session.user.id;
    const entry = rateLimitMap.get(key);
    if (entry && now < entry.resetAt && entry.count >= 10) {
      return NextResponse.json({ error: 'Çok fazla istek. Lütfen biraz bekleyin.' }, { status: 429 });
    }
    if (!entry || now > (entry?.resetAt ?? 0)) {
      rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 });
    } else {
      entry.count++;
    }

    const body = await request.json();
    const data = whatsappSchema.parse(body);

    await prisma.tenant.update({
      where: { id: session.tenant.id },
      data: {
        whatsappPhoneId: data.phoneId,
        ...(data.accessToken && { whatsappAccessToken: data.accessToken }),
        ...(data.businessAccountId && { whatsappBusinessId: data.businessAccountId }),
      },
    });

    return NextResponse.json({ success: true, message: 'WhatsApp settings saved' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Onboarding whatsapp error', { message: errMsg, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ success: false, error: `WhatsApp ayarları kaydedilemedi: ${errMsg}` }, { status: 500 });
  }
}
