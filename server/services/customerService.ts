import { db } from "../db";
import { customers } from "@shared/schema";
import { eq } from "drizzle-orm";

export class CustomerService {
  async getAllCustomers() {
    try {
      const result = await db.select().from(customers);
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
        id: crypto.randomUUID(),
        name: data.name,
        code: data.code || `CUST${Date.now()}`,
        phoneNumber: data.phoneNumber || '',
        email: data.email || '',
        gstNumber: data.gstNumber || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        pincode: data.pincode || '',
        creditLimit: data.creditLimit || 0,
        creditDays: data.creditDays || 30,
        totalOutstanding: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
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
      const allCustomers = await db.select().from(customers);
      return allCustomers.find(c => c.name?.toLowerCase() === name.toLowerCase()) || null;
    } catch (error) {
      console.error("Error fetching customer by name:", error);
      return null;
    }
  }
}

export const customerService = new CustomerService();