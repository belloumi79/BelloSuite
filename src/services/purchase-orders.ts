/**
 * Achats fournisseurs : bons de commande, factures fournisseurs, bons de réception, retours.
 *
 * RÈGLE : seuls le bon de réception (ENTRY / PURCHASE) et le retour fournisseur (EXIT / SUPPLIER_RETURN)
 * mouvementent le stock, via `applyMovementTx`. Commandes et factures restent commerciales / fiscales.
 */
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { BusinessError } from '@/lib/errors'
import { Prisma, StockMovementType } from '@prisma/client'
import { assertBelongsToTenant, assertAllBelongToTenant } from '@/lib/tenant-scope'
import { applyMovementTx, getStockSettings, getDefaultWarehouseId, getStockAlerts } from '@/services/stock'
import { formatReference, round3 } from '@/lib/stock-logic'
import {
  purchaseDocType, normalizePoStatus, poStatusFromReceipts, canTransitionPo, canReceive,
  findOverReceipts, remainingQty, returnableQty, linesAmount, invoicingSummary,
  purchaseEditMode, validateOrderEdit, purchaseTotals, type OrderEditError,
} from '@/lib/purchase-logic'

type Tx = Prisma.TransactionClient
type Db = typeof prisma | Tx

const optStr = z.string().trim().max(500).optional().nullable()
const optId = z.string().trim().max(64).optional().nullable()

// ─── Zod Schemas ────────────────────────────────────────────

export const purchaseOrderItemSchema = z.object({
  productId: optId,
  description: z.string().trim().min(1, 'description requise').max(300),
  quantity: z.coerce.number().positive('quantité doit être positive'),
  unitPrice: z.coerce.number().min(0),
  total: z.coerce.number().min(0).optional(),
})

export const createPurchaseOrderSchema = z.object({
  tenantId: z.string().min(1, 'tenantId requis'),
  supplierId: optId,
  clientId: optId,
  warehouseId: optId,
  /** Facture fournisseur → commande liée */
  linkedOrderId: optId,
  number: z.string().trim().max(40).optional().nullable(),
  supplierRef: optStr,
  type: z.string().default('ORDER'),
  status: z.enum(['DRAFT', 'CONFIRMED', 'VALIDATED']).optional(),
  date: z.string().optional().nullable(),
  expectedDate: z.string().optional().nullable(),
  subtotal: z.coerce.number().min(0).optional(),
  taxAmount: z.coerce.number().min(0).default(0),
  total: z.coerce.number().min(0).optional(),
  notes: optStr,
  items: z.array(purchaseOrderItemSchema).min(1, 'au moins un article requis').max(500),
})
export type CreatePurchaseOrderData = z.infer<typeof createPurchaseOrderSchema>

export const receiptSchema = z.object({
  purchaseOrderId: optId,
  supplierId: optId,
  warehouseId: z.string().trim().min(1, 'dépôt requis').max(64),
  date: z.string().optional().nullable(),
  supplierRef: optStr,
  notes: optStr,
  /** Valider immédiatement (entrée en stock) */
  validate: z.boolean().default(true),
  /** Autoriser explicitement la réception au-delà du commandé (administrateur) */
  allowOverReceipt: z.boolean().default(false),
  items: z.array(z.object({
    purchaseOrderItemId: optId,
    productId: optId,
    description: optStr,
    quantity: z.coerce.number().min(0),
    unitCost: z.coerce.number().min(0),
  })).min(1).max(500),
})
export type ReceiptData = z.infer<typeof receiptSchema>

export const supplierReturnSchema = z.object({
  receiptId: z.string().trim().min(1).max(64),
  date: z.string().optional().nullable(),
  notes: optStr,
  items: z.array(z.object({
    receiptItemId: z.string().trim().min(1).max(64),
    quantity: z.coerce.number().min(0),
  })).min(1).max(500),
})

export const poFromAlertsSchema = z.object({
  supplierId: z.string().trim().min(1, 'fournisseur requis').max(64),
  warehouseId: optId,
  /** Lignes choisies ; à défaut, toute la liste « à commander » */
  items: z.array(z.object({ productId: z.string().min(1).max(64), quantity: z.coerce.number().positive() })).max(500).optional(),
})

/** Modification d'une commande / facture existante (PATCH action 'update'). */
export const updatePurchaseDocSchema = z.object({
  supplierId: optId,
  warehouseId: optId,
  date: z.string().trim().max(40).optional().nullable(),
  expectedDate: z.string().trim().max(40).optional().nullable(),
  supplierRef: optStr,
  notes: z.string().trim().max(2000).optional().nullable(),
  /** Taux de TVA en % ; à défaut, le taux implicite actuel du document est conservé */
  vatRate: z.coerce.number().min(0).max(100).optional().nullable(),
  items: z.array(z.object({
    id: optId,
    productId: optId,
    description: z.string().trim().min(1, 'description requise').max(300),
    quantity: z.coerce.number().positive('quantité doit être positive'),
    unitPrice: z.coerce.number().min(0),
  })).min(1, 'au moins un article requis').max(500),
})
export type UpdatePurchaseDocData = z.infer<typeof updatePurchaseDocSchema>

// ─── Numérotation ───────────────────────────────────────────

type NumKind = 'ORDER' | 'INVOICE' | 'RECEIPT' | 'RETURN'
const PREFIX: Record<NumKind, string> = { ORDER: 'BCF', INVOICE: 'FF', RECEIPT: 'BR', RETURN: 'RF' }

async function isTaken(db: Db, kind: NumKind, tenantId: string, number: string): Promise<boolean> {
  if (kind === 'RECEIPT') return (await db.goodsReceipt.count({ where: { tenantId, number } })) > 0
  if (kind === 'RETURN') return (await db.supplierReturn.count({ where: { tenantId, number } })) > 0
  return (await db.purchaseOrder.count({ where: { tenantId, number } })) > 0
}

async function nextNumber(db: Db, kind: NumKind, tenantId: string): Promise<string> {
  const year = new Date().getFullYear()
  const like = `${PREFIX[kind]}-${year}-`
  const count = kind === 'RECEIPT'
    ? await db.goodsReceipt.count({ where: { tenantId, number: { startsWith: like } } })
    : kind === 'RETURN'
      ? await db.supplierReturn.count({ where: { tenantId, number: { startsWith: like } } })
      : await db.purchaseOrder.count({ where: { tenantId, number: { startsWith: like } } })
  for (let seq = count + 1; seq < count + 50; seq++) {
    const n = formatReference(PREFIX[kind], year, seq)
    if (!(await isTaken(db, kind, tenantId, n))) return n
  }
  return `${like}${Date.now()}`
}

// ─── Progression d'une commande ─────────────────────────────

/** Quantités reçues (nettes des retours) par ligne de commande, pour les réceptions validées. */
async function receivedByLine(db: Db, purchaseOrderId: string) {
  const items = await db.goodsReceiptItem.findMany({
    where: { receipt: { purchaseOrderId, status: 'VALIDATED' }, purchaseOrderItemId: { not: null } },
    select: { purchaseOrderItemId: true, quantity: true, unitCost: true, returnItems: { select: { quantity: true } } },
  })
  const map = new Map<string, { received: number; returned: number; amount: number }>()
  for (const it of items) {
    const k = it.purchaseOrderItemId as string
    const cur = map.get(k) ?? { received: 0, returned: 0, amount: 0 }
    const returned = it.returnItems.reduce((s, r) => s + Number(r.quantity), 0)
    cur.received += Number(it.quantity)
    cur.returned += returned
    cur.amount += (Number(it.quantity) - returned) * Number(it.unitCost)
    map.set(k, cur)
  }
  return map
}

/** Recalcule et enregistre le statut d'une commande d'après ses réceptions. */
export async function refreshPoStatus(tx: Tx, purchaseOrderId: string) {
  const po = await tx.purchaseOrder.findUnique({ where: { id: purchaseOrderId }, select: { status: true, items: { select: { id: true, quantity: true } } } })
  if (!po) return null
  const rec = await receivedByLine(tx, purchaseOrderId)
  const status = poStatusFromReceipts(po.status, po.items.map(i => {
    const r = rec.get(i.id)
    return { ordered: Number(i.quantity), received: r ? r.received - r.returned : 0 }
  }))
  if (status !== po.status) await tx.purchaseOrder.update({ where: { id: purchaseOrderId }, data: { status } })
  return status
}

// ─── Commandes / factures ──────────────────────────────────

export async function getPurchaseOrders(tenantId: string, status?: string, type?: string | null) {
  const docType = purchaseDocType(type)
  const statusFilter = status && status !== 'TOUT' && status !== 'ALL'
    ? (status === 'CONFIRMED' ? { status: { in: ['CONFIRMED', 'PENDING'] } } : { status })
    : {}
  return prisma.purchaseOrder.findMany({
    where: { tenantId, ...(docType ? { type: docType } : {}), ...statusFilter },
    include: {
      supplier: { select: { id: true, name: true, code: true } },
      client: { select: { id: true, name: true } },
      warehouse: { select: { id: true, code: true, name: true } },
      linkedOrder: { select: { id: true, number: true } },
      items: true,
      _count: { select: { receipts: true } },
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  })
}

export async function createPurchaseOrder(data: CreatePurchaseOrderData) {
  const { tenantId, supplierId, clientId, warehouseId, linkedOrderId, date, expectedDate, taxAmount, notes, items } = data
  const docType = purchaseDocType(data.type) ?? 'ORDER'

  // Les références liées doivent appartenir au tenant (anti-IDOR)
  await assertBelongsToTenant('supplier', supplierId, tenantId)
  await assertBelongsToTenant('client', clientId, tenantId)
  await assertBelongsToTenant('warehouse', warehouseId, tenantId)
  await assertBelongsToTenant('purchaseOrder', linkedOrderId, tenantId)
  await assertAllBelongToTenant('product', items.map((i) => i.productId), tenantId)
  if (linkedOrderId) {
    const linked = await prisma.purchaseOrder.findFirst({ where: { id: linkedOrderId, tenantId }, select: { type: true, supplierId: true } })
    if (!linked || linked.type !== 'ORDER') throw new BusinessError('La pièce liée doit être un bon de commande', 400)
    if (supplierId && linked.supplierId && linked.supplierId !== supplierId) throw new BusinessError('Fournisseur différent de celui de la commande', 400)
  }

  const subtotal = round3(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0))
  const status = docType === 'ORDER'
    ? (data.status === 'CONFIRMED' ? 'CONFIRMED' : 'DRAFT')
    : (data.status === 'VALIDATED' ? 'VALIDATED' : 'DRAFT')

  return prisma.$transaction(async (tx) => {
    const number = data.number?.trim() || await nextNumber(tx, docType, tenantId)
    if (await isTaken(tx, docType, tenantId, number)) throw new BusinessError(`Numéro "${number}" déjà utilisé`, 409)
    return tx.purchaseOrder.create({
      data: {
        tenantId,
        supplierId: supplierId || null,
        clientId: clientId || null,
        warehouseId: warehouseId || null,
        linkedOrderId: docType === 'INVOICE' ? (linkedOrderId || null) : null,
        supplierRef: data.supplierRef ?? null,
        number,
        type: docType,
        status,
        confirmedAt: status === 'CONFIRMED' ? new Date() : null,
        date: date ? new Date(date) : new Date(),
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        subtotal,
        taxAmount,
        total: round3(subtotal + taxAmount),
        notes: notes ?? null,
        items: {
          create: items.map((item) => ({
            productId: item.productId || null,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: round3(item.quantity * item.unitPrice),
          })),
        },
      },
      include: { supplier: true, items: true },
    })
  })
}

/** Détail d'une commande ou facture : lignes avec reçu / restant, réceptions, factures liées, rapprochement. */
export async function getPurchaseOrderDetail(tenantId: string, id: string) {
  const po = await prisma.purchaseOrder.findFirst({
    where: { id, tenantId },
    include: {
      supplier: { select: { id: true, name: true, code: true } },
      warehouse: { select: { id: true, code: true, name: true } },
      linkedOrder: { select: { id: true, number: true, status: true } },
      linkedInvoices: { select: { id: true, number: true, status: true, subtotal: true, total: true, date: true } },
      items: { include: { } },
      receipts: {
        orderBy: { date: 'desc' },
        select: { id: true, number: true, status: true, date: true, total: true, warehouse: { select: { id: true, name: true } } },
      },
    },
  })
  if (!po) return null
  const productIds = po.items.map(i => i.productId).filter((v): v is string => !!v)
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds }, tenantId }, select: { id: true, code: true, name: true, unit: true } })
    : []
  const pMap = new Map(products.map(p => [p.id, p]))
  const rec = po.type === 'ORDER' ? await receivedByLine(prisma, po.id) : new Map()
  const receiptCounts = po.type === 'ORDER' && po.items.length
    ? await prisma.goodsReceiptItem.groupBy({ by: ['purchaseOrderItemId'], where: { purchaseOrderItemId: { in: po.items.map(i => i.id) } }, _count: { _all: true } })
    : []
  const withReceipts = new Set(receiptCounts.map(c => c.purchaseOrderItemId))
  const lines = po.items.map(i => {
    const r = rec.get(i.id) ?? { received: 0, returned: 0, amount: 0 }
    const net = round3(r.received - r.returned)
    return {
      id: i.id, productId: i.productId, product: i.productId ? pMap.get(i.productId) ?? null : null,
      description: i.description, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice), total: Number(i.total),
      received: round3(r.received), returned: round3(r.returned), remaining: remainingQty(Number(i.quantity), net),
      hasReceipts: withReceipts.has(i.id),
    }
  })
  const status = po.type === 'ORDER' ? normalizePoStatus(po.status) : po.status
  const edit = purchaseEditMode(po.type, status, withReceipts.size > 0)
  const receivedAmount = round3(Array.from(rec.values()).reduce((s, r) => s + r.amount, 0))
  const invoicedAmount = round3(po.linkedInvoices.filter(i => i.status !== 'CANCELLED').reduce((s, i) => s + Number(i.subtotal), 0))
  return {
    ...po,
    status,
    lines,
    editMode: edit.mode,
    lockReason: edit.reason,
    summary: po.type === 'ORDER' ? invoicingSummary(Number(po.subtotal), receivedAmount, invoicedAmount) : null,
  }
}

/** Actions manuelles : confirm / cancel (commande), validate / pay / cancel (facture). */
export async function updatePurchaseStatus(tenantId: string, id: string, action: string) {
  const po = await prisma.purchaseOrder.findFirst({ where: { id, tenantId }, select: { id: true, type: true, status: true, _count: { select: { receipts: { where: { status: 'VALIDATED' } } } } } })
  if (!po) throw new BusinessError('Introuvable', 404)
  if (po.type === 'ORDER') {
    const to = action === 'confirm' ? 'CONFIRMED' : action === 'cancel' ? 'CANCELLED' : null
    if (!to || !canTransitionPo(po.status, to)) throw new BusinessError('Transition de statut impossible', 409)
    if (to === 'CANCELLED' && po._count.receipts > 0) throw new BusinessError('Commande déjà réceptionnée : utilisez un retour fournisseur', 409)
    return prisma.purchaseOrder.update({ where: { id }, data: { status: to, ...(to === 'CONFIRMED' ? { confirmedAt: new Date() } : {}) } })
  }
  const map: Record<string, { from: string[]; to: string }> = {
    validate: { from: ['DRAFT'], to: 'VALIDATED' },
    pay: { from: ['VALIDATED'], to: 'PAID' },
    cancel: { from: ['DRAFT', 'VALIDATED'], to: 'CANCELLED' },
  }
  const tr = map[action]
  if (!tr || !tr.from.includes(po.status)) throw new BusinessError('Transition de statut impossible', 409)
  return prisma.purchaseOrder.update({ where: { id }, data: { status: tr.to } })
}

function parseDate(v: string | null | undefined, field: string): Date | null {
  if (!v) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) throw new BusinessError(`Date invalide (${field})`, 400)
  return d
}

function editErrorMessage(e: OrderEditError, desc: (id?: string) => string): string {
  switch (e.code) {
    case 'LOCKED': return 'Document verrouillé : modification impossible'
    case 'NO_LINES': return 'Au moins une ligne est requise'
    case 'UNKNOWN_LINE': return 'Ligne de commande invalide'
    case 'DUPLICATE_LINE': return 'Ligne de commande en double'
    case 'LINE_HAS_RECEIPTS': return `La ligne « ${desc(e.lineId)} » a déjà été réceptionnée : suppression impossible`
    case 'PRODUCT_CHANGED': return `La ligne « ${desc(e.lineId)} » a déjà été réceptionnée : l'article ne peut pas être changé`
    case 'QTY_BELOW_RECEIVED': return `Quantité inférieure au déjà reçu pour « ${desc(e.lineId)} » (minimum ${e.min})`
  }
}

/**
 * Modifie une commande (DRAFT / CONFIRMED / PARTIALLY_RECEIVED, lignes contraintes par le reçu)
 * ou une facture fournisseur (DRAFT uniquement). Ne touche jamais au stock.
 * Verrouille la ligne PurchaseOrder (FOR UPDATE) : sérialisé avec les réceptions concurrentes.
 */
export async function updatePurchaseDoc(tenantId: string, id: string, data: UpdatePurchaseDocData) {
  await assertBelongsToTenant('supplier', data.supplierId, tenantId)
  await assertBelongsToTenant('warehouse', data.warehouseId, tenantId)
  await assertAllBelongToTenant('product', data.items.map(i => i.productId), tenantId)
  const date = parseDate(data.date, 'date')
  const expectedDate = parseDate(data.expectedDate, 'expectedDate')

  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "PurchaseOrder" WHERE id = ${id} AND "tenantId" = ${tenantId} FOR UPDATE`
    if (!locked.length) throw new BusinessError('Introuvable', 404)
    const po = await tx.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: { items: { include: { _count: { select: { receiptItems: true } } } } },
    })
    if (!po) throw new BusinessError('Introuvable', 404)
    const isOrder = po.type === 'ORDER'
    const hasReceipts = isOrder && po.items.some(i => i._count.receiptItems > 0)
    const { mode, reason } = purchaseEditMode(po.type, po.status, hasReceipts)
    if (mode === 'locked') {
      throw new BusinessError(isOrder
        ? 'Commande soldée ou annulée : modification impossible'
        : `Facture ${reason === 'INVOICE_PAID' ? 'payée' : reason === 'INVOICE_CANCELLED' ? 'annulée' : 'validée'} : modification impossible (établir un avoir fournisseur)`, 409)
    }
    if (isOrder && !data.supplierId) throw new BusinessError('Fournisseur requis', 400)
    if (hasReceipts && data.supplierId !== po.supplierId) throw new BusinessError('Commande déjà réceptionnée : le fournisseur ne peut pas être changé', 409)
    if (data.warehouseId) {
      const wh = await tx.warehouse.findFirst({ where: { id: data.warehouseId, tenantId }, select: { isActive: true } })
      if (!wh?.isActive && data.warehouseId !== po.warehouseId) throw new BusinessError('Dépôt inactif', 400)
    }
    if (!isOrder && po.linkedOrderId && data.supplierId) {
      const linked = await tx.purchaseOrder.findFirst({ where: { id: po.linkedOrderId, tenantId }, select: { supplierId: true } })
      if (linked?.supplierId && linked.supplierId !== data.supplierId) throw new BusinessError('Fournisseur différent de celui de la commande', 400)
    }

    const rec = isOrder ? await receivedByLine(tx, po.id) : new Map<string, { received: number; returned: number; amount: number }>()
    const existing = po.items.map(i => {
      const r = rec.get(i.id)
      return { id: i.id, productId: i.productId, received: r ? r.received - r.returned : 0, hasReceipts: i._count.receiptItems > 0 }
    })
    const errors = validateOrderEdit(existing, data.items.map(i => ({ id: i.id || null, productId: i.productId || null, quantity: i.quantity, unitPrice: i.unitPrice })), mode)
    if (errors.length) {
      const desc = (lineId?: string) => po.items.find(i => i.id === lineId)?.description ?? '?'
      throw new BusinessError(editErrorMessage(errors[0], desc), errors[0].code === 'UNKNOWN_LINE' || errors[0].code === 'NO_LINES' ? 400 : 409)
    }

    const oldSub = Number(po.subtotal)
    const vatRate = data.vatRate ?? (oldSub > 0 ? round3(Number(po.taxAmount) / oldSub * 100) : Number(po.taxRate))
    const totals = purchaseTotals(data.items, { rate: vatRate })

    const keep = new Set(data.items.map(i => i.id).filter((v): v is string => !!v))
    const toDelete = po.items.filter(i => !keep.has(i.id)).map(i => i.id)
    if (toDelete.length) await tx.purchaseOrderItem.deleteMany({ where: { id: { in: toDelete }, purchaseOrderId: po.id } })
    for (const it of data.items) {
      const row = {
        productId: it.productId || null, description: it.description, quantity: it.quantity, unitPrice: it.unitPrice,
        total: round3(it.quantity * it.unitPrice),
      }
      if (it.id) await tx.purchaseOrderItem.update({ where: { id: it.id }, data: row })
      else await tx.purchaseOrderItem.create({ data: { ...row, purchaseOrderId: po.id } })
    }
    await tx.purchaseOrder.update({
      where: { id: po.id },
      data: {
        supplierId: data.supplierId || null,
        warehouseId: isOrder ? (data.warehouseId || null) : po.warehouseId,
        supplierRef: data.supplierRef ?? null,
        notes: data.notes ?? null,
        ...(date ? { date } : {}),
        expectedDate: isOrder ? expectedDate : po.expectedDate,
        taxRate: vatRate,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        total: totals.total,
      },
    })
    // Baisser une quantité au niveau du reçu peut solder la commande
    if (isOrder) await refreshPoStatus(tx, po.id)
    return tx.purchaseOrder.findUnique({ where: { id: po.id }, include: { supplier: true, items: true } })
  }, { timeout: 30000 })
}

/** Supprime un brouillon sans réception. */
export async function deletePurchaseDraft(tenantId: string, id: string) {
  const po = await prisma.purchaseOrder.findFirst({ where: { id, tenantId }, select: { status: true, _count: { select: { receipts: true, linkedInvoices: true } } } })
  if (!po) throw new BusinessError('Introuvable', 404)
  if (po.status !== 'DRAFT' || po._count.receipts > 0 || po._count.linkedInvoices > 0) throw new BusinessError('Seul un brouillon sans pièce liée peut être supprimé', 409)
  await prisma.purchaseOrder.delete({ where: { id } })
  return { success: true }
}

/** Brouillon de commande depuis la liste « à commander » des alertes stock. */
export async function createPoFromAlerts(tenantId: string, data: z.infer<typeof poFromAlertsSchema>) {
  await assertBelongsToTenant('supplier', data.supplierId, tenantId)
  await assertBelongsToTenant('warehouse', data.warehouseId, tenantId)
  const alerts = await getStockAlerts(tenantId)
  const byId = new Map(alerts.toOrder.map(r => [r.productId, r]))
  let lines: Array<{ productId: string; quantity: number }>
  if (data.items?.length) {
    await assertAllBelongToTenant('product', data.items.map(i => i.productId), tenantId)
    lines = data.items
  } else {
    lines = alerts.toOrder.filter(r => r.suggestedQty > 0).map(r => ({ productId: r.productId, quantity: r.suggestedQty }))
  }
  if (!lines.length) throw new BusinessError('Aucun article à commander', 400)
  const products = await prisma.product.findMany({ where: { tenantId, id: { in: lines.map(l => l.productId) } }, select: { id: true, code: true, name: true, purchasePrice: true, averageCost: true } })
  const pMap = new Map(products.map(p => [p.id, p]))
  return createPurchaseOrder({
    tenantId, supplierId: data.supplierId, warehouseId: data.warehouseId ?? null, type: 'ORDER', taxAmount: 0,
    notes: 'Créé depuis les alertes de stock (à commander)',
    items: lines.map(l => {
      const p = pMap.get(l.productId)!
      const cost = Number(p.purchasePrice) || Number(p.averageCost) || byId.get(l.productId)?.unitCost || 0
      return { productId: p.id, description: `${p.code} — ${p.name}`, quantity: l.quantity, unitPrice: cost }
    }),
  })
}

// ─── Bons de réception ─────────────────────────────────────

const receiptInclude = {
  supplier: { select: { id: true, name: true, code: true } },
  warehouse: { select: { id: true, code: true, name: true } },
  purchaseOrder: { select: { id: true, number: true, status: true } },
  items: { include: { product: { select: { id: true, code: true, name: true, unit: true } }, returnItems: { select: { quantity: true } } } },
  returns: { select: { id: true, number: true, date: true, total: true } },
} satisfies Prisma.GoodsReceiptInclude

export async function getReceipts(tenantId: string, opts: { status?: string | null; purchaseOrderId?: string | null } = {}) {
  return prisma.goodsReceipt.findMany({
    where: {
      tenantId,
      ...(opts.status && opts.status !== 'ALL' ? { status: opts.status } : {}),
      ...(opts.purchaseOrderId ? { purchaseOrderId: opts.purchaseOrderId } : {}),
    },
    include: {
      supplier: { select: { id: true, name: true } },
      warehouse: { select: { id: true, name: true } },
      purchaseOrder: { select: { id: true, number: true } },
      _count: { select: { items: true, returns: true } },
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  })
}

export async function getReceipt(tenantId: string, id: string) {
  const r = await prisma.goodsReceipt.findFirst({ where: { id, tenantId }, include: receiptInclude })
  if (!r) return null
  return {
    ...r,
    items: r.items.map(i => {
      const returned = i.returnItems.reduce((s, x) => s + Number(x.quantity), 0)
      return { ...i, returned: round3(returned), returnable: returnableQty(Number(i.quantity), returned) }
    }),
  }
}

/** Mouvements d'entrée d'une réception (dans la transaction). */
async function postReceiptTx(tx: Tx, tenantId: string, receiptId: string, userId: string | null) {
  const r = await tx.goodsReceipt.findFirst({ where: { id: receiptId, tenantId }, include: { items: true } })
  if (!r) throw new BusinessError('Introuvable', 404)
  if (r.status !== 'DRAFT') throw new BusinessError('Réception déjà validée ou annulée', 409)
  const settings = await getStockSettings(tenantId, tx)
  for (const it of r.items) {
    if (Number(it.quantity) <= 0) continue
    await applyMovementTx(tx, {
      tenantId, productId: it.productId, warehouseId: r.warehouseId, type: StockMovementType.ENTRY,
      quantity: Number(it.quantity), unitCost: Number(it.unitCost), reason: 'PURCHASE',
      reference: r.number, sourceType: 'PURCHASE_RECEIPT', sourceId: r.id, createdById: userId,
      allowNegative: settings.allowNegativeStock,
    })
  }
  await tx.goodsReceipt.update({ where: { id: r.id }, data: { status: 'VALIDATED', validatedAt: new Date() } })
  if (r.purchaseOrderId) await refreshPoStatus(tx, r.purchaseOrderId)
}

export async function createReceipt(tenantId: string, data: ReceiptData, opts: { userId?: string | null; isAdmin?: boolean } = {}) {
  if (data.allowOverReceipt && !opts.isAdmin) throw new BusinessError('Réception au-delà du commandé : réservé aux administrateurs', 403)
  await assertBelongsToTenant('warehouse', data.warehouseId, tenantId)
  await assertBelongsToTenant('supplier', data.supplierId, tenantId)
  await assertBelongsToTenant('purchaseOrder', data.purchaseOrderId, tenantId)
  const wh = await prisma.warehouse.findFirst({ where: { id: data.warehouseId, tenantId }, select: { isActive: true } })
  if (!wh?.isActive) throw new BusinessError('Dépôt inactif', 400)

  return prisma.$transaction(async (tx) => {
    let supplierId = data.supplierId || null
    type Line = { purchaseOrderItemId: string | null; productId: string; description: string | null; quantity: number; unitCost: number }
    let lines: Line[] = []

    if (data.purchaseOrderId) {
      // Verrou de la commande : sérialise les réceptions concurrentes
      await tx.$queryRaw`SELECT id FROM "PurchaseOrder" WHERE id = ${data.purchaseOrderId} AND "tenantId" = ${tenantId} FOR UPDATE`
      const po = await tx.purchaseOrder.findFirst({ where: { id: data.purchaseOrderId, tenantId }, include: { items: true } })
      if (!po || po.type !== 'ORDER') throw new BusinessError('Bon de commande introuvable', 404)
      if (!canReceive(po.status)) throw new BusinessError('La commande doit être confirmée (et non soldée) pour être réceptionnée', 409)
      supplierId = po.supplierId
      const poLines = new Map(po.items.map(i => [i.id, i]))
      const rec = await receivedByLine(tx, po.id)
      for (const it of data.items) {
        if (!it.purchaseOrderItemId || !poLines.has(it.purchaseOrderItemId)) throw new BusinessError('Ligne de commande invalide', 400)
      }
      const checks = data.items.filter(i => i.quantity > 0).map(i => {
        const pl = poLines.get(i.purchaseOrderItemId as string)!
        const r = rec.get(pl.id)
        return { lineId: pl.id, ordered: Number(pl.quantity), alreadyReceived: r ? r.received - r.returned : 0, receiving: i.quantity }
      })
      const over = findOverReceipts(checks, data.allowOverReceipt)
      if (over.length) {
        const pl = poLines.get(over[0].lineId)!
        throw new BusinessError(`Quantité supérieure au restant à recevoir pour « ${pl.description} » (restant ${over[0].remaining})`, 409)
      }
      lines = data.items.filter(i => i.quantity > 0).map(i => {
        const pl = poLines.get(i.purchaseOrderItemId as string)!
        if (!pl.productId) throw new BusinessError(`La ligne « ${pl.description} » n'est liée à aucun article stocké`, 400)
        return { purchaseOrderItemId: pl.id, productId: pl.productId, description: pl.description, quantity: i.quantity, unitCost: i.unitCost }
      })
    } else {
      if (!supplierId) throw new BusinessError('Fournisseur requis pour une réception sans commande', 400)
      await assertAllBelongToTenant('product', data.items.map(i => i.productId), tenantId, tx)
      lines = data.items.filter(i => i.quantity > 0).map(i => {
        if (!i.productId) throw new BusinessError('Article requis', 400)
        return { purchaseOrderItemId: null, productId: i.productId, description: i.description ?? null, quantity: i.quantity, unitCost: i.unitCost }
      })
    }
    if (!lines.length) throw new BusinessError('Aucune quantité à recevoir', 400)

    const number = await nextNumber(tx, 'RECEIPT', tenantId)
    const receipt = await tx.goodsReceipt.create({
      data: {
        tenantId, number, supplierId, purchaseOrderId: data.purchaseOrderId || null, warehouseId: data.warehouseId,
        status: 'DRAFT', date: data.date ? new Date(data.date) : new Date(), supplierRef: data.supplierRef ?? null,
        notes: data.notes ?? null, total: linesAmount(lines), createdById: opts.userId ?? null,
        items: { create: lines },
      },
    })
    if (data.validate) await postReceiptTx(tx, tenantId, receipt.id, opts.userId ?? null)
    return tx.goodsReceipt.findUnique({ where: { id: receipt.id }, include: receiptInclude })
  }, { timeout: 30000 })
}

export async function validateReceipt(tenantId: string, id: string, userId?: string | null, isAdmin = false) {
  return prisma.$transaction(async (tx) => {
    const r = await tx.goodsReceipt.findFirst({ where: { id, tenantId }, include: { items: true } })
    if (!r) throw new BusinessError('Introuvable', 404)
    if (r.purchaseOrderId && !isAdmin) {
      // Re-contrôle du dépassement au moment de la validation (d'autres réceptions ont pu être validées)
      await tx.$queryRaw`SELECT id FROM "PurchaseOrder" WHERE id = ${r.purchaseOrderId} FOR UPDATE`
      const po = await tx.purchaseOrder.findUnique({ where: { id: r.purchaseOrderId }, include: { items: true } })
      if (!po || !canReceive(po.status)) throw new BusinessError('La commande n\'est plus réceptionnable', 409)
      const rec = await receivedByLine(tx, po.id)
      const over = findOverReceipts(r.items.filter(i => i.purchaseOrderItemId).map(i => {
        const pl = po.items.find(p => p.id === i.purchaseOrderItemId)
        const x = rec.get(i.purchaseOrderItemId as string)
        return { lineId: i.purchaseOrderItemId as string, ordered: Number(pl?.quantity ?? 0), alreadyReceived: x ? x.received - x.returned : 0, receiving: Number(i.quantity) }
      }))
      if (over.length) throw new BusinessError('Quantité supérieure au restant à recevoir', 409)
    }
    await postReceiptTx(tx, tenantId, id, userId ?? null)
    return tx.goodsReceipt.findUnique({ where: { id }, include: receiptInclude })
  }, { timeout: 30000 })
}

export async function cancelReceipt(tenantId: string, id: string) {
  const r = await prisma.goodsReceipt.findFirst({ where: { id, tenantId }, select: { status: true } })
  if (!r) throw new BusinessError('Introuvable', 404)
  if (r.status !== 'DRAFT') throw new BusinessError('Une réception validée ne s\'annule pas : faites un retour fournisseur', 409)
  return prisma.goodsReceipt.update({ where: { id }, data: { status: 'CANCELLED' } })
}

// ─── Retours fournisseurs ──────────────────────────────────

export async function getSupplierReturns(tenantId: string) {
  return prisma.supplierReturn.findMany({
    where: { tenantId },
    include: {
      supplier: { select: { id: true, name: true } },
      warehouse: { select: { id: true, name: true } },
      receipt: { select: { id: true, number: true } },
      items: { include: { product: { select: { id: true, code: true, name: true, unit: true } } } },
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  })
}

export async function createSupplierReturn(tenantId: string, data: z.infer<typeof supplierReturnSchema>, userId?: string | null) {
  await assertBelongsToTenant('goodsReceipt', data.receiptId, tenantId)
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "GoodsReceipt" WHERE id = ${data.receiptId} AND "tenantId" = ${tenantId} FOR UPDATE`
    const r = await tx.goodsReceipt.findFirst({
      where: { id: data.receiptId, tenantId },
      include: { items: { include: { returnItems: { select: { quantity: true } } } } },
    })
    if (!r) throw new BusinessError('Introuvable', 404)
    if (r.status !== 'VALIDATED') throw new BusinessError('Seule une réception validée peut faire l\'objet d\'un retour', 409)
    const byId = new Map(r.items.map(i => [i.id, i]))
    const lines = data.items.filter(i => i.quantity > 0).map(i => {
      const ri = byId.get(i.receiptItemId)
      if (!ri) throw new BusinessError('Ligne de réception invalide', 400)
      const returned = ri.returnItems.reduce((s, x) => s + Number(x.quantity), 0)
      const max = returnableQty(Number(ri.quantity), returned)
      if (round3(i.quantity) > max) throw new BusinessError(`Quantité retournée supérieure au retournable (${max})`, 409)
      return { receiptItemId: ri.id, productId: ri.productId, quantity: i.quantity, unitCost: Number(ri.unitCost) }
    })
    if (!lines.length) throw new BusinessError('Aucune quantité à retourner', 400)

    const settings = await getStockSettings(tenantId, tx)
    const number = await nextNumber(tx, 'RETURN', tenantId)
    const ret = await tx.supplierReturn.create({
      data: {
        tenantId, number, receiptId: r.id, supplierId: r.supplierId, warehouseId: r.warehouseId, status: 'VALIDATED',
        date: data.date ? new Date(data.date) : new Date(), notes: data.notes ?? null, total: linesAmount(lines),
        createdById: userId ?? null, items: { create: lines },
      },
    })
    for (const l of lines) {
      await applyMovementTx(tx, {
        tenantId, productId: l.productId, warehouseId: r.warehouseId, type: StockMovementType.EXIT,
        quantity: l.quantity, reason: 'SUPPLIER_RETURN', reference: number, notes: `Retour sur ${r.number}`,
        sourceType: 'SUPPLIER_RETURN', sourceId: ret.id, createdById: userId ?? null, allowNegative: settings.allowNegativeStock,
      })
    }
    if (r.purchaseOrderId) await refreshPoStatus(tx, r.purchaseOrderId)
    return ret
  }, { timeout: 30000 })
}

/** Dépôt par défaut (aide UI). */
export async function defaultReceiptWarehouse(tenantId: string) {
  return getDefaultWarehouseId(tenantId)
}
