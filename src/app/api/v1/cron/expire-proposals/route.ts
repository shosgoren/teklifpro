import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/utils/prisma';
import { WhatsAppService } from '@/infrastructure/services/whatsapp/WhatsAppService';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('CronExpireProposalsAPI');

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60s timeout for cron

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let totalExpired = 0;
  let totalErrors = 0;

  try {
    const now = new Date();

    // Find all proposals that are SENT or VIEWED and have passed their expiry date
    const expiredProposals = await prisma.proposal.findMany({
      where: {
        status: { in: ['SENT', 'VIEWED'] },
        expiresAt: { lt: now },
        deletedAt: null,
      },
      include: {
        customer: true,
        user: true,
        tenant: true,
      },
    });

    logger.info(`Found ${expiredProposals.length} proposals to expire`);

    for (const proposal of expiredProposals) {
      try {
        // Update status to EXPIRED
        await prisma.proposal.update({
          where: { id: proposal.id },
          data: { status: 'EXPIRED' },
        });

        // Log activity
        await prisma.proposalActivity.create({
          data: {
            proposalId: proposal.id,
            type: 'EXPIRED',
            description: `Teklif geçerlilik tarihi doldu ve otomatik olarak sona erdirildi`,
            metadata: {
              expiredAt: now.toISOString(),
              previousStatus: proposal.status,
            },
          },
        });

        // Send WhatsApp notification to proposal owner (fire-and-forget)
        try {
          const { tenant, user } = proposal;

          if (tenant.whatsappPhoneId && tenant.whatsappAccessToken) {
            const recipientPhone = user?.phone || tenant.phone;

            if (recipientPhone) {
              const proposalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/proposals/${proposal.id}`;

              const message = [
                `⏰ Teklif Süresi Doldu`,
                '',
                `📄 ${proposal.proposalNumber} — ${proposal.title}`,
                `👤 Müşteri: ${proposal.customer.name}`,
                '',
                `Bu teklif geçerlilik tarihini geçtiği için otomatik olarak sona erdirildi.`,
                '',
                `🔗 ${proposalUrl}`,
              ].join('\n');

              const whatsappService = WhatsAppService.fromTenantConfig({
                whatsappPhoneId: tenant.whatsappPhoneId,
                whatsappAccessToken: tenant.whatsappAccessToken,
              });

              await whatsappService.sendTextMessage(recipientPhone, message);
            }
          }
        } catch (whatsappError) {
          logger.error(`WhatsApp notification error for proposal ${proposal.id}`, whatsappError);
          // Do not count as an error — notification failure must not affect the main flow
        }

        totalExpired++;
      } catch (err) {
        logger.error(`Error expiring proposal ${proposal.id}`, err);
        totalErrors++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalExpired,
        totalErrors,
        timestamp: now.toISOString(),
      },
    });
  } catch (error) {
    logger.error('Expire proposals cron error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
