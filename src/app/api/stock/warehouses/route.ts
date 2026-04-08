import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get("tenantId")
    if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 })

    const warehouses = await prisma.warehouse.findMany({
      where: { tenantId, isActive: true },
      include: {
        productStock: {
          include: { product: { select: { id: true, name: true, code: true, salePrice: true } } },
        },
      },
      orderBy: { isDefault: "desc" },
    })

    const result = warehouses.map(w => ({
      ...w,
      totalProducts: w.productStock.length,
      totalValue: w.productStock.reduce((sum, pw) => sum + Number(pw.stock) * Number(pw.product.salePrice), 0),
    }))

    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId, code, name, address, isDefault } = await req.json()
    if (!tenantId || !code || !name) return NextResponse.json({ error: "required" }, { status: 400 })

    if (isDefault) {
      await prisma.warehouse.updateMany({ where: { tenantId, isDefault: true }, data: { isDefault: false } })
    }

    const warehouse = await prisma.warehouse.create({
      data: { tenantId, code, name, address, isDefault: isDefault ?? false },
    })
    return NextResponse.json(warehouse, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }
}