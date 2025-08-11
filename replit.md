# RBG Infra Developers LLP - Collection Management System

## Overview
A comprehensive collection management system designed for RBG Infra Developers LLP. The system automates the sundry debtors collection process with full transparency, enabling owners to monitor staff activities and track collection performance without manual intervention. Built for 1000+ users with real-time updates and high security.

## Architecture
- **Frontend**: React with TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with TypeScript, Service Layer Architecture
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based authentication with bcrypt password hashing
- **Real-time**: WebSocket support for live updates
- **Security**: Role-based access control, audit logging, approval workflows
- **Integration**: Excel import with validation and matching

## Key Features

### Core Functionality
- **Excel Integration**: Direct Excel import from accounting software for sundry debtors
- **Automated Collection Process**: Streamlined workflow from import to collection
- **Real-time Monitoring**: Track staff activities and collection progress live
- **Approval Workflow**: Admin approval required for all payment recordings
- **Customer Portal**: Separate access for customers to view their outstanding amounts

### User Roles & Permissions
- **Owner**: Full system access, all reports, approval authority
- **Admin**: User management, payment approvals, system configuration
- **Staff**: Record collections, customer communication, follow-ups
- **Customer**: View outstanding amounts, payment history

### Collection Management
- Automatic customer matching during Excel import
- Flexible column mapping for various Excel formats
- Outstanding amount tracking with aging analysis
- Payment promise tracking and reminders
- Escalation levels for overdue collections

### Security & Compliance
- High-level security with bcrypt password hashing
- Complete audit trail for all actions
- Role-based access control (RBAC)
- Session-based authentication
- IP tracking and rate limiting

### Reporting & Analytics
- Outstanding amount reports by customer
- Collection performance metrics
- Staff productivity tracking
- Payment trend analysis
- Aging analysis reports
- Promise vs actual payment tracking

## Database Schema
- `users`: Core user authentication data (UUID, email, fullName, password_hash, role, status)
- `customers`: Detailed customer information with accounting codes, GST, contact details
- `collections`: Outstanding amounts to be collected (invoices, amounts, status, aging)
- `payments`: Payment tracking with approval workflow (pending/approved/rejected)
- `communications`: All customer interactions (calls, emails, SMS, visits)
- `import_batches`: Excel import tracking and validation
- `notifications`: System notifications for staff and admins
- `audit_logs`: Complete audit trail for all actions
- `session`: PostgreSQL session store for authentication

## Migration Details
**Date**: August 10, 2025
**From**: Lovable (Supabase-based)
**To**: Replit PostgreSQL with Drizzle

### Changes Made:
- Replaced Supabase authentication with custom session-based auth
- Migrated database from Supabase to Replit PostgreSQL
- Updated all client-side code to use REST API instead of Supabase client
- Implemented secure password hashing with bcrypt
- Created admin user seeding functionality
- Removed all Supabase dependencies and configurations

## Demo User Credentials
**Admin User:**
- Email: admin@example.com
- Password: admin123

**Employee User:**
- Email: employee@example.com  
- Password: employee123

**Customer User:**
- Email: customer@example.com
- Password: customer123

**Pending User (for approval demo):**
- Email: pending@example.com
- Password: pending123

## Development Setup
- Run `npm run dev` to start the development server
- Database schema is automatically applied via `npm run db:push`
- Admin user is automatically seeded on first startup

## API Endpoints
**Authentication:**
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout
- `GET /api/auth/me` - Get current user info

**User Management:**
- `GET /api/users/pending` - Get pending user approvals (admin only)
- `POST /api/users/:id/approve` - Approve/reject users (admin only)

**Collections Management:**
- `GET /api/collections` - Get all collection records
- `GET /api/collections/:id` - Get specific collection
- `POST /api/collections` - Create new collection record
- `PUT /api/collections/:id` - Update collection record

**Payments:**
- `GET /api/collections/:id/payments` - Get payments for a collection
- `POST /api/collections/:id/payments` - Record new payment

**Communications:**
- `GET /api/collections/:id/communications` - Get communication logs
- `POST /api/collections/:id/communications` - Add communication log

**Analytics:**
- `GET /api/dashboard/stats` - Get dashboard statistics and trends

## Security Features
- Password hashing with bcrypt (12 rounds)
- Session-based authentication
- Role-based authorization middleware
- SQL injection protection via Drizzle ORM
- Input validation with Zod schemas

## Recent Changes
- **2025-08-11**: Rebranded application from "Tally Collections Management System" to "RBG Infra Developers LLP"
- **2025-08-10**: Successfully completed migration from Lovable to Replit
- **2025-08-10**: Implemented new authentication system replacing Supabase
- **2025-08-10**: Added database seeding for admin user creation
- **2025-08-10**: Migrated user approval system to use REST API
- **2025-08-10**: Implemented full collection management system with comprehensive features:
  - Complete Dashboard with real-time analytics and charts
  - Collections management with CRUD operations
  - Payment tracking and recording
  - Communication logs for customer interactions
  - Role-based navigation and access control
  - Database schema with collections, payments, and communications tables
  - Comprehensive seed data with demo users and realistic collection records
  - Responsive navigation with theme switching
  - Professional UI with shadcn/ui components and Recharts analytics

## User Preferences
- Use TypeScript for all code
- Follow React best practices with hooks
- Use Tailwind CSS for styling
- Prefer server-side logic for security-sensitive operations
- Maintain clean separation between client and server code