-- =============================================================================
-- BelloSuite — Base de connaissances fiscale tunisienne (RAG) : table fiscal_chunks
-- =============================================================================
-- Additive et idempotente. Table GLOBALE (non rattachée à un tenant) : textes de loi publics.
--  - pgvector (schéma `extensions`, convention Supabase) : embedding vector(768)
--    (Gemini gemini-embedding-001, outputDimensionality=768, vecteurs normalisés → cosinus)
--  - tsvector généré (config 'french' ou 'arabic' selon lang) : recherche plein texte
--    disponible immédiatement, même sans embeddings
--  - RLS : lecture seule pour `authenticated`, rien pour `anon`.
--    Prisma (rôle postgres) n'est pas soumis à la RLS : écritures via l'API admin / le script.
-- Correspond au modèle Prisma `FiscalChunk` (prisma/schema/fiscal.prisma).
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.fiscal_chunks (
  id               TEXT        PRIMARY KEY,
  code             TEXT        NOT NULL,              -- IRPP_IS | TVA | DET | LF2026 | FODEC ...
  article          TEXT,                              -- "52", "13 ثالثا", "49 decies" ; NULL hors article
  section          TEXT,                              -- chemin de titres (Chapitre > Section ...)
  title            TEXT        NOT NULL,              -- intitulé du texte source
  version          TEXT        NOT NULL,              -- année de mise à jour ("2026")
  lang             TEXT        NOT NULL CHECK (lang IN ('fr', 'ar')),
  source_url       TEXT        NOT NULL,
  outdated         BOOLEAN     NOT NULL DEFAULT FALSE, -- version antérieure gardée pour le texte FR
  kind             TEXT        NOT NULL DEFAULT 'code', -- code | loi | note_commune
  part             INTEGER     NOT NULL DEFAULT 1,
  parts            INTEGER     NOT NULL DEFAULT 1,
  content          TEXT        NOT NULL,
  content_hash     TEXT        NOT NULL,
  tokens           INTEGER     NOT NULL DEFAULT 0,
  embedding        extensions.vector(768),
  embedding_model  TEXT,
  embedded_at      TIMESTAMPTZ,
  tsv              TSVECTOR GENERATED ALWAYS AS (
                     setweight(to_tsvector(CASE WHEN lang = 'ar' THEN 'arabic'::regconfig ELSE 'french'::regconfig END,
                                           coalesce(article, '') || ' ' || coalesce(section, '')), 'B')
                     || setweight(to_tsvector(CASE WHEN lang = 'ar' THEN 'arabic'::regconfig ELSE 'french'::regconfig END,
                                              content), 'A')
                   ) STORED,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fiscal_chunks_code_article_idx ON public.fiscal_chunks (code, version, article);
CREATE INDEX IF NOT EXISTS fiscal_chunks_tsv_idx ON public.fiscal_chunks USING GIN (tsv);
CREATE INDEX IF NOT EXISTS fiscal_chunks_embedding_hnsw_idx
  ON public.fiscal_chunks USING hnsw (embedding extensions.vector_cosine_ops);
CREATE INDEX IF NOT EXISTS fiscal_chunks_pending_idx ON public.fiscal_chunks (id) WHERE embedding IS NULL;

ALTER TABLE public.fiscal_chunks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fiscal_chunks FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.fiscal_chunks FROM authenticated;
GRANT SELECT ON public.fiscal_chunks TO authenticated;

DROP POLICY IF EXISTS fiscal_chunks_read_authenticated ON public.fiscal_chunks;
CREATE POLICY fiscal_chunks_read_authenticated ON public.fiscal_chunks
  FOR SELECT TO authenticated USING (true);

COMMIT;
