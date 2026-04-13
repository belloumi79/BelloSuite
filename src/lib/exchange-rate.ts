/**
 * Exchange Rate Service — Taux de change devises
 * ============================================
 * Sources: Banque Centrale de Tunisie (BCT), CBC, ou saisie manuelle
 * 
 * En production: appeler l'API BCT officielle:
 * https://www.bct.gov.tn/bct/taux_de_change/tauxChange.action
 * Ou utiliser l'API de l'une des ASP homologuées TTN qui fournit les taux
 */

export const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP', 'DZD', 'LYD', 'MAD'] as const
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number]

export interface ExchangeRate {
  currency: string
  rateToTND: number
  date: string
  source: string
}

// Taux par défaut (backup — doivent être mis à jour régulièrement)
const DEFAULT_RATES: Record<string, number> = {
  EUR: 3.42,   // 1 EUR ≈ 3.42 TND
  USD: 3.15,   // 1 USD ≈ 3.15 TND
  GBP: 3.98,   // 1 GBP ≈ 3.98 TND
  DZD: 0.023,  // 100 DZD ≈ 2.30 TND (Algérie)
  LYD: 0.65,   // 1 LYD ≈ 0.65 TND (Libye)
  MAD: 0.32,   // 1 MAD ≈ 0.32 TND (Maroc)
}

export function getDefaultRate(currency: string): number {
  return DEFAULT_RATES[currency.toUpperCase()] ?? 1.0
}

export function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    TND: 'DT',
    EUR: '€',
    USD: '$',
    GBP: '£',
    DZD: 'DA',
    LYD: 'LD',
    MAD: 'DH',
  }
  const sym = symbols[currency.toUpperCase()] || currency
  return `${amount.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${sym}`
}

export function convertToTND(amount: number, currency: string, rate: number): number {
  return Math.round(amount * rate * 1000) / 1000
}
