import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
import { supabaseAdmin, PRODUCT_IMAGES_BUCKET } from '@/shared/lib/supabase';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('ProductImageAPI');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * POST /api/v1/products/[id]/image
 * Upload product image to Supabase Storage
 */
async function handlePost(
  request: NextRequest,
  context?: { params: Record<string, string> }
) {
  try {
    const session = getSessionFromRequest(request)!;
    const productId = context!.params.id;

    // Verify product belongs to tenant
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId: session.tenant.id, deletedAt: null },
      select: { id: true, imageUrl: true },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Only JPEG, PNG, and WebP images are allowed' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size must be under 5MB' },
        { status: 400 }
      );
    }

    // Generate unique file path
    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `${session.tenant.id}/${productId}.${ext}`;

    // Upload to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      logger.error('Supabase upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Failed to upload image' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .getPublicUrl(filePath);

    const imageUrl = urlData.publicUrl;

    // Update product with image URL
    await prisma.product.update({
      where: { id: productId },
      data: { imageUrl },
    });

    return NextResponse.json({
      success: true,
      data: { imageUrl },
    });
  } catch (error) {
    logger.error('POST /api/v1/products/[id]/image error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/products/[id]/image
 * Remove product image
 */
async function handleDelete(
  request: NextRequest,
  context?: { params: Record<string, string> }
) {
  try {
    const session = getSessionFromRequest(request)!;
    const productId = context!.params.id;

    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId: session.tenant.id, deletedAt: null },
      select: { id: true, imageUrl: true },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Try to delete from storage if URL is a Supabase URL
    if (product.imageUrl?.includes(PRODUCT_IMAGES_BUCKET)) {
      const pathMatch = product.imageUrl.split(`${PRODUCT_IMAGES_BUCKET}/`)[1];
      if (pathMatch) {
        await supabaseAdmin.storage
          .from(PRODUCT_IMAGES_BUCKET)
          .remove([pathMatch]);
      }
    }

    await prisma.product.update({
      where: { id: productId },
      data: { imageUrl: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('DELETE /api/v1/products/[id]/image error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handlePost, ['product.update']);
export const DELETE = withAuth(handleDelete, ['product.update']);
