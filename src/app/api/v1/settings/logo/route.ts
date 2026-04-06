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
        companySignature: true,
        companySeal: true,
        companySignerName: true,
        companySignerTitle: true,
      },
    });

    // Mask access token for security (only show last 8 chars)
    // Decrypt signature data for display
    const data = tenant ? {
      ...tenant,
      whatsappAccessToken: tenant.whatsappAccessToken
        ? '•'.repeat(20) + tenant.whatsappAccessToken.slice(-8)
        : null,
      companySignature: tenant.companySignature ? decryptSignature(tenant.companySignature) : null,
      companySeal: tenant.companySeal ? decryptSignature(tenant.companySeal) : null,
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

    // Company signature fields — encrypt image data with AES-256-GCM
    if (companySignature !== undefined) {
      if (companySignature && typeof companySignature === 'string' && companySignature.startsWith('data:image/')) {
        if (companySignature.length > 700000) {
          return NextResponse.json({ success: false, error: 'İmza dosyası çok büyük. Maksimum 500KB.' }, { status: 400 });
        }
        updateData.companySignature = encryptSignature(companySignature);
      } else {
        updateData.companySignature = null;
      }
    }
    if (companySeal !== undefined) {
      if (companySeal && typeof companySeal === 'string' && companySeal.startsWith('data:image/')) {
        if (companySeal.length > 700000) {
          return NextResponse.json({ success: false, error: 'Kaşe dosyası çok büyük. Maksimum 500KB.' }, { status: 400 });
        }
        updateData.companySeal = encryptSignature(companySeal);
      } else {
        updateData.companySeal = null;
      }
    }
    if (companySignerName !== undefined) updateData.companySignerName = companySignerName || null;
    if (companySignerTitle !== undefined) updateData.companySignerTitle = companySignerTitle || null;

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
        companySignerName: true,
        companySignerTitle: true,
      },
    });

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
