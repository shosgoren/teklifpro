import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  const products = await prisma.product.findMany({
    take: 10,
    select: { id: true, name: true, imageUrl: true },
    orderBy: { createdAt: 'desc' },
  })
  console.log('Products:')
  console.log(JSON.stringify(products, null, 2))

  const withImage = await prisma.product.count({ where: { imageUrl: { not: null } } })
  const total = await prisma.product.count()
  console.log(`\n${withImage} of ${total} products have imageUrl`)

  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
