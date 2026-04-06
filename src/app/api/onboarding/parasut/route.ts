import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/utils/prisma';
import { getServerSessionWithAuth } from '@/infrastructure/middleware/authMiddleware';
import { Logger } from '@/infrastructure/logger';
import { parasutSchema } from '@/shared/validations/integrations';

const logger = new Logger('OnboardingParasutAPI');

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
    const data = parasutSchema.parse(body);

    await prisma.tenant.update({
      where: { id: session.tenant.id },
      data: {
        parasutCompanyId: data.companyId,
        parasutClientId: data.clientId,
        parasutClientSecret: data.clientSecret,
        parasutUsername: data.username,
        parasutPassword: data.password,
        parasutSyncEnabled: true,
      },
    });

    return NextResponse.json({ success: true, message: 'Parasut credentials saved' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    logger.error('Onboarding parasut error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
