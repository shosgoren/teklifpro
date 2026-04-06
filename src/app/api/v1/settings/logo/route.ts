import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/utils/prisma';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
import { encryptSignature, decryptSignature } from '@/shared/utils/signatureCrypto';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('LogoSettingsAPI');

// GET - fetch tenant info including logo
async function handleGet(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)!;

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenant.id },
      select: {
        id: true,
        name: true,
        logo: true,
        email: true,
        phone: true,
        address: true,
        taxNumber: true,
        taxOffice: true,
        bankAccounts: true,
        whatsappPhoneId: true,
        whatsappAccessToken: true,
        whatsappBusinessId: true,
      },
    });

    // Try to fetch signature fields (may not exist in DB yet)
    let sigFields: { companySignature: string | null; companySeal: string | null; companySignerName: string | null; companySignerTitle: string | null } = {
      companySignature: null, companySeal: null, companySignerName: null, companySignerTitle: null,
    };
    try {
      const sigData = await prisma.tenant.findUnique({
        where: { id: session.tenant.id },
        select: { companySignature: true, companySeal: true, companySignerName: true, companySignerTitle: true },
      });
      if (sigData) sigFields = sigData;
    } catch {
      // Signature columns may not exist in DB yet — graceful fallback
    }

    // Mask access token for security (only show last 8 chars)
    // Decrypt signature data for display
    const data = tenant ? {
      ...tenant,
      whatsappAccessToken: tenant.whatsappAccessToken
        ? '•'.repeat(20) + tenant.whatsappAccessToken.slice(-8)
        : null,
      companySignature: sigFields.companySignature ? decryptSignature(sigFields.companySignature) : null,
      companySeal: sigFields.companySeal ? decryptSignature(sigFields.companySeal) : null,
      companySignerName: sigFields.companySignerName,
      companySignerTitle: sigFields.companySignerTitle,
    } : null;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - upload logo (base64)
async function handlePost(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)!;

    const body = await request.json();
    const { logo, name, phone, address, taxNumber, taxOffice, bankAccounts, companySignature, companySeal, companySignerName, companySignerTitle } = body;

    // Validate logo if provided (must be a data URL, max 500KB base64)
    if (logo !== undefined && logo !== null) {
      if (typeof logo === 'string' && logo.length > 0) {
        if (!logo.startsWith('data:image/')) {
          return NextResponse.json(
            { success: false, error: 'Logo must be an image data URL' },
            { status: 400 }
          );
        }
        // ~500KB limit for base64 (roughly 375KB image)
        if (logo.length > 700000) {
          return NextResponse.json(
            { success: false, error: 'Logo too large. Maximum 500KB.' },
            { status: 400 }
          );
        }
      }
    }

    const updateData: Record<string, any> = {};
    if (logo !== undefined) updateData.logo = logo || null;
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone || null;
    if (address !== undefined) updateData.address = address || null;
    if (taxNumber !== undefined) updateData.taxNumber = taxNumber || null;
    if (taxOffice !== undefined) updateData.taxOffice = taxOffice || null;
    if (bankAccounts !== undefined) updateData.bankAccounts = bankAccounts;

    // Separate signature fields — columns may not exist in DB yet
    const sigUpdateData: Record<string, unknown> = {};
    const hasSigFields = companySignature !== undefined || companySeal !== undefined || companySignerName !== undefined || companySignerTitle !== undefined;
    if (companySignature !== undefined) {
      if (companySignature && typeof companySignature === 'string' && companySignature.startsWith('data:image/')) {
        if (companySignature.length > 700000) {
          return NextResponse.json({ success: false, error: 'İmza dosyası çok büyük. Maksimum 500KB.' }, { status: 400 });
        }
        sigUpdateData.companySignature = encryptSignature(companySignature);
      } else {
        sigUpdateData.companySignature = null;
      }
    }
    if (companySeal !== undefined) {
      if (companySeal && typeof companySeal === 'string' && companySeal.startsWith('data:image/')) {
        if (companySeal.length > 700000) {
          return NextResponse.json({ success: false, error: 'Kaşe dosyası çok büyük. Maksimum 500KB.' }, { status: 400 });
        }
        sigUpdateData.companySeal = encryptSignature(companySeal);
      } else {
        sigUpdateData.companySeal = null;
      }
    }
    if (companySignerName !== undefined) sigUpdateData.companySignerName = companySignerName || null;
    if (companySignerTitle !== undefined) sigUpdateData.companySignerTitle = companySignerTitle || null;

    const tenant = await prisma.tenant.update({
      where: { id: session.tenant.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        logo: true,
        email: true,
        phone: true,
        address: true,
        taxNumber: true,
        taxOffice: true,
        bankAccounts: true,
      },
    });

    // Try to update signature fields separately (columns may not exist yet)
    if (hasSigFields) {
      try {
        await prisma.tenant.update({
          where: { id: session.tenant.id },
          data: sigUpdateData,
        });
      } catch {
        logger.error('Signature columns not yet in DB — run migration');
      }
    }

    return NextResponse.json({ success: true, data: tenant });
  } catch (error) {
    logger.error('Logo upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGet, ['settings.manage']);
export const POST = withAuth(handlePost, ['settings.manage']);
