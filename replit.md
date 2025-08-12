# Collection Management System

## Overview

This project is a Collection Management System built with React, TypeScript, and Supabase. It features a comprehensive user authentication and role-based access control system with admin approval workflow. The application provides a clean, modern interface using Shadcn/UI components and Tailwind CSS for styling.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development practices
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: Shadcn/UI components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **State Management**: React Query (TanStack Query) for server state management
- **Routing**: React Router for client-side navigation with protected routes

### Authentication & Authorization
- **Authentication Provider**: Supabase Auth with email/password authentication
- **Session Management**: Persistent sessions with automatic token refresh
- **Authorization Pattern**: Role-based access control (RBAC) with admin and employee roles
- **User Approval Workflow**: Three-tier system with pending, approved, and rejected user states
- **Protected Routes**: Route-level protection requiring authentication and appropriate permissions

### Component Architecture
- **Design System**: Comprehensive UI component library based on Shadcn/UI
- **Theme Support**: Built-in dark/light mode support using next-themes
- **Responsive Design**: Mobile-first approach with responsive breakpoints
- **Component Composition**: Reusable components following atomic design principles

### Form Handling
- **Form Library**: React Hook Form with Zod resolvers for validation
- **Input Components**: Custom form components with built-in validation states
- **Error Handling**: Centralized error handling with toast notifications

### Data Layer
- **Database**: Supabase (PostgreSQL) with real-time capabilities
- **ORM**: Direct Supabase client with TypeScript type generation
- **Caching**: React Query for intelligent caching and synchronization
- **Real-time Updates**: Supabase subscriptions for live data updates

## External Dependencies

### Core Services
- **Supabase**: Backend-as-a-Service providing authentication, database, and real-time subscriptions
- **Resend**: Email service for transactional emails including user approval notifications

### Development Tools
- **TypeScript**: Static type checking with relaxed configuration for development speed
- **ESLint**: Code linting with React and TypeScript rules
- **Lovable**: Development platform integration for collaborative coding

### UI & Styling Libraries
- **Radix UI**: Headless UI primitives for accessibility and composability
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for consistent iconography
- **Embla Carousel**: Carousel component for image galleries
- **Date-fns**: Date manipulation utilities

### Utility Libraries
- **Class Variance Authority**: Type-safe CSS class composition
- **CLSX**: Conditional className utility
- **CMDK**: Command palette component for improved UX

### Database Schema
The application uses a multi-table structure including:
- **User Profiles**: Extended user information with approval status
- **User Roles**: Role assignment system for access control
- **Communications**: Email tracking and audit trail
- **Collections**: Core business entities for collection management