import { db } from "../db";
import { customers } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export class CustomerService {
  async getAllCustomers(limit: number = 100, offset: number = 0) {
    try {
      const result = await db.select()
        .from(customers)
        .limit(limit)
        .offset(offset)
        .orderBy(customers.primaryContactName);
      return result;
    } catch (error) {
      console.error("Error fetching customers:", error);
      return [];
    }
  }

  async getCustomerById(id: string) {
    try {
      const [customer] = await db.select().from(customers).where(eq(customers.id, id));
      return customer;
    } catch (error) {
      console.error("Error fetching customer:", error);
      return null;
    }
  }

  async createCustomer(data: any) {
    try {
      const [newCustomer] = await db.insert(customers).values({
        customerCode: data.customerCode || data.code || `CUST${Date.now()}`,
        primaryContactName: data.primaryContactName || data.name,
        primaryPhone: data.primaryPhone || data.phoneNumber || '',
        primaryEmail: data.primaryEmail || data.email,
        companyName: data.companyName,
        gstNumber: data.gstNumber,
        addressLine1: data.addressLine1 || data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        creditLimit: data.creditLimit || 0,
        creditDays: data.creditDays || 30,
      }).returning();
      return newCustomer;
    } catch (error) {
      console.error("Error creating customer:", error);
      throw error;
    }
  }

  async getCustomerByName(name: string) {
    try {
      if (!name) return null;
      // Use database query with case-insensitive search
      const [customer] = await db.select()
        .from(customers)
        .where(sql`LOWER(${customers.primaryContactName}) = LOWER(${name})`)
        .limit(1);
      return customer || null;
    } catch (error) {
      console.error("Error fetching customer by name:", error);
      return null;
    }
  }

  async createOrUpdateFromImport(data: any) {
    try {
      // Check if customer exists by customerCode
      const existingCustomer = await db.select().from(customers)
        .where(eq(customers.customerCode, data.customerCode));
      
      if (existingCustomer.length > 0) {
        // Update existing customer
        const [updated] = await db.update(customers)
          .set({
            primaryContactName: data.primaryContactName,
            primaryPhone: data.primaryPhone,
            companyName: data.companyName,
            updatedAt: new Date(),
          })
          .where(eq(customers.id, existingCustomer[0].id))
          .returning();
        return updated;
      } else {
        // Create new customer
        return await this.createCustomer(data);
      }
    } catch (error) {
      console.error("Error creating/updating customer from import:", error);
      throw error;
    }
  }
}

export const customerService = new CustomerService();