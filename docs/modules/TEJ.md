# TEJ — Déclaration Électronique des Retenues à la Source

> **En 2026, tout passe par la plateforme TEJ 🇹🇳**
> La déclaration TEJ est obligatoire pour toutes les entreprises tunisiennes qui versent des honoraires, loyers, dividendes, intérêts ou royalties.

---

## 1. Ce qu'est TEJ

| | |
|---|---|
| **P**lateforme | `https://www.tej.gov.tn` |
| **G**éré par | Direction Générale des Impôts (DGI) |
| **O**bligatoire depuis | LF 2026 (art. 52-54 CGI) |
| **D**éclaration | Mensuelle — avant le 20 du mois suivant |

---

## 2. Taux de Retenue à la Source 2026

| Type de revenu | Personne physique | Société |
|---|---|---|
| Prestations de services (art. 52) | **15%** | **7.5%** |
| Honoraires (art. 52) | **15%** | **7.5%** |
| Loyers (art. 53) | **15%** | **15%** |
| Dividendes (art. 54) | **20%** | — |
| Intérêts (art. 54) | **20%** | — |
| Redevances / Royalties (art. 54) | **20%** | — |
| Rémunération du personnel | 0% (couvert par IRPP/CNSS) | — |

> La réduction de 50% pour les sociétés s'applique automatiquement sur les prestations de services et honoraires.

---

## 3. Modèle de données

```prisma
WithholdingTax {
  id              String   // UUID
  tenantId        String   // Multi-tenant
  invoiceId       String?  // Lien optionnel vers Invoice

  beneficiaryTin     String?       // Matricule fiscal (NOIX) — 9 chiffres
  beneficiaryName    String        // Nom ou Raison sociale
  beneficiaryAddress String?
  beneficiaryType    INDIVIDU | SOCIETE

  serviceType        PRESTATION_SERVICE | HONORAIRES | LOYERS | ...

  grossAmount     Decimal  // Montant brut HT
  rate            Decimal  // Taux RS (ex: 0.15)
  taxAmount       Decimal  // Montant RS = grossAmount × rate
  netAmount       Decimal  // Montant net = grossAmount - taxAmount
  teeJAmount      Decimal  // TEEJ = netAmount (après RS)

  periodMonth     Int      // Mois (1–12)
  periodYear     Int      // Année (ex: 2026)

  tejId           String?  // ID TEJ: TEJ-202604-MATRICULE-0001
  tejStatus       DRAFT | EXPORTED | SUBMITTED | ACCEPTED | REJECTED
  exportedAt      DateTime?
  submittedAt     DateTime?
}
```

**Relations:**
```
Tenant 1──∞ WithholdingTax
Invoice 1──∞ WithholdingTax
WithholdingTax ∞──1 Invoice
```

---

## 4. Fichier XML TEJ — Format officiel

### Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<TEJ xmlns="http://tej.dgi.gov.tn">
  <EnTete>
    <NOIXDeclarant>123456789</NOIXDeclarant>
    <DenomDeclarant>Ma Société SARL</DenomDeclarant>
    <Periode mois="04" annee="2026"/>
    <NbRetenues>000002</NbRetenues>
    <TotalRS>1875.000</TotalRS>
  </EnTete>
  <Retenues>
    <Retenue>
      <Nume>000001</Nume>
      <NOIXBenef>123456789</NOIXBenef>
      <DenomBenef>SARL Alpha</DenomBenef>
      <NatServ>PS</NatServ>
      <MtBrutHT>10000.000</MtBrutHT>
      <TxRS>15.00</TxRS>
      <MtRS>1500.000</MtRS>
      <MtNet>8500.000</MtNet>
      <DatPaie>2026-04-15</DatPaie>
    </Retenue>
  </Retenues>
  <Signature>
    <Logiciel>BelloSuite</Logiciel>
    <Version>1.0.0</Version>
    <DateGeneration>2026-04-13T17:30:00Z</DateGeneration>
  </Signature>
</TEJ>
```

### Codes service TEJ

| Code | Signification |
|------|---------------|
| `PS` | Prestation de services |
| `HO` | Honoraires |
| `LO` | Loyers |
| `DI` | Dividendes |
| `IN` | Intérêts |
| `RO` | Royalties / Redevances |
| `RE` | Rémunération |
| `AU` | Autre |

### NOIX — Matricule Fiscal Tunisien

- **9 chiffres** : `KKKKKKKKK`
- K1–K4 : Code gouvernorat (01=Tunis, 02=Ariana, ...)
- K5–K8 : Numéro séquentiel
- K9 : Clé de contrôle
- Validation : `123456789` ✓, `12345678` ✗, `ABC` ✗

---

## 5. API Routes

### Créer une RS
```
POST /api/commercial/retenue-source
Body: { tenantId, beneficiaryTin?, beneficiaryName, beneficiaryType,
        serviceType, grossAmount, periodMonth, periodYear, invoiceId? }
→ Retourne: WithholdingTax avec taxAmount calculé
```

### Liste + Résumé par période
```
GET /api/commercial/retenue-source?tenantId=&periodYear=&periodMonth=
→ Retourne: { items: WithholdingTax[], resume: RSResume }
```

### Détail
```
GET /api/commercial/retenue-source/[id]
```

### Modifier + Recalculer automatiquement
```
PATCH /api/commercial/retenue-source/[id]
Body: { grossAmount?, serviceType?, beneficiaryType?, ... }
→ Recalcule taxAmount si les montants changent
```

### Exporter XML TEJ
```
GET /api/commercial/retenue-source/export-tej?tenantId=&periodYear=&periodMonth=
→ Content-Type: application/xml
→ Content-Disposition: attachment; filename="TEJ_123456789_202604.xml"
→ Marque toutes les RS de la période en EXPORTED
```

---

## 6. Résumé RS (getRSResume)

```typescript
{
  totalBrut: number,       // Somme des montants bruts
  totalRS: number,         // Somme des RS
  totalNet: number,        // Somme des nets
  count: number,           // Nombre de lignes
  byServiceType: {
    PRESTATION_SERVICE: { count, totalRS, totalBrut },
    HONORAIRES: { count, totalRS, totalBrut },
    ...
  },
  byStatus: { DRAFT: 3, EXPORTED: 10, ACCEPTED: 5 },
  byBeneficiaryType: {
    INDIVIDU: { count, totalRS },
    SOCIETE: { count, totalRS },
  }
}
```

---

## 7. Workflow utilisateur

```
1. Créer une RS manuellement
   /commercial/retenue-source/new
   → Saisie: bénéficiaire, type, montant brut
   → Calcul automatique du montant RS

2. Lier à une facture existante
   → Bouton "Générer RS" dans le détail facture
   → Importe automatiquement: client, montant, date

3. Vérifier la période
   → Les RS sont groupées par année/mois

4. Exporter le XML TEJ
   → /commercial/retenue-source → bouton "Exporter TEJ Avril 2026"
   → Télécharge TEJ_MATRICULE_202604.xml

5. Soumettre sur tej.gov.tn
   → Platforme officielle TEJ
   → Statut mis à jour: ACCEPTED / REJECTED
```

---

## 8. États TEJ

| Statut | Signification | Action |
|--------|-------------|--------|
| `DRAFT` | Brouillon local | En attente de validation |
| `EXPORTED` | XML généré, prêt | Téléverser sur tej.gov.tn |
| `SUBMITTED` | Soumis sur TEJ | En attente de validation |
| `ACCEPTED` | Validée par DGI | ✅ Terminé |
| `REJECTED` | Rejetée | Corriger et rexporter |
| `CANCELLED` | Annulée | — |

---

## 9. Comparaison avec Finco.tn

| Fonction | BelloSuite | Finco.tn |
|----------|-----------|----------|
| Calcul RS automatique | ✅ | ✅ |
| Export XML TEJ | ✅ | ✅ |
| Multi-tenant | ✅ | Limitée |
| Intégré à la comptabilité | ✅ | ❌ |
| E-invoicing TTN | ✅ | ✅ |
| Dashboard RH/Paie | ✅ | ❌ |
| Module Stock/POS | ✅ | ❌ |
| Open source | Partiel | Non |

---

## 10. Prochaines étapes

- [ ] Bouton "Générer RS" dans la vue détail facture
- [ ] Import auto des factures avec `rsAmount > 0`
- [ ] Lien TEJ.gov.tn dans le mail de notification
- [ ] Suivi du statut ACCEPTED/REJECTED via API TEJ (si disponible)
- [ ] Génération PDF de l'état de déclaration mensuel
