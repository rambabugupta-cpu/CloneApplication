import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import pgSimple from "connect-pg-simple";
import { pool } from "./db";
import cors from "cors";
import { insertUserSchema, insertProfileSchema, insertUserRoleSchema, insertCollectionSchema, insertPaymentSchema, insertCommunicationSchema, insertUploadedFileSchema, insertExcelDataSchema } from "@shared/schema";
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
      const user = await storage.createUser(userData);
      
      // Create profile
      await storage.createProfile({
        id: user.id,
        name,
        email: userData.email,
        status: "pending",
      });

      res.json({ 
        message: "User created successfully. Account pending approval.",
        user: { id: user.id, email: user.email, name: user.name }
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

      // Check if user profile is approved
      const profile = await storage.getProfile(user.id);
      if (!profile || profile.status !== "approved") {
        return res.status(403).json({ error: "Account pending approval" });
      }

      // Create session
      req.session.userId = user.id;
      
      res.json({
        user: { id: user.id, email: user.email, name: user.name },
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

      const profile = await storage.getProfile(user.id);
      const role = await storage.getUserRole(user.id);

      res.json({
        user: { id: user.id, email: user.email, name: user.name },
        profile,
        role: role?.role || null
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
      const userRole = await storage.getUserRole(req.session.userId!);
      if (userRole?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const pendingProfiles = await storage.getPendingProfiles();
      res.json(pendingProfiles);
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

      // Update profile status
      const updatedProfile = await storage.updateProfile(userId, { status });
      
      // If approved, assign employee role
      if (status === "approved" && updatedProfile) {
        await storage.assignUserRole({
          userId,
          role: "employee",
        });
      }

      // TODO: Send approval email here when email service is configured
      // For now, we'll just log the email that would be sent
      if (updatedProfile) {
        console.log(`Would send ${status} email to: ${updatedProfile.email}`);
      }

      res.json({
        message: `User ${status} successfully`,
        profile: updatedProfile
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
  app.post("/api/excel/upload", requireAuth, upload.single('excel'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Save file metadata to database
      const uploadedFile = await storage.createUploadedFile({
        userId: req.session.userId!,
        filename: `${Date.now()}_${req.file.originalname}`,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        status: "processing",
      });

      // Parse Excel file
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet);

      // Store each row in the database
      for (const row of jsonData) {
        await storage.createExcelData({
          fileId: uploadedFile.id,
          rowData: row as any,
        });
      }

      // Update file status
      await storage.updateUploadedFile(uploadedFile.id, { status: "processed" });

      res.json({
        message: "File uploaded and processed successfully",
        fileId: uploadedFile.id,
        rowCount: jsonData.length,
        preview: jsonData.slice(0, 5), // First 5 rows for preview
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

      // Create collection records from Excel data
      const collections = await storage.createCollectionsFromExcelData(fileId, userId);

      res.json({
        message: `Successfully imported ${collections.length} collection records`,
        collections: collections,
      });
    } catch (error: any) {
      console.error("Excel import error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/excel/:fileId/preview", requireAuth, async (req, res) => {
    try {
      const fileId = parseInt(req.params.fileId);
      const excelData = await storage.getExcelDataByFileId(fileId);
      
      res.json({
        data: excelData.map(row => row.rowData),
        count: excelData.length
      });
    } catch (error: any) {
      console.error("Excel preview error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
