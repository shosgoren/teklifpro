import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { prisma } from '@/shared/utils/prisma'
import { decryptSignature } from '@/shared/utils/signatureCrypto'
import { notifyProposalEvent } from '@/infrastructure/services/whatsapp/notifyProposalEvent'
import ProposalContent from './proposal-content'
import ProposalUnavailable from './proposal-unavailable'
import PhoneGate from './phone-gate'
import { ViewTracker } from './view-tracker'
import { format } from 'date-fns'
import { tr, enUS } from 'date-fns/locale'
import { headers } from 'next/headers'
import { Sparkles, Shield, Lock } from 'lucide-react'

interface ProposalPageProps {
  params: {
    token: string
  }
}

export async function generateMetadata({ params }: ProposalPageProps) {
  const proposal = await prisma.proposal.findFirst({
    where: { publicToken: params.token, deletedAt: null },
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

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return '** ** ****'
  const last2 = digits.slice(-2)
  if (digits.length >= 10) {
    // Turkish format: 05XX XXX XX90
    const first2 = digits.slice(-10, -8)
    return `0${first2}** *** **${last2}`
  }
  return `${'*'.repeat(digits.length - 4)} ${digits.slice(-4, -2)}${last2}`
}

function verifyPhoneCookie(token: string): boolean {
  const cookieStore = cookies()
  const cookieName = `pv_${token.substring(0, 8)}`
  const cookieValue = cookieStore.get(cookieName)?.value
  if (!cookieValue) return false

  const parts = cookieValue.split(':')
  if (parts.length !== 3) return false

  const [cookieToken, expiryStr, hmac] = parts
  const expiry = parseInt(expiryStr, 10)

  // Check expiry
  if (isNaN(expiry) || Date.now() > expiry) return false

  // Check token matches
  if (cookieToken !== token) return false

  // Verify HMAC
  const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret'
  const payload = `${cookieToken}:${expiryStr}`
  const expectedHmac = crypto.createHmac('sha256', secret).update(payload).digest('hex')

  return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expectedHmac, 'hex'))
}

function detectLocaleFromHeaders(): 'tr' | 'en' {
  try {
    const headersList = headers()
    const acceptLanguage = headersList.get('accept-language') || ''
    return acceptLanguage.startsWith('tr') ? 'tr' : 'en'
  } catch {
    return 'tr'
  }
}

export default async function ProposalPage({ params }: ProposalPageProps) {
  try {
    return await renderProposalPage(params)
  } catch (error) {
    console.error('[ProposalPage] Server render error:', error instanceof Error ? error.message : error, error instanceof Error ? error.stack : '')
    throw error
  }
}

async function renderProposalPage(params: ProposalPageProps['params']) {
  const detectedLocale = detectLocaleFromHeaders()
  const dateFnsLocale = detectedLocale === 'tr' ? tr : enUS
  const localeStr = detectedLocale === 'tr' ? 'tr-TR' : 'en-US'

  const proposal = await prisma.proposal.findFirst({
    where: { publicToken: params.token, deletedAt: null },
    include: {
      tenant: true,
      customer: { include: { contacts: { orderBy: { isPrimary: 'desc' } } } },
      contact: true,
      user: true,
      items: { orderBy: { sortOrder: 'asc' } },
      activities: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!proposal) {
    // Check if it exists but was deleted — show friendly message
    const deleted = await prisma.proposal.findFirst({
      where: { publicToken: params.token, deletedAt: { not: null } },
      select: { deletedAt: true },
    })
    if (deleted) {
      return <ProposalUnavailable reason="deleted" />
    }
    notFound()
  }

  // Check if expired
  if (proposal.status === 'EXPIRED') {
    return <ProposalUnavailable reason="expired" />
  }

  if (proposal.status === 'CANCELLED') {
    return <ProposalUnavailable reason="cancelled" />
  }

  // Phone verification gate
  if (proposal.customer.phone) {
    const isVerified = verifyPhoneCookie(params.token)
    if (!isVerified) {
      return (
        <PhoneGate
          token={params.token}
          maskedPhone={maskPhone(proposal.customer.phone)}
          tenantName={proposal.tenant.name}
          tenantLogo={proposal.tenant.logo}
        />
      )
    }
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
      customer: { include: { contacts: { orderBy: { isPrimary: 'desc' } } } },
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

  const respondedFlag =
    updatedProposal.status === 'ACCEPTED' ||
    updatedProposal.status === 'REJECTED' ||
    updatedProposal.status === 'REVISION_REQUESTED'

  const formatCurrency = (amount: number) =>
    amount.toLocaleString(localeStr, { style: 'currency', currency: updatedProposal.currency })

  const createdDate = format(new Date(updatedProposal.createdAt), 'dd MMMM yyyy', { locale: dateFnsLocale })
  const expiresDate = updatedProposal.expiresAt
    ? format(new Date(updatedProposal.expiresAt), 'dd MMMM yyyy', { locale: dateFnsLocale })
    : null

  const isLive = !respondedFlag
  const localeLabels = detectedLocale === 'tr'
    ? { sentYou: 'size bir teklif gönderdi', live: 'Canlı link', expired: 'Süresi doldu', secure: 'Güvenli link', poweredBy: 'TeklifPro ile oluşturuldu' }
    : { sentYou: 'sent you a proposal', live: 'Live link', expired: 'Expired', secure: 'Secure link', poweredBy: 'Powered by TeklifPro' }

  return (
    <>
    <ViewTracker token={params.token} />
    {/* ─── Prototype-aligned mint header strip ─── */}
    <div className="bg-gradient-to-b from-emerald-50 via-emerald-50/40 to-transparent">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 grid place-items-center text-white font-bold shrink-0">
            {updatedProposal.tenant.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={updatedProposal.tenant.logo} alt={updatedProposal.tenant.name} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-emerald-700/80">
              <span className="font-semibold text-emerald-900">{updatedProposal.tenant.name}</span> {localeLabels.sentYou}
            </p>
            <p className="text-sm font-semibold text-slate-900 truncate">
              <span className="font-mono text-emerald-700 mr-1.5">{updatedProposal.proposalNumber}</span>
              <span className="text-slate-600">·</span>
              <span className="ml-1.5">{updatedProposal.customer.name}</span>
            </p>
          </div>
          <span
            className={[
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap',
              isLive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-50 text-slate-500 border-slate-200',
            ].join(' ')}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} aria-hidden />
            {isLive ? localeLabels.live : localeLabels.expired}
          </span>
        </div>
      </div>
    </div>

    <ProposalContent
      proposal={{
        id: updatedProposal.id,
        proposalNumber: updatedProposal.proposalNumber,
        title: updatedProposal.title,
        proposalType: (updatedProposal as Record<string, unknown>).proposalType as string | undefined,
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
        deliveryDate: (updatedProposal as Record<string, unknown>).deliveryDate
          ? ((updatedProposal as Record<string, unknown>).deliveryDate as Date).toISOString()
          : null,
        installationDate: (updatedProposal as Record<string, unknown>).installationDate
          ? ((updatedProposal as Record<string, unknown>).installationDate as Date).toISOString()
          : null,
      }}
      tenant={{
        name: updatedProposal.tenant.name,
        logo: updatedProposal.tenant.logo,
        address: updatedProposal.tenant.address,
        phone: updatedProposal.tenant.phone,
        email: updatedProposal.tenant.email,
        taxNumber: updatedProposal.tenant.taxNumber,
        bankAccounts: (updatedProposal.tenant.bankAccounts as { bankName: string; branchName: string; accountHolder: string; iban: string; currency: string }[]) || [],
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
      signature={(() => {
        if (!updatedProposal.signatureData) return null
        const decrypted = decryptSignature(updatedProposal.signatureData)
        if (!decrypted || !decrypted.startsWith('data:image/png;base64,')) return null
        return {
          data: decrypted,
          signerName: updatedProposal.signerName,
          signedAt: updatedProposal.signedAt?.toISOString() ?? null,
        }
      })()}
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
      contacts={updatedProposal.customer.contacts.map(c => ({
        id: c.id,
        name: c.name,
        title: c.title,
      }))}
      isResponded={respondedFlag}
      token={params.token}
    />
    {/* ─── Trust footer matching prototype ─── */}
    <div className="border-t border-emerald-100 bg-emerald-50/30 print:hidden">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-center gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          {localeLabels.secure}
        </span>
        <span className="text-slate-300">·</span>
        <span className="inline-flex items-center gap-1.5">
          <Lock className="w-3 h-3" />
          {localeLabels.poweredBy}
        </span>
      </div>
    </div>
    </>
  )
}
