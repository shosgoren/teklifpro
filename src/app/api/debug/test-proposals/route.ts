import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/infrastructure/middleware/authMiddleware';
import { prisma } from '@/shared/utils/prisma';

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  const results: Record<string, any> = {};

  try {
    // Step 1: Get session exactly like proposals API
    const session = await getServerSessionWithAuth();
    results.sessionExists = !!session;

    if (!session) {
      results.error = 'getServerSessionWithAuth returned null';
      // Also try direct session
      const { getServerSession } = await import('next-auth/next');
      const { authOptions } = await import('@/shared/auth/authOptions');
      const directSession = await getServerSession(authOptions);
      results.directSession = directSession ? {
        hasUser: !!directSession.user,
        email: directSession.user?.email,
        id: (directSession.user as any)?.id,
        tenantId: (directSession.user as any)?.tenantId,
      } : null;
      return NextResponse.json(results);
    }

    results.session = {
      userId: session.user.id,
      email: session.user.email,
      tenantId: session.user.tenantId,
      tenantIdFromTenant: session.tenant.id,
    };

    // Step 2: Try the exact same query as proposals API
    const tenantId = session.tenant.id;
    results.queryTenantId = tenantId;

    const [proposals, total] = await Promise.all([
      prisma.proposal.findMany({
        where: {
          tenantId,
          deletedAt: null,
        },
        include: {
          customer: true,
          items: true,
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.proposal.count({ where: { tenantId, deletedAt: null } }),
    ]);

    results.query = {
      total,
      proposalCount: proposals.length,
      proposals: proposals.map(p => ({
        id: p.id,
        number: p.proposalNumber,
        title: p.title,
        status: p.status,
        grandTotal: Number(p.grandTotal),
        customer: p.customer?.name,
        items: p.items.length,
      })),
    };

    results.success = true;
  } catch (error) {
    results.error = error instanceof Error ? {
      message: error.message,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 3),
    } : String(error);
  }

  return NextResponse.json(results);
}
