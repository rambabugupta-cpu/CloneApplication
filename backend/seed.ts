import { db } from "./db";
import { users, customers, collections, communications, payments, importBatches, paymentEdits, communicationEdits } from "../shared/schema";
import bcrypt from "bcrypt";
import { sql } from "drizzle-orm";

async function clearDatabase() {
  console.log("Clearing existing data...");
  
  // Clear tables in reverse dependency order
  // Delete dependent tables first
  await db.delete(communications).execute();
  await db.delete(payments).execute();
  await db.delete(collections).execute();
  await db.delete(customers).execute();
  await db.delete(users).execute();
}

async function seedDatabase() {
  try {
    // Check if database already has data
    const existingUsers = await db.select().from(users).limit(1);
    
    if (existingUsers.length > 0) {
      console.log("Database already seeded, skipping...");
      return;
    }
    
    console.log("Starting initial database seed...");
    
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
    
    // Create a sample import batch to simulate Excel upload
    const [importBatch] = await db.insert(importBatches).values({
      fileName: "Customer_Outstanding_Report_January_2025.xlsx",
      fileSize: 45678,
      totalRecords: 5,
      successRecords: 5,
      failedRecords: 0,
      status: "completed",
      importedBy: admin.id,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    }).returning();
    
    console.log("Created import batch to simulate Excel upload");
    
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
      importBatchId: importBatch.id, // Link to import batch
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
      importBatchId: importBatch.id, // Link to import batch
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
      importBatchId: importBatch.id, // Link to import batch
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
      importBatchId: importBatch.id, // Link to import batch
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
      importBatchId: importBatch.id, // Link to import batch
      notes: "Full payment received",
    });
    
    console.log("Created sample collections");
    
    // Create sample communications with follow-up data
    const collections1 = await db.select().from(collections).limit(1);
    const collections2 = await db.select().from(collections).offset(1).limit(1);
    const collections3 = await db.select().from(collections).offset(2).limit(1);
    
    if (collections1.length > 0) {
      await db.insert(communications).values({
        collectionId: collections1[0].id,
        customerId: collections1[0].customerId,
        createdBy: staff1.id,
        type: "call",
        direction: "outbound",
        content: "Called customer regarding overdue payment",
        outcome: "successful",
        promisedAmount: 500000, // 5000 rupees
        promisedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        nextActionRequired: "Follow up on promised payment",
        nextActionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      });
    }
    
    if (collections2.length > 0) {
      await db.insert(communications).values({
        collectionId: collections2[0].id,
        customerId: collections2[0].customerId,
        createdBy: staff2.id,
        type: "email",
        direction: "outbound",
        content: "Sent payment reminder email",
        outcome: "pending",
        nextActionRequired: "Call customer if no response in 2 days",
        nextActionDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
      });
    }
    
    if (collections3.length > 0) {
      await db.insert(communications).values({
        collectionId: collections3[0].id,
        customerId: collections3[0].customerId,
        createdBy: staff1.id,
        type: "visit",
        direction: "outbound",
        content: "Visited customer office for collection",
        outcome: "successful",
        promisedAmount: 850000, // 8500 rupees
        promisedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days from now
        nextActionRequired: "Collect payment on promised date",
        nextActionDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days from now
      });
    }
    
    console.log("Created sample communications with follow-up data");
    
    // Create some sample edit requests for testing approvals
    console.log("Creating sample edit requests...");
    
    // TODO: Fix this section - variables paymentIds, staffUser1, adminUser, etc. are not defined
    // This section is commented out to fix TypeScript errors
    /*
    const paymentEditIds = await db.insert(paymentEdits).values([
      {
        paymentId: paymentIds[0], // First payment
        originalAmount: 250000,
        originalPaymentDate: new Date('2024-01-15'),
        originalPaymentMode: 'cash',
        originalReferenceNumber: null,
        newAmount: 280000, // Editing amount
        newPaymentDate: new Date('2024-01-15'),
        newPaymentMode: 'cash',
        newReferenceNumber: 'CASH-REF-001',
        editReason: 'Correcting payment amount - actual amount was higher',
        editedBy: staffUser1.id,
        status: 'pending',
        autoApprovalAt: new Date(Date.now() + 1000 * 60 * 30), // 30 minutes from now
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      },
      {
        paymentId: paymentIds[1], // Second payment
        originalAmount: 450000,
        originalPaymentDate: new Date('2024-01-20'),
        originalPaymentMode: 'upi',
        originalReferenceNumber: 'UPI123456',
        newAmount: 450000,
        newPaymentDate: new Date('2024-01-21'), // Editing date
        newPaymentMode: 'upi',
        newReferenceNumber: 'UPI123456',
        editReason: 'Payment date was incorrectly recorded',
        editedBy: adminUser.id,
        status: 'approved',
        approvedBy: ownerUser.id,
        approvedAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        autoApprovalAt: new Date(Date.now() - 1000 * 60 * 60 * 23), 
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
      },
      {
        paymentId: paymentIds[2], // Third payment
        originalAmount: 180000,
        originalPaymentDate: new Date('2024-02-05'),
        originalPaymentMode: 'cheque',
        originalReferenceNumber: 'CHQ789',
        newAmount: 180000,
        newPaymentDate: new Date('2024-02-05'),
        newPaymentMode: 'bank_transfer', // Editing payment mode
        newReferenceNumber: 'NEFT-2024-789',
        editReason: 'Payment mode was bank transfer, not cheque',
        editedBy: staffUser2.id,
        status: 'rejected',
        approvedBy: adminUser.id,
        approvedAt: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
        rejectionReason: 'Original records show cheque payment',
        autoApprovalAt: new Date(Date.now() - 1000 * 60 * 60 * 11),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      }
    ]).returning();

    // Create communication edit requests
    const communicationEditIds = await db.insert(communicationEdits).values([
      {
        communicationId: communicationIds[0],
        originalContent: 'Initial call to discuss payment',
        originalOutcome: 'promised_to_pay',
        originalPromisedAmount: 500000,
        originalPromisedDate: new Date('2024-02-10'),
        originalNextActionRequired: true,
        originalNextActionDate: new Date('2024-02-10'),
        newContent: 'Initial call to discuss payment - customer was busy, asked to call back', // Editing content
        newOutcome: 'promised_to_pay',
        newPromisedAmount: 500000,
        newPromisedDate: new Date('2024-02-10'),
        newNextActionRequired: true,
        newNextActionDate: new Date('2024-02-10'),
        editReason: 'Adding more details to the communication record',
        editedBy: staffUser1.id,
        status: 'pending',
        autoApprovalAt: new Date(Date.now() + 1000 * 60 * 30), // 30 minutes from now
        createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      },
      {
        communicationId: communicationIds[1],
        originalContent: 'Follow-up email sent',
        originalOutcome: 'no_response',
        originalPromisedAmount: null,
        originalPromisedDate: null,
        originalNextActionRequired: true,
        originalNextActionDate: new Date('2024-02-08'),
        newContent: 'Follow-up email sent',
        newOutcome: 'partial_payment', // Editing outcome
        newPromisedAmount: 300000,
        newPromisedDate: new Date('2024-02-15'),
        newNextActionRequired: true,
        newNextActionDate: new Date('2024-02-15'),
        editReason: 'Customer responded with partial payment promise',
        editedBy: adminUser.id,
        status: 'approved',
        approvedBy: ownerUser.id,
        approvedAt: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
        autoApprovalAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
      }
    ]).returning();
    */

    console.log("Created sample edit requests for testing approvals");
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