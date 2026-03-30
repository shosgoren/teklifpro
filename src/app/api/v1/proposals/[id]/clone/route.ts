import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/utils/prisma';
import { ApiResponse } from '@/shared/types';
import { generateProposalNumber, generatePublicToken } from '@/shared/utils/proposal';


/**
 * POST /api/v1/proposals/[id]/clone
 * Teklifi kopyala - yeni teklif numarasi ve token ile deep copy olustur
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

/**
 * Helper: UUID formati kontrol et
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Helper: Teklif iliskilerini getir
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

    // ============ 1. DOGRULAMA ============

    // UUID formati kontrol et
    if (!isValidUUID(sourceProposalId)) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Gecersiz teklif ID formati',
          },
        },
        { status: 400 }
      );
    }

    // Kullanici kimligini kontrol et
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Kimlik dogrulama gerekli',
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
              message: 'Istek verisi dogrulama hatasi',
              details: error.flatten().fieldErrors as any,
            },
          },
          { status: 400 }
        );
      }
      throw error;
    }

    // ============ 2. KAYNAK TEKLIF VERILERI ============

    // Kaynak teklifi getir
    const sourceProposal = await getProposalWithRelations(sourceProposalId);

    if (!sourceProposal) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Kaynak teklif bulunamadi',
          },
        },
        { status: 404 }
      );
    }

    // Kullanicinin kiracisini kontrol et
    const userRecord = await prisma.user.findFirst({
      where: { id: userId },
      select: { tenantId: true },
    });

    if (!userRecord || userRecord.tenantId !== sourceProposal.customer.tenantId) {
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

    const tenantId = userRecord.tenantId;

    // ============ 3. HEDEF MUSTERIYI DOGRULA ============

    const targetCustomerId = validatedData.customerId || sourceProposal.customerId;
    const targetContactId = validatedData.contactId || sourceProposal.contactId;

    // Hedef musterinin var oldugunu ve kiraciya ait oldugunu dogrula
    const targetCustomer = await prisma.customer.findUnique({
      where: { id: targetCustomerId },
    });

    if (!targetCustomer || targetCustomer.tenantId !== tenantId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_CUSTOMER',
            message: 'Hedef musteri bulunamadi veya kiraciya ait degil',
          },
        },
        { status: 404 }
      );
    }

    // Hedef iletisiyi dogrula (varsa)
    if (targetContactId) {
      const targetContact = await prisma.customerContact.findUnique({
        where: { id: targetContactId },
      });

      if (!targetContact || targetContact.customerId !== targetCustomerId) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              code: 'INVALID_CONTACT',
              message: 'Iletisi kisi bulunamadi veya musteriye ait degil',
            },
          },
          { status: 404 }
        );
      }
    }

    // ============ 4. FIYAT CARPICISI UYGULA ============

    const clonedItems = sourceProposal.items.map((item) => {
      let newUnitPrice = Number(item.unitPrice);

      if (validatedData.priceMultiplier) {
        newUnitPrice = newUnitPrice * validatedData.priceMultiplier;
      }

      return {
        productId: item.productId,
        name: item.name,
        description: item.description,
        unit: item.unit,
        quantity: Number(item.quantity),
        unitPrice: newUnitPrice,
        discountRate: Number(item.discountRate),
        vatRate: Number(item.vatRate),
      };
    });

    // ============ 5. YENI TOPLAMLAR HESAPLA ============

    let newSubtotal = 0;
    let newDiscountAmount = 0;
    let newVatTotal = 0;

    clonedItems.forEach((item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemDiscount = (itemSubtotal * item.discountRate) / 100;
      const itemBeforeVat = itemSubtotal - itemDiscount;
      const itemVat = (itemBeforeVat * item.vatRate) / 100;

      newSubtotal += itemSubtotal;
      newDiscountAmount += itemDiscount;
      newVatTotal += itemVat;
    });

    const newGrandTotal = newSubtotal - newDiscountAmount + newVatTotal;

    // ============ 6. KOPYALAMA ISLEMI (TRANSACTION) ============

    const clonedProposal = await prisma.$transaction(async (tx) => {
      // Yeni teklif olustur
      const newProposal = await tx.proposal.create({
        data: {
          proposalNumber: generateProposalNumber(),
          publicToken: generatePublicToken(),
          title: validatedData.title || sourceProposal.title,
          description: sourceProposal.description,
          status: 'DRAFT',
          customerId: targetCustomerId,
          contactId: targetContactId || undefined,
          tenantId: tenantId,
          userId: userId,
          subtotal: newSubtotal,
          discountAmount: newDiscountAmount,
          vatTotal: newVatTotal,
          grandTotal: newGrandTotal,
          notes: validatedData.includeNotes ? sourceProposal.notes : '',
          validityDays: sourceProposal.validityDays,
          discountType: sourceProposal.discountType,
          discountValue: sourceProposal.discountValue ? Number(sourceProposal.discountValue) : undefined,
          paymentTerms: sourceProposal.paymentTerms,
          deliveryTerms: sourceProposal.deliveryTerms,
          termsConditions: sourceProposal.termsConditions,
        },
      });

      // Teklif ogelerini kopyala
      if (clonedItems.length > 0) {
        await tx.proposalItem.createMany({
          data: clonedItems.map((item, index) => ({
            proposalId: newProposal.id,
            productId: item.productId,
            name: item.name,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountRate: item.discountRate,
            vatRate: item.vatRate,
            lineTotal: item.quantity * item.unitPrice * (1 - item.discountRate / 100),
            sortOrder: index,
          })),
        });
      }

      // Audit log olustur
      await tx.auditLog.create({
        data: {
          tenantId: tenantId,
          userId: userId,
          action: `Teklif kopyalandi: ${sourceProposalId} -> ${newProposal.id}`,
          entity: 'proposal',
          entityId: newProposal.id,
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

      // Tamamlanmis teklifi iliskilerle beraber getir
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

    // ============ 7. BASARILI YANIT ============

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          id: clonedProposal!.id,
          proposalNumber: clonedProposal!.proposalNumber,
          title: clonedProposal!.title,
          status: clonedProposal!.status,
          customerId: clonedProposal!.customerId,
          publicToken: clonedProposal!.publicToken,
          subtotal: Number(clonedProposal!.subtotal),
          discountAmount: Number(clonedProposal!.discountAmount),
          vatTotal: Number(clonedProposal!.vatTotal),
          grandTotal: Number(clonedProposal!.grandTotal),
          items: clonedProposal!.items,
          createdAt: clonedProposal!.createdAt.toISOString(),
          updatedAt: clonedProposal!.updatedAt.toISOString(),
        },
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
          message: 'Teklif kopyalanirken hata olustu',
        },
      },
      { status: 500 }
    );
  }
}
