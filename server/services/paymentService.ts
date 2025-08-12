import { db } from "../db";
import { 
  payments, 
  collections,
  notifications,
  auditLogs,
  users,
  type Payment, 
  type InsertPayment 
} from "@shared/schema";
import { eq, and, desc, sql, alias } from "drizzle-orm";
import { CollectionService } from "./collectionService";
import { NotificationService } from "./notificationService";
import { AuditService } from "./auditService";

export class PaymentService {
  private collectionService = new CollectionService();
  private notificationService = new NotificationService();
  private auditService = new AuditService();

  // Optimized method to get payment statistics using database aggregation
  async getPaymentStatsOptimized() {
    const [stats] = await db.select({
      totalCollected: sql<number>`COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0)`,
      pendingCount: sql<number>`COUNT(CASE WHEN status = 'pending_approval' THEN 1 END)`,
      approvedCount: sql<number>`COUNT(CASE WHEN status = 'approved' THEN 1 END)`,
      rejectedCount: sql<number>`COUNT(CASE WHEN status = 'rejected' THEN 1 END)`,
    }).from(payments);
    
    return {
      totalCollected: Number(stats.totalCollected) || 0,
      pendingCount: Number(stats.pendingCount) || 0,
      approvedCount: Number(stats.approvedCount) || 0,
      rejectedCount: Number(stats.rejectedCount) || 0,
    };
  }

  async recordPayment(data: InsertPayment & { recordedBy: string; userRole?: string }): Promise<Payment> {
    try {
      // Check if payment should be auto-approved (admin/owner)
      const isAutoApproved = data.userRole === 'admin' || data.userRole === 'owner';
      
      // Get collection details first
      const [collection] = await db.select().from(collections).where(eq(collections.id, data.collectionId));
      if (!collection) {
        throw new Error("Collection not found");
      }
      
      // Create payment record
      const [newPayment] = await db.insert(payments).values({
        ...data,
        status: isAutoApproved ? "approved" : "pending_approval",
        recordedBy: data.recordedBy,
        approvedBy: isAutoApproved ? data.recordedBy : undefined,
        approvedAt: isAutoApproved ? new Date() : undefined,
      }).returning();

      // Only create approval notification if not auto-approved
      if (!isAutoApproved) {
        await db.insert(notifications).values({
          userId: data.recordedBy, // This will be sent to admins, but we track who triggered it
          type: "payment_received",
          title: "Payment Approval Required",
          message: `Payment of ₹${(data.amount / 100).toFixed(2)} requires approval`,
          collectionId: collection.id,
          paymentId: newPayment.id,
        });
      }

      // If auto-approved, update collection amounts immediately
      if (isAutoApproved) {
        await db.update(collections)
          .set({
            outstandingAmount: sql`${collections.outstandingAmount} - ${data.amount}`,
            paidAmount: sql`${collections.paidAmount} + ${data.amount}`,
            status: sql`
              CASE 
                WHEN ${collections.outstandingAmount} - ${data.amount} <= 0 THEN 'paid'
                WHEN ${collections.paidAmount} + ${data.amount} > 0 THEN 'partial'
                ELSE ${collections.status}
              END
            `,
            updatedAt: new Date(),
          })
          .where(eq(collections.id, data.collectionId));
      }

      // Create audit log
      await db.insert(auditLogs).values({
        userId: data.recordedBy,
        action: isAutoApproved ? "payment_recorded_approved" : "payment_recorded",
        entityType: "payment",
        entityId: newPayment.id,
        newValue: newPayment,
      });

      return newPayment;
    } catch (error) {
      console.error("Payment recording error:", error);
      throw error;
    }
  }

  async approvePayment(paymentId: string, approvedBy: string): Promise<Payment> {
    const payment = await this.getPaymentById(paymentId);
    if (!payment) {
      throw new Error("Payment not found");
    }

    if (payment.status !== "pending_approval") {
      throw new Error("Payment is not pending approval");
    }

    try {
      // Update payment status
      const [updated] = await db.update(payments)
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
    } catch (error) {
      console.error("Payment approval error:", error);
      throw error;
    }
  }

  async rejectPayment(paymentId: string, rejectedBy: string, reason: string = "Not specified"): Promise<Payment> {
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

  async getPendingPayments(): Promise<any[]> {
    const { customers } = await import("@shared/schema");
    
    const pendingPayments = await db.select({
      id: payments.id,
      amount: payments.amount,
      paymentMode: payments.paymentMode,
      paymentDate: payments.paymentDate,
      referenceNumber: payments.referenceNumber,
      status: payments.status,
      recordedBy: payments.recordedBy,
      collectionId: payments.collectionId,
      createdAt: payments.createdAt,
      collectionInvoice: collections.invoiceNumber,
      customerName: customers.primaryContactName,
      recordedByName: users.fullName,
    })
    .from(payments)
    .leftJoin(collections, eq(payments.collectionId, collections.id))
    .leftJoin(customers, eq(collections.customerId, customers.id))
    .leftJoin(users, eq(payments.recordedBy, users.id))
    .where(eq(payments.status, "pending_approval"))
    .orderBy(desc(payments.createdAt));

    return pendingPayments;
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
    const conditions = [];
    if (period) {
      conditions.push(
        sql`${payments.paymentDate} >= ${period.fromDate.toISOString()}`,
        sql`${payments.paymentDate} <= ${period.toDate.toISOString()}`
      );
    }

    const [stats] = await db.select({
      totalCollected: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'approved' THEN ${payments.amount} ELSE 0 END), 0)`,
      approvedCount: sql<number>`COUNT(*) FILTER (WHERE ${payments.status} = 'approved')`,
      pendingCount: sql<number>`COUNT(*) FILTER (WHERE ${payments.status} = 'pending_approval')`,
      rejectedCount: sql<number>`COUNT(*) FILTER (WHERE ${payments.status} = 'rejected')`,
    }).from(payments)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    return {
      totalCollected: Number(stats?.totalCollected) || 0,
      approvedCount: Number(stats?.approvedCount) || 0,
      pendingCount: Number(stats?.pendingCount) || 0,
      rejectedCount: Number(stats?.rejectedCount) || 0,
    };
  }

  async getAllPayments(limit: number = 100, offset: number = 0): Promise<any[]> {
    const { customers } = await import("@shared/schema");
    const recordedByUsers = alias(users, "recordedByUsers");
    const approvedByUsers = alias(users, "approvedByUsers");
    
    return await db.select({
      id: payments.id,
      amount: payments.amount,
      paymentMode: payments.paymentMode,
      paymentDate: payments.paymentDate,
      referenceNumber: payments.referenceNumber,
      status: payments.status,
      recordedBy: payments.recordedBy,
      approvedBy: payments.approvedBy,
      approvedAt: payments.approvedAt,
      rejectionReason: payments.rejectionReason,
      collectionId: payments.collectionId,
      createdAt: payments.createdAt,
      collectionInvoice: collections.invoiceNumber,
      customerName: customers.primaryContactName,
      recordedByName: recordedByUsers.fullName,
      approvedByName: approvedByUsers.fullName,
      rejectedByName: approvedByUsers.fullName, // Same as approvedBy for rejected payments
    })
    .from(payments)
    .leftJoin(collections, eq(payments.collectionId, collections.id))
    .leftJoin(customers, eq(collections.customerId, customers.id))
    .leftJoin(recordedByUsers, eq(payments.recordedBy, recordedByUsers.id))
    .leftJoin(approvedByUsers, eq(payments.approvedBy, approvedByUsers.id))
    .orderBy(desc(payments.createdAt))
    .limit(limit)
    .offset(offset);
  }

  async getPaymentById(id: string): Promise<Payment | null> {
    const [payment] = await db.select()
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);
    return payment || null;
  }
}

// Export the service instance for use in routes
export const paymentService = new PaymentService();