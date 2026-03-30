# BelloSuite ERP - Agent Documentation

## Project Overview
**BelloSuite** is a modular ERP system designed for the Tunisian market.
- **Stack**: Next.js 15, Prisma 7, Supabase (PostgreSQL), TypeScript, Tailwind CSS
- **Repository**: https://github.com/belloumi79/BelloSuite
- **Target**: Tunisian SMEs (PMEs), sold module-by-module

## Architecture

### Multi-Tenant Design
- **Tenant** = Client company (isolated data)
- **TenantModule** = Which modules each tenant has access to
- **User** = Employees belonging to a tenant
- Row-level security via `tenantId` foreign key

### Modules (Development Order)
1. **Stock** (Gestion de stocks) - START HERE
2. Commercial (Client, Supplier, Invoice)
3. Comptabilité (Accounting, Journals)
4. GRH (Employees, Contracts)
5. Paie (Payroll)
6. GPAO (Production)
7. GMAO (Maintenance)
8. GQAO (Quality)
9. Suivi de production
10. ERP Complet (all modules integrated)

### Tech Stack
- **Frontend**: Next.js 15 (App Router), Tailwind CSS, Lucide Icons
- **ORM**: Prisma 7 with adapter-pg
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth (future)
- **Deployment**: Vercel

## Design System

### Colors
```css
--primary: #0D9488 (Teal)
--secondary: #F59E0B (Amber/Gold)
--neutral: Stone scale
```

### Typography
- Headings: Plus Jakarta Sans
- Body: Inter
- Arabic: IBM Plex Sans Arabic
- Mono: JetBrains Mono

## Key Files
- `prisma/schema.prisma` - Database models
- `src/app/(dashboard)/` - Main app pages
- `src/components/ui/` - Reusable UI components
- `AGENTS.md` - This file

## Environment Variables (Vercel)
```
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

## Development Commands
```bash
npm run dev      # Local dev
npm run build   # Production build
npx prisma db push  # Sync schema
```
