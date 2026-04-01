import { notFound } from 'next/navigation'
import { prisma } from '@/shared/utils/prisma'
import { notifyProposalEvent } from '@/infrastructure/services/whatsapp/notifyProposalEvent'
import ProposalActions from './proposal-actions'
import ProposalContent from './proposal-content'
import { ViewTracker } from './view-tracker'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

interface ProposalPageProps {
  params: {
    token: string
  }
}

export async function generateMetadata({ params }: ProposalPageProps) {
  const proposal = await prisma.proposal.findUnique({
    where: { publicToken: params.token },
    include: { customer: true, tenant: true },
  })

  if (!proposal) {
    return { title: 'Teklif Bulunamadı' }
  }

  return {
    title: `${proposal.proposalNumber} - ${proposal.title}`,
    description: `${proposal.customer.name} için teklif belgesi`,
  }
}

export default async function ProposalPage({ params }: ProposalPageProps) {
  const proposal = await prisma.proposal.findUnique({
    where: { publicToken: params.token },
    include: {
      tenant: true,
      customer: true,
      contact: true,
      user: true,
      items: { orderBy: { sortOrder: 'asc' } },
      activities: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!proposal) {
    notFound()
  }

  // Track view
  const updatedProposal = await prisma.proposal.update({
    where: { id: proposal.id },
    data: {
      viewCount: { increment: 1 },
      viewedAt: new Date(),
      status: proposal.status === 'SENT' ? 'VIEWED' : proposal.status,
    },
    include: {
      tenant: true,
      customer: true,
      contact: true,
      user: true,
      items: { orderBy: { sortOrder: 'asc' } },
    },
  })

  await prisma.proposalActivity.create({
    data: {
      proposalId: proposal.id,
      type: 'VIEWED',
      metadata: { timestamp: new Date().toISOString() },
    },
  })

  // Notify proposal owner on first view (fire-and-forget)
  if (proposal.status === 'SENT') {
    notifyProposalEvent({
      proposalId: proposal.id,
      eventType: 'VIEWED',
    }).catch(() => {})
  }

  // Calculate line totals
  const itemsWithTotals = updatedProposal.items.map((item) => {
    const subtotal = Number(item.quantity) * Number(item.unitPrice)
    const discountAmount = (subtotal * Number(item.discountRate)) / 100
    const subtotalAfterDiscount = subtotal - discountAmount
    const vat = (subtotalAfterDiscount * Number(item.vatRate)) / 100
    const lineTotal = subtotalAfterDiscount + vat
    return { ...item, subtotal, discountAmount, subtotalAfterDiscount, vat, lineTotal }
  })

  // Calculate totals
  const subtotal = itemsWithTotals.reduce((sum, item) => sum + item.subtotal, 0)
  const totalDiscount = itemsWithTotals.reduce((sum, item) => sum + item.discountAmount, 0)
  const subtotalAfterDiscount = subtotal - totalDiscount

  let proposalLevelDiscount = 0
  if (updatedProposal.discountType === 'PERCENTAGE') {
    proposalLevelDiscount = (subtotalAfterDiscount * Number(updatedProposal.discountValue)) / 100
  } else if (updatedProposal.discountType === 'FIXED') {
    proposalLevelDiscount = Number(updatedProposal.discountValue) || 0
  }

  const finalSubtotal = subtotalAfterDiscount - proposalLevelDiscount
  const totalVat = itemsWithTotals.reduce((sum, item) => sum + item.vat, 0)
  const grandTotal = finalSubtotal + totalVat

  const isResponded =
    updatedProposal.status === 'ACCEPTED' ||
    updatedProposal.status === 'REJECTED' ||
    updatedProposal.status === 'REVISION_REQUESTED'

  const formatCurrency = (amount: number) =>
    amount.toLocaleString('tr-TR', { style: 'currency', currency: updatedProposal.currency })

  const createdDate = format(new Date(updatedProposal.createdAt), 'dd MMMM yyyy', { locale: tr })
  const expiresDate = updatedProposal.expiresAt
    ? format(new Date(updatedProposal.expiresAt), 'dd MMMM yyyy', { locale: tr })
    : null

  return (
    <>
    <ViewTracker token={params.token} />
    <ProposalContent
      proposal={{
        id: updatedProposal.id,
        proposalNumber: updatedProposal.proposalNumber,
        title: updatedProposal.title,
        status: updatedProposal.status,
        currency: updatedProposal.currency,
        description: updatedProposal.description,
        notes: updatedProposal.notes,
        paymentTerms: updatedProposal.paymentTerms,
        deliveryTerms: updatedProposal.deliveryTerms,
        termsConditions: updatedProposal.termsConditions,
        rejectionReason: updatedProposal.rejectionReason,
        revisionNote: updatedProposal.revisionNote,
        viewCount: updatedProposal.viewCount,
        createdDate,
        expiresDate,
        discountType: updatedProposal.discountType,
        discountValue: Number(updatedProposal.discountValue),
      }}
      tenant={{
        name: updatedProposal.tenant.name,
        logo: updatedProposal.tenant.logo,
        address: updatedProposal.tenant.address,
        phone: updatedProposal.tenant.phone,
        email: updatedProposal.tenant.email,
        taxNumber: updatedProposal.tenant.taxNumber,
      }}
      customer={{
        name: updatedProposal.customer.name,
        address: updatedProposal.customer.address,
        phone: updatedProposal.customer.phone,
        email: updatedProposal.customer.email,
        taxNumber: updatedProposal.customer.taxNumber,
      }}
      contact={updatedProposal.contact ? {
        name: updatedProposal.contact.name,
        title: updatedProposal.contact.title,
      } : null}
      userName={updatedProposal.user?.name ?? null}
      voiceNote={
        updatedProposal.voiceNoteData &&
        updatedProposal.voiceNoteData.startsWith('data:audio/') &&
        updatedProposal.voiceNoteData.includes(';base64,')
          ? {
              data: updatedProposal.voiceNoteData,
              duration: updatedProposal.voiceNoteDuration,
              senderName: updatedProposal.user?.name ?? null,
            }
          : null
      }
      signature={
        updatedProposal.signatureData &&
        updatedProposal.signatureData.startsWith('data:image/png;base64,')
          ? {
              data: updatedProposal.signatureData,
              signerName: updatedProposal.signerName,
              signedAt: updatedProposal.signedAt?.toISOString() ?? null,
            }
          : null
      }
      items={itemsWithTotals.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        unitPrice: Number(item.unitPrice),
        discountRate: Number(item.discountRate),
        vatRate: Number(item.vatRate),
        lineTotal: item.lineTotal,
        subtotalAfterDiscount: item.subtotalAfterDiscount,
        vat: item.vat,
      }))}
      financials={{
        subtotal,
        totalDiscount,
        proposalLevelDiscount,
        totalVat,
        grandTotal,
      }}
      isResponded={isResponded}
    />
    </>
  )
}
