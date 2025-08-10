import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { 
  users, 
  profiles, 
  userRoles, 
  type User, 
  type Profile,
  type UserRole,
  type InsertUser, 
  type InsertProfile,
  type InsertUserRole
} from "@shared/schema";
import bcrypt from "bcrypt";

export interface IStorage {
  // User management
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Profile management
  getProfile(userId: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(userId: string, updates: Partial<InsertProfile>): Promise<Profile | undefined>;
  getPendingProfiles(): Promise<Profile[]>;
  
  // Role management
  getUserRole(userId: string): Promise<UserRole | undefined>;
  assignUserRole(userRole: InsertUserRole): Promise<UserRole>;
  
  // Authentication
  validateUser(email: string, password: string): Promise<User | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    // Hash password before storing
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(user.passwordHash, saltRounds);
    
    const [newUser] = await db.insert(users).values({
      ...user,
      passwordHash: hashedPassword,
    }).returning();
    
    return newUser;
  }

  async getProfile(userId: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
    return profile;
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    const [newProfile] = await db.insert(profiles).values(profile).returning();
    return newProfile;
  }

  async updateProfile(userId: string, updates: Partial<InsertProfile>): Promise<Profile | undefined> {
    const [updatedProfile] = await db.update(profiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(profiles.id, userId))
      .returning();
    return updatedProfile;
  }

  async getPendingProfiles(): Promise<Profile[]> {
    return await db.select().from(profiles).where(eq(profiles.status, "pending"));
  }

  async getUserRole(userId: string): Promise<UserRole | undefined> {
    const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, userId)).limit(1);
    return role;
  }

  async assignUserRole(userRole: InsertUserRole): Promise<UserRole> {
    const [newRole] = await db.insert(userRoles).values(userRole).returning();
    return newRole;
  }

  async validateUser(email: string, password: string): Promise<User | undefined> {
    const user = await this.getUserByEmail(email);
    if (!user) return undefined;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    return isValid ? user : undefined;
  }
}

export const storage = new DatabaseStorage();
