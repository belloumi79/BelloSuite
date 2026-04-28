import { z } from 'zod'
import { prisma } from '@/lib/db'
import { BusinessError } from '@/lib/errors'
import { InvoiceStatus } from '@prisma/client'

// ─── Zod Schemas ────────────────────────────────────────────

export const invoiceItemSchema = z.object({
  productId: z.string().optional().nullable(),
  description: z.string().min(1, 'description requise'),
  unit: z.string().default('EA'),
  quantity: z.coerce.number().positive('quantité doit être positive'),
  unitPriceHT: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).default(0),
  fodecApply: z.boolean().default(false),
  fodecAmount: z.coerce.number().min(0).default(0),
  vatRate: z.coerce.number().min(0).default(19),
  vatAmount: z.coerce.number().min(0).default(0),
  totalHT: z.coerce.number().min(0).default(0),
  totalTTC: z.coerce.number().min(0).default(0),
})

export const createInvoiceSchema = z.object({
  tenantId: z.string().min(1, 'tenantId requis'),
  clientId: z.string().optional().nullable(),
  number: z.string().min(1, 'numéro requis'),
  type: z.string().default('INVOICE'),
  date: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  subtotalHT: z.coerce.number().min(0).default(0),
  totalFodec: z.coerce.number().min(0).default(0),
  totalVAT: z.coerce.number().min(0).default(0),
  timbreFiscal: z.coerce.number().min(0).default(1),
  totalTTC: z.coerce.number().min(0).default(0),
  vatSummary: z.any().optional(),
  notes: z.string().optional().nullable(),
  items: z.array(invoiceItemSchema).min(1, 'au moins un article requis'),
})

export const invoiceFiltersSchema = z.object({
  tenantId: z.string().min(1),
  status: z.nativeEnum(InvoiceStatus).optional(),
  type: z.string().optional(),
  id: z.string().optional(),
})

export type CreateInvoiceData = z.infer<typeof createInvoiceSchema>
export type InvoiceFilters = z.infer<typeof invoiceFiltersSchema>

// ─── Service Functions ──────────────────────────────────────

export async function getInvoices(filters: InvoiceFilters) {
  const { tenantId, status, type, id } = filters

  // Single invoice by ID
  if (id) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { client: true, items: true, tenant: true },
    })
    if (!invoice || invoice.tenantId !== tenantId) {
      throw new BusinessError('Facture introuvable', 404)
    }
    return invoice
  }

  return prisma.invoice.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
    },
    include: {
      client: { select: { id: true, name: true, code: true, matriculeFiscal: true } },
      items: true,
      tenant: { select: { id: true, name: true, matriculeFiscal: true } },
    },
    orderBy: { date: 'desc' },
  })
}

export async function createInvoice(data: CreateInvoiceData) {
  const { tenantId, clientId, number, type, date, dueDate,
    subtotalHT, totalFodec, totalVAT, timbreFiscal, totalTTC,
    vatSummary, notes, items } = data

  // Check duplicate invoice number
  const existing = await prisma.invoice.findFirst({
    where: { tenantId, number },
    select: { id: true },
  })
  if (existing) {
    throw new BusinessError(`Numéro de facture "${number}" déjà utilisé`, 409)
  }

  // Atomic transaction: invoice + all items created together
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        tenantId,
        clientId: clientId!,
        number,
        type,
        status: InvoiceStatus.PENDING,
        date: date ? new Date(date) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        subtotalHT,
        totalFodec,
        totalVAT,
        timbreFiscal,
        totalTTC,
        vatSummary: (vatSummary ?? {}) as any,
        notes: notes ?? null,
        items: {
          create: items.map((item) => ({
            productId: item.productId ?? null,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unitPriceHT: item.unitPriceHT,
            discount: item.discount,
            fodecApply: item.fodecApply,
            fodecAmount: item.fodecAmount,
            vatRate: item.vatRate,
            vatAmount: item.vatAmount,
            totalHT: item.totalHT,
            totalTTC: item.totalTTC,
          })),
        },
      },
      include: { client: true, items: true },
    })

    return invoice
  })
}
