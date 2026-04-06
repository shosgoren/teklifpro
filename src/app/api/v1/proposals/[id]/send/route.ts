import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/shared/utils/prisma';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
import { WhatsAppService } from '@/infrastructure/services/whatsapp/WhatsAppService';
import { emailService } from '@/infrastructure/services/email/EmailService';
import { SendProposalSchema } from '@/shared/validations/proposal';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('ProposalSendAPI');

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

      const proposalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/proposals/${proposal.publicToken}`;

      const messageText =
        payload.message ||
        `Merhaba ${proposal.customer.name},

Teknoloji cozumlerimiz hakkinda size bir teklif hazirladik.

Teklif Numarasi: ${proposal.proposalNumber}
Toplam Tutar: ${Number(proposal.grandTotal).toLocaleString('tr-TR')} TRY

Teklifi goruntulemek icin lutfen asagidaki linke tiklayiniz:
${proposalUrl}

Sorulariniz icin bizimle iletisime gecmekten cekinmeyin.

Iyi calismalar!`.trim();

      const result = await whatsappService.sendProposalLink({
        to: sentTo,
        customerName: proposal.customer.name,
        proposalNumber: proposal.proposalNumber,
        proposalTitle: proposal.title,
        grandTotal: `${Number(proposal.grandTotal).toLocaleString('tr-TR')} TRY`,
        proposalUrl,
        companyName: tenant.name,
      });

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

      // TODO: Implement SMS sending
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
