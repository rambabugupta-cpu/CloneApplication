import { db } from "../db";
import { communications } from "@shared/schema";
import { eq } from "drizzle-orm";

export const communicationService = {
  async getCommunicationById(id: string) {
    try {
      const [communication] = await db.select().from(communications).where(eq(communications.id, id)).limit(1);
      return communication;
    } catch (error) {
      console.error("Error fetching communication:", error);
      return undefined;
    }
  },

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

      // Ensure dates are properly formatted
      const communicationData = {
        collectionId: data.collectionId,
        customerId: customerId,
        type: data.type as any, // Ensure enum type is accepted
        direction: data.direction,
        subject: data.subject || null,
        content: data.content,
        outcome: data.outcome || null,
        promisedAmount: data.promisedAmount ? parseInt(data.promisedAmount) : null,
        promisedDate: data.promisedDate || null,
        nextActionRequired: data.nextActionRequired || null,
        nextActionDate: data.nextActionDate || null,
        createdBy: data.createdBy,
        id: crypto.randomUUID(),
        createdAt: new Date(),
      };

      console.log("Inserting communication data:", JSON.stringify(communicationData, null, 2));

      const [newCommunication] = await db.insert(communications).values(communicationData).returning();
      return newCommunication;
    } catch (error) {
      console.error("Error creating communication:", error);
      throw error;
    }
  }
};