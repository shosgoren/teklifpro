import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/utils/prisma';
import { getServerSessionWithAuth } from '@/infrastructure/middleware/authMiddleware';
import { Logger } from '@/infrastructure/logger';
import { whatsappSchema } from '@/shared/validations/integrations';

const logger = new Logger('OnboardingWhatsAppAPI');

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = whatsappSchema.parse(body);

    await prisma.tenant.update({
      where: { id: session.tenant.id },
      data: {
        whatsappPhoneId: data.phoneId,
        whatsappAccessToken: data.accessToken,
      },
    });

    return NextResponse.json({ success: true, message: 'WhatsApp settings saved' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    logger.error('Onboarding whatsapp error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
