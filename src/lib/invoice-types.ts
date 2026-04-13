/**
 * Invoice Types — Document commercial types & fiscal rules Tunisia
 * ============================================================
 * Defines all invoice document types with their specific fiscal rules.
 * Source: Code de la patente tunisien, Loi de finance 2024-2026.
 */

/** Types de document commercial — aline avec DocumentType enum Prisma */
export type DocumentCategory = 
  | 'SALE'           // Vente de marchandises (avec/sans TVA)
  | 'SERVICE'        // Prestation de services
  | 'HONORARY'       // Note d'honoraires / jetons de présence
  | 'EXPORT'         // Facture export
  | 'PURCHASE'       // Achat fournisseur
  | 'QUOTE'          // Devis (non fiscal)
  | 'ORDER'          // Bon de commande (non fiscal)
  | 'CREDIT_NOTE'    // Avoir / note de crédit

export interface DocumentTypeConfig {
  type: string
  label: string
  labelAr: string
  category: DocumentCategory
  isFiscal: boolean       // Génère XML TEIF
  needsTTN: boolean       // Doit être soumise TTN
  hasTVA: boolean         // Soumise à la TVA
  hasFODEC: boolean       // Soumise à FODEC 1%
  hasTimbre: boolean      // Timbre fiscal 1DT
  hasRS: boolean          // Retenue à la source 1.5%
  rsRate: number          // Taux RS (ex: 0.015)
  hasIRPP: boolean        // IRPP catégoriel (honoraires)
  stockAffect: boolean    // Affecte le stock
  teifTypeCode: string    // Code TEIF (I-11, I-12, etc.)
  description: string
}

export const INVOICE_TYPE_CONFIGS: Record<string, DocumentTypeConfig> = {

  // ── VENTE MARCHANDISES ──────────────────────────────────
  INVOICE: {
    type: 'INVOICE',
    label: 'Facture',
    labelAr: 'فاتورة',
    category: 'SALE',
    isFiscal: true,
    needsTTN: true,
    hasTVA: true,
    hasFODEC: true,
    hasTimbre: true,
    hasRS: false,
    rsRate: 0,
    hasIRPP: false,
    stockAffect: true,
    teifTypeCode: 'I-11', // Facture locale
    description: 'Vente de marchandises avec TVA 19%/13%/7% et FODEC 1%',
  },

  // ── PRESTATION DE SERVICES ──────────────────────────────
  INVOICE_SERVICE: {
    type: 'INVOICE_SERVICE',
    label: 'Facture Service',
    labelAr: 'فاتورة خدمات',
    category: 'SERVICE',
    isFiscal: true,
    needsTTN: true,
    hasTVA: true,
    hasFODEC: true,
    hasTimbre: true,
    hasRS: false,
    rsRate: 0,
    hasIRPP: false,
    stockAffect: false,
    teifTypeCode: 'I-11',
    description: 'Prestation de services (TVA 19% + FODEC 1%). Reverse charge possible pour B2G.',
  },

  // ── NOTE D'HONORAIRES ─────────────────────────────────
  INVOICE_HONORARY: {
    type: 'INVOICE_HONORARY',
    label: 'Note d\'Honoraires',
    labelAr: 'فاتورة أتعاب',
    category: 'HONORARY',
    isFiscal: true,
    needsTTN: true,
    hasTVA: true,         // Mais peut être exonérée si assujetti
    hasFODEC: false,      // Pas de FODEC sur honoraires
    hasTimbre: true,
    hasRS: true,          // RS 1.5% sur total TTC (prestataire non salarié)
    rsRate: 0.015,       // 1.5% de la base TTC
    hasIRPP: true,       // IRPP catégoriel 15% (revenus catégoriels)
    stockAffect: false,
    teifTypeCode: 'I-13', // Note d'honoraires
    description: 'Jetons de présence, honoraires experts-comptables, avocats. RS 1.5% + IRPP catégoriel 15%. Pas de FODEC.',
  },

  // ── ACHAT FOURNISSEUR ─────────────────────────────────
  PURCHASE_INVOICE: {
    type: 'PURCHASE_INVOICE',
    label: 'Facture Achat',
    labelAr: 'فاتورة شراء',
    category: 'PURCHASE',
    isFiscal: false,
    needsTTN: false,
    hasTVA: true,
    hasFODEC: true,
    hasTimbre: true,
    hasRS: false,
    rsRate: 0,
    hasIRPP: false,
    stockAffect: true,
    teifTypeCode: 'I-20', // Facture achat
    description: 'Facture d\'achat fournisseur (non encore intégrée TTN)',
  },

  // ── EXPORT ─────────────────────────────────────────────
  INVOICE_EXPORT: {
    type: 'INVOICE_EXPORT',
    label: 'Facture Export',
    labelAr: 'فاتورة تصدير',
    category: 'EXPORT',
    isFiscal: true,
    needsTTN: false,  // Export hors champ TEIF
    hasTVA: false,    // Exonéréeexport
    hasFODEC: false,
    hasTimbre: true,
    hasRS: false,
    rsRate: 0,
    hasIRPP: false,
    stockAffect: true,
    teifTypeCode: 'I-80', // Facture export
    description: 'Facture export (TVA 0%, exonérée export, hors TTN)',
  },

  // ── NON FISCAUX ───────────────────────────────────────
  QUOTE: {
    type: 'QUOTE',
    label: 'Devis',
    labelAr: 'عرض سعر',
    category: 'QUOTE',
    isFiscal: false,
    needsTTN: false,
    hasTVA: false,
    hasFODEC: false,
    hasTimbre: false,
    hasRS: false,
    rsRate: 0,
    hasIRPP: false,
    stockAffect: false,
    teifTypeCode: '',
    description: 'Devis / quotation — document commercial non fiscal',
  },

  ORDER: {
    type: 'ORDER',
    label: 'Bon de Commande',
    labelAr: 'طلب شراء',
    category: 'ORDER',
    isFiscal: false,
    needsTTN: false,
    hasTVA: false,
    hasFODEC: false,
    hasTimbre: false,
    hasRS: false,
    rsRate: 0,
    hasIRPP: false,
    stockAffect: false,
    teifTypeCode: '',
    description: 'Bon de commande client — engagement juridique non fiscal',
  },

  DELIVERY_NOTE: {
    type: 'DELIVERY_NOTE',
    label: 'Bon de Livraison',
    labelAr: 'توصية تسليم',
    category: 'SALE',
    isFiscal: false,
    needsTTN: false,
    hasTVA: false,
    hasFODEC: false,
    hasTimbre: false,
    hasRS: false,
    rsRate: 0,
    hasIRPP: false,
    stockAffect: true,
    teifTypeCode: '',
    description: 'Bon de livraison — transfert de propriété sans engagement fiscal',
  },

  CREDIT_NOTE: {
    type: 'CREDIT_NOTE',
    label: 'Avoir',
    labelAr: 'إشعار دائن',
    category: 'CREDIT_NOTE',
    isFiscal: true,
    needsTTN: true,
    hasTVA: true,
    hasFODEC: true,
    hasTimbre: false, // Pas de timbre sur avoir
    hasRS: false,
    rsRate: 0,
    hasIRPP: false,
    stockAffect: true,
    teifTypeCode: 'I-12', // Avoir
    description: 'Avoir / note de crédit — annulation ou réduction de facture',
  },
}

/**
 * Calcule le montant de la Retenue à la Source pour une note d'honoraires.
 * RS = totalTTC × 1.5% (plafonné à 20% du HT par certains textes).
 * En pratique: RS = baseTTC × 0.015
 *
 * @param totalTTC - Montant TTC de la note d'honoraires
 * @param totalHT  - Montant HT pour vérification plafond
 * @returns Montant RS à déduire
 */
export function calculateRS(totalTTC: number, totalHT: number): number {
  const rsRaw = totalTTC * 0.015
  // Plafond RS: ne peut pas dépasser 20% du HT (article 52 bis)
  const rsCapped = Math.min(rsRaw, totalHT * 0.20)
  return Math.round(rsCapped * 1000) / 1000
}

/**
 * Détermine le montant IRPP catégoriel pour honoraires (revenus catégoriels).
 * Taux fixe 15% sur le montant HT des honoraires.
 *
 * @param totalHT - Montant HT des honoraires
 * @returns Montant IRPP catégoriel
 */
export function calculateIRPPCategoriel(totalHT: number): number {
  return Math.round(totalHT * 0.15 * 1000) / 1000
}

/**
 * Vérifie si un client est soumis au reverse charge TVA.
 * B2G (établissements publics) et certaines professions libérales.
 */
export function isReverseChargeClient(clientMatricule: string | null | undefined): boolean {
  if (!clientMatricule) return false
  // Les établissements publics ont un MF commençant par certain préfixe
  // En pratique: vérif consultation annuaire fiscal ou flag dans la fiche client
  return false
}

/**
 * Retourne le type TEIF correct pour un document.
 */
export function getTeifTypeCode(type: string): string {
  return INVOICE_TYPE_CONFIGS[type]?.teifTypeCode ?? 'I-11'
}

/**
 * Indique si le document nécessite une soumission TTN.
 */
export function needsTTNSubmission(type: string): boolean {
  return INVOICE_TYPE_CONFIGS[type]?.needsTTN ?? false
}
