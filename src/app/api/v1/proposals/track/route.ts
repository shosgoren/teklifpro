import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/utils/prisma';
import { withRateLimit } from '@/infrastructure/middleware/rateLimitMiddleware';

/**
 * POST /api/v1/proposals/track
 * Lightweight endpoint for tracking proposal view duration.
 * Called from public proposal page (no auth required, uses publicToken).
 * Rate limited: 30 requests/minute per IP.
 */
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, duration } = body;

    if (!token || typeof duration !== 'number' || duration < 0) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    // Cap at 30 minutes per single tracking call
    const cappedDuration = Math.min(duration, 1800);

    const proposal = await prisma.proposal.findUnique({
      where: { publicToken: token },
      select: { id: true, totalViewDuration: true },
    });

    if (!proposal) {
      return NextResponse.json({ success: false }, { status: 404 });
    }

    await prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        totalViewDuration: (proposal.totalViewDuration || 0) + cappedDuration,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export const POST = withRateLimit(handlePost, { requestsPerMinute: 30 });
