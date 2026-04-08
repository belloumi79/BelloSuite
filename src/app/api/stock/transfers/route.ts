import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get("tenantId")
    if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 })

    const transfers = await prisma.stockTransfer.findMany({
      where: { tenantId },
      include: {
        fromWarehouse: { select: { code: true, name: true } },
        toWarehouse: { select: { code: true, name: true } },
        items: { include: { transfer: false } },
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(transfers)
  } catch (e) {
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId, fromWarehouseId, toWarehouseId, items, notes, date } = await req.json()
    if (!tenantId || !fromWarehouseId || !toWarehouseId || !items?.length) {
      return NextResponse.json({ error: "required" }, { status: 400 })
    }

    const ref = `TRF-${Date.now()}`
    const transfer = await prisma.stockTransfer.create({
      data: {
        tenantId, reference: ref, date: new Date(date),
        fromWarehouseId, toWarehouseId,
        status: "DRAFT", notes,
        items: { create: items.map((i: any) => ({ productId: i.productId, quantity: i.quantity, notes: i.notes })) },
      },
      include: { items: true },
    })
    return NextResponse.json(transfer, { status: 201 })
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
    const { status } = body

    const transfer = await prisma.stockTransfer.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!transfer) return NextResponse.json({ error: "not found" }, { status: 404 })

    // CONFIRM transfer → update stock
    if (status === "TRANSFERRED" && transfer.status !== "TRANSFERRED") {
      await prisma.$transaction(async (tx) => {
        for (const item of transfer.items) {
          // Decrement source warehouse
          await tx.productWarehouse.update({
            where: { productId_warehouseId: { productId: item.productId, warehouseId: transfer.fromWarehouseId } },
            data: { stock: { decrement: item.quantity } },
          }).catch(() => {
            // Create if doesn't exist
            return tx.productWarehouse.create({
              data: { productId: item.productId, warehouseId: transfer.fromWarehouseId, stock: -item.quantity },
            })
          })
          // Increment destination warehouse
          await tx.productWarehouse.upsert({
            where: { productId_warehouseId: { productId: item.productId, warehouseId: transfer.toWarehouseId } },
            update: { stock: { increment: item.quantity } },
            create: { productId: item.productId, warehouseId: transfer.toWarehouseId, stock: item.quantity },
          })
          // Create stock movement for audit trail
          await tx.stockMovement.create({
            data: {
              tenantId: transfer.tenantId,
              productId: item.productId,
              warehouseId: transfer.fromWarehouseId,
              type: "TRANSFER",
              quantity: item.quantity,
              reference: transfer.reference,
              notes: `Transfert vers ${transfer.toWarehouseId}`,
            },
          })
          await tx.stockMovement.create({
            data: {
              tenantId: transfer.tenantId,
              productId: item.productId,
              warehouseId: transfer.toWarehouseId,
              type: "ENTRY",
              quantity: item.quantity,
              reference: transfer.reference,
              notes: `Transfert depuis ${transfer.fromWarehouseId}`,
            },
          })
        }
      })
    }

    const updated = await prisma.stockTransfer.update({
      where: { id },
      data: { status },
      include: { items: true },
    })
    return NextResponse.json(updated)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }
}