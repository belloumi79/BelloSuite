import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculerRS, type RSInput } from '@/lib/retenue-source';

// GET /api/commercial/retenue-source?tenantId=&periodYear=&periodMonth=&tejStatus=
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');
    const periodYear = searchParams.get('periodYear');
    const periodMonth = searchParams.get('periodMonth');
    const tejStatus = searchParams.get('tejStatus');
    const id = searchParams.get('id');

    if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 });

    const where: any = { tenantId };
    if (periodYear) where.periodYear = Number(periodYear);
    if (periodMonth) where.periodMonth = Number(periodMonth);
    if (tejStatus && tejStatus !== 'TOUT') where.tejStatus = tejStatus;
    if (id) where.id = id;

    if (id) {
      const record = await prisma.withholdingTax.findUnique({
        where: { id },
        include: { invoice: { include: { client: true } }, tenant: true },
      });
      return NextResponse.json(record || { error: 'Not found' }, { status: record ? 200 : 404 });
    }

    const records = await prisma.withholdingTax.findMany({
      where,
      include: {
        invoice: { include: { client: true } },
        tenant: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(records);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/commercial/retenue-source
// Corps: { tenantId, beneficiaryName, beneficiaryTin?, beneficiaryType?, serviceType?, grossAmount, periodMonth, periodYear, invoiceId?, ... }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      tenantId,
      beneficiaryName,
      beneficiaryTin,
      beneficiaryType = 'INDIVIDU',
      serviceType = 'PRESTATION_SERVICE',
      grossAmount,
      periodMonth,
      periodYear,
      invoiceId,
      paymentDate,
      paymentMethod,
      paymentReference,
      notes,
      serviceDescription,
    } = body;

    if (!tenantId || !beneficiaryName || !grossAmount || !periodMonth || !periodYear) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const input: RSInput = {
      montantBrut: Number(grossAmount),
      serviceType: serviceType || 'PRESTATION_SERVICE',
      beneficiaryType: beneficiaryType || 'INDIVIDU',
      soumisAbattement: true,
    };
    const calc = calculerRS(input);

    // Générer un ID TEJ séquentiel
    const count = await prisma.withholdingTax.count({
      where: { tenantId, periodYear: Number(periodYear), periodMonth: Number(periodMonth) },
    });
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const matricule = tenant?.matriculeFiscal || 'UNKNOWN';
    const tejId = `TEJ-${periodYear}${String(periodMonth).padStart(2, '0')}-${matricule}-${String(count + 1).padStart(4, '0')}`;

    const record = await prisma.withholdingTax.create({
      data: {
        tenantId,
        beneficiaryName,
        beneficiaryTin: beneficiaryTin || null,
        beneficiaryType: beneficiaryType as any,
        serviceType: serviceType as any,
        serviceDescription: serviceDescription || null,
        grossAmount: calc.montantBrut,
        rate: calc.taux,
        taxAmount: calc.montantRS,
        netAmount: calc.montantNet,
        teeJAmount: calc.montantTEEJ,
        periodMonth: Number(periodMonth),
        periodYear: Number(periodYear),
        tejId,
        invoiceId: invoiceId || null,
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        paymentMethod: paymentMethod || null,
        paymentReference: paymentReference || null,
        notes: notes || null,
        tejStatus: 'DRAFT',
      },
      include: { invoice: { include: { client: true } } },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
