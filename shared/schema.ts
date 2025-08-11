import { 
  pgTable, 
  text, 
  serial, 
  integer, 
  boolean, 
  timestamp, 
  uuid, 
  jsonb, 
  pgEnum,
  decimal,
  date,
  index
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================
// ENUMS
// ============================================

export const userRoleEnum = pgEnum("user_role", ["owner", "admin", "staff", "customer"]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive", "suspended"]);
export const collectionStatusEnum = pgEnum("collection_status", [
  "pending",
  "partial",
  "paid",
  "overdue",
  "disputed",
  "written_off"
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending_approval",
  "approved",
  "rejected",
  "cancelled"
]);
export const communicationTypeEnum = pgEnum("communication_type", [
  "call",
  "sms",
  "email",
  "whatsapp",
  "visit",
  "letter"
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "payment_reminder",
  "overdue_alert",
  "payment_received",
  "promise_due",
  "escalation"
]);
export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected"
]);

// ============================================
// CORE TABLES
// ============================================

// Users table - handles authentication and basic info
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("customer"),
  status: userStatusEnum("status").notNull().default("active"),
  
  // Profile info
  fullName: text("full_name").notNull(),
  phoneNumber: text("phone_number"),
  alternatePhone: text("alternate_phone"),
  
  // For staff members
  employeeCode: text("employee_code"),
  department: text("department"),
  reportingTo: uuid("reporting_to"),
  
  // Metadata
  lastLoginAt: timestamp("last_login_at"),
  passwordChangedAt: timestamp("password_changed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
  roleIdx: index("users_role_idx").on(table.role),
  statusIdx: index("users_status_idx").on(table.status),
}));

// Customers table - detailed customer information
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  
  // Customer identification
  customerCode: text("customer_code").notNull().unique(), // From Tally
  companyName: text("company_name"),
  gstNumber: text("gst_number"),
  panNumber: text("pan_number"),
  
  // Contact information
  primaryContactName: text("primary_contact_name").notNull(),
  primaryPhone: text("primary_phone").notNull(),
  primaryEmail: text("primary_email"),
  secondaryContactName: text("secondary_contact_name"),
  secondaryPhone: text("secondary_phone"),
  secondaryEmail: text("secondary_email"),
  
  // Address
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  
  // Business info
  creditLimit: integer("credit_limit").default(0), // in paise
  creditDays: integer("credit_days").default(30),
  businessType: text("business_type"),
  
  // Assignment
  assignedTo: uuid("assigned_to").references(() => users.id),
  
  // Metadata
  isActive: boolean("is_active").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  customerCodeIdx: index("customers_code_idx").on(table.customerCode),
  assignedToIdx: index("customers_assigned_idx").on(table.assignedTo),
  phoneIdx: index("customers_phone_idx").on(table.primaryPhone),
}));

// Collections table - outstanding amounts to be collected
export const collections = pgTable("collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  
  // Invoice details
  invoiceNumber: text("invoice_number").notNull(),
  invoiceDate: date("invoice_date").notNull(),
  dueDate: date("due_date").notNull(),
  
  // Amounts (all in paise for precision)
  originalAmount: integer("original_amount").notNull(),
  outstandingAmount: integer("outstanding_amount").notNull(),
  paidAmount: integer("paid_amount").default(0).notNull(),
  
  // Status tracking
  status: collectionStatusEnum("status").default("pending").notNull(),
  agingDays: integer("aging_days").default(0),
  
  // Collection info
  promisedAmount: integer("promised_amount"),
  promisedDate: date("promised_date"),
  lastFollowupDate: timestamp("last_followup_date"),
  nextFollowupDate: timestamp("next_followup_date"),
  
  // Assignment and escalation
  assignedTo: uuid("assigned_to").references(() => users.id),
  escalationLevel: integer("escalation_level").default(0),
  
  // Dispute tracking
  disputeRaisedAt: timestamp("dispute_raised_at"),
  disputeReason: text("dispute_reason"),
  
  // Import tracking
  importBatchId: uuid("import_batch_id"),
  
  // Metadata
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  customerIdx: index("collections_customer_idx").on(table.customerId),
  statusIdx: index("collections_status_idx").on(table.status),
  assignedIdx: index("collections_assigned_idx").on(table.assignedTo),
  invoiceIdx: index("collections_invoice_idx").on(table.invoiceNumber),
  dueDateIdx: index("collections_due_date_idx").on(table.dueDate),
}));

// Payments table - track payment records with approval workflow
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  collectionId: uuid("collection_id").notNull().references(() => collections.id),
  
  // Payment details
  amount: integer("amount").notNull(), // in paise
  paymentDate: date("payment_date").notNull(),
  paymentMode: text("payment_mode").notNull(), // cash, cheque, upi, bank_transfer, etc
  referenceNumber: text("reference_number"),
  bankName: text("bank_name"),
  
  // Approval workflow
  status: paymentStatusEnum("status").default("pending_approval").notNull(),
  recordedBy: uuid("recorded_by").notNull().references(() => users.id),
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  
  // Evidence
  receiptUrl: text("receipt_url"),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  collectionIdx: index("payments_collection_idx").on(table.collectionId),
  statusIdx: index("payments_status_idx").on(table.status),
  recordedByIdx: index("payments_recorded_idx").on(table.recordedBy),
}));

// Communications table - track all customer interactions
export const communications = pgTable("communications", {
  id: uuid("id").primaryKey().defaultRandom(),
  collectionId: uuid("collection_id").notNull().references(() => collections.id),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  
  // Communication details
  type: communicationTypeEnum("type").notNull(),
  direction: text("direction").notNull(), // inbound, outbound
  
  // Content
  subject: text("subject"),
  content: text("content").notNull(),
  
  // Response tracking
  outcome: text("outcome"), // promised_payment, callback_requested, disputed, etc
  promisedAmount: integer("promised_amount"),
  promisedDate: date("promised_date"),
  nextActionRequired: text("next_action_required"),
  nextActionDate: date("next_action_date"),
  
  // User tracking
  createdBy: uuid("created_by").notNull().references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  collectionIdx: index("communications_collection_idx").on(table.collectionId),
  customerIdx: index("communications_customer_idx").on(table.customerId),
  createdByIdx: index("communications_created_idx").on(table.createdBy),
}));

// Import batches table - track Excel imports
export const importBatches = pgTable("import_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // File info
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  
  // Import stats
  totalRecords: integer("total_records").default(0),
  successRecords: integer("success_records").default(0),
  failedRecords: integer("failed_records").default(0),
  
  // Status
  status: text("status").default("processing"), // processing, completed, failed
  errors: jsonb("errors"),
  
  // User tracking
  importedBy: uuid("imported_by").notNull().references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  importedByIdx: index("import_batches_user_idx").on(table.importedBy),
  statusIdx: index("import_batches_status_idx").on(table.status),
}));

// Notifications table - system notifications
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  
  // Related entities
  collectionId: uuid("collection_id").references(() => collections.id),
  paymentId: uuid("payment_id").references(() => payments.id),
  
  // Status
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("notifications_user_idx").on(table.userId),
  readIdx: index("notifications_read_idx").on(table.isRead),
}));

// Audit logs table - track all important actions
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  
  action: text("action").notNull(), // login, payment_approved, collection_updated, etc
  entityType: text("entity_type"), // collection, payment, customer, etc
  entityId: uuid("entity_id"),
  
  // Change tracking
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  
  // Request info
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("audit_logs_user_idx").on(table.userId),
  actionIdx: index("audit_logs_action_idx").on(table.action),
  entityIdx: index("audit_logs_entity_idx").on(table.entityType, table.entityId),
}));

// ============================================
// RELATIONS
// ============================================

export const usersRelations = relations(users, ({ many, one }) => ({
  customers: many(customers),
  collections: many(collections),
  payments: many(payments),
  communications: many(communications),
  notifications: many(notifications),
  auditLogs: many(auditLogs),
  manager: one(users, {
    fields: [users.reportingTo],
    references: [users.id],
  }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  user: one(users, {
    fields: [customers.userId],
    references: [users.id],
  }),
  assignedUser: one(users, {
    fields: [customers.assignedTo],
    references: [users.id],
  }),
  collections: many(collections),
  communications: many(communications),
}));

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  customer: one(customers, {
    fields: [collections.customerId],
    references: [customers.id],
  }),
  assignedUser: one(users, {
    fields: [collections.assignedTo],
    references: [users.id],
  }),
  payments: many(payments),
  communications: many(communications),
  importBatch: one(importBatches, {
    fields: [collections.importBatchId],
    references: [importBatches.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  collection: one(collections, {
    fields: [payments.collectionId],
    references: [collections.id],
  }),
  recordedUser: one(users, {
    fields: [payments.recordedBy],
    references: [users.id],
  }),
  approvedUser: one(users, {
    fields: [payments.approvedBy],
    references: [users.id],
  }),
}));

// ============================================
// TYPE EXPORTS
// ============================================

export type User = typeof users.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Communication = typeof communications.$inferSelect;
export type ImportBatch = typeof importBatches.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;

// ============================================
// INSERT SCHEMAS WITH VALIDATION
// ============================================

export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("Invalid email format"),
  passwordHash: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phoneNumber: z.string().regex(/^[+]?[0-9]{10,15}$/, "Invalid phone number").optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers, {
  customerCode: z.string().min(1, "Customer code is required"),
  primaryContactName: z.string().min(2, "Contact name is required"),
  primaryPhone: z.string().regex(/^[+]?[0-9]{10,15}$/, "Invalid phone number"),
  primaryEmail: z.string().email("Invalid email format").optional(),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GST number").optional(),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN number").optional(),
  pincode: z.string().regex(/^[0-9]{6}$/, "Invalid pincode").optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCollectionSchema = createInsertSchema(collections, {
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  originalAmount: z.number().positive("Amount must be positive"),
  outstandingAmount: z.number().min(0, "Outstanding amount cannot be negative"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments, {
  amount: z.number().positive("Payment amount must be positive"),
  paymentMode: z.string().min(1, "Payment mode is required"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommunicationSchema = createInsertSchema(communications, {
  content: z.string().min(1, "Communication content is required"),
}).omit({
  id: true,
  createdAt: true,
});

export const insertImportBatchSchema = createInsertSchema(importBatches).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

// ============================================
// TYPE EXPORTS FOR INSERT OPERATIONS
// ============================================

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;
export type InsertImportBatch = z.infer<typeof insertImportBatchSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;