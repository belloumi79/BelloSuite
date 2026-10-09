/**
 * Logique pure du cycle d'achat (sans accès base) — testée dans __tests__/purchase-logic.test.ts.
 *
 * Pratique tunisienne retenue : seul le bon de réception (et le retour fournisseur) mouvemente le stock.
 * Le bon de commande et la facture fournisseur sont des documents commerciaux / fiscaux.
 */
import { round3 } from '@/lib/stock-logic'

export const PO_STATUSES = ['DRAFT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'] as const
export type PoStatus = (typeof PO_STATUSES)[number]

export const RECEIPT_STATUSES = ['DRAFT', 'VALIDATED', 'CANCELLED'] as const
export const INVOICE_STATUSES = ['DRAFT', 'VALIDATED', 'PAID', 'CANCELLED'] as const

/** Type stocké en base (PurchaseOrder.type) ↔ type de document de l'interface. */
export function purchaseDocType(t: string | null | undefined): 'ORDER' | 'INVOICE' | null {
  if (!t) return null
  const u = t.toUpperCase()
  if (u === 'ORDER' || u === 'SUPPLIER_ORDER' || u === 'PURCHASE_ORDER') return 'ORDER'
  if (u === 'INVOICE' || u === 'SUPPLIER_INVOICE' || u === 'PURCHASE_INVOICE') return 'INVOICE'
  return null
}

/** Statut historique « PENDING » = commande confirmée. */
export function normalizePoStatus(s: string | null | undefined): PoStatus {
  if (s === 'PENDING') return 'CONFIRMED'
  return (PO_STATUSES as readonly string[]).includes(s ?? '') ? (s as PoStatus) : 'DRAFT'
}

/** Quantité restant à recevoir sur une ligne (jamais négative). */
export function remainingQty(ordered: number, received: number): number {
  return Math.max(0, round3(Number(ordered) - Number(received)))
}

/** Quantité encore retournable sur une ligne de réception. */
export function returnableQty(received: number, returned: number): number {
  return Math.max(0, round3(Number(received) - Number(returned)))
}

export interface PoLineProgress { ordered: number; received: number }

/**
 * Statut d'une commande d'après ses réceptions validées.
 * DRAFT et CANCELLED sont conservés ; sinon CONFIRMED → PARTIALLY_RECEIVED → RECEIVED.
 */
export function poStatusFromReceipts(current: string, lines: PoLineProgress[]): PoStatus {
  const cur = normalizePoStatus(current)
  if (cur === 'DRAFT' || cur === 'CANCELLED') return cur
  const counted = lines.filter(l => Number(l.ordered) > 0)
  if (counted.length === 0) return 'CONFIRMED'
  const anyReceived = counted.some(l => Number(l.received) > 0)
  const allReceived = counted.every(l => round3(Number(l.received)) >= round3(Number(l.ordered)))
  if (allReceived) return 'RECEIVED'
  if (anyReceived) return 'PARTIALLY_RECEIVED'
  return 'CONFIRMED'
}

/** Transitions manuelles autorisées sur une commande. */
export function canTransitionPo(from: string, to: string): boolean {
  const f = normalizePoStatus(from)
  if (to === 'CONFIRMED') return f === 'DRAFT'
  if (to === 'CANCELLED') return f === 'DRAFT' || f === 'CONFIRMED'
  return false
}

/** Une commande peut recevoir des marchandises. */
export function canReceive(status: string): boolean {
  const s = normalizePoStatus(status)
  return s === 'CONFIRMED' || s === 'PARTIALLY_RECEIVED'
}

export interface ReceiptLineCheck { lineId: string; ordered: number; alreadyReceived: number; receiving: number }
export interface OverReceipt { lineId: string; remaining: number; receiving: number }

/** Lignes qui dépasseraient la quantité commandée (vide si tout est conforme ou si autorisé). */
export function findOverReceipts(lines: ReceiptLineCheck[], allowOver = false): OverReceipt[] {
  if (allowOver) return []
  const out: OverReceipt[] = []
  for (const l of lines) {
    const remaining = remainingQty(l.ordered, l.alreadyReceived)
    if (round3(Number(l.receiving)) > remaining) out.push({ lineId: l.lineId, remaining, receiving: round3(Number(l.receiving)) })
  }
  return out
}

/** Montant HT d'un ensemble de lignes (quantité × coût unitaire), arrondi au millime. */
export function linesAmount(lines: Array<{ quantity: number; unitCost: number }>): number {
  return round3(lines.reduce((s, l) => s + Number(l.quantity) * Number(l.unitCost), 0))
}

/** Rapprochement commande / réceptions / factures (montants HT). */
export function invoicingSummary(ordered: number, received: number, invoiced: number) {
  const r = round3(received)
  const i = round3(invoiced)
  return {
    ordered: round3(ordered),
    received: r,
    invoiced: i,
    toInvoice: Math.max(0, round3(r - i)),
    overInvoiced: Math.max(0, round3(i - r)),
    status: i === 0 ? 'NOT_INVOICED' : i < r ? 'PARTIALLY_INVOICED' : i === r ? 'INVOICED' : 'OVER_INVOICED',
  } as const
}

// ─── Modification d'une commande / facture ──────────────────

/**
 * Mode d'édition d'un document d'achat :
 * - `full` : tout est modifiable (commande DRAFT / CONFIRMED sans réception, facture DRAFT) ;
 * - `received` : commande partiellement reçue — en-tête modifiable, lignes contraintes par le déjà-reçu ;
 * - `locked` : lecture seule (commande soldée / annulée, facture validée / payée / annulée).
 */
export type PurchaseEditMode = 'full' | 'received' | 'locked'
export type PurchaseLockReason = 'ORDER_RECEIVED' | 'ORDER_CANCELLED' | 'INVOICE_VALIDATED' | 'INVOICE_PAID' | 'INVOICE_CANCELLED'

export function purchaseEditMode(type: string, status: string, hasReceipts = false): { mode: PurchaseEditMode; reason: PurchaseLockReason | null } {
  if (purchaseDocType(type) === 'INVOICE') {
    if (status === 'DRAFT') return { mode: 'full', reason: null }
    const reason = status === 'PAID' ? 'INVOICE_PAID' : status === 'CANCELLED' ? 'INVOICE_CANCELLED' : 'INVOICE_VALIDATED'
    return { mode: 'locked', reason }
  }
  const s = normalizePoStatus(status)
  if (s === 'RECEIVED') return { mode: 'locked', reason: 'ORDER_RECEIVED' }
  if (s === 'CANCELLED') return { mode: 'locked', reason: 'ORDER_CANCELLED' }
  if (s === 'PARTIALLY_RECEIVED' || hasReceipts) return { mode: 'received', reason: null }
  return { mode: 'full', reason: null }
}

/** Ligne existante : quantité reçue nette des retours et présence d'une réception (même brouillon). */
export interface ExistingOrderLine { id: string; productId: string | null; received: number; hasReceipts: boolean }
/** Ligne soumise : `id` présent = ligne existante modifiée, absent = nouvelle ligne. */
export interface EditedOrderLine { id?: string | null; productId?: string | null; quantity: number; unitPrice: number }

export type OrderEditErrorCode = 'LOCKED' | 'NO_LINES' | 'UNKNOWN_LINE' | 'DUPLICATE_LINE' | 'LINE_HAS_RECEIPTS' | 'QTY_BELOW_RECEIVED' | 'PRODUCT_CHANGED'
export interface OrderEditError { code: OrderEditErrorCode; lineId?: string; min?: number }

/**
 * Contrôle d'une modification de lignes de commande au regard des réceptions :
 * une ligne réceptionnée ne peut ni être supprimée, ni changer d'article, ni descendre sous le reçu net.
 * Les nouvelles lignes sont toujours permises (sauf document verrouillé).
 */
export function validateOrderEdit(existing: ExistingOrderLine[], next: EditedOrderLine[], mode: PurchaseEditMode = 'full'): OrderEditError[] {
  if (mode === 'locked') return [{ code: 'LOCKED' }]
  const errors: OrderEditError[] = []
  if (next.length === 0) errors.push({ code: 'NO_LINES' })
  const byId = new Map(existing.map(l => [l.id, l]))
  const seen = new Set<string>()
  for (const l of next) {
    if (!l.id) continue
    const ex = byId.get(l.id)
    if (!ex) { errors.push({ code: 'UNKNOWN_LINE', lineId: l.id }); continue }
    if (seen.has(l.id)) { errors.push({ code: 'DUPLICATE_LINE', lineId: l.id }); continue }
    seen.add(l.id)
    const received = round3(Math.max(0, Number(ex.received)))
    if (ex.hasReceipts && (l.productId ?? null) !== (ex.productId ?? null)) errors.push({ code: 'PRODUCT_CHANGED', lineId: l.id })
    if (round3(Number(l.quantity)) < received) errors.push({ code: 'QTY_BELOW_RECEIVED', lineId: l.id, min: received })
  }
  for (const ex of existing) {
    if (!seen.has(ex.id) && ex.hasReceipts) errors.push({ code: 'LINE_HAS_RECEIPTS', lineId: ex.id })
  }
  return errors
}

/** Totaux d'un document d'achat : HT = Σ qté × PU, TVA = HT × taux % (ou montant fourni), TTC. Arrondis au millime. */
export function purchaseTotals(lines: Array<{ quantity: number; unitPrice: number }>, tax: { rate?: number | null; amount?: number | null }) {
  const subtotal = round3(lines.reduce((s, l) => s + Number(l.quantity) * Number(l.unitPrice), 0))
  const taxAmount = tax.rate !== null && tax.rate !== undefined
    ? round3(subtotal * Number(tax.rate) / 100)
    : round3(Math.max(0, Number(tax.amount ?? 0)))
  return { subtotal, taxAmount, total: round3(subtotal + taxAmount) }
}
