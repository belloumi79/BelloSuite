/**
 * Logique métier PURE du module stock (sans accès base) : testable unitairement.
 *
 * Conventions de quantité d'un mouvement (StockMovement.quantity) :
 *  - ENTRY      : quantité positive, ajoutée au stock du dépôt
 *  - EXIT       : quantité positive, retirée du stock du dépôt
 *  - ADJUSTMENT : quantité SIGNÉE (+ surplus / − manquant)
 *  - TRANSFER   : quantité SIGNÉE (− sortie du dépôt source / + entrée dans le dépôt destination)
 */

export type StockMovementKind = 'ENTRY' | 'EXIT' | 'ADJUSTMENT' | 'TRANSFER'

/** Précision interne (le dinar tunisien a 3 décimales ; les quantités aussi au plus 3). */
export function round3(n: number): number {
  return Math.round((n + Number.EPSILON) * 1000) / 1000
}

/** Arrondi à 6 décimales pour le CMUP (évite la dérive tout en restant précis). */
export function round6(n: number): number {
  return Math.round((n + Number.EPSILON) * 1e6) / 1e6
}

/** Variation de stock (signée) produite par un mouvement. */
export function movementDelta(type: StockMovementKind, quantity: number): number {
  const q = Number(quantity)
  if (!Number.isFinite(q)) throw new Error('Quantité invalide')
  switch (type) {
    case 'ENTRY':
      return Math.abs(q)
    case 'EXIT':
      return -Math.abs(q)
    case 'ADJUSTMENT':
    case 'TRANSFER':
      return q
    default:
      throw new Error(`Type de mouvement inconnu : ${String(type)}`)
  }
}

/**
 * Coût moyen unitaire pondéré (CMUP) après une entrée.
 *   CMUP = (Q_stock × CMUP_actuel + Q_entrée × coût_entrée) / (Q_stock + Q_entrée)
 * Si le stock existant est nul ou négatif, le nouveau CMUP est le coût de l'entrée
 * (on ne pondère pas avec une quantité négative, qui fausserait le coût).
 */
export function computeCmup(currentQty: number, currentAvg: number, inQty: number, inCost: number): number {
  const q0 = Number(currentQty) || 0
  const c0 = Number(currentAvg) || 0
  const q1 = Number(inQty) || 0
  const c1 = Number(inCost)
  if (q1 <= 0 || !Number.isFinite(c1) || c1 < 0) return round6(c0)
  if (q0 <= 0) return round6(c1)
  return round6((q0 * c0 + q1 * c1) / (q0 + q1))
}

export interface AvailabilityCheck {
  ok: boolean
  resulting: number
}

/** Vérifie qu'un mouvement ne rend pas le stock négatif (sauf autorisation). */
export function checkAvailability(available: number, delta: number, allowNegative: boolean): AvailabilityCheck {
  const resulting = round3(Number(available) + Number(delta))
  if (delta >= 0 || allowNegative) return { ok: true, resulting }
  return { ok: resulting >= 0, resulting }
}

// ─── Transferts ─────────────────────────────────────────────────────────────

export interface TransferLine {
  productId: string
  quantity: number
}

export interface TransferShortage {
  productId: string
  available: number
  requested: number
}

/**
 * Valide un transfert avant exécution : lignes positives, dépôts distincts, et (sauf autorisation)
 * stock suffisant dans le dépôt source. Les lignes d'un même produit sont cumulées.
 */
export function planTransfer(
  fromWarehouseId: string,
  toWarehouseId: string,
  lines: TransferLine[],
  availableInSource: Record<string, number>,
  allowNegative: boolean
): { ok: boolean; error?: 'SAME_WAREHOUSE' | 'NO_LINES' | 'INVALID_QTY' | 'INSUFFICIENT_STOCK'; shortages: TransferShortage[]; totals: Record<string, number> } {
  if (!fromWarehouseId || fromWarehouseId === toWarehouseId) return { ok: false, error: 'SAME_WAREHOUSE', shortages: [], totals: {} }
  if (!lines.length) return { ok: false, error: 'NO_LINES', shortages: [], totals: {} }
  const totals: Record<string, number> = {}
  for (const l of lines) {
    const q = Number(l.quantity)
    if (!l.productId || !Number.isFinite(q) || q <= 0) return { ok: false, error: 'INVALID_QTY', shortages: [], totals: {} }
    totals[l.productId] = round3((totals[l.productId] || 0) + q)
  }
  const shortages: TransferShortage[] = []
  if (!allowNegative) {
    for (const [productId, requested] of Object.entries(totals)) {
      const available = Number(availableInSource[productId] || 0)
      if (requested > available) shortages.push({ productId, available, requested })
    }
  }
  return shortages.length
    ? { ok: false, error: 'INSUFFICIENT_STOCK', shortages, totals }
    : { ok: true, shortages, totals }
}

// ─── Inventaire ─────────────────────────────────────────────────────────────

export interface InventoryLine {
  productId: string
  expectedQty: number
  actualQty: number
  counted: boolean
  unitCost: number
}

export interface InventoryAdjustment {
  productId: string
  delta: number
  value: number
  unitCost: number
}

/**
 * Écarts d'inventaire → ajustements. Seules les lignes comptées produisent un ajustement
 * (option `uncountedAsZero` : une ligne non comptée est considérée à 0).
 * Écart = quantité comptée − quantité théorique figée à l'ouverture de l'inventaire.
 */
export function inventoryAdjustments(lines: InventoryLine[], opts: { uncountedAsZero?: boolean } = {}): InventoryAdjustment[] {
  const out: InventoryAdjustment[] = []
  for (const l of lines) {
    if (!l.counted && !opts.uncountedAsZero) continue
    const counted = l.counted ? Number(l.actualQty) : 0
    const delta = round3(counted - Number(l.expectedQty))
    if (delta === 0) continue
    const unitCost = Number(l.unitCost) || 0
    out.push({ productId: l.productId, delta, unitCost, value: round3(delta * unitCost) })
  }
  return out
}

export interface InventorySummary {
  lines: number
  counted: number
  withGap: number
  gapQtyPlus: number
  gapQtyMinus: number
  gapValue: number
  gapValueAbs: number
  theoreticalValue: number
  countedValue: number
}

export function inventorySummary(lines: InventoryLine[]): InventorySummary {
  const s: InventorySummary = { lines: lines.length, counted: 0, withGap: 0, gapQtyPlus: 0, gapQtyMinus: 0, gapValue: 0, gapValueAbs: 0, theoreticalValue: 0, countedValue: 0 }
  for (const l of lines) {
    const cost = Number(l.unitCost) || 0
    s.theoreticalValue += Number(l.expectedQty) * cost
    if (!l.counted) continue
    s.counted++
    s.countedValue += Number(l.actualQty) * cost
    const d = round3(Number(l.actualQty) - Number(l.expectedQty))
    if (d !== 0) {
      s.withGap++
      if (d > 0) s.gapQtyPlus += d
      else s.gapQtyMinus += -d
      s.gapValue += d * cost
      s.gapValueAbs += Math.abs(d * cost)
    }
  }
  for (const k of ['gapQtyPlus', 'gapQtyMinus', 'gapValue', 'gapValueAbs', 'theoreticalValue', 'countedValue'] as const) s[k] = round3(s[k])
  return s
}

// ─── Alertes / réapprovisionnement ──────────────────────────────────────────

/** Seuil d'alerte effectif : le plus élevé du stock minimum et du point de commande. */
export function alertThreshold(minStock: number, reorderPoint = 0): number {
  return Math.max(Number(minStock) || 0, Number(reorderPoint) || 0)
}

/** Stock bas : un seuil est défini (> 0) et le stock est inférieur ou égal à ce seuil. */
export function isLowStock(stock: number, minStock: number, reorderPoint = 0): boolean {
  const t = alertThreshold(minStock, reorderPoint)
  return t > 0 && Number(stock) <= t
}

/**
 * Quantité suggérée à commander :
 *  - 0 si le stock est au-dessus du seuil ;
 *  - sinon la quantité de réapprovisionnement paramétrée, au minimum ce qu'il faut pour repasser au-dessus du seuil ;
 *  - sans quantité paramétrée : remonter le stock au double du seuil.
 */
export function suggestedOrderQty(stock: number, minStock: number, reorderPoint = 0, reorderQty = 0): number {
  const t = alertThreshold(minStock, reorderPoint)
  const s = Number(stock) || 0
  if (t <= 0 || s > t) return 0
  const toThreshold = round3(t - s)
  const rq = Number(reorderQty) || 0
  if (rq > 0) return round3(Math.max(rq, toThreshold))
  return round3(Math.max(2 * t - s, toThreshold))
}

// ─── Valorisation ───────────────────────────────────────────────────────────

/** Coût unitaire de valorisation : CMUP, à défaut le prix d'achat. */
export function valuationCost(averageCost: number, purchasePrice: number): number {
  const a = Number(averageCost) || 0
  return a > 0 ? a : Number(purchasePrice) || 0
}

export function stockValue(qty: number, unitCost: number): number {
  return round3((Number(qty) || 0) * (Number(unitCost) || 0))
}

// ─── Références & export ────────────────────────────────────────────────────

/** Référence lisible : PREFIX-AAAA-0001 */
export function formatReference(prefix: string, year: number, seq: number): string {
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`
}

/** CSV compatible Excel FR (séparateur « ; », BOM UTF-8, guillemets échappés). */
export function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  const esc = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return '\uFEFF' + rows.map(r => r.map(esc).join(';')).join('\r\n')
}
