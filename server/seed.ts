import { db } from "./db";
import { users, customers, collections } from "@shared/schema";
import bcrypt from "bcrypt";
import { sql } from "drizzle-orm";

async function clearDatabase() {
  console.log("Clearing existing data...");
  
  // Clear tables in reverse dependency order
  await db.delete(collections).execute();
  await db.delete(customers).execute();
  await db.delete(users).execute();
}

async function seedDatabase() {
  try {
    console.log("Starting database seed...");
    
    // Clear existing data
    await clearDatabase();
    
    // Create users
    const passwordHash = await bcrypt.hash("admin123", 12);
    
    // Create owner user
    const [owner] = await db.insert(users).values({
      email: "owner@example.com",
      passwordHash,
      fullName: "System Owner",
      phoneNumber: "9876543210",
      role: "owner",
      status: "active",
    }).returning();
    
    console.log("Created owner user:", owner.email);
    
    // Create admin user
    const [admin] = await db.insert(users).values({
      email: "admin@example.com",
      passwordHash,
      fullName: "Admin User",
      phoneNumber: "9876543211",
      role: "admin",
      status: "active",
    }).returning();
    
    console.log("Created admin user:", admin.email);
    
    // Create staff users
    const staffPasswordHash = await bcrypt.hash("staff123", 12);
    
    const [staff1] = await db.insert(users).values({
      email: "staff1@example.com",
      passwordHash: staffPasswordHash,
      fullName: "John Staff",
      phoneNumber: "9876543212",
      role: "staff",
      status: "active",
      employeeCode: "EMP001",
      department: "Collections",
    }).returning();
    
    const [staff2] = await db.insert(users).values({
      email: "staff2@example.com",
      passwordHash: staffPasswordHash,
      fullName: "Jane Staff",
      phoneNumber: "9876543213",
      role: "staff",
      status: "active",
      employeeCode: "EMP002",
      department: "Collections",
    }).returning();
    
    console.log("Created staff users");
    
    // Create customer users
    const customerPasswordHash = await bcrypt.hash("customer123", 12);
    
    const [customerUser1] = await db.insert(users).values({
      email: "customer1@example.com",
      passwordHash: customerPasswordHash,
      fullName: "Rajesh Kumar",
      phoneNumber: "9876543214",
      role: "customer",
      status: "active",
    }).returning();
    
    const [customerUser2] = await db.insert(users).values({
      email: "customer2@example.com",
      passwordHash: customerPasswordHash,
      fullName: "Priya Sharma",
      phoneNumber: "9876543215",
      role: "customer",
      status: "active",
    }).returning();
    
    console.log("Created customer users");
    
    // Create customers
    const [customer1] = await db.insert(customers).values({
      userId: customerUser1.id,
      customerCode: "CUST001",
      companyName: "Kumar Enterprises",
      primaryContactName: "Rajesh Kumar",
      primaryPhone: "9876543214",
      primaryEmail: "customer1@example.com",
      gstNumber: "29ABCDE1234F1Z5",
      addressLine1: "123 MG Road",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560001",
      creditLimit: 50000000, // 5 lakhs in paise
      creditDays: 30,
      assignedTo: staff1.id,
      isActive: true,
    }).returning();
    
    const [customer2] = await db.insert(customers).values({
      userId: customerUser2.id,
      customerCode: "CUST002",
      companyName: "Sharma Industries",
      primaryContactName: "Priya Sharma",
      primaryPhone: "9876543215",
      primaryEmail: "customer2@example.com",
      gstNumber: "27ABCDE5678G2H6",
      addressLine1: "456 Linking Road",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400050",
      creditLimit: 100000000, // 10 lakhs in paise
      creditDays: 45,
      assignedTo: staff2.id,
      isActive: true,
    }).returning();
    
    const [customer3] = await db.insert(customers).values({
      customerCode: "CUST003",
      companyName: "Tech Solutions Pvt Ltd",
      primaryContactName: "Amit Patel",
      primaryPhone: "9876543216",
      primaryEmail: "amit@techsolutions.com",
      addressLine1: "789 Sector 5",
      city: "Noida",
      state: "Uttar Pradesh",
      pincode: "201301",
      creditLimit: 75000000, // 7.5 lakhs in paise
      creditDays: 60,
      assignedTo: staff1.id,
      isActive: true,
    }).returning();
    
    console.log("Created customers");
    
    // Create collections with various statuses
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    // Overdue collection
    await db.insert(collections).values({
      customerId: customer1.id,
      invoiceNumber: "INV-2024-001",
      invoiceDate: ninetyDaysAgo.toISOString().split('T')[0],
      dueDate: sixtyDaysAgo.toISOString().split('T')[0],
      originalAmount: 15000000, // 1.5 lakhs in paise
      outstandingAmount: 15000000,
      paidAmount: 0,
      status: "overdue",
      agingDays: 60,
      assignedTo: staff1.id,
      escalationLevel: 2,
      notes: "Multiple follow-ups done, customer promised payment by month end",
    });
    
    // Partial payment collection
    await db.insert(collections).values({
      customerId: customer2.id,
      invoiceNumber: "INV-2024-002",
      invoiceDate: sixtyDaysAgo.toISOString().split('T')[0],
      dueDate: thirtyDaysAgo.toISOString().split('T')[0],
      originalAmount: 25000000, // 2.5 lakhs in paise
      outstandingAmount: 10000000, // 1 lakh outstanding
      paidAmount: 15000000, // 1.5 lakhs paid
      status: "partial",
      agingDays: 30,
      assignedTo: staff2.id,
      promisedAmount: 10000000,
      promisedDate: thirtyDaysFromNow.toISOString().split('T')[0],
      notes: "Partial payment received, balance promised next month",
    });
    
    // Pending collection
    await db.insert(collections).values({
      customerId: customer3.id,
      invoiceNumber: "INV-2024-003",
      invoiceDate: today.toISOString().split('T')[0],
      dueDate: thirtyDaysFromNow.toISOString().split('T')[0],
      originalAmount: 8500000, // 85,000 in paise
      outstandingAmount: 8500000,
      paidAmount: 0,
      status: "pending",
      agingDays: 0,
      assignedTo: staff1.id,
      notes: "New invoice, payment expected on time",
    });
    
    // More collections for dashboard stats
    await db.insert(collections).values({
      customerId: customer1.id,
      invoiceNumber: "INV-2024-004",
      invoiceDate: thirtyDaysAgo.toISOString().split('T')[0],
      dueDate: today.toISOString().split('T')[0],
      originalAmount: 5000000, // 50,000 in paise
      outstandingAmount: 5000000,
      paidAmount: 0,
      status: "overdue",
      agingDays: 1,
      assignedTo: staff1.id,
    });
    
    await db.insert(collections).values({
      customerId: customer2.id,
      invoiceNumber: "INV-2024-005",
      invoiceDate: thirtyDaysAgo.toISOString().split('T')[0],
      dueDate: today.toISOString().split('T')[0],
      originalAmount: 12000000, // 1.2 lakhs in paise
      outstandingAmount: 0,
      paidAmount: 12000000,
      status: "paid",
      agingDays: 0,
      assignedTo: staff2.id,
      notes: "Full payment received",
    });
    
    console.log("Created sample collections");
    console.log("Database seed completed successfully!");
    
    console.log("\n=== Login Credentials ===");
    console.log("Owner: owner@example.com / admin123");
    console.log("Admin: admin@example.com / admin123");
    console.log("Staff: staff1@example.com / staff123");
    console.log("Staff: staff2@example.com / staff123");
    console.log("Customer: customer1@example.com / customer123");
    console.log("Customer: customer2@example.com / customer123");
    console.log("========================\n");
    
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

export { seedDatabase };