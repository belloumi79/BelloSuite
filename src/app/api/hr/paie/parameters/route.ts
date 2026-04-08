import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Tunisia 2024 official IRPP tax brackets (revenus mensuels)
// Source: جدول الضريبة على الدخل
const DEFAULT_TAX_BRACKETS = [
  { min: 0,        max: 5000,   rate: 0.00 },
  { min: 5000,     max: 10000,  rate: 0.15 },
  { min: 10000,    max: 30000,  rate: 0.20 },
  { min: 30000,    max: 50000,  rate: 0.30 },
  { min: 50000,    max: 70000,  rate: 0.35 },
  { min: 70000,    max: Infinity, rate: 0.40 },
];

// GET /api/hr/paie/parameters - Get or create parameters for tenant/year
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");
    const year = searchParams.get("year") || new Date().getFullYear().toString();

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId required" }, { status: 400 });
    }

    let params = await prisma.paieParameters.findFirst({
      where: { tenantId, annee: parseInt(year) },
    });

    if (!params) {
      // Create default parameters
      params = await prisma.paieParameters.create({
        data: {
          tenantId,
          annee: parseInt(year),
        },
      });
    }

    return NextResponse.json(params);
  } catch (error) {
    console.error("Error fetching paie parameters:", error);
    return NextResponse.json({ error: "Failed to fetch parameters" }, { status: 500 });
  }
}

// PUT /api/hr/paie/parameters - Update parameters
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, ...updateData } = body;

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId required" }, { status: 400 });
    }

    const params = await prisma.paieParameters.create({
      data: {
        tenantId,
        ...updateData,
      },
    });

    return NextResponse.json(params);
  } catch (error) {
    console.error("Error updating paie parameters:", error);
    return NextResponse.json({ error: "Failed to update parameters" }, { status: 500 });
  }
}