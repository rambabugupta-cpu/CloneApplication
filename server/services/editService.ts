import { db } from "../db";
import { 
  paymentEdits, 
  communicationEdits,
  payments,
  communications
} from "@shared/schema";
import { eq, and, lte } from "drizzle-orm";

type PaymentEdit = typeof paymentEdits.$inferSelect;
type CommunicationEdit = typeof communicationEdits.$inferSelect;

export class EditService {
  // Create payment edit request
  async createPaymentEdit(paymentId: string, editData: any, userId: string): Promise<PaymentEdit> {
    // Get original payment data
    const [originalPayment] = await db.select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);
    
    if (!originalPayment) {
      throw new Error("Payment not found");
    }

    // Calculate auto-approval time (30 minutes from now)
    const autoApprovalAt = new Date();
    autoApprovalAt.setMinutes(autoApprovalAt.getMinutes() + 30);

    const [edit] = await db.insert(paymentEdits).values({
      paymentId,
      originalAmount: originalPayment.amount,
      originalPaymentDate: originalPayment.paymentDate,
      originalPaymentMode: originalPayment.paymentMode,
      originalReferenceNumber: originalPayment.referenceNumber,
      newAmount: editData.amount,
      newPaymentDate: editData.paymentDate,
      newPaymentMode: editData.paymentMode,
      newReferenceNumber: editData.referenceNumber,
      editReason: editData.editReason,
      editedBy: userId,
      autoApprovalAt,
      status: "pending"
    }).returning();

    return edit;
  }

  // Create communication edit request
  async createCommunicationEdit(communicationId: string, editData: any, userId: string): Promise<CommunicationEdit> {
    // Get original communication data
    const [originalComm] = await db.select()
      .from(communications)
      .where(eq(communications.id, communicationId))
      .limit(1);
    
    if (!originalComm) {
      throw new Error("Communication not found");
    }

    // Calculate auto-approval time (30 minutes from now)
    const autoApprovalAt = new Date();
    autoApprovalAt.setMinutes(autoApprovalAt.getMinutes() + 30);

    const [edit] = await db.insert(communicationEdits).values({
      communicationId,
      originalContent: originalComm.content,
      originalOutcome: originalComm.outcome,
      originalPromisedAmount: originalComm.promisedAmount,
      originalPromisedDate: originalComm.promisedDate,
      originalNextActionRequired: originalComm.nextActionRequired,
      originalNextActionDate: originalComm.nextActionDate,
      newContent: editData.content,
      newOutcome: editData.outcome,
      newPromisedAmount: editData.promisedAmount,
      newPromisedDate: editData.promisedDate,
      newNextActionRequired: editData.nextActionRequired,
      newNextActionDate: editData.nextActionDate,
      editReason: editData.editReason,
      editedBy: userId,
      autoApprovalAt,
      status: "pending"
    }).returning();

    return edit;
  }

  // Approve payment edit
  async approvePaymentEdit(editId: string, approverId: string): Promise<void> {
    const [edit] = await db.select()
      .from(paymentEdits)
      .where(eq(paymentEdits.id, editId))
      .limit(1);
    
    if (!edit || edit.status !== "pending") {
      throw new Error("Edit request not found or already processed");
    }

    // Update the payment with new values
    await db.update(payments)
      .set({
        amount: edit.newAmount,
        paymentDate: edit.newPaymentDate,
        paymentMode: edit.newPaymentMode,
        referenceNumber: edit.newReferenceNumber,
        updatedAt: new Date()
      })
      .where(eq(payments.id, edit.paymentId));

    // Mark edit as approved
    await db.update(paymentEdits)
      .set({
        status: "approved",
        approvedBy: approverId,
        approvedAt: new Date()
      })
      .where(eq(paymentEdits.id, editId));
  }

  // Approve communication edit
  async approveCommunicationEdit(editId: string, approverId: string): Promise<void> {
    const [edit] = await db.select()
      .from(communicationEdits)
      .where(eq(communicationEdits.id, editId))
      .limit(1);
    
    if (!edit || edit.status !== "pending") {
      throw new Error("Edit request not found or already processed");
    }

    // Update the communication with new values
    await db.update(communications)
      .set({
        content: edit.newContent,
        outcome: edit.newOutcome,
        promisedAmount: edit.newPromisedAmount,
        promisedDate: edit.newPromisedDate,
        nextActionRequired: edit.newNextActionRequired,
        nextActionDate: edit.newNextActionDate
      })
      .where(eq(communications.id, edit.communicationId));

    // Mark edit as approved
    await db.update(communicationEdits)
      .set({
        status: "approved",
        approvedBy: approverId,
        approvedAt: new Date()
      })
      .where(eq(communicationEdits.id, editId));
  }

  // Reject edit request
  async rejectPaymentEdit(editId: string, approverId: string, reason: string): Promise<void> {
    await db.update(paymentEdits)
      .set({
        status: "rejected",
        approvedBy: approverId,
        approvedAt: new Date(),
        rejectionReason: reason
      })
      .where(eq(paymentEdits.id, editId));
  }

  async rejectCommunicationEdit(editId: string, approverId: string, reason: string): Promise<void> {
    await db.update(communicationEdits)
      .set({
        status: "rejected",
        approvedBy: approverId,
        approvedAt: new Date(),
        rejectionReason: reason
      })
      .where(eq(communicationEdits.id, editId));
  }

  // Process auto-approvals (should be called periodically)
  async processAutoApprovals(): Promise<void> {
    const now = new Date();

    // Auto-approve pending payment edits
    const pendingPaymentEdits = await db.select()
      .from(paymentEdits)
      .where(
        and(
          eq(paymentEdits.status, "pending"),
          lte(paymentEdits.autoApprovalAt, now)
        )
      );

    for (const edit of pendingPaymentEdits) {
      // Update the payment with new values
      await db.update(payments)
        .set({
          amount: edit.newAmount,
          paymentDate: edit.newPaymentDate,
          paymentMode: edit.newPaymentMode,
          referenceNumber: edit.newReferenceNumber,
          updatedAt: new Date()
        })
        .where(eq(payments.id, edit.paymentId));

      // Mark edit as auto-approved
      await db.update(paymentEdits)
        .set({
          status: "auto_approved",
          approvedAt: new Date()
        })
        .where(eq(paymentEdits.id, edit.id));
    }

    // Auto-approve pending communication edits
    const pendingCommEdits = await db.select()
      .from(communicationEdits)
      .where(
        and(
          eq(communicationEdits.status, "pending"),
          lte(communicationEdits.autoApprovalAt, now)
        )
      );

    for (const edit of pendingCommEdits) {
      // Update the communication with new values
      await db.update(communications)
        .set({
          content: edit.newContent,
          outcome: edit.newOutcome,
          promisedAmount: edit.newPromisedAmount,
          promisedDate: edit.newPromisedDate,
          nextActionRequired: edit.newNextActionRequired,
          nextActionDate: edit.newNextActionDate
        })
        .where(eq(communications.id, edit.communicationId));

      // Mark edit as auto-approved
      await db.update(communicationEdits)
        .set({
          status: "auto_approved",
          approvedAt: new Date()
        })
        .where(eq(communicationEdits.id, edit.id));
    }
  }

  // Get pending edits for approval
  async getPendingPaymentEdits(): Promise<any[]> {
    return await db.select()
      .from(paymentEdits)
      .where(eq(paymentEdits.status, "pending"))
      .orderBy(paymentEdits.createdAt);
  }

  async getPendingCommunicationEdits(): Promise<any[]> {
    return await db.select()
      .from(communicationEdits)
      .where(eq(communicationEdits.status, "pending"))
      .orderBy(communicationEdits.createdAt);
  }

  // Get edit history
  async getPaymentEditHistory(paymentId: string): Promise<any[]> {
    return await db.select()
      .from(paymentEdits)
      .where(eq(paymentEdits.paymentId, paymentId))
      .orderBy(paymentEdits.createdAt);
  }

  async getCommunicationEditHistory(communicationId: string): Promise<any[]> {
    return await db.select()
      .from(communicationEdits)
      .where(eq(communicationEdits.communicationId, communicationId))
      .orderBy(communicationEdits.createdAt);
  }
}

export const editService = new EditService();