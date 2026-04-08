import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get("tenantId")
    const productId = searchParams.get("productId")
    const warehouseId = searchParams.get("warehouseId")
    const type = searchParams.get("type")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const limit = parseInt(searchParams.get("limit") || "50")

    if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 })

    const where: any = { tenantId }
    if (productId) where.productId = productId
    if (warehouseId) where.warehouseId = warehouseId
    if (type) where.type = type
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) where.createdAt.lte = new Date(dateTo)
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, code: true } },
        warehouse: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    return NextResponse.json(movements)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tenantId, productId, warehouseId, type, quantity, unitPrice, reference, notes } = body

    if (!tenantId || !productId || !type || !quantity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const movement = await prisma.$transaction(async (tx) => {
      const mv = await tx.stockMovement.create({
        data: { tenantId, productId, warehouseId: warehouseId || null, type, quantity, unitPrice: unitPrice || 0, reference, notes },
      })

      const q = Number(quantity)
      await tx.product.update({
        where: { id: productId },
        data: {
          currentStock: { increment: type === "EXIT" ? -q : q },
        },
      })

      return mv
    })

    return NextResponse.json(movement, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
