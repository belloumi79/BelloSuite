# Production Deployment Guide

## Vercel Deployment
1. Connect GitHub repo to Vercel dashboard
2. Set environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL` (prod)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (prod)
   - `DATABASE_URL` (prod)
   - `DIRECT_URL` (prod)
   - `REDIS_URL` (if using Redis)
   - `SENTRY_DSN` (if using Sentry)

3. Enable automatic deployments on push to main

## Supabase Production
1. Create production project on Supabase
2. Run migrations: `npx prisma migrate deploy`
3. Seed data: `npx prisma db seed`
4. Enable backups in Supabase dashboard

## SSL Certificate
- Vercel provides automatic SSL certificates
- Custom domain: Add domain in Vercel settings

## Monitoring
- Sentry: Configure DSN in environment variables
- Vercel Analytics: Enabled by default

## Backups
- Database: Supabase automatic daily backups
- Files: Vercel handles static assets
- Code: GitHub repository