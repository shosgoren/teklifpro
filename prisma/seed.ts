import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create demo tenant
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'demo-tenant' },
    update: {},
    create: {
      name: 'Demo Şirketi',
      slug: 'demo-tenant',
      email: 'demo@teklifpro.com',
      plan: 'PROFESSIONAL',
      isActive: true,
    },
  })

  console.log(`✅ Created demo tenant: ${demoTenant.name}`)

  // Hash password for demo users
  const hashedPassword = await bcrypt.hash('Demo2026!', 10)

  // Create demo users with different roles
  const ownerUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: demoTenant.id, email: 'owner@teklifpro.com' } },
    update: {},
    create: {
      email: 'owner@teklifpro.com',
      name: 'Demo Owner',
      password: hashedPassword,
      role: 'OWNER',
      isActive: true,
      emailVerified: new Date(),
      tenantId: demoTenant.id,
    },
  })

  const adminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: demoTenant.id, email: 'admin@teklifpro.com' } },
    update: {},
    create: {
      email: 'admin@teklifpro.com',
      name: 'Demo Admin',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
      emailVerified: new Date(),
      tenantId: demoTenant.id,
    },
  })

  const regularUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: demoTenant.id, email: 'user@teklifpro.com' } },
    update: {},
    create: {
      email: 'user@teklifpro.com',
      name: 'Demo User',
      password: hashedPassword,
      role: 'USER',
      isActive: true,
      emailVerified: new Date(),
      tenantId: demoTenant.id,
    },
  })

  const viewerUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: demoTenant.id, email: 'viewer@teklifpro.com' } },
    update: {},
    create: {
      email: 'viewer@teklifpro.com',
      name: 'Demo Viewer',
      password: hashedPassword,
      role: 'VIEWER',
      isActive: true,
      emailVerified: new Date(),
      tenantId: demoTenant.id,
    },
  })

  console.log(`✅ Created 4 demo users:`)
  console.log(`   OWNER:  owner@teklifpro.com`)
  console.log(`   ADMIN:  admin@teklifpro.com`)
  console.log(`   USER:   user@teklifpro.com`)
  console.log(`   VIEWER: viewer@teklifpro.com`)
  console.log(`   Password: Demo2026!`)

  console.log('\n🌱 Database seed completed successfully!')
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
