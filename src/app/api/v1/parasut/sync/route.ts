import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ParasutClient } from '@/infrastructure/services/parasut/ParasutClient';
import { prisma } from '@/shared/utils/prisma';
import { ApiResponse } from '@/shared/types';

// Validation schema
const SyncRequestSchema = z.object({
  entities: z.array(
    z.enum(['customers', 'products', 'all'])
  ).optional(),
});

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
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<SyncResult>>> {
  try {
    const { userId } = { userId: request.headers.get('x-user-id'), orgId: request.headers.get('x-tenant-id') };
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          data: null,
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const payload = SyncRequestSchema.parse(body);

    // Get tenant and Parasut credentials
    const tenant = await prisma.tenant.findFirst({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        integrations: {
          where: { provider: 'PARASUT' },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tenant not found',
          data: null,
        },
        { status: 404 }
      );
    }

    const parasutIntegration = tenant.integrations[0];
    if (!parasutIntegration || !parasutIntegration.accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Parasut integration not configured',
          data: null,
        },
        { status: 400 }
      );
    }

    // Initialize Parasut client
    const parasutClient = new ParasutClient({
      apiKey: parasutIntegration.accessToken,
      companyId: parasutIntegration.metadata?.companyId,
    });

    const syncResult: SyncResult = {};
    const entitiesToSync = payload.entities?.includes('all')
      ? ['customers', 'products']
      : payload.entities ?? ['customers', 'products'];

    // Sync customers
    if (entitiesToSync.includes('customers')) {
      try {
        const customersResult = await syncCustomers(parasutClient, tenant.id);
        syncResult.customers = customersResult;
      } catch (error) {
        console.error('Customer sync error:', error);
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
        const productsResult = await syncProducts(parasutClient, tenant.id);
        syncResult.products = productsResult;
      } catch (error) {
        console.error('Product sync error:', error);
        syncResult.products = {
          imported: 0,
          updated: 0,
          failed: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        };
      }
    }

    // Create sync log
    await prisma.integrationLog.create({
      data: {
        integrationId: parasutIntegration.id,
        event: 'SYNC_COMPLETED',
        status: 'SUCCESS',
        metadata: syncResult,
      },
    });

    return NextResponse.json({
      success: true,
      data: syncResult,
    });
  } catch (error) {
    console.error('POST /api/v1/parasut/sync error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
          data: null,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        data: null,
      },
      { status: 500 }
    );
  }
}

async function syncCustomers(
  parasutClient: ParasutClient,
  tenantId: string
): Promise<SyncResult['customers']> {
  const result = {
    imported: 0,
    updated: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    // Fetch customers from Parasut
    const customers = await parasutClient.getCustomers();

    for (const parasutCustomer of customers) {
      try {
        const existingCustomer = await prisma.customer.findFirst({
          where: {
            tenantId,
            externalId: parasutCustomer.id,
          },
        });

        if (existingCustomer) {
          // Update existing customer
          await prisma.customer.update({
            where: { id: existingCustomer.id },
            data: {
              name: parasutCustomer.name,
              email: parasutCustomer.email,
              phone: parasutCustomer.phone,
              taxNumber: parasutCustomer.tax_number,
              address: parasutCustomer.address,
              metadata: {
                ...existingCustomer.metadata,
                lastSyncedAt: new Date().toISOString(),
              },
            },
          });
          result.updated++;
        } else {
          // Create new customer
          await prisma.customer.create({
            data: {
              tenantId,
              externalId: parasutCustomer.id,
              name: parasutCustomer.name,
              email: parasutCustomer.email,
              phone: parasutCustomer.phone,
              taxNumber: parasutCustomer.tax_number,
              address: parasutCustomer.address,
              metadata: {
                source: 'PARASUT',
                lastSyncedAt: new Date().toISOString(),
              },
            },
          });
          result.imported++;
        }
      } catch (error) {
        result.failed++;
        result.errors.push(
          `Customer ${parasutCustomer.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  } catch (error) {
    result.failed++;
    result.errors.push(error instanceof Error ? error.message : 'Failed to fetch customers');
  }

  return result;
}

async function syncProducts(
  parasutClient: ParasutClient,
  tenantId: string
): Promise<SyncResult['products']> {
  const result = {
    imported: 0,
    updated: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    // Fetch products from Parasut
    const products = await parasutClient.getProducts();

    for (const parasutProduct of products) {
      try {
        const existingProduct = await prisma.product.findFirst({
          where: {
            tenantId,
            externalId: parasutProduct.id,
          },
        });

        if (existingProduct) {
          // Update existing product
          await prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              name: parasutProduct.name,
              description: parasutProduct.description,
              price: parasutProduct.list_price,
              category: parasutProduct.category,
              sku: parasutProduct.code,
              metadata: {
                ...existingProduct.metadata,
                lastSyncedAt: new Date().toISOString(),
              },
            },
          });
          result.updated++;
        } else {
          // Create new product
          await prisma.product.create({
            data: {
              tenantId,
              externalId: parasutProduct.id,
              name: parasutProduct.name,
              description: parasutProduct.description,
              price: parasutProduct.list_price,
              category: parasutProduct.category,
              sku: parasutProduct.code,
              metadata: {
                source: 'PARASUT',
                lastSyncedAt: new Date().toISOString(),
              },
            },
          });
          result.imported++;
        }
      } catch (error) {
        result.failed++;
        result.errors.push(
          `Product ${parasutProduct.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  } catch (error) {
    result.failed++;
    result.errors.push(error instanceof Error ? error.message : 'Failed to fetch products');
  }

  return result;
}
