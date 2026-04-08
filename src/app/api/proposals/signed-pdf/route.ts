import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/utils/prisma';
import { decryptSignature } from '@/shared/utils/signatureCrypto';
import { ProposalPdfService } from '@/infrastructure/services/pdf/ProposalPdfService';
import type { Proposal } from '@/domain/entities/Proposal';
import type { Tenant } from '@/domain/entities/Tenant';
import { Logger } from '@/infrastructure/logger';
import { createRateLimitMap } from '@/shared/utils/rateLimit';

const logger = new Logger('SignedPdfAPI');

// Rate limiting: 10 req/min per token
const limiter = createRateLimitMap({ maxRequests: 10, windowMs: 60_000 });

/**
 * GET /api/proposals/signed-pdf?token=xxx
 * Public endpoint — generates signed PDF for accepted proposals
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token || token.length < 10) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Rate limit
    const { allowed } = limiter.check(token);
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const dbProposal = await prisma.proposal.findFirst({
      where: { publicToken: token, deletedAt: null, status: 'ACCEPTED' },
      include: {
        tenant: {
          select: {
            id: true, name: true, address: true, phone: true, email: true, taxNumber: true, logo: true,
          },
        },
        customer: {
          select: { id: true, name: true, email: true, phone: true, address: true, taxNumber: true, logo: true },
        },
        contact: { select: { name: true, title: true } },
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!dbProposal) {
      return NextResponse.json({ error: 'Signed proposal not found' }, { status: 404 });
    }

    // Map to domain entity
    const proposal: Proposal = {
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
        logo: dbProposal.customer.logo || undefined,
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

    // Try to fetch company signature fields (columns may not exist yet)
    try {
      const sigData = await prisma.tenant.findUnique({
        where: { id: dbProposal.tenant.id },
        select: { companySignature: true, companySeal: true, companySignerName: true, companySignerTitle: true },
      });
      if (sigData?.companySignature) {
        const decrypted = decryptSignature(sigData.companySignature);
        if (decrypted && decrypted.startsWith('data:image/')) {
          proposal.companySignature = {
            data: decrypted,
            signerName: sigData.companySignerName || undefined,
            signerTitle: sigData.companySignerTitle || undefined,
          };
        }
      }
      if (sigData?.companySeal) {
        const decrypted = decryptSignature(sigData.companySeal);
        if (decrypted && decrypted.startsWith('data:image/')) {
          proposal.companySeal = decrypted;
        }
      }
    } catch {
      // Signature columns may not exist in DB yet
    }

    // Add customer signature
    if (dbProposal.signatureData) {
      const decrypted = decryptSignature(dbProposal.signatureData);
      if (decrypted && decrypted.startsWith('data:image/')) {
        proposal.customerSignature = {
          data: decrypted,
          signerName: dbProposal.signerName || undefined,
          signedAt: dbProposal.signedAt?.toISOString() || undefined,
        };
      }
    }

    const tenant: Tenant = {
      id: dbProposal.tenant.id,
      name: dbProposal.tenant.name,
      address: dbProposal.tenant.address || undefined,
      phone: dbProposal.tenant.phone || undefined,
      email: dbProposal.tenant.email,
      taxNumber: dbProposal.tenant.taxNumber || undefined,
      logo: dbProposal.tenant.logo || undefined,
    };

    const pdfBuffer = await ProposalPdfService.generateProposalPdf(proposal, tenant);
    const filename = `TKL-${proposal.number}-IMZALI.pdf`;

    const pdfBytes = new Uint8Array(pdfBuffer);
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    logger.error('Error generating signed PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate signed PDF' },
      { status: 500 }
    );
  }
}
