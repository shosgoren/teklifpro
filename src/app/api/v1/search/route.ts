import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

/**
 * Arama sonuçlarının veri yapısı
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
 * Arama API yanıt formatı
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
 * Metni vurgula - eşleşen kısımları işaretler
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
 * Teklif başlığında kısmi eşleşme skoru
 */
function calculateRelevanceScore(text: string, query: string): number {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // Tam eşleşme
  if (lowerText === lowerQuery) return 100;

  // Başında başlıyor
  if (lowerText.startsWith(lowerQuery)) return 80;

  // Kelime başında başlıyor
  if (new RegExp(`\\b${query}`).test(lowerText)) return 60;

  // İçinde var
  return 30;
}

/**
 * Tekliflerde ara
 */
async function searchProposals(
  query: string,
  organizationId: string,
  limit: number,
  offset: number
) {
  const searchFilter = {
    AND: [
      { organizationId },
      {
        OR: [
          { number: { contains: query, mode: 'insensitive' } },
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
        number: true,
        title: true,
        notes: true,
        status: true,
        amount: true,
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
        calculateRelevanceScore(p.number, query),
        calculateRelevanceScore(p.title, query),
        calculateRelevanceScore(p.notes || '', query),
        calculateRelevanceScore(p.customer.name, query)
      );

      const highlightText =
        highlightMatch(p.title, query) ||
        highlightMatch(p.number, query) ||
        highlightMatch(p.notes || '', query) ||
        highlightMatch(p.customer.name, query);

      return {
        id: p.id,
        type: 'proposal' as const,
        title: p.number,
        subtitle: p.title,
        highlight: highlightText,
        url: `/proposals/${p.id}`,
        metadata: {
          customerName: p.customer.name,
          status: p.status,
          amount: p.amount,
          relevance,
        },
      };
    }),
    total,
  };
}

/**
 * Müşterilerde ara
 */
async function searchCustomers(
  query: string,
  organizationId: string,
  limit: number,
  offset: number
) {
  const searchFilter = {
    AND: [
      { organizationId },
      {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
          { taxNumber: { contains: query, mode: 'insensitive' } },
          { companyName: { contains: query, mode: 'insensitive' } },
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
        companyName: true,
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
        calculateRelevanceScore(c.companyName || '', query),
        calculateRelevanceScore(c.taxNumber || '', query)
      );

      const highlightText =
        highlightMatch(c.name, query) ||
        highlightMatch(c.email || '', query) ||
        highlightMatch(c.companyName || '', query);

      return {
        id: c.id,
        type: 'customer' as const,
        title: c.name,
        subtitle: c.companyName || c.email || c.phone || '',
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
 * Ürünlerde ara
 */
async function searchProducts(
  query: string,
  organizationId: string,
  limit: number,
  offset: number
) {
  const searchFilter = {
    AND: [
      { organizationId },
      {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { code: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { barcode: { contains: query, mode: 'insensitive' } },
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
        barcode: true,
        price: true,
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
        calculateRelevanceScore(p.code, query),
        calculateRelevanceScore(p.description || '', query),
        calculateRelevanceScore(p.barcode || '', query)
      );

      const highlightText =
        highlightMatch(p.name, query) ||
        highlightMatch(p.code, query) ||
        highlightMatch(p.description || '', query);

      return {
        id: p.id,
        type: 'product' as const,
        title: p.name,
        subtitle: p.code,
        highlight: highlightText,
        url: `/products/${p.id}`,
        metadata: {
          code: p.code,
          barcode: p.barcode,
          price: p.price,
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
 * - type: 'all' | 'proposals' | 'customers' | 'products' (varsayılan: 'all')
 * - page: sayfa numarası (varsayılan: 1)
 * - limit: sayfa başına sonuç sayısı (varsayılan: 10, maksimum: 50)
 */
export async function GET(request: NextRequest): Promise<NextResponse<SearchResponse>> {
  try {
    // Kullanıcı kimliğini doğrula
    const { userId, orgId } = { userId: request.headers.get('x-user-id'), orgId: request.headers.get('x-tenant-id') };

    if (!userId || !orgId) {
      return NextResponse.json(
        { success: false, error: 'Yetkisiz erişim' },
        { status: 401 }
      );
    }

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

    // Paralel aramaları çalıştır
    const searchPromises = [];

    if (type === 'all' || type === 'proposals') {
      searchPromises.push(searchProposals(q, orgId, limit, offset));
    }

    if (type === 'all' || type === 'customers') {
      searchPromises.push(searchCustomers(q, orgId, limit, offset));
    }

    if (type === 'all' || type === 'products') {
      searchPromises.push(searchProducts(q, orgId, limit, offset));
    }

    const searchResults = await Promise.all(searchPromises);

    // Sonuçları birleştir ve ilgiye göre sırala
    let allResults: SearchResult[] = [];
    let facets = { proposals: 0, customers: 0, products: 0 };

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

    // İlgi derecesine göre sırala (yüksekten düşüğe)
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
    console.error('Arama hatası:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Arama işlemi sırasında bir hata oluştu',
      },
      { status: 500 }
    );
  }
}
