import { db } from "../db";
import { communications } from "@shared/schema";
import { eq } from "drizzle-orm";

export const communicationService = {
  async getCommunicationsByCollection(collectionId: string) {
    try {
      const result = await db.select().from(communications).where(eq(communications.collectionId, collectionId));
      return result;
    } catch (error) {
      console.error("Error fetching communications:", error);
      return [];
    }
  },

  async createCommunication(data: any) {
    try {
      const [newCommunication] = await db.insert(communications).values({
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date(),
      }).returning();
      return newCommunication;
    } catch (error) {
      console.error("Error creating communication:", error);
      throw error;
    }
  }
};