import { NextResponse } from 'next/server'
import { postAmortizationToAccounting } from '@/services/accounting'

// Amortize fixed assets for a given month/year

export async function POST(req: Request) {
  try {
    const { tenantId, month, year } = await req.json()

    if (!tenantId || month === undefined || year === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, month, year' },
        { status: 400 }
      )
    }

    // Validate month and year
    if (month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Month must be between 1 and 12' },
        { status: 400 }
      )
    }

    if (year < 1900 || year > 2100) {
      return NextResponse.json(
        { error: 'Year must be between 1900 and 2100' },
        { status: 400 }
      )
    }

    const entry = await postAmortizationToAccounting(month, year, tenantId)

    return NextResponse.json(entry, { status: 201 })
  } catch (error: any) {
    console.error('Error posting amortization:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to post amortization' },
      { status: 500 }
    )
  }
}