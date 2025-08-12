import { Router } from "express";
import { requireAuth, requireStaff } from "../middleware/auth";
import { 
  collectionService, 
  paymentService, 
  customerService,
  auditService 
} from "../storage";
import { z } from "zod";

const router = Router();

// Get all collections with filters
router.get("/api/collections", requireAuth, async (req, res) => {
  try {
    const { status, search } = req.query;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    let collections;
    
    // Staff can only see their assigned collections
    if (userRole === 'staff') {
      collections = await collectionService.getCollectionsForStaff(userId!);
    } else if (userRole === 'customer') {
      // Customers see their own collections
      const customer = await customerService.getAllCustomers({ userId: userId as any });
      if (customer.length > 0) {
        collections = await collectionService.getCollectionsByCustomer(customer[0].id);
      } else {
        collections = [];
      }
    } else {
      // Admin and owner see all
      collections = await collectionService.searchCollections({
        status: status as string,
      });
    }

    // Add customer details to each collection
    const enrichedCollections = await Promise.all(
      collections.map(async (collection: any) => {
        const customer = await customerService.getCustomerById(collection.customerId);
        return {
          ...collection,
          customerName: customer?.primaryContactName || customer?.companyName,
          customerPhone: customer?.primaryPhone,
          customerEmail: customer?.primaryEmail,
        };
      })
    );

    res.json(enrichedCollections);
  } catch (error) {
    console.error("Get collections error:", error);
    res.status(500).json({ error: "Failed to fetch collections" });
  }
});

// Get single collection
router.get("/api/collections/:id", requireAuth, async (req, res) => {
  try {
    const collection = await collectionService.getCollectionById(req.params.id);
    
    if (!collection) {
      return res.status(404).json({ error: "Collection not found" });
    }

    // Add customer details
    const customer = await customerService.getCustomerById(collection.customerId);
    
    res.json({
      ...collection,
      customer,
    });
  } catch (error) {
    console.error("Get collection error:", error);
    res.status(500).json({ error: "Failed to fetch collection" });
  }
});

// Create new collection
router.post("/api/collections", requireStaff, async (req, res) => {
  try {
    const collectionData = req.body;
    
    // Validate customer exists
    const customer = await customerService.getCustomerById(collectionData.customerId);
    if (!customer) {
      return res.status(400).json({ error: "Customer not found" });
    }

    const collection = await collectionService.createCollection({
      ...collectionData,
      assignedTo: req.user?.id,
    });

    // Log action
    await auditService.logAction({
      userId: req.user!.id,
      action: "collection_created",
      entityType: "collection",
      entityId: collection.id,
      newValue: collection,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(201).json(collection);
  } catch (error) {
    console.error("Create collection error:", error);
    res.status(500).json({ error: "Failed to create collection" });
  }
});

// Update collection
router.put("/api/collections/:id", requireStaff, async (req, res) => {
  try {
    const collectionId = req.params.id;
    const updateData = req.body;

    const existing = await collectionService.getCollectionById(collectionId);
    if (!existing) {
      return res.status(404).json({ error: "Collection not found" });
    }

    const updated = await collectionService.updateCollection(collectionId, updateData);

    // Log action
    await auditService.logAction({
      userId: req.user!.id,
      action: "collection_updated",
      entityType: "collection",
      entityId: collectionId,
      oldValue: existing,
      newValue: updated,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json(updated);
  } catch (error) {
    console.error("Update collection error:", error);
    res.status(500).json({ error: "Failed to update collection" });
  }
});

// Record payment for collection
router.post("/api/collections/:id/payments", requireStaff, async (req, res) => {
  try {
    const collectionId = req.params.id;
    const paymentData = req.body;

    const collection = await collectionService.getCollectionById(collectionId);
    if (!collection) {
      return res.status(404).json({ error: "Collection not found" });
    }

    const payment = await paymentService.recordPayment({
      ...paymentData,
      collectionId,
      recordedBy: req.user!.id,
      paymentDate: paymentData.paymentDate || new Date().toISOString().split('T')[0],
    });

    res.status(201).json(payment);
  } catch (error) {
    console.error("Record payment error:", error);
    res.status(500).json({ error: "Failed to record payment" });
  }
});

// Get payments for collection
router.get("/api/collections/:id/payments", requireAuth, async (req, res) => {
  try {
    const payments = await paymentService.getPaymentsByCollection(req.params.id);
    res.json(payments);
  } catch (error) {
    console.error("Get payments error:", error);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

// Add communication log
router.post("/api/collections/:id/communications", requireStaff, async (req, res) => {
  try {
    const { db } = await import("../db");
    const { communications } = await import("@shared/schema");
    
    const [communication] = await db.insert(communications).values({
      ...req.body,
      collectionId: req.params.id,
      createdBy: req.user!.id,
    }).returning();

    // If there's a promised payment, update the collection
    if (req.body.promisedAmount && req.body.promisedDate) {
      await collectionService.updatePromise(
        req.params.id,
        req.body.promisedAmount,
        new Date(req.body.promisedDate)
      );
    }

    res.status(201).json(communication);
  } catch (error) {
    console.error("Add communication error:", error);
    res.status(500).json({ error: "Failed to add communication" });
  }
});

// Get communication logs
router.get("/api/collections/:id/communications", requireAuth, async (req, res) => {
  try {
    const { db } = await import("../db");
    const { communications } = await import("@shared/schema");
    const { eq, desc } = await import("drizzle-orm");
    
    const logs = await db.select()
      .from(communications)
      .where(eq(communications.collectionId, req.params.id))
      .orderBy(desc(communications.createdAt));
    
    res.json(logs);
  } catch (error) {
    console.error("Get communications error:", error);
    res.status(500).json({ error: "Failed to fetch communications" });
  }
});

export { router as collectionRoutes };