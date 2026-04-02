import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ParasutClient } from '@/infrastructure/services/parasut/ParasutClient';
import { prisma } from '@/shared/utils/prisma';
import { ApiResponse } from '@/shared/types';
import { withAuth, getSessionFromRequest } from '@/infrastructure/middleware/authMiddleware';
import { SyncRequestSchema } from '@/shared/validations/integrations';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('ParasutSyncAPI');

type SyncRequest = z.infer<typeof SyncRequestSchema>;

interface SyncResult {
  customers?: {
    imported: number;
    updated: number;
    failed: number;
    errors: string[];
  };
  products?: {
    imported: number;
    updated: number;
    failed: number;
    errors: string[];
  };
  bankAccounts?: {
    synced: number;
    errors: string[];
  };
}

async function handlePost(request: NextRequest): Promise<NextResponse<ApiResponse<SyncResult>>> {
  try {
    const session = getSessionFromRequest(request)!;

    const body = await request.json();
    const payload = SyncRequestSchema.parse(body);

    // Get tenant with Parasut credentials
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenant.id },
    });

    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Tenant not found',
          },
        },
        { status: 404 }
      );
    }

    if (!tenant.parasutCompanyId || !tenant.parasutClientId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_CONFIGURED',
            message: 'Parasut integration not configured',
          },
        },
        { status: 400 }
      );
    }

    // Initialize Parasut client using the factory method
    const parasutClient = await ParasutClient.forTenant(tenant.id);

    const syncResult: SyncResult = {};
    const entitiesToSync = payload.entities?.includes('all')
      ? ['customers', 'products', 'bank_accounts']
      : payload.entities ?? ['customers', 'products', 'bank_accounts'];

    // Sync customers
    if (entitiesToSync.includes('customers')) {
      try {
        const result = await parasutClient.syncAllContacts();
        syncResult.customers = {
          imported: result.synced,
          updated: 0,
          failed: result.errors,
          errors: [],
        };
      } catch (error) {
        logger.error('Customer sync error:', error);
        syncResult.customers = {
          imported: 0,
          updated: 0,
          failed: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        };
      }
    }

    // Sync products
    if (entitiesToSync.includes('products')) {
      try {
        const result = await parasutClient.syncAllProducts();
        syncResult.products = {
          imported: result.synced,
          updated: 0,
          failed: result.errors,
          errors: [],
        };
      } catch (error) {
        logger.error('Product sync error:', error);
        syncResult.products = {
          imported: 0,
          updated: 0,
          failed: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        };
      }
    }

    // Sync bank accounts
    if (entitiesToSync.includes('bank_accounts')) {
      try {
        const result = await parasutClient.syncBankAccounts();
        syncResult.bankAccounts = {
          synced: result.synced,
          errors: [],
        };
      } catch (error) {
        logger.error('Bank accounts sync error:', error);
        syncResult.bankAccounts = {
          synced: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: syncResult,
    });
  } catch (error) {
    logger.error('POST /api/v1/parasut/sync error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation error',
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handlePost, ['integration.sync']);
