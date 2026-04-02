import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/utils/prisma';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
import { FollowupSettingsSchema } from '@/shared/validations/settings';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('FollowupSettingsAPI');

async function handleGet(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)!;

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenant.id },
      select: {
        smartFollowupEnabled: true,
        followupDaysAfterView: true,
        followupMessage: true,
        followupMaxReminders: true,
      },
    });

    return NextResponse.json({ success: true, data: tenant });
  } catch (error) {
    logger.error('GET /api/v1/settings/followup error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

async function handlePut(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)!;

    const body = await request.json();
    const data = FollowupSettingsSchema.parse(body);

    // Verify WhatsApp is configured before enabling
    if (data.smartFollowupEnabled) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: session.tenant.id },
        select: { whatsappPhoneId: true, whatsappAccessToken: true },
      });

      if (!tenant?.whatsappPhoneId || !tenant?.whatsappAccessToken) {
        return NextResponse.json(
          { success: false, error: 'WhatsApp entegrasyonu yapılandırılmadan akıllı takip etkinleştirilemez' },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.tenant.update({
      where: { id: session.tenant.id },
      data: {
        smartFollowupEnabled: data.smartFollowupEnabled,
        followupDaysAfterView: data.followupDaysAfterView,
        followupMessage: data.followupMessage || null,
        followupMaxReminders: data.followupMaxReminders,
      },
      select: {
        smartFollowupEnabled: true,
        followupDaysAfterView: true,
        followupMessage: true,
        followupMaxReminders: true,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error('PUT /api/v1/settings/followup error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAuth(handleGet, ['settings.manage']);
export const PUT = withAuth(handlePut, ['settings.manage']);
