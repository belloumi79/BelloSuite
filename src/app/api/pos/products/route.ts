import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// GET /api/pos/products?tenantId=&search=&category=&limit=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get("tenantId")
  const search = searchParams.get("search") || ""
  const category = searchParams.get("category")
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)

  if (!tenantId) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "tenantId requis" } },
      { status: 400 }
    )
  }

  const where: any = {
    tenantId,
    isActive: true,
    currentStock: { gt: 0 },
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
      { barcode: { contains: search, mode: "insensitive" } },
    ]
  }

  if (category) {
    where.category = category
  }

  const products = await prisma.product.findMany({
    where,
    select: {
      id: true,
      code: true,
      barcode: true,
      name: true,
      category: true,
      unit: true,
      salePrice: true,
      vatRate: true,
      currentStock: true,
    },
    orderBy: { name: "asc" },
    take: limit,
  })

  return NextResponse.json({ data: products })
}
