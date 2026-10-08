-- =============================================================================
-- BelloSuite — Activer la RLS sur TOUTES les tables du schéma public (deny by default)
-- =============================================================================
-- ⚠️  NE PAS appliquer automatiquement. À relire puis exécuter à la main dans
--     Supabase → SQL Editor (projet de production), APRÈS le déploiement de la
--     branche `security-fixes` (le code ne lit plus aucune table avec la clé anon).
--
-- Pourquoi c'est sans risque pour l'application :
--   * Prisma se connecte avec le rôle `postgres` (propriétaire des tables) via
--     DATABASE_URL / DIRECT_URL. Le propriétaire d'une table n'est pas soumis à la
--     RLS (on n'utilise volontairement PAS `FORCE ROW LEVEL SECURITY`).
--   * Supabase Auth (signInWithPassword, OAuth) utilise le schéma `auth`, pas `public`.
--
-- Effet : avec RLS activée et AUCUNE politique, les rôles `anon` et
-- `authenticated` (clé anon publique, PostgREST /rest/v1, Realtime) ne voient et
-- ne modifient plus aucune ligne. C'est le comportement voulu : toutes les
-- données passent par les routes API serveur, qui vérifient session + tenant.
--
-- Idempotent : peut être relancé sans erreur.
-- =============================================================================

BEGIN;

-- 1) RLS sur toutes les tables ordinaires et partitionnées du schéma public
--    (couvre les 64 modèles Prisma + toute table créée à la main, ex. _prisma_migrations).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
    RAISE NOTICE 'RLS activée sur public.%', r.relname;
  END LOOP;
END
$$;

-- 2) Supprimer toute politique permissive existante créée à la main dans le
--    dashboard (le dépôt n'en contient aucune). Décommenter APRÈS avoir listé
--    les politiques avec la requête de vérification (C) ci-dessous, si besoin.
-- DO $$
-- DECLARE p record;
-- BEGIN
--   FOR p IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' LOOP
--     EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
--   END LOOP;
-- END $$;

-- 3) Ceinture + bretelles : retirer aux rôles publics tout privilège sur les
--    tables les plus sensibles (même si une politique était ajoutée par erreur).
--    La table User contient les e-mails et rôles ; Tenant les infos des sociétés ;
--    ASPConfiguration les identifiants TTN/SFTP en clair ; PaySlip/Employee la paie.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['User','Tenant','TenantModule','ASPConfiguration','PaySlip','Employee','PaieParameters'] LOOP
    -- Ignore les tables absentes de la base (ex. PaieParameters non créée en prod)
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
    ELSE
      RAISE NOTICE 'Table public.% absente, ignorée', t;
    END IF;
  END LOOP;
END
$$;

-- 4) (Optionnel, recommandé) Retirer TOUS les privilèges de anon/authenticated sur
--    le schéma public et pour les futures tables. L'application n'en a pas besoin.
-- REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
-- REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
-- REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

COMMIT;

-- =============================================================================
-- Vérifications (à lancer après l'exécution)
-- =============================================================================
-- (A) Toute table public sans RLS (doit renvoyer 0 ligne) :
--   SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND NOT c.relrowsecurity;
--
-- (B) Test côté client (doit renvoyer [] ou une erreur 401/permission denied) :
--   curl "https://<ref>.supabase.co/rest/v1/User?select=email&limit=1" \
--     -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
--
-- (C) Politiques existantes (idéalement aucune) :
--   SELECT schemaname, tablename, policyname, roles, cmd FROM pg_policies WHERE schemaname = 'public';
--
-- Retour arrière (urgence uniquement) : ALTER TABLE public."<Table>" DISABLE ROW LEVEL SECURITY;
