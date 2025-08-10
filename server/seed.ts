import { storage } from "./storage";

export async function seedDatabase() {
  try {
    // Check if admin user already exists
    const existingAdmin = await storage.getUserByEmail("admin@example.com");
    
    if (!existingAdmin) {
      console.log("Creating admin user...");
      
      // Create admin user
      const adminUser = await storage.createUser({
        email: "admin@example.com",
        name: "Admin User",
        passwordHash: "admin123", // This will be hashed by the storage layer
      });

      // Create admin profile
      await storage.createProfile({
        id: adminUser.id,
        name: "Admin User",
        email: "admin@example.com",
        status: "approved",
      });

      // Assign admin role
      await storage.assignUserRole({
        userId: adminUser.id,
        role: "admin",
      });

      console.log("Admin user created successfully!");
      console.log("Email: admin@example.com");
      console.log("Password: admin123");
    } else {
      console.log("Admin user already exists");
    }
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}