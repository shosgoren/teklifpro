import { NextRequest, NextResponse } from 'next/server';
import { ProposalPdfService } from '@/infrastructure/services/pdf/ProposalPdfService';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/shared/auth/authOptions';

// Type definitions for proposal and tenant
interface ProposalItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount?: number;
  tax?: number;
  total: number;
}

interface Customer {
  id: string;
  name: string;
  companyName: string;
  title?: string;
  address?: string;
  phone?: string;
  email?: string;
  taxNumber?: string;
}

interface Proposal {
  id: string;
  number: string;
  date: Date;
  validUntil: Date;
  status: string;
  customer: Customer;
  items: ProposalItem[];
  subtotal: number;
  discountAmount?: number;
  taxAmount?: number;
  total: number;
  paymentTerms?: string;
  deliveryTerms?: string;
  notes?: string;
  tenantId: string;
}

interface Tenant {
  id: string;
  name: string;
  address?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  taxNumber?: string;
}

interface ProposalRepository {
  findById(id: string, tenantId: string): Promise<Proposal | null>;
}

interface TenantRepository {
  findById(id: string): Promise<Tenant | null>;
}

// Mock repositories - replace with actual implementations
const proposalRepository: ProposalRepository = {
  async findById(id: string, tenantId: string): Promise<Proposal | null> {
    // Implementation would query actual database
    return null;
  },
};

const tenantRepository: TenantRepository = {
  async findById(id: string): Promise<Tenant | null> {
    // Implementation would query actual database
    return null;
  },
};

/**
 * GET /api/v1/proposals/[id]/pdf
 *
 * Generate and download PDF for a proposal
 *
 * Query Parameters:
 * - download: boolean (default: true) - whether to trigger download or inline display
 *
 * Response:
 * - 200: PDF file as binary
 * - 401: Unauthorized
 * - 403: Forbidden (no read permission)
 * - 404: Proposal not found
 * - 500: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get proposal ID from params
    const { id } = await params;

    // Get tenant ID from session (adjust based on your session structure)
    const tenantId = (session.user as any).tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 401 });
    }

    // Fetch proposal
    const proposal = await proposalRepository.findById(id, tenantId);
    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Verify proposal belongs to user's tenant
    if (proposal.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch tenant data
    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Generate PDF
    const pdfBuffer = ProposalPdfService.generateProposalPdf(proposal, tenant);

    // Create filename
    const filename = `TKL-${proposal.number}.pdf`;

    // Get download parameter from query
    const url = new URL(request.url);
    const isDownload = url.searchParams.get('download') !== 'false';

    // Return PDF
    return new NextResponse(pdfBuffer, {
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
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const tenantId = (session.user as any).tenantId;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 401 });
    }

    const proposal = await proposalRepository.findById(id, tenantId);
    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    if (proposal.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Generate PDF
    const pdfBuffer = ProposalPdfService.generateProposalPdf(proposal, tenant);

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
