# Base de connaissances fiscale tunisienne (RAG)

Chunks texte des textes fiscaux officiels, découpés par article (`ARTICLE N`, `Art. N`, `الفصل N`),
sous-découpés à ~800 tokens (chevauchement ~100). Les PDF sources ne sont **pas** commités :
voir `manifest.json` (URL officielle, date de téléchargement, sha256) pour les retrouver.

| Code | Version | Langue | Périmé | Chunks | Articles | Source | sha256 |
|---|---|---|---|---|---|---|---|
| IRPP_IS | 2026 | fr | non | 176 | 102 | [DGI - jibaya.tn](https://jibaya.tn/wp-content/uploads/2026/03/Code_IRPP_IS_2026_fr.pdf) | `49f6e72cb4d6…` |
| TVA | 2026 | ar | non | 393 | 69 | [DGI - jibaya.tn](https://jibaya.tn/wp-content/uploads/2026/05/Code-TVA-2026.pdf) | `7ed9e9142812…` |
| DET | 2026 | ar | non | 185 | 81 | [DGI - jibaya.tn](https://jibaya.tn/wp-content/uploads/2026/04/مجلة-معاليم-التسجيل-والطابع-الجبائي-2026-1.pdf) | `aa1fd7de5959…` |
| LF2026 | 2026 | fr | non | 114 | 93 | [JORT (Imprimerie Officielle)](https://lake.jort.tn/journal-officiel/fr/2025/148.pdf) | `17a95b487e06…` |
| DET | 2025 | fr | oui | 266 | 130 | [DGI - jibaya.tn](https://jibaya.tn/wp-content/uploads/2025/04/Code-des-Droits-dEnregistrement-et-de-Timbre-2025.pdf) | `e48d8a6c4924…` |
| TVA | 2017 | fr | oui | 302 | 56 | [Ministère des Finances - finances.gov.tn](https://www.finances.gov.tn/sites/default/files/CODE%20TVA%202017%20FR.pdf) | `288858ac5e15…` |
| FODEC | 2012 | fr | non | 26 | 0 | [DGI - jibaya.tn](https://jibaya.tn/wp-content/uploads/2024/02/Note-commune-n-13-1-1.pdf) | `73e0d836ef26…` |

Total : **1462 chunks** (fetch 2026-10-10).

- `TVA 2026` et `DET 2026` n'existent qu'en **arabe** sur jibaya.tn : ce sont les versions de référence.
  Les versions françaises antérieures (TVA 2017, DET 2025) sont gardées pour la recherche en français,
  marquées `outdated: true` et pénalisées au classement (citations « version antérieure — à vérifier »).
- FODEC : aucun code consolidé ; la note commune DGI n° 13/2012 (liste des produits, taux 1 %) est la source officielle retenue.
- Texte arabe extrait par pdftotext : ligatures lam-alef partiellement corrigées, chiffres parfois déplacés (RTL),
  tableaux de tarifs bruités. Le texte reste exploitable pour la recherche ; citer l'URL officielle.

## Régénérer / ingérer

```bash
# 1. télécharger les PDF du manifest dans un dossier sources/, puis :
FETCH_DATE=YYYY-MM-DD python3 scripts/fiscal-kb/build_chunks.py <sources> --out data/fiscal-kb
# 2. table : supabase/migrations/20261010100000_fiscal_kb.sql (pgvector + tsvector, RLS lecture authenticated)
# 3. upsert + embeddings (Gemini gemini-embedding-001, 768 dims, gratuit) :
npx tsx scripts/fiscal-kb/ingest.ts                       # local : DATABASE_URL + GEMINI_API_KEY
BELLO_SESSION=<cookie SUPER_ADMIN> npx tsx scripts/fiscal-kb/ingest.ts --remote https://bellosuite.vercel.app
```
