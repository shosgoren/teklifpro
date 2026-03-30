import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create default permissions
  const permissions = await Promise.all([
    prisma.permission.upsert({
      where: { code: 'proposal.create' },
      update: {},
      create: {
        code: 'proposal.create',
        name: 'Teklif Oluştur',
        description: 'Yeni teklifler oluşturabilir',
        category: 'PROPOSAL',
      },
    }),
    prisma.permission.upsert({
      where: { code: 'proposal.read' },
      update: {},
      create: {
        code: 'proposal.read',
        name: 'Teklif Görüntüle',
        description: 'Teklifleri görüntüleyebilir',
        category: 'PROPOSAL',
      },
    }),
    prisma.permission.upsert({
      where: { code: 'proposal.update' },
      update: {},
      create: {
        code: 'proposal.update',
        name: 'Teklif Güncelle',
        description: 'Teklifleri düzenleyebilir',
        category: 'PROPOSAL',
      },
    }),
    prisma.permission.upsert({
      where: { code: 'proposal.delete' },
      update: {},
      create: {
        code: 'proposal.delete',
        name: 'Teklif Sil',
        description: 'Teklifleri silebilir',
        category: 'PROPOSAL',
      },
    }),
    prisma.permission.upsert({
      where: { code: 'proposal.send' },
      update: {},
      create: {
        code: 'proposal.send',
        name: 'Teklif Gönder',
        description: 'Teklifleri müşterilere gönderebilir (e-posta, WhatsApp vb.)',
        category: 'PROPOSAL',
      },
    }),
    prisma.permission.upsert({
      where: { code: 'customer.read' },
      update: {},
      create: {
        code: 'customer.read',
        name: 'Müşteri Görüntüle',
        description: 'Müşterileri görüntüleyebilir',
        category: 'CUSTOMER',
      },
    }),
    prisma.permission.upsert({
      where: { code: 'customer.sync' },
      update: {},
      create: {
        code: 'customer.sync',
        name: 'Müşteri Senkronize Et',
        description: 'Parasut ile müşteri verilerini senkronize edebilir',
        category: 'CUSTOMER',
      },
    }),
    prisma.permission.upsert({
      where: { code: 'product.read' },
      update: {},
      create: {
        code: 'product.read',
        name: 'Ürün Görüntüle',
        description: 'Ürünleri görüntüleyebilir',
        category: 'PRODUCT',
      },
    }),
    prisma.permission.upsert({
      where: { code: 'product.sync' },
      update: {},
      create: {
        code: 'product.sync',
        name: 'Ürün Senkronize Et',
        description: 'Parasut ile ürün verilerini senkronize edebilir',
        category: 'PRODUCT',
      },
    }),
    prisma.permission.upsert({
      where: { code: 'settings.manage' },
      update: {},
      create: {
        code: 'settings.manage',
        name: 'Ayarları Yönet',
        description: 'Kiracı ayarlarını yönetebilir',
        category: 'SETTINGS',
      },
    }),
  ])

  console.log(`✅ Created ${permissions.length} permissions`)

  // Create default roles
  const ownerRole = await prisma.role.upsert({
    where: { code: 'OWNER' },
    update: {},
    create: {
      code: 'OWNER',
      name: 'Sahibi',
      description: 'Tüm izinlere sahiptir, tam yönetim erişimi',
      permissions: {
        connect: permissions.map((p) => ({ id: p.id })),
      },
    },
  })

  const adminPermissions = permissions.filter((p) => p.code !== 'proposal.delete')
  const adminRole = await prisma.role.upsert({
    where: { code: 'ADMIN' },
    update: {},
    create: {
      code: 'ADMIN',
      name: 'Yönetici',
      description: 'Yönetim görevlerini gerçekleştirebilir, silme işlemleri hariç',
      permissions: {
        connect: adminPermissions.map((p) => ({ id: p.id })),
      },
    },
  })

  const userPermissions = permissions.filter(
    (p) =>
      p.code.includes('proposal.') ||
      p.code.includes('customer.read') ||
      p.code.includes('product.read')
  )
  const userRole = await prisma.role.upsert({
    where: { code: 'USER' },
    update: {},
    create: {
      code: 'USER',
      name: 'Kullanıcı',
      description: 'Temel teklif ve veri görüntüleme izinlerine sahiptir',
      permissions: {
        connect: userPermissions.map((p) => ({ id: p.id })),
      },
    },
  })

  const viewerPermissions = permissions.filter(
    (p) => p.code.includes('.read') || p.code === 'proposal.send'
  )
  const viewerRole = await prisma.role.upsert({
    where: { code: 'VIEWER' },
    update: {},
    create: {
      code: 'VIEWER',
      name: 'Görüntüleyici',
      description: 'Verileri sadece görüntüleyebilir ve teklif gönderebilir',
      permissions: {
        connect: viewerPermissions.map((p) => ({ id: p.id })),
      },
    },
  })

  console.log(`✅ Created 4 roles: OWNER, ADMIN, USER, VIEWER`)

  // Create pricing plans
  const starterPlan = await prisma.plan.upsert({
    where: { code: 'STARTER' },
    update: {},
    create: {
      code: 'STARTER',
      name: 'Başlangıç',
      description: 'Küçük işletmeler için ideal',
      monthlyPrice: 299,
      yearlyPrice: 2390,
      maxProposals: 100,
      maxCustomers: 50,
      features: [
        'Sınırsız teklif şablonu',
        'Parasut entegrasyonu',
        'WhatsApp gönderimi',
        'Temel analitik',
        'E-posta desteği',
      ],
      isActive: true,
    },
  })

  const professionalPlan = await prisma.plan.upsert({
    where: { code: 'PROFESSIONAL' },
    update: {},
    create: {
      code: 'PROFESSIONAL',
      name: 'Profesyonel',
      description: 'Büyüyen işletmeler için',
      monthlyPrice: 599,
      yearlyPrice: 4790,
      maxProposals: -1, // Unlimited
      maxCustomers: -1, // Unlimited
      features: [
        'Sınırsız teklif şablonu',
        'Parasut entegrasyonu (tam sync)',
        'WhatsApp & Email gönderimi',
        'Gelişmiş analitik & raporlar',
        'Öncelikli destek',
        'Özel entegrasyonlar',
        'API erişimi',
        'Toplu işlemler',
      ],
      isActive: true,
    },
  })

  console.log(`✅ Created 2 pricing plans: STARTER, PROFESSIONAL`)

  // Create demo tenant
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'demo-tenant' },
    update: {},
    create: {
      name: 'Demo Şirketi',
      slug: 'demo-tenant',
      email: 'demo@teklifpro.com',
      plan: {
        connect: { id: professionalPlan.id },
      },
      settings: {
        parasutApiKey: 'demo_key_123456',
        parasutAccountId: '12345',
        whatsappEnabled: true,
        emailEnabled: true,
      },
    },
  })

  console.log(`✅ Created demo tenant`)

  // Create demo admin user
  const demoUser = await prisma.user.upsert({
    where: { email: 'admin@teklifpro.com' },
    update: {},
    create: {
      email: 'admin@teklifpro.com',
      name: 'Demo Admin',
      password: '$2b$10$demo_password_hash', // This should be hashed in production
      isEmailVerified: true,
      tenantUsers: {
        create: [
          {
            tenant: {
              connect: { id: demoTenant.id },
            },
            role: {
              connect: { id: ownerRole.id },
            },
            isActive: true,
          },
        ],
      },
    },
  })

  console.log(`✅ Created demo user: admin@teklifpro.com`)

  console.log('🌱 Database seed completed successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
