-- ============================================================
-- MIGRATION SUPPLÉMENTAIRE — Colonnes manquantes
-- Exécuter dans: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Product.images (String[])
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "images" text[] DEFAULT '{}';

-- 2. Product.variants (Json)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "variants" jsonb DEFAULT '[]';

-- 3. Invoice.currency
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'TND';

-- 4. Invoice.convertedFromId
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "convertedFromId" uuid;

-- 5. Invoice.convertedToId  
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "convertedToId" uuid;

-- 6. Invoice.paymentMethod
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paymentMethod" text;

-- 7. PurchaseOrder.currency
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'TND';

-- 8. PurchaseOrder.paymentMethod
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "paymentMethod" text;

-- 9. PurchaseOrder.deliveryDate
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "deliveryDate" timestamptz;

-- 10. PurchaseOrder.discountPercent
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "discountPercent" decimal(5,2) DEFAULT 0;

-- ============================================================
-- VÉRIFICATION
-- ============================================================
SELECT 'Product' as table_name, count(*) as colonnes
FROM information_schema.columns WHERE table_name = 'product'
UNION ALL
SELECT 'Invoice', count(*) FROM information_schema.columns WHERE table_name = 'invoice'
UNION ALL
SELECT 'PurchaseOrder', count(*) FROM information_schema.columns WHERE table_name = 'purchaseorder';
