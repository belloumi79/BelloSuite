/**
 * helpers.test.ts — Unit tests for utility functions
 */

import { validateProductRow, transformProductRow, calcInvoiceTotals, validateIRPP } from './helpers.utils'

describe('validateProductRow', () => {
  it('returns valid for complete row', () => {
    const result = validateProductRow({ code: 'ELEC-001', name: 'Câble HDMI' })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('returns invalid when code is missing', () => {
    const result = validateProductRow({ code: '', name: 'Câble HDMI' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('code manquant')
  })

  it('returns invalid when name is missing', () => {
    const result = validateProductRow({ code: 'ELEC-001', name: '' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('name manquant')
  })
})

describe('transformProductRow', () => {
  it('transforms all fields correctly', () => {
    const row = {
      code: 'ELEC-001',
      name: 'Câble HDMI 2m',
      barcode: '6291041500103',
      description: 'Câble HDMI',
      category: 'Electronique',
      unit: 'pce',
      purchasePrice: '25.000',
      salePrice: '39.900',
      vatRate: '19',
      fodec: 'true',
      minStock: '10',
      initialStock: '50',
    }
    const result = transformProductRow(row)
    expect(result.code).toBe('ELEC-001')
    expect(result.name).toBe('Câble HDMI 2m')
    expect(result.purchasePrice).toBe(25)
    expect(result.salePrice).toBe(39.9)
    expect(result.vatRate).toBe(19)
    expect(result.fodec).toBe(true)
    expect(result.minStock).toBe(10)
    expect(result.initialStock).toBe(50)
  })

  it('applies default vatRate of 19 when not provided', () => {
    const result = transformProductRow({ code: 'X', name: 'Y' })
    expect(result.vatRate).toBe(19)
  })

  it('converts string booleans correctly', () => {
    expect(transformProductRow({ code: 'X', name: 'Y', fodec: 'oui' }).fodec).toBe(true)
    expect(transformProductRow({ code: 'X', name: 'Y', fodec: 'false' }).fodec).toBe(false)
    expect(transformProductRow({ code: 'X', name: 'Y', fodec: '1' }).fodec).toBe(true)
  })
})

describe('calcInvoiceTotals', () => {
  it('calculates TVA 19% correctly', () => {
    const lines = [{ ht: 100, vatRate: 19, fodec: false }]
    const result = calcInvoiceTotals(lines)
    expect(result.subtotalHT).toBe(100)
    expect(result.totalVAT).toBe(19)
    expect(result.timbreFiscal).toBe(1)
    expect(result.totalTTC).toBe(120) // 100 + 19 + 1
  })

  it('adds FODEC 0.1% when flag is true', () => {
    const lines = [{ ht: 1000, vatRate: 19, fodec: true }]
    const result = calcInvoiceTotals(lines)
    expect(result.totalFodec).toBe(1) // 0.1% of 1000
    expect(result.totalVAT).toBe(190.19) // (1000 + 1) * 19%
  })

  it('handles multiple VAT rates (19% and 7%)', () => {
    const lines = [
      { ht: 500, vatRate: 19, fodec: false },
      { ht: 200, vatRate: 7, fodec: false },
    ]
    const result = calcInvoiceTotals(lines)
    expect(result.subtotalHT).toBe(700)
    expect(result.totalVAT).toBeCloseTo(109, 2) // 95 + 14
    expect(result.totalTTC).toBeCloseTo(810, 2) // 700 + 109 + 1
  })
})

describe('validateIRPP', () => {
  it('returns 0 for salary ≤ 5000', () => {
    expect(validateIRPP(3000, 0, false)).toBe(0)
    expect(validateIRPP(5000, 0, false)).toBe(0)
  })

  it('applies tax brackets correctly for salary 15000', () => {
    const monthly = validateIRPP(15000, 0, false)
    // 0-5000 at 0% + 5000-15000 at 15% → (15000-5000)×0.15 = 1500/year → 125/month
    expect(monthly).toBeGreaterThan(100)
    expect(monthly).toBeLessThan(150)
  })

  it('deducts 150 per child', () => {
    const withChildren = validateIRPP(20000, 2, false)
    const withoutChildren = validateIRPP(20000, 0, false)
    expect(withChildren).toBeLessThan(withoutChildren)
  })

  it('deducts 300 for married', () => {
    const married = validateIRPP(20000, 0, true)
    const single = validateIRPP(20000, 0, false)
    expect(married).toBeLessThan(single)
  })

  it('tax on 30000 TND/month (0-5000: 0%, 5000-15000: 15%, 15000-30000: 20%)', () => {
    const tax = validateIRPP(30000, 0, false)
    // 5000×0% + 10000×15% + 15000×20% = 0 + 1500 + 3000 = 4500/year → 375/month
    expect(tax).toBeGreaterThan(300)
  })
})