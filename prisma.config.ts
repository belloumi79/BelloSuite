import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:BelloSuite2026%40%21@db.guhwnihenpqoxcugtkyr.supabase.co:5432/postgres',
  },
  migrate: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:BelloSuite2026%40%21@db.guhwnihenpqoxcugtkyr.supabase.co:5432/postgres',
  },
})
