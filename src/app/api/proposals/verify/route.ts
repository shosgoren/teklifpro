import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/utils/prisma';
import * as crypto from 'crypto';

// Rate limiting: 20 req/min per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of rateLimitMap.entries()) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }, 60_000);
}

/**
 * Generate the same hash used in ProposalPdfService
 */
function generateHash(tenantId: string, proposalNumber: string, total: number, customerName: string, itemCount: number): string {
  const data = `${tenantId}:${proposalNumber}:${total}:${customerName}:${itemCount}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * GET /api/proposals/verify?hash=xxx
 * Public endpoint — verifies document integrity by hash
 */
export async function GET(request: NextRequest) {
  const hash = request.nextUrl.searchParams.get('hash');
  if (!hash || hash.length < 16) {
    return NextResponse.json({ success: false, error: 'Invalid hash' }, { status: 400 });
  }

  // Rate limit
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const rl = rateLimitMap.get(ip);
  if (rl && now < rl.resetAt) {
    if (rl.count >= 20) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
    }
    rl.count++;
  } else {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
  }

  // Search proposals — we need to compute hash for each and match
  // For efficiency, we store the first 16 chars as a quick filter via proposal number pattern
  // But since hash depends on multiple fields, we need to search all proposals
  // We'll limit the search to avoid performance issues
  const proposals = await prisma.proposal.findMany({
    where: { deletedAt: null },
    select: {
      proposalNumber: true,
      grandTotal: true,
      status: true,
      createdAt: true,
      signedAt: true,
      signerName: true,
      tenantId: true,
      tenant: { select: { id: true, name: true } },
      customer: { select: { name: true } },
      items: { select: { id: true } },
    },
    take: 1000,
    orderBy: { createdAt: 'desc' },
  });

  for (const p of proposals) {
    const computedHash = generateHash(p.tenantId, p.proposalNumber, Number(p.grandTotal), p.customer.name, p.items.length);
    if (computedHash === hash) {
      return NextResponse.json({
        success: true,
        data: {
          verified: true,
          proposalNumber: p.proposalNumber,
          companyName: p.tenant.name,
          customerName: p.customer.name,
          status: p.status,
          createdAt: p.createdAt.toISOString(),
          signedAt: p.signedAt?.toISOString() || null,
          signerName: p.signerName || null,
          hash: computedHash,
        },
      });
    }
  }

  return NextResponse.json({
    success: true,
    data: { verified: false, hash },
  });
}
