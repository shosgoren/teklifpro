import { prisma } from '@/shared/utils/prisma';
import type { Prisma } from '@prisma/client';
import { Logger } from '@/infrastructure/logger';

const logger = new Logger('AuditLogger');

interface AuditLogEntry {
  userId: string;
  tenantId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export class AuditLogger {
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: entry.userId,
          tenantId: entry.tenantId || '',
          action: entry.action,
          entity: entry.resourceType,
          entityId: entry.resourceId,
          oldData: (entry.oldData as Prisma.InputJsonValue) || undefined,
          newData: (entry.newData as Prisma.InputJsonValue) || undefined,
          metadata: (entry.metadata as Prisma.InputJsonValue) || undefined,
          ipAddress: entry.ipAddress || null,
        },
      });
    } catch (error) {
      logger.error('[AuditLog] Failed to persist audit log:', error);
    }
  }
}
