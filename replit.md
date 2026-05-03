# DR Travel - Travel Booking Platform

## Overview

DR Travel is a professional travel booking platform specializing in Yacht Tourism and Safari experiences in Marsa Matrouh. The project aims to provide a comprehensive solution for customers to browse and book travel packages through a public-facing website, while administrators can manage content and bookings via a dedicated admin dashboard. The platform is built with a focus on user experience, robust backend services, and a scalable architecture to support future growth in the travel industry.

## User Preferences

- The agent should prioritize high-level descriptions over granular implementation details.
- Avoid including changelogs, update logs, or date-specific entries.
- Consolidate redundant information and eliminate repetition.
- Focus on architectural decisions and core features.
- External dependencies should only include those actively integrated into the project.

## System Architecture

The project utilizes a `pnpm` monorepo structure, separating concerns into distinct packages:

- **Frontend (`artifacts/dr-travel`):** Developed with React 19, Vite v7, TypeScript, Tailwind CSS v4, Radix UI, TanStack Query, and Wouter. It serves both the public website and the admin panel.
  - **UI/UX:** Adheres to a dark navy, gold, and blue palette. Components are designed for responsiveness and accessibility.
  - **Localization:** Supports Arabic and English with RTL (Right-to-Left) for Arabic.
  - **Performance:** Admin-specific pages are lazy-loaded with `React.lazy` and `Suspense` to optimize public bundle size. Dynamic imports are used for large libraries like `jspdf` to reduce initial load.
  - **SEO:** Implements `react-helmet-async` for managing `SeoHead` components, enabling canonical URLs, hreflang, OpenGraph, and Twitter card metadata.
- **Backend API (`artifacts/api-server`):** Built with Node.js 20, Express v5, and TypeScript. It provides a RESTful API for all platform functionalities.
  - **Security:** Implements `helmet` for security headers, CORS allowlisting, `express-rate-limit` for API throttling, and robust input validation.
  - **Proxying:** The Express server acts as a unified gateway, handling `/api/*` requests and proxying all other requests to the Vite development server for seamless HMR in the Replit environment.
  - **Booking Integrity:** Server-side validation discards client-supplied prices, using database-resolved package prices. Implements 5-minute idempotency for bookings to prevent duplicates.
  - **Ticket Security:** Features anti-counterfeit measures including formatted ticket numbers with checksums, HMAC-SHA256 signatures, public verification endpoints, and visual security elements (guilloche patterns, microtext, watermarks).
  - **Data Privacy:** Customer phone numbers are redacted for non-admin requests to `/api/tickets/:token`.
- **Database Layer (`lib/db`):** Shared PostgreSQL database with Drizzle ORM for schema management and interaction.
  - **Atomicity:** Critical operations like settings updates and booking status changes are wrapped in Drizzle transactions to ensure data consistency.
- **API Specification (`lib/api-spec`):** OpenAPI YAML spec serves as the single source of truth for API definitions.
- **Generated Clients:**
  - `lib/api-client-react`: Generated React Query hooks for frontend-backend communication.
  - `lib/api-zod`: Generated Zod validation schemas for robust type checking.
- **Core Features:**
  - Travel packages browsing, booking, and management.
  - CRUD operations for services, categories, hero sliders, testimonials, and bookings.
  - Advanced rich features editor for services, allowing visual customization without code changes.
  - Abandoned booking recovery system with WhatsApp integration.
  - AI Quiz/Recommender for personalized travel package suggestions.
  - Client-side revenue forecasting for administrators.
  - Customer trip photos upload and moderation with public display.
  - Referral reward system and push notifications (VAPID).
  - Anti-Fake Branded Tickets with robust security features and verification.

## External Dependencies

- **Database:** Supabase PostgreSQL with Drizzle ORM.
- **Authentication:** JWT with `bcryptjs`.
- **Storage:** Google Cloud Storage (with a local fallback mechanism).
- **API Codegen:** Orval (used to generate API clients from OpenAPI spec).
- **Push Notifications:** VAPID (used for web push notifications).
- **AI Integration:** Implements basic prompt injection detection for AI chat.