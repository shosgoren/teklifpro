import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/utils/prisma';
import { ApiResponse } from '@/shared/types';
import { generateProposalNumber, generatePublicToken } from '@/shared/utils/proposal';
import { getAuth } from '@clerk/nextjs/server';

/**
 * POST /api/v1/proposals/[id]/clone
 * Teklifi kopyala - yeni teklif numarası ve token ile deep copy oluştur
 */

// Validation schemas
const CloneProposalBodySchema = z.object({
  customerId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  title: z.string().min(1).max(255).optional(),
  priceMultiplier: z.number().positive().optional(),
  includeNotes: z.boolean().default(true),
});

type CloneProposalInput = z.infer<typeof CloneProposalBodySchema>;

interface ClonedProposalResponse {
  id: string;
  number: string;
  title: string;
  status: string;
  customerId: string;
  publicToken: string;
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  total: number;
  items?: any[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Helper: UUID formatı kontrol et
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Helper: Teklif sayfa İlişkilerini getir
 */
async function getProposalWithRelations(proposalId: string) {
  return prisma.proposal.findUnique({
    where: { id: proposalId, deletedAt: null },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          tenantId: true,
        },
      },
      contact: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Handler: Teklif Kopyala
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse>> {
  try {
    const sourceProposalId = params.id;

    // ============ 1. DOĞRULAMA ============

    // UUID formatı kontrol et
    if (!isValidUUID(sourceProposalId)) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Geçersiz teklif ID formatı',
          },
        },
        { status: 400 }
      );
    }

    // Kullanıcı kimliğini kontrol et
    const { userId } = await getAuth(request);
    if (!userId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Kimlik doğrulama gerekli',
          },
        },
        { status: 401 }
      );
    }

    // Request body'yi validate et
    let validatedData: CloneProposalInput;
    try {
      const body = await request.json();
      validatedData = CloneProposalBodySchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'İstek verisi doğrulama hatası',
              details: error.flatten().fieldErrors as any,
            },
          },
          { status: 400 }
        );
      }
      throw error;
    }

    // ============ 2. KAYNAK TEKLİF VERİLERİ ============

    // Kaynak teklifi getir
    const sourceProposal = await getProposalWithRelations(sourceProposalId);

    if (!sourceProposal) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Kaynak teklif bulunamadı',
          },
        },
        { status: 404 }
      );
    }

    // Kullanıcının kiracısını kontrol et
    const userTenant = await prisma.tenant.findFirst({
      where: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
    });

    if (!userTenant || userTenant.id !== sourceProposal.customer.tenantId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Bu teklifi kopyalama izni yok',
          },
        },
        { status: 403 }
      );
    }

    // ============ 3. HEDEFİ MÜŞTERİYİ DOĞRULA ============

    const targetCustomerId = validatedData.customerId || sourceProposal.customerId;
    const targetContactId = validatedData.contactId || sourceProposal.contactId;

    // Hedef müşterinin var olduğunu ve kiracıya ait olduğunu doğrula
    const targetCustomer = await prisma.customer.findUnique({
      where: { id: targetCustomerId },
    });

    if (!targetCustomer || targetCustomer.tenantId !== userTenant.id) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_CUSTOMER',
            message: 'Hedef müşteri bulunamadı veya kiracıya ait değil',
          },
        },
        { status: 404 }
      );
    }

    // Hedef iletişi doğrula (varsa)
    if (targetContactId) {
      const targetContact = await prisma.contact.findUnique({
        where: { id: targetContactId },
      });

      if (!targetContact || targetContact.customerId !== targetCustomerId) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              code: 'INVALID_CONTACT',
              message: 'İletişi kişi bulunamadı veya müşteriye ait değil',
            },
          },
          { status: 404 }
        );
      }
    }

    // ============ 4. FIYAT ÇARPICISI UYGULA ============

    let clonedItems = sourceProposal.items.map((item) => {
      let newUnitPrice = item.unitPrice;

      if (validatedData.priceMultiplier) {
        newUnitPrice = item.unitPrice * validatedData.priceMultiplier;
      }

      return {
        productId: item.productId,
        name: item.name,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: newUnitPrice,
        discountRate: item.discountRate,
        vatRate: item.vatRate,
      };
    });

    // ============ 5. YENİ TOPLAMLAR HESAPLA ============

    let newSubtotal = 0;
    let newDiscountAmount = 0;
    let newVatAmount = 0;

    clonedItems.forEach((item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemDiscount = (itemSubtotal * item.discountRate) / 100;
      const itemBeforeVat = itemSubtotal - itemDiscount;
      const itemVat = (itemBeforeVat * item.vatRate) / 100;

      newSubtotal += itemSubtotal;
      newDiscountAmount += itemDiscount;
      newVatAmount += itemVat;
    });

    const newTotal = newSubtotal - newDiscountAmount + newVatAmount;

    // ============ 6. KOPYALAMA İŞLEMİ (TRANSACTION) ============

    const clonedProposal = await prisma.$transaction(async (tx) => {
      // Yeni teklif oluştur
      const newProposal = await tx.proposal.create({
        data: {
          number: generateProposalNumber(),
          publicToken: generatePublicToken(),
          title: validatedData.title || sourceProposal.title,
          description: sourceProposal.description,
          status: 'DRAFT',
          customerId: targetCustomerId,
          contactId: targetContactId || undefined,
          tenantId: userTenant.id,
          subtotal: newSubtotal,
          discountAmount: newDiscountAmount,
          vatAmount: newVatAmount,
          total: newTotal,
          notes: validatedData.includeNotes ? sourceProposal.notes : '',
          terms: sourceProposal.terms,
          validityDays: sourceProposal.validityDays,
          discountType: sourceProposal.discountType,
          discountValue: sourceProposal.discountValue,
          paymentTerms: sourceProposal.paymentTerms,
          deliveryTerms: sourceProposal.deliveryTerms,
          termsConditions: sourceProposal.termsConditions,
        },
      });

      // Teklif öğelerini kopyala (sadece veri tabanı kayıtları)
      if (clonedItems.length > 0) {
        await tx.proposalItem.createMany({
          data: clonedItems.map((item) => ({
            proposalId: newProposal.id,
            productId: item.productId,
            name: item.name,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountRate: item.discountRate,
            vatRate: item.vatRate,
          })),
        });
      }

      // Audit log oluştur
      await tx.auditLog.create({
        data: {
          tenantId: userTenant.id,
          userId: userId,
          action: `Teklif kopyalandı: ${sourceProposalId} -> ${newProposal.id}`,
          status: 'SUCCESS',
          resource: 'proposal',
          timestamp: new Date(),
          metadata: {
            sourceProposalId,
            newProposalId: newProposal.id,
            priceMultiplier: validatedData.priceMultiplier,
            sourceCustomerId: sourceProposal.customerId,
            targetCustomerId: targetCustomerId,
          },
        },
      }).catch(() => {
        // Audit log tablosu olmayabilir, bu durumda devam et
        console.log('[AUDIT] Proposal cloned:', {
          sourceProposalId,
          newProposalId: newProposal.id,
        });
      });

      // Tamamlanmış teklifi ilişkilerle beraber getir
      return tx.proposal.findUnique({
        where: { id: newProposal.id },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          contact: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    });

    // ============ 7. BAŞARILI YANIT ============

    const response: ClonedProposalResponse = {
      id: clonedProposal!.id,
      number: clonedProposal!.number,
      title: clonedProposal!.title,
      status: clonedProposal!.status,
      customerId: clonedProposal!.customerId,
      publicToken: clonedProposal!.publicToken,
      subtotal: clonedProposal!.subtotal,
      discountAmount: clonedProposal!.discountAmount,
      vatAmount: clonedProposal!.vatAmount,
      total: clonedProposal!.total,
      items: clonedProposal!.items,
      createdAt: clonedProposal!.createdAt.toISOString(),
      updatedAt: clonedProposal!.updatedAt.toISOString(),
    };

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: response,
        error: undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/v1/proposals/[id]/clone error:', error);

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Teklif kopyalanırken hata oluştu',
        },
      },
      { status: 500 }
    );
  }
}
