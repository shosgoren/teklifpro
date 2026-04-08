import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/shared/utils/prisma';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
import { WhatsAppService } from '@/infrastructure/services/whatsapp/WhatsAppService';
import { emailService } from '@/infrastructure/services/email/EmailService';
import { Logger } from '@/infrastructure/logger';
import { BulkSendSchema } from '@/shared/validations/proposal';

const logger = new Logger('ProposalBulkSendAPI');

// Gonderim sonucu arayuzu
interface SendResultItem {
  proposalId: string;
  proposalNumber: string;
  customerName: string;
  status: 'sent' | 'failed';
  error?: string;
  channels: {
    whatsapp?: boolean;
    email?: boolean;
  };
}

// API yanit arayuzu
interface BulkSendResponse {
  total: number;
  sent: number;
  failed: number;
  results: SendResultItem[];
}

/**
 * POST /api/v1/proposals/bulk-send
 * Coklu teklifi bir sefer gonder
 */
async function handlePost(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const session = getSessionFromRequest(request)!;

    // Istek govdesini isle
    const body = await request.json();
    const payload = BulkSendSchema.parse(body);

    // Kiraci bilgisini al
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenant.id },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Kiraci bulunamadi' },
        { status: 404 }
      );
    }

    // Teklif durumunu kontrol et ve gecerli teklifleri al
    const proposals = await prisma.proposal.findMany({
      where: {
        id: {
          in: payload.proposalIds,
        },
        tenantId: tenant.id,
        status: {
          in: ['READY', 'SENT'],
        },
        deletedAt: null,
      },
      include: {
        customer: true,
        items: true,
      },
    });

    // Bulunan tekliflerin sayisini kontrol et
    if (proposals.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Gecerli teklif bulunamadi (READY veya SENT durumunda)',
        },
        { status: 400 }
      );
    }

    // Gonderim gorevlerini olustur
    const sendTasks = proposals.map(async (proposal) => {
      const result: SendResultItem = {
        proposalId: proposal.id,
        proposalNumber: proposal.proposalNumber,
        customerName: proposal.customer.name,
        status: 'sent',
        channels: {},
      };

      try {
        const proposalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/proposals/${proposal.publicToken}`;

        // WhatsApp araciligiyla gonder
        if (payload.channel === 'whatsapp' || payload.channel === 'both') {
          const phone = proposal.customer.phone;

          if (phone && tenant.whatsappPhoneId && tenant.whatsappAccessToken) {
            try {
              const whatsappService = WhatsAppService.fromTenantConfig({
                whatsappPhoneId: tenant.whatsappPhoneId,
                whatsappAccessToken: tenant.whatsappAccessToken,
              });

              const whatsappResult = await whatsappService.sendProposalLink({
                to: phone,
                customerName: proposal.customer.name,
                proposalNumber: proposal.proposalNumber,
                proposalTitle: proposal.title,
                grandTotal: `${Number(proposal.grandTotal).toLocaleString('tr-TR')} TRY`,
                proposalUrl,
                companyName: tenant.name,
              });

              if (whatsappResult.success) {
                result.channels.whatsapp = true;
              }
            } catch (whatsappError) {
              logger.error(
                `WhatsApp gonderi hatasi (${proposal.id})`,
                whatsappError
              );
              if (!result.error) {
                result.error = 'WhatsApp gonderi basarisiz';
              }
            }
          }
        }

        // Email araciligiyla gonder
        if (payload.channel === 'email' || payload.channel === 'both') {
          const email = proposal.customer.email;

          if (email) {
            try {
              const emailSent = await emailService.sendProposalNotification(email, {
                id: proposal.id,
                number: proposal.proposalNumber,
                clientName: proposal.customer.name,
                clientEmail: email,
                amount: Number(proposal.grandTotal),
                currency: proposal.currency,
                validUntil: proposal.expiresAt || new Date(),
              });

              if (emailSent) {
                result.channels.email = true;
              }
            } catch (emailError) {
              logger.error(
                `Email gonderi hatasi (${proposal.id})`,
                emailError
              );
              if (!result.error) {
                result.error = 'Email gonderi basarisiz';
              }
            }
          }
        }

        // Eger hic kanal basarili olmadiysa, hata durumuna ayarla
        if (Object.keys(result.channels).length === 0) {
          result.status = 'failed';
          result.error =
            result.error || 'Hicbir iletisim kanali mevcut degil';
        }

        // Teklif durumunu SENT olarak guncelle
        if (result.status === 'sent') {
          await prisma.proposal.update({
            where: { id: proposal.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
            },
          });

          // Aktivite kaydi olustur
          await prisma.proposalActivity.create({
            data: {
              proposalId: proposal.id,
              type: 'SENT',
              description: `Teklif toplu gonderim islemiyle ${Object.keys(result.channels).join('/')} araciligiyla gonderildi`,
              metadata: {
                channels: result.channels,
                bulkSend: true,
              },
            },
          });
        }
      } catch (error) {
        logger.error(`Teklif gonderimi hatasi (${proposal.id})`, error);
        result.status = 'failed';
        result.error =
          error instanceof Error ? error.message : 'Bilinmeyen hata';
      }

      return result;
    });

    // Maksimum 10 eszamanli gonderim ile Promise.allSettled calistir
    const maxConcurrent = 10;
    const results: SendResultItem[] = [];

    for (let i = 0; i < sendTasks.length; i += maxConcurrent) {
      const batch = sendTasks.slice(i, i + maxConcurrent);
      const batchResults = await Promise.allSettled(batch);

      for (const settledResult of batchResults) {
        if (settledResult.status === 'fulfilled') {
          results.push(settledResult.value);
        } else {
          // Promise reddedilirse, hata kaydi olustur
          const proposalId = payload.proposalIds[i];
          results.push({
            proposalId,
            proposalNumber: '',
            customerName: '',
            status: 'failed',
            error: 'Gonderim islemi sirasinda hata olustu',
            channels: {},
          });
        }
      }
    }

    // Ozet istatistikleri hesapla
    const sent = results.filter((r) => r.status === 'sent').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    const responseData: BulkSendResponse = {
      total: results.length,
      sent,
      failed,
      results,
    };

    return NextResponse.json(
      { success: true, data: responseData },
      { status: 200 }
    );
  } catch (error) {
    logger.error('POST /api/v1/proposals/bulk-send error', error);

    // Zod validasyon hatasi
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validasyon hatasi', details: error.errors },
        { status: 400 }
      );
    }

    // Genel sunucu hatasi
    return NextResponse.json(
      { success: false, error: 'Ic sunucu hatasi' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handlePost, ['proposal.send']);
