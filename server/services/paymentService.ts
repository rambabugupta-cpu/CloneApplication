import { db } from "../db";
import { 
  payments, 
  collections,
  notifications,
  auditLogs,
  type Payment, 
  type InsertPayment 
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { CollectionService } from "./collectionService";
import { NotificationService } from "./notificationService";
import { AuditService } from "./auditService";

export class PaymentService {
  private collectionService = new CollectionService();
  private notificationService = new NotificationService();
  private auditService = new AuditService();

  async recordPayment(data: InsertPayment & { recordedBy: string }): Promise<Payment> {
    // Start transaction
    const payment = await db.transaction(async (tx) => {
      // Create payment record with pending approval status
      const [newPayment] = await tx.insert(payments).values({
        ...data,
        status: "pending_approval",
        recordedBy: data.recordedBy,
      }).returning();

      // Get collection details
      const collection = await this.collectionService.getCollectionById(data.collectionId);
      if (!collection) {
        throw new Error("Collection not found");
      }

      // Create notification for admins/owners
      await this.notificationService.createPaymentApprovalNotification(
        newPayment.id,
        collection.id,
        data.amount
      );

      // Create audit log
      await this.auditService.logAction({
        userId: data.recordedBy,
        action: "payment_recorded",
        entityType: "payment",
        entityId: newPayment.id,
        newValue: newPayment,
      });

      return newPayment;
    });

    return payment;
  }

  async approvePayment(paymentId: string, approvedBy: string): Promise<Payment> {
    const payment = await this.getPaymentById(paymentId);
    if (!payment) {
      throw new Error("Payment not found");
    }

    if (payment.status !== "pending_approval") {
      throw new Error("Payment is not pending approval");
    }

    // Start transaction
    const approvedPayment = await db.transaction(async (tx) => {
      // Update payment status
      const [updated] = await tx.update(payments)
        .set({
          status: "approved",
          approvedBy,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payments.id, paymentId))
        .returning();

      // Update collection amounts
      await this.collectionService.updatePaymentStatus(payment.collectionId, payment.amount);

      // Create notification for staff who recorded the payment
      await this.notificationService.createNotification({
        userId: payment.recordedBy,
        type: "payment_received",
        title: "Payment Approved",
        message: `Payment of ₹${payment.amount / 100} has been approved`,
        paymentId: payment.id,
        collectionId: payment.collectionId,
      });

      // Create audit log
      await this.auditService.logAction({
        userId: approvedBy,
        action: "payment_approved",
        entityType: "payment",
        entityId: paymentId,
        oldValue: payment,
        newValue: updated,
      });

      return updated;
    });

    return approvedPayment;
  }

  async rejectPayment(paymentId: string, rejectedBy: string, reason: string): Promise<Payment> {
    const payment = await this.getPaymentById(paymentId);
    if (!payment) {
      throw new Error("Payment not found");
    }

    if (payment.status !== "pending_approval") {
      throw new Error("Payment is not pending approval");
    }

    const [rejected] = await db.update(payments)
      .set({
        status: "rejected",
        approvedBy: rejectedBy,
        approvedAt: new Date(),
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId))
      .returning();

    // Create notification for staff
    await this.notificationService.createNotification({
      userId: payment.recordedBy,
      type: "payment_received",
      title: "Payment Rejected",
      message: `Payment of ₹${payment.amount / 100} was rejected. Reason: ${reason}`,
      paymentId: payment.id,
      collectionId: payment.collectionId,
    });

    // Create audit log
    await this.auditService.logAction({
      userId: rejectedBy,
      action: "payment_rejected",
      entityType: "payment",
      entityId: paymentId,
      oldValue: payment,
      newValue: rejected,
    });

    return rejected;
  }

  async getPaymentById(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select()
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);
    
    return payment;
  }

  async getPaymentsByCollection(collectionId: string): Promise<Payment[]> {
    return await db.select()
      .from(payments)
      .where(eq(payments.collectionId, collectionId))
      .orderBy(desc(payments.paymentDate));
  }

  async getPendingApprovals(): Promise<Payment[]> {
    return await db.select()
      .from(payments)
      .where(eq(payments.status, "pending_approval"))
      .orderBy(desc(payments.createdAt));
  }

  async getPaymentsByStaff(staffId: string): Promise<Payment[]> {
    return await db.select()
      .from(payments)
      .where(eq(payments.recordedBy, staffId))
      .orderBy(desc(payments.createdAt));
  }

  async getPaymentStats(period?: { fromDate: Date; toDate: Date }): Promise<{
    totalCollected: number;
    approvedCount: number;
    pendingCount: number;
    rejectedCount: number;
  }> {
    let query = db.select({
      totalCollected: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'approved' THEN ${payments.amount} ELSE 0 END), 0)`,
      approvedCount: sql<number>`COUNT(*) FILTER (WHERE ${payments.status} = 'approved')`,
      pendingCount: sql<number>`COUNT(*) FILTER (WHERE ${payments.status} = 'pending_approval')`,
      rejectedCount: sql<number>`COUNT(*) FILTER (WHERE ${payments.status} = 'rejected')`,
    }).from(payments);

    if (period) {
      query = query.where(
        and(
          sql`${payments.paymentDate} >= ${period.fromDate.toISOString()}`,
          sql`${payments.paymentDate} <= ${period.toDate.toISOString()}`
        )
      );
    }

    const stats = await query;
    
    return stats[0] || {
      totalCollected: 0,
      approvedCount: 0,
      pendingCount: 0,
      rejectedCount: 0,
    };
  }

  async getAllPayments(): Promise<Payment[]> {
    return await db.select()
      .from(payments)
      .orderBy(desc(payments.createdAt));
  }
}