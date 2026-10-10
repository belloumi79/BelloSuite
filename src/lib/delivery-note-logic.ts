/**
 * Logique pure des bons de livraison (BL) : choix du dépôt et contrôle du stock disponible.
 * Testée dans __tests__/delivery-note-logic.test.ts. Aucun accès base ici.
 */
import { round3 } from '@/lib/stock-logic'

export interface DeliveryLine {
  productId?: string | null
  quantity: number | string
}

export interface Shortage {
  productId: string
  requested: number
  available: number
}

export interface WarehouseRef {
  id: string
  isActive: boolean
  isDefault?: boolean
}

/** Quantités demandées agrégées par produit (lignes sans produit ou quantité ≤ 0 ignorées). */
export function aggregateQuantities(lines: DeliveryLine[]): Record<string, number> {
  const m: Record<string, number> = {}
  for (const l of lines) {
    const q = Number(l.quantity)
    if (!l.productId || !Number.isFinite(q) || q <= 0) continue
    m[l.productId] = round3((m[l.productId] || 0) + q)
  }
  return m
}

/**
 * Produits dont la quantité demandée (toutes lignes confondues) dépasse le stock du dépôt.
 * Vide si le stock négatif est autorisé.
 */
export function findShortages(lines: DeliveryLine[], available: Record<string, number>, allowNegative: boolean): Shortage[] {
  if (allowNegative) return []
  const req = aggregateQuantities(lines)
  return Object.entries(req)
    .filter(([pid, q]) => q > round3(Number(available[pid] ?? 0)))
    .map(([productId, requested]) => ({ productId, requested, available: round3(Number(available[productId] ?? 0)) }))
}

export type WarehouseChoice =
  | { ok: true; warehouseId: string | null }
  | { ok: false; code: 'WAREHOUSE_INVALID' | 'WAREHOUSE_INACTIVE' }

/**
 * Dépôt de sortie d'un BL.
 * - dépôt demandé : doit appartenir au tenant (présent dans `warehouses`) et être actif ;
 * - rien de demandé : dépôt par défaut actif, sinon premier actif ;
 * - aucun dépôt actif : null (le stock global du produit est alors utilisé, comme avant les dépôts).
 */
export function chooseWarehouse(requestedId: string | null | undefined, warehouses: WarehouseRef[]): WarehouseChoice {
  if (requestedId) {
    const w = warehouses.find(x => x.id === requestedId)
    if (!w) return { ok: false, code: 'WAREHOUSE_INVALID' }
    if (!w.isActive) return { ok: false, code: 'WAREHOUSE_INACTIVE' }
    return { ok: true, warehouseId: w.id }
  }
  const active = warehouses.filter(w => w.isActive)
  const def = active.find(w => w.isDefault) ?? active[0]
  return { ok: true, warehouseId: def?.id ?? null }
}
