import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculerRS, type RSInput } from '@/lib/retenue-source';

/**
 * POST /api/commercial/invoices/[id]/generer-rs
 *
 * Génère une WithholdingTax depuis une facture existante.
 * Accessible depuis le bouton "Générer RS" dans le détail facture.
 *
 * Body:
 *   serviceType     (optional, défaut = PRESTATION_SERVICE)
 *   periodYear      (optional)
 *   periodMonth     (optional)
 *   notes           (optional)
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      serviceType = 'PRESTATION_SERVICE',
      periodYear = new Date().getFullYear(),
      periodMonth = new Date().getMonth() + 1,
      notes,
    } = body;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { client: true, withholdingTaxes: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
    }

    // Vérifier si RS existe déjà
    if (invoice.withholdingTaxes.length > 0) {
      return NextResponse.json({
        error: 'Une RS existe déjà pour cette facture',
        existingId: invoice.withholdingTaxes[0].id,
        existingStatus: invoice.withholdingTaxes[0].tejStatus,
      }, { status: 409 });
    }

    // Vérifier montant RS
    if (Number(invoice.rsAmount) <= 0) {
      return NextResponse.json({
        error: 'Cette facture n a pas de montant de retenue à la source (rsAmount = 0)',
        hint: 'Editez la facture et définissez le montant RS avant de continuer',
      }, { status: 400 });
    }

    const client = invoice.client;
    const beneficiaryType =
      client.matriculeFiscal && client.matriculeFiscal.length === 7
        ? 'SOCIETE' as const
        : 'INDIVIDU' as const;

    // Calcul à partir du rsAmount (montant de la retenue)
    const taxAmount = Number(invoice.rsAmount);
    const rate = (serviceType === 'HONORAIRES' || serviceType === 'PRESTATION_SERVICE')
      ? (beneficiaryType === 'SOCIETE' ? 0.075 : 0.15)
      : 0;
    const grossAmount = rate > 0 ? taxAmount / rate : taxAmount;
    const totalHT = Number(invoice.subtotalHT);
    const teeJAmount = totalHT - taxAmount;

    const rs = await prisma.withholdingTax.create({
      data: {
        tenantId: invoice.tenantId,
        invoiceId: invoice.id,
        beneficiaryTin: client.matriculeFiscal ?? undefined,
        beneficiaryName: client.name,
        beneficiaryAddress: [client.address, client.city].filter(Boolean).join(', ') || undefined,
        beneficiaryType,
        serviceType: serviceType as any,
        serviceDescription: `Facture ${invoice.number} — ${invoice.type}`,
        grossAmount,
        rate,
        taxAmount,
        netAmount: Number(invoice.totalTTC ?? 0) - taxAmount,
        teeJAmount,
        periodYear: Number(periodYear),
        periodMonth: Number(periodMonth),
        tejStatus: 'DRAFT',
        paymentDate: invoice.dueDate ?? invoice.date,
        notes: notes ?? `Retenue à la source — Facture ${invoice.number}`,
      },
    });

    return NextResponse.json({
      message: 'RS créée avec succès',
      withholdingTax: rs,
      summary: {
        facture: invoice.number,
        client: client.name,
        brutHT: grossAmount.toFixed(3),
        taux: `${(rate * 100).toFixed(2)}%`,
        montantRS: taxAmount.toFixed(3),
        netVerse: teeJAmount.toFixed(3),
        periode: `${periodMonth}/${periodYear}`,
      },
    }, { status: 201 });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
