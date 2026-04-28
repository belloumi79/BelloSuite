import { NextRequest, NextResponse } from 'next/server'
import { getApiContext, parseBody } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { getBankAccounts, createBankAccount, createBankAccountSchema } from '@/services/bank'

// GET /api/commercial/bank/accounts?tenantId=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    const ctx = getApiContext(req, tenantId)
    if (ctx instanceof NextResponse) return ctx

    const accounts = await getBankAccounts(ctx.tenantId)
    return NextResponse.json(accounts)
  } catch (err) {
    return handleApiError(err, 'GET bank accounts')
  }
}

// POST /api/commercial/bank/accounts
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ctx = getApiContext(req, body?.tenantId)
    if (ctx instanceof NextResponse) return ctx

    const data = parseBody(createBankAccountSchema, { ...body, tenantId: ctx.tenantId })
    if (data instanceof NextResponse) return data

    const account = await createBankAccount(data)
    return NextResponse.json(account, { status: 201 })
  } catch (err) {
    return handleApiError(err, 'POST bank account')
  }
}
