import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/hr/payroll - Get payroll summary for a period
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const tenantId = searchParams.get("tenantId");

    if (!tenantId || !month || !year) {
      return NextResponse.json({ error: "tenantId, month and year required" }, { status: 400 });
    }

    const where = {
      tenantId,
      mois: parseInt(month),
      annee: parseInt(year),
    };

    const [payslips, params] = await Promise.all([
      prisma.paySlip.findMany({ where }),
      prisma.paieParameters.findFirst({ where: { tenantId, annee: parseInt(year) } }),
    ]);

    const summary = {
      totalEmployees: payslips.length,
      totalGross: payslips.reduce((sum, p) => sum + Number(p.brutGlobal), 0),
      totalNet: payslips.reduce((sum, p) => sum + Number(p.netAPayer), 0),
      totalCNSS: payslips.reduce((sum, p) => sum + Number(p.cnssSalaire), 0),
      totalIRPP: payslips.reduce((sum, p) => sum + Number(p.irpp), 0),
      totalTransport: payslips.reduce((sum, p) => sum + Number(p.primeTransport), 0),
      totalMeal: payslips.reduce((sum, p) => sum + Number(p.primePanier), 0),
      totalFamily: payslips.reduce((sum, p) => sum + Number(p.deductionChefFam), 0),
      totalOvertime: payslips.reduce((sum, p) => sum + Number(p.heuresSupMontant), 0),
      statusBreakdown: {
        pending: payslips.filter((p) => p.statut === "PENDING").length,
        paid: payslips.filter((p) => p.statut === "PAID").length,
        cancelled: payslips.filter((p) => p.statut === "CANCELLED").length,
      },
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching payroll summary:", error);
    return NextResponse.json({ error: "Failed to fetch payroll summary" }, { status: 500 });
  }
}