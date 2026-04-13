import { NextResponse } from 'next/server';
import { exportTEJ } from '@/lib/tej-generator';

// GET /api/commercial/retenue-source/export-tej?tenantId=&periodYear=&periodMonth=
//   → télécharge le fichier XML TEJ prêt pour la plateforme https://www.tej.gov.tn
//
// POST /api/commercial/retenue-source/export-tej
//   body: { tenantId, periodYear, periodMonth, withholdingTaxIds? }
//   → même effet en JSON (pour usage programme)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId  = searchParams.get('tenantId');
    const periodYear  = searchParams.get('periodYear');
    const periodMonth = searchParams.get('periodMonth');
    if (!tenantId || !periodYear || !periodMonth) {
      return NextResponse.json(
        { error: 'tenantId, periodYear, periodMonth required' }, { status: 400 }
      );
    }
    const { xml, filename, count } = await exportTEJ({
      tenantId,
      periodYear: Number(periodYear),
      periodMonth: Number(periodMonth),
    });
    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-TEJ-Count': String(count),
        'X-TEJ-Period': `${periodYear}-${periodMonth.padStart(2,'0')}`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tenantId, periodYear, periodMonth, withholdingTaxIds } = body;
    if (!tenantId || !periodYear || !periodMonth) {
      return NextResponse.json(
        { error: 'tenantId, periodYear, periodMonth required' }, { status: 400 }
      );
    }
    const result = await exportTEJ({ tenantId, periodYear: Number(periodYear),
      periodMonth: Number(periodMonth), withholdingTaxIds });
    return NextResponse.json({ ...result, tejUrl: 'https://www.tej.gov.tn' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
