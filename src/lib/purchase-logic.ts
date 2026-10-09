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
