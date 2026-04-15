/**
 * POST /api/cron/reminders
 * Called by n8n (or any cron) every day at 8h AM.
 * Body: { tenantId, overdueDaysThreshold?, methods? }
 * Or: GET /api/cron/reminders?tenantId=&cronSecret=
 *
 * Setup in n8n:
 *   - Trigger: Schedule (cron) → Every day at 8:00 AM
 *   - Action: HTTP Request → POST this endpoint
 *   - Auth: pass cronSecret header
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendAutoReminders } from '@/lib/reminder-service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { tenantId, overdueDaysThreshold = 1, methods = ['EMAIL', 'WHATSAPP'] } = body

    if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })

    const result = await sendAutoReminders(tenantId, { overdueDaysThreshold, methods })
    return NextResponse.json({ success: true, ...result, at: new Date().toISOString() })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenantId')
  const cronSecret = searchParams.get('cronSecret')

  // Basic secret check (use real secret in production)
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!tenantId) {
    // Run for ALL tenants with active follow-ups
    const tenants = await prisma.tenant.findMany({ where: { isActive: true }, select: { id: true } })
    const results = await Promise.allSettled(
      tenants.map(t => sendAutoReminders(t.id, { overdueDaysThreshold: 1 }))
    )
    const summary = results.map((r, i) => ({
      tenantId: tenants[i].id,
      status: r.status === 'fulfilled' ? 'ok' : 'error',
      ...(r.status === 'fulfilled' ? r.value : { error: String(r.reason) }),
    }))
    return NextResponse.json({ summary, at: new Date().toISOString() })
  }

  const result = await sendAutoReminders(tenantId, { overdueDaysThreshold: 1 })
  return NextResponse.json({ success: true, ...result, at: new Date().toISOString() })
}
