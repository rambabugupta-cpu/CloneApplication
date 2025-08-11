import { db } from "../db";
import { 
  collections, 
  customers, 
  payments,
  type Collection, 
  type InsertCollection 
} from "@shared/schema";
import { eq, and, or, gte, lte, desc, asc, sql, inArray } from "drizzle-orm";

export class CollectionService {
  async createCollection(data: InsertCollection): Promise<Collection> {
    const [collection] = await db.insert(collections).values({
      ...data,
      status: this.calculateStatus(data.outstandingAmount, data.originalAmount),
      agingDays: this.calculateAgingDays(data.dueDate),
    }).returning();

    return collection;
  }

  async updateCollection(id: string, data: Partial<InsertCollection>): Promise<Collection> {
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    // Recalculate status if amounts changed
    if (data.outstandingAmount !== undefined || data.paidAmount !== undefined) {
      const existing = await this.getCollectionById(id);
      if (existing) {
        const outstanding = data.outstandingAmount ?? existing.outstandingAmount;
        const original = data.originalAmount ?? existing.originalAmount;
        updateData.status = this.calculateStatus(outstanding, original);
      }
    }

    const [updated] = await db.update(collections)
      .set(updateData)
      .where(eq(collections.id, id))
      .returning();

    if (!updated) {
      throw new Error("Collection not found");
    }

    return updated;
  }

  async getCollectionById(id: string): Promise<Collection | undefined> {
    const [collection] = await db.select()
      .from(collections)
      .where(eq(collections.id, id))
      .limit(1);
    
    return collection;
  }

  async getCollectionsByCustomer(customerId: string): Promise<Collection[]> {
    return await db.select()
      .from(collections)
      .where(eq(collections.customerId, customerId))
      .orderBy(desc(collections.dueDate));
  }

  async getCollectionsByStatus(status: string): Promise<Collection[]> {
    return await db.select()
      .from(collections)
      .where(eq(collections.status, status as any))
      .orderBy(desc(collections.dueDate));
  }

  async getOverdueCollections(): Promise<Collection[]> {
    const today = new Date();
    
    return await db.select()
      .from(collections)
      .where(
        and(
          eq(collections.status, "overdue" as any),
          lte(collections.dueDate, today.toISOString() as any)
        )
      )
      .orderBy(asc(collections.dueDate));
  }

  async getCollectionsForStaff(staffId: string): Promise<Collection[]> {
    return await db.select()
      .from(collections)
      .where(eq(collections.assignedTo, staffId))
      .orderBy(desc(collections.dueDate));
  }

  async searchCollections(filters: {
    status?: string;
    assignedTo?: string;
    customerId?: string;
    fromDate?: Date;
    toDate?: Date;
    minAmount?: number;
    maxAmount?: number;
  }): Promise<any[]> {
    const conditions = [];

    if (filters.status) {
      conditions.push(eq(collections.status, filters.status as any));
    }
    if (filters.assignedTo) {
      conditions.push(eq(collections.assignedTo, filters.assignedTo));
    }
    if (filters.customerId) {
      conditions.push(eq(collections.customerId, filters.customerId));
    }
    if (filters.fromDate) {
      conditions.push(gte(collections.dueDate, filters.fromDate.toISOString() as any));
    }
    if (filters.toDate) {
      conditions.push(lte(collections.dueDate, filters.toDate.toISOString() as any));
    }
    if (filters.minAmount) {
      conditions.push(gte(collections.outstandingAmount, filters.minAmount));
    }
    if (filters.maxAmount) {
      conditions.push(lte(collections.outstandingAmount, filters.maxAmount));
    }

    let query = db.select({
      id: collections.id,
      customerId: collections.customerId,
      invoiceNumber: collections.invoiceNumber,
      invoiceDate: collections.invoiceDate,
      dueDate: collections.dueDate,
      originalAmount: collections.originalAmount,
      outstandingAmount: collections.outstandingAmount,
      paidAmount: collections.paidAmount,
      status: collections.status,
      agingDays: collections.agingDays,
      promisedAmount: collections.promisedAmount,
      promisedDate: collections.promisedDate,
      lastFollowupDate: collections.lastFollowupDate,
      nextFollowupDate: collections.nextFollowupDate,
      assignedTo: collections.assignedTo,
      escalationLevel: collections.escalationLevel,
      disputeRaisedAt: collections.disputeRaisedAt,
      disputeReason: collections.disputeReason,
      notes: collections.notes,
      createdAt: collections.createdAt,
      updatedAt: collections.updatedAt,
      // Customer details
      customerName: customers.primaryContactName,
      customerCompany: customers.companyName,
      customerPhone: customers.primaryPhone,
      customerEmail: customers.primaryEmail,
      customerCode: customers.customerCode,
    })
    .from(collections)
    .leftJoin(customers, eq(collections.customerId, customers.id));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(collections.dueDate));
  }

  async updatePaymentStatus(collectionId: string, paidAmount: number): Promise<void> {
    const collection = await this.getCollectionById(collectionId);
    if (!collection) {
      throw new Error("Collection not found");
    }

    const newPaidAmount = collection.paidAmount + paidAmount;
    const newOutstandingAmount = collection.originalAmount - newPaidAmount;

    await this.updateCollection(collectionId, {
      paidAmount: newPaidAmount,
      outstandingAmount: newOutstandingAmount,
    });
  }

  async assignToStaff(collectionId: string, staffId: string): Promise<void> {
    await db.update(collections)
      .set({
        assignedTo: staffId,
        updatedAt: new Date(),
      })
      .where(eq(collections.id, collectionId));
  }

  async updatePromise(collectionId: string, promisedAmount: number, promisedDate: Date): Promise<void> {
    await db.update(collections)
      .set({
        promisedAmount,
        promisedDate: promisedDate.toISOString() as any,
        updatedAt: new Date(),
      })
      .where(eq(collections.id, collectionId));
  }

  async escalateCollection(collectionId: string): Promise<void> {
    const collection = await this.getCollectionById(collectionId);
    if (!collection) {
      throw new Error("Collection not found");
    }

    await db.update(collections)
      .set({
        escalationLevel: (collection.escalationLevel || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(collections.id, collectionId));
  }

  async raiseDispute(collectionId: string, reason: string, userId: string): Promise<void> {
    await db.update(collections)
      .set({
        disputeRaisedAt: new Date(),
        disputeReason: reason,
        status: "overdue" as const,
        updatedAt: new Date(),
      })
      .where(eq(collections.id, collectionId));
  }

  async getDashboardStats(): Promise<{
    totalOutstanding: number;
    totalCollected: number;
    overdueCount: number;
    totalCount: number;
    collectionRate: number;
  }> {
    const stats = await db.select({
      totalOutstanding: sql<number>`COALESCE(SUM(${collections.outstandingAmount}), 0)`,
      totalCollected: sql<number>`COALESCE(SUM(${collections.paidAmount}), 0)`,
      overdueCount: sql<number>`COUNT(*) FILTER (WHERE ${collections.status} = 'overdue')`,
      totalCount: sql<number>`COUNT(*)`,
    }).from(collections);

    const result = stats[0] || {
      totalOutstanding: 0,
      totalCollected: 0,
      overdueCount: 0,
      totalCount: 0,
    };

    const total = result.totalOutstanding + result.totalCollected;
    const collectionRate = total > 0 ? (result.totalCollected / total) * 100 : 0;

    return {
      ...result,
      collectionRate,
    };
  }

  private calculateStatus(outstanding: number, original: number): "pending" | "partial" | "paid" | "overdue" {
    if (outstanding === 0) return "paid";
    if (outstanding < original) return "partial";
    
    const today = new Date();
    // This will be updated by a scheduled job based on due date
    return "pending";
  }

  private calculateAgingDays(dueDate: string | Date): number {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  async batchUpdateStatus(): Promise<void> {
    const today = new Date();
    
    // Update overdue collections
    await db.update(collections)
      .set({
        status: "overdue" as any,
        updatedAt: new Date(),
      })
      .where(
        and(
          lte(collections.dueDate, today.toISOString() as any),
          inArray(collections.status, ["pending", "partial"] as any),
        )
      );

    // Update aging days for all collections
    const allCollections = await db.select().from(collections);
    
    for (const collection of allCollections) {
      const agingDays = this.calculateAgingDays(collection.dueDate);
      if (agingDays !== collection.agingDays) {
        await db.update(collections)
          .set({ agingDays })
          .where(eq(collections.id, collection.id));
      }
    }
  }
}