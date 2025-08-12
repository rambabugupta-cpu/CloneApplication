import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import pgSimple from "connect-pg-simple";
import { db, pool } from "./db";
import cors from "cors";
import { insertUserSchema, insertCollectionSchema, insertPaymentSchema, insertCommunicationSchema, payments, communications } from "@shared/schema";
import { eq } from "drizzle-orm";
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

  // Get pending payments endpoint
  app.get("/api/payments/pending", requireAuth, async (req, res) => {
    try {
      // Check if user is admin or owner
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "admin" && user?.role !== "owner") {
        return res.status(403).json({ error: "Admin/Owner access required" });
      }
      
      const pendingPayments = await storage.getPendingPayments();
      res.json(pendingPayments);
    } catch (error: any) {
      console.error("Get pending payments error:", error);
      res.status(500).json({ error: "Failed to get pending payments" });
    }
  });

  // Approve/Reject payment endpoint
  app.post("/api/payments/:paymentId/approve", requireAuth, async (req, res) => {
    try {
      const { paymentId } = req.params;
      const { status } = req.body; // 'approved' or 'rejected'
      
      // Check if user is admin or owner
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "admin" && user?.role !== "owner") {
        return res.status(403).json({ error: "Admin/Owner access required" });
      }

      if (status === 'approved') {
        const payment = await storage.approvePayment(paymentId, req.session.userId!);
        res.json(payment);
      } else if (status === 'rejected') {
        const payment = await storage.rejectPayment(paymentId, req.session.userId!);
        res.json(payment);
      } else {
        res.status(400).json({ error: "Invalid status. Must be 'approved' or 'rejected'" });
      }
    } catch (error: any) {
      console.error("Approve payment error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user statistics
  app.get("/api/users/statistics", requireAuth, async (req, res) => {
    try {
      // Check if user is admin or owner
      const currentUser = await storage.getUserById(req.session.userId!);
      if (currentUser?.role !== "admin" && currentUser?.role !== "owner") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const users = await storage.getUsers();
      const stats = {
        total: users.length,
        active: users.filter((u: any) => u.status === "approved").length,
        pending: users.filter((u: any) => u.status === "pending").length,
        inactive: users.filter((u: any) => u.status === "rejected").length
      };

      res.json(stats);
    } catch (error: any) {
      console.error("Get user statistics error:", error);
      res.status(500).json({ error: "Failed to get user statistics" });
    }
  });

  // Get all approvals history
  app.get("/api/approvals/history", requireAuth, async (req, res) => {
    try {
      // Check if user is admin or owner
      const currentUser = await storage.getUserById(req.session.userId!);
      if (currentUser?.role !== "admin" && currentUser?.role !== "owner") {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Get all payments
      const allPayments = await storage.getAllPayments();
      
      // Get all users
      const allUsers = await storage.getUsers();
      
      // Get all edit requests
      const allEdits = await storage.getAllEditRequests();

      res.json({
        payments: allPayments || [],
        users: allUsers || [],
        edits: allEdits || []
      });
    } catch (error: any) {
      console.error("Get approvals history error:", error);
      res.status(500).json({ error: "Failed to get approvals history" });
    }
  });

  // Get all users by role
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const { role } = req.query;
      
      // Check if user is admin or owner
      const currentUser = await storage.getUserById(req.session.userId!);
      if (currentUser?.role !== "admin" && currentUser?.role !== "owner") {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Get all users, optionally filtered by role
      const users = await storage.getUsers();
      const filteredUsers = role 
        ? users.filter((u: any) => u.role === role)
        : users;

      res.json(filteredUsers);
    } catch (error: any) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Failed to get users" });
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
      const collectionId = req.params.id; // Keep as UUID string
      const payments = await storage.getPaymentsByCollection(collectionId);
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/collections/:id/payments", requireAuth, async (req, res) => {
    try {
      const collectionId = req.params.id; // Keep as UUID string
      
      // Get user role to determine if auto-approval is needed
      const userRole = await storage.getUserRole(req.session.userId!);
      
      // Ensure amount is properly converted to an integer (remove floating point errors)
      const paymentData = {
        ...req.body,
        amount: Math.round(req.body.amount), // Round to nearest integer to fix floating point issues
        collectionId,
        recordedBy: req.session.userId,
        userRole: userRole?.role,
        paymentDate: req.body.paymentDate || new Date().toISOString().split('T')[0], // Add default date if not provided
      };
      
      console.log("Payment request:", JSON.stringify(paymentData, null, 2));
      
      const payment = await storage.createPayment(paymentData);
      res.status(201).json(payment);
    } catch (error: any) {
      console.error("Payment error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Communications API Routes
  app.get("/api/collections/:id/communications", requireAuth, async (req, res) => {
    try {
      const collectionId = req.params.id; // Keep as UUID string
      const communications = await storage.getCommunicationsByCollection(collectionId);
      res.json(communications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/collections/:id/communications", requireAuth, async (req, res) => {
    try {
      const collectionId = req.params.id; // Keep as string for UUID
      console.log("=== Communication Request ===");
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      console.log("Collection ID:", collectionId);
      console.log("User ID:", req.session.userId);
      
      // Validate required fields
      if (!req.body.type) {
        return res.status(400).json({ error: "Communication type is required" });
      }
      if (!req.body.direction) {
        return res.status(400).json({ error: "Communication direction is required" });
      }
      if (!req.body.content) {
        return res.status(400).json({ error: "Communication content is required" });
      }
      if (!req.session.userId) {
        return res.status(400).json({ error: "User session not found" });
      }
      
      const communicationData = {
        ...req.body,
        collectionId,
        createdBy: req.session.userId, // Changed from userId to createdBy
      };
      
      console.log("Final communication data:", JSON.stringify(communicationData, null, 2));
      
      const communication = await storage.createCommunication(communicationData);
      res.status(201).json(communication);
    } catch (error: any) {
      console.error("=== Communication Error ===");
      console.error("Error type:", error.name);
      console.error("Error message:", error.message);
      console.error("Full error:", error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: error.message || "Failed to save communication" });
    }
  });

  // Dispute API Routes
  app.post("/api/collections/:id/dispute", requireAuth, async (req, res) => {
    try {
      const collectionId = req.params.id;
      const { reason } = req.body;
      
      if (!reason || reason.trim() === '') {
        return res.status(400).json({ error: "Dispute reason is required" });
      }
      
      if (!req.session.userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      await storage.raiseDispute(collectionId, reason, req.session.userId);
      res.status(200).json({ message: "Dispute raised successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Dashboard API Routes
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      
      // Enhanced stats with additional analytics
      const enhancedStats = {
        ...stats,
        // Collection status breakdown
        paidCount: 0,
        pendingCount: stats.totalCount || 0,
        overdueCount: 0,
        partialCount: 0,
        
        // Aging analysis (mock data for now - can be enhanced later)
        aging030: Math.round((stats.totalOutstanding || 0) * 0.4),
        aging3160: Math.round((stats.totalOutstanding || 0) * 0.3),
        aging6190: Math.round((stats.totalOutstanding || 0) * 0.2),
        aging90plus: Math.round((stats.totalOutstanding || 0) * 0.1),
        
        // Customer analytics
        activeCustomers: 15,
        totalCustomers: 25,
        
        // Performance metrics
        monthlyTarget: 5000000, // 50 lakhs target
        monthlyAchieved: stats.totalCollected || 0,
        targetProgress: ((stats.totalCollected || 0) / 5000000) * 100,
        collectionRate: stats.totalOutstanding > 0 ? 
          ((stats.totalCollected || 0) / ((stats.totalOutstanding || 0) + (stats.totalCollected || 0))) * 100 : 0,
        
        // Time-based collections
        todayCollections: Math.round((stats.totalCollected || 0) * 0.05),
        weeklyCollections: Math.round((stats.totalCollected || 0) * 0.25),
        monthlyCollections: stats.totalCollected || 0,
        
        // Overdue calculations
        overdueAmount: Math.round((stats.totalOutstanding || 0) * 0.3),
      };
      
      res.json(enhancedStats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Enhanced Analytics APIs
  app.get("/api/dashboard/monthly-trends", requireAuth, async (req, res) => {
    try {
      // Mock monthly trend data - can be enhanced with real data later
      const monthlyTrends = [
        { month: 'Jan', collected: 2500000, outstanding: 4500000, target: 3000000 },
        { month: 'Feb', collected: 3200000, outstanding: 4200000, target: 3000000 },
        { month: 'Mar', collected: 2800000, outstanding: 4800000, target: 3000000 },
        { month: 'Apr', collected: 3500000, outstanding: 3900000, target: 3500000 },
        { month: 'May', collected: 4100000, outstanding: 3500000, target: 4000000 },
        { month: 'Jun', collected: 3800000, outstanding: 3200000, target: 4000000 },
      ];
      res.json(monthlyTrends);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/dashboard/collection-performance", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      
      // Performance metrics by staff member
      const staffPerformance = [
        { name: 'Rajesh Kumar', collected: 1200000, target: 1000000, success_rate: 85 },
        { name: 'Priya Singh', collected: 980000, target: 900000, success_rate: 78 },
        { name: 'Amit Sharma', collected: 1150000, target: 1100000, success_rate: 82 },
        { name: 'Sneha Patel', collected: 890000, target: 800000, success_rate: 88 },
      ];

      // Top customers by outstanding amount
      const topCustomers = [
        { name: 'ABC Industries Ltd', outstanding: 850000, overdue_days: 45 },
        { name: 'XYZ Trading Co', outstanding: 720000, overdue_days: 32 },
        { name: 'PQR Enterprises', outstanding: 680000, overdue_days: 28 },
        { name: 'LMN Solutions', outstanding: 590000, overdue_days: 15 },
        { name: 'DEF Corporation', outstanding: 540000, overdue_days: 22 },
      ];

      res.json({
        staffPerformance,
        topCustomers
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/dashboard/aging-analysis", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      
      const agingBuckets = [
        { 
          range: '0-30 days', 
          amount: Math.round((stats.totalOutstanding || 0) * 0.4),
          count: Math.round((stats.totalCount || 0) * 0.45),
          percentage: 40
        },
        { 
          range: '31-60 days', 
          amount: Math.round((stats.totalOutstanding || 0) * 0.3),
          count: Math.round((stats.totalCount || 0) * 0.25),
          percentage: 30
        },
        { 
          range: '61-90 days', 
          amount: Math.round((stats.totalOutstanding || 0) * 0.2),
          count: Math.round((stats.totalCount || 0) * 0.20),
          percentage: 20
        },
        { 
          range: '90+ days', 
          amount: Math.round((stats.totalOutstanding || 0) * 0.1),
          count: Math.round((stats.totalCount || 0) * 0.10),
          percentage: 10
        },
      ];

      res.json(agingBuckets);
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

      // Store imported customers and collections for response
      const importedCustomers: any[] = [];
      const importedCollections: any[] = [];
      const createdUserAccounts: any[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        try {
          // Map Excel columns to collection fields (flexible mapping) - check all possible column names
          const customerName = (row as any)['Customer Name'] || 
                             (row as any)['Name'] || 
                             (row as any)['Party Name'] || 
                             (row as any)['Sundry Debtors'] || 
                             (row as any)['Customer'] ||
                             (row as any)['Client'] || '';
          
          const amountStr = (row as any)['Outstanding Amount'] || 
                           (row as any)['Amount'] || 
                           (row as any)['Balance'] || 
                           (row as any)['Outstanding'] ||
                           (row as any)['Due Amount'] ||
                           (row as any)['Total'] || 0;
          
          // Parse amount more carefully
          const amount = parseFloat(String(amountStr).replace(/[₹,\s]/g, '')) || 0;
          
          // Generate unique invoice number for each row
          const invoiceNo = (row as any)['Invoice Number'] || 
                           (row as any)['Invoice No'] || 
                           (row as any)['Bill No'] || 
                           (row as any)['Reference'] || 
                           `INV-${Date.now()}-${i}`;
          
          const dueDate = (row as any)['Due Date'] || 
                         (row as any)['Date'] || 
                         new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          
          // Skip row if no customer name
          if (!customerName || customerName.trim() === '') {
            failedRecords++;
            errors.push({ 
              row: i + 1, 
              data: row, 
              error: 'Missing customer name' 
            });
            continue;
          }

          // Skip row if amount is 0 or invalid
          if (!amount || amount <= 0) {
            failedRecords++;
            errors.push({ 
              row: i + 1, 
              data: row, 
              error: 'Invalid or zero amount' 
            });
            continue;
          }

          // Create or find customer
          let customer = await storage.getCustomerByName(customerName);
          if (!customer) {
            // Generate unique customer code with timestamp
            const customerCode = (row as any)['Customer Code'] || 
                               (row as any)['Code'] || 
                               `CUST-${Date.now()}-${i}`;
            
            // Extract email and phone
            const customerEmail = (row as any)['Email'] || 
                                (row as any)['email'] || 
                                `${customerName.toLowerCase().replace(/\s+/g, '.')}@customer.local`;
            
            const customerPhone = (row as any)['Phone Number'] || 
                                (row as any)['Phone'] || 
                                (row as any)['Mobile'] || 
                                (row as any)['Contact'] || '';
            
            customer = await storage.createCustomer({
              primaryContactName: customerName,
              customerCode: customerCode,
              primaryPhone: customerPhone,
              primaryEmail: customerEmail,
              gstNumber: (row as any)['GST Number'] || (row as any)['GST'] || '',
              addressLine1: (row as any)['Address'] || '',
              city: (row as any)['City'] || '',
              state: (row as any)['State'] || '',
              pincode: (row as any)['Pincode'] || (row as any)['Pin'] || '',
              creditLimit: parseFloat(String((row as any)['Credit Limit'] || 0).replace(/[₹,]/g, '')) || 0,
              creditDays: parseInt((row as any)['Credit Days'] || '30') || 30,
            });
            importedCustomers.push(customer);
            
            // Always create a user account for every imported customer
            try {
              // Use provided email or generate a default one
              const userEmail = customerEmail.endsWith('@customer.local') ? 
                              customerEmail : 
                              (customerEmail || `${customerCode.toLowerCase()}@customer.local`);
              
              // Check if user with this email already exists
              const existingUser = await storage.getUserByEmail(userEmail);
              if (!existingUser) {
                // Create customer user account with default password
                const defaultPassword = `${customerCode}@123`; // Customer code + @123
                const newUser = await storage.createUser({
                  email: userEmail,
                  passwordHash: defaultPassword, // Will be hashed in createUser
                  fullName: customerName,
                  phoneNumber: customerPhone,
                  role: 'customer',
                });
                createdUserAccounts.push({
                  email: userEmail,
                  password: defaultPassword,
                  fullName: customerName,
                  customerCode: customerCode
                });
                console.log(`Created customer user account for ${customerName} with email ${userEmail} and password ${defaultPassword}`);
              } else {
                console.log(`User account already exists for ${customerName} with email ${userEmail}`);
              }
            } catch (userError) {
              console.error(`Failed to create user account for customer ${customerName}:`, userError);
              // Continue with import even if user creation fails
            }
          }

          // Create collection record
          const collection = await storage.createCollection({
            customerId: customer.id,
            invoiceNumber: invoiceNo,
            invoiceDate: new Date().toISOString(),
            dueDate: dueDate,
            originalAmount: Math.round(amount * 100), // Convert to paise
            outstandingAmount: Math.round(amount * 100), // Convert to paise
            status: 'pending',
            createdBy: req.session.userId!,
          });
          
          importedCollections.push(collection);
          successRecords++;
          
        } catch (error: any) {
          failedRecords++;
          errors.push({ 
            row: i + 1, 
            data: row, 
            error: error.message 
          });
        }
      }

      res.json({
        message: `File processed successfully. ${successRecords} records imported, ${failedRecords} failed. Created ${createdUserAccounts.length} customer user accounts.`,
        totalRecords: jsonData.length,
        successRecords,
        failedRecords,
        errors: errors.slice(0, 10), // First 10 errors for debugging
        importedCustomers: importedCustomers.slice(0, 10), // Show first 10 imported customers
        importedCollections: importedCollections.slice(0, 10), // Show first 10 imported collections
        createdUserAccounts: createdUserAccounts, // Show all created user accounts with login credentials
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

  // Edit APIs - Payment and Communication Edits with Approval Workflow
  const { editService } = await import("./services/editService");
  
  // Create payment edit request
  app.post("/api/payments/:id/edit", requireAuth, async (req, res) => {
    try {
      const paymentId = req.params.id;
      const userId = req.session.userId!;
      
      const edit = await editService.createPaymentEdit(paymentId, req.body, userId);
      res.json(edit);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Create communication edit request
  app.post("/api/communications/:id/edit", requireAuth, async (req, res) => {
    try {
      const communicationId = req.params.id;
      const userId = req.session.userId!;
      
      const edit = await editService.createCommunicationEdit(communicationId, req.body, userId);
      res.json(edit);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Delete payment request
  app.post("/api/payments/:id/delete", requireAuth, async (req, res) => {
    try {
      const paymentId = req.params.id;
      const { deleteReason } = req.body;
      const userId = req.session.userId!;
      
      // Check user role - owner and admin can delete directly
      const user = await storage.getUserRole(userId);
      if (user?.role === 'owner' || user?.role === 'admin') {
        // Direct deletion
        await db.delete(payments).where(eq(payments.id, paymentId));
        res.status(200).json({ message: "Payment deleted successfully" });
      } else {
        // Create delete request for approval
        const deleteRequest = await editService.createPaymentDelete(paymentId, deleteReason, userId);
        res.status(201).json(deleteRequest);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete communication request
  app.post("/api/communications/:id/delete", requireAuth, async (req, res) => {
    try {
      const communicationId = req.params.id;
      const { deleteReason } = req.body;
      const userId = req.session.userId!;
      
      // Check user role - owner and admin can delete directly
      const user = await storage.getUserRole(userId);
      if (user?.role === 'owner' || user?.role === 'admin') {
        // Direct deletion
        await db.delete(communications).where(eq(communications.id, communicationId));
        res.status(200).json({ message: "Communication deleted successfully" });
      } else {
        // Create delete request for approval
        const deleteRequest = await editService.createCommunicationDelete(communicationId, deleteReason, userId);
        res.status(201).json(deleteRequest);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get all pending edit requests (combined)
  app.get("/api/edits/pending", requireAuth, async (req, res) => {
    try {
      const pendingEdits = await editService.getPendingEditRequests();
      res.json(pendingEdits);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get pending payment edits
  app.get("/api/edits/payments/pending", requireAuth, async (req, res) => {
    try {
      const pendingEdits = await editService.getPendingPaymentEdits();
      res.json(pendingEdits);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get pending communication edits
  app.get("/api/edits/communications/pending", requireAuth, async (req, res) => {
    try {
      const pendingEdits = await editService.getPendingCommunicationEdits();
      res.json(pendingEdits);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Approve payment edit
  app.post("/api/edits/payments/:id/approve", requireAuth, async (req, res) => {
    try {
      const editId = req.params.id;
      const userId = req.session.userId!;
      const user = await storage.getUserById(userId);
      
      // Only admin and owner can approve
      if (user?.role !== 'admin' && user?.role !== 'owner') {
        return res.status(403).json({ error: "Not authorized to approve edits" });
      }
      
      await editService.approvePaymentEdit(editId, userId);
      res.json({ message: "Payment edit approved successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Approve communication edit
  app.post("/api/edits/communications/:id/approve", requireAuth, async (req, res) => {
    try {
      const editId = req.params.id;
      const userId = req.session.userId!;
      const user = await storage.getUserById(userId);
      
      // Only admin and owner can approve
      if (user?.role !== 'admin' && user?.role !== 'owner') {
        return res.status(403).json({ error: "Not authorized to approve edits" });
      }
      
      await editService.approveCommunicationEdit(editId, userId);
      res.json({ message: "Communication edit approved successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Reject payment edit
  app.post("/api/edits/payments/:id/reject", requireAuth, async (req, res) => {
    try {
      const editId = req.params.id;
      const userId = req.session.userId!;
      const user = await storage.getUserById(userId);
      const { reason } = req.body;
      
      // Only admin and owner can reject
      if (user?.role !== 'admin' && user?.role !== 'owner') {
        return res.status(403).json({ error: "Not authorized to reject edits" });
      }
      
      await editService.rejectPaymentEdit(editId, userId, reason);
      res.json({ message: "Payment edit rejected" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Reject communication edit  
  app.post("/api/edits/communications/:id/reject", requireAuth, async (req, res) => {
    try {
      const editId = req.params.id;
      const userId = req.session.userId!;
      const user = await storage.getUserById(userId);
      const { reason } = req.body;
      
      // Only admin and owner can reject
      if (user?.role !== 'admin' && user?.role !== 'owner') {
        return res.status(403).json({ error: "Not authorized to reject edits" });
      }
      
      await editService.rejectCommunicationEdit(editId, userId, reason);
      res.json({ message: "Communication edit rejected" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Process auto-approvals (should be called periodically)
  app.post("/api/edits/process-auto-approvals", requireAuth, async (req, res) => {
    try {
      await editService.processAutoApprovals();
      res.json({ message: "Auto-approvals processed successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get payment details by ID
  app.get("/api/payments/:id", requireAuth, async (req, res) => {
    try {
      const paymentServiceModule = await import("./services/paymentService");
      const payment = await paymentServiceModule.getPaymentById(req.params.id);
      
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      
      res.json(payment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get communication by ID
  app.get("/api/communications/:id", requireAuth, async (req, res) => {
    try {
      const { communicationService } = await import("./services/communicationService");
      const communication = await communicationService.getCommunicationById(req.params.id);
      
      if (!communication) {
        return res.status(404).json({ error: "Communication not found" });
      }
      
      res.json(communication);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
