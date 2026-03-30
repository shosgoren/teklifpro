import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuth } from '@clerk/nextjs/server';
import { prisma } from '@/shared/utils/prisma';
import { ApiResponse } from '@/shared/types';
import { WhatsAppService } from '@/infrastructure/services/whatsapp/WhatsAppService';

// Validation schema
const SendProposalSchema = z.object({
  method: z.enum(['whatsapp', 'email', 'sms']).default('whatsapp'),
  message: z.string().optional(),
});

type SendProposalRequest = z.infer<typeof SendProposalSchema>;

interface SendResult {
  proposalId: string;
  proposalNumber: string;
  sentTo: string;
  method: 'whatsapp' | 'email' | 'sms';
  messageId?: string;
  sentAt: Date;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<SendResult>>> {
  try {
    const { userId } = await getAuth(request);
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          data: null,
        },
        { status: 401 }
      );
    }

    const { id: proposalId } = await params;
    const body = await request.json();
    const payload = SendProposalSchema.parse(body);

    // Get tenant
    const tenant = await prisma.tenant.findFirst({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        integrations: {
          where: { provider: 'WHATSAPP' },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tenant not found',
          data: null,
        },
        { status: 404 }
      );
    }

    // Get proposal
    const proposal = await prisma.proposal.findFirst({
      where: {
        id: proposalId,
        tenantId: tenant.id,
      },
      include: {
        client: true,
        items: true,
      },
    });

    if (!proposal) {
      return NextResponse.json(
        {
          success: false,
          error: 'Proposal not found',
          data: null,
        },
        { status: 404 }
      );
    }

    let sentTo: string;
    let messageId: string | undefined;

    // Send via appropriate channel
    if (payload.method === 'whatsapp') {
      sentTo = proposal.clientPhone || proposal.client.phone || '';

      if (!sentTo) {
        return NextResponse.json(
          {
            success: false,
            error: 'Client phone number not available',
            data: null,
          },
          { status: 400 }
        );
      }

      const whatsappIntegration = tenant.integrations[0];
      if (!whatsappIntegration?.accessToken) {
        return NextResponse.json(
          {
            success: false,
            error: 'WhatsApp integration not configured',
            data: null,
          },
          { status: 400 }
        );
      }

      const whatsappService = new WhatsAppService({
        accessToken: whatsappIntegration.accessToken,
        businessAccountId: whatsappIntegration.metadata?.businessAccountId,
      });

      const proposalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/proposals/${proposal.publicToken}`;

      const messageText =
        payload.message ||
        `
Merhaba ${proposal.client.name},

Teknoloji çözümlerimiz hakkında size bir teklif hazırladık.

Teklif Numarası: ${proposal.proposalNumber}
Toplam Tutar: ₺${proposal.total.toLocaleString('tr-TR')}

Teklifi görüntülemek için lütfen aşağıdaki linke tıklayınız:
${proposalUrl}

Sorularınız için bizimle iletişime geçmekten çekinmeyin.

İyi çalışmalar!
      `.trim();

      messageId = await whatsappService.sendMessage({
        phoneNumber: sentTo,
        message: messageText,
        mediaUrl: undefined,
      });
    } else if (payload.method === 'email') {
      sentTo = proposal.clientEmail || proposal.client.email || '';

      if (!sentTo) {
        return NextResponse.json(
          {
            success: false,
            error: 'Client email not available',
            data: null,
          },
          { status: 400 }
        );
      }

      // TODO: Implement email sending
      // For now, we'll just log it
      console.log('Email sending would be implemented here');
    } else if (payload.method === 'sms') {
      sentTo = proposal.clientPhone || proposal.client.phone || '';

      if (!sentTo) {
        return NextResponse.json(
          {
            success: false,
            error: 'Client phone number not available',
            data: null,
          },
          { status: 400 }
        );
      }

      // TODO: Implement SMS sending
      // For now, we'll just log it
      console.log('SMS sending would be implemented here');
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
    await prisma.activity.create({
      data: {
        proposalId: proposal.id,
        type: 'SENT',
        description: `Teklif ${payload.method} aracılığıyla ${sentTo} adresine gönderildi`,
        metadata: {
          method: payload.method,
          sentTo,
          messageId,
        },
      },
    });

    // Log integration event
    await prisma.integrationLog.create({
      data: {
        integrationId: tenant.integrations[0]?.id || '',
        event: 'PROPOSAL_SENT',
        status: 'SUCCESS',
        metadata: {
          proposalId: proposal.id,
          proposalNumber: proposal.proposalNumber,
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
    console.error('POST /api/v1/proposals/[id]/send error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
          data: null,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        data: null,
      },
      { status: 500 }
    );
  }
}
