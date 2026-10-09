/**
 * Module stock — logique métier pure (src/lib/stock-logic.ts)
 */

import {
  round3,
  movementDelta,
  computeCmup,
  checkAvailability,
  planTransfer,
  inventoryAdjustments,
  inventorySummary,
  alertThreshold,
  isLowStock,
  suggestedOrderQty,
  valuationCost,
  stockValue,
  formatReference,
  toCsv,
  type InventoryLine,
  type StockMovementKind,
} from '@/lib/stock-logic'

describe('round3', () => {
  it('arrondit à 3 décimales sans dérive flottante', () => {
    expect(round3(0.1 + 0.2)).toBe(0.3)
    expect(round3(-2.3456)).toBe(-2.346)
  })
})

describe('movementDelta', () => {
  it('ENTRY ajoute toujours une quantité positive', () => {
    expect(movementDelta('ENTRY', 5)).toBe(5)
    expect(movementDelta('ENTRY', -5)).toBe(5)
  })
  it('EXIT retire toujours une quantité', () => {
    expect(movementDelta('EXIT', 3)).toBe(-3)
    expect(movementDelta('EXIT', -3)).toBe(-3)
  })
  it('ADJUSTMENT et TRANSFER gardent le signe', () => {
    expect(movementDelta('ADJUSTMENT', -2.5)).toBe(-2.5)
    expect(movementDelta('ADJUSTMENT', 4)).toBe(4)
    expect(movementDelta('TRANSFER', -7)).toBe(-7)
    expect(movementDelta('TRANSFER', 7)).toBe(7)
  })
  it('rejette une quantité non finie ou un type inconnu', () => {
    expect(() => movementDelta('ENTRY', NaN)).toThrow('Quantité invalide')
    expect(() => movementDelta('ENTRY', Infinity)).toThrow('Quantité invalide')
    expect(() => movementDelta('FOO' as StockMovementKind, 1)).toThrow(/Type de mouvement inconnu/)
  })
})

describe('computeCmup (entrées)', () => {
  it('pondère stock existant et entrée', () => {
    // (10×2 + 30×3) / 40 = 2.75
    expect(computeCmup(10, 2, 30, 3)).toBe(2.75)
  })
  it('stock nul ou négatif : le CMUP devient le coût de l’entrée', () => {
    expect(computeCmup(0, 5, 10, 4)).toBe(4)
    expect(computeCmup(-3, 5, 10, 4)).toBe(4)
  })
  it('entrée invalide (qté ≤ 0, coût négatif ou NaN) : CMUP inchangé', () => {
    expect(computeCmup(10, 2.5, 0, 9)).toBe(2.5)
    expect(computeCmup(10, 2.5, -4, 9)).toBe(2.5)
    expect(computeCmup(10, 2.5, 4, -1)).toBe(2.5)
    expect(computeCmup(10, 2.5, 4, NaN)).toBe(2.5)
  })
  it('arrondit à 6 décimales', () => {
    // (1×1 + 2×2) / 3 = 1.6666…
    expect(computeCmup(1, 1, 2, 2)).toBe(1.666667)
  })
  it('entrée à coût nul fait baisser le CMUP', () => {
    expect(computeCmup(10, 4, 10, 0)).toBe(2)
  })
})

describe('checkAvailability (stock négatif)', () => {
  it('une entrée est toujours acceptée', () => {
    expect(checkAvailability(-5, 2, false)).toEqual({ ok: true, resulting: -3 })
  })
  it('une sortie couverte est acceptée', () => {
    expect(checkAvailability(10, -10, false)).toEqual({ ok: true, resulting: 0 })
  })
  it('une sortie qui rend le stock négatif est refusée', () => {
    expect(checkAvailability(3, -5, false)).toEqual({ ok: false, resulting: -2 })
  })
  it('stock négatif autorisé', () => {
    expect(checkAvailability(3, -5, true)).toEqual({ ok: true, resulting: -2 })
  })
  it('résultat arrondi (0.3 − 0.1 − 0.2 ≈ 0)', () => {
    const r = checkAvailability(0.3, -(0.1 + 0.2), false)
    expect(r.ok).toBe(true)
    expect(r.resulting).toBe(0)
  })
})

describe('planTransfer', () => {
  const avail = { A: 10, B: 2 }

  it('refuse même dépôt ou source vide', () => {
    expect(planTransfer('W1', 'W1', [{ productId: 'A', quantity: 1 }], avail, false).error).toBe('SAME_WAREHOUSE')
    expect(planTransfer('', 'W2', [{ productId: 'A', quantity: 1 }], avail, false).error).toBe('SAME_WAREHOUSE')
  })
  it('refuse un transfert sans lignes', () => {
    expect(planTransfer('W1', 'W2', [], avail, false)).toEqual({ ok: false, error: 'NO_LINES', shortages: [], totals: {} })
  })
  it('refuse une quantité invalide ou un produit manquant', () => {
    expect(planTransfer('W1', 'W2', [{ productId: 'A', quantity: 0 }], avail, false).error).toBe('INVALID_QTY')
    expect(planTransfer('W1', 'W2', [{ productId: 'A', quantity: -1 }], avail, false).error).toBe('INVALID_QTY')
    expect(planTransfer('W1', 'W2', [{ productId: '', quantity: 1 }], avail, false).error).toBe('INVALID_QTY')
    expect(planTransfer('W1', 'W2', [{ productId: 'A', quantity: NaN }], avail, false).error).toBe('INVALID_QTY')
  })
  it('cumule les lignes en double d’un même produit', () => {
    const r = planTransfer('W1', 'W2', [
      { productId: 'A', quantity: 4 },
      { productId: 'A', quantity: 0.1 },
      { productId: 'A', quantity: 0.2 },
      { productId: 'B', quantity: 1 },
    ], avail, false)
    expect(r.ok).toBe(true)
    expect(r.totals).toEqual({ A: 4.3, B: 1 })
    expect(r.shortages).toEqual([])
  })
  it('détecte le manque sur le total cumulé (chaque ligne seule passerait)', () => {
    const r = planTransfer('W1', 'W2', [
      { productId: 'B', quantity: 1.5 },
      { productId: 'B', quantity: 1.5 },
      { productId: 'C', quantity: 1 },
    ], avail, false)
    expect(r.ok).toBe(false)
    expect(r.error).toBe('INSUFFICIENT_STOCK')
    expect(r.shortages).toEqual([
      { productId: 'B', available: 2, requested: 3 },
      { productId: 'C', available: 0, requested: 1 },
    ])
    expect(r.totals).toEqual({ B: 3, C: 1 })
  })
  it('stock exactement suffisant : OK', () => {
    expect(planTransfer('W1', 'W2', [{ productId: 'A', quantity: 10 }], avail, false).ok).toBe(true)
  })
  it('stock négatif autorisé : pas de contrôle de disponibilité', () => {
    const r = planTransfer('W1', 'W2', [{ productId: 'B', quantity: 50 }], avail, true)
    expect(r).toEqual({ ok: true, shortages: [], totals: { B: 50 } })
  })
})

describe('inventoryAdjustments', () => {
  const lines: InventoryLine[] = [
    { productId: 'P1', expectedQty: 10, actualQty: 12, counted: true, unitCost: 2.5 }, // +2
    { productId: 'P2', expectedQty: 8, actualQty: 5, counted: true, unitCost: 1.2 }, // −3
    { productId: 'P3', expectedQty: 4, actualQty: 4, counted: true, unitCost: 9 }, // pas d’écart
    { productId: 'P4', expectedQty: 6, actualQty: 0, counted: false, unitCost: 3 }, // non compté
  ]

  it('ne produit un ajustement que pour les lignes comptées avec écart', () => {
    expect(inventoryAdjustments(lines)).toEqual([
      { productId: 'P1', delta: 2, unitCost: 2.5, value: 5 },
      { productId: 'P2', delta: -3, unitCost: 1.2, value: -3.6 },
    ])
  })
  it('option uncountedAsZero : une ligne non comptée est ramenée à 0', () => {
    const adj = inventoryAdjustments(lines, { uncountedAsZero: true })
    expect(adj).toHaveLength(3)
    expect(adj[2]).toEqual({ productId: 'P4', delta: -6, unitCost: 3, value: -18 })
  })
  it('uncountedAsZero ignore actualQty saisi sur une ligne non comptée', () => {
    const adj = inventoryAdjustments(
      [{ productId: 'X', expectedQty: 5, actualQty: 99, counted: false, unitCost: 1 }],
      { uncountedAsZero: true }
    )
    expect(adj).toEqual([{ productId: 'X', delta: -5, unitCost: 1, value: -5 }])
  })
  it('non compté à théorique 0 : aucun ajustement même avec uncountedAsZero', () => {
    expect(inventoryAdjustments([{ productId: 'Z', expectedQty: 0, actualQty: 0, counted: false, unitCost: 1 }], { uncountedAsZero: true })).toEqual([])
  })
  it('écart quasi nul (flottant) ignoré, coût invalide → 0', () => {
    expect(inventoryAdjustments([{ productId: 'F', expectedQty: 0.3, actualQty: 0.1 + 0.2, counted: true, unitCost: 1 }])).toEqual([])
    expect(inventoryAdjustments([{ productId: 'N', expectedQty: 1, actualQty: 2, counted: true, unitCost: NaN }])).toEqual([
      { productId: 'N', delta: 1, unitCost: 0, value: 0 },
    ])
  })
})

describe('inventorySummary', () => {
  it('totalise écarts et valeurs', () => {
    const s = inventorySummary([
      { productId: 'P1', expectedQty: 10, actualQty: 12, counted: true, unitCost: 2.5 },
      { productId: 'P2', expectedQty: 8, actualQty: 5, counted: true, unitCost: 1.2 },
      { productId: 'P3', expectedQty: 4, actualQty: 4, counted: true, unitCost: 9 },
      { productId: 'P4', expectedQty: 6, actualQty: 0, counted: false, unitCost: 3 },
    ])
    expect(s).toEqual({
      lines: 4,
      counted: 3,
      withGap: 2,
      gapQtyPlus: 2,
      gapQtyMinus: 3,
      gapValue: 1.4, // 5 − 3.6
      gapValueAbs: 8.6,
      theoreticalValue: 25 + 9.6 + 36 + 18,
      countedValue: 30 + 6 + 36,
    })
  })
})

describe('alertes / réapprovisionnement', () => {
  it('seuil = max(minStock, reorderPoint)', () => {
    expect(alertThreshold(5, 8)).toBe(8)
    expect(alertThreshold(10, 3)).toBe(10)
    expect(alertThreshold(NaN, 0)).toBe(0)
  })
  it('isLowStock : seuil défini et stock ≤ seuil', () => {
    expect(isLowStock(5, 5)).toBe(true)
    expect(isLowStock(6, 5)).toBe(false)
    expect(isLowStock(7, 5, 8)).toBe(true)
    expect(isLowStock(-1, 5)).toBe(true)
    expect(isLowStock(0, 0)).toBe(false) // pas de seuil → jamais d’alerte
  })
  it('suggestedOrderQty : 0 au-dessus du seuil ou sans seuil', () => {
    expect(suggestedOrderQty(11, 10)).toBe(0)
    expect(suggestedOrderQty(0, 0, 0, 50)).toBe(0)
  })
  it('suggestedOrderQty : quantité paramétrée, au minimum le retour au seuil', () => {
    expect(suggestedOrderQty(4, 10, 0, 50)).toBe(50)
    expect(suggestedOrderQty(-20, 10, 0, 5)).toBe(30)
  })
  it('suggestedOrderQty : sans quantité paramétrée, remonte au double du seuil', () => {
    expect(suggestedOrderQty(4, 10)).toBe(16)
    expect(suggestedOrderQty(10, 5, 10)).toBe(10)
  })
})

describe('valorisation', () => {
  it('valuationCost : CMUP, à défaut prix d’achat', () => {
    expect(valuationCost(2.75, 3)).toBe(2.75)
    expect(valuationCost(0, 3)).toBe(3)
    expect(valuationCost(NaN, NaN)).toBe(0)
  })
  it('stockValue arrondi à 3 décimales', () => {
    expect(stockValue(3, 1.2346)).toBe(3.704)
    expect(stockValue(NaN, 5)).toBe(0)
    expect(stockValue(-2, 1.5)).toBe(-3)
  })
})

describe('références & export CSV', () => {
  it('formatReference', () => {
    expect(formatReference('TRF', 2026, 7)).toBe('TRF-2026-0007')
    expect(formatReference('INV', 2026, 12345)).toBe('INV-2026-12345')
  })
  it('toCsv : BOM, « ; », CRLF, échappement', () => {
    const csv = toCsv([
      ['Réf', 'Libellé', 'Qté'],
      ['A1', 'Fil "coton"; 30/1', 12.5],
      ['A2', null, undefined],
      ['A3', 'ligne1\nligne2', 0],
    ])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv.slice(1).split('\r\n')).toEqual([
      'Réf;Libellé;Qté',
      'A1;"Fil ""coton""; 30/1";12.5',
      'A2;;',
      'A3;"ligne1\nligne2";0',
    ])
  })
  it('toCsv sans lignes : BOM seul', () => {
    expect(toCsv([])).toBe('\uFEFF')
  })
})
