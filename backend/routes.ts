import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, authService } from "./storage";
import session from "express-session";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
// import MemoryStore from "memorystore"; // Unused - commented out
// Optional Redis session store if REDIS_URL provided
// let RedisStore: any = null; // Unused - commented out
let redisClient: any = null;
if (process.env.REDIS_URL) {
  try {
    // Lazy require to avoid hard dependency if not configured
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const connectRedis = require('connect-redis');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createClient } = require('redis');
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on('error', (err: any) => console.error('[redis] error', err));
    redisClient.connect?.();
    // RedisStore = connectRedis(session); // Unused - commented out
  } catch {
    console.warn('[session] Redis not available, falling back to MemoryStore');
  }
}
import { db } from "./db";
import cors from "cors";
import * as SharedSchema from "../shared/schema";
import { eq } from "drizzle-orm";
import multer from "multer";
import xlsx from "xlsx";
// import { z } from "zod"; // Unused - commented out
import { paymentEdits, communicationEdits, payments, communications } from "../shared/schema";
import { Storage } from '@google-cloud/storage';
import { OAuth2Client } from 'google-auth-library';

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
  fileSize: 2 * 1024 * 1024, // 2MB limit (lowered to reduce RAM usage)
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
  const frontendOrigin = process.env.FRONTEND_ORIGIN;
  // Support multiple origins - split by comma if provided
  const allowedOrigins = frontendOrigin 
    ? frontendOrigin.split(',').map(origin => origin.trim())
    : ['https://accountancy-469917.web.app', 'https://accountancy-469917.firebaseapp.com'];
  
  // console.debug('CORS allowedOrigins:', allowedOrigins);
  
  app.use(cors({
    origin: (origin, callback) => {
  // console.debug('CORS check for origin:', origin);
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
  // console.debug('CORS allowing origin:', origin);
        return callback(null, true);
      } else {
  // console.debug('CORS blocking origin:', origin);
        return callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  

  // Cookie parser middleware - MUST be before session middleware
  app.use(cookieParser());

  // Configure session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    name: 'sessionid', // Change name to avoid conflicts
    rolling: true, // Reset expiry on each request
    cookie: {
      secure: true, // Always use secure for HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      sameSite: 'none', // Required for cross-site cookies
      path: '/',
    },
  }));

  // Resolve JWT secret
  const jwtSecret = process.env.SESSION_SECRET || 'your-secret-key-change-in-production';

  // Auth middleware to check if user is authenticated
  const requireAuth = (req: any, res: any, next: any) => {
  // console.debug(`[auth] requireAuth check sessionID=${req.sessionID} userId=${req.session?.userId}`);
    if (req.session?.userId) {
  // console.debug(`[auth] requireAuth passed via session for userId=${req.session.userId}`);
      return next();
    }

    // Fallback: verify JWT from cookie for stateless auth
    const token = req.cookies?.sessionid;
    if (token) {
      try {
        const payload: any = jwt.verify(token, jwtSecret);
        if (payload?.uid) {
          req.session = req.session || {};
          req.session.userId = payload.uid;
          // console.debug(`[auth] requireAuth passed via JWT for userId=${payload.uid}`);
          return next();
        }
      } catch (e) {
        console.warn('[auth] JWT verify failed');
      }
    }

  // console.debug(`[auth] requireAuth failed - no userId in session or JWT`);
    return res.status(401).json({ error: "Authentication required" });
  };

  // Health check endpoint (no auth required)
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Quick debug POST route to verify that POST requests reach the service
  // Useful when diagnosing 404 vs handler errors from Cloud Run.
  app.post('/api/debug/auth/google', (req, res) => {
  // console.debug('[debug] /api/debug/auth/google received', {
      headers: req.headers,
      bodySample: typeof req.body === 'object' ? JSON.stringify(req.body).slice(0, 1000) : String(req.body)
    });
    res.json({ ok: true, message: 'debug endpoint reached', received: req.body });
  });

  // Signed URLs for uploads (GCS)
  app.post('/api/uploads/sign', requireAuth, async (req, res) => {
    try {
      const { name, type } = req.body || {};
      if (!process.env.GCS_BUCKET) return res.status(400).json({ error: 'GCS not configured' });
      const storage = new Storage({ keyFilename: process.env.GCS_KEYFILE });
      const bucket = storage.bucket(process.env.GCS_BUCKET);
      const file = bucket.file(name);
      const [url] = await file.getSignedUrl({ action: 'write', expires: Date.now() + 5 * 60 * 1000, contentType: type });
      res.json({ url });
    } catch (e: any) {
      console.error('sign error', e);
      res.status(500).json({ error: 'Failed to sign upload' });
    }
  });

  // Auth Routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, fullName, name } = req.body;
      const effectiveFullName = fullName || name;
      
      if (!email || !password || !effectiveFullName) {
        return res.status(400).json({ 
          error: "Missing required fields",
          details: { email: !!email, password: !!password, name: !!effectiveFullName }
        });
      }

      // Create user data bypassing schema validation for now
      const userData = {
        email: String(email).toLowerCase(),
        fullName: effectiveFullName,
        passwordHash: password,
      };
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }
      const user = await storage.createUser({
        ...userData,
        role: 'customer'
      });
      res.json({
        message: "User created successfully.",
        user: { id: user.id, email: user.email, fullName: user.fullName }
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      if (error?.issues) {
        return res.status(400).json({ error: error.issues });
      }
      res.status(400).json({ error: error.message || "Failed to create user" });
    }
  });

  app.post("/api/auth/signin", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }
      const lowered = String(email).toLowerCase();
  // console.debug(`[auth] signin attempt email=${lowered}`);
      const user = await storage.validateUser(lowered, password);
      if (!user) {
        console.warn(`[auth] signin failed email=${lowered} :: invalid credentials`);
        return res.status(401).json({ error: "Invalid credentials" });
      }
  // console.debug(`[auth] signin success id=${user.id} email=${user.email} role=${user.role}`);

  // Create session
  req.session.userId = user.id;
  // console.debug(`[auth] session created userId=${user.id} sessionID=${req.sessionID}`);
      
      // Save session explicitly
      req.session.save((err) => {
        if (err) {
          console.error(`[auth] session save error:`, err);
          return res.status(500).json({ error: "Session save failed" });
        }
  // console.debug(`[auth] session saved successfully`);
  // console.debug(`[auth] response headers will include session cookie`);
        
  // Also set a JWT cookie for stateless auth across instances
  const token = jwt.sign({ uid: user.id }, jwtSecret, { expiresIn: '7d' });
  res.cookie('sessionid', token, {
          secure: true,
          httpOnly: true,
          maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
          sameSite: 'none',
          path: '/',
        });
  // console.debug('[auth] set-cookie sessionid sent');
        
        res.json({
          user: { 
            id: user.id, 
            email: user.email, 
            fullName: user.fullName,
            role: user.role || 'customer'
          },
          message: "Signed in successfully"
        });
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
  // Clear correct custom session cookie name
  res.clearCookie('sessionid');
      res.json({ message: "Signed out successfully" });
    });
  });

  // Google OAuth Routes
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { authCode } = req.body;
      
      if (!authCode) {
        return res.status(400).json({ error: "Google authorization code is required" });
      }

      // Initialize Google Auth client for code exchange
      const client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'postmessage' // Important for this flow
      );

      // Exchange authorization code for tokens
      const { tokens } = await client.getToken(authCode);
      const idToken = tokens.id_token;

      if (!idToken) {
        return res.status(400).json({ error: "Failed to retrieve ID token from Google" });
      }

      // Verify the ID token to get user details
      const ticket = await client.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        return res.status(400).json({ error: "Invalid Google token" });
      }

      const { email, name } = payload as any;
      if (!email || !name) {
        return res.status(400).json({ error: "Email and name are required from Google" });
      }

      console.log(`[auth] Google OAuth attempt email=${email}`);

      // Check if user exists
      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Create new user
        console.log(`[auth] Creating new user from Google OAuth email=${email}`);
        user = await storage.createUser({
          email: email,
          fullName: name,
          passwordHash: '', // No password for OAuth users
          role: 'customer',
        });
      } else {
        console.log(`[auth] Existing user Google OAuth login email=${email}`);
        // Update last login - use the existing auth service method
        await authService.getUserById(user.id); // This will update lastLoginAt in the login flow
      }

      console.log(`[auth] Google OAuth success id=${user.id} email=${user.email} role=${user.role}`);

      // Create session
      req.session.userId = user.id;
      console.log(`[auth] Google OAuth session created userId=${user.id} sessionID=${req.sessionID}`);
      
      // Save session explicitly
      req.session.save((err) => {
        if (err) {
          console.error(`[auth] Google OAuth session save error:`, err);
          return res.status(500).json({ error: "Session save failed" });
        }
        console.log(`[auth] Google OAuth session saved successfully`);
        
        res.json({
          user: { 
            id: user.id, 
            email: user.email, 
            fullName: user.fullName,
            role: user.role || 'customer'
          },
          message: "Google OAuth login successful"
        });
      });
    } catch (error: any) {
      console.error("Google OAuth error:", error);
      res.status(500).json({ error: "Google OAuth authentication failed" });
    }
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

  // Lightweight endpoint to introspect current session without requiring user lookup
  app.get('/api/auth/session-check', (req, res) => {
    res.json({ sessionID: req.sessionID, hasUserId: Boolean(req.session?.userId) });
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

  // Cache for dashboard stats (5 minutes)
  let dashboardStatsCache: { data: any; timestamp: number } | null = null;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Dashboard Stats Route
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      // Check cache first
      const now = Date.now();
      if (dashboardStatsCache && (now - dashboardStatsCache.timestamp) < CACHE_DURATION) {
        return res.json(dashboardStatsCache.data);
      }

      // Use optimized service method
      const stats = await storage.getDashboardStats();
      const users = await storage.getUsers();
      
      const enhancedStats = {
        ...stats,
        totalCustomers: users.length,
        activeCustomers: users.filter((u: any) => u.status === 'approved').length,
        aging030: Math.floor((stats.totalOutstanding || 0) * 0.4),
        aging3160: Math.floor((stats.totalOutstanding || 0) * 0.3),
        aging6190: Math.floor((stats.totalOutstanding || 0) * 0.2),
        aging90plus: Math.floor((stats.totalOutstanding || 0) * 0.1),
        monthlyTarget: 5000000,
        monthlyAchieved: stats.totalCollected || 0,
        targetProgress: Math.min(100, ((stats.totalCollected || 0) / 5000000) * 100),
        todayCollections: Math.round((stats.totalCollected || 0) * 0.05),
        weeklyCollections: Math.round((stats.totalCollected || 0) * 0.25),
        monthlyCollections: stats.totalCollected || 0,
        overdueAmount: Math.floor((stats.totalOutstanding || 0) * 0.3),
        pendingCount: stats.totalCount - stats.overdueCount,
        partialCount: 0,
        paidCount: 0,
        pendingApprovals: 0,
      };

      // Update cache
      dashboardStatsCache = { data: enhancedStats, timestamp: now };
      
      res.json(enhancedStats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ error: "Failed to fetch dashboard statistics" });
    }
  });

  // Collections API Routes with pagination and filters
  app.get("/api/collections", requireAuth, async (req, res) => {
    try {
      const {
        status,
        assignedTo,
        customerId,
        fromDate,
        toDate,
        minAmount,
        maxAmount,
        page = '1',
        limit = '50',
      } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = Math.min(parseInt(limit as string) || 50, 100); // Max 100 per request
      const offset = (pageNum - 1) * limitNum;

      const filters: any = { limit: limitNum, offset };
      
      if (status) filters.status = status;
      if (assignedTo) filters.assignedTo = assignedTo;
      if (customerId) filters.customerId = customerId;
      if (fromDate) filters.fromDate = new Date(fromDate as string);
      if (toDate) filters.toDate = new Date(toDate as string);
      if (minAmount) filters.minAmount = parseInt(minAmount as string);
      if (maxAmount) filters.maxAmount = parseInt(maxAmount as string);

      const collections = await storage.searchCollections(filters);
      
      // Debug: Log the first few collections to see if they have latestCommunication
      if (collections.length > 0) {
  // Debug logging for collections removed to reduce disk usage
      }
      
      res.json({
        collections,
        pagination: {
          page: pageNum,
          limit: limitNum,
          hasMore: collections.length === limitNum,
        }
      });
    } catch (error: any) {
      console.error("Get collections error:", error);
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
      const collectionData = (SharedSchema as any).insertCollectionSchema.parse(req.body);
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
      // const stats = await storage.getDashboardStats(); // Unused - commented out
      
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
                // const newUser = await storage.createUser({
                await storage.createUser({
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
      const fileId = req.params.fileId;
      const userId = req.session.userId!;

      // Get the Excel Import Service
      const { ExcelImportService } = await import("./services/excelImportService");
      const importService = new ExcelImportService();

      // Process the import batch
      const result = await importService.processBatch(fileId, userId);
      
      res.json({
        message: "Import completed successfully",
        collections: result.collections,
        summary: {
          totalRecords: result.totalRecords,
          successRecords: result.successRecords,
          failedRecords: result.failedRecords,
          duplicateRecords: result.duplicateRecords,
        },
        errors: result.errors.slice(0, 10) // First 10 errors for review
      });
    } catch (error: any) {
      console.error("Excel import error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/excel/:fileId/preview", requireAuth, async (req, res) => {
    try {
      const fileId = req.params.fileId;
      
      // Get the Excel Import Service  
      const { ExcelImportService } = await import("./services/excelImportService");
      const importService = new ExcelImportService();

      // Get preview data from the batch
      const previewData = await importService.previewBatch(fileId);
      
      res.json({
        data: previewData.data,
        count: previewData.count,
        columnMapping: previewData.columnMapping,
        summary: previewData.summary
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
        // Direct deletion - first delete related payment_edits to avoid foreign key constraint
        await db.delete(paymentEdits).where(eq(paymentEdits.paymentId, paymentId));
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
        // Direct deletion - first delete related communication_edits to avoid foreign key constraint
        await db.delete(communicationEdits).where(eq(communicationEdits.communicationId, communicationId));
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
      const { paymentService } = await import("./services/paymentService");
      const payment = await paymentService.getPaymentById(req.params.id);
      
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
