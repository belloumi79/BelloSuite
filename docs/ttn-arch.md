# 🏛️ Architecture TTN / El Fatoora — BelloSuite

> **Version:** 1.0 — Avril 2026  
> **Status:** En développement  
> **Loi applicable:** LF 2026 Art. 53 + Note Commune N°02/2026

---

## 1. Cadre Réglementaire

### 1.1 Textes de référence

| Texte | Contenu | Status |
|---|---|---|
| **Décret n°2016-1066** (15 août 2016) | Cadre légal facturation électronique | Base légale |
| **Article 18 Code TVA (II ter)** | Obligation factures électroniques pour assujettis TVA | Appliqué depuis 2016 |
| **Loi de Finances 2025 Art. 53** | Obligation BS → Prestations de services (01/07/2025) | ✅ En vigueur |
| **Loi de Finances 2026 Art. 53** | Extension obligatoire à toutes les ventes + prestations | ✅ 01/01/2027 |
| **Note Commune N°02/2026** | Procédure technique TEJ / TTN | ✅ Publiée |

### 1.2 Obligations par typologie (LF 2026)

| Type | Obligation TTN | Date limite |
|---|---|---|
| Ventes de biens (BS) | ✅ Obligatoire | 01/01/2027 |
| Prestations de services | ✅ Obligatoire | 01/07/2025 (déjà échéance) |
| Professions libérales | ✅ Obligatoire | 01/01/2027 |
| Restaurants / hôtellerie | ✅ Obligatoire | 01/01/2027 |
| Auto-entrepreneurs | ⚠️ En attente clarification | TBD |

### 1.3 Plateformes & acteurs

| Acteur | Rôle | Site |
|---|---|---|
| **TTN** (Tunisie TradeNet) | Opérateur officiel e-invoicing | ttn.tn |
| **El Fatoora** | Portail/interface TTN | adhesion.elfatoora.tn (depuis fév 2026) |
| **ANCE** (Agence Nationale de Certification Électronique) | Émet certificats numériques | ance.tn |
| **TunTrust** | AC racine /证书 autorité | tuntrust.com.tn |
| **DIGIGO** | Identifiant numérique (的个人 token) | digigo.tn |
| **DIGIPRO** | Signature numérique entreprise | digipro.tn |

### 1.4 Certificats numériques requis

| Certificat | Usage | Prix approximatif |
|---|---|---|
| **TunTrust** (.p12 / USB token) | Signature factures + authentification | 150-300 DT/an |
| **ANCE accredited** | Certifié ANCE (même valeur légale) | Variable |
| **DIGIGO** | Identifiant numérique personnel | ~10 DT |

> ⚠️ Le certificat doit être émis au nom de la **personne morale** (entreprise), pas au nom personnel.

---

## 2. Format TEIF v1.8.8 (TTN)

### 2.1 Structure XML obligatoire

```xml
<?xml version="1.0" encoding="UTF-8"?>
<TEIF version="1.8.8" controlingAgency="TTN">
  <InvoiceHeader>
    <MessageSenderIdentifier>MATRICULE_FISCAL_EMETTEUR</MessageSenderIdentifier>
    <MessageRecieverIdentifier>TTN</MessageRecieverIdentifier>
  </InvoiceHeader>
  <InvoiceBody>
    <Bgm>
      <DocumentIdentifier>FAC-2026-0001</DocumentIdentifier>
      <DocumentType>I-11</DocumentType> <!-- I-11=Facture, I-12=Avoir, I-13=Note débit -->
    </Bgm>
    <Dtm>
      <IssueDate>150426</IssueDate> <!-- DDMMYY format -->
      <DueDate>150526</DueDate>
    </Dtm>
    <PartnerSection>
      <Supplier>...</Supplier>
      <Customer>...</Customer>
    </PartnerSection>
    <LinSection>
      <Lin>...</Lin> <!-- une ligne par article -->
    </LinSection>
    <InvoiceMoa>
      <SubTotalHT>1000.000</SubTotalHT>
      <TotalVAT>190.000</TotalVAT>
      <TotalTTC>1191.000</TotalTTC>
    </InvoiceMoa>
    <InvoiceTax>
      <!-- TVA 19%, 13%, 7%, FODEC 1%, Timbre 1.000 DT -->
    </InvoiceTax>
  </InvoiceBody>
</TEIF>
```

### 2.2 Types de documents

| Code | Type |
|---|---|
| I-11 | Facture |
| I-12 | Avoir (Crédit Note) |
| I-13 | Note de débit |
| I-14 | Facture d'export |

### 2.3 TVA en Tunisie

| Taux | Application |
|---|---|
| 19% | Taux standard |
| 13% | Hôtels, restaurants, transports |
| 7% | Produits médicaux, livros |
| 0% | Exonéré / export |

### 2.4 Taxes spéciales

| Taxe | Taux | Notes |
|---|---|---|
| **FODEC** | 1% | Sur total HT, applies aux biens seulement |
| **Timbre Fiscal** | 1.000 DT | Par facture, si TTC > 0 |
| **Retenue à la Source** | 1.5-20% | Services_only, max 20% du montant |

### 2.5 Naming convention fichier

```
TEIF_{MATRICULE_FISCAL}_{NUMERO_FACTURE}_{DATE}.xml
Ex: TEIF_12345678X_FAC-2026-0001_150426.xml
```

---

## 3. Intégration ASP — Architecture

### 3.1 Providers supportés

| Provider | API Base | Status |
|---|---|---|
| **TTNHub** | https://api.ttnhub.tn/v1 | ✅ Prêt |
| **eFactureTN** | https://api.efacturetn.com/v1 | ✅ Prêt |

### 3.2 Flow de soumission

```
[BelloSuite Invoice]
       │
       ▼
[Generate TEIF XML] ── lib/teif-generator.ts
       │
       ▼
[Submit to ASP Provider] ── lib/ttn-asp.ts
       │                      (ttnhub or efacturetn)
       ▼
[Provider validates & signs]
       │
       ▼
[TTN receives + validates TEIF]
       │
       ├──✅ ACCEPTED → ttnReference + QR Code
       │
       └──❌ REJECTED → errorCode + errorMessage
```

### 3.3 Cycle de vie d'une facture TTN

```
DRAFT → SUBMITTED → SIGNED → TRANSMITTED → ACCEPTED
                                    ↓
                              REJECTED ← (on error)
                                    ↓
                              CANCELLED
```

---

## 4. Configuration requise

### 4.1 Étapes d'inscription (approximatives 4-6 semaines)

1. **Obtenir certificat numérique** (TunTrust ou ANCE accredited)
   - Documents: Registre commerce, CIF, CIN dirigeants, cachet entreprise
   - Durée: 1-3 jours
   - Coût: ~150-300 DT/an

2. **S'inscrire sur El Fatoora** (adhesion.elfatoora.tn, depuis fév 2026)
   - Choisir mode: **WEB** (portal) ou **EDI** (API automatique)
   - Durée: 1-2 semaines

3. **Configurer provider ASP** (TTNHub ou eFactureTN)
   - Obtenir clés API
   - Configurer webhook pour notifications temps réel

4. **Configurer BelloSuite**
   - Aller dans: Paramètres > TTN / El Fatoora
   - Entrer clés API + sélectionner provider

### 4.2 Configuration dans BelloSuite

```
Paramètres > TTN / El Fatoora
├── Provider: [TTNHub / eFactureTN]
├── Clé API: [tk_live_xxxxx]
├── Secret API: [sk_live_xxxxx]
├── SFTP (optionnel): credentials
├── Webhook Secret: [whsec_xxxxx]
└── Actif: [ON/OFF]
```

---

## 5. Implémentation technique

### 5.1 Fichiers créés

| Fichier | Rôle |
|---|---|
| `prisma/schema.prisma` | Modèles ASPConfiguration + champs TTN sur Invoice |
| `src/lib/ttn-asp.ts` | Service d'intégration provider ASP |
| `src/lib/teif-generator.ts` | Génération XML TEIF (existant, mis à jour v1.8.8) |
| `src/app/api/commercial/asp-config/route.ts` | CRUD config ASP |
| `src/app/api/commercial/asp-config/test/route.ts` | Test connexion provider |
| `src/app/api/commercial/invoices/[id]/ttn-submit/route.ts` | Soumission facture à TTN |
| `src/app/(dashboard)/commercial/invoices/[id]/page.tsx` | Détail facture + statut TTN |
| `src/app/(dashboard)/commercial/settings/ttn/page.tsx` | Page config TTN |

### 5.2 Variables d'environnement à ajouter

```env
# .env.local
TTNHUB_API_KEY=tk_live_xxxxx
TTNHUB_API_SECRET=sk_live_xxxxx
EFACTURETN_API_KEY=xxxxx
```

### 5.3 Prochaines étapes

1. ✅ Schema mis à jour
2. ✅ Service ttn-asp.ts créé
3. ✅ Pages UI créées
4. ⏳ Générer migration Prisma
5. ⏳ Configurer credentials réels (provider test)
6. ⏳ Webhook handler pour notifications TTN
7. ⏳ PDF signature (enriched par provider)
8. ⏳ Dashboard TTN (stats soumissions/rejets)

---

## 6. Notes importantes

- Le **QR Code TTN** est généré par le provider TTN après acceptation
- Le **PDF signé** contient la signature numérique du provider/TTN
- La **plage denumérotation** doit correspondre au matricule fiscal de l'entreprise
- Les factures doivent être conservées pendant **10 ans** (conformité légales)
- Tout rejet doit être **corrigé et resubmitted** dans les 48h (recommandé)

