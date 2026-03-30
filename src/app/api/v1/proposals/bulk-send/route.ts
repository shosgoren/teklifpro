import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/shared/utils/prisma';
import { ApiResponse } from '@/shared/types';
import { WhatsAppService } from '@/infrastructure/services/whatsapp/WhatsAppService';
import { EmailService } from '@/infrastructure/services/email/EmailService';

// Bulk gönderim için validasyon şeması
const BulkSendSchema = z.object({
  proposalIds: z.array(z.string().min(1), {
    errorMap: () => ({ message: 'En az bir teklif ID\'si gerekli' }),
  }).min(1, 'En az bir teklif ID\'si gerekli'),
  channel: z.enum(['whatsapp', 'email', 'both']).default('whatsapp'),
  scheduledAt: z.string().datetime().optional(),
  message: z.string().max(1000).optional(),
});

type BulkSendRequest = z.infer<typeof BulkSendSchema>;

// Gönderim sonucu arayüzü
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

// API yanıt arayüzü
interface BulkSendResponse {
  total: number;
  sent: number;
  failed: number;
  results: SendResultItem[];
}

/**
 * POST /api/v1/proposals/bulk-send
 * Çoklu teklifi bir sefer gönder
 *
 * Özellikler:
 * - Birden fazla teklifi WhatsApp ve/veya Email aracılığıyla gönder
 * - Promise.allSettled ile maksimum 10 eşzamanlı gönderi
 * - Her gönderilen teklif için denetim günlüğü oluştur
 * - Teklif durumunu SENT olarak güncelle
 * - Detaylı sonuç bilgisi döndür
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<BulkSendResponse>>> {
  try {
    // Kimlik doğrulamayı kontrol et
    const { userId } = { userId: request.headers.get('x-user-id'), orgId: request.headers.get('x-tenant-id') };
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Yetkisiz erişim',
          data: null,
        },
        { status: 401 }
      );
    }

    // İstek gövdesini işle
    const body = await request.json();
    const payload = BulkSendSchema.parse(body);

    // Kiracı bilgisini al
    const tenant = await prisma.tenant.findFirst({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        integrations: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          error: 'Kiracı bulunamadı',
          data: null,
        },
        { status: 404 }
      );
    }

    // Teklif durumunu kontrol et ve geçerli teklifleri al
    const proposals = await prisma.proposal.findMany({
      where: {
        id: {
          in: payload.proposalIds,
        },
        tenantId: tenant.id,
        status: {
          in: ['DRAFT', 'REVISED'],
        },
      },
      include: {
        client: true,
        items: true,
      },
    });

    // Bulunan tekliflerin sayısını kontrol et
    if (proposals.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Geçerli teklif bulunamadı (DRAFT veya REVISED durumunda)',
          data: null,
        },
        { status: 400 }
      );
    }

    // Gönderim görevlerini oluştur
    const sendTasks = proposals.map(async (proposal) => {
      const result: SendResultItem = {
        proposalId: proposal.id,
        proposalNumber: proposal.proposalNumber,
        customerName: proposal.client.name,
        status: 'sent',
        channels: {},
      };

      try {
        const sentAt = new Date();
        const proposalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/proposals/${proposal.publicToken}`;

        // WhatsApp aracılığıyla gönder
        if (payload.channel === 'whatsapp' || payload.channel === 'both') {
          const phone = proposal.clientPhone || proposal.client.phone;

          if (phone) {
            try {
              const whatsappIntegration = tenant.integrations.find(
                (i) => i.provider === 'WHATSAPP'
              );

              if (whatsappIntegration?.accessToken) {
                const whatsappService = new WhatsAppService({
                  accessToken: whatsappIntegration.accessToken,
                  businessAccountId:
                    whatsappIntegration.metadata?.businessAccountId,
                });

                const defaultMessage = `
Merhaba ${proposal.client.name},

Teknoloji çözümlerimiz hakkında size bir teklif hazırladık.

Teklif Numarası: ${proposal.proposalNumber}
Toplam Tutar: ₺${proposal.total.toLocaleString('tr-TR')}

Teklifi görüntülemek için lütfen aşağıdaki linke tıklayınız:
${proposalUrl}

Sorularınız için bizimle iletişime geçmekten çekinmeyin.

İyi çalışmalar!
                `.trim();

                const messageText = payload.message || defaultMessage;

                await whatsappService.sendMessage({
                  phoneNumber: phone,
                  message: messageText,
                  mediaUrl: undefined,
                });

                result.channels.whatsapp = true;
              }
            } catch (whatsappError) {
              console.error(
                `WhatsApp gönderi hatası (${proposal.id}):`,
                whatsappError
              );
              if (!result.error) {
                result.error = 'WhatsApp gönderi başarısız';
              }
            }
          }
        }

        // Email aracılığıyla gönder
        if (payload.channel === 'email' || payload.channel === 'both') {
          const email = proposal.clientEmail || proposal.client.email;

          if (email) {
            try {
              const emailService = new EmailService();

              await emailService.sendProposalEmail({
                to: email,
                proposalNumber: proposal.proposalNumber,
                customerName: proposal.client.name,
                proposalUrl: proposalUrl,
                totalAmount: proposal.total.toLocaleString('tr-TR'),
                customMessage: payload.message,
              });

              result.channels.email = true;
            } catch (emailError) {
              console.error(
                `Email gönderi hatası (${proposal.id}):`,
                emailError
              );
              if (!result.error) {
                result.error = 'Email gönderi başarısız';
              }
            }
          }
        }

        // Eğer hiç kanal başarılı olmadıysa, hata durumuna ayarla
        if (Object.keys(result.channels).length === 0) {
          result.status = 'failed';
          result.error =
            result.error || 'Hiçbir iletişim kanalı mevcut değil';
        }

        // Teklif durumunu SENT olarak güncelle
        if (result.status === 'sent') {
          await prisma.proposal.update({
            where: { id: proposal.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
            },
          });

          // Denetim günlüğü oluştur
          await prisma.activity.create({
            data: {
              proposalId: proposal.id,
              type: 'SENT',
              description: `Teklif toplu gönderim işlemiyle ${Object.keys(result.channels).join('/')} aracılığıyla gönderildi`,
              metadata: {
                channels: result.channels,
                bulkSend: true,
              },
            },
          });

          // İntegrasyon günlüğü oluştur
          const integrationId = tenant.integrations.find(
            (i) => i.provider === 'WHATSAPP' || i.provider === 'EMAIL'
          )?.id;

          if (integrationId) {
            await prisma.integrationLog.create({
              data: {
                integrationId,
                event: 'PROPOSAL_BULK_SENT',
                status: 'SUCCESS',
                metadata: {
                  proposalId: proposal.id,
                  proposalNumber: proposal.proposalNumber,
                  channels: result.channels,
                  bulkSend: true,
                },
              },
            });
          }
        }
      } catch (error) {
        console.error(`Teklif gönderimi hatası (${proposal.id}):`, error);
        result.status = 'failed';
        result.error =
          error instanceof Error ? error.message : 'Bilinmeyen hata';
      }

      return result;
    });

    // Maksimum 10 eşzamanlı gönderim ile Promise.allSettled çalıştır
    const maxConcurrent = 10;
    const results: SendResultItem[] = [];

    for (let i = 0; i < sendTasks.length; i += maxConcurrent) {
      const batch = sendTasks.slice(i, i + maxConcurrent);
      const batchResults = await Promise.allSettled(batch);

      for (const settledResult of batchResults) {
        if (settledResult.status === 'fulfilled') {
          results.push(settledResult.value);
        } else {
          // Promise reddedilerse, hata kaydı oluştur
          const proposalId = payload.proposalIds[i];
          results.push({
            proposalId,
            proposalNumber: '',
            customerName: '',
            status: 'failed',
            error: 'Gönderim işlemi sırasında hata oluştu',
            channels: {},
          });
        }
      }
    }

    // Özet istatistikleri hesapla
    const sent = results.filter((r) => r.status === 'sent').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    return NextResponse.json(
      {
        success: true,
        data: {
          total: results.length,
          sent,
          failed,
          results,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('POST /api/v1/proposals/bulk-send error:', error);

    // Zod validasyon hatası
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validasyon hatası',
          details: error.errors,
          data: null,
        },
        { status: 400 }
      );
    }

    // Genel sunucu hatası
    return NextResponse.json(
      {
        success: false,
        error: 'İç sunucu hatası',
        data: null,
      },
      { status: 500 }
    );
  }
}
