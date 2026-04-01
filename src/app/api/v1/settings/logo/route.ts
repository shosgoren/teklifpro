import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/utils/prisma';
import { getSession } from '@/shared/lib/auth';

// GET - fetch tenant info including logo
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: {
        id: true,
        name: true,
        logo: true,
        email: true,
        phone: true,
        address: true,
        taxNumber: true,
        taxOffice: true,
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
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { logo, name, phone, address, taxNumber, taxOffice } = body;

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

    const tenant = await prisma.tenant.update({
      where: { id: session.user.tenantId },
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
      },
    });

    return NextResponse.json({ success: true, data: tenant });
  } catch (error) {
    console.error('Logo upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
