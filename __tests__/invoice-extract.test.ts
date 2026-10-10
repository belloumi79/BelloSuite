import {
  parseAmount, amountsIn, normalizeMf, mfKey, datesIn, extractInvoice, mergeAiExtraction, finalizeExtraction,
  matchSupplier, matchProduct, nameSimilarity, normalizeText,
} from '@/lib/invoice-extract'

// ─── Factures de test (textes réalistes, sociétés fictives) ──

/** Couche texte PDF classique : TVA 19 % unique, FODEC, timbre, milliers séparés par espace. */
const INV_PDF = `SOCIETE TEXTILE DU SAHEL SARL
Route de Sousse Km 5, 4011 Hammam Sousse
MF : 1234567/A/M/000   RC : B1234562019
Tél : 73 123 456
FACTURE N° : FA-2026/0153
Date : 05/10/2026
Client : BELLO CONFECTION
MF client : 7654321B/A/M/000
Réf  Désignation  Qté  P.U HT  Montant HT
REF-001  Fil coton peigné 30/1  100  12,500  1 250,000
REF-002  Tissu denim 12 oz  250  18,750  4 687,500
REF-003  Boutons métal 20 mm  2000  0,085  170,000
Total HT  6 107,500
FODEC 1%  61,075
TVA 19%  6 168,575  1 172,029
Timbre fiscal  1,000
Total TTC  7 341,604
Arrêtée la présente facture à la somme de sept mille trois cent quarante et un dinars et 604 millimes`

/** Deux taux (7 % et 19 %), milliers par point, colonne TVA, « Net à payer ». */
const INV_MULTI = `ETS BEN SALAH & FILS
Avenue Habib Bourguiba, Sfax
MF: 0987654X/A/P/000
FACTURE N° 2026-0412
Sfax, le 12/09/2026
Doit : BELLO CONFECTION
Désignation | Qté | P.U.HT | TVA | Total HT
Etiquettes tissées | 5 000 | 0,120 | 19% | 600,000
Sacs d'emballage kraft | 1.200 | 0,450 | 7% | 540,000
Fil polyester 40/2 | 300 | 4,800 | 19% | 1.440,000
Total HT 2.580,000
TVA 19% 2.040,000 387,600
TVA 7% 540,000 37,800
Total TVA 425,400
Timbre fiscal 1,000
Net à payer 3.006,400`

/** Sortie OCR (Tesseract) d'une photo : MF espacé, date en lettres, MF client à exclure. */
const INV_OCR = `STE MEDTEX SUARL
Zone Industrielle Ksar Hellal 5070
M.F : 1471258 R A M 000
Tél : 73 475 120
FACTURE No: F26-0098
Ksar Hellal le 3 octobre 2026
Client : SARL BELLO CONFECTION
MF: 7654321B/A/M/000
Désignation Qté P.U Montant
Tissu jersey coton 180g 85 9,400 799,000
Bande élastique 30mm 400 0,350 140,000
TOTAL H.T 939,000
FODEC 9,390
T.V.A 19% 180,194
TIMBRE 1,000
NET A PAYER 1 129,584`

/** Facture bilingue arabe / français. */
const INV_AR = `شركة النسيج العصري
Société Textile Moderne SA
المعرف الجبائي / MF : 1122334/N/M/000
فاتورة عدد : 2026/77
التاريخ : 15/09/2026
Total HT / المجموع دون الأداءات 5 000,000
TVA 19% 950,000
Timbre fiscal / الطابع الجبائي 1,000
Total TTC / المبلغ الجملي 5 951,000`

/** OCR dégradé : ligne TVA perdue, pas de libellé timbre. */
const INV_PARTIAL = `CONFECTION NOUR SARL
MF 5556667/A/M/000
Facture n° 314
Date: 01-10-26
Total HT 1 000,000
Total TTC 1 191,000`

describe('parseAmount', () => {
  it.each([
    ['1 250,000', 1250], ['1.250,000', 1250], ['1,250.000', 1250], ['237,5', 237.5], ['12,500 DT', 12.5],
    ['0,085', 0.085], ['1 172,029', 1172.029], ['6168.575', 6168.575], ['1,234,567', 1234567], ['-3,000', -3], ['abc', null],
  ])('%s → %s', (raw, v) => expect(parseAmount(raw)).toBe(v))

  it('amountsIn ignore dates et pourcentages', () => {
    expect(amountsIn('TVA 19%  6 168,575  1 172,029')).toEqual([6168.575, 1172.029])
    expect(amountsIn('Date : 05/10/2026 total 12,000')).toEqual([12])
  })

  it('chiffres arabes-indiens', () => {
    expect(amountsIn(normalizeText('المبلغ ١٢٣,٤٥٠'))).toEqual([123.45])
  })
})

describe('matricule fiscal', () => {
  it.each([
    ['1234567/A/M/000', '1234567/A/M/000'],
    ['1234567B/A/M/000', '1234567B/A/M/000'],
    ['1234567 B A M 000', '1234567B/A/M/000'],
    ['1234567BAM000', '1234567B/A/M/000'],
    ['123456/a/m/000', '0123456/A/M/000'],
    ['1234567-B-A-M-000', '1234567B/A/M/000'],
    ['n/a', null],
  ])('%s', (raw, v) => expect(normalizeMf(raw)).toBe(v))

  it('mfKey ignore code TVA / catégorie / établissement', () => {
    expect(mfKey('1234567B/A/M/000')).toBe('1234567B')
    expect(mfKey('1234567 B P M 001')).toBe('1234567B')
  })
})

describe('dates', () => {
  it('formats courants', () => {
    expect(datesIn('le 05/10/2026')).toEqual(['2026-10-05'])
    expect(datesIn('01-10-26')).toEqual(['2026-10-01'])
    expect(datesIn('2026-09-15')).toEqual(['2026-09-15'])
    expect(datesIn('3 octobre 2026')).toEqual(['2026-10-03'])
    expect(datesIn('1er février 2026')).toEqual(['2026-02-01'])
    expect(datesIn('31/02/2026')).toEqual([])
  })
})

describe('extractInvoice — PDF classique', () => {
  const x = extractInvoice(INV_PDF)
  it('entête', () => {
    expect(x.supplierName.value).toBe('SOCIETE TEXTILE DU SAHEL SARL')
    expect(x.matriculeFiscal.value).toBe('1234567/A/M/000')
    expect(x.invoiceNumber.value).toBe('FA-2026/0153')
    expect(x.date.value).toBe('2026-10-05')
  })
  it('totaux cohérents', () => {
    expect(x.subtotal.value).toBe(6107.5)
    expect(x.fodec.value).toBe(61.075)
    expect(x.vat).toEqual([{ rate: 19, base: 6168.575, amount: 1172.029, confidence: expect.any(Number) }])
    expect(x.stamp.value).toBe(1)
    expect(x.total.value).toBe(7341.604)
    expect(x.checks).toMatchObject({ totalsConsistent: true, linesMatchSubtotal: true, vatConsistent: true })
    expect(x.total.confidence).toBeGreaterThanOrEqual(0.95)
  })
  it('lignes', () => {
    expect(x.lines.map((l) => [l.reference, l.designation, l.quantity, l.unitPrice, l.total])).toEqual([
      ['REF-001', 'Fil coton peigné 30/1', 100, 12.5, 1250],
      ['REF-002', 'Tissu denim 12 oz', 250, 18.75, 4687.5],
      ['REF-003', 'Boutons métal 20 mm', 2000, 0.085, 170],
    ])
  })
  it('MF du client exclu via ownMatriculeFiscal même s’il apparaît en premier', () => {
    const swapped = INV_PDF.replace('MF : 1234567/A/M/000', 'MF : 7654321B/A/M/000').replace('MF client : 7654321B/A/M/000', 'MF client : 1234567/A/M/000')
    expect(extractInvoice(swapped, { ownMatriculeFiscal: '7654321B/A/M/000' }).matriculeFiscal.value).toBe('1234567/A/M/000')
  })
})

describe('extractInvoice — plusieurs taux', () => {
  const x = extractInvoice(INV_MULTI)
  it('entête', () => {
    expect(x.supplierName.value).toBe('ETS BEN SALAH & FILS')
    expect(x.matriculeFiscal.value).toBe('0987654X/A/P/000')
    expect(x.invoiceNumber.value).toBe('2026-0412')
    expect(x.date.value).toBe('2026-09-12')
  })
  it('TVA 7 % et 19 %, net à payer', () => {
    expect(x.vat.map((v) => [v.rate, v.base, v.amount])).toEqual([[19, 2040, 387.6], [7, 540, 37.8]])
    expect(x.vatTotal.value).toBe(425.4)
    expect(x.subtotal.value).toBe(2580)
    expect(x.total.value).toBe(3006.4)
    expect(x.checks).toMatchObject({ totalsConsistent: true, linesMatchSubtotal: true, vatConsistent: true })
  })
  it('lignes (quantités « 5 000 » et « 1.200 »)', () => {
    expect(x.lines.map((l) => [l.designation, l.quantity, l.unitPrice, l.total])).toEqual([
      ['Etiquettes tissées', 5000, 0.12, 600],
      ["Sacs d'emballage kraft", 1200, 0.45, 540],
      ['Fil polyester 40/2', 300, 4.8, 1440],
    ])
  })
})

describe('extractInvoice — OCR photo', () => {
  const x = extractInvoice(INV_OCR)
  it('entête, MF client ignoré', () => {
    expect(x.supplierName.value).toBe('STE MEDTEX SUARL')
    expect(x.matriculeFiscal.value).toBe('1471258R/A/M/000')
    expect(x.invoiceNumber.value).toBe('F26-0098')
    expect(x.date.value).toBe('2026-10-03')
  })
  it('totaux et lignes', () => {
    expect([x.subtotal.value, x.fodec.value, x.vatTotal.value, x.stamp.value, x.total.value]).toEqual([939, 9.39, 180.194, 1, 1129.584])
    expect(x.checks.totalsConsistent).toBe(true)
    expect(x.checks.linesMatchSubtotal).toBe(true)
    expect(x.lines).toHaveLength(2)
  })
})

describe('extractInvoice — bilingue arabe', () => {
  const x = extractInvoice(INV_AR)
  it('champs', () => {
    expect(x.supplierName.value).toBe('شركة النسيج العصري')
    expect(x.matriculeFiscal.value).toBe('1122334/N/M/000')
    expect(x.invoiceNumber.value).toBe('2026/77')
    expect(x.date.value).toBe('2026-09-15')
    expect([x.subtotal.value, x.vatTotal.value, x.stamp.value, x.total.value]).toEqual([5000, 950, 1, 5951])
    expect(x.checks.totalsConsistent).toBe(true)
  })
})

describe('extractInvoice — inférences', () => {
  it('TVA déduite (19 %) quand la ligne est illisible, timbre déduit', () => {
    const x = extractInvoice(INV_PARTIAL)
    expect(x.invoiceNumber.value).toBe('314')
    expect(x.date.value).toBe('2026-10-01')
    // TTC − HT = 191 = TVA 19 % (190) + timbre 1 DT non lu
    expect(x.vatTotal.value).toBe(190)
    expect(x.stamp.value).toBe(1)
    expect(x.vat.map((v) => v.rate)).toEqual([19])
  })
  it('timbre déduit de l’écart d’1 DT', () => {
    const x = extractInvoice(`X SARL\nTotal HT 1 000,000\nTVA 19% 190,000\nTotal TTC 1 191,000`)
    expect(x.stamp.value).toBe(1)
    expect(x.checks.totalsConsistent).toBe(true)
  })
  it('TTC incohérent → confiance basse + avertissement', () => {
    const x = extractInvoice(INV_PDF.replace('7 341,604', '7 841,604'))
    expect(x.checks.totalsConsistent).toBe(false)
    expect(x.total.confidence).toBeLessThan(0.7)
    expect(x.warnings).toContain('check:totals_mismatch')
  })
  it('texte vide', () => {
    expect(extractInvoice('').total.value).toBeNull()
  })
})

describe('mergeAiExtraction', () => {
  it('sans IA : inchangé', () => {
    const det = extractInvoice(INV_PDF)
    expect(mergeAiExtraction(det, null)).toBe(det)
  })

  it("l'IA ne remplace pas des montants déjà cohérents", () => {
    const det = extractInvoice(INV_PDF)
    const m = mergeAiExtraction(det, { subtotal: 9999, vatTotal: 1, total: 10001, stamp: 1, vat: [{ rate: 19, amount: 1 }] })
    expect(m.subtotal.value).toBe(6107.5)
    expect(m.total.value).toBe(7341.604)
    expect(m.checks.totalsConsistent).toBe(true)
  })

  it("l'IA corrige un TTC mal lu si son jeu de montants est cohérent", () => {
    const det = extractInvoice(INV_PDF.replace('7 341,604', '7 841,604'))
    const m = mergeAiExtraction(det, { subtotal: 6107.5, fodec: 61.075, vat: [{ rate: 19, base: 6168.575, amount: 1172.029 }], stamp: 1, total: 7341.604 })
    expect(m.total.value).toBe(7341.604)
    expect(m.checks.totalsConsistent).toBe(true)
  })

  it("montants IA incohérents rejetés", () => {
    const det = extractInvoice(INV_PDF.replace('7 341,604', '7 841,604'))
    const m = mergeAiExtraction(det, { subtotal: 6107.5, vatTotal: 1000, stamp: 1, total: 9000 })
    expect(m.total.value).toBe(7841.604)
    expect(m.warnings).toContain('ai:amounts_rejected')
  })

  it("comble les champs texte, valide MF/date, renforce l'accord", () => {
    const det = extractInvoice(INV_PARTIAL.replace('MF 5556667/A/M/000\n', '').replace('Facture n° 314\n', ''))
    const m = mergeAiExtraction(det, { matriculeFiscal: '5556667 A M 000', invoiceNumber: 'FV-314', date: '2026-10-01', supplierName: 'Confection Nour SARL' })
    expect(m.matriculeFiscal.value).toBe('5556667/A/M/000')
    expect(m.invoiceNumber.value).toBe('FV-314')
    expect(m.date.confidence).toBeGreaterThanOrEqual(0.95)
    expect(m.supplierName.confidence).toBeGreaterThanOrEqual(0.95)
    const bad = mergeAiExtraction(det, { matriculeFiscal: 'inconnu', date: '2026-13-45' })
    expect(bad.matriculeFiscal.value).toBeNull()
    expect(bad.date.value).toBe('2026-10-01')
  })

  it('lignes IA : arithmétique exigée', () => {
    const det = finalizeExtraction({ ...extractInvoice(INV_AR) })
    const m = mergeAiExtraction(det, {
      lines: [
        { designation: 'Tissu satin', quantity: 200, unitPrice: 25, total: 5000 },
        { designation: 'Ligne fausse', quantity: 2, unitPrice: 3, total: 10 },
      ],
    })
    expect(m.lines).toHaveLength(1)
    expect(m.lines[0].designation).toBe('Tissu satin')
    expect(m.checks.linesMatchSubtotal).toBe(true)
  })
})

describe('rapprochements', () => {
  const suppliers = [
    { id: 's1', name: 'Textile du Sahel', matriculeFiscal: '1234567/A/M/000' },
    { id: 's2', name: 'Medtex', matriculeFiscal: null },
    { id: 's3', name: 'Ben Salah et Fils', matriculeFiscal: '0987654X/B/P/001' },
  ]
  it('par MF (variante de format) puis par nom', () => {
    expect(matchSupplier(extractInvoice(INV_PDF), suppliers)).toEqual({ id: 's1', by: 'mf', score: 1 })
    expect(matchSupplier(extractInvoice(INV_MULTI), suppliers)).toEqual({ id: 's3', by: 'mf', score: 1 })
    expect(matchSupplier(extractInvoice(INV_OCR), suppliers)).toMatchObject({ id: 's2', by: 'name' })
    expect(matchSupplier(extractInvoice(INV_AR), suppliers)).toBeNull()
  })
  it('similarité de noms (formes juridiques ignorées)', () => {
    expect(nameSimilarity('STE MEDTEX SUARL', 'Medtex')).toBe(1)
    expect(nameSimilarity('Société Textile du Sahel S.A.R.L', 'TEXTILE DU SAHEL')).toBe(1)
    expect(nameSimilarity('Alpha Fils', 'Omega Boutons')).toBeLessThan(0.5)
  })
  it('articles : code puis nom', () => {
    const products = [{ id: 'p1', code: 'REF-001', name: 'Fil coton 30/1' }, { id: 'p2', code: 'DEN12', name: 'Tissu denim 12 oz' }]
    expect(matchProduct({ reference: 'REF-001', designation: 'Fil coton peigné 30/1' }, products)).toEqual({ id: 'p1', by: 'code', score: 1 })
    expect(matchProduct({ reference: null, designation: 'Tissu denim 12 oz bleu' }, products)).toMatchObject({ id: 'p2', by: 'name' })
    expect(matchProduct({ reference: null, designation: 'Boutons métal' }, products)).toBeNull()
  })
})

/** Couche texte de public/samples/facture-fournisseur-demo.pdf (titre « FACTURE » sur la ligne de la raison sociale). */
const INV_SAMPLE = `FILATURE DÉMO DU CAP BON SARL  FACTURE
Zone Industrielle, Route de Kélibia Km 3, 8000 Nabeul (société fictive)
FACTURE N° : FA-2026/0471
MF : 1234567/A/M/000  RC : B0123452020
Date : 06/10/2026
Tél : 72 000 000  contact@filature-demo.example
Client : BELLOSUITE DÉMO SARL
MF client : 7654321B/A/M/000
Avenue de la République, Tunis
Réf  Désignation  Qté  P.U HT  Montant HT
TX-101  Fil coton peigné Ne 30/1  120  18,500  2 220,000
TX-205  Tissu denim 12 oz  250  14,200  3 550,000
AC-310  Boutons métal 17 mm (lot 1000)  4  85,000  340,000
Total HT  6 110,000
FODEC 1%  61,100
TVA 19%  6 171,100  1 172,509
Timbre fiscal  1,000
Total TTC  7 344,609`

describe('extractInvoice — échantillon de démo (public/samples)', () => {
  it('raison sociale isolée du titre « FACTURE », client exclu, tout cohérent', () => {
    const x = extractInvoice(INV_SAMPLE)
    expect(x.supplierName.value).toBe('FILATURE DÉMO DU CAP BON SARL')
    expect(x.matriculeFiscal.value).toBe('1234567/A/M/000')
    expect(x.invoiceNumber.value).toBe('FA-2026/0471')
    expect(x.date.value).toBe('2026-10-06')
    expect([x.subtotal.value, x.fodec.value, x.vatTotal.value, x.stamp.value, x.total.value]).toEqual([6110, 61.1, 1172.509, 1, 7344.609])
    expect(x.lines.map((l) => [l.reference, l.quantity, l.unitPrice, l.total])).toEqual([['TX-101', 120, 18.5, 2220], ['TX-205', 250, 14.2, 3550], ['AC-310', 4, 85, 340]])
    expect(x.checks.totalsConsistent).toBe(true)
  })
})

describe('extractInvoice — échantillon de démo, sortie OCR de la photo (PNG)', () => {
  it('titre « FACTURE » fusionné, « N° » lu « N? », bruit sur la ligne RC', () => {
    const ocr = `FILATURE DEMO DU CAP BON SARL FACTURE
Zone eran le - Kelibla Km 3, 8000 Nabeul (société fictive) FACTURE N? : FA-2026/0471
MF : 1234567/A/M/000 iS + 80123452020 Date : 06/10/2026
Tél : 72 000 000 contact@filature-demo.example
Client : BELLOSUITE DEMO SARL
MF client : 7654321B/A/M/000
Réf Désignation Qté P.U HT Montant HT
TX-101 Fil coton peigné Ne 30/1 120 18,500 2 220,000
TX-205 Tissu denim 12 oz 250 14,200 3 550,000
AC-310 Boutons métal 17 mm (lot 1000) 4 85,000 340,000
Total HT 6 110,000
FODEC 1% 61,100
TVA 19% 6 171,100 1 172,509
Timbre fiscal 1,000
Total TTC 7 344,609`
    const x = extractInvoice(ocr)
    expect(x.supplierName.value).toBe('FILATURE DEMO DU CAP BON SARL')
    expect(x.invoiceNumber.value).toBe('FA-2026/0471')
    expect(x.matriculeFiscal.value).toBe('1234567/A/M/000')
    expect(x.total.value).toBe(7344.609)
    expect(x.lines).toHaveLength(3)
    expect(x.checks.totalsConsistent).toBe(true)
  })
})
