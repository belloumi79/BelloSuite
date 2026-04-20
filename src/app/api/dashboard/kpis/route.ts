import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId requis' }, { status: 400 })
    }

    // Parallel queries for performance
    const [
      products,
      clients,
      invoices,
      employees,
      movements,
    ] = await Promise.all([
      prisma.product.findMany({ where: { tenantId } }),
      prisma.client.findMany({ where: { tenantId, isActive: true } }),
      prisma.invoice.findMany({ where: { tenantId } }),
      prisma.employee.findMany({ where: { tenantId } }),
      prisma.stockMovement.findMany({ 
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
    ])

    // Calculate KPIs
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Revenue calculations - Invoice status: ACCEPTED = paid, other = pending
    const acceptedInvoices = invoices.filter(i => i.status === 'ACCEPTED')
    const pendingInvoices = invoices.filter(i => i.status !== 'ACCEPTED' && i.status !== 'CANCELLED')
    const overdueInvoices = invoices.filter(i => {
      if (i.status !== 'ACCEPTED' && i.dueDate) {
        return new Date(i.dueDate) < now
      }
      return false
    })

    const totalRevenue = acceptedInvoices.reduce((sum, i) => sum + Number(i.totalTTC || 0), 0)
    const pendingRevenue = pendingInvoices.reduce((sum, i) => sum + Number(i.totalTTC || 0), 0)
    const overdueAmount = overdueInvoices.reduce((sum, i) => sum + Number(i.totalTTC || 0), 0)

    // Current month revenue
    const currentMonthInvoices = acceptedInvoices.filter(i => i.createdAt >= startOfMonth)
    const lastMonthInvoices = acceptedInvoices.filter(i => 
      i.createdAt >= startOfLastMonth && i.createdAt <= endOfLastMonth
    )
    const currentMonthRevenue = currentMonthInvoices.reduce((sum, i) => sum + Number(i.totalTTC || 0), 0)
    const lastMonthRevenue = lastMonthInvoices.reduce((sum, i) => sum + Number(i.totalTTC || 0), 0)
    const revenueChange = lastMonthRevenue > 0 
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0

    // Stock calculations
    const totalStockValue = products.reduce((sum, p) => {
      return sum + (Number(p.currentStock || 0) * Number(p.purchasePrice || 0))
    }, 0)
    const lowStockProducts = products.filter(p => 
      Number(p.currentStock || 0) <= Number(p.minStock || 0) && Number(p.minStock || 0) > 0
    )
    const outOfStock = products.filter(p => Number(p.currentStock || 0) <= 0)

    // Invoice statistics
    const invoicesThisMonth = invoices.filter(i => i.createdAt >= startOfMonth).length

    // Calculate DSO (Days Sales Outstanding)
    let dso = 0
    if (acceptedInvoices.length > 0) {
      const totalDays = acceptedInvoices.reduce((sum, i) => {
        const created = new Date(i.createdAt)
        return sum + Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
      }, 0)
      dso = Math.round(totalDays / acceptedInvoices.length)
    }

    // Top products by sales
    const productSales: Record<string, number> = {}
    movements.forEach(m => {
      if (m.type === 'EXIT') {
        productSales[m.productId] = (productSales[m.productId] || 0) + Number(m.quantity)
      }
    })
    const topProducts = Object.entries(productSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([productId, quantity]) => {
        const product = products.find(p => p.id === productId)
        return { productId, name: product?.name || 'Unknown', quantity }
      })

    // Recent activity
    const recentMovements = movements.slice(0, 5).map(m => ({
      id: m.id,
      type: m.type,
      quantity: m.quantity,
      productName: products.find(p => p.id === m.productId)?.name || 'Unknown',
      createdAt: m.createdAt,
    }))

    return NextResponse.json({
      totalRevenue: Math.round(totalRevenue),
      currentMonthRevenue: Math.round(currentMonthRevenue),
      lastMonthRevenue: Math.round(lastMonthRevenue),
      revenueChange: Math.round(revenueChange * 10) / 10,
      pendingRevenue: Math.round(pendingRevenue),
      overdueAmount: Math.round(overdueAmount),
      
      totalInvoices: invoices.length,
      paidInvoices: acceptedInvoices.length,
      pendingInvoices: pendingInvoices.length,
      overdueInvoices: overdueInvoices.length,
      invoicesThisMonth,
      dso,
      
      totalProducts: products.length,
      totalStockValue: Math.round(totalStockValue),
      lowStockProducts: lowStockProducts.length,
      outOfStock: outOfStock.length,
      
      totalClients: clients.length,
      totalEmployees: employees.length,
      
      topProducts,
      recentMovements,
    })
  } catch (error) {
    console.error('Dashboard KPI error:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des KPIs' }, { status: 500 })
  }
}