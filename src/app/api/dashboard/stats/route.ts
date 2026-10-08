import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireTenant } from '@/lib/api-auth'

// GET /api/dashboard/stats — compteurs du tableau de bord (remplace les lectures Supabase côté client
// avec la clé anon, incompatibles avec la RLS « deny by default »).
export async function GET(req: NextRequest) {
  const ctx = await requireTenant(req, new URL(req.url).searchParams.get('tenantId'))
  if (ctx instanceof NextResponse) return ctx
  const tenantId = ctx.tenantId
  try {
    const [products, invoices, totalClients, totalEmployees] = await Promise.all([
      prisma.product.findMany({ where: { tenantId, isActive: true }, select: { currentStock: true, minStock: true } }),
      prisma.invoice.findMany({ where: { tenantId }, select: { status: true, totalTTC: true } }),
      prisma.client.count({ where: { tenantId, isActive: true } }),
      prisma.employee.count({ where: { tenantId, isActive: true } }),
    ])
    const accepted = invoices.filter(i => i.status === 'ACCEPTED')
    return NextResponse.json({
      totalProducts: products.length,
      lowStockAlerts: products.filter(p => Number(p.currentStock) <= Number(p.minStock)).length,
      totalInvoices: invoices.length,
      pendingInvoices: invoices.filter(i => i.status === 'SUBMITTED' || i.status === 'DRAFT').length,
      paidInvoices: accepted.length,
      totalRevenue: accepted.reduce((s, i) => s + Number(i.totalTTC || 0), 0),
      totalClients,
      totalEmployees,
    })
  } catch (err) {
    console.error('dashboard stats error:', err)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
