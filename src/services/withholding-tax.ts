import { z } from 'zod'
import { prisma } from '@/lib/db'
import { BusinessError } from '@/lib/errors'
import { calculerRS, generateTEJId } from '@/lib/retenue-source'
import { BeneficiaryType, ServiceType, TEJStatus, PaymentMethodType } from '@prisma/client'

// ─── Zod Schemas ────────────────────────────────────────────

export const createWithholdingTaxSchema = z.object({
  tenantId: z.string().min(1, 'tenantId requis'),
  beneficiaryName: z.string().min(1, 'nom du bénéficiaire requis'),
  beneficiaryTin: z.string().optional().nullable(),
  beneficiaryType: z.nativeEnum(BeneficiaryType).default(BeneficiaryType.INDIVIDU),
  serviceType: z.nativeEnum(ServiceType).default(ServiceType.PRESTATION_SERVICE),
  serviceDescription: z.string().optional().nullable(),
  grossAmount: z.coerce.number().positive('montant brut doit être positif'),
  periodMonth: z.coerce.number().min(1).max(12),
  periodYear: z.coerce.number().min(2020),
  invoiceId: z.string().optional().nullable(),
  paymentDate: z.string().optional().nullable(),
  paymentMethod: z.nativeEnum(PaymentMethodType).optional().nullable(),
  paymentReference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type CreateWithholdingTaxData = z.infer<typeof createWithholdingTaxSchema>

// ─── Service Functions ──────────────────────────────────────

export async function getWithholdingTaxes(tenantId: string, filters: {
  periodYear?: number
  periodMonth?: number
  tejStatus?: TEJStatus
}) {
  return prisma.withholdingTax.findMany({
    where: {
      tenantId,
      ...(filters.periodYear ? { periodYear: filters.periodYear } : {}),
      ...(filters.periodMonth ? { periodMonth: filters.periodMonth } : {}),
      ...(filters.tejStatus && filters.tejStatus !== 'TOUT' as any ? { tejStatus: filters.tejStatus } : {}),
    },
    include: {
      invoice: { select: { number: true, date: true, totalTTC: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createWithholdingTax(data: CreateWithholdingTaxData) {
  const { tenantId, grossAmount, serviceType, beneficiaryType, periodYear, periodMonth } = data

  // 1. Calculate RS based on Tunisian rules
  const calc = calculerRS({
    montantBrut: grossAmount,
    serviceType: serviceType as any,
    beneficiaryType: beneficiaryType as any,
    soumisAbattement: true,
  })

  return prisma.$transaction(async (tx) => {
    // 2. Generate sequential TEJ ID for the period
    const count = await tx.withholdingTax.count({
      where: { tenantId, periodYear, periodMonth },
    })

    const tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: { matriculeFiscal: true },
    })
    
    const matricule = tenant?.matriculeFiscal || 'UNKNOWN'
    const tejId = generateTEJId(matricule, periodYear, periodMonth, count + 1)

    // 3. Create the record
    return tx.withholdingTax.create({
      data: {
        ...data,
        rate: calc.taux,
        taxAmount: calc.montantRS,
        netAmount: calc.montantNet,
        teeJAmount: calc.montantTEEJ,
        tejId,
        tejStatus: TEJStatus.DRAFT,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : null,
      },
      include: { invoice: true },
    })
  })
}

/**
 * Automatically generate a Withholding Tax record from an existing Invoice.
 * Checks if the invoice is eligible (Service or Honorary).
 */
export async function generateFromInvoice(invoiceId: string, tenantId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId },
    include: { client: true },
  })

  if (!invoice) throw new BusinessError('Facture introuvable', 404)

  // Logic: only apply RS on certain document types or if it has a specific flag
  // For Tunisian context, usually Service or Honorary invoices.
  const isService = invoice.type.includes('SERVICE') || invoice.type.includes('HONORARY')
  
  if (!isService) {
    throw new BusinessError('Cette facture n\'est pas de type Service ou Honoraires', 400)
  }

  // Check if RS already exists for this invoice
  const existing = await prisma.withholdingTax.findFirst({
    where: { invoiceId },
  })
  if (existing) {
    throw new BusinessError('Une retenue à la source existe déjà pour cette facture', 409)
  }

  return createWithholdingTax({
    tenantId,
    invoiceId,
    beneficiaryName: invoice.client?.name || 'Client inconnu',
    beneficiaryTin: invoice.client?.matriculeFiscal,
    beneficiaryType: BeneficiaryType.SOCIETE, // Default, can be refined
    serviceType: invoice.type === 'INVOICE_HONORARY' ? ServiceType.HONORAIRES : ServiceType.PRESTATION_SERVICE,
    grossAmount: Number(invoice.subtotalHT),
    periodMonth: invoice.date.getMonth() + 1,
    periodYear: invoice.date.getFullYear(),
  })
}

export async function getWithholdingTaxById(id: string, tenantId: string) {
  const record = await prisma.withholdingTax.findUnique({
    where: { id },
    include: { invoice: { include: { client: true } }, tenant: true },
  })
  if (!record || record.tenantId !== tenantId) {
    throw new BusinessError('Certificat de retenue introuvable', 404)
  }
  return record
}

export async function updateWithholdingTax(id: string, tenantId: string, data: any) {
  const existing = await getWithholdingTaxById(id, tenantId)

  // Recalculate if critical fields change
  let calc = {
    taux: Number(existing.rate),
    montantRS: Number(existing.taxAmount),
    montantNet: Number(existing.netAmount),
    montantTEEJ: Number(existing.teeJAmount),
  }

  if (data.grossAmount !== undefined || data.serviceType !== undefined || data.beneficiaryType !== undefined) {
    const res = calculerRS({
      montantBrut: data.grossAmount ?? Number(existing.grossAmount),
      serviceType: data.serviceType ?? (existing.serviceType as any),
      beneficiaryType: data.beneficiaryType ?? (existing.beneficiaryType as any),
      soumisAbattement: true,
    })
    calc = {
      taux: res.taux,
      montantRS: res.montantRS,
      montantNet: res.montantNet,
      montantTEEJ: res.montantTEEJ,
    }
  }

  return prisma.withholdingTax.update({
    where: { id },
    data: {
      ...data,
      rate: calc.taux,
      taxAmount: calc.montantRS,
      netAmount: calc.montantNet,
      teeJAmount: calc.montantTEEJ,
      paymentDate: data.paymentDate ? new Date(data.paymentDate) : undefined,
    },
    include: { invoice: { include: { client: true } } },
  })
}

export async function deleteWithholdingTax(id: string, tenantId: string) {
  const existing = await getWithholdingTaxById(id, tenantId)
  
  if (existing.tejStatus === TEJStatus.ACCEPTED) {
    throw new BusinessError('Impossible de supprimer un certificat déjà validé', 400)
  }

  return prisma.withholdingTax.delete({ where: { id } })
}
