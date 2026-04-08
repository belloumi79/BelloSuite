import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1

    const [
      totalEmployees,
      activeEmployees,
      pendingAbsences,
      pendingPayslips,
      latestPayslips,
    ] = await Promise.all([
      prisma.employee.count({ where: { tenantId } }),
      prisma.employee.count({ where: { tenantId, isActive: true } }),
      prisma.absence.count({ where: { tenantId, statut: 'EN_ATTENTE' } }),
      prisma.paySlip.count({ where: { tenantId, annee: currentYear, mois: currentMonth, statut: 'PENDING' } }),
      prisma.paySlip.findMany({
        where: { tenantId },
        include: { employee: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    // Masse salariale du mois
    const monthPayslips = await prisma.paySlip.findMany({
      where: { tenantId, annee: currentYear, mois: currentMonth },
      select: { brutGlobal: true, netAPayer: true, irpp: true },
    })

    const masseSalariale = monthPayslips.reduce((sum, p) => sum + Number(p.brutGlobal), 0)
    const netAPayer = monthPayslips.reduce((sum, p) => sum + Number(p.netAPayer), 0)
    const totalIRPP = monthPayslips.reduce((sum, p) => sum + Number(p.irpp), 0)

    return NextResponse.json({
      totalEmployees,
      activeEmployees,
      pendingAbsences,
      pendingPayslips,
      latestPayslips,
      masseSalariale,
      netAPayer,
      totalIRPP,
      currentMonth,
      currentYear,
    })
  } catch (error) {
    console.error('Error fetching HR dashboard:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
