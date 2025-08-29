import { db } from "../db";
import { auditLogs, type AuditLog, type InsertAuditLog } from "../../shared/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";

export class AuditService {
  async logAction(data: {
    userId: string;
    action: string;
    entityType?: string;
    entityId?: string;
    oldValue?: any;
    newValue?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values({
      userId: data.userId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      oldValue: data.oldValue,
      newValue: data.newValue,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    }).returning();

    return log;
  }

  async getUserAuditLogs(userId: string, limit = 100): Promise<AuditLog[]> {
    return await db.select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  async getEntityAuditLogs(entityType: string, entityId: string): Promise<AuditLog[]> {
    return await db.select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.entityType, entityType),
          eq(auditLogs.entityId, entityId)
        )
      )
      .orderBy(desc(auditLogs.createdAt));
  }

  async getAuditLogsByAction(action: string, limit = 100): Promise<AuditLog[]> {
    return await db.select()
      .from(auditLogs)
      .where(eq(auditLogs.action, action))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  async getAuditLogsByDateRange(fromDate: Date, toDate: Date): Promise<AuditLog[]> {
    return await db.select()
      .from(auditLogs)
      .where(
        and(
          gte(auditLogs.createdAt, fromDate),
          lte(auditLogs.createdAt, toDate)
        )
      )
      .orderBy(desc(auditLogs.createdAt));
  }

  async searchAuditLogs(filters: {
    userId?: string;
    action?: string;
    entityType?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<AuditLog[]> {
    const conditions = [];

    if (filters.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }
    if (filters.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }
    if (filters.entityType) {
      conditions.push(eq(auditLogs.entityType, filters.entityType));
    }
    if (filters.fromDate) {
      conditions.push(gte(auditLogs.createdAt, filters.fromDate));
    }
    if (filters.toDate) {
      conditions.push(lte(auditLogs.createdAt, filters.toDate));
    }

    let query = db.select().from(auditLogs);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(auditLogs.createdAt)).limit(500);
  }

  // Log specific actions
  async logLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logAction({
      userId,
      action: "user_login",
      ipAddress,
      userAgent,
    });
  }

  async logLogout(userId: string): Promise<void> {
    await this.logAction({
      userId,
      action: "user_logout",
    });
  }

  async logPasswordChange(userId: string): Promise<void> {
    await this.logAction({
      userId,
      action: "password_changed",
      entityType: "user",
      entityId: userId,
    });
  }

  async logDataExport(userId: string, exportType: string): Promise<void> {
    await this.logAction({
      userId,
      action: "data_export",
      entityType: "export",
      newValue: { type: exportType },
    });
  }
}