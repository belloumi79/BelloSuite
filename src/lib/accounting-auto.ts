/**
 * Accounting Auto-Journalization Service
 * ======================================
 * Génère automatiquement les écritures comptables depuis les factures,
 * notes d'honoraires et documents commerciaux.
 *
 * Plan comptable minimum tunisien :
 *  4111xxx : Clients Tunisia (actif)
 *  7071xxx : Ventes de marchandises
 *  7073xxx : Prestations de services
 *  7074xxx : Honoraires
 *  4457xxx : TVA collectée
 *  3410xxx : Timbre fiscal (charge)
 *  6110xxx : FODEC (charge)
 *  4360xxx : Retenue à la source à payer
 *  709xxxx : Rabais/remises accordés
 */

import { Decimal } from '@prisma/client/runtime/library'

export interface JournalizationRule {
  documentType: string
  journalCode: string
  lines: Array<{
    accountPrefix: string
    accountLabel: string
    debit: boolean
    vatField?: string
    taxField?: string
  }>
}

/**
 * Règles de journalisation par type de document
 */
export const JOURNALIZATION_RULES: Record<string, JournalizationRule> = {
  // ─── Facture de vente (marchandises) ───────────────────
  INVOICE: {
    documentType: 'INVOICE',
    journalCode: 'VTE',
    lines: [
      { accountPrefix: '4111', accountLabel: 'Clients - Ventes', debit: true, vatField: 'totalTTC' },
      { accountPrefix: '7071', accountLabel: 'Ventes marchandises HT', debit: false, vatField: 'subtotalHT' },
      { accountPrefix: '4457', accountLabel: 'TVA collectée 19%', debit: false, vatField: 'totalVAT' },
      { accountPrefix: '3410', accountLabel: 'Timbre fiscal', debit: false, taxField: 'timbreFiscal' },
      { accountPrefix: '6110', accountLabel: 'FODEC', debit: false, taxField: 'totalFodec' },
    ],
  },
  // ─── Note d'honoraires (prestations de services avec RS) ─
  INVOICE_HONORARY: {
    documentType: 'INVOICE_HONORARY',
    journalCode: 'SVC',
    lines: [
      { accountPrefix: '4111', accountLabel: 'Clients - Honoraires', debit: true, vatField: 'totalTTC' },
      { accountPrefix: '7074', accountLabel: 'Honoraires HT', debit: false, vatField: 'subtotalHT' },
      { accountPrefix: '4457', accountLabel: 'TVA collectée', debit: false, vatField: 'totalVAT' },
      { accountPrefix: '4360', accountLabel: 'RS 1.5% à payer', debit: false, taxField: 'retenueSource' },
      { accountPrefix: '3410', accountLabel: 'Timbre fiscal', debit: false, taxField: 'timbreFiscal' },
    ],
  },
  // ─── Facture de service (sans RS) ───────────────────────
  INVOICE_SERVICE: {
    documentType: 'INVOICE_SERVICE',
    journalCode: 'SVC',
    lines: [
      { accountPrefix: '4111', accountLabel: 'Clients - Services', debit: true, vatField: 'totalTTC' },
      { accountPrefix: '7073', accountLabel: 'Prestations de services HT', debit: false, vatField: 'subtotalHT' },
      { accountPrefix: '4457', accountLabel: 'TVA collectée', debit: false, vatField: 'totalVAT' },
      { accountPrefix: '3410', accountLabel: 'Timbre fiscal', debit: false, taxField: 'timbreFiscal' },
    ],
  },
  // ─── Avoir / Note de crédit ──────────────────────────────
  CREDIT_NOTE: {
    documentType: 'CREDIT_NOTE',
    journalCode: 'AVOIR',
    lines: [
      { accountPrefix: '7071', accountLabel: 'Ventes - Annulation', debit: true, vatField: 'subtotalHT' },
      { accountPrefix: '4457', accountLabel: 'TVA collectée - Annulation', debit: true, vatField: 'totalVAT' },
      { accountPrefix: '4111', accountLabel: 'Clients - Avoir à solder', debit: false, vatField: 'totalTTC' },
    ],
  },
  // ─── Devis ───────────────────────────────────────────────
  QUOTE: {
    documentType: 'QUOTE',
    journalCode: 'DEVIS',
    lines: [], // Pas d'écriture comptable pour un devis
  },
}

/**
 * Construit le libellé de l'écriture comptable
 */
export function buildEntryDescription(doc: {
  number: string
  type: string
  client?: { name: string } | null
}): string {
  const labels: Record<string, string> = {
    INVOICE: 'Facture',
    INVOICE_SERVICE: 'Facture Service',
    INVOICE_HONORARY: 'Note Honoraires',
    CREDIT_NOTE: 'Avoir',
    QUOTE: 'Devis',
    ORDER: 'Bon de commande',
    DELIVERY_NOTE: 'Bon de livraison',
  }
  const label = labels[doc.type] || doc.type
  const client = doc.client?.name ? ` - ${doc.client.name}` : ''
  return `${label} ${doc.number}${client}`
}

/**
 * Calcule le montant de la RS (retenue à la source) pour une note d'honoraires
 * Taux RS = 1.5%, plafond 20% du montant total HT
 * La RS est déductible de la TTC et doit être reflétée dans l'écriture
 */
export function calculateRS(subtotalHT: number, totalRS: number): {
  taxableAmount: number
  rsAmount: number
  netToClient: number
} {
  const rsAmount = totalRS > 0 ? totalRS : subtotalHT * 0.015
  const netToClient = subtotalHT - rsAmount
  return {
    taxableAmount: subtotalHT, // Base pour la RS
    rsAmount: Math.round(rsAmount * 1000) / 1000,
    netToClient: Math.round(netToClient * 1000) / 1000,
  }
}
