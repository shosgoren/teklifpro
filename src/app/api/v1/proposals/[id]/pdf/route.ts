import { NextRequest, NextResponse } from 'next/server';
import { ProposalPdfService } from '@/infrastructure/services/pdf/ProposalPdfService';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/shared/auth/authOptions';
import { prisma } from '@/shared/utils/prisma';
import type { Proposal } from '@/domain/entities/Proposal';
import type { Tenant } from '@/domain/entities/Tenant';

/**
 * Map a Prisma proposal record to the Proposal domain entity used by ProposalPdfService.
 */
function mapToProposalEntity(
  dbProposal: Awaited<ReturnType<typeof fetchProposal>>
): Proposal | null {
  if (!dbProposal) return null;

  return {
    id: dbProposal.id,
    number: dbProposal.proposalNumber,
    date: dbProposal.createdAt,
    validUntil: dbProposal.expiresAt || dbProposal.createdAt,
    status: dbProposal.status,
    customer: {
      companyName: dbProposal.customer.name,
      name: dbProposal.customer.name,
      address: dbProposal.customer.address || undefined,
      phone: dbProposal.customer.phone || undefined,
      email: dbProposal.customer.email || undefined,
      taxNumber: dbProposal.customer.taxNumber || undefined,
    },
    items: dbProposal.items.map((item) => ({
      name: item.name,
      description: item.description || undefined,
      quantity: Number(item.quantity),
      unit: item.unit,
      unitPrice: Number(item.unitPrice),
      discount: Number(item.discountRate),
      tax: Number(item.vatRate),
      total: Number(item.lineTotal),
    })),
    subtotal: Number(dbProposal.subtotal),
    discountAmount: Number(dbProposal.discountAmount),
    taxAmount: Number(dbProposal.vatTotal),
    total: Number(dbProposal.grandTotal),
    paymentTerms: dbProposal.paymentTerms || undefined,
    deliveryTerms: dbProposal.deliveryTerms || undefined,
    notes: dbProposal.notes || undefined,
  };
}

function mapToTenantEntity(
  dbTenant: { id: string; name: string; address: string | null; phone: string | null; email: string; taxNumber: string | null; logo: string | null }
): Tenant {
  return {
    id: dbTenant.id,
    name: dbTenant.name,
    address: dbTenant.address || undefined,
    phone: dbTenant.phone || undefined,
    email: dbTenant.email,
    taxNumber: dbTenant.taxNumber || undefined,
    logo: dbTenant.logo || undefined,
  };
}

async function fetchProposal(id: string, tenantId: string) {
  return prisma.proposal.findFirst({
    where: {
      id,
      tenantId,
      deletedAt: null,
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          taxNumber: true,
        },
      },
      items: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
}

/**
 * GET /api/v1/proposals/[id]/pdf
 *
 * Generate and download PDF for a proposal
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = params.id;

    // Get tenant ID from session
    const tenantId = (session.user as any).tenantId as string | undefined;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 401 });
    }

    // Fetch proposal from DB
    const dbProposal = await fetchProposal(id, tenantId);
    if (!dbProposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Map to domain entity
    const proposal = mapToProposalEntity(dbProposal);
    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Fetch tenant data
    const dbTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, address: true, phone: true, email: true, taxNumber: true, logo: true },
    });
    if (!dbTenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const tenant = mapToTenantEntity(dbTenant);

    // Generate PDF
    const pdfBuffer = await ProposalPdfService.generateProposalPdf(proposal, tenant);

    // Create filename
    const filename = `TKL-${proposal.number}.pdf`;

    // Get download parameter from query
    const url = new URL(request.url);
    const isDownload = url.searchParams.get('download') !== 'false';

    // Return PDF - convert Buffer to Uint8Array for NextResponse compatibility
    const pdfBytes = new Uint8Array(pdfBuffer);
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': isDownload
          ? `attachment; filename="${encodeURIComponent(filename)}"`
          : `inline; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate PDF',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/proposals/[id]/pdf
 *
 * Preview PDF generation (optional - for validating before download)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = params.id;
    const tenantId = (session.user as any).tenantId as string | undefined;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 401 });
    }

    const dbProposal = await fetchProposal(id, tenantId);
    if (!dbProposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const proposal = mapToProposalEntity(dbProposal);
    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const dbTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, address: true, phone: true, email: true, taxNumber: true, logo: true },
    });
    if (!dbTenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const tenant = mapToTenantEntity(dbTenant);

    // Generate PDF
    const pdfBuffer = await ProposalPdfService.generateProposalPdf(proposal, tenant);

    // Return as base64 for preview
    const base64 = pdfBuffer.toString('base64');

    return NextResponse.json({
      success: true,
      data: {
        base64,
        filename: `TKL-${proposal.number}.pdf`,
        size: pdfBuffer.length,
      },
    });
  } catch (error) {
    console.error('Error previewing PDF:', error);

    return NextResponse.json(
      {
        error: 'Failed to preview PDF',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
