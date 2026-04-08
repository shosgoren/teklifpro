import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/utils/prisma';
import { getServerSessionWithAuth } from '@/infrastructure/middleware/authMiddleware';
import { Logger } from '@/infrastructure/logger';
import { parasutSchema } from '@/shared/validations/integrations';
import { createRateLimitMap } from '@/shared/utils/rateLimit';

const logger = new Logger('OnboardingParasutAPI');

// Simple rate limit: 10 req/min per user
const limiter = createRateLimitMap({ maxRequests: 10, windowMs: 60_000 });

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed } = limiter.check(session.user.id);
    if (!allowed) {
      return NextResponse.json({ error: 'Çok fazla istek. Lütfen biraz bekleyin.' }, { status: 429 });
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
