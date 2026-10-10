import { aggregateQuantities, findShortages, chooseWarehouse } from '@/lib/delivery-note-logic'

describe('bons de livraison : quantités par produit', () => {
  it('agrège les lignes du même produit et ignore les lignes sans produit ou à quantité nulle', () => {
    expect(aggregateQuantities([
      { productId: 'a', quantity: 2 },
      { productId: 'a', quantity: '1.5' },
      { productId: 'b', quantity: 0 },
      { productId: null, quantity: 4 },
      { productId: 'c', quantity: 'x' },
    ])).toEqual({ a: 3.5 })
  })
})

describe('bons de livraison : contrôle du stock du dépôt', () => {
  const lines = [{ productId: 'a', quantity: 3 }, { productId: 'a', quantity: 2 }, { productId: 'b', quantity: 1 }]

  it('signale le produit dont le total demandé dépasse le stock du dépôt', () => {
    expect(findShortages(lines, { a: 4, b: 1 }, false)).toEqual([{ productId: 'a', requested: 5, available: 4 }])
  })
  it('stock absent du dépôt = 0', () => {
    expect(findShortages([{ productId: 'z', quantity: 1 }], {}, false)).toEqual([{ productId: 'z', requested: 1, available: 0 }])
  })
  it('accepte exactement le stock disponible (arrondi à 3 décimales)', () => {
    expect(findShortages([{ productId: 'a', quantity: 0.1 }, { productId: 'a', quantity: 0.2 }], { a: 0.3 }, false)).toEqual([])
  })
  it('stock négatif autorisé : aucun blocage', () => {
    expect(findShortages(lines, {}, true)).toEqual([])
  })
})

describe('bons de livraison : choix du dépôt', () => {
  const whs = [
    { id: 'w1', isActive: true, isDefault: false },
    { id: 'w2', isActive: true, isDefault: true },
    { id: 'w3', isActive: false, isDefault: false },
  ]
  it('retient le dépôt demandé s\'il est actif', () => {
    expect(chooseWarehouse('w1', whs)).toEqual({ ok: true, warehouseId: 'w1' })
  })
  it('refuse un dépôt d\'un autre tenant (absent de la liste)', () => {
    expect(chooseWarehouse('autre', whs)).toEqual({ ok: false, code: 'WAREHOUSE_INVALID' })
  })
  it('refuse un dépôt archivé', () => {
    expect(chooseWarehouse('w3', whs)).toEqual({ ok: false, code: 'WAREHOUSE_INACTIVE' })
  })
  it('sans choix : dépôt par défaut, sinon premier actif, sinon aucun', () => {
    expect(chooseWarehouse(null, whs)).toEqual({ ok: true, warehouseId: 'w2' })
    expect(chooseWarehouse(undefined, [whs[2], whs[0]])).toEqual({ ok: true, warehouseId: 'w1' })
    expect(chooseWarehouse('', [whs[2]])).toEqual({ ok: true, warehouseId: null })
  })
})
