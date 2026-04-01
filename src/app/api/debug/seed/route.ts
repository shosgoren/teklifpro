import { NextResponse } from 'next/server';
import { prisma } from '@/shared/utils/prisma';

// Seed sample data - only works in development
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const tenantId = 'cmnebwhp80007nrgsln3l6g2h';
  const userId = 'cmnebwhpi0009nrgsux77mtk1';

  try {
    // Check if data already exists
    const existing = await prisma.product.count({ where: { tenantId } });
    if (existing > 0) {
      return NextResponse.json({ message: 'Data already exists, skipping seed' });
    }

    // Create products
    const products = await Promise.all([
      prisma.product.create({
        data: {
          tenantId,
          code: 'WEB-001',
          name: 'Web Sitesi Tasarımı',
          unit: 'Adet',
          listPrice: 25000,
          vatRate: 20,
          category: 'Yazılım',
          description: 'Kurumsal web sitesi tasarımı ve geliştirme',
          isActive: true,
        },
      }),
      prisma.product.create({
        data: {
          tenantId,
          code: 'MOB-001',
          name: 'Mobil Uygulama Geliştirme',
          unit: 'Adet',
          listPrice: 75000,
          vatRate: 20,
          category: 'Yazılım',
          description: 'iOS ve Android mobil uygulama geliştirme',
          isActive: true,
        },
      }),
      prisma.product.create({
        data: {
          tenantId,
          code: 'DAN-001',
          name: 'Yazılım Danışmanlığı',
          unit: 'Saat',
          listPrice: 1500,
          vatRate: 20,
          category: 'Hizmet',
          description: 'Yazılım mimari danışmanlık hizmeti',
          isActive: true,
        },
      }),
      prisma.product.create({
        data: {
          tenantId,
          code: 'SEO-001',
          name: 'SEO Optimizasyonu',
          unit: 'Ay',
          listPrice: 5000,
          vatRate: 20,
          category: 'Hizmet',
          description: 'Aylık SEO optimizasyon paketi',
          isActive: true,
        },
      }),
      prisma.product.create({
        data: {
          tenantId,
          code: 'SRV-001',
          name: 'Sunucu Barındırma',
          unit: 'Ay',
          listPrice: 2500,
          vatRate: 20,
          category: 'Donanım',
          description: 'Bulut sunucu barındırma hizmeti',
          isActive: true,
        },
      }),
    ]);

    // Create customers
    const customers = await Promise.all([
      prisma.customer.create({
        data: {
          tenantId,
          name: 'Teknoloji Çözümleri A.Ş.',
          shortName: 'TekÇöz',
          email: 'info@tekcoz.com',
          phone: '+90 212 555 1234',
          city: 'İstanbul',
          address: 'Levent Mah. İş Kuleleri No:1 Kat:15',
          taxNumber: '1234567890',
          isActive: true,
        },
      }),
      prisma.customer.create({
        data: {
          tenantId,
          name: 'Dijital Medya Ltd.',
          shortName: 'DigiMedia',
          email: 'iletisim@digimedia.com.tr',
          phone: '+90 216 444 5678',
          city: 'İstanbul',
          address: 'Kadıköy Moda Cad. No:45',
          taxNumber: '9876543210',
          isActive: true,
        },
      }),
      prisma.customer.create({
        data: {
          tenantId,
          name: 'Anadolu Yazılım Danışmanlık',
          shortName: 'AYD',
          email: 'info@anadoluyazilim.com',
          phone: '+90 312 333 9012',
          city: 'Ankara',
          address: 'Çankaya İlçesi, Atatürk Bulvarı No:120',
          taxNumber: '5555666677',
          isActive: true,
        },
      }),
    ]);

    // Create proposals
    const proposal1 = await prisma.proposal.create({
      data: {
        tenant: { connect: { id: tenantId } },
        customer: { connect: { id: customers[0].id } },
        user: { connect: { id: userId } },
        proposalNumber: 'TKL-2026-000001',
        title: 'Kurumsal Web Sitesi Projesi',
        description: 'Teknoloji Çözümleri A.Ş. için kurumsal web sitesi tasarımı ve geliştirme teklifi',
        status: 'SENT',
        subtotal: 30000,
        vatTotal: 6000,
        grandTotal: 36000,
        currency: 'TRY',
        publicToken: `pub-${Date.now()}-1`,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: 'Teklif 30 gün geçerlidir.',
        paymentTerms: '%50 peşin, %50 teslimde',
      },
    });

    await Promise.all([
      prisma.proposalItem.create({
        data: {
          proposalId: proposal1.id,
          productId: products[0].id,
          name: 'Web Sitesi Tasarımı',
          unit: 'Adet',
          quantity: 1,
          unitPrice: 25000,
          discountRate: 0,
          vatRate: 20,
          lineTotal: 25000,
          sortOrder: 0,
        },
      }),
      prisma.proposalItem.create({
        data: {
          proposalId: proposal1.id,
          productId: products[3].id,
          name: 'SEO Optimizasyonu (3 Ay)',
          unit: 'Ay',
          quantity: 3,
          unitPrice: 5000,
          discountRate: 10,
          vatRate: 20,
          lineTotal: 13500,
          sortOrder: 1,
        },
      }),
    ]);

    const proposal2 = await prisma.proposal.create({
      data: {
        tenant: { connect: { id: tenantId } },
        customer: { connect: { id: customers[1].id } },
        user: { connect: { id: userId } },
        proposalNumber: 'TKL-2026-000002',
        title: 'Mobil Uygulama Geliştirme',
        description: 'Dijital Medya Ltd. için iOS ve Android mobil uygulama geliştirme teklifi',
        status: 'DRAFT',
        subtotal: 85000,
        vatTotal: 17000,
        grandTotal: 102000,
        currency: 'TRY',
        publicToken: `pub-${Date.now()}-2`,
        expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        notes: 'Proje tahmini süre: 4 ay',
        paymentTerms: '3 taksitte ödeme',
      },
    });

    await Promise.all([
      prisma.proposalItem.create({
        data: {
          proposalId: proposal2.id,
          productId: products[1].id,
          name: 'Mobil Uygulama Geliştirme',
          unit: 'Adet',
          quantity: 1,
          unitPrice: 75000,
          discountRate: 0,
          vatRate: 20,
          lineTotal: 75000,
          sortOrder: 0,
        },
      }),
      prisma.proposalItem.create({
        data: {
          proposalId: proposal2.id,
          productId: products[2].id,
          name: 'Yazılım Danışmanlığı',
          unit: 'Saat',
          quantity: 10,
          unitPrice: 1500,
          discountRate: 0,
          vatRate: 20,
          lineTotal: 15000,
          sortOrder: 1,
        },
      }),
    ]);

    const proposal3 = await prisma.proposal.create({
      data: {
        tenant: { connect: { id: tenantId } },
        customer: { connect: { id: customers[2].id } },
        user: { connect: { id: userId } },
        proposalNumber: 'TKL-2026-000003',
        title: 'Yıllık Bakım ve Destek Paketi',
        description: 'Anadolu Yazılım Danışmanlık için yıllık bakım ve teknik destek teklifi',
        status: 'ACCEPTED',
        subtotal: 42000,
        vatTotal: 8400,
        grandTotal: 50400,
        currency: 'TRY',
        publicToken: `pub-${Date.now()}-3`,
        expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        paymentTerms: 'Yıllık peşin ödeme',
      },
    });

    await Promise.all([
      prisma.proposalItem.create({
        data: {
          proposalId: proposal3.id,
          productId: products[4].id,
          name: 'Sunucu Barındırma (12 Ay)',
          unit: 'Ay',
          quantity: 12,
          unitPrice: 2500,
          discountRate: 0,
          vatRate: 20,
          lineTotal: 30000,
          sortOrder: 0,
        },
      }),
      prisma.proposalItem.create({
        data: {
          proposalId: proposal3.id,
          productId: products[2].id,
          name: 'Yazılım Danışmanlığı',
          unit: 'Saat',
          quantity: 8,
          unitPrice: 1500,
          discountRate: 0,
          vatRate: 20,
          lineTotal: 12000,
          sortOrder: 1,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      seeded: {
        products: products.length,
        customers: customers.length,
        proposals: 3,
        items: 6,
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
