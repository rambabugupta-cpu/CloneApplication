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

// Export service instances for backward compatibility
export const authService = new AuthService();
export const customerService = new CustomerService();
export const collectionService = new CollectionService();
export const paymentService = new PaymentService();
export const notificationService = new NotificationService();
export const auditService = new AuditService();
export const excelImportService = new ExcelImportService();

// Legacy storage interface - minimal implementation for compatibility
export class DatabaseStorage {
  async getUserById(id: string) {
    return await authService.getUserById(id);
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
    // Return sample users for now
    return [
      { id: '1', email: 'owner@example.com', fullName: 'System Owner', role: 'owner' },
      { id: '2', email: 'admin@example.com', fullName: 'Admin User', role: 'admin' }
    ];
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

  async getPaymentsByCollection(collectionId: number) {
    return await paymentService.getPaymentsByCollection(String(collectionId));
  }

  async createPayment(data: any) {
    return await paymentService.recordPayment(data);
  }

  async getCommunicationsByCollection(collectionId: number) {
    return await communicationService.getCommunicationsByCollection(String(collectionId));
  }

  async createCommunication(data: any) {
    return await communicationService.createCommunication(data);
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