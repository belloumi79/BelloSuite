# Rapport d'Analyse Technique Approfondie - BelloSuite ERP

## 1. Qualité du Développement & Stack
*   **Frontend :** Next.js 15 (App Router), Tailwind CSS. Excellente réactivité.
*   **Backend :** Route Handlers (API) sur Vercel. Architecture Serverless scalable.
*   **Base de Données :** Supabase (PostgreSQL) + Prisma 7. Isolation Tenant-Level.
*   **Temps Réel :** Intégration Supabase Realtime dans `src/hooks/useRealtimeStats.ts`.

## 2. Score de Maturité par Module (Readiness Score)

| Module | Score | Analyse Code |
| :--- | :--- | :--- |
| **Stock** | 95% | `src/app/api/stock/` : Mouvements complets. Décrément automatique via documents (`src/app/api/commercial/documents/route.ts`). |
| **Ventes/Achat** | 90% | `src/lib/fiscal.ts` : Calculs TTC/VAT/FODEC conformes Loi 2024. Générateur TEIF XML 1.8.8 fonctionnel. |
| **POS (Caisse)** | 80% | `src/app/api/pos/` : Sessions/Paiements OK. **Critique :** Manque le décrément de stock automatique lors d'une vente POS (contrairement au module commercial). |
| **Paie** | 85% | `src/lib/fiscal.ts` : Nouveau barème IRPP 2025 intégré (tranches 0-5k, 5-10k à 15%, etc.). |
| **Fiscalité** | 95% | `src/lib/tej-generator.ts` : Générateur XML TEJ 2026 complet pour la Retenue à la Source électronique. |
| **Comptabilité**| 65% | `src/lib/accounting-auto.ts` : Règles d'auto-journalisation vers journaux VTE/SVC. Manque la balance de clôture automatique. |

## 3. Analyse de la Dette Technique & Risques
1.  **Tests Automatisés :** Absence totale de tests unitaires/E2E (Playwright/Jest). Risque élevé de régression lors des mises à jour Prisma/Next.js.
2.  **Incohérence Stock :** Les ventes via le module `Commercial` décrémentent le stock, mais pas les ventes via le module `POS`. Risque d'écart de stock physique important.
3.  **Confusion Fiscale :** Dans `src/app/api/hr/payslips/route.ts`, le taux de 1.5% semble être confondu entre la CNSS et la CSS. À vérifier selon le paramétrage par défaut.
4.  **Dépendance Env :** Forte dépendance aux variables `DATABASE_URL` pour la génération Prisma en build-time (problématique sur certains CI/CD).

## 4. Positionnement Concurrentiel (Market Gap)

| Critère | Swiver | Finco | **BelloSuite** |
| :--- | :--- | :--- | :--- |
| **Stack** | PHP/React (Legacy) | Node/React | **Next.js 15 (Cutting edge)** |
| **Prix Pro** | 48 DT/mois | 49 DT/mois | **29 DT/mois (-40%)** |
| **Compliance** | TEIF | TEIF/TEJ | **TEIF + TEJ 2026 Natif** |
| **Stock** | 1 Entrepôt (Base) | Multi | **Multi + Transferts natifs** |

## 5. Recommandations Prioritaires
1.  **Correction POS :** Aligner la logique de `src/app/api/pos/orders/route.ts` sur celle de `src/app/api/commercial/documents/route.ts` pour décrémenter le stock.
2.  **Compliance Sociale :** Développer l'export XML CNSS (actuellement uniquement calcul interne).
3.  **Audit RLS :** Sécuriser les appels `supabase.from('Product')` dans les hooks clients pour éviter les fuites de données inter-tenants.

---
**Conclusion :** BelloSuite est techniquement supérieur en termes de modernité et de conformité fiscale TEJ. Cependant, l'incohérence du stock POS est un bloqueur pour les commerces physiques. Une fois corrigé, le produit est prêt à "casser" le marché.
