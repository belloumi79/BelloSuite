import { NextRequest, NextResponse } from 'next/server'
import { getApiContext, parseBody } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { getJournals, createJournalEntry, journalEntrySchema } from '@/services/accounting'

// GET /api/accounting/journals
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    const ctx = getApiContext(req, tenantId)
    if (ctx instanceof NextResponse) return ctx

    const journals = await getJournals(ctx.tenantId)
    return NextResponse.json(journals)
  } catch (err) {
    return handleApiError(err, 'GET journals')
  }
}

// POST /api/accounting/journals/entries
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ctx = getApiContext(req, body?.tenantId)
    if (ctx instanceof NextResponse) return ctx

    const data = parseBody(journalEntrySchema, { ...body, tenantId: ctx.tenantId })
    if (data instanceof NextResponse) return data

    const entry = await createJournalEntry(data)
    return NextResponse.json(entry, { status: 201 })
  } catch (err) {
    return handleApiError(err, 'POST journal entry')
  }
}
