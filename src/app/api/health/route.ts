import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/utils/prisma';

// Simple in-memory rate limit: 30 req/min per IP
const healthRateLimit = new Map<string, { count: number; resetAt: number }>();

if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of healthRateLimit) {
      if (now > val.resetAt) healthRateLimit.delete(key);
    }
  }, 5 * 60 * 1000);
}

/**
 * GET /api/health
 * Health check endpoint for Docker HEALTHCHECK and load balancers.
 * Returns 200 if the service and database are reachable, 503 otherwise.
 */
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip') || 'unknown';
  const now = Date.now();
  const entry = healthRateLimit.get(ip);
  if (entry && now < entry.resetAt && entry.count >= 30) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  if (!entry || now > (entry?.resetAt ?? 0)) {
    healthRateLimit.set(ip, { count: 1, resetAt: now + 60_000 });
  } else {
    entry.count++;
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
