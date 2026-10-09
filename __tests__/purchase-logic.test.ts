import {
  purchaseDocType, normalizePoStatus, remainingQty, returnableQty, poStatusFromReceipts,
  canTransitionPo, canReceive, findOverReceipts, linesAmount, invoicingSummary,
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
