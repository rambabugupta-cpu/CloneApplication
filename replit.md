# Collection Management System

## Overview
A full-stack web application for managing collections, user authentication, and administrative functions. Successfully migrated from Lovable (Supabase) to Replit's environment using PostgreSQL with Drizzle ORM.

## Architecture
- **Frontend**: React with TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based authentication with bcrypt password hashing
- **Routing**: React Router DOM on frontend, Express routes on backend

## Key Features
- User registration and authentication
- Role-based access control (admin, employee, customer)
- User approval workflow for new registrations
- Protected routes and admin panels
- Responsive UI with dark/light theme support

## Database Schema
- `users`: Core user authentication data (id, email, name, password_hash)
- `profiles`: Extended user information and approval status
- `user_roles`: Role assignments for access control (admin, employee, customer)
- `collections`: Main collection records (invoices, amounts, customer info, status, priority)
- `payments`: Payment tracking and history (amount, method, date, reference)
- `communications`: Communication logs (emails, calls, outcomes, next actions)
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