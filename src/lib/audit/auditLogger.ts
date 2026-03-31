import { prisma } from '@/shared/utils/prisma';

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
          oldData: entry.oldData || undefined,
          newData: entry.newData || undefined,
          metadata: entry.metadata || undefined,
          ipAddress: entry.ipAddress || null,
        },
      });
    } catch (error) {
      console.error('[AuditLog] Failed to persist audit log:', error);
    }
  }
}
