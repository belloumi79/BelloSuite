import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { calculerRS, type RSInput } from '@/lib/retenue-source';

// GET /api/commercial/retenue-source/[id]
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const record = await prisma.withholdingTax.findUnique({
      where: { id },
      include: { invoice: { include: { client: true } }, tenant: true },
    });
    if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(record);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PATCH /api/commercial/retenue-source/[id] — mise à jour (recalcul RS si montant change, changement statut TEJ, ...)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.withholdingTax.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Si le montant ou le type change, on recalcule
    let rate = existing.rate;
    let taxAmount = existing.taxAmount;
    let netAmount = existing.netAmount;
    let teeJAmount = existing.teeJAmount;

    if (body.grossAmount !== undefined || body.serviceType !== undefined || body.beneficiaryType !== undefined) {
      const input: RSInput = {
        montantBrut: Number(body.grossAmount ?? existing.grossAmount),
        serviceType: body.serviceType ?? existing.serviceType as any,
        beneficiaryType: body.beneficiaryType ?? existing.beneficiaryType as any,
      };
      const calc = calculerRS(input);
      rate = new Prisma.Decimal(String(calc.taux));
      taxAmount = new Prisma.Decimal(String(calc.montantRS));
      netAmount = new Prisma.Decimal(String(calc.montantNet));
      teeJAmount = new Prisma.Decimal(String(calc.montantTEEJ));
    }

    const updateData: any = {
      beneficiaryName: body.beneficiaryName ?? existing.beneficiaryName,
      beneficiaryTin: body.beneficiaryTin ?? existing.beneficiaryTin,
      beneficiaryType: body.beneficiaryType ?? existing.beneficiaryType,
      serviceType: body.serviceType ?? existing.serviceType,
      serviceDescription: body.serviceDescription ?? existing.serviceDescription,
      grossAmount: body.grossAmount !== undefined ? new Prisma.Decimal(body.grossAmount) : existing.grossAmount,
      rate: body.grossAmount !== undefined ? rate : existing.rate,
      taxAmount: body.grossAmount !== undefined ? taxAmount : existing.taxAmount,
      netAmount: body.grossAmount !== undefined ? netAmount : existing.netAmount,
      teeJAmount: body.grossAmount !== undefined ? teeJAmount : existing.teeJAmount,
      periodMonth: body.periodMonth ?? existing.periodMonth,
      periodYear: body.periodYear ?? existing.periodYear,
      tejStatus: body.tejStatus ?? existing.tejStatus,
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : existing.paymentDate,
      paymentMethod: body.paymentMethod ?? existing.paymentMethod,
      paymentReference: body.paymentReference ?? existing.paymentReference,
      notes: body.notes ?? existing.notes,
      tejReference: body.tejReference ?? existing.tejReference,
      rejectionReason: body.rejectionReason ?? existing.rejectionReason,
    };

    const updated = await prisma.withholdingTax.update({
      where: { id },
      data: updateData,
      include: { invoice: { include: { client: true } } },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE /api/commercial/retenue-source/[id]
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.withholdingTax.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
