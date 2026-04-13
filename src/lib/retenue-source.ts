/**
 * src/lib/retenue-source.ts
 * ─────────────────────────
 * Calcul de la Retenue à la Source (RS) conforme à la législation tunisienne.
 * Mise à jour Loi de Finances 2026.
 *
 * Taux RS par type de prestation (art. 52, 53, 54 du CGI):
 * ─────────────────────────────────────────────────────────────
 * Type                    | Personne physique | Société
 * ────────────────────────┼───────────────────┼──────────
 * Prestations de services | 15%               | 7.5%
 * Honoraires              | 15%               | 7.5%
 * Loyers (immeubles)      | 5%                | 2.5%
 * Dividendes              | 5%                | 5%
 * Intérêts                | 20%               | 20%
 * Royalties               | 15%               | 7.5%
 * Rémunérations (salaires)| 19% (IRPP)       | 19% (IRPP)
 * ─────────────────────────────────────────────────────────────
 * Note: Pour les societies, réduction de 50% sur les taux des prestations/honoraires/royalties.
 */

export type BeneficiaryType = 'INDIVIDU' | 'SOCIETE';
export type ServiceType =
  | 'PRESTATION_SERVICE'
  | 'HONORAIRES'
  | 'LOYERS'
  | 'DIVIDENDES'
  | 'INTERETS'
  | 'ROYALTIES'
  | 'REMUNERATION'
  | 'AUTRE';

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  PRESTATION_SERVICE: 'Prestations de services',
  HONORAIRES: 'Honoraires',
  LOYERS: 'Loyers',
  DIVIDENDES: 'Dividendes',
  INTERETS: 'Intérêts',
  ROYALTIES: 'Royalties',
  REMUNERATION: 'Rémunérations',
  AUTRE: 'Autre',
};

export const SERVICE_TYPE_COEFFICIENTS: Record<ServiceType, number> = {
  PRESTATION_SERVICE: 0.15,
  HONORAIRES: 0.15,
  LOYERS: 0.05,
  DIVIDENDES: 0.05,
  INTERETS: 0.20,
  ROYALTIES: 0.15,
  REMUNERATION: 0.19,
  AUTRE: 0.00,
};

export interface RSInput {
  montantBrut: number;
  serviceType: ServiceType;
  beneficiaryType: BeneficiaryType;
  /** Si true, applique la déduction de 50% pour sociétés (art. 52 bis) */
  soumisAbattement?: boolean;
}

export interface RSCalculResult {
  taux: number;
  tauxSociete: number;
  montantBrut: number;
  montantRS: number;
  montantNet: number;
  /** Teej = montant après déduction RS, utilisé pourfacture */
  montantTEEJ: number;
}

/**
 * Calcule la retenue à la source.
 *
 * Règles 2026:
 * - Personne physique: taux normal
 * - Société: 50% du taux pour prestations/honoraires/royalties
 * - Les montants sont arrondis à 3 décimales (norme tunisienne)
 */
export function calculerRS(input: RSInput): RSCalculResult {
  const { montantBrut, serviceType, beneficiaryType, soumisAbattement = true } = input;

  const tauxNormal = SERVICE_TYPE_COEFFICIENTS[serviceType] || 0;
  let tauxSociete = tauxNormal;

  // Réduction de 50% pour les societies sur certaines prestations
  if (beneficiaryType === 'SOCIETE' && soumisAbattement) {
    if (['PRESTATION_SERVICE', 'HONORAIRES', 'ROYALTIES'].includes(serviceType)) {
      tauxSociete = Number((tauxNormal * 0.5).toFixed(3));
    }
  }

  const taux = beneficiaryType === 'SOCIETE' ? tauxSociete : tauxNormal;
  const montantRS = Number((montantBrut * taux).toFixed(3));
  const montantNet = Number((montantBrut - montantRS).toFixed(3));
  const montantTEEJ = Number((montantBrut * 0.81).toFixed(3)); // TEEJ = 81% pour prestations

  return {
    taux,
    tauxSociete,
    montantBrut,
    montantRS,
    montantNet,
    montantTEEJ,
  };
}

/**
 * Calcule le taux deRS pour affichage dans l'UI (avec label).
 */
export function getTauxDisplay(serviceType: ServiceType, beneficiaryType: BeneficiaryType): string {
  const taux = SERVICE_TYPE_COEFFICIENTS[serviceType] || 0;
  if (beneficiaryType === 'SOCIETE' && ['PRESTATION_SERVICE', 'HONORAIRES', 'ROYALTIES'].includes(serviceType)) {
    return `${(taux * 0.5 * 100).toFixed(1)}% (société)`;
  }
  return `${(taux * 100).toFixed(1)}%`;
}

/**
 * Vérifie si un matricule fiscal tunisien est valide (8 chiffres + 3 lettres).
 */
export function isValidMatriculeFiscal(matricule: string): boolean {
  return /^[0-9]{8}[A-Z]{3}$/.test(matricule.toUpperCase());
}

/**
 * Vérifie si un numéro de téléphone tunisien est valide.
 */
export function isValidPhoneTN(phone: string): boolean {
  return /^(?:\+216|00216)?[2-9][0-9]{7}$/.test(phone.replace(/\s/g, ''));
}

/**
 * Génère un identifiant de déclaration TEJ au format attendu.
 * Format: TEJ-{ANNEE}{MOIS}-{MATRICULE}-{SEQUENCE}
 */
export function generateTEJId(tenantMatricule: string, year: number, month: number, sequence: number): string {
  const yyyy = year.toString();
  const mm = month.toString().padStart(2, '0');
  const seq = sequence.toString().padStart(4, '0');
  return `TEJ-${yyyy}${mm}-${tenantMatricule}-${seq}`;
}

/**
 * Construit la période de déclaration TEJ.
 */
export function getPeriodeDeclaration(year: number, month: number): string {
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}`;
}
