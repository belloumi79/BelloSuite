import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  })
}

let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaClient()
} else {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  prisma = globalForPrisma.prisma
}

export { prisma }
