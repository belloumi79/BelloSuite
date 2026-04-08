import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { payslipId, hours, rate } = body;

    if (!payslipId || hours === undefined) {
      return NextResponse.json({ error: "payslipId and hours required" }, { status: 400 });
    }

    const payslip = await prisma.paySlip.findUnique({ where: { id: payslipId } });
    if (!payslip) {
      return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
    }

    // SMIG 2025 = 469.4 DT for 176h/month
    const SMIG = 469.4;
    const HOURLY_RATE = SMIG / 176;
    const OVERTIME_MULTIPLIER = rate || 1.25;
    const amount = Number(hours) * HOURLY_RATE * OVERTIME_MULTIPLIER;

    const updated = await prisma.paySlip.update({
      where: { id: payslipId },
      data: {
        heuresSupQte: { increment: Number(hours) },
        heuresSupMontant: { increment: amount },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
