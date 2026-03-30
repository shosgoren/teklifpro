import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { Logger } from '@/infrastructure/logger';

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

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';

  if (!phoneNumberId || !accessToken) {
    logger.error('WhatsApp credentials not configured');
    return false;
  }

  // Note: WhatsApp uses the phone number ID and access token for signature verification
  // In production, use the actual WhatsApp signature format
  const hash = crypto.createHmac('sha256', accessToken).update(payload).digest('hex');
  const expectedSignature = `sha256=${hash}`;

  const isValid = signatureHeader === expectedSignature;

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

    // Map WhatsApp status to internal status
    const statusMapping: Record<string, string> = {
      sent: 'whatsapp_sent',
      delivered: 'whatsapp_delivered',
      read: 'whatsapp_read',
      failed: 'whatsapp_failed',
    };

    const internalStatus = statusMapping[statusType];

    // Update ProposalActivity in database
    // In production: await db.proposalActivity.create({ ... })
    logger.info('Status recorded', {
      proposalId: id,
      status: internalStatus,
    });
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
      // Handle text message from customer
      const messageBody = text.body;

      logger.info('Text message received', {
        from,
        message: messageBody,
      });

      // Store message in database
      // In production: await db.proposalMessage.create({
      //   proposalId: extractProposalIdFromPhone(from),
      //   type: 'customer_message',
      //   content: messageBody,
      // })
    }

    if (type === 'interactive' && button) {
      // Handle interactive button response
      const payload = button.payload;

      logger.info('Interactive button clicked', {
        from,
        payload,
      });

      // Parse payload - format: "action:proposal_view:proposal_id"
      if (payload.startsWith('action:proposal_view:')) {
        const proposalId = payload.replace('action:proposal_view:', '');

        logger.info('Proposal view button clicked', {
          from,
          proposalId,
        });

        // Update ProposalActivity
        // In production: await db.proposalActivity.create({
        //   proposalId,
        //   type: 'whatsapp_view_clicked',
        //   metadata: { phoneNumber: from }
        // })
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

    return NextResponse.json({ hub: { challenge } }, { status: 200 });
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
