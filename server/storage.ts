import { eq, and, desc, asc, sql } from "drizzle-orm";
import { db } from "./db";
import { 
  users, 
  profiles, 
  userRoles, 
  collections, 
  payments, 
  communications,
  uploadedFiles,
  excelData,
  type User, 
  type Profile,
  type UserRole,
  type Collection,
  type Payment,
  type Communication,
  type UploadedFile,
  type ExcelData,
  type InsertUser, 
  type InsertProfile,
  type InsertUserRole,
  type InsertCollection,
  type InsertPayment,
  type InsertCommunication,
  type InsertUploadedFile,
  type InsertExcelData
} from "@shared/schema";
import bcrypt from "bcrypt";

export interface IStorage {
  // User management
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Profile management
  getProfile(userId: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(userId: string, updates: Partial<InsertProfile>): Promise<Profile | undefined>;
  getPendingProfiles(): Promise<Profile[]>;
  
  // Role management
  getUserRole(userId: string): Promise<UserRole | undefined>;
  assignUserRole(userRole: InsertUserRole): Promise<UserRole>;
  
  // Authentication
  validateUser(email: string, password: string): Promise<User | undefined>;

  // Collection management
  getCollections(): Promise<Collection[]>;
  getCollection(id: number): Promise<Collection | undefined>;
  getCollectionsByStatus(status: string): Promise<Collection[]>;
  createCollection(collection: InsertCollection): Promise<Collection>;
  updateCollection(id: number, updates: Partial<InsertCollection>): Promise<Collection | undefined>;

  // Payment management
  getPaymentsByCollection(collectionId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;

  // Communication management
  getCommunicationsByCollection(collectionId: number): Promise<Communication[]>;
  createCommunication(communication: InsertCommunication): Promise<Communication>;

  // Dashboard analytics
  getDashboardStats(): Promise<{
    totalOutstanding: number;
    totalCollected: number;
    overdueCount: number;
    totalCount: number;
    monthlyTrend: { month: string; collected: number; outstanding: number }[];
  }>;

  // File upload management
  createUploadedFile(file: InsertUploadedFile): Promise<UploadedFile>;
  getUploadedFile(id: number): Promise<UploadedFile | undefined>;
  updateUploadedFile(id: number, updates: Partial<InsertUploadedFile>): Promise<UploadedFile | undefined>;
  
  // Excel data management
  createExcelData(data: InsertExcelData): Promise<ExcelData>;
  getExcelDataByFileId(fileId: number): Promise<ExcelData[]>;
  createCollectionsFromExcelData(fileId: number, userId: string): Promise<Collection[]>;
}

export class DatabaseStorage implements IStorage {
  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    // Hash password before storing
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(user.passwordHash, saltRounds);
    
    const [newUser] = await db.insert(users).values({
      ...user,
      passwordHash: hashedPassword,
    }).returning();
    
    return newUser;
  }

  async getProfile(userId: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
    return profile;
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    const [newProfile] = await db.insert(profiles).values(profile).returning();
    return newProfile;
  }

  async updateProfile(userId: string, updates: Partial<InsertProfile>): Promise<Profile | undefined> {
    const [updatedProfile] = await db.update(profiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(profiles.id, userId))
      .returning();
    return updatedProfile;
  }

  async getPendingProfiles(): Promise<Profile[]> {
    return await db.select().from(profiles).where(eq(profiles.status, "pending"));
  }

  async getUserRole(userId: string): Promise<UserRole | undefined> {
    const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, userId)).limit(1);
    return role;
  }

  async assignUserRole(userRole: InsertUserRole): Promise<UserRole> {
    const [newRole] = await db.insert(userRoles).values(userRole).returning();
    return newRole;
  }

  async validateUser(email: string, password: string): Promise<User | undefined> {
    const user = await this.getUserByEmail(email);
    if (!user) return undefined;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    return isValid ? user : undefined;
  }

  // Collection management
  async getCollections(): Promise<Collection[]> {
    return await db.select().from(collections).orderBy(desc(collections.createdAt));
  }

  async getCollection(id: number): Promise<Collection | undefined> {
    const [collection] = await db.select().from(collections).where(eq(collections.id, id)).limit(1);
    return collection;
  }

  async getCollectionsByStatus(status: string): Promise<Collection[]> {
    return await db.select().from(collections).where(eq(collections.status, status)).orderBy(desc(collections.createdAt));
  }

  async createCollection(collection: InsertCollection): Promise<Collection> {
    const [newCollection] = await db.insert(collections).values(collection).returning();
    return newCollection;
  }

  async updateCollection(id: number, updates: Partial<InsertCollection>): Promise<Collection | undefined> {
    const [updated] = await db.update(collections)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(collections.id, id))
      .returning();
    return updated;
  }

  // Payment management
  async getPaymentsByCollection(collectionId: number): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.collectionId, collectionId)).orderBy(desc(payments.paymentDate));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  // Communication management
  async getCommunicationsByCollection(collectionId: number): Promise<Communication[]> {
    return await db.select().from(communications).where(eq(communications.collectionId, collectionId)).orderBy(desc(communications.createdAt));
  }

  async createCommunication(communication: InsertCommunication): Promise<Communication> {
    const [newCommunication] = await db.insert(communications).values(communication).returning();
    return newCommunication;
  }

  // Dashboard analytics
  async getDashboardStats(): Promise<{
    totalOutstanding: number;
    totalCollected: number;
    overdueCount: number;
    totalCount: number;
    monthlyTrend: { month: string; collected: number; outstanding: number }[];
  }> {
    // Get summary statistics
    const [stats] = await db.select({
      totalOutstanding: sql<number>`SUM(${collections.outstandingAmount})::int`,
      totalCollected: sql<number>`SUM(${collections.paidAmount})::int`,
      totalCount: sql<number>`COUNT(*)::int`,
      overdueCount: sql<number>`COUNT(CASE WHEN ${collections.dueDate} < NOW() AND ${collections.status} != 'paid' THEN 1 END)::int`
    }).from(collections);

    // Get monthly trend (last 6 months)
    const monthlyTrend = await db.select({
      month: sql<string>`TO_CHAR(DATE_TRUNC('month', ${collections.createdAt}), 'Mon YYYY')`,
      collected: sql<number>`SUM(${collections.paidAmount})::int`,
      outstanding: sql<number>`SUM(${collections.outstandingAmount})::int`
    })
    .from(collections)
    .where(sql`${collections.createdAt} >= NOW() - INTERVAL '6 months'`)
    .groupBy(sql`DATE_TRUNC('month', ${collections.createdAt})`)
    .orderBy(sql`DATE_TRUNC('month', ${collections.createdAt})`);

    return {
      totalOutstanding: stats?.totalOutstanding || 0,
      totalCollected: stats?.totalCollected || 0,
      overdueCount: stats?.overdueCount || 0,
      totalCount: stats?.totalCount || 0,
      monthlyTrend: monthlyTrend || []
    };
  }

  // File upload management
  async createUploadedFile(file: InsertUploadedFile): Promise<UploadedFile> {
    const [newFile] = await db.insert(uploadedFiles).values(file).returning();
    return newFile;
  }

  async getUploadedFile(id: number): Promise<UploadedFile | undefined> {
    const [file] = await db.select().from(uploadedFiles).where(eq(uploadedFiles.id, id)).limit(1);
    return file;
  }

  async updateUploadedFile(id: number, updates: Partial<InsertUploadedFile>): Promise<UploadedFile | undefined> {
    const [updated] = await db.update(uploadedFiles)
      .set(updates)
      .where(eq(uploadedFiles.id, id))
      .returning();
    return updated;
  }

  // Excel data management
  async createExcelData(data: InsertExcelData): Promise<ExcelData> {
    const [newData] = await db.insert(excelData).values(data).returning();
    return newData;
  }

  async getExcelDataByFileId(fileId: number): Promise<ExcelData[]> {
    return await db.select().from(excelData).where(eq(excelData.fileId, fileId));
  }

  async createCollectionsFromExcelData(fileId: number, userId: string): Promise<Collection[]> {
    const excelRows = await this.getExcelDataByFileId(fileId);
    const createdCollections: Collection[] = [];

    for (const row of excelRows) {
      const rowData = row.rowData as any;
      
      // Extract customer name from various possible column names
      const customerName = rowData['Customer Name'] || 
                          rowData['customer_name'] || 
                          rowData['Customer'] || 
                          rowData['Name'] || 
                          rowData['name'] || '';
      
      // Extract amount from various possible column names
      const amountStr = rowData['Amount'] || 
                       rowData['amount'] || 
                       rowData['Outstanding Amount'] || 
                       rowData['outstanding_amount'] ||
                       rowData['Outstanding'] ||
                       rowData['Total'] ||
                       rowData['total'] || '0';
      
      // Convert amount to paise (Indian currency subunit)
      const amount = Math.round(parseFloat(String(amountStr).replace(/[₹,\s]/g, '')) * 100);
      
      if (customerName && amount > 0) {
        // Extract phone number from various possible column names
        const phoneNumber = rowData['Phone'] || 
                           rowData['phone'] || 
                           rowData['Phone Number'] || 
                           rowData['phone_number'] ||
                           rowData['Mobile'] ||
                           rowData['mobile'] ||
                           rowData['Contact'] ||
                           rowData['contact'] || null;
        
        // Extract email from various possible column names
        const email = rowData['Email'] || 
                     rowData['email'] || 
                     rowData['Email Address'] ||
                     rowData['email_address'] ||
                     `${customerName.toLowerCase().replace(/\s+/g, '.')}@example.com`;
        
        const collection = await this.createCollection({
          customerName,
          customerEmail: email,
          customerPhone: phoneNumber,
          invoiceNumber: `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          originalAmount: amount,
          outstandingAmount: amount,
          paidAmount: 0,
          currency: 'INR',
          status: 'outstanding',
          priority: amount > 100000 ? 'high' : amount > 50000 ? 'medium' : 'low', // ₹1000+ = high, ₹500+ = medium
          description: `Imported from Excel - ${rowData['Description'] || rowData['description'] || 'Payment required'}`,
          assignedTo: userId,
        });
        
        createdCollections.push(collection);
      }
    }

    return createdCollections;
  }
}

export const storage = new DatabaseStorage();
