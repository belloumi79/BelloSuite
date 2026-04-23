import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const checks = { database: false, timestamp: new Date().toISOString() }
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = true
    return NextResponse.json({ status: 'healthy', checks }, { status: 200 })
  } catch {
    return NextResponse.json({ status: 'unhealthy', checks }, { status: 503 })
  }
}
