import { NextResponse } from 'next/server';
import { prisma } from '@/shared/utils/prisma';

/**
 * GET /api/health
 * Health check endpoint for Docker HEALTHCHECK and load balancers.
 * Returns 200 if the service and database are reachable, 503 otherwise.
 */
export async function GET() {
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
