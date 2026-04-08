import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/shared/utils/prisma';
import { ActivityType } from '@prisma/client';
import { Logger } from '@/infrastructure/logger';
import { createRateLimitMap } from '@/shared/utils/rateLimit';

const logger = new Logger('WhatsAppWebhook');

interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  button?: { payload: string };
}

interface WhatsAppStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
}

interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        statuses?: WhatsAppStatus[];
        messages?: WhatsAppMessage[];
        errors?: Array<{ code: number; message: string }>;
      };
      field: string;
    }>;
  }>;
}

// Store for idempotency - in production, use Redis or database
const processedMessageIds = new Set<string>();

// IP-based rate limit for webhook: 120 req/min (Meta sends bursts)
const webhookLimiter = createRateLimitMap({ maxRequests: 120, windowMs: 60_000, cleanupIntervalMs: 300_000 });

function checkWebhookRateLimit(ip: string): boolean {
  return webhookLimiter.check(ip).allowed;
}

/**
 * Verifies webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signatureHeader: string | null,
): boolean {
  if (!signatureHeader) {
    logger.warn('Missing X-Hub-Signature-256 header');
    return false;
  }

  const appSecret = process.env.WHATSAPP_APP_SECRET || '';

  if (!appSecret) {
    logger.error('WHATSAPP_APP_SECRET not configured');
    return false;
  }

  const hash = crypto.createHmac('sha256', appSecret).update(payload).digest('hex');
  const expectedSignature = `sha256=${hash}`;

  let isValid = false;
  try {
    isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signatureHeader)
    );
  } catch {
    isValid = false;
  }

  if (!isValid) {
    logger.warn('Invalid webhook signature', { received: signatureHeader });
  }

  return isValid;
}

/**
 * Handles message status updates
 */
async function handleMessageStatus(status: WhatsAppStatus): Promise<void> {
  try {
    const { id, status: statusType, recipient_id } = status;

    logger.info('Processing message status', {
      messageId: id,
      status: statusType,
      recipientId: recipient_id,
    });

    // Map WhatsApp status to activity type
    const activityTypeMapping: Record<string, ActivityType> = {
      delivered: 'WHATSAPP_DELIVERED',
      read: 'WHATSAPP_READ',
    };

    const activityType = activityTypeMapping[statusType];

    // Find proposal by whatsappMessageId and create activity
    if (activityType) {
      const proposal = await prisma.proposal.findFirst({
        where: { whatsappMessageId: id },
        select: { id: true },
      });

      if (proposal) {
        await prisma.proposalActivity.create({
          data: {
            proposalId: proposal.id,
            type: activityType,
            description: statusType === 'delivered'
              ? 'WhatsApp mesajı iletildi'
              : 'WhatsApp mesajı okundu',
            metadata: {
              whatsappMessageId: id,
              recipientId: recipient_id,
              timestamp: status.timestamp,
            },
          },
        });
        logger.info('Status activity created', { proposalId: proposal.id, status: activityType });
      }
    }

    logger.info('Status recorded', { messageId: id, status: statusType });
  } catch (error) {
    logger.error('Error handling message status', error);
  }
}

/**
 * Handles incoming messages
 */
async function handleMessage(message: WhatsAppMessage): Promise<void> {
  try {
    const { id, from, type, text, button } = message;

    // Idempotency check
    if (processedMessageIds.has(id)) {
      logger.info('Duplicate message, skipping', { messageId: id });
      return;
    }

    processedMessageIds.add(id);

    logger.info('Processing incoming message', {
      messageId: id,
      from,
      type,
    });

    if (type === 'text' && text) {
      const messageBody = text.body;
      logger.info('Text message received', { from, message: messageBody });

      // Find most recent proposal sent to this phone number
      const cleanPhone = from.replace(/\D/g, '');
      const proposal = await prisma.proposal.findFirst({
        where: {
          customer: {
            OR: [
              { phone: { contains: cleanPhone.slice(-10) } },
              { contacts: { some: { phone: { contains: cleanPhone.slice(-10) } } } },
            ],
          },
          whatsappMessageId: { not: null },
          deletedAt: null,
        },
        orderBy: { whatsappSentAt: 'desc' },
        select: { id: true },
      });

      if (proposal) {
        await prisma.proposalActivity.create({
          data: {
            proposalId: proposal.id,
            type: 'WHATSAPP_READ' as ActivityType,
            description: `Müşteri yanıtı: ${messageBody.substring(0, 200)}`,
            metadata: {
              whatsappMessageId: id,
              from,
              messageType: 'text',
              content: messageBody,
            },
          },
        });
      }
    }

    if (type === 'interactive' && button) {
      const payload = button.payload;
      logger.info('Interactive button clicked', { from, payload });

      // Parse payload - format: "view_proposal_{proposalNumber}"
      const proposalMatch = payload.match(/view_proposal_(.+)/);
      if (proposalMatch) {
        const proposalNumber = proposalMatch[1];
        const proposal = await prisma.proposal.findFirst({
          where: { proposalNumber: proposalNumber, deletedAt: null },
          select: { id: true },
        });

        if (proposal) {
          await prisma.proposalActivity.create({
            data: {
              proposalId: proposal.id,
              type: 'LINK_CLICKED' as ActivityType,
              description: 'WhatsApp butonundan teklif görüntülendi',
              metadata: {
                whatsappMessageId: id,
                from,
                buttonPayload: payload,
              },
            },
          });
          logger.info('Button click activity created', { proposalId: proposal.id });
        }
      }
    }

    // Clean up old processed IDs periodically (every 1000 messages)
    if (processedMessageIds.size > 1000) {
      processedMessageIds.clear();
    }
  } catch (error) {
    logger.error('Error handling incoming message', error);
  }
}

/**
 * GET handler for webhook verification
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);

    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    // Verify token (should match WHATSAPP_VERIFY_TOKEN env var)
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || '';

    if (!mode || !token || !challenge) {
      logger.warn('Missing webhook parameters');
      return NextResponse.json(
        { error: 'Missing parameters' },
        { status: 400 }
      );
    }

    if (mode !== 'subscribe') {
      logger.warn('Invalid mode', { mode });
      return NextResponse.json(
        { error: 'Invalid mode' },
        { status: 400 }
      );
    }

    if (token !== verifyToken) {
      logger.warn('Invalid verification token');
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 403 }
      );
    }

    logger.info('Webhook verified successfully');

    // Meta expects the challenge string as plain text response
    return new NextResponse(challenge, { status: 200 });
  } catch (error) {
    logger.error('Error verifying webhook', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST handler for webhook events
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limit check
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip') || 'unknown';
    if (!checkWebhookRateLimit(ip)) {
      logger.warn('WhatsApp webhook rate limit exceeded', { ip });
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      logger.warn('Webhook signature verification failed');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 403 }
      );
    }

    // Parse JSON
    const payload: WhatsAppWebhookPayload = JSON.parse(rawBody);

    // Validate payload structure
    if (!payload.object || payload.object !== 'whatsapp_business_account') {
      logger.warn('Invalid payload object', { object: payload.object });
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }

    // Process entries
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        const { value, field } = change;

        if (field !== 'messages') {
          continue;
        }

        // Handle errors
        if (value.errors) {
          for (const error of value.errors) {
            logger.error('WhatsApp error in webhook', {
              code: error.code,
              message: error.message,
            });
          }
        }

        // Handle message statuses
        if (value.statuses) {
          for (const status of value.statuses) {
            await handleMessageStatus(status);
          }
        }

        // Handle incoming messages
        if (value.messages) {
          for (const message of value.messages) {
            await handleMessage(message);
          }
        }
      }
    }

    logger.info('Webhook processed successfully');

    // Return 200 OK to acknowledge receipt
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('Error processing webhook', error);

    // Return 200 OK even on error to prevent WhatsApp retries
    // Log the error for investigation
    return NextResponse.json(
      { success: false, error: 'Processing error' },
      { status: 200 }
    );
  }
}
