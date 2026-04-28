import { NextRequest, NextResponse } from 'next/server'
import { getApiContext, parseBody } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { getSessions, openSession, openSessionSchema } from '@/services/pos'

// GET /api/pos/sessions
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    const ctx = getApiContext(req, tenantId)
    if (ctx instanceof NextResponse) return ctx

    const sessions = await getSessions(ctx.tenantId)
    return NextResponse.json(sessions)
  } catch (err) {
    return handleApiError(err, 'GET pos sessions')
  }
}

// POST /api/pos/sessions
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ctx = getApiContext(req, body?.tenantId)
    if (ctx instanceof NextResponse) return ctx

    const data = parseBody(openSessionSchema, { ...body, tenantId: ctx.tenantId })
    if (data instanceof NextResponse) return data

    const session = await openSession(data)
    return NextResponse.json(session, { status: 201 })
  } catch (err) {
    return handleApiError(err, 'POST pos sessions')
  }
}
