import { NextResponse } from 'next/server';
import { prisma } from '@/shared/utils/prisma';

// Cleanup test data - only works in development
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const tenantId = 'cmnebwhp80007nrgsln3l6g2h';

  try {
    // Delete all proposal items first (FK constraint)
    const deletedItems = await prisma.proposalItem.deleteMany({
      where: { proposal: { tenantId } },
    });

    // Delete all proposals
    const deletedProposals = await prisma.proposal.deleteMany({
      where: { tenantId },
    });

    // Delete all customers
    const deletedCustomers = await prisma.customer.deleteMany({
      where: { tenantId },
    });

    // Delete all products
    const deletedProducts = await prisma.product.deleteMany({
      where: { tenantId },
    });

    return NextResponse.json({
      success: true,
      deleted: {
        items: deletedItems.count,
        proposals: deletedProposals.count,
        customers: deletedCustomers.count,
        products: deletedProducts.count,
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
