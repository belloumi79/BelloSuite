import { NextRequest, NextResponse } from 'next/server'
import { getApiContext, parseBody } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { getClients, createClient, createClientSchema } from '@/services/clients'

// GET /api/commercial/clients?tenantId=&activeOnly=true
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    const ctx = getApiContext(req, tenantId)
    if (ctx instanceof NextResponse) return ctx

    const activeOnly = searchParams.get('activeOnly') === 'true'
    const clients = await getClients(ctx.tenantId, activeOnly)
    return NextResponse.json(clients)
  } catch (err) {
    return handleApiError(err, 'GET clients')
  }
}

// POST /api/commercial/clients
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const ctx = getApiContext(req, body?.tenantId)
    if (ctx instanceof NextResponse) return ctx

    const data = parseBody(createClientSchema, { ...body, tenantId: ctx.tenantId })
    if (data instanceof NextResponse) return data

    const client = await createClient(data)
    return NextResponse.json(client, { status: 201 })
  } catch (err) {
    return handleApiError(err, 'POST client')
  }
}
