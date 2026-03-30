import path from 'node:path'
import type { PrismaConfig } from 'prisma'

export default {
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  migrate: {
    async dev({ schema }) {
      return { url: process.env.DATABASE_URL }
    }
  },
} satisfies PrismaConfig
