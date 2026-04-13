import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateNoteHonorairesPDF } from '@/lib/note-honoraires';
import { calculateRetenueSource, calculateIRCPHonitaires } from '@/lib/fiscal';

/**
 * POST /api/commercial/invoices/[id]/note-honoraires-pdf
 * Body: { tenantId }
 *
 * Génère un PDF Note d'Honoraires pour une facture de type HONORAIRES.
 * Calcule automatiquement RS 1.5% et IRPP 15%.
 * Retourne le PDF en attachment.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { tenantId } = body;
    if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 });

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { client: true, tenant: true, items: true },
    });
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    // Calcul RS + IRPP
    const rsAmount = calculateRetenueSource(Number(invoice.totalTTC), Number(invoice.subtotalHT));
    const irppAmount = calculateIRCPHonitaires(Number(invoice.subtotalHT));

    const items = invoice.items.map((item: any) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unit: item.unit || 'Unité',
      unitPriceHT: Number(item.unitPriceHT),
      totalHT: Number(item.totalHT),
    }));

    const pdf = generateNoteHonorairesPDF({
      invoiceNumber: invoice.number,
      date: new Date(invoice.date).toISOString().split('T')[0],
      emitterName: invoice.tenant?.name || '',
      emitterMatricule: invoice.tenant?.matriculeFiscal || '',
      emitterAddress: invoice.tenant?.address || '',
      emitterCity: invoice.tenant?.city || '',
      emitterPhone: invoice.tenant?.phone || '',
      clientName: invoice.client?.name || '',
      clientMatricule: invoice.client?.matriculeFiscal || '',
      clientAddress: invoice.client?.address || '',
      clientCity: invoice.client?.city || '',
      items,
      subtotalHT: Number(invoice.subtotalHT),
      totalFodec: Number(invoice.totalFodec),
      totalVAT: Number(invoice.totalVAT),
      timbreFiscal: Number(invoice.timbreFiscal || 1),
      totalTTC: Number(invoice.totalTTC),
      rsAmount,
      irppAmount,
      notes: invoice.notes || undefined,
    });

    const buffer = Buffer.from(pdf.output('arraybuffer'));
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Note_Honoraires_${invoice.number}.pdf"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
