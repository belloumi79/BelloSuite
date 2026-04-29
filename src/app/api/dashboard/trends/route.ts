import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')
    const period = searchParams.get('period') || '6m' // 1m, 3m, 6m, 1y

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId requis' }, { status: 400 })
    }

    // Calculate date range
    const now = new Date()
    let startDate: Date
    switch (period) {
      case '1m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        break
      case '3m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        break
      case '6m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1)
        break
      case '1y':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1)
    }

    // Get invoices in date range
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        status: 'ACCEPTED',
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      select: {
        createdAt: true,
        totalTTC: true,
        number: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // Format data for chart: monthly aggregation
    const monthlyData: Array<{ month: string; revenue: number; invoices: number }> = []
    invoices.forEach(inv => {
      const date = new Date(inv.createdAt)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const existing = monthlyData.find(d => d.month === monthKey)
      if (existing) {
        existing.revenue += Number(inv.totalTTC || 0)
        existing.invoices += 1
      } else {
        monthlyData.push({
          month: monthKey,
          revenue: Number(inv.totalTTC || 0),
          invoices: 1,
        })
      }
    })

    // Sort by month
    monthlyData.sort((a, b) => a.month.localeCompare(b.month))

    // Get top products by sales in period
    const movements = await prisma.stockMovement.findMany({
      where: {
        tenantId,
        type: 'EXIT',
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const productSales: Record<string, { name: string; quantity: number }> = {}
    movements.forEach(m => {
      const productId = m.product.id
      if (!productId) return
      if (!productSales[productId]) {
        productSales[productId] = { name: m.product.name, quantity: 0 }
      }
      productSales[productId].quantity += Number(m.quantity)
    })

    const topProducts = Object.entries(productSales)
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, 5)
      .map(([id, data]) => ({
        id,
        name: data.name,
        quantity: Math.round(data.quantity),
      }))

    return NextResponse.json({
      period,
      monthlyData,
      topProducts,
    })
  } catch (error) {
    console.error('Trend data error:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des données de tendance' }, { status: 500 })
  }
}