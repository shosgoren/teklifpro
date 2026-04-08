import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/shared/utils/prisma';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
import { WhatsAppService } from '@/infrastructure/services/whatsapp/WhatsAppService';
import { emailService } from '@/infrastructure/services/email/EmailService';
import { SendProposalSchema } from '@/shared/validations/proposal';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('ProposalSendAPI');

// TODO: In the future, derive locale from tenant settings
const TENANT_LOCALE = 'tr-TR';

interface SendResult {
  proposalId: string;
  proposalNumber: string;
  sentTo: string;
  method: 'whatsapp' | 'email' | 'sms';
  messageId?: string;
  sentAt: Date;
}

async function handlePost(
  request: NextRequest,
  context?: { params: Record<string, string> }
): Promise<NextResponse> {
  try {
    const session = getSessionFromRequest(request)!;
    const params = context!.params;

    const proposalId = params.id;
    const body = await request.json();
    const payload = SendProposalSchema.parse(body);

    // Get tenant with WhatsApp config
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenant.id },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Get proposal
    const proposal = await prisma.proposal.findFirst({
      where: {
        id: proposalId,
        tenantId: tenant.id,
        deletedAt: null,
      },
      include: {
        customer: true,
        items: true,
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { success: false, error: 'Proposal not found' },
        { status: 404 }
      );
    }

    // READY, SENT (re-send), REVISED, or REVISION_REQUESTED proposals can be sent
    if (!['READY', 'SENT', 'REVISED', 'REVISION_REQUESTED'].includes(proposal.status)) {
      const statusMessages: Record<string, string> = {
        DRAFT: 'Teklif taslak durumunda. Göndermeden önce "Hazırla" ile hazır durumuna getirin.',
        VIEWED: 'Bu teklif zaten görüntülenmiş.',
        ACCEPTED: 'Bu teklif zaten kabul edilmiş.',
        REJECTED: 'Bu teklif reddedilmiş.',
        INVOICED: 'Bu teklif faturalandırılmış.',
        EXPIRED: 'Bu teklifin süresi dolmuş.',
        CANCELLED: 'Bu teklif iptal edilmiş.',
      };
      return NextResponse.json(
        { success: false, error: statusMessages[proposal.status] || 'Bu teklif gönderilebilir durumda değil.' },
        { status: 400 }
      );
    }

    let sentTo = '';
    let messageId: string | undefined;

    // Send via appropriate channel
    if (payload.method === 'whatsapp') {
      sentTo = proposal.customer.phone || '';

      if (!sentTo) {
        return NextResponse.json(
          { success: false, error: 'Customer phone number not available' },
          { status: 400 }
        );
      }

      // fromTenantConfig falls back to env vars if tenant DB fields are empty
      const hasWhatsAppConfig = tenant.whatsappPhoneId || process.env.WHATSAPP_PHONE_NUMBER_ID;
      if (!hasWhatsAppConfig) {
        return NextResponse.json(
          { success: false, error: 'WhatsApp integration not configured' },
          { status: 400 }
        );
      }

      const whatsappService = WhatsAppService.fromTenantConfig({
        whatsappPhoneId: tenant.whatsappPhoneId,
        whatsappAccessToken: tenant.whatsappAccessToken,
      });

      const proposalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/proposal/${proposal.publicToken}`;

      const messageText =
        payload.message ||
        `Merhaba ${proposal.customer.name},

Teknoloji cozumlerimiz hakkinda size bir teklif hazirladik.

Teklif Numarasi: ${proposal.proposalNumber}
Toplam Tutar: ${Number(proposal.grandTotal).toLocaleString(TENANT_LOCALE)} TRY

Teklifi goruntulemek icin lutfen asagidaki linke tiklayiniz:
${proposalUrl}

Sorulariniz icin bizimle iletisime gecmekten cekinmeyin.

Iyi calismalar!`.trim();

      const result = await whatsappService.sendProposalLink({
        to: sentTo,
        customerName: proposal.customer.name,
        proposalNumber: proposal.proposalNumber,
        proposalTitle: proposal.title,
        grandTotal: `${Number(proposal.grandTotal).toLocaleString(TENANT_LOCALE)} TRY`,
        proposalUrl,
        companyName: tenant.name,
      });

      if (!result.success) {
        logger.error('WhatsApp send failed', { error: result.error, to: sentTo });
        return NextResponse.json(
          { success: false, error: result.error || 'WhatsApp mesajı gönderilemedi' },
          { status: 502 }
        );
      }

      messageId = result.messageId;
    } else if (payload.method === 'email') {
      sentTo = proposal.customer.email || '';

      if (!sentTo) {
        return NextResponse.json(
          { success: false, error: 'Customer email not available' },
          { status: 400 }
        );
      }

      await emailService.sendProposalNotification(sentTo, {
        id: proposal.id,
        number: proposal.proposalNumber,
        clientName: proposal.customer.name,
        clientEmail: sentTo,
        amount: Number(proposal.grandTotal),
        currency: 'TRY',
        validUntil: proposal.expiresAt || new Date(),
      });
    } else if (payload.method === 'sms') {
      sentTo = proposal.customer.phone || '';

      if (!sentTo) {
        return NextResponse.json(
          { success: false, error: 'Customer phone number not available' },
          { status: 400 }
        );
      }

      // SMS sending is not yet configured — return clear error
      return NextResponse.json(
        { success: false, error: 'SMS gönderimi henüz yapılandırılmamıştır. WhatsApp veya e-posta ile gönderin.' },
        { status: 501 }
      );
    }

    const sentAt = new Date();

    // Update proposal status
    await prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        status: 'SENT',
        sentAt,
      },
    });

    // Create activity log
    await prisma.proposalActivity.create({
      data: {
        proposalId: proposal.id,
        type: 'SENT',
        description: `Teklif ${payload.method} araciligiyla ${sentTo} adresine gonderildi`,
        metadata: {
          method: payload.method,
          sentTo,
          messageId,
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          proposalId: proposal.id,
          proposalNumber: proposal.proposalNumber,
          sentTo,
          method: payload.method,
          messageId,
          sentAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('POST /api/v1/proposals/[id]/send error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handlePost, ['proposal.send']);
