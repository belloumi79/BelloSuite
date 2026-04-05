/**
 * Fiscal Utilities for Tunisian Law (Loi 2024)
 */

export const VAT_RATES = [19, 13, 7]
export const FODEC_RATE = 0.01 // 1%
export const FISCAL_STAMP = 1.000 // 1 DT

export interface LineItem {
  quantity: number
  unitPriceHT: number
  discount: number // Percentage (0-100)
  vatRate: number
  fodecApply: boolean
}

export interface CalculatedLine extends LineItem {
  totalHT: number
  fodecAmount: number
  vatAmount: number
  totalTTC: number
}

export interface InvoiceTotals {
  subtotalHT: number
  totalFodec: number
  totalVAT: number
  timbreFiscal: number
  totalTTC: number
  vatSummary: { [rate: number]: { base: number, amount: number } }
}

/**
 * Calculate totals for a single line
 */
export function calculateLine(line: LineItem): CalculatedLine {
  const quantity = Number(line.quantity) || 0
  const unitPriceHT = Number(line.unitPriceHT) || 0
  const discountFactor = 1 - (Number(line.discount) || 0) / 100
  
  // 1. Base HT after discount
  const totalHT = quantity * unitPriceHT * discountFactor
  
  // 2. FODEC (1%) applied on Net HT
  const fodecAmount = line.fodecApply ? totalHT * FODEC_RATE : 0
  
  // 3. VAT Base = Total HT + FODEC
  const vatBase = totalHT + fodecAmount
  const vatAmount = vatBase * (Number(line.vatRate) / 100)
  
  // 4. Line TTC
  const totalTTC = vatBase + vatAmount
  
  return {
    ...line,
    totalHT,
    fodecAmount,
    vatAmount,
    totalTTC
  }
}

/**
 * Calculate grand totals for an invoice
 */
export function calculateInvoiceTotals(lines: LineItem[]): InvoiceTotals {
  const calculatedLines = lines.map(calculateLine)
  
  let subtotalHT = 0
  let totalFodec = 0
  let totalVAT = 0
  const vatSummary: { [rate: number]: { base: number, amount: number } } = {}

  calculatedLines.forEach(line => {
    subtotalHT += line.totalHT
    totalFodec += line.fodecAmount
    totalVAT += line.vatAmount
    
    const rate = Number(line.vatRate)
    const baseForVat = line.totalHT + line.fodecAmount
    
    if (!vatSummary[rate]) {
      vatSummary[rate] = { base: 0, amount: 0 }
    }
    vatSummary[rate].base += baseForVat
    vatSummary[rate].amount += line.vatAmount
  })

  const totalBeforeStamp = subtotalHT + totalFodec + totalVAT
  
  // Timbre fiscal is applied if TTC > 0 (usually per law, some conditions apply but 1 DT is standard)
  const timbreFiscal = totalBeforeStamp > 0 ? FISCAL_STAMP : 0
  const totalTTC = totalBeforeStamp + timbreFiscal

  return {
    subtotalHT,
    totalFodec,
    totalVAT,
    timbreFiscal,
    totalTTC,
    vatSummary
  }
}
