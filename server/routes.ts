import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import { insertUserSchema, insertProfileSchema, insertUserRoleSchema } from "@shared/schema";
import { z } from "zod";

// Session interface extension
declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    name: 'connect.sid',
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax', // Important for modern browsers
    },
  }));

  // Auth middleware to check if user is authenticated
  const requireAuth = (req: any, res: any, next: any) => {
    console.log('Auth check - Session ID:', req.sessionID);
    console.log('Auth check - Session data:', req.session);
    console.log('Auth check - User ID:', req.session?.userId);
    
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

  const httpServer = createServer(app);
  return httpServer;
}
