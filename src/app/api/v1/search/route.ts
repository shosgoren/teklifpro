import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/shared/utils/prisma';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('SearchAPI');

/**
 * Arama sonuclarinin veri yapisi
 */
interface SearchResult {
  id: string;
  type: 'proposal' | 'customer' | 'product';
  title: string;
  subtitle: string;
  highlight: string;
  url: string;
  metadata: Record<string, any>;
}

/**
 * Arama API yanit formati
 */
interface SearchResponse {
  success: boolean;
  data?: {
    query: string;
    total: number;
    results: SearchResult[];
    facets: {
      proposals: number;
      customers: number;
      products: number;
    };
  };
  error?: string;
}

/**
 * Metni vurgula - eslesen kisimlari isaretler
 */
function highlightMatch(text: string, query: string, limit: number = 100): string {
  if (!text || !query) return text.substring(0, limit);

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) {
    return text.substring(0, limit) + (text.length > limit ? '...' : '');
  }

  const start = Math.max(0, index - 20);
  const end = Math.min(text.length, start + limit);
  let snippet = text.substring(start, end);

  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';

  return snippet;
}

/**
 * Teklif basliginda kismi esleme skoru
 */
function calculateRelevanceScore(text: string, query: string): number {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // Tam esleme
  if (lowerText === lowerQuery) return 100;

  // Basinda basliyor
  if (lowerText.startsWith(lowerQuery)) return 80;

  // Kelime basinda basliyor
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(`\\b${escapedQuery}`).test(lowerText)) return 60;

  // Icinde var
  return 30;
}

/**
 * Tekliflerde ara
 */
async function searchProposals(
  query: string,
  tenantId: string,
  limit: number,
  offset: number
) {
  const searchFilter: any = {
    AND: [
      { tenantId },
      { deletedAt: null },
      {
        OR: [
          { proposalNumber: { contains: query, mode: 'insensitive' } },
          { title: { contains: query, mode: 'insensitive' } },
          { notes: { contains: query, mode: 'insensitive' } },
          {
            customer: {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
              ],
            },
          },
        ],
      },
    ],
  };

  const [proposals, total] = await Promise.all([
    prisma.proposal.findMany({
      where: searchFilter,
      select: {
        id: true,
        proposalNumber: true,
        title: true,
        notes: true,
        status: true,
        grandTotal: true,
        customer: {
          select: { name: true, id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.proposal.count({ where: searchFilter }),
  ]);

  return {
    results: proposals.map((p) => {
      const relevance = Math.max(
        calculateRelevanceScore(p.proposalNumber, query),
        calculateRelevanceScore(p.title, query),
        calculateRelevanceScore(p.notes || '', query),
        calculateRelevanceScore(p.customer.name, query)
      );

      const highlightText =
        highlightMatch(p.title, query) ||
        highlightMatch(p.proposalNumber, query) ||
        highlightMatch(p.notes || '', query) ||
        highlightMatch(p.customer.name, query);

      return {
        id: p.id,
        type: 'proposal' as const,
        title: p.proposalNumber,
        subtitle: p.title,
        highlight: highlightText,
        url: `/proposals/${p.id}`,
        metadata: {
          customerName: p.customer.name,
          status: p.status,
          grandTotal: Number(p.grandTotal),
          relevance,
        },
      };
    }),
    total,
  };
}

/**
 * Musterilerde ara
 */
async function searchCustomers(
  query: string,
  tenantId: string,
  limit: number,
  offset: number
) {
  const searchFilter: any = {
    AND: [
      { tenantId },
      { deletedAt: null },
      {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
          { taxNumber: { contains: query, mode: 'insensitive' } },
          { shortName: { contains: query, mode: 'insensitive' } },
        ],
      },
    ],
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where: searchFilter,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        taxNumber: true,
        shortName: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.customer.count({ where: searchFilter }),
  ]);

  return {
    results: customers.map((c) => {
      const relevance = Math.max(
        calculateRelevanceScore(c.name, query),
        calculateRelevanceScore(c.email || '', query),
        calculateRelevanceScore(c.shortName || '', query),
        calculateRelevanceScore(c.taxNumber || '', query)
      );

      const highlightText =
        highlightMatch(c.name, query) ||
        highlightMatch(c.email || '', query) ||
        highlightMatch(c.shortName || '', query);

      return {
        id: c.id,
        type: 'customer' as const,
        title: c.name,
        subtitle: c.shortName || c.email || c.phone || '',
        highlight: highlightText,
        url: `/customers/${c.id}`,
        metadata: {
          email: c.email,
          phone: c.phone,
          taxNumber: c.taxNumber,
          relevance,
        },
      };
    }),
    total,
  };
}

/**
 * Urunlerde ara
 */
async function searchProducts(
  query: string,
  tenantId: string,
  limit: number,
  offset: number
) {
  const searchFilter: any = {
    AND: [
      { tenantId },
      { deletedAt: null },
      {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { code: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
    ],
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: searchFilter,
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        listPrice: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.product.count({ where: searchFilter }),
  ]);

  return {
    results: products.map((p) => {
      const relevance = Math.max(
        calculateRelevanceScore(p.name, query),
        calculateRelevanceScore(p.code || '', query),
        calculateRelevanceScore(p.description || '', query)
      );

      const highlightText =
        highlightMatch(p.name, query) ||
        highlightMatch(p.code || '', query) ||
        highlightMatch(p.description || '', query);

      return {
        id: p.id,
        type: 'product' as const,
        title: p.name,
        subtitle: p.code || '',
        highlight: highlightText,
        url: `/products/${p.id}`,
        metadata: {
          code: p.code,
          listPrice: Number(p.listPrice),
          relevance,
        },
      };
    }),
    total,
  };
}

/**
 * GET /api/v1/search
 *
 * Sorgu parametreleri:
 * - q: arama terimi (zorunlu)
 * - type: 'all' | 'proposals' | 'customers' | 'products' (varsayilan: 'all')
 * - page: sayfa numarasi (varsayilan: 1)
 * - limit: sayfa basina sonuc sayisi (varsayilan: 10, maksimum: 50)
 */
async function handleGet(request: NextRequest): Promise<NextResponse<SearchResponse>> {
  try {
    const session = getSessionFromRequest(request)!;

    const tenantId = session.tenant.id;

    // Sorgu parametrelerini al
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q')?.trim();
    const type = (searchParams.get('type') || 'all') as 'all' | 'proposals' | 'customers' | 'products';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const offset = (page - 1) * limit;

    // Arama terimi kontrol et
    if (!q || q.length < 2) {
      return NextResponse.json({
        success: true,
        data: {
          query: q || '',
          total: 0,
          results: [],
          facets: { proposals: 0, customers: 0, products: 0 },
        },
      });
    }

    // Paralel aramalari calistir
    const searchPromises = [];

    if (type === 'all' || type === 'proposals') {
      searchPromises.push(searchProposals(q, tenantId, limit, offset));
    }

    if (type === 'all' || type === 'customers') {
      searchPromises.push(searchCustomers(q, tenantId, limit, offset));
    }

    if (type === 'all' || type === 'products') {
      searchPromises.push(searchProducts(q, tenantId, limit, offset));
    }

    const searchResults = await Promise.all(searchPromises);

    // Sonuclari birlestir ve ilgiye gore sirala
    let allResults: SearchResult[] = [];
    const facets = { proposals: 0, customers: 0, products: 0 };

    if (type === 'all' || type === 'proposals') {
      const proposalResults = searchResults[0];
      allResults = allResults.concat(proposalResults.results);
      facets.proposals = proposalResults.total;
    }

    if (type === 'all' || type === 'customers') {
      const customerResults = searchResults[
        type === 'all' ? 1 : type === 'customers' ? 0 : -1
      ];
      if (customerResults) {
        allResults = allResults.concat(customerResults.results);
        facets.customers = customerResults.total;
      }
    }

    if (type === 'all' || type === 'products') {
      const productResults = searchResults[
        type === 'all' ? 2 : type === 'products' ? 0 : -1
      ];
      if (productResults) {
        allResults = allResults.concat(productResults.results);
        facets.products = productResults.total;
      }
    }

    // Ilgi derecesine gore sirala (yuksekten dusuge)
    allResults.sort((a, b) => {
      const scoreA = (a.metadata.relevance as number) || 0;
      const scoreB = (b.metadata.relevance as number) || 0;
      return scoreB - scoreA;
    });

    const total = allResults.length;
    const paginatedResults = allResults.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: {
        query: q,
        total,
        results: paginatedResults,
        facets,
      },
    });
  } catch (error) {
    logger.error('Arama hatasi', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Arama islemi sirasinda bir hata olustu',
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet, ['proposal.read']);
