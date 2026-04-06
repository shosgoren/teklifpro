/**
 * Parasut Webhook Handler
 *
 * Receives real-time events from Parasut:
 * - contact.created / contact.updated
 * - product.created / product.updated
 * - sales_offer.updated (status changes)
 *
 * DB operations are fully implemented.
 * Idempotency is DB-based via ParasutSyncLog eventId lookup.
 */
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { ProposalStatus } from '@prisma/client'
import { prisma } from '@/shared/utils/prisma'
import { Logger } from '@/infrastructure/logger'

const logger = new Logger('ParasutWebhook')

interface ParasutWebhookPayload {
  event_type: string
  created_at: string
  id: string
  resource_type: string
  data: {
    id: string
    type: string
    attributes: Record<string, any>
  }
}

// ==================== SIGNATURE VERIFICATION ====================

function verifyWebhookSignature(
  payload: string,
  signatureHeader: string | null,
): boolean {
  if (!signatureHeader) {
    logger.warn('Missing X-Parasut-Webhook-Signature header')
    return false
  }

  const webhookSecret = process.env.PARASUT_WEBHOOK_SECRET || ''
  if (!webhookSecret) {
    logger.error('PARASUT_WEBHOOK_SECRET not configured')
    return false
  }

  const hash = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex')

  return hash === signatureHeader
}

// ==================== TENANT RESOLUTION ====================

async function resolveTenantId(request: NextRequest): Promise<string | null> {
  // Option 1: From custom header
  const tenantIdHeader = request.headers.get('x-tenant-id')
  if (tenantIdHeader) {
    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantIdHeader },
      select: { id: true, parasutSyncEnabled: true },
    })
    if (tenant?.parasutSyncEnabled) return tenant.id
  }

  // Option 2: From query parameter
  const url = new URL(request.url)
  const tenantIdParam = url.searchParams.get('tenant_id')
  if (tenantIdParam) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantIdParam },
      select: { id: true, parasutSyncEnabled: true },
    })
    if (tenant?.parasutSyncEnabled) return tenant.id
  }

  return null
}

// ==================== IDEMPOTENCY CHECK (DB-based) ====================

async function isEventProcessed(eventId: string): Promise<boolean> {
  const existing = await prisma.parasutSyncLog.findFirst({
    where: {
      errors: { path: ['eventId'], equals: eventId },
    },
    select: { id: true },
  })
  return !!existing
}

// ==================== EVENT HANDLERS ====================

async function handleContactEvent(
  event: ParasutWebhookPayload,
  tenantId: string,
): Promise<void> {
  const { data } = event
  const attrs = data.attributes

  const name = attrs.name || ''
  const isArchived = attrs.archived === true

  if (isArchived) {
    logger.info('Skipping archived contact', { contactId: data.id })
    // Soft-deactivate if exists
    await prisma.customer.updateMany({
      where: { tenantId, parasutId: data.id },
      data: { isActive: false },
    })
    return
  }

  await prisma.customer.upsert({
    where: {
      tenantId_parasutId: {
        tenantId,
        parasutId: data.id,
      },
    },
    create: {
      tenantId,
      parasutId: data.id,
      name,
      shortName: attrs.short_name || null,
      companyType: 'COMPANY',
      taxNumber: attrs.tax_number || null,
      taxOffice: attrs.tax_office || null,
      email: attrs.email || null,
      phone: attrs.phone || null,
      fax: attrs.fax || null,
      address: attrs.address || null,
      city: attrs.city || null,
      district: attrs.district || null,
      balance: attrs.balance ? parseFloat(attrs.balance) : 0,
      lastSyncAt: new Date(),
    },
    update: {
      name,
      shortName: attrs.short_name || null,
      taxNumber: attrs.tax_number || null,
      taxOffice: attrs.tax_office || null,
      email: attrs.email || null,
      phone: attrs.phone || null,
      fax: attrs.fax || null,
      address: attrs.address || null,
      city: attrs.city || null,
      district: attrs.district || null,
      balance: attrs.balance ? parseFloat(attrs.balance) : 0,
      lastSyncAt: new Date(),
      isActive: true,
    },
  })

  logger.info('Contact synced via webhook', {
    contactId: data.id,
    name,
    operation: event.event_type,
  })
}

async function handleProductEvent(
  event: ParasutWebhookPayload,
  tenantId: string,
): Promise<void> {
  const { data } = event
  const attrs = data.attributes

  const name = attrs.name || ''
  const isArchived = attrs.archived === true

  if (isArchived) {
    logger.info('Skipping archived product', { productId: data.id })
    await prisma.product.updateMany({
      where: { tenantId, parasutId: data.id },
      data: { isActive: false },
    })
    return
  }

  await prisma.product.upsert({
    where: {
      tenantId_parasutId: {
        tenantId,
        parasutId: data.id,
      },
    },
    create: {
      tenantId,
      parasutId: data.id,
      name,
      code: attrs.code || null,
      unit: attrs.unit || 'Adet',
      listPrice: attrs.list_price ? parseFloat(attrs.list_price) : 0,
      currency: attrs.currency === 'TRL' ? 'TRY' : (attrs.currency || 'TRY'),
      vatRate: attrs.vat_rate ? parseFloat(attrs.vat_rate) : 20,
      trackStock: attrs.inventory_tracking || false,
      lastSyncAt: new Date(),
    },
    update: {
      name,
      code: attrs.code || null,
      unit: attrs.unit || 'Adet',
      listPrice: attrs.list_price ? parseFloat(attrs.list_price) : 0,
      currency: attrs.currency === 'TRL' ? 'TRY' : (attrs.currency || 'TRY'),
      vatRate: attrs.vat_rate ? parseFloat(attrs.vat_rate) : 20,
      trackStock: attrs.inventory_tracking || false,
      lastSyncAt: new Date(),
      isActive: true,
    },
  })

  logger.info('Product synced via webhook', {
    productId: data.id,
    name,
    operation: event.event_type,
  })
}

async function handleSalesOfferEvent(
  event: ParasutWebhookPayload,
  tenantId: string,
): Promise<void> {
  const { data } = event
  const attrs = data.attributes

  // Find the linked proposal
  const proposal = await prisma.proposal.findFirst({
    where: {
      tenantId,
      parasutOfferId: data.id,
      deletedAt: null,
    },
    select: { id: true, status: true },
  })

  if (!proposal) {
    logger.info('No linked proposal for Parasut offer', { offerId: data.id })
    return
  }

  // Map Parasut status to TeklifPro status
  const parasutStatus = attrs.status as string
  const statusMap: Record<string, string> = {
    accepted: 'ACCEPTED',
    rejected: 'REJECTED',
  }

  const newStatus = statusMap[parasutStatus]
  if (newStatus && newStatus !== proposal.status) {
    await prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        status: newStatus as ProposalStatus,
        respondedAt: new Date(),
        parasutLastSyncAt: new Date(),
      },
    })

    // Create activity log
    await prisma.proposalActivity.create({
      data: {
        proposalId: proposal.id,
        type: newStatus === 'ACCEPTED' ? 'ACCEPTED' : 'REJECTED',
        description: `Paraşüt üzerinden ${parasutStatus === 'accepted' ? 'onaylandı' : 'reddedildi'}`,
        metadata: { source: 'parasut_webhook', parasutOfferId: data.id },
      },
    })

    logger.info('Proposal status updated via webhook', {
      proposalId: proposal.id,
      oldStatus: proposal.status,
      newStatus,
    })
  }
}

// ==================== RATE LIMITING ====================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(tenantId: string): boolean {
  const now = Date.now()
  const limit = rateLimitMap.get(tenantId)

  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(tenantId, { count: 1, resetAt: now + 60_000 }) // 60s window
    return true
  }

  if (limit.count >= 100) { // max 100 webhook events per minute per tenant
    return false
  }

  limit.count++
  return true
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key)
  }
}, 300_000) // every 5 minutes

// ==================== MAIN HANDLER ====================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-parasut-webhook-signature')

    // Verify signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      logger.warn('Webhook signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    const payload: ParasutWebhookPayload = JSON.parse(rawBody)

    // Validate payload
    if (!payload.event_type || !payload.data) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Resolve tenant
    const tenantId = await resolveTenantId(request)
    if (!tenantId) {
      logger.warn('Could not resolve tenant for webhook')
      return NextResponse.json({ error: 'Unknown tenant' }, { status: 400 })
    }

    // Rate limit
    if (!checkRateLimit(tenantId)) {
      logger.warn('Webhook rate limit exceeded', { tenantId })
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    // DB-based idempotency check
    const eventId = payload.id
    if (eventId && await isEventProcessed(eventId)) {
      return NextResponse.json(
        { success: true, message: 'Event already processed' },
        { status: 200 }
      )
    }

    logger.info('Processing Parasut webhook', {
      eventType: payload.event_type,
      resourceId: payload.data.id,
      tenantId,
      eventId,
    })

    // Route to handler
    let status: 'COMPLETED' | 'FAILED' = 'COMPLETED'
    let errorMsg: string | null = null

    try {
      switch (payload.event_type) {
        case 'contact.created':
        case 'contact.updated':
          await handleContactEvent(payload, tenantId)
          break
        case 'product.created':
        case 'product.updated':
          await handleProductEvent(payload, tenantId)
          break
        case 'sales_offer.updated':
          await handleSalesOfferEvent(payload, tenantId)
          break
        default:
          logger.warn('Unknown event type', { eventType: payload.event_type })
          status = 'COMPLETED' // Don't fail on unknown events
      }
    } catch (err) {
      status = 'FAILED'
      errorMsg = err instanceof Error ? err.message : 'Unknown error'
      logger.error('Webhook handler error', err)
    }

    // Log to DB (also serves as idempotency store)
    await prisma.parasutSyncLog.create({
      data: {
        tenantId,
        entityType: payload.resource_type || payload.event_type.split('.')[0],
        direction: 'PULL',
        status,
        recordCount: status === 'COMPLETED' ? 1 : 0,
        errorCount: status === 'FAILED' ? 1 : 0,
        errors: eventId ? { eventId, error: errorMsg } : undefined,
        completedAt: new Date(),
      },
    })

    return NextResponse.json(
      { success: true, message: 'Webhook processed' },
      { status: 200 }
    )
  } catch (error) {
    logger.error('Error processing webhook', error)
    // Return 200 to prevent Parasut retries on parse errors
    return NextResponse.json(
      { success: false, message: 'Processing error' },
      { status: 200 }
    )
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { message: 'Parasut webhook endpoint', status: 'active' },
    { status: 200 }
  )
}
