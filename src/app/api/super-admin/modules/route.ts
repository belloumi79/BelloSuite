import { requireSuperAdmin } from '@/lib/api-auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth
  try {
    const modules = await prisma.module.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json(modules)
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth
  try {
    const { name, displayName, description, icon, monthlyPrice } = await req.json()
    if (!name || !displayName) return NextResponse.json({ error: 'name and displayName required' }, { status: 400 })

    const mod = await prisma.module.create({
      data: { name, displayName, description, icon: icon || '📦', monthlyPrice: monthlyPrice || 0, isActive: true }
    })
    return NextResponse.json(mod, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'Module name already exists' }, { status: 409 })
    return NextResponse.json({ error: 'Failed to create module' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth
  try {
    const { id, ...data } = await req.json()
    const mod = await prisma.module.update({ where: { id }, data })
    return NextResponse.json(mod)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update module' }, { status: 500 })
  }
}
