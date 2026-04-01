import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/shared/auth/authOptions';
import { prisma } from '@/shared/utils/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({
        status: 'no_session',
        message: 'getServerSession returned null'
      });
    }

    const tenantId = (session.user as any)?.tenantId;

    // Test actual DB queries
    let proposalCount = -1;
    let customerCount = -1;
    let productCount = -1;
    let dbError = null;

    try {
      [proposalCount, customerCount, productCount] = await Promise.all([
        prisma.proposal.count({ where: { tenantId, deletedAt: null } }),
        prisma.customer.count({ where: { tenantId, deletedAt: null } }),
        prisma.product.count({ where: { tenantId, deletedAt: null } }),
      ]);
    } catch (e) {
      dbError = e instanceof Error ? e.message : String(e);
    }

    return NextResponse.json({
      status: 'ok',
      user: {
        email: session.user?.email,
        name: session.user?.name,
        id: (session.user as any)?.id,
        tenantId,
        role: (session.user as any)?.role,
      },
      db: {
        proposalCount,
        customerCount,
        productCount,
        error: dbError,
      },
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
