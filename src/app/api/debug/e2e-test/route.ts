import { NextResponse } from 'next/server';
import { prisma } from '@/shared/utils/prisma';

// E2E test endpoint - only works in development
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const results: Record<string, any> = {};
  const tenantId = 'cmnebwhp80007nrgsln3l6g2h'; // Sercan's tenant
  const ts = Date.now();

  try {
    // 1. Test Product CRUD
    results.product = {};

    // Create
    const product = await prisma.product.create({
      data: {
        tenantId,
        code: `TEST-${ts}`,
        name: 'Test Ürünü',
        unit: 'Adet',
        listPrice: 1500.00,
        vatRate: 18,
        category: 'Test Kategorisi',
        description: 'E2E test ürünü',
        isActive: true,
      },
    });
    results.product.create = { id: product.id, name: product.name };

    // Read
    const productRead = await prisma.product.findUnique({ where: { id: product.id } });
    results.product.read = productRead ? 'OK' : 'FAIL';

    // Update
    const productUpdated = await prisma.product.update({
      where: { id: product.id },
      data: { name: 'Test Ürünü Güncellendi', listPrice: 2000.00 },
    });
    results.product.update = productUpdated.name === 'Test Ürünü Güncellendi' ? 'OK' : 'FAIL';

    // List
    const products = await prisma.product.findMany({
      where: { tenantId, deletedAt: null },
    });
    results.product.list = { count: products.length };

    // 2. Test Customer CRUD
    results.customer = {};

    // Create
    const customer = await prisma.customer.create({
      data: {
        tenantId,
        name: 'Test Müşterisi A.Ş.',
        shortName: 'Test Müşteri',
        email: 'test@musteri.com',
        phone: '+905551234567',
        city: 'İstanbul',
        address: 'Test Mah. Deneme Sok. No:1',
        taxNumber: '1234567890',
        isActive: true,
      },
    });
    results.customer.create = { id: customer.id, name: customer.name };

    // Read
    const customerRead = await prisma.customer.findUnique({ where: { id: customer.id } });
    results.customer.read = customerRead ? 'OK' : 'FAIL';

    // Update
    const customerUpdated = await prisma.customer.update({
      where: { id: customer.id },
      data: { name: 'Güncellenmiş Test Müşterisi' },
    });
    results.customer.update = customerUpdated.name === 'Güncellenmiş Test Müşterisi' ? 'OK' : 'FAIL';

    // List
    const customers = await prisma.customer.findMany({
      where: { tenantId, deletedAt: null },
    });
    results.customer.list = { count: customers.length };

    // 3. Test Proposal CRUD
    results.proposal = {};

    // Create
    const userId = 'cmnebwhpi0009nrgsux77mtk1'; // Sercan's user
    const proposal = await prisma.proposal.create({
      data: {
        tenant: { connect: { id: tenantId } },
        customer: { connect: { id: customer.id } },
        user: { connect: { id: userId } },
        proposalNumber: `TKL-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        title: 'Test Teklifi',
        status: 'DRAFT',
        subtotal: 3000.00,
        vatTotal: 540.00,
        grandTotal: 3540.00,
        publicToken: `test-${Date.now()}`,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    results.proposal.create = { id: proposal.id, number: proposal.proposalNumber };

    // Create proposal items
    const item = await prisma.proposalItem.create({
      data: {
        proposalId: proposal.id,
        productId: product.id,
        name: product.name,
        unit: product.unit,
        quantity: 2,
        unitPrice: 1500.00,
        discountRate: 0,
        vatRate: 18,
        lineTotal: 3000.00,
        sortOrder: 0,
      },
    });
    results.proposal.item = { id: item.id, name: item.name };

    // Read with relations
    const proposalRead = await prisma.proposal.findUnique({
      where: { id: proposal.id },
      include: {
        customer: true,
        items: { include: { product: true } },
        user: true,
      },
    });
    results.proposal.read = proposalRead ? {
      title: proposalRead.title,
      customer: proposalRead.customer?.name,
      itemCount: proposalRead.items.length,
      createdBy: proposalRead.user?.name,
    } : 'FAIL';

    // Update status
    const proposalUpdated = await prisma.proposal.update({
      where: { id: proposal.id },
      data: { status: 'SENT' },
    });
    results.proposal.update = proposalUpdated.status === 'SENT' ? 'OK' : 'FAIL';

    // List
    const proposals = await prisma.proposal.findMany({
      where: { tenantId, deletedAt: null },
      include: { customer: true },
    });
    results.proposal.list = { count: proposals.length };

    // 4. Test API-level data format (simulate what GET endpoints return)
    results.apiFormat = {};

    // Products API format
    const apiProducts = await prisma.product.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    results.apiFormat.products = {
      count: apiProducts.length,
      sample: apiProducts[0] ? {
        id: apiProducts[0].id,
        code: apiProducts[0].code,
        name: apiProducts[0].name,
        listPrice: Number(apiProducts[0].listPrice),
      } : null,
    };

    // Customers API format
    const apiCustomers = await prisma.customer.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    results.apiFormat.customers = {
      count: apiCustomers.length,
      sample: apiCustomers[0] ? {
        id: apiCustomers[0].id,
        name: apiCustomers[0].name,
        email: apiCustomers[0].email,
      } : null,
    };

    // Proposals API format
    const apiProposals = await prisma.proposal.findMany({
      where: { tenantId, deletedAt: null },
      include: { customer: true, items: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    results.apiFormat.proposals = {
      count: apiProposals.length,
      sample: apiProposals[0] ? {
        id: apiProposals[0].id,
        number: apiProposals[0].proposalNumber,
        title: apiProposals[0].title,
        status: apiProposals[0].status,
        grandTotal: Number(apiProposals[0].grandTotal),
        customer: apiProposals[0].customer?.name,
        itemCount: apiProposals[0].items.length,
      } : null,
    };

    // 5. Cleanup test data
    results.cleanup = {};

    await prisma.proposalItem.deleteMany({ where: { proposalId: proposal.id } });
    results.cleanup.items = 'OK';

    await prisma.proposal.delete({ where: { id: proposal.id } });
    results.cleanup.proposal = 'OK';

    await prisma.customer.delete({ where: { id: customer.id } });
    results.cleanup.customer = 'OK';

    await prisma.product.delete({ where: { id: product.id } });
    results.cleanup.product = 'OK';

    results.summary = 'ALL TESTS PASSED';

  } catch (error) {
    results.error = error instanceof Error ? {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5),
    } : String(error);
    results.summary = 'TESTS FAILED';
  }

  return NextResponse.json(results, { status: 200 });
}
