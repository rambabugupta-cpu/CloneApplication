import bcrypt from "bcrypt";
import { db } from "../db";
import { users, customers, type User, type InsertUser } from "@shared/schema";
import { eq } from "drizzle-orm";

export class AuthService {
  private readonly SALT_ROUNDS = 12;

  async register(data: {
    email: string;
    password: string;
    fullName: string;
    phoneNumber?: string;
    role?: "owner" | "admin" | "staff" | "customer";
  }): Promise<User> {
    // Check if user already exists
    const existingUser = await this.getUserByEmail(data.email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, this.SALT_ROUNDS);

    // Create user
    const [newUser] = await db.insert(users).values({
      email: data.email,
      passwordHash,
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      role: data.role || "customer",
      status: "active",
    }).returning();

    return newUser;
  }

  async login(email: string, password: string): Promise<User> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    if (user.status !== "active") {
      throw new Error("Account is not active");
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    // Update last login
    await db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    return user;
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isValid) {
      throw new Error("Current password is incorrect");
    }

    const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
    
    await db.update(users)
      .set({ 
        passwordHash,
        passwordChangedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  async updateUserStatus(userId: string, status: "active" | "inactive" | "suspended"): Promise<void> {
    await db.update(users)
      .set({ status, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}