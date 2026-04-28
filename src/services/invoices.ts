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

export async function getPipelineData(tenantId: string) {
  const documents = await prisma.invoice.findMany({
    where: { tenantId, type: { in: ['QUOTE', 'ORDER'] } },
    include: { client: { select: { name: true } } },
    orderBy: { date: 'desc' },
  })

  const quotes = documents.filter((d) => d.type === 'QUOTE')
  const orders = documents.filter((d) => d.type === 'ORDER')

  const quoteStats = {
    total: quotes.length,
    draft: quotes.filter((d) => d.status === 'DRAFT').length,
    sent: quotes.filter((d) => d.status === 'SENT').length,
    confirmed: quotes.filter((d) => d.status === 'CONFIRMED').length,
    expired: quotes.filter((d) => d.dueDate && new Date(d.dueDate) < new Date()).length,
    converted: quotes.filter((d) => d.convertedFromId !== null).length,
    totalValue: quotes.reduce((s, d) => s + Number(d.totalTTC), 0),
  }

  const orderStats = {
    total: orders.length,
    draft: orders.filter((d) => d.status === 'DRAFT').length,
    pending: orders.filter((d) => d.status === 'PENDING').length,
    confirmed: orders.filter((d) => d.status === 'CONFIRMED').length,
    invoiced: orders.filter((d) => d.convertedFromId !== null).length,
    totalValue: orders.reduce((s, d) => s + Number(d.totalTTC), 0),
  }

  const conversionRate = quoteStats.total > 0
    ? Math.round((quoteStats.confirmed / quoteStats.total) * 100)
    : 0

  const pipelineItems = documents.map((doc) => ({
    id: doc.id,
    number: doc.number,
    clientName: doc.client?.name || '—',
    date: doc.date.toISOString().split('T')[0],
    dueDate: doc.dueDate ? doc.dueDate.toISOString().split('T')[0] : null,
    totalTTC: Number(doc.totalTTC),
    status: doc.status,
    type: doc.type,
    daysUntilDue: doc.dueDate
      ? Math.floor((new Date(doc.dueDate).getTime() - Date.now()) / 86400000)
      : null,
  }))

  return { quoteStats, orderStats, conversionRate, pipelineItems }
}

export async function convertDocument(id: string, tenantId: string, targetType: string) {
  const source = await prisma.invoice.findFirst({
    where: { id, tenantId },
    include: { items: true, client: true },
  })

  if (!source) throw new BusinessError('Document source introuvable', 404)

  const typeMap: Record<string, string> = { QUOTE: 'ORDER', ORDER: 'INVOICE' }
  const actualTarget = typeMap[source.type] || targetType
  const prefix = actualTarget === 'ORDER' ? 'BC' : actualTarget === 'INVOICE' ? 'FAC' : actualTarget
  const newNumber = `${prefix}-${source.client?.code || 'CL'}-${Date.now().toString(36).toUpperCase()}`

  return prisma.$transaction(async (tx) => {
    const newDoc = await tx.invoice.create({
      data: {
        tenantId,
        clientId: source.clientId,
        number: newNumber,
        type: actualTarget as any,
        status: InvoiceStatus.PENDING,
        date: new Date(),
        dueDate: new Date(Date.now() + 30 * 86400000),
        subtotalHT: source.subtotalHT,
        totalFodec: source.totalFodec,
        totalVAT: source.totalVAT,
        timbreFiscal: actualTarget === 'INVOICE' ? 1 : 0,
        totalTTC: actualTarget === 'INVOICE' ? Number(source.totalTTC) + 1 : source.totalTTC,
        vatSummary: (source.vatSummary ?? {}) as any,
        notes: `Converti depuis ${source.type} ${source.number}`,
        convertedFromId: source.id,
        items: {
          create: source.items.map((item) => ({
            productId: item.productId,
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
    })

    // Update source status
    await tx.invoice.update({
      where: { id: source.id },
      data: { status: InvoiceStatus.CONFIRMED },
    })

    return newDoc
  })
}
