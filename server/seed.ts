import { storage } from "./storage";

export async function seedDatabase() {
  try {
    // Check if admin user already exists
    const existingAdmin = await storage.getUserByEmail("admin@example.com");
    
    if (!existingAdmin) {
      console.log("Creating demo users and data...");
      
      // Create admin user
      const adminUser = await storage.createUser({
        email: "admin@example.com",
        name: "Admin User",
        passwordHash: "admin123",
      });

      await storage.createProfile({
        id: adminUser.id,
        name: "Admin User",
        email: "admin@example.com",
        status: "approved",
      });

      await storage.assignUserRole({
        userId: adminUser.id,
        role: "admin",
      });

      // Create employee user
      const employeeUser = await storage.createUser({
        email: "employee@example.com",
        name: "Sarah Johnson",
        passwordHash: "employee123",
      });

      await storage.createProfile({
        id: employeeUser.id,
        name: "Sarah Johnson",
        email: "employee@example.com",
        status: "approved",
      });

      await storage.assignUserRole({
        userId: employeeUser.id,
        role: "employee",
      });

      // Create customer user
      const customerUser = await storage.createUser({
        email: "customer@example.com",
        name: "John Smith",
        passwordHash: "customer123",
      });

      await storage.createProfile({
        id: customerUser.id,
        name: "John Smith",
        email: "customer@example.com",
        status: "approved",
      });

      await storage.assignUserRole({
        userId: customerUser.id,
        role: "customer",
      });

      // Create pending customer
      const pendingUser = await storage.createUser({
        email: "pending@example.com",
        name: "Jane Doe",
        passwordHash: "pending123",
      });

      await storage.createProfile({
        id: pendingUser.id,
        name: "Jane Doe",
        email: "pending@example.com",
        mobile: "+1-555-0123",
        status: "pending",
      });

      await storage.assignUserRole({
        userId: pendingUser.id,
        role: "customer",
      });

      // Create sample collection data
      const collections = [
        {
          customerId: customerUser.id,
          customerName: "Acme Corporation",
          customerEmail: "billing@acme.com",
          customerPhone: "+1-555-0100",
          invoiceNumber: "INV-2024-001",
          invoiceDate: new Date("2024-01-15"),
          dueDate: new Date("2024-02-15"),
          originalAmount: 125000, // $1,250.00
          outstandingAmount: 75000, // $750.00
          paidAmount: 50000, // $500.00
          status: "outstanding",
          priority: "high",
          description: "Q4 2023 consulting services",
          assignedTo: employeeUser.id,
          lastContactDate: new Date("2024-02-10"),
          nextFollowupDate: new Date("2024-02-20"),
        },
        {
          customerId: null,
          customerName: "TechStart Inc",
          customerEmail: "finance@techstart.com",
          customerPhone: "+1-555-0200",
          invoiceNumber: "INV-2024-002",
          invoiceDate: new Date("2024-02-01"),
          dueDate: new Date("2024-01-25"), // overdue
          originalAmount: 89000, // $890.00
          outstandingAmount: 89000, // $890.00
          paidAmount: 0,
          status: "overdue",
          priority: "high",
          description: "Software development services",
          assignedTo: employeeUser.id,
          lastContactDate: new Date("2024-02-08"),
          nextFollowupDate: new Date("2024-02-12"),
        },
        {
          customerId: null,
          customerName: "Global Manufacturing",
          customerEmail: "ap@globalmfg.com",
          customerPhone: "+1-555-0300",
          invoiceNumber: "INV-2024-003",
          invoiceDate: new Date("2024-02-05"),
          dueDate: new Date("2024-03-05"),
          originalAmount: 234000, // $2,340.00
          outstandingAmount: 0,
          paidAmount: 234000, // $2,340.00
          status: "paid",
          priority: "medium",
          description: "Equipment maintenance contract",
          assignedTo: employeeUser.id,
          lastContactDate: new Date("2024-02-15"),
          nextFollowupDate: null,
        },
        {
          customerId: null,
          customerName: "Retail Solutions LLC",
          customerEmail: "accounts@retailsolutions.com",
          customerPhone: "+1-555-0400",
          invoiceNumber: "INV-2024-004",
          invoiceDate: new Date("2024-02-10"),
          dueDate: new Date("2024-03-12"),
          originalAmount: 156000, // $1,560.00
          outstandingAmount: 156000, // $1,560.00
          paidAmount: 0,
          status: "outstanding",
          priority: "medium",
          description: "POS system implementation",
          assignedTo: adminUser.id,
          lastContactDate: null,
          nextFollowupDate: new Date("2024-02-25"),
        },
        {
          customerId: null,
          customerName: "Healthcare Partners",
          customerEmail: "billing@healthcarepartners.com",
          customerPhone: "+1-555-0500",
          invoiceNumber: "INV-2024-005",
          invoiceDate: new Date("2024-01-28"),
          dueDate: new Date("2024-02-28"),
          originalAmount: 78000, // $780.00
          outstandingAmount: 39000, // $390.00
          paidAmount: 39000, // $390.00
          status: "partial",
          priority: "low",
          description: "Monthly support services",
          assignedTo: employeeUser.id,
          lastContactDate: new Date("2024-02-05"),
          nextFollowupDate: new Date("2024-02-28"),
        }
      ];

      for (const collectionData of collections) {
        const collection = await storage.createCollection(collectionData);

        // Add sample payments for paid/partial collections
        if (collection.status === "paid" && collection.paidAmount && collection.paidAmount > 0) {
          await storage.createPayment({
            collectionId: collection.id,
            amount: collection.paidAmount,
            paymentMethod: "bank_transfer",
            paymentDate: new Date("2024-02-15"),
            referenceNumber: `PAY-${collection.invoiceNumber}`,
            notes: "Full payment received via bank transfer",
            recordedBy: employeeUser.id,
          });
        } else if (collection.status === "partial" && collection.paidAmount && collection.paidAmount > 0) {
          await storage.createPayment({
            collectionId: collection.id,
            amount: collection.paidAmount,
            paymentMethod: "check",
            paymentDate: new Date("2024-02-05"),
            referenceNumber: `CHK-001-${collection.id}`,
            notes: "Partial payment via check",
            recordedBy: employeeUser.id,
          });
        }

        // Add sample communications
        if (collection.lastContactDate) {
          await storage.createCommunication({
            collectionId: collection.id,
            userId: collection.assignedTo || employeeUser.id,
            type: "email",
            recipient: collection.customerEmail,
            subject: `Payment Reminder - Invoice ${collection.invoiceNumber}`,
            message: `Dear ${collection.customerName}, This is a friendly reminder about your outstanding invoice ${collection.invoiceNumber} with a balance of $${(collection.outstandingAmount / 100).toFixed(2)}. Please contact us if you have any questions.`,
            status: "completed",
            outcome: collection.status === "overdue" ? "no_response" : "acknowledged",
            nextAction: collection.status === "overdue" ? "follow_up_call" : "monitor",
            nextActionDate: collection.nextFollowupDate,
          });
        }

        if (collection.status === "overdue") {
          await storage.createCommunication({
            collectionId: collection.id,
            userId: collection.assignedTo || employeeUser.id,
            type: "call",
            recipient: collection.customerPhone || "N/A",
            subject: `Follow-up Call - Invoice ${collection.invoiceNumber}`,
            message: "Called customer regarding overdue invoice. Left voicemail requesting urgent payment.",
            status: "completed",
            outcome: "no_response",
            nextAction: "legal_notice",
            nextActionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          });
        }
      }

      console.log("Demo data created successfully!");
      console.log("\n=== Demo Login Credentials ===");
      console.log("Admin User:");
      console.log("  Email: admin@example.com");
      console.log("  Password: admin123");
      console.log("\nEmployee User:");
      console.log("  Email: employee@example.com");
      console.log("  Password: employee123");
      console.log("\nCustomer User:");
      console.log("  Email: customer@example.com");
      console.log("  Password: customer123");
      console.log("\nPending User (for approval demo):");
      console.log("  Email: pending@example.com");
      console.log("  Password: pending123");
      console.log("\n=== Sample Data ===");
      console.log("- 5 collection records with various statuses");
      console.log("- Sample payments and communication logs");
      console.log("- Realistic financial data for dashboard analytics");
    } else {
      console.log("Demo data already exists");
    }
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}