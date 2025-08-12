// Legacy storage interface - being phased out
// All new code should use the service layer in server/services/

import { AuthService } from "./services/authService";
import { CustomerService } from "./services/customerService";
import { CollectionService } from "./services/collectionService";
import { PaymentService } from "./services/paymentService";
import { NotificationService } from "./services/notificationService";
import { AuditService } from "./services/auditService";
import { ExcelImportService } from "./services/excelImportService";
import { communicationService } from "./services/communicationService";
import { EditService } from "./services/editService";
import { users, type User, type UpsertUser } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Export service instances for backward compatibility
export const authService = new AuthService();
export const customerService = new CustomerService();
export const collectionService = new CollectionService();
export const paymentService = new PaymentService();
export const notificationService = new NotificationService();
export const auditService = new AuditService();
export const excelImportService = new ExcelImportService();
export const editService = new EditService();

// Interface for storage operations
export interface IStorage {
  // User operations for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  // Legacy operations
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
}

// Legacy storage interface - minimal implementation for compatibility
export class DatabaseStorage implements IStorage {
  // Replit Auth required methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Legacy methods
  async getUserById(id: string) {
    return await this.getUser(id);
  }

  async getUserByEmail(email: string) {
    return await authService.getUserByEmail(email);
  }

  async validateUser(email: string, password: string) {
    try {
      const user = await authService.login(email, password);
      return user;
    } catch {
      return undefined;
    }
  }

  async createUser(data: any) {
    return await authService.register({
      email: data.email,
      password: data.passwordHash,
      fullName: data.name || data.fullName,
      phoneNumber: data.phoneNumber,
      role: data.role,
    });
  }

  async getUsers() {
    return await authService.getAllUsers();
  }

  async getUserRole(userId: string) {
    const user = await authService.getUserById(userId);
    return user ? { role: user.role } : null;
  }

  async getPaymentStats() {
    // Use paymentService.getAllPayments() instead of getPayments()
    const payments = await paymentService.getAllPayments();
    const pending = payments.filter((p: any) => p.status === 'pending');
    const approved = payments.filter((p: any) => p.status === 'approved');
    return {
      totalCollected: approved.reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
      pendingCount: pending.length,
      approvedCount: approved.length
    };
  }

  async getAllCustomers() {
    return await customerService.getAllCustomers();
  }

  async getDashboardStats() {
    return await collectionService.getDashboardStats();
  }

  async getCollections() {
    return await collectionService.searchCollections({});
  }

  async getCollection(id: number) {
    // Convert number to string for new UUID-based system
    return await collectionService.getCollectionById(String(id));
  }

  async createCollection(data: any) {
    return await collectionService.createCollection(data);
  }

  async updateCollection(id: number, data: any) {
    return await collectionService.updateCollection(String(id), data);
  }

  async getPaymentsByCollection(collectionId: string) {
    return await paymentService.getPaymentsByCollection(collectionId);
  }

  async createPayment(data: any) {
    return await paymentService.recordPayment(data);
  }

  async getCommunicationsByCollection(collectionId: string) {
    return await communicationService.getCommunicationsByCollection(collectionId);
  }

  async createCommunication(data: any) {
    return await communicationService.createCommunication(data);
  }

  async raiseDispute(collectionId: string, reason: string, userId: string) {
    return await collectionService.raiseDispute(collectionId, reason, userId);
  }

  async getPendingPayments() {
    return await paymentService.getPendingPayments();
  }

  async approvePayment(paymentId: string, approvedBy: string) {
    return await paymentService.approvePayment(paymentId, approvedBy);
  }

  async rejectPayment(paymentId: string, rejectedBy: string) {
    return await paymentService.rejectPayment(paymentId, rejectedBy);
  }

  async getAllPayments() {
    return await paymentService.getAllPayments();
  }

  async getAllEditRequests() {
    return await editService.getAllEditRequests();
  }

  // Customer operations for Excel import
  async getCustomerByName(name: string) {
    if (!name) return null;
    const customers = await customerService.getAllCustomers();
    return customers.find((c: any) => c.primaryContactName && c.primaryContactName.toLowerCase() === name.toLowerCase()) || null;
  }

  async createCustomer(data: any) {
    return await customerService.createCustomer(data);
  }
}

export const storage = new DatabaseStorage();