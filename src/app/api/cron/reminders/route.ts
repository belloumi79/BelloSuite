/**
 * POST /api/cron/reminders
 * Called by n8n (or any cron) every day at 8h AM.
 * Body: { tenantId, overdueDaysThreshold?, methods? }
 * Or: GET /api/cron/reminders?tenantId=   (sans tenantId : tous les tenants actifs)
 *
 * SÉCURITÉ : en-tête obligatoire `Authorization: Bearer <CRON_SECRET>` (format Vercel Cron)
 * ou `x-cron-secret: <CRON_SECRET>`. Plus de secret dans l'URL.
 *
 * Setup in n8n:
 *   - Trigger: Schedule (cron) → Every day at 8:00 AM
 *   - Action: HTTP Request → POST this endpoint
 *   - Auth: header Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendAutoReminders } from '@/lib/reminder-service'
import { checkCronSecret } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  const denied = checkCronSecret(req)
  if (denied) return denied
  try {
    const body = await req.json().catch(() => ({}))
    const { tenantId, overdueDaysThreshold = 1, methods = ['EMAIL', 'WHATSAPP'] } = body

    if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })

    const result = await sendAutoReminders(tenantId, { overdueDaysThreshold, methods })
    return NextResponse.json({ success: true, ...result, at: new Date().toISOString() })
  } catch (e: any) {
    console.error('cron reminders error:', e)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const denied = checkCronSecret(req)
  if (denied) return denied
  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenantId')

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
