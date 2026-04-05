import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

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
