import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/utils/prisma';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('DashboardSettingsAPI');

const widgetConfigSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  size: z.enum(['small', 'medium', 'large']),
  position: z.number().int().min(0),
  visible: z.boolean(),
});

const saveDashboardSchema = z.object({
  widgets: z.array(widgetConfigSchema).max(20),
});

/**
 * GET /api/v1/settings/dashboard
 * Returns the user's saved dashboard widget layout.
 */
async function handleGet(request: NextRequest): Promise<NextResponse> {
  try {
    const session = getSessionFromRequest(request)!;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true },
    });

    const preferences = (user?.preferences as Record<string, unknown>) || {};
    const widgets = preferences.dashboardWidgets || null;

    return NextResponse.json({
      success: true,
      data: { widgets },
    });
  } catch (error) {
    logger.error('GET /api/v1/settings/dashboard error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/settings/dashboard
 * Saves the user's dashboard widget layout.
 */
async function handlePost(request: NextRequest): Promise<NextResponse> {
  try {
    const session = getSessionFromRequest(request)!;

    const body = await request.json();
    const { widgets } = saveDashboardSchema.parse(body);

    // Merge with existing preferences
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true },
    });

    const existingPreferences = (user?.preferences as Record<string, unknown>) || {};

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        preferences: {
          ...existingPreferences,
          dashboardWidgets: widgets,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('POST /api/v1/settings/dashboard error', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet, ['settings.manage']);
export const POST = withAuth(handlePost, ['settings.manage']);
