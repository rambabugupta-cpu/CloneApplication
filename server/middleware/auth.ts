import { Request, Response, NextFunction } from "express";
import { authService, auditService } from "../storage";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: "owner" | "admin" | "staff" | "customer";
        fullName: string;
      };
    }
  }
}

// Check if user is authenticated
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const user = await authService.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    if (user.status !== "active") {
      return res.status(403).json({ error: "Account is not active" });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Authentication error" });
  }
};

// Check if user has specific role(s)
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      // Log unauthorized access attempt
      auditService.logAction({
        userId: req.user.id,
        action: "unauthorized_access_attempt",
        entityType: "api",
        newValue: { 
          requiredRoles: roles, 
          userRole: req.user.role,
          path: req.path 
        },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
};

// Check if user is admin or owner
export const requireAdmin = requireRole(["admin", "owner"]);

// Check if user is owner
export const requireOwner = requireRole(["owner"]);

// Check if user is staff or higher
export const requireStaff = requireRole(["staff", "admin", "owner"]);

// Optional auth - attaches user if authenticated but doesn't require it
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.session?.userId) {
    try {
      const user = await authService.getUserById(req.session.userId);
      if (user && user.status === "active") {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
        };
      }
    } catch (error) {
      // Silent fail - user is optional
      console.error("Optional auth error:", error);
    }
  }
  next();
};

// Rate limiting for sensitive operations
const rateLimitMap = new Map<string, number[]>();

export const rateLimit = (
  maxAttempts: number,
  windowMs: number,
  identifier?: (req: Request) => string
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = identifier ? identifier(req) : req.ip || "unknown";
    const now = Date.now();
    const attempts = rateLimitMap.get(key) || [];
    
    // Clean old attempts
    const validAttempts = attempts.filter(time => now - time < windowMs);
    
    if (validAttempts.length >= maxAttempts) {
      return res.status(429).json({ 
        error: "Too many requests. Please try again later." 
      });
    }
    
    validAttempts.push(now);
    rateLimitMap.set(key, validAttempts);
    
    next();
  };
};