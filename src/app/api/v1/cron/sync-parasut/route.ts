import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/utils/prisma';
import { ParasutClient } from '@/infrastructure/services/parasut/ParasutClient';
import { Logger } from '@/infrastructure/logger';
import { verifyCronRequest } from '@/shared/utils/cronAuth';

const logger = new Logger('CronSyncParasutAPI');

export async function GET(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Array<{ tenantId: string; status: string; synced?: number; errors?: number }> = [];

  try {
    // Find all tenants with Parasut sync enabled
    const tenants = await prisma.tenant.findMany({
      where: {
        parasutSyncEnabled: true,
        isActive: true,
        parasutClientId: { not: null },
        parasutClientSecret: { not: null },
        deletedAt: null,
      },
      select: {
        id: true,
        parasutCompanyId: true,
        parasutClientId: true,
        parasutClientSecret: true,
        parasutUsername: true,
        parasutPassword: true,
        parasutAccessToken: true,
        parasutRefreshToken: true,
      },
    });

    for (const tenant of tenants) {
      try {
        const client = await ParasutClient.forTenant(tenant.id);

        const contactSync = await client.syncAllContacts();
        const productSync = await client.syncAllProducts();
        const bankSync = await client.syncBankAccounts();

        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { parasutLastSyncAt: new Date() },
        });

        results.push({
          tenantId: tenant.id,
          status: 'success',
          synced: contactSync.synced + productSync.synced + bankSync.synced,
          errors: contactSync.errors + productSync.errors,
        });
      } catch (error) {
        results.push({
          tenantId: tenant.id,
          status: 'failed',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Parasut sync completed for ${tenants.length} tenants`,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Cron sync-parasut error', error);
    return NextResponse.json(
      { success: false, error: 'Sync failed' },
      { status: 500 }
    );
  }
}
