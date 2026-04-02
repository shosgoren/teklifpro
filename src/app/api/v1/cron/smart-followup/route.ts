import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/utils/prisma';
import { WhatsAppService } from '@/infrastructure/services/whatsapp/WhatsAppService';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('CronSmartFollowupAPI');

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60s timeout for cron

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Array<{
    tenantId: string;
    proposalsSent: number;
    errors: number;
  }> = [];

  try {
    // Find tenants with smart follow-up enabled and WhatsApp configured
    const tenants = await prisma.tenant.findMany({
      where: {
        smartFollowupEnabled: true,
        isActive: true,
        whatsappPhoneId: { not: null },
        whatsappAccessToken: { not: null },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        whatsappPhoneId: true,
        whatsappAccessToken: true,
        followupDaysAfterView: true,
        followupMessage: true,
        followupMaxReminders: true,
      },
    });

    for (const tenant of tenants) {
      let sent = 0;
      let errors = 0;

      try {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - tenant.followupDaysAfterView);

        // Find proposals that:
        // - Belong to this tenant
        // - Status is VIEWED (opened but not responded)
        // - viewedAt is older than followupDaysAfterView
        // - followupCount < followupMaxReminders
        // - Not expired, not deleted
        const proposals = await prisma.proposal.findMany({
          where: {
            tenantId: tenant.id,
            status: 'VIEWED',
            viewedAt: { lte: daysAgo },
            followupCount: { lt: tenant.followupMaxReminders },
            deletedAt: null,
            // Don't send if already followed up today
            OR: [
              { lastFollowupAt: null },
              { lastFollowupAt: { lt: new Date(new Date().setHours(0, 0, 0, 0)) } },
            ],
            // Must not be expired
            expiresAt: { gt: new Date() },
          },
          include: {
            customer: true,
            user: true,
          },
          take: 20, // Max 20 per tenant per run to avoid rate limits
        });

        if (proposals.length === 0) continue;

        const whatsappService = WhatsAppService.fromTenantConfig({
          whatsappPhoneId: tenant.whatsappPhoneId!,
          whatsappAccessToken: tenant.whatsappAccessToken!,
        });

        for (const proposal of proposals) {
          try {
            const customerPhone = proposal.customer.phone;
            if (!customerPhone) continue;

            const proposalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/proposal/${proposal.publicToken}`;
            const daysLeft = proposal.expiresAt
              ? Math.ceil((proposal.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null;

            // Build follow-up message
            const defaultMessage = [
              `Merhaba ${proposal.customer.name},`,
              '',
              `${proposal.title} baslıklı teklifimizi incelediginizi gorduk.`,
              daysLeft ? `Teklifimiz ${daysLeft} gun sonra gecerlilgini yitirecektir.` : '',
              '',
              `Sorularınız varsa yanıtlamaktan memnuniyet duyarız.`,
              '',
              `Teklifi tekrar goruntulemek icin:`,
              proposalUrl,
              '',
              `Iyi calismalar,`,
              tenant.name,
            ].filter(Boolean).join('\n');

            const message = tenant.followupMessage
              ? tenant.followupMessage
                  .replace('{{customerName}}', proposal.customer.name)
                  .replace('{{proposalTitle}}', proposal.title)
                  .replace('{{proposalNumber}}', proposal.proposalNumber)
                  .replace('{{daysLeft}}', String(daysLeft ?? ''))
                  .replace('{{proposalUrl}}', proposalUrl)
                  .replace('{{companyName}}', tenant.name)
              : defaultMessage;

            const result = await whatsappService.sendTextMessage(customerPhone, message);

            // Update proposal follow-up tracking
            await prisma.proposal.update({
              where: { id: proposal.id },
              data: {
                followupCount: { increment: 1 },
                lastFollowupAt: new Date(),
              },
            });

            // Log activity
            await prisma.proposalActivity.create({
              data: {
                proposalId: proposal.id,
                type: 'FOLLOWUP_SENT',
                description: `Otomatik hatırlatma #${proposal.followupCount + 1} WhatsApp ile gönderildi`,
                metadata: {
                  method: 'whatsapp',
                  sentTo: customerPhone,
                  messageId: result?.messages?.[0]?.id,
                  followupNumber: proposal.followupCount + 1,
                },
              },
            });

            sent++;
          } catch (err) {
            logger.error(`Follow-up error for proposal ${proposal.id}`, err);
            errors++;
          }
        }
      } catch (err) {
        logger.error(`Follow-up error for tenant ${tenant.id}`, err);
        errors++;
      }

      results.push({ tenantId: tenant.id, proposalsSent: sent, errors });
    }

    const totalSent = results.reduce((sum, r) => sum + r.proposalsSent, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);

    return NextResponse.json({
      success: true,
      data: {
        tenantsProcessed: tenants.length,
        totalFollowupsSent: totalSent,
        totalErrors,
        results,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Smart follow-up cron error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
