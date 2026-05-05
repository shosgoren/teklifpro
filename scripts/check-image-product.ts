import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()

  const withImage = await prisma.product.findMany({
    where: { imageUrl: { not: null } },
    select: { id: true, name: true, imageUrl: true, tenantId: true },
  })
  console.log('Products with imageUrl:')
  console.log(JSON.stringify(withImage, null, 2))

  // Check: are any proposal items named the same?
  for (const p of withImage) {
    const matched = await prisma.proposalItem.count({
      where: { name: p.name, productId: null },
    })
    console.log(`Product "${p.name}" matches ${matched} proposal items where productId is null`)
  }

  // Check API endpoint structure for new proposals
  const recentProposal = await prisma.proposal.findFirst({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      proposalNumber: true,
      items: {
        select: { id: true, name: true, productId: true },
      },
    },
  })
  console.log('\nMost recent proposal:')
  console.log(JSON.stringify(recentProposal, null, 2))

  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
