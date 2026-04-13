import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/commercial/asp-config?tenantId=
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')
    if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })

    const config = await prisma.aSPConfiguration.findUnique({ where: { tenantId } })
    if (!config) return NextResponse.json(null, { status: 200 }) // null = not configured
    return NextResponse.json({
      id: config.id,
      provider: config.provider,
      isActive: config.isActive,
      sftpEndpoint: config.sftpEndpoint,
      webhookSecret: config.webhookSecret ? '***configured***' : '',
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST /api/commercial/asp-config
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { tenantId, provider, apiKey, apiSecret, sftpUsername, sftpPassword, sftpEndpoint, webhookSecret, isActive } = body

    if (!tenantId || !provider) {
      return NextResponse.json({ error: 'tenantId and provider required' }, { status: 400 })
    }

    const config = await prisma.aSPConfiguration.upsert({
      where: { tenantId },
      create: {
        tenantId,
        provider,
        apiKey: apiKey || '',
        apiSecret: apiSecret || '',
        sftpUsername: sftpUsername || '',
        sftpPassword: sftpPassword || '',
        sftpEndpoint: sftpEndpoint || '',
        webhookSecret: webhookSecret || '',
        isActive: isActive || false,
      },
      update: {
        provider,
        apiKey: apiKey || '',
        apiSecret: apiSecret || '',
        sftpUsername: sftpUsername || '',
        sftpPassword: sftpPassword || '',
        sftpEndpoint: sftpEndpoint || '',
        webhookSecret: webhookSecret || '',
        isActive: isActive || false,
      },
    })

    return NextResponse.json({
      id: config.id,
      provider: config.provider,
      isActive: config.isActive,
      sftpEndpoint: config.sftpEndpoint,
      webhookSecret: config.webhookSecret ? '***configured***' : '',
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
