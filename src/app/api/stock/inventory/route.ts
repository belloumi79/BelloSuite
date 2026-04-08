import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get("tenantId")
    if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 })

    const inventories = await prisma.inventory.findMany({
      where: { tenantId },
      include: {
        warehouse: { select: { code: true, name: true } },
        items: { include: { inventory: false } },
      },
      orderBy: { date: "desc" },
    })
    return NextResponse.json(inventories)
  } catch (e) {
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId, warehouseId, reference, date, items, notes } = await req.json()
    if (!tenantId || !reference || !items?.length) {
      return NextResponse.json({ error: "required" }, { status: 400 })
    }

    const inventory = await prisma.inventory.create({
      data: {
        tenantId, warehouseId, reference,
        date: new Date(date), notes,
        status: "DRAFT",
        items: {
          create: items.map((i: any) => ({
            productId: i.productId,
            expectedQty: i.expectedQty,
            actualQty: i.actualQty,
            unitCost: i.unitCost,
            variance: Number(i.actualQty) - Number(i.expectedQty),
            notes: i.notes,
          })),
        },
      },
      include: { items: true },
    })
    return NextResponse.json(inventory, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const body = await req.json()
    const { status, warehouseId } = body

    const inventory = await prisma.inventory.findUnique({
      where: { id },
      include: { items: true, warehouse: true },
    })
    if (!inventory) return NextResponse.json({ error: "not found" }, { status: 404 })

    if (status === "VALIDATED" && inventory.status !== "VALIDATED") {
      await prisma.$transaction(async (tx) => {
        for (const item of inventory.items) {
          const whId = warehouseId ?? inventory.warehouseId
          if (whId) {
            await tx.productWarehouse.upsert({
              where: { productId_warehouseId: { productId: item.productId, warehouseId: whId } },
              update: { stock: item.actualQty },
              create: { productId: item.productId, warehouseId: whId, stock: item.actualQty },
            })
          }
          await tx.stockMovement.create({
            data: {
              tenantId: inventory.tenantId,
              productId: item.productId,
              warehouseId: whId,
              type: "ADJUSTMENT",
              quantity: item.variance,
              reference: inventory.reference,
              notes: `Inventaire physique: ajustement`,
            },
          })
        }
      })
    }

    const updated = await prisma.inventory.update({
      where: { id },
      data: { status, warehouseId },
      include: { items: true },
    })
    return NextResponse.json(updated)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }
}