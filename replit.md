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
- `users`: Core user authentication data
- `profiles`: Extended user information and approval status
- `user_roles`: Role assignments for access control
- `payments`: Payment tracking
- `communications`: Communication logs
- `uploaded_files`: File management
- `excel_data`: Excel data processing

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

## Default Admin Credentials
- Email: admin@example.com
- Password: admin123

## Development Setup
- Run `npm run dev` to start the development server
- Database schema is automatically applied via `npm run db:push`
- Admin user is automatically seeded on first startup

## API Endpoints
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout
- `GET /api/auth/me` - Get current user info
- `GET /api/users/pending` - Get pending user approvals (admin only)
- `POST /api/users/:id/approve` - Approve/reject users (admin only)

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

## User Preferences
- Use TypeScript for all code
- Follow React best practices with hooks
- Use Tailwind CSS for styling
- Prefer server-side logic for security-sensitive operations
- Maintain clean separation between client and server code