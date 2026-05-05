import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  const items = await prisma.proposalItem.findMany({
    take: 8,
    orderBy: { proposal: { createdAt: 'desc' } },
    select: {
      id: true,
      name: true,
      productId: true,
      proposal: { select: { proposalNumber: true } },
      product: { select: { id: true, name: true, imageUrl: true } },
    },
  })
  console.log(JSON.stringify(items, null, 2))
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
