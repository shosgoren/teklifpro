import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/utils/prisma';
import { createRateLimitMap } from '@/shared/utils/rateLimit';

// Simple in-memory rate limit: 30 req/min per IP
const limiter = createRateLimitMap({ maxRequests: 30, windowMs: 60_000, cleanupIntervalMs: 300_000 });

/**
 * GET /api/health
 * Health check endpoint for Docker HEALTHCHECK and load balancers.
 * Returns 200 if the service and database are reachable, 503 otherwise.
 */
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip') || 'unknown';
  const { allowed } = limiter.check(ip);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
