import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('ParasutWebhook');

interface ParasutWebhookPayload {
  event_type: string;
  created_at: string;
  id: string;
  resource_type: string;
  data: {
    id: string;
    type: string;
    attributes: {
      [key: string]: any;
    };
  };
}

interface ParasutSyncLogEntry {
  id: string;
  tenantId: string;
  eventType: string;
  resourceType: string;
  resourceId: string;
  status: 'success' | 'failed' | 'skipped';
  details?: string;
  timestamp: Date;
}

// Store for idempotency - in production, use Redis or database
const processedEventIds = new Set<string>();

/**
 * Verifies webhook authenticity using HMAC
 */
function verifyWebhookSignature(
  payload: string,
  signatureHeader: string | null,
): boolean {
  if (!signatureHeader) {
    logger.warn('Missing X-Parasut-Webhook-Signature header');
    return false;
  }

  const webhookSecret = process.env.PARASUT_WEBHOOK_SECRET || '';

  if (!webhookSecret) {
    logger.error('PARASUT_WEBHOOK_SECRET not configured');
    return false;
  }

  // Calculate HMAC SHA256
  const hash = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');

  const expectedSignature = hash;
  const isValid = signatureHeader === expectedSignature;

  if (!isValid) {
    logger.warn('Invalid webhook signature', { received: signatureHeader });
  }

  return isValid;
}

/**
 * Handles contact.created and contact.updated events
 */
async function handleContactEvent(
  event: ParasutWebhookPayload,
  tenantId: string,
): Promise<ParasutSyncLogEntry> {
  try {
    const { data } = event;
    const contactId = data.id;
    const attributes = data.attributes;

    const {
      email = '',
      name = '',
      phone = '',
      tax_number = '',
      tax_office = '',
    } = attributes;

    logger.info('Processing contact event', {
      eventType: event.event_type,
      contactId,
      name,
    });

    // In production:
    // 1. Check if contact already exists in database
    // 2. Create or update contact with attributes
    // 3. Link to tenant if needed

    // Simulated database operation
    const isUpdate = event.event_type === 'contact.updated';

    logger.info('Contact synced', {
      contactId,
      operation: isUpdate ? 'update' : 'create',
      email,
    });

    // Log successful sync
    const logEntry: ParasutSyncLogEntry = {
      id: `sync_${Date.now()}_${Math.random()}`,
      tenantId,
      eventType: event.event_type,
      resourceType: 'contact',
      resourceId: contactId,
      status: 'success',
      details: `Contact ${isUpdate ? 'updated' : 'created'}: ${name}`,
      timestamp: new Date(),
    };

    // Store log in database
    // In production: await db.parasutSyncLog.create(logEntry)

    return logEntry;
  } catch (error) {
    logger.error('Error handling contact event', error);

    const logEntry: ParasutSyncLogEntry = {
      id: `sync_${Date.now()}_${Math.random()}`,
      tenantId,
      eventType: event.event_type,
      resourceType: 'contact',
      resourceId: event.data.id,
      status: 'failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    };

    // In production: await db.parasutSyncLog.create(logEntry)

    return logEntry;
  }
}

/**
 * Handles product.created and product.updated events
 */
async function handleProductEvent(
  event: ParasutWebhookPayload,
  tenantId: string,
): Promise<ParasutSyncLogEntry> {
  try {
    const { data } = event;
    const productId = data.id;
    const attributes = data.attributes;

    const {
      name = '',
      code = '',
      unit_type = '',
      list_price = 0,
      archived = false,
    } = attributes;

    logger.info('Processing product event', {
      eventType: event.event_type,
      productId,
      name,
    });

    // In production:
    // 1. Check if product already exists in database
    // 2. Create or update product with attributes
    // 3. Link to tenant

    // Simulated database operation
    const isUpdate = event.event_type === 'product.updated';

    logger.info('Product synced', {
      productId,
      operation: isUpdate ? 'update' : 'create',
      name,
      price: list_price,
      archived,
    });

    // Log successful sync
    const logEntry: ParasutSyncLogEntry = {
      id: `sync_${Date.now()}_${Math.random()}`,
      tenantId,
      eventType: event.event_type,
      resourceType: 'product',
      resourceId: productId,
      status: archived ? 'skipped' : 'success',
      details: `Product ${isUpdate ? 'updated' : 'created'}: ${name} (${code})`,
      timestamp: new Date(),
    };

    // In production: await db.parasutSyncLog.create(logEntry)

    return logEntry;
  } catch (error) {
    logger.error('Error handling product event', error);

    const logEntry: ParasutSyncLogEntry = {
      id: `sync_${Date.now()}_${Math.random()}`,
      tenantId,
      eventType: event.event_type,
      resourceType: 'product',
      resourceId: event.data.id,
      status: 'failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    };

    // In production: await db.parasutSyncLog.create(logEntry)

    return logEntry;
  }
}

/**
 * Extracts tenant ID from webhook
 * In production, you'd get this from authentication headers or database lookup
 */
function extractTenantId(request: NextRequest): string {
  // Option 1: From custom header
  const tenantIdHeader = request.headers.get('x-tenant-id');
  if (tenantIdHeader) {
    return tenantIdHeader;
  }

  // Option 2: From authorization token (JWT decode)
  // const token = request.headers.get('authorization')?.replace('Bearer ', '');
  // const decoded = decodeJwt(token);
  // return decoded.tenantId;

  // Option 3: From request path
  const url = new URL(request.url);
  const tenantIdParam = url.searchParams.get('tenant_id');
  if (tenantIdParam) {
    return tenantIdParam;
  }

  // Fallback
  return 'unknown_tenant';
}

/**
 * POST handler for Paraşüt webhook events
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-parasut-webhook-signature');

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      logger.warn('Webhook signature verification failed');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 403 }
      );
    }

    // Parse JSON
    const payload: ParasutWebhookPayload = JSON.parse(rawBody);

    // Validate payload
    if (!payload.event_type || !payload.data) {
      logger.warn('Invalid webhook payload');
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }

    // Extract tenant ID
    const tenantId = extractTenantId(request);

    // Idempotency check
    const eventId = payload.id;
    if (processedEventIds.has(eventId)) {
      logger.info('Duplicate event, skipping', { eventId });
      return NextResponse.json(
        { success: true, message: 'Event already processed' },
        { status: 200 }
      );
    }

    processedEventIds.add(eventId);

    logger.info('Processing Paraşüt webhook', {
      eventType: payload.event_type,
      resourceType: payload.resource_type,
      tenantId,
      eventId,
    });

    let logEntry: ParasutSyncLogEntry;

    // Route to appropriate handler
    if (
      payload.event_type === 'contact.created' ||
      payload.event_type === 'contact.updated'
    ) {
      logEntry = await handleContactEvent(payload, tenantId);
    } else if (
      payload.event_type === 'product.created' ||
      payload.event_type === 'product.updated'
    ) {
      logEntry = await handleProductEvent(payload, tenantId);
    } else {
      // Unknown event type - log and skip
      logger.warn('Unknown event type', {
        eventType: payload.event_type,
      });

      logEntry = {
        id: `sync_${Date.now()}_${Math.random()}`,
        tenantId,
        eventType: payload.event_type,
        resourceType: payload.resource_type,
        resourceId: payload.data.id,
        status: 'skipped',
        details: 'Unknown event type',
        timestamp: new Date(),
      };

      // In production: await db.parasutSyncLog.create(logEntry)
    }

    // Clean up old processed event IDs periodically
    if (processedEventIds.size > 10000) {
      processedEventIds.clear();
    }

    logger.info('Webhook processed', {
      eventId,
      logEntryId: logEntry.id,
      status: logEntry.status,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Webhook processed',
        syncLogId: logEntry.id,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error processing webhook', error);

    // Return 200 OK to prevent Paraşüt retries
    // but log the error for investigation
    return NextResponse.json(
      {
        success: false,
        message: 'Processing error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 200 }
    );
  }
}

/**
 * GET handler - not used by Paraşüt but good to have
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { message: 'Paraşüt webhook endpoint' },
    { status: 200 }
  );
}
