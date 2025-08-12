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

// Export service instances for backward compatibility
export const authService = new AuthService();
export const customerService = new CustomerService();
export const collectionService = new CollectionService();
export const paymentService = new PaymentService();
export const notificationService = new NotificationService();
export const auditService = new AuditService();
export const excelImportService = new ExcelImportService();
export const editService = new EditService();

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
    return await authService.getAllUsers();
  }

  async getUserRole(userId: string) {
    const user = await authService.getUserById(userId);
    return user ? { role: user.role } : null;
  }

  async getPaymentStats() {
    // Use optimized database aggregation instead of fetching all payments
    return await paymentService.getPaymentStatsOptimized();
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

  async searchCollections(filters: any) {
    return await collectionService.searchCollections(filters);
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

  // Customer operations for Excel import - optimized to query directly
  async getCustomerByName(name: string) {
    if (!name) return null;
    return await customerService.getCustomerByName(name);
  }

  async createCustomer(data: any) {
    return await customerService.createCustomer(data);
  }
}

export const storage = new DatabaseStorage();