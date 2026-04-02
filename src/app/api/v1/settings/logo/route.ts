import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/utils/prisma';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
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
      },
    });

    return NextResponse.json({ success: true, data: tenant });
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
    const { logo, name, phone, address, taxNumber, taxOffice, bankAccounts } = body;

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
