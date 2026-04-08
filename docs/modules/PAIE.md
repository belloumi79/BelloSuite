# Module Paie - Documentation

## Overview
Gestion des bulletins de salaire pour les entreprises Tunisiennes.

## Models

### PaySlip
Bulletin de salaire individuel par période.

| Champ | Type | Description |
|-------|------|-------------|
| employeeId | String | Référence employé (GRH) |
| periodMonth | Int | Mois (1-12) |
| periodYear | Int | Année |
| baseSalary | Decimal | Salaire de base |
| grossSalary | Decimal | Salaire brut |
| netSalary | Decimal | Salaire net |
| transportAllowance | Decimal | Indemnité transport |
| mealAllowance | Decimal | Indemnité repas |
| familyAllowance | Decimal | Allocations familiales |
| overtimeHours | Int | Heures supplémentaires |
| overtimeRate | Decimal | Taux heures supp (défaut 1.5) |
| overtimeAmount | Decimal | Montant heures supp |
| socialSecurity | Decimal | CNSS employée (9.18%) |
| taxBracket | Decimal | IRPP |
| status | Enum | DRAFT, VALIDATED, PAID, CANCELLED |

### PaieParameters
Paramètres de calcul pour une année fiscale.

## Tunisia-Specific Calculations

### CNSS (Caisse Nationale de Sécurité Sociale)
- **Employé**: 9.18% du salaire brut
- **Employeur**: 13.49% du salaire brut

### IRPP (Impôt sur le Revenu)
Barèmes officiels 2024 (revenus mensuels): [^1]
| Tranche (TND) | Taux |
|---------------|------|
| 0 - 5,000 | 0% |
| 5,001 - 10,000 | 15% |
| 10,001 - 30,000 | 20% |
| 30,001 - 50,000 | 30% |
| 50,001 - 70,000 | 35% |
| > 70,000 | 40% |

[^1]: جدول الضريبة على الدخل — Barème officiel tunisien pour l'année fiscale.

### Allocations Familiales
- 30 TND par enfant (max 3 enfants = 90 TND)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/hr/payslips | Liste des bulletins (filtres: employeeId, month, year, status) |
| POST | /api/hr/payslips | Générer les bulletins pour une période |
| GET | /api/hr/payslips/[id] | Détail d'un bulletin |
| PUT | /api/hr/payslips/[id] | Modifier un bulletin |
| DELETE | /api/hr/payslips/[id] | Supprimer un bulletin |
| POST | /api/hr/payslips/overtime | Calculer les heures supplémentaires |
| GET | /api/hr/payroll | Résumé de la paie mensuelle |
| GET | /api/hr/paie/parameters | Obtenir les paramètres de paie |
| PUT | /api/hr/paie/parameters | Mettre à jour les paramètres |

## File Structure
```
src/app/(dashboard)/hr/paie/
├── page.tsx                      # Page principale
└── components/
    ├── index.ts                  # Exports
    ├── PayrollSummary.tsx         # Cartes de résumé
    ├── PaySlipTable.tsx          # Tableau des bulletins
    └── PaySlipModal.tsx          # Modal détail bulletin

src/app/api/hr/
├── payslips/
│   ├── route.ts                  # CRUD + génération
│   ├── [id]/route.ts             # Opérations single
│   └── overtime/route.ts        # Calcul heures supp
├── payroll/route.ts             # Résumé mensuel
└── paie/parameters/route.ts     # Paramètres CNSS/IRPP
```

## Dependencies
- Module GRH (Employee, Contract) - **required**
- Module Comptabilité (pour comptabilisation des salaires)

## Status Workflow
```
DRAFT → VALIDATED → PAID
  ↓         ↓
CANCELLED  CANCELLED
```

## TODO
- [ ] Intégration avec comptabilité (écritures automatiques)
- [ ] Export PDF des bulletins
- [ ] Gestion des avances sur salaire
- [ ] Déclaration CNSS mensuelle
- [ ] Attestation de salaire
