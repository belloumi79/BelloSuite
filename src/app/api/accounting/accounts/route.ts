import { requireTenant } from '@/lib/api-auth'
import { NextResponse } from 'next/server'
import { prisma } from "@/lib/db";


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ctx = await requireTenant(request, searchParams.get('tenantId'))
    if (ctx instanceof NextResponse) return ctx
    const tenantId = ctx.tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
    }

    const accounts = await prisma.accountingAccount.findMany({
      where: {
        tenantId,
        isActive: true
      },
      orderBy: {
        accountNumber: 'asc'
      }
    })

    return NextResponse.json(accounts)
  } catch (error: any) {
    console.error('Accounting Accounts Fetch Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
