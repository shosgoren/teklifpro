import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/utils/prisma';
import { getServerSessionWithAuth } from '@/infrastructure/middleware/authMiddleware';

const FollowupSettingsSchema = z.object({
  smartFollowupEnabled: z.boolean(),
  followupDaysAfterView: z.number().int().min(1).max(30).default(3),
  followupMessage: z.string().max(1000).nullable().optional(),
  followupMaxReminders: z.number().int().min(1).max(5).default(2),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

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
    console.error('GET /api/v1/settings/followup error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

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
    console.error('PUT /api/v1/settings/followup error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
