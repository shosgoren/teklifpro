import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/utils/prisma';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('NotificationsAPI');

type NotificationType = 'accepted' | 'rejected' | 'revised' | 'viewed';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: Date;
  isRead: boolean;
  proposalId: string;
}

const ACTIVITY_TYPE_MAP: Record<string, NotificationType | null> = {
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  REVISION_REQUESTED: 'revised',
  VIEWED: 'viewed',
};

const NOTIFICATION_TITLES: Record<string, string> = {
  ACCEPTED: 'Teklif Kabul Edildi',
  REJECTED: 'Teklif Reddedildi',
  REVISION_REQUESTED: 'Revizyon İsteği',
  VIEWED: 'Teklif Görüntülendi',
};

/**
 * GET /api/v1/notifications
 * Returns recent proposal activities for the tenant as notifications.
 */
async function handleGet(request: NextRequest): Promise<NextResponse> {
  try {
    const session = getSessionFromRequest(request)!;

    const activities = await prisma.proposalActivity.findMany({
      where: {
        type: { in: ['ACCEPTED', 'REJECTED', 'REVISION_REQUESTED', 'VIEWED'] },
        proposal: {
          tenantId: session.user.tenantId,
          deletedAt: null,
        },
      },
      include: {
        proposal: {
          include: {
            customer: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const notifications: Notification[] = activities.map((activity) => {
      const mappedType = ACTIVITY_TYPE_MAP[activity.type] ?? 'viewed';
      const title = NOTIFICATION_TITLES[activity.type] ?? 'Bildirim';
      const customerName = activity.proposal.customer?.name ?? 'Müşteri';
      const proposalNumber = activity.proposal.proposalNumber ?? activity.proposal.id;

      const descriptionMap: Record<string, string> = {
        ACCEPTED: `${customerName} tarafından ${proposalNumber} nolu teklif kabul edildi.`,
        REJECTED: `${customerName} tarafından ${proposalNumber} nolu teklif reddedildi.`,
        REVISION_REQUESTED: `${customerName} tarafından ${proposalNumber} nolu teklif için revizyon istendi.`,
        VIEWED: `${customerName} tarafından ${proposalNumber} nolu teklif görüntülendi.`,
      };

      return {
        id: activity.id,
        type: mappedType,
        title,
        description: descriptionMap[activity.type] ?? `${proposalNumber} nolu teklif için yeni bir etkinlik.`,
        timestamp: activity.createdAt,
        isRead: activity.isRead,
        proposalId: activity.proposalId,
      };
    });

    return NextResponse.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    logger.error('GET /api/v1/notifications error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/notifications
 * Actions: markRead (single), markAllRead (bulk)
 * Body: { action: 'markRead', activityId: string } | { action: 'markAllRead' }
 */
async function handlePost(request: NextRequest): Promise<NextResponse> {
  try {
    const session = getSessionFromRequest(request)!;
    const body = await request.json();
    const { action, activityId } = body;

    if (action === 'markAllRead') {
      await prisma.proposalActivity.updateMany({
        where: {
          isRead: false,
          type: { in: ['ACCEPTED', 'REJECTED', 'REVISION_REQUESTED', 'VIEWED'] },
          proposal: {
            tenantId: session.user.tenantId,
            deletedAt: null,
          },
        },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true });
    }

    // Default: markRead single
    const id = activityId || body.id;
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: { message: 'activityId zorunludur' } },
        { status: 400 }
      );
    }

    const activity = await prisma.proposalActivity.findUnique({
      where: { id },
      include: {
        proposal: {
          select: { tenantId: true },
        },
      },
    });

    if (!activity) {
      return NextResponse.json(
        { success: false, error: { message: 'Bildirim bulunamadı' } },
        { status: 404 }
      );
    }

    if (activity.proposal.tenantId !== session.user.tenantId) {
      return NextResponse.json(
        { success: false, error: { message: 'Yetkisiz erişim' } },
        { status: 403 }
      );
    }

    await prisma.proposalActivity.update({
      where: { id },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('POST /api/v1/notifications error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
