import {
  purchaseDocType, normalizePoStatus, remainingQty, returnableQty, poStatusFromReceipts,
  canTransitionPo, canReceive, findOverReceipts, linesAmount, invoicingSummary,
  purchaseEditMode, validateOrderEdit, purchaseTotals, canInvoiceOrder,
} from '@/lib/purchase-logic'

describe('purchase-logic', () => {
  test('purchaseDocType mappe les types UI et base', () => {
    expect(purchaseDocType('SUPPLIER_ORDER')).toBe('ORDER')
    expect(purchaseDocType('purchase_invoice')).toBe('INVOICE')
    expect(purchaseDocType('ORDER')).toBe('ORDER')
    expect(purchaseDocType('X')).toBeNull()
    expect(purchaseDocType(null)).toBeNull()
  })

  test('normalizePoStatus : PENDING historique = CONFIRMED, inconnu = DRAFT', () => {
    expect(normalizePoStatus('PENDING')).toBe('CONFIRMED')
    expect(normalizePoStatus('RECEIVED')).toBe('RECEIVED')
    expect(normalizePoStatus('???')).toBe('DRAFT')
  })

  test('remainingQty / returnableQty jamais négatifs, arrondis au millième', () => {
    expect(remainingQty(50, 30)).toBe(20)
    expect(remainingQty(10, 12)).toBe(0)
    expect(remainingQty(1, 0.3333)).toBe(0.667)
    expect(returnableQty(30, 5)).toBe(25)
    expect(returnableQty(5, 5)).toBe(0)
  })

  test('poStatusFromReceipts', () => {
    const lines = [{ ordered: 50, received: 0 }, { ordered: 10, received: 0 }]
    expect(poStatusFromReceipts('CONFIRMED', lines)).toBe('CONFIRMED')
    expect(poStatusFromReceipts('CONFIRMED', [{ ordered: 50, received: 30 }, { ordered: 10, received: 10 }])).toBe('PARTIALLY_RECEIVED')
    expect(poStatusFromReceipts('PARTIALLY_RECEIVED', [{ ordered: 50, received: 50 }, { ordered: 10, received: 10 }])).toBe('RECEIVED')
    expect(poStatusFromReceipts('PENDING', [{ ordered: 5, received: 6 }])).toBe('RECEIVED')
    // un retour peut faire repasser une commande reçue en partielle
    expect(poStatusFromReceipts('RECEIVED', [{ ordered: 10, received: 7 }])).toBe('PARTIALLY_RECEIVED')
    // brouillon et annulé ne bougent pas
    expect(poStatusFromReceipts('DRAFT', [{ ordered: 10, received: 10 }])).toBe('DRAFT')
    expect(poStatusFromReceipts('CANCELLED', [{ ordered: 10, received: 10 }])).toBe('CANCELLED')
    expect(poStatusFromReceipts('CONFIRMED', [])).toBe('CONFIRMED')
  })

  test('transitions manuelles et réceptionnabilité', () => {
    expect(canTransitionPo('DRAFT', 'CONFIRMED')).toBe(true)
    expect(canTransitionPo('CONFIRMED', 'CONFIRMED')).toBe(false)
    expect(canTransitionPo('CONFIRMED', 'CANCELLED')).toBe(true)
    expect(canTransitionPo('PARTIALLY_RECEIVED', 'CANCELLED')).toBe(false)
    expect(canTransitionPo('DRAFT', 'RECEIVED')).toBe(false)
    expect(canReceive('CONFIRMED')).toBe(true)
    expect(canReceive('PENDING')).toBe(true)
    expect(canReceive('PARTIALLY_RECEIVED')).toBe(true)
    expect(canReceive('DRAFT')).toBe(false)
    expect(canReceive('RECEIVED')).toBe(false)
    expect(canReceive('CANCELLED')).toBe(false)
  })

  test('findOverReceipts bloque le dépassement sauf autorisation explicite', () => {
    const lines = [
      { lineId: 'a', ordered: 50, alreadyReceived: 30, receiving: 20 },
      { lineId: 'b', ordered: 10, alreadyReceived: 0, receiving: 11 },
    ]
    expect(findOverReceipts(lines)).toEqual([{ lineId: 'b', remaining: 10, receiving: 11 }])
    expect(findOverReceipts(lines, true)).toEqual([])
    expect(findOverReceipts([{ lineId: 'c', ordered: 1, alreadyReceived: 0.1, receiving: 0.9 }])).toEqual([])
  })

  test('linesAmount et invoicingSummary', () => {
    expect(linesAmount([{ quantity: 100, unitCost: 12.5 }, { quantity: 20, unitCost: 44 }])).toBe(2130)
    expect(invoicingSummary(3000, 2130, 0).status).toBe('NOT_INVOICED')
    expect(invoicingSummary(3000, 2130, 1000)).toMatchObject({ toInvoice: 1130, status: 'PARTIALLY_INVOICED' })
    expect(invoicingSummary(2130, 2130, 2130)).toMatchObject({ toInvoice: 0, overInvoiced: 0, status: 'INVOICED' })
    expect(invoicingSummary(2130, 2000, 2130)).toMatchObject({ overInvoiced: 130, status: 'OVER_INVOICED' })
  })
})

describe('purchase-logic — modification', () => {
  test('purchaseEditMode : commandes', () => {
    expect(purchaseEditMode('ORDER', 'DRAFT')).toEqual({ mode: 'full', reason: null })
    expect(purchaseEditMode('ORDER', 'CONFIRMED')).toEqual({ mode: 'full', reason: null })
    expect(purchaseEditMode('SUPPLIER_ORDER', 'PENDING')).toEqual({ mode: 'full', reason: null })
    expect(purchaseEditMode('ORDER', 'CONFIRMED', true).mode).toBe('received')
    expect(purchaseEditMode('ORDER', 'PARTIALLY_RECEIVED').mode).toBe('received')
    expect(purchaseEditMode('ORDER', 'RECEIVED')).toEqual({ mode: 'locked', reason: 'ORDER_RECEIVED' })
    expect(purchaseEditMode('ORDER', 'CANCELLED')).toEqual({ mode: 'locked', reason: 'ORDER_CANCELLED' })
  })

  test('purchaseEditMode : factures modifiables en brouillon seulement', () => {
    expect(purchaseEditMode('INVOICE', 'DRAFT').mode).toBe('full')
    expect(purchaseEditMode('INVOICE', 'VALIDATED')).toEqual({ mode: 'locked', reason: 'INVOICE_VALIDATED' })
    expect(purchaseEditMode('INVOICE', 'PAID')).toEqual({ mode: 'locked', reason: 'INVOICE_PAID' })
    expect(purchaseEditMode('INVOICE', 'CANCELLED')).toEqual({ mode: 'locked', reason: 'INVOICE_CANCELLED' })
  })

  const existing = [
    { id: 'a', productId: 'p1', received: 30, hasReceipts: true },
    { id: 'b', productId: 'p2', received: 0, hasReceipts: false },
  ]

  test('validateOrderEdit : modification libre sans réception', () => {
    expect(validateOrderEdit([{ id: 'b', productId: 'p2', received: 0, hasReceipts: false }], [{ id: 'b', productId: 'p9', quantity: 1, unitPrice: 2 }])).toEqual([])
    expect(validateOrderEdit(existing, [
      { id: 'a', productId: 'p1', quantity: 40, unitPrice: 5 },
      { productId: 'p3', quantity: 2, unitPrice: 1 },
    ], 'received')).toEqual([]) // b supprimée (non reçue), nouvelle ligne ajoutée
  })

  test('validateOrderEdit : quantité sous le reçu, suppression / changement d’article d’une ligne reçue', () => {
    expect(validateOrderEdit(existing, [{ id: 'a', productId: 'p1', quantity: 29.999, unitPrice: 5 }, { id: 'b', productId: 'p2', quantity: 1, unitPrice: 1 }], 'received'))
      .toEqual([{ code: 'QTY_BELOW_RECEIVED', lineId: 'a', min: 30 }])
    expect(validateOrderEdit(existing, [{ id: 'a', productId: 'p1', quantity: 30, unitPrice: 5 }], 'received')).toEqual([]) // = reçu : OK
    expect(validateOrderEdit(existing, [{ id: 'b', productId: 'p2', quantity: 1, unitPrice: 1 }], 'received'))
      .toEqual([{ code: 'LINE_HAS_RECEIPTS', lineId: 'a' }])
    expect(validateOrderEdit(existing, [{ id: 'a', productId: 'pX', quantity: 30, unitPrice: 5 }, { id: 'b', productId: 'p2', quantity: 1, unitPrice: 1 }], 'received'))
      .toEqual([{ code: 'PRODUCT_CHANGED', lineId: 'a' }])
  })

  test('validateOrderEdit : réception en brouillon = ligne non supprimable mais quantité libre', () => {
    const ex = [{ id: 'd', productId: 'p1', received: 0, hasReceipts: true }]
    expect(validateOrderEdit(ex, [{ id: 'd', productId: 'p1', quantity: 1, unitPrice: 1 }], 'received')).toEqual([])
    expect(validateOrderEdit(ex, [{ productId: 'p1', quantity: 1, unitPrice: 1 }], 'received')).toEqual([{ code: 'LINE_HAS_RECEIPTS', lineId: 'd' }])
  })

  test('validateOrderEdit : verrou, ligne inconnue, doublon, liste vide', () => {
    expect(validateOrderEdit(existing, [], 'locked')).toEqual([{ code: 'LOCKED' }])
    expect(validateOrderEdit([], [])).toEqual([{ code: 'NO_LINES' }])
    expect(validateOrderEdit(existing, [{ id: 'zz', productId: 'p1', quantity: 1, unitPrice: 1 }, { id: 'a', productId: 'p1', quantity: 30, unitPrice: 1 }, { id: 'b', productId: 'p2', quantity: 1, unitPrice: 1 }]))
      .toEqual([{ code: 'UNKNOWN_LINE', lineId: 'zz' }])
    expect(validateOrderEdit(existing, [{ id: 'a', productId: 'p1', quantity: 30, unitPrice: 1 }, { id: 'a', productId: 'p1', quantity: 30, unitPrice: 1 }, { id: 'b', productId: 'p2', quantity: 1, unitPrice: 1 }]))
      .toEqual([{ code: 'DUPLICATE_LINE', lineId: 'a' }])
  })

  test('purchaseTotals : HT, TVA au taux ou au montant, TTC au millime', () => {
    expect(purchaseTotals([{ quantity: 3, unitPrice: 1.333 }, { quantity: 2, unitPrice: 10 }], { rate: 19 })).toEqual({ subtotal: 23.999, taxAmount: 4.56, total: 28.559 })
    expect(purchaseTotals([{ quantity: 1, unitPrice: 100 }], { amount: 7 })).toEqual({ subtotal: 100, taxAmount: 7, total: 107 })
    expect(purchaseTotals([{ quantity: 1, unitPrice: 100 }], { rate: 0 })).toEqual({ subtotal: 100, taxAmount: 0, total: 100 })
  })
})

describe('canInvoiceOrder', () => {
  it('refuse une commande annulée', () => {
    expect(canInvoiceOrder('CANCELLED')).toBe(false)
  })
  it('accepte les autres statuts (dont PENDING historique)', () => {
    for (const st of ['DRAFT', 'CONFIRMED', 'PENDING', 'PARTIALLY_RECEIVED', 'RECEIVED']) expect(canInvoiceOrder(st)).toBe(true)
  })
})
