-- =============================================================================
-- BelloSuite — Table RateLimit (rate limit persistant des routes d'authentification)
-- =============================================================================
-- ⚠️  NE PAS appliquer automatiquement : à exécuter à la main dans
--     Supabase → SQL Editor (production), avant ou après le déploiement de hardening-2.
--     Tant que la table n'existe pas, l'application retombe sur le limiteur en mémoire
--     (aucune erreur visible pour les utilisateurs).
-- Correspond au modèle Prisma `RateLimit` (prisma/schema/security.prisma).
-- Idempotent.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public."RateLimit" (
  "key"         TEXT         NOT NULL,
  "count"       INTEGER      NOT NULL DEFAULT 0,
  "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

CREATE INDEX IF NOT EXISTS "RateLimit_windowStart_idx" ON public."RateLimit" ("windowStart");

-- Deny by default pour anon/authenticated (Prisma utilise le rôle postgres, non soumis à la RLS)
ALTER TABLE public."RateLimit" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."RateLimit" FROM anon, authenticated;

COMMIT;
