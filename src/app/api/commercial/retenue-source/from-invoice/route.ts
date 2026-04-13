import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculerRS, type RSInput } from '@/lib/retenue-source';

/**
 * POST /api/commercial/retenue-source/from-invoice
 *
 * Génère une ou plusieurs WithholdingTax à partir de factures:
 * - Scan toutes les factures avec rsAmount > 0 non liées à une RS
 * - Ou crée une RS pour une facture spécifique (invoiceId)
 *
 * Body:
 *   tenantId        (required)
 *   invoiceId       (optional) — crée pour 1 facture
 *   periodYear      (optional, défaut = année courante)
 *   periodMonth     (optional, défaut = mois courant)
 *   serviceType     (optional, défaut = PRESTATION_SERVICE)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      tenantId,
      invoiceId,
      periodYear = new Date().getFullYear(),
      periodMonth = new Date().getMonth() + 1,
      serviceType = 'PRESTATION_SERVICE',
    } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
    }

    const created: string[] = [];
    const skipped: string[] = [];
    const errors: { invoiceId: string; error: string }[] = [];

    if (invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { client: true },
      });

      if (!invoice || invoice.tenantId !== tenantId) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      if (Number(invoice.rsAmount) <= 0) {
        return NextResponse.json({
          error: 'Cette facture n a pas de montant de retenue a la source',
        }, { status: 400 });
      }

      const existing = await prisma.withholdingTax.findFirst({ where: { invoiceId } });
      if (existing) {
        return NextResponse.json({
          error: 'Une RS existe deja pour cette facture',
          existingId: existing.id,
        }, { status: 409 });
      }

      const rs = await _createRSFromInvoice(invoice, periodYear as number, periodMonth as number, serviceType as string);
      return NextResponse.json(rs, { status: 201 });

    } else {
      const invoices = await prisma.invoice.findMany({
        where: {
          tenantId,
          status: { in: ['ACCEPTED', 'SUBMITTED'] },
          rsAmount: { gt: 0 },
          withholdingTaxes: { none: {} },
        },
        include: { client: true },
        orderBy: { date: 'asc' },
      });

      if (invoices.length === 0) {
        return NextResponse.json({
          message: 'Aucune facture avec RS non declaree',
          created: [],
          skipped: [],
        });
      }

      for (const invoice of invoices) {
        try {
          const rs = await _createRSFromInvoice(
            invoice,
            periodYear as number,
            periodMonth as number,
            serviceType as string
          );
          created.push(rs.id);
        } catch (e: any) {
          errors.push({ invoiceId: invoice.id, error: e.message });
          skipped.push(invoice.id);
        }
      }

      return NextResponse.json({
        message: `Scan termine: ${created.length} RS creees, ${skipped.length} ignorees`,
        created,
        skipped,
        errors,
        totalInvoices: invoices.length,
      });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

async function _createRSFromInvoice(
  invoice: any,
  periodYear: number,
  periodMonth: number,
  serviceType: string
) {
  const client = invoice.client;

  const beneficiaryType =
    client.matriculeFiscal && client.matriculeFiscal.length === 7
      ? 'SOCIETE' as const
      : 'INDIVIDU' as const;

  // Le rsAmount = montant de la retenue déjà appliquée sur la facture
  // On l'utilise comme montantBrut pour le calcul RS (approximation)
  const taxAmount = Number(invoice.rsAmount);

  const calcInput: RSInput = {
    montantBrut: taxAmount,
    serviceType: serviceType as any,
    beneficiaryType,
    soumisAbattement: true,
  };
  const calc = calculerRS(calcInput);
  const grossAmount = calc.montantBrut;
  const rate = calc.taux;
  const teeJAmount = calc.montantTEEJ;

  return prisma.withholdingTax.create({
    data: {
      tenantId: invoice.tenantId,
      invoiceId: invoice.id,
      beneficiaryTin: client.matriculeFiscal ?? undefined,
      beneficiaryName: client.name,
      beneficiaryAddress: [client.address, client.city].filter(Boolean).join(', ') || undefined,
      beneficiaryType,
      serviceType: serviceType as any,
      serviceDescription: `Facture ${invoice.number}`,
      grossAmount,
      rate,
      taxAmount,
      netAmount: Number(invoice.totalTTC ?? 0) - taxAmount,
      teeJAmount,
      periodYear,
      periodMonth,
      tejStatus: 'DRAFT',
      paymentDate: invoice.dueDate ?? invoice.date,
      notes: `Generee depuis facture ${invoice.number} du ${new Date(invoice.date).toLocaleDateString('fr-TN')}`,
    },
  });
}
