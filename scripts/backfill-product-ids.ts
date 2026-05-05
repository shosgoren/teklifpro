// Mevcut proposal item'larında productId null olanlar için, aynı tenant
// içindeki Product ile name eşleşmesi yaparak backfill eder.
import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  const dryRun = process.argv.includes('--dry-run')

  const items = await prisma.proposalItem.findMany({
    where: { productId: null },
    select: {
      id: true,
      name: true,
      proposal: { select: { tenantId: true, proposalNumber: true } },
    },
  })

  console.log(`Found ${items.length} items with null productId`)

  let matched = 0
  let unmatched = 0

  for (const item of items) {
    const product = await prisma.product.findFirst({
      where: {
        tenantId: item.proposal.tenantId,
        deletedAt: null,
        name: item.name,
      },
      select: { id: true },
    })

    if (product) {
      console.log(
        `  ✓ ${item.proposal.proposalNumber} item "${item.name}" → product ${product.id}`,
      )
      if (!dryRun) {
        await prisma.proposalItem.update({
          where: { id: item.id },
          data: { productId: product.id },
        })
      }
      matched += 1
    } else {
      unmatched += 1
    }
  }

  console.log(`\nMatched: ${matched}`)
  console.log(`Unmatched: ${unmatched}`)
  console.log(dryRun ? '\n(dry run — no writes)' : '\n✓ Updates committed')

  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
