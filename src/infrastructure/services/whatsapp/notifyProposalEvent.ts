/**
 * WhatsApp Notification for Proposal Events
 *
 * Sends real-time WhatsApp notifications to the proposal owner
 * when a customer views, accepts, rejects, or requests revision.
 */

import { prisma } from '@/shared/utils/prisma';
import { WhatsAppService } from './WhatsAppService';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('NotifyProposalEvent');

type ProposalEventType = 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUESTED';

interface NotifyParams {
  proposalId: string;
  eventType: ProposalEventType;
  customerNote?: string | null;
  rejectionReason?: string | null;
  revisionNote?: string | null;
}

const EVENT_MESSAGES: Record<ProposalEventType, { tr: string; en: string; emoji: string }> = {
  VIEWED: {
    tr: 'teklifinizi görüntüledi',
    en: 'viewed your proposal',
    emoji: '👀',
  },
  ACCEPTED: {
    tr: 'teklifinizi kabul etti',
    en: 'accepted your proposal',
    emoji: '✅',
  },
  REJECTED: {
    tr: 'teklifinizi reddetti',
    en: 'rejected your proposal',
    emoji: '❌',
  },
  REVISION_REQUESTED: {
    tr: 'teklifiniz için revize talep etti',
    en: 'requested revision for your proposal',
    emoji: '✏️',
  },
};

/**
 * Send WhatsApp notification to the proposal owner about a customer event.
 * Fails silently — notifications should never block the main flow.
 */
export async function notifyProposalEvent(params: NotifyParams): Promise<void> {
  try {
    const proposal = await prisma.proposal.findUnique({
      where: { id: params.proposalId },
      include: {
        tenant: true,
        customer: true,
        user: true,
      },
    });

    if (!proposal) return;

    const { tenant, customer, user } = proposal;

    // Need WhatsApp configured on tenant
    if (!tenant.whatsappPhoneId || !tenant.whatsappAccessToken) return;

    // Notify user phone, or fall back to tenant phone
    const recipientPhone = user?.phone || tenant.phone;
    if (!recipientPhone) return;

    const event = EVENT_MESSAGES[params.eventType];
    const proposalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/proposals/${proposal.id}`;

    const lines: string[] = [
      `${event.emoji} ${customer.name} ${event.tr}`,
      '',
      `📄 ${proposal.proposalNumber} — ${proposal.title}`,
    ];

    if (params.eventType === 'REJECTED' && params.rejectionReason) {
      lines.push('', `💬 Neden: ${params.rejectionReason}`);
    }

    if (params.eventType === 'REVISION_REQUESTED' && params.revisionNote) {
      lines.push('', `💬 Not: ${params.revisionNote}`);
    }

    if (params.eventType === 'ACCEPTED' && params.customerNote) {
      lines.push('', `💬 Not: ${params.customerNote}`);
    }

    lines.push('', `🔗 ${proposalUrl}`);

    const whatsappService = WhatsAppService.fromTenantConfig({
      whatsappPhoneId: tenant.whatsappPhoneId,
      whatsappAccessToken: tenant.whatsappAccessToken,
    });

    await whatsappService.sendTextMessage(recipientPhone, lines.join('\n'));
  } catch (error) {
    // Never throw — notification failure must not break the main flow
    logger.error(`WhatsApp notification error [${params.eventType}]`, error);
  }
}
