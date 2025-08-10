import { db } from "../db";
import { customers, users, collections, type Customer, type InsertCustomer } from "@shared/schema";
import { eq, and, or, like, desc, sql } from "drizzle-orm";

export class CustomerService {
  async createCustomer(data: InsertCustomer): Promise<Customer> {
    // Check if customer code already exists
    const existing = await this.getByCustomerCode(data.customerCode);
    if (existing) {
      throw new Error(`Customer with code ${data.customerCode} already exists`);
    }

    const [customer] = await db.insert(customers).values({
      ...data,
      isActive: true,
    }).returning();

    return customer;
  }

  async updateCustomer(id: string, data: Partial<InsertCustomer>): Promise<Customer> {
    const [updated] = await db.update(customers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id))
      .returning();

    if (!updated) {
      throw new Error("Customer not found");
    }

    return updated;
  }

  async getCustomerById(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);
    
    return customer;
  }

  async getByCustomerCode(code: string): Promise<Customer | undefined> {
    const [customer] = await db.select()
      .from(customers)
      .where(eq(customers.customerCode, code))
      .limit(1);
    
    return customer;
  }

  async getByPhone(phone: string): Promise<Customer | undefined> {
    const [customer] = await db.select()
      .from(customers)
      .where(
        or(
          eq(customers.primaryPhone, phone),
          eq(customers.secondaryPhone, phone)
        )
      )
      .limit(1);
    
    return customer;
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    const searchPattern = `%${query}%`;
    
    return await db.select()
      .from(customers)
      .where(
        or(
          like(customers.customerCode, searchPattern),
          like(customers.companyName, searchPattern),
          like(customers.primaryContactName, searchPattern),
          like(customers.primaryPhone, searchPattern),
          like(customers.primaryEmail, searchPattern)
        )
      )
      .orderBy(desc(customers.createdAt))
      .limit(50);
  }

  async getCustomersForStaff(staffId: string): Promise<Customer[]> {
    return await db.select()
      .from(customers)
      .where(eq(customers.assignedTo, staffId))
      .orderBy(desc(customers.createdAt));
  }

  async getAllCustomers(filters?: {
    isActive?: boolean;
    assignedTo?: string;
  }): Promise<Customer[]> {
    let query = db.select().from(customers);
    
    const conditions = [];
    if (filters?.isActive !== undefined) {
      conditions.push(eq(customers.isActive, filters.isActive));
    }
    if (filters?.assignedTo) {
      conditions.push(eq(customers.assignedTo, filters.assignedTo));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(customers.createdAt));
  }

  async assignToStaff(customerId: string, staffId: string): Promise<void> {
    await db.update(customers)
      .set({
        assignedTo: staffId,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId));
  }

  async getCustomerStats(customerId: string): Promise<{
    totalOutstanding: number;
    totalPaid: number;
    totalInvoices: number;
    overdueInvoices: number;
  }> {
    const stats = await db.select({
      totalOutstanding: sql<number>`COALESCE(SUM(${collections.outstandingAmount}), 0)`,
      totalPaid: sql<number>`COALESCE(SUM(${collections.paidAmount}), 0)`,
      totalInvoices: sql<number>`COUNT(*)`,
      overdueInvoices: sql<number>`COUNT(*) FILTER (WHERE ${collections.status} = 'overdue')`,
    })
    .from(collections)
    .where(eq(collections.customerId, customerId));

    return stats[0] || {
      totalOutstanding: 0,
      totalPaid: 0,
      totalInvoices: 0,
      overdueInvoices: 0,
    };
  }

  async createOrUpdateFromImport(data: {
    customerCode: string;
    primaryContactName: string;
    primaryPhone?: string;
    companyName?: string;
  }): Promise<Customer> {
    // Try to find existing customer
    const existing = await this.getByCustomerCode(data.customerCode);
    
    if (existing) {
      // Update existing customer
      return await this.updateCustomer(existing.id, {
        primaryContactName: data.primaryContactName,
        primaryPhone: data.primaryPhone || existing.primaryPhone,
        companyName: data.companyName || existing.companyName,
      });
    } else {
      // Create new customer
      return await this.createCustomer({
        customerCode: data.customerCode,
        primaryContactName: data.primaryContactName,
        primaryPhone: data.primaryPhone || "",
        companyName: data.companyName,
      });
    }
  }
}