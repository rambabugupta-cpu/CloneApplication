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
      // If customerId is not provided, get it from the collection
      let customerId = data.customerId;
      if (!customerId && data.collectionId) {
        const { collections } = await import("@shared/schema");
        const collection = await db.select().from(collections).where(eq(collections.id, data.collectionId)).limit(1);
        if (collection.length > 0) {
          customerId = collection[0].customerId;
        }
      }

      const [newCommunication] = await db.insert(communications).values({
        ...data,
        customerId,
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