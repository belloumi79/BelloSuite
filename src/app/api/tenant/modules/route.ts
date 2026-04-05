import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json([], { status: 200 })
    }

    const tenantModules = await prisma.tenantModule.findMany({
      where: { tenantId, isEnabled: true },
      include: { module: true }
    })

    const moduleNames = tenantModules.map(tm => tm.module.name.toLowerCase())
    return NextResponse.json(moduleNames)
  } catch (error) {
    console.error('Error fetching tenant modules:', error)
    return NextResponse.json([], { status: 200 })
  }
}
