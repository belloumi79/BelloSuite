// ─── Test helpers ─────────────────────────────────────────────

/**
 * Simulates CSV / Excel import data transformation
 * Mirrors the logic in /api/stock/import/route.ts
 */

interface ProductRow {
  code: string
  name: string
  barcode?: string
  description?: string
  category?: string
  unit?: string
  purchasePrice?: number
  salePrice?: number
  vatRate?: number
  fodec?: boolean
  minStock?: number
  initialStock?: number
}

export function validateProductRow(row: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const code = String(row.code ?? '').trim()
  const name = String(row.name ?? '').trim()

  if (!code) errors.push('code manquant')
  if (!name) errors.push('name manquant')

  return { valid: errors.length === 0, errors }
}

export function transformProductRow(row: Record<string, unknown>): Omit<ProductRow, never> {
  const toNum = (v: unknown, fallback = 0): number => {
    if (v === null || v === undefined || v === '') return fallback
    const n = Number(v)
    return isNaN(n) ? fallback : n
  }
  const toBool = (v: unknown): boolean => {
    if (typeof v === 'boolean') return v
    const s = String(v ?? '').toLowerCase().trim()
    return s === 'true' || s === '1' || s === 'oui' || s === 'yes'
  }

  return {
    code: String(row.code ?? '').trim(),
    name: String(row.name ?? '').trim(),
    barcode: String(row.barcode ?? '').trim() || undefined,
    description: String(row.description ?? '').trim() || undefined,
    category: String(row.category ?? '').trim() || undefined,
    unit: String(row.unit ?? 'unit').trim() || 'unit',
    purchasePrice: toNum(row.purchasePrice),
    salePrice: toNum(row.salePrice),
    vatRate: toNum(row.vatRate, 19),
    fodec: toBool(row.fodec),
    minStock: toNum(row.minStock),
    initialStock: toNum(row.initialStock),
  }
}

export function validateIRPP(salary: number, children: number, isMarried: boolean): number {
  const taxable = salary
  if (taxable <= 5000) return 0
  let tax = 0
  let prevMax = 0
  const bracket = [
    { min: 0,     max: 5000,   rate: 0 },
    { min: 5000,  max: 15000,  rate: 0.15 },
    { min: 15000, max: 30000,  rate: 0.20 },
    { min: 30000, max: 50000,  rate: 0.25 },
    { min: 50000, max: 70000,  rate: 0.30 },
    { min: 70000, max: 150000, rate: 0.35 },
    { min: 150000, max: 999999999, rate: 0.40 },
  ]
  for (const b of bracket) {
    if (taxable <= prevMax) break
    const taxableInBracket = Math.min(taxable, b.max) - prevMax
    if (taxableInBracket > 0) tax += taxableInBracket * b.rate
    prevMax = b.max
  }
  if (children > 0) tax -= children * 150
  if (isMarried) tax -= 300
  return Math.max(0, Math.round(tax / 12))
}

export function calcInvoiceTotals(lines: Array<{ ht: number; vatRate: number; fodec?: boolean }>) {
  let subtotalHT = 0
  let totalFodec = 0
  let totalVAT = 0
  const timbre = 1.0

  for (const line of lines) {
    subtotalHT += line.ht
    if (line.fodec) totalFodec += line.ht * 0.001
    totalVAT += (line.ht + (line.fodec ? line.ht * 0.001 : 0)) * (line.vatRate / 100)
  }

  return {
    subtotalHT: Math.round(subtotalHT * 1000) / 1000,
    totalFodec: Math.round(totalFodec * 1000) / 1000,
    totalVAT: Math.round(totalVAT * 1000) / 1000,
    timbreFiscal: timbre,
    totalTTC: Math.round((subtotalHT + totalFodec + totalVAT + timbre) * 1000) / 1000,
  }
}