import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { collectionService, paymentService, customerService } from "../storage";
import type { Customer } from "../../shared/schema";

const router = Router();

// Get dashboard statistics
router.get("/api/dashboard/stats", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // Get overall collection stats
    const collectionStats = await collectionService.getDashboardStats();

    // Get payment stats
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const paymentStats = await paymentService.getPaymentStats({
      fromDate: startOfMonth,
      toDate: endOfMonth,
    });

    // Get customer counts
    const customers = await customerService.getAllCustomers();
    const activeCustomers = customers.filter((c: Customer) => c.isActive).length;

    // Get aging analysis
    const collections = await collectionService.searchCollections({});
    
    let aging030 = 0;
    let aging3160 = 0;
    let aging6190 = 0;
    let aging90plus = 0;
    let overdueAmount = 0;
    let overdueCount = 0;
    let pendingCount = 0;
    let partialCount = 0;
    let paidCount = 0;

    collections.forEach((collection: any) => {
      const aging = collection.agingDays || 0;
      const amount = collection.outstandingAmount || 0;

      if (aging <= 30) aging030 += amount;
      else if (aging <= 60) aging3160 += amount;
      else if (aging <= 90) aging6190 += amount;
      else aging90plus += amount;

      if (collection.status === 'overdue') {
        overdueCount++;
        overdueAmount += amount;
      } else if (collection.status === 'pending') {
        pendingCount++;
      } else if (collection.status === 'partial') {
        partialCount++;
      } else if (collection.status === 'paid') {
        paidCount++;
      }
    });

    // Calculate collection progress (for staff)
    let targetProgress = 0;
    let monthlyTarget = 5000000; // 50 lakhs target
    let monthlyAchieved = paymentStats.totalCollected;
    
    if (monthlyTarget > 0) {
      targetProgress = Math.min(100, (monthlyAchieved / monthlyTarget) * 100);
    }

    // Get today's and weekly collections
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));
    const weekStart = new Date(today.setDate(today.getDate() - 7));

    const todayStats = await paymentService.getPaymentStats({
      fromDate: todayStart,
      toDate: todayEnd,
    });

    const weekStats = await paymentService.getPaymentStats({
      fromDate: weekStart,
      toDate: todayEnd,
    });

    const stats = {
      // Overall stats
      totalOutstanding: collectionStats.totalOutstanding,
      totalCollected: collectionStats.totalCollected,
      totalCount: collectionStats.totalCount,
      collectionRate: collectionStats.collectionRate,
      
      // Status counts
      overdueCount,
      overdueAmount,
      pendingCount,
      partialCount,
      paidCount,
      
      // Customer stats
      totalCustomers: customers.length,
      activeCustomers,
      
      // Aging analysis
      aging030,
      aging3160,
      aging6190,
      aging90plus,
      
      // Progress tracking
      monthlyTarget,
      monthlyAchieved,
      targetProgress,
      todayCollections: todayStats.approvedCount,
      weeklyCollections: weekStats.approvedCount,
      monthlyCollections: paymentStats.approvedCount,
      
      // Payment stats
      pendingApprovals: paymentStats.pendingCount,
    };

    res.json(stats);
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard statistics" });
  }
});

// Get collection trends (monthly data for charts)
router.get("/api/dashboard/trends", requireAuth, async (req, res) => {
  try {
    // This would typically fetch real data from the database
    // For now, returning sample data
    const trends = {
      monthly: [
        { month: 'Jan', collected: 2500000, outstanding: 4500000 },
        { month: 'Feb', collected: 3200000, outstanding: 4200000 },
        { month: 'Mar', collected: 2800000, outstanding: 4800000 },
        { month: 'Apr', collected: 3500000, outstanding: 3900000 },
        { month: 'May', collected: 4100000, outstanding: 3500000 },
        { month: 'Jun', collected: 3800000, outstanding: 3200000 },
      ],
    };

    res.json(trends);
  } catch (error) {
    console.error("Trends error:", error);
    res.status(500).json({ error: "Failed to fetch trends" });
  }
});

export { router as dashboardRoutes };