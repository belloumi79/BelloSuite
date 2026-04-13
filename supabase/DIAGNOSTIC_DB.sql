-- ============================================================
-- DIAGNOSTIC COMPLET v2 — Lister TOUT
-- ============================================================

-- 1. TOUTES les tables de la DB
SELECT table_schema, table_name FROM information_schema.tables 
WHERE table_type = 'BASE TABLE'
ORDER BY table_schema, table_name;

-- 2. TOUS les types (enum)
SELECT typname, string_agg(enumlabel, ', ' ORDER BY enumsortorder) as values
FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
GROUP BY typname ORDER BY typname;

-- 3. Les 3 tables avec leurs colonnes EXACTES
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name IN ('Product', 'Invoice', 'PurchaseOrder', 'product', 'invoice', 'purchaseorder')
ORDER BY table_name, ordinal_position;