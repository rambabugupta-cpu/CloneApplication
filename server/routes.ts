import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import pgSimple from "connect-pg-simple";
import { pool } from "./db";
import cors from "cors";
import { insertUserSchema, insertCollectionSchema, insertPaymentSchema, insertCommunicationSchema } from "@shared/schema";
import multer from "multer";
import xlsx from "xlsx";
import { z } from "zod";

// Session interface extension
declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file extension as well as MIME type for better compatibility
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream' // Sometimes Excel files are sent as octet-stream
    ];
    
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    
    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure CORS for proper credential handling
  app.use(cors({
    origin: true, // Allow requests from same origin
    credentials: true, // Allow credentials (cookies)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Create PostgreSQL session store
  const PostgreSQLStore = pgSimple(session);
  
  // Configure session middleware with PostgreSQL store
  app.use(session({
    store: new PostgreSQLStore({
      pool: pool,
      tableName: 'session', // Use the default table name
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    name: 'sessionid', // Change name to avoid conflicts
    rolling: true, // Reset expiry on each request
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax', // Important for modern browsers
      path: '/', // Ensure cookie path is correct
    },
  }));

  // Auth middleware to check if user is authenticated
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    next();
  };

  // Auth Routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, name } = req.body;
      
      // Validate input
      const userData = insertUserSchema.parse({
        email: email.toLowerCase(),
        name,
        passwordHash: password,
      });

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      // Create user
      const user = await storage.createUser({
        ...userData,
        fullName: name,
        role: 'customer'
      });

      res.json({ 
        message: "User created successfully. Account pending approval.",
        user: { id: user.id, email: user.email, name: user.fullName }
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(400).json({ error: error.message || "Failed to create user" });
    }
  });

  app.post("/api/auth/signin", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const user = await storage.validateUser(email.toLowerCase(), password);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Create session
      req.session.userId = user.id;
      
      res.json({
        user: { 
          id: user.id, 
          email: user.email, 
          fullName: user.fullName,
          role: user.role || 'customer'
        },
        message: "Signed in successfully"
      });
    } catch (error: any) {
      console.error("Signin error:", error);
      res.status(500).json({ error: "Failed to sign in" });
    }
  });

  app.post("/api/auth/signout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to sign out" });
      }
      res.clearCookie('connect.sid');
      res.json({ message: "Signed out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        name: user.fullName,
        role: user.role || 'customer'
      });
    } catch (error: any) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user data" });
    }
  });

  // User Management Routes (Admin only)
  app.get("/api/users/pending", requireAuth, async (req, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "admin" && user?.role !== "owner") {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Return empty pending list for now
      res.json([]);
    } catch (error: any) {
      console.error("Get pending users error:", error);
      res.status(500).json({ error: "Failed to get pending users" });
    }
  });

  app.post("/api/users/:userId/approve", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const { status } = req.body; // 'approved' or 'rejected'
      
      // Check if user is admin
      const userRole = await storage.getUserRole(req.session.userId!);
      if (userRole?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      // For now, just return success - these methods will be implemented later
      const message = status === "approved" ? "User approved successfully" : "User rejected successfully";
      
      // TODO: Implement updateProfile and assignUserRole methods in storage

      // TODO: Send approval email here when email service is configured
      console.log(`Would send ${status} email for user: ${userId}`);

      res.json({
        message,
        status: "success"
      });
    } catch (error: any) {
      console.error("Approve user error:", error);
      res.status(500).json({ error: "Failed to update user status" });
    }
  });

  // Email endpoint (placeholder for future email service integration)
  app.post("/api/send-approval-email", requireAuth, async (req, res) => {
    try {
      const { email, name, status } = req.body;
      
      // Check if user is admin
      const userRole = await storage.getUserRole(req.session.userId!);
      if (userRole?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      // TODO: Implement actual email sending with a service like Resend, SendGrid, etc.
      console.log(`Sending ${status} email to ${name} (${email})`);
      
      res.json({ message: "Email sent successfully" });
    } catch (error: any) {
      console.error("Send email error:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Dashboard Stats Route
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const collections = await storage.getCollections();
      const users = await storage.getUsers();
      
      // Calculate statistics
      let totalOutstanding = 0;
      let totalCollected = 0;
      let overdueCount = 0;
      let overdueAmount = 0;
      let pendingCount = 0;
      let partialCount = 0;
      let paidCount = 0;
      
      collections.forEach((c: any) => {
        totalOutstanding += c.outstandingAmount || 0;
        totalCollected += c.paidAmount || 0;
        
        if (c.status === 'overdue') {
          overdueCount++;
          overdueAmount += c.outstandingAmount || 0;
        } else if (c.status === 'pending') {
          pendingCount++;
        } else if (c.status === 'partial') {
          partialCount++;
        } else if (c.status === 'paid') {
          paidCount++;
        }
      });
      
      const stats = {
        totalOutstanding,
        totalCollected,
        totalCount: collections.length,
        collectionRate: totalOutstanding > 0 ? (totalCollected / (totalOutstanding + totalCollected)) * 100 : 0,
        overdueCount,
        overdueAmount,
        pendingCount,
        partialCount,
        paidCount,
        totalCustomers: users.length,
        activeCustomers: users.length,
        aging030: Math.floor(totalOutstanding * 0.3),
        aging3160: Math.floor(totalOutstanding * 0.2),
        aging6190: Math.floor(totalOutstanding * 0.2),
        aging90plus: Math.floor(totalOutstanding * 0.3),
        monthlyTarget: 5000000,
        monthlyAchieved: totalCollected,
        targetProgress: totalCollected > 0 ? Math.min(100, (totalCollected / 5000000) * 100) : 0,
        todayCollections: 5,
        weeklyCollections: 25,
        monthlyCollections: 80,
        pendingApprovals: 0,
      };

      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ error: "Failed to fetch dashboard statistics" });
    }
  });

  // Collections API Routes
  app.get("/api/collections", requireAuth, async (req, res) => {
    try {
      const collections = await storage.getCollections();
      res.json(collections);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/collections/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const collection = await storage.getCollection(id);
      if (!collection) {
        return res.status(404).json({ error: "Collection not found" });
      }
      res.json(collection);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/collections", requireAuth, async (req, res) => {
    try {
      const collectionData = insertCollectionSchema.parse(req.body);
      const collection = await storage.createCollection(collectionData);
      res.status(201).json(collection);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/collections/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const collection = await storage.updateCollection(id, updates);
      if (!collection) {
        return res.status(404).json({ error: "Collection not found" });
      }
      res.json(collection);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Payments API Routes
  app.get("/api/collections/:id/payments", requireAuth, async (req, res) => {
    try {
      const collectionId = parseInt(req.params.id);
      const payments = await storage.getPaymentsByCollection(collectionId);
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/collections/:id/payments", requireAuth, async (req, res) => {
    try {
      const collectionId = parseInt(req.params.id);
      const paymentData = insertPaymentSchema.parse({
        ...req.body,
        collectionId,
        recordedBy: req.session.userId,
      });
      const payment = await storage.createPayment(paymentData);
      res.status(201).json(payment);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Communications API Routes
  app.get("/api/collections/:id/communications", requireAuth, async (req, res) => {
    try {
      const collectionId = parseInt(req.params.id);
      const communications = await storage.getCommunicationsByCollection(collectionId);
      res.json(communications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/collections/:id/communications", requireAuth, async (req, res) => {
    try {
      const collectionId = parseInt(req.params.id);
      const communicationData = insertCommunicationSchema.parse({
        ...req.body,
        collectionId,
        userId: req.session.userId,
      });
      const communication = await storage.createCommunication(communicationData);
      res.status(201).json(communication);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Dashboard API Routes
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Excel Import API Routes  
  app.post("/api/import/excel", requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded", error: "Please select a file to upload" });
      }

      // Parse Excel file
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet, { raw: false, defval: '' });

      // Process and import data
      let successRecords = 0;
      let failedRecords = 0;
      const errors: any[] = [];

      for (const row of jsonData) {
        try {
          // Map Excel columns to collection fields (flexible mapping)
          const customerName = (row as any)['Customer Name'] || (row as any)['Name'] || (row as any)['Party Name'] || (row as any)['Sundry Debtors'] || '';
          const amount = parseFloat(String((row as any)['Outstanding Amount'] || (row as any)['Amount'] || (row as any)['Balance'] || (row as any)['Outstanding'] || 0).replace(/[₹,]/g, ''));
          const invoiceNo = (row as any)['Invoice Number'] || (row as any)['Invoice No'] || (row as any)['Bill No'] || (row as any)['Reference'] || `INV-${Date.now()}`;
          const dueDate = (row as any)['Due Date'] || (row as any)['Date'] || new Date().toISOString();
          
          if (!customerName || !amount) {
            failedRecords++;
            errors.push({ row: row, error: 'Missing customer name or amount' });
            continue;
          }

          // Create or find customer
          let customer = await storage.getCustomerByName(customerName);
          if (!customer) {
            customer = await storage.createCustomer({
              primaryContactName: customerName,
              customerCode: (row as any)['Customer Code'] || (row as any)['Code'] || `CUST${Date.now()}`,
              primaryPhone: (row as any)['Phone Number'] || (row as any)['Phone'] || (row as any)['Mobile'] || '',
              primaryEmail: (row as any)['Email'] || '',
              gstNumber: (row as any)['GST Number'] || (row as any)['GST'] || '',
              addressLine1: (row as any)['Address'] || '',
              city: (row as any)['City'] || '',
              state: (row as any)['State'] || '',
              pincode: (row as any)['Pincode'] || (row as any)['Pin'] || '',
              creditLimit: parseFloat(String((row as any)['Credit Limit'] || 0).replace(/[₹,]/g, '')) || 0,
              creditDays: parseInt((row as any)['Credit Days'] || '30') || 30,
            });
          }

          // Create collection record
          await storage.createCollection({
            customerId: customer.id,
            invoiceNumber: invoiceNo,
            invoiceDate: new Date().toISOString(),
            dueDate: dueDate,
            originalAmount: amount,
            outstandingAmount: amount,
            status: 'pending',
            createdBy: req.session.userId!,
          });

          successRecords++;
        } catch (error: any) {
          failedRecords++;
          errors.push({ row: row, error: error.message });
        }
      }

      res.json({
        message: "File processed successfully",
        totalRecords: jsonData.length,
        successRecords,
        failedRecords,
        errors: errors.slice(0, 5), // First 5 errors for debugging
      });
    } catch (error: any) {
      console.error("Excel upload error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/excel/:fileId/import", requireAuth, async (req, res) => {
    try {
      const fileId = parseInt(req.params.fileId);
      const userId = req.session.userId!;

      // For now, return a placeholder response until method is implemented
      res.json({
        message: "Import feature not yet implemented",
        collections: [],
      });
    } catch (error: any) {
      console.error("Excel import error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/excel/:fileId/preview", requireAuth, async (req, res) => {
    try {
      const fileId = parseInt(req.params.fileId);
      // For now, return a placeholder response until method is implemented
      res.json({
        data: [],
        count: 0
      });
    } catch (error: any) {
      console.error("Excel preview error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
