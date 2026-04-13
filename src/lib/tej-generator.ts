/**
 * src/lib/tej-generator.ts
 * ──────────────────────
 * Génère le fichier XML TEJ (Déclaration Électronique des Retenues à la Source)
 * conforme au format officiel tunisien.
 *
 * En 2026, la plateforme TEJ (tej.gov.tn) impose la déclaration électronique
 * pour tous les assujettis sujets à la retenue à la source (art. 52-54 CGI).
 *
 * Format: XML UTF-8, encapsulé dans un élément racine <TEJ>
 * Références:
 *   - Art. 52 CGI : Prestation de services / Honoraires
 *   - Art. 53 CGI : Loyers
 *   - Art. 54 CGI : Dividendes, intérêts, royalties
 *   - LF 2026 : nouveaux taux et obligations
 */

import { prisma } from '@/lib/db';
import { SERVICE_TYPE_COEFFICIENTS, SERVICE_TYPE_LABELS } from './retenue-source';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TEJExportOptions {
  tenantId: string;
  periodYear: number;
  periodMonth: number;
  /** IDs spécifiques à exporter. Défaut = tous DRAFT / EXPORTED de la période */
  withholdingTaxIds?: string[];
}

export interface TEJLine {
  numero: number;
  /** NOIX = Matricule Fiscal du bénéficiaire (9 chiffres) */
  noixBenef: string;
  /** Dénomination / Raison sociale ou Nom complet */
  denomBenef: string;
  /** Code service TEJ (2 lettres) */
  natServ: string;
  /** Montant Brut HT en TND */
  mtBrutHT: number;
  /** Taux RS appliqué en % (ex: 15.00 pour 15%) */
  txRS: number;
  /** Montant de la Retenue à la Source en TND */
  mtRS: number;
  /** Montant Net versé (brut - RS) en TND */
  mtNet: number;
  /** Date de paiement effectif (YYYY-MM-DD) */
  datPaie: string;
  /** Référence facture / document */
  refDoc?: string;
}

/**
 * Résultat de l'export TEJ.
 */
export interface TEJExportResult {
  xml: string;
  filename: string;
  count: number;
  ids: string[];
  totalRS: number;
  totalBrut: number;
}

// ─── Validation NOIX (Matricule Fiscal Tunisien) ─────────────────────────────

/**
 * Valide le format du matricule fiscal tunisien (NOIX / MF).
 * Format officiel : 9 chiffres (KKKKKKKKK)
 */
export function isValidNOIX(noix: string): boolean {
  if (!noix || typeof noix !== 'string') return false;
  const cleaned = noix.replace(/[\s\-]/g, '');
  return /^\d{9}$/.test(cleaned);
}

/**
 * Normalise un NOIX en 9 chiffres (sans espaces, sans tirets).
 */
export function normalizeNOIX(noix: string): string {
  return (noix || '').replace(/[\s\-]/g, '').toUpperCase();
}

// ─── Mapping Types Services → Codes TEJ ─────────────────────────────────────

/** Code TEJ officiel par type de service */
export const TEJ_SERVICE_CODES: Record<string, string> = {
  PRESTATION_SERVICE: 'PS',
  HONORAIRES:         'HO',
  LOYERS:             'LO',
  DIVIDENDES:         'DI',
  INTERETS:           'IN',
  ROYALTIES:          'RO',
  REMUNERATION:       'RE',
  AUTRE:              'AU',
};

/** Inverse: code TEJ → serviceType */
export const TEJ_CODE_TO_SERVICE: Record<string, string> = Object.fromEntries(
  Object.entries(TEJ_SERVICE_CODES).map(([k, v]) => [v, k])
);

// ─── XML Helpers ─────────────────────────────────────────────────────────────

/**
 * Échappe les caractères spéciaux pour le contenu XML.
 */
function escapeXml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ─── Construction du XML ─────────────────────────────────────────────────────

/**
 * Génère la déclaration XML TEJ complète.
 *
 * Structure officielle:
 * <?xml version="1.0" encoding="UTF-8"?>
 * <TEJ xmlns="http://tej.dgi.gov.tn">
 *   <EnTete>
 *     <NOIXDeclarant>...</NOIXDeclarant>
 *     <DenomDeclarant>...</DenomDeclarant>
 *     <Periode mois="MM" annee="YYYY"/>
 *     <NbRetenues>000123</NbRetenues>
 *     <TotalRS>12345.678</TotalRS>
 *   </EnTete>
 *   <Retenues>
 *     <Retenue>
 *       <Nume>000001</Nume>
 *       <NOIXBenef>...</NOIXBenef>
 *       <DenomBenef>...</DenomBenef>
 *       <NatServ>PS</NatServ>
 *       <MtBrutHT>10000.000</MtBrutHT>
 *       <TxRS>15.00</TxRS>
 *       <MtRS>1500.000</MtRS>
 *       <MtNet>8500.000</MtNet>
 *       <DatPaie>2026-04-15</DatPaie>
 *     </Retenue>
 *   </Retenues>
 *   <Signature>
 *     <Logiciel>BelloSuite</Logiciel>
 *     <Version>1.0.0</Version>
 *     <DateGeneration>2026-04-13T17:30:00</DateGeneration>
 *   </Signature>
 * </TEJ>
 */
export function generateTEJXml(
  tenantMatricule: string,
  tenantName: string,
  periodYear: number,
  periodMonth: number,
  lines: TEJLine[],
  totalRS: number
): string {
  const mm = String(periodMonth).padStart(2, '0');
  const yyyy = String(periodYear);
  const now = new Date().toISOString();
  const nb = String(lines.length).padStart(6, '0');
  const totalRSFmt = totalRS.toFixed(3);

  const retenueLines = lines
    .map((l, i) => {
      const n = String(i + 1).padStart(6, '0');
      return [
        `      <Retenue>`,
        `        <Nume>${n}</Nume>`,
        `        <NOIXBenef>${escapeXml(l.noixBenef)}</NOIXBenef>`,
        `        <DenomBenef>${escapeXml(l.denomBenef)}</DenomBenef>`,
        `        <NatServ>${escapeXml(l.natServ)}</NatServ>`,
        `        <MtBrutHT>${l.mtBrutHT.toFixed(3)}</MtBrutHT>`,
        `        <TxRS>${l.txRS.toFixed(2)}</TxRS>`,
        `        <MtRS>${l.mtRS.toFixed(3)}</MtRS>`,
        `        <MtNet>${l.mtNet.toFixed(3)}</MtNet>`,
        `        <DatPaie>${l.datPaie}</DatPaie>`,
        l.refDoc ? `        <RefDoc>${escapeXml(l.refDoc)}</RefDoc>` : '',
        `      </Retenue>`,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!--
  ╔══════════════════════════════════════════════════════════════╗
  ║  TEJ - Déclaration Électronique des Retenues à la Source     ║
  ║  Généré par BelloSuite — https://bellosuite.com              ║
  ║  Déclarant: ${escapeXml(tenantName).padEnd(50)}║
  ║  Matricule Fiscal: ${escapeXml(tenantMatricule).padEnd(46)}║
  ║  Période: ${mm}/${yyyy}                                           ║
  ║  Généré le: ${now.padEnd(45)}║
  ╚══════════════════════════════════════════════════════════════╝
-->
<TEJ xmlns="http://tej.dgi.gov.tn">
  <EnTete>
    <NOIXDeclarant>${escapeXml(tenantMatricule)}</NOIXDeclarant>
    <DenomDeclarant>${escapeXml(tenantName)}</DenomDeclarant>
    <Periode mois="${mm}" annee="${yyyy}"/>
    <NbRetenues>${nb}</NbRetenues>
    <TotalRS>${totalRSFmt}</TotalRS>
  </EnTete>
  <Retenues>
${retenueLines}
  </Retenues>
  <Signature>
    <Logiciel>BelloSuite</Logiciel>
    <Version>1.0.0</Version>
    <DateGeneration>${now}</DateGeneration>
  </Signature>
</TEJ>`;
}

// ─── Conversion record → TEJLine ─────────────────────────────────────────────

type WithholdingTaxRecord = Awaited<ReturnType<typeof prisma.withholdingTax.findMany>>[number];

/**
 * Convertit un enregistrement WithholdingTax (Prisma) en TEJLine.
 */
async function toTEJLine(record: WithholdingTaxRecord, index: number): Promise<TEJLine> {
  const noixBenef = record.beneficiaryTin
    ? normalizeNOIX(record.beneficiaryTin)
    : 'XXXXXXXXX'; // inconnu (individus sans MF)

  const rateNum = Number(record.rate);
  const natServ = TEJ_SERVICE_CODES[record.serviceType] || 'AU';
  const datPaie = record.paymentDate
    ? new Date(record.paymentDate).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const invoice = record.invoiceId
    ? await prisma.invoice.findUnique({ where: { id: record.invoiceId }, select: { number: true } })
    : null;

  return {
    numero: index + 1,
    noixBenef,
    denomBenef: record.beneficiaryName,
    natServ,
    mtBrutHT: Number(record.grossAmount),
    txRS: rateNum * 100, // 0.15 → 15.00
    mtRS: Number(record.taxAmount),
    mtNet: Number(record.netAmount),
    datPaie,
    refDoc: invoice?.number,
  };
}

// ─── Fetch lines ─────────────────────────────────────────────────────────────

async function fetchTEJLines(
  tenantId: string,
  periodYear: number,
  periodMonth: number,
  ids?: string[]
): Promise<{ lines: TEJLine[]; records: WithholdingTaxRecord[] }> {
  const where: any = {
    tenantId,
    periodYear,
    periodMonth,
    tejStatus: { in: ['DRAFT', 'EXPORTED'] },
  };
  if (ids?.length) where.id = { in: ids };

  const records = await prisma.withholdingTax.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  });

  const lines: TEJLine[] = [];
  for (let i = 0; i < records.length; i++) {
    lines.push(await toTEJLine(records[i], i));
  }

  return { lines, records };
}

// ─── Export principal ────────────────────────────────────────────────────────

/**
 * Exporte les RS d'une période en XML TEJ.
 * Met à jour le statut de chaque RS en EXPORTED après génération.
 *
 * @throws 'Tenant not found' | 'Tenant missing matriculeFiscal'
 *         | 'Aucune retenue à exporter'
 */
export async function exportTEJ(options: TEJExportOptions): Promise<TEJExportResult> {
  const { tenantId, periodYear, periodMonth, withholdingTaxIds } = options;

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error('Tenant not found');
  if (!tenant.matriculeFiscal) throw new Error('Tenant missing matriculeFiscal');

  const { lines, records } = await fetchTEJLines(
    tenantId,
    periodYear,
    periodMonth,
    withholdingTaxIds
  );

  if (lines.length === 0) {
    throw new Error(
      'Aucune retenue à exporter pour cette période. Vérifiez que des RS sont en statut DRAFT ou EXPORTED.'
    );
  }

  const totalRS = lines.reduce((s, l) => s + l.mtRS, 0);
  const totalBrut = lines.reduce((s, l) => s + l.mtBrutHT, 0);

  const xml = generateTEJXml(
    tenant.matriculeFiscal,
    tenant.name,
    periodYear,
    periodMonth,
    lines,
    totalRS
  );

  const mm = String(periodMonth).padStart(2, '0');
  const filename = `TEJ_${tenant.matriculeFiscal}_${periodYear}${mm}.xml`;

  const idsToUpdate = withholdingTaxIds || records.map((r) => r.id);

  await prisma.withholdingTax.updateMany({
    where: { id: { in: idsToUpdate } },
    data: { tejStatus: 'EXPORTED', exportedAt: new Date() },
  });

  return { xml, filename, count: lines.length, ids: idsToUpdate, totalRS, totalBrut };
}

// ─── Résumé période ──────────────────────────────────────────────────────────

export interface RSResume {
  totalBrut: number;
  totalRS: number;
  totalNet: number;
  count: number;
  byServiceType: Record<string, { count: number; totalRS: number; totalBrut: number }>;
  byStatus: Record<string, number>;
  byBeneficiaryType: Record<string, { count: number; totalRS: number }>;
}

/**
 * Retourne un résumé détaillé des RS d'une période.
 */
export async function getRSResume(
  tenantId: string,
  periodYear: number,
  periodMonth: number
): Promise<RSResume> {
  const records = await prisma.withholdingTax.findMany({
    where: { tenantId, periodYear, periodMonth },
    include: { invoice: { select: { number: true } } },
  });

  const totalBrut = records.reduce((s, r) => s + Number(r.grossAmount), 0);
  const totalRS = records.reduce((s, r) => s + Number(r.taxAmount), 0);
  const totalNet = records.reduce((s, r) => s + Number(r.netAmount), 0);

  const byServiceType: RSResume['byServiceType'] = {};
  const byStatus: Record<string, number> = {};
  const byBeneficiaryType: RSResume['byBeneficiaryType'] = {};

  for (const r of records) {
    if (!byServiceType[r.serviceType])
      byServiceType[r.serviceType] = { count: 0, totalRS: 0, totalBrut: 0 };
    byServiceType[r.serviceType].count++;
    byServiceType[r.serviceType].totalRS += Number(r.taxAmount);
    byServiceType[r.serviceType].totalBrut += Number(r.grossAmount);

    byStatus[r.tejStatus] = (byStatus[r.tejStatus] || 0) + 1;

    if (!byBeneficiaryType[r.beneficiaryType])
      byBeneficiaryType[r.beneficiaryType] = { count: 0, totalRS: 0 };
    byBeneficiaryType[r.beneficiaryType].count++;
    byBeneficiaryType[r.beneficiaryType].totalRS += Number(r.taxAmount);
  }

  return { totalBrut, totalRS, totalNet, count: records.length, byServiceType, byStatus, byBeneficiaryType };
}

/**
 * Génère un identifiant TEJ unique: TEJ-YYYYMM-MATRICULE-NNNN
 */
export function generateTEJId(matricule: string, year: number, month: number, seq: number): string {
  const mm = String(month).padStart(2, '0');
  const matriculeClean = (matricule || 'XXXXXXXXX').replace(/\D/g, '').slice(0, 9);
  return `TEJ-${year}${mm}-${matriculeClean}-${String(seq).padStart(4, '0')}`;
}
