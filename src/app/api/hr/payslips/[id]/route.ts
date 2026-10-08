import { requireTenant } from '@/lib/api-auth'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";


// GET /api/hr/payslips/[id] - Get single payslip
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant(req)
  if (ctx instanceof NextResponse) return ctx
  try {
    const { id } = await params;
    const payslip = await prisma.paySlip.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
            departement: true,
            poste: true,
            cin: true,
            hireDate: true,
          },
        },
      },
    });

    if (!payslip) {
      return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
    }

    return NextResponse.json(payslip);
  } catch (error) {
    console.error("Error fetching payslip:", error);
    return NextResponse.json({ error: "Failed to fetch payslip" }, { status: 500 });
  }
}

// PUT /api/hr/payslips/[id] - Update payslip
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant(req)
  if (ctx instanceof NextResponse) return ctx
  try {
    const { id } = await params;
    const body = await req.json();

    const payslip = await prisma.paySlip.update({
      where: { id, tenantId: ctx.tenantId },
      data: body,
    });

    return NextResponse.json(payslip);
  } catch (error) {
    console.error("Error updating payslip:", error);
    return NextResponse.json({ error: "Failed to update payslip" }, { status: 500 });
  }
}

// DELETE /api/hr/payslips/[id] - Delete payslip
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant(req)
  if (ctx instanceof NextResponse) return ctx
  try {
    const { id } = await params;
    await prisma.paySlip.delete({ where: { id, tenantId: ctx.tenantId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting payslip:", error);
    return NextResponse.json({ error: "Failed to delete payslip" }, { status: 500 });
  }
}