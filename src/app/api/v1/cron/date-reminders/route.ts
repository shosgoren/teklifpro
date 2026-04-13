import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/utils/prisma'
import { WhatsAppService } from '@/infrastructure/services/whatsapp/WhatsAppService'
import { Logger } from '@/infrastructure/logger'
import { verifyCronRequest } from '@/shared/utils/cronAuth'

const logger = new Logger('CronDateRemindersAPI')

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/v1/cron/date-reminders
 * Daily cron: sends WhatsApp reminders for upcoming deliveries/installations
 * Runs at 08:00 UTC (11:00 Istanbul time)
 * Reminds for dates within the next 5 days, max once per day per proposal
 */
export async function GET(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let deliveryReminders = 0
  let installationReminders = 0
  let errors = 0

  try {
    const now = new Date()
    const fiveDaysFromNow = new Date(Date.now() + 5 * 86400000)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Find proposals with upcoming delivery dates (next 5 days, not completed, not reminded today)
    const upcomingDeliveries = await prisma.proposal.findMany({
      where: {
        deletedAt: null,
        deliveryDate: { gte: now, lte: fiveDaysFromNow },
        deliveryCompleted: false,
        status: { in: ['ACCEPTED', 'SENT', 'VIEWED'] },
        OR: [
          { lastDeliveryReminderAt: null },
          { lastDeliveryReminderAt: { lt: today } },
        ],
      },
      include: { customer: true, tenant: true },
      take: 100,
    })

    logger.info(`Found ${upcomingDeliveries.length} proposals needing delivery reminders`)

    for (const proposal of upcomingDeliveries) {
      try {
        const daysLeft = Math.ceil((proposal.deliveryDate!.getTime() - now.getTime()) / 86400000)
        const dateStr = proposal.deliveryDate!.toLocaleDateString('tr-TR', {
          day: 'numeric', month: 'long', year: 'numeric',
        })

        // Send WhatsApp to customer (fire-and-forget)
        try {
          const hasWhatsApp = proposal.tenant.whatsappPhoneId || process.env.WHATSAPP_PHONE_NUMBER_ID
          if (hasWhatsApp && proposal.customer.phone) {
            const wa = WhatsAppService.fromTenantConfig({
              whatsappPhoneId: proposal.tenant.whatsappPhoneId,
              whatsappAccessToken: proposal.tenant.whatsappAccessToken,
            })
            await wa.sendTextMessage(
              proposal.customer.phone,
              `📦 Teslim Hatırlatması\n\nSayın ${proposal.customer.name},\n\n${proposal.proposalNumber} numaralı teklifinizin teslim tarihi ${dateStr} (${daysLeft} gün kaldı).\n\nSorularınız için bizimle iletişime geçebilirsiniz.\n\n${proposal.tenant.name}`
            )
          }
        } catch (waErr) {
          logger.error(`WhatsApp delivery reminder failed for ${proposal.id}`, waErr)
        }

        // Update reminder timestamp and create activity
        await prisma.$transaction([
          prisma.proposal.update({
            where: { id: proposal.id },
            data: { lastDeliveryReminderAt: now },
          }),
          prisma.proposalActivity.create({
            data: {
              proposalId: proposal.id,
              type: 'DELIVERY_REMINDER',
              description: `Teslim hatırlatması gönderildi (${daysLeft} gün kaldı)`,
            },
          }),
        ])

        deliveryReminders++
      } catch (err) {
        logger.error(`Delivery reminder failed for ${proposal.id}`, err)
        errors++
      }
    }

    // Find proposals with upcoming installation dates
    const upcomingInstallations = await prisma.proposal.findMany({
      where: {
        deletedAt: null,
        installationDate: { gte: now, lte: fiveDaysFromNow },
        installationCompleted: false,
        status: { in: ['ACCEPTED', 'SENT', 'VIEWED'] },
        OR: [
          { lastInstallationReminderAt: null },
          { lastInstallationReminderAt: { lt: today } },
        ],
      },
      include: { customer: true, tenant: true },
      take: 100,
    })

    logger.info(`Found ${upcomingInstallations.length} proposals needing installation reminders`)

    for (const proposal of upcomingInstallations) {
      try {
        const daysLeft = Math.ceil((proposal.installationDate!.getTime() - now.getTime()) / 86400000)
        const dateStr = proposal.installationDate!.toLocaleDateString('tr-TR', {
          day: 'numeric', month: 'long', year: 'numeric',
        })

        try {
          const hasWhatsApp = proposal.tenant.whatsappPhoneId || process.env.WHATSAPP_PHONE_NUMBER_ID
          if (hasWhatsApp && proposal.customer.phone) {
            const wa = WhatsAppService.fromTenantConfig({
              whatsappPhoneId: proposal.tenant.whatsappPhoneId,
              whatsappAccessToken: proposal.tenant.whatsappAccessToken,
            })
            await wa.sendTextMessage(
              proposal.customer.phone,
              `🔧 Kurulum Hatırlatması\n\nSayın ${proposal.customer.name},\n\n${proposal.proposalNumber} numaralı teklifinizin kurulum tarihi ${dateStr} (${daysLeft} gün kaldı).\n\nSorularınız için bizimle iletişime geçebilirsiniz.\n\n${proposal.tenant.name}`
            )
          }
        } catch (waErr) {
          logger.error(`WhatsApp installation reminder failed for ${proposal.id}`, waErr)
        }

        await prisma.$transaction([
          prisma.proposal.update({
            where: { id: proposal.id },
            data: { lastInstallationReminderAt: now },
          }),
          prisma.proposalActivity.create({
            data: {
              proposalId: proposal.id,
              type: 'INSTALLATION_REMINDER',
              description: `Kurulum hatırlatması gönderildi (${daysLeft} gün kaldı)`,
            },
          }),
        ])

        installationReminders++
      } catch (err) {
        logger.error(`Installation reminder failed for ${proposal.id}`, err)
        errors++
      }
    }

    logger.info(`Date reminders complete: ${deliveryReminders} delivery, ${installationReminders} installation, ${errors} errors`)

    return NextResponse.json({
      success: true,
      data: { deliveryReminders, installationReminders, errors },
    })
  } catch (error) {
    logger.error('Date reminders cron error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
