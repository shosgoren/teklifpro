import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/utils/prisma';
import { getServerSessionWithAuth } from '@/infrastructure/middleware/authMiddleware';
import { Logger } from '@/infrastructure/logger';
import { createRateLimitMap } from '@/shared/utils/rateLimit';

const logger = new Logger('OnboardingCompanyInfoAPI');

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

    const formData = await request.formData();
    const companyName = formData.get('companyName') as string;
    const taxNumber = formData.get('taxNumber') as string;
    const taxOffice = formData.get('taxOffice') as string;
    const address = formData.get('address') as string;
    const phone = formData.get('phone') as string;

    if (!companyName) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    await prisma.tenant.update({
      where: { id: session.tenant.id },
      data: {
        name: companyName,
        taxNumber: taxNumber || null,
        taxOffice: taxOffice || null,
        address: address || null,
        phone: phone || null,
      },
    });

    return NextResponse.json({ success: true, message: 'Company info saved' });
  } catch (error) {
    logger.error('Onboarding company-info error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
