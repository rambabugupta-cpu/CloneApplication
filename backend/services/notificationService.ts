import { db } from "../db";
import { 
  notifications,
  users,
  type Notification, 
  type InsertNotification 
} from "../../shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export class NotificationService {
  async createNotification(data: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(data).returning();
    return notification;
  }

  async createPaymentApprovalNotification(
    paymentId: string,
    collectionId: string,
    amount: number
  ): Promise<void> {
    // Get all admin and owner users
    const admins = await db.select()
      .from(users)
      .where(
        and(
          eq(users.status, "active"),
          eq(users.role, "owner")
        )
      );

    const adminUsers = await db.select()
      .from(users)
      .where(
        and(
          eq(users.status, "active"),
          eq(users.role, "admin")
        )
      );

    const allApprovers = [...admins, ...adminUsers];

    // Create notification for each approver
    for (const approver of allApprovers) {
      await this.createNotification({
        userId: approver.id,
        type: "payment_received",
        title: "Payment Approval Required",
        message: `A payment of ₹${amount / 100} requires your approval`,
        paymentId,
        collectionId,
      });
    }
  }

  async createOverdueNotification(
    userId: string,
    collectionId: string,
    customerName: string,
    amount: number
  ): Promise<void> {
    await this.createNotification({
      userId,
      type: "overdue_alert",
      title: "Collection Overdue",
      message: `Collection of ₹${amount / 100} from ${customerName} is overdue`,
      collectionId,
    });
  }

  async createReminderNotification(
    userId: string,
    collectionId: string,
    customerName: string,
    daysUntilDue: number
  ): Promise<void> {
    await this.createNotification({
      userId,
      type: "payment_reminder",
      title: "Payment Due Soon",
      message: `Payment from ${customerName} is due in ${daysUntilDue} days`,
      collectionId,
    });
  }

  async markAsRead(notificationId: string): Promise<void> {
    await db.update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(eq(notifications.id, notificationId));
  }

  async markAllAsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );
  }

  async getUserNotifications(userId: string, unreadOnly = false): Promise<Notification[]> {
    let query = db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId));

    if (unreadOnly) {
      query = query.where(eq(notifications.isRead, false));
    }

    return await query.orderBy(desc(notifications.createdAt)).limit(50);
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await db.select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );

    return result.length;
  }

  async deleteOldNotifications(daysOld = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    await db.delete(notifications)
      .where(
        and(
          eq(notifications.isRead, true),
          sql`${notifications.createdAt} < ${cutoffDate.toISOString()}`
        )
      );
  }
}