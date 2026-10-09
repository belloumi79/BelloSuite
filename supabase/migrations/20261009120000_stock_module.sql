-- Module stock complet : dépôts, mouvements, transferts, inventaire, alertes, valorisation (CMUP).
-- Appliqué le 9 oct. 2026 via l'API Supabase (projet guhwnihenpqoxcugtkyr).
-- STRICTEMENT ADDITIF et IDEMPOTENT : uniquement des ADD VALUE / ADD COLUMN / CREATE ... IF NOT EXISTS.
-- Aucune suppression ni renommage. Rejouable sans effet de bord.

-- 1) Valeur d'enum (hors transaction : ADD VALUE ne peut pas être utilisée dans la même transaction)
ALTER TYPE "InventoryStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';

BEGIN;
-- 2) Product : CMUP + point de commande
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "averageCost" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "reorderPoint" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "reorderQty" DECIMAL(65,30) NOT NULL DEFAULT 0;
-- CMUP initial = prix d'achat pour les produits existants (uniquement si encore à 0)
UPDATE "Product" SET "averageCost" = "purchasePrice" WHERE "averageCost" = 0 AND "purchasePrice" > 0;

-- 3) StockMovement : motif, origine, solde et coût après mouvement
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "reason" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "sourceType" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "sourceId" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "balanceAfter" DECIMAL(65,30);
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "costAfter" DECIMAL(65,30);
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
CREATE INDEX IF NOT EXISTS "StockMovement_tenantId_warehouseId_createdAt_idx" ON "StockMovement"("tenantId", "warehouseId", "createdAt");
CREATE INDEX IF NOT EXISTS "StockMovement_tenantId_createdAt_idx" ON "StockMovement"("tenantId", "createdAt");

-- 4) Warehouse : responsable, téléphone
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "manager" TEXT;
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- 5) ProductWarehouse : seuil d'alerte par dépôt
ALTER TABLE "ProductWarehouse" ADD COLUMN IF NOT EXISTS "minStock" DECIMAL(65,30);

-- 6) Inventory / InventoryItem
ALTER TABLE "Inventory" ADD COLUMN IF NOT EXISTS "scope" TEXT NOT NULL DEFAULT 'FULL';
ALTER TABLE "Inventory" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "Inventory" ADD COLUMN IF NOT EXISTS "validatedAt" TIMESTAMP(3);
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "counted" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "InventoryItem_inventoryId_idx" ON "InventoryItem"("inventoryId");

-- 7) StockTransfer
ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "validatedAt" TIMESTAMP(3);

-- 8) Référentiels : catégories et unités
CREATE TABLE IF NOT EXISTS "ProductCategory" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProductCategory_tenantId_name_key" ON "ProductCategory"("tenantId", "name");
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProductCategory_tenantId_fkey') THEN
  ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
END IF; END $$;

CREATE TABLE IF NOT EXISTS "StockUnit" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "decimals" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StockUnit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "StockUnit_tenantId_code_key" ON "StockUnit"("tenantId", "code");
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='StockUnit_tenantId_fkey') THEN
  ALTER TABLE "StockUnit" ADD CONSTRAINT "StockUnit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
END IF; END $$;

-- 9) RLS : même schéma que les autres tables (activée, aucune policy = refus pour anon/authenticated ;
--    l'application passe par Prisma avec le rôle propriétaire, qui n'est pas soumis à RLS).
ALTER TABLE "ProductCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockUnit" ENABLE ROW LEVEL SECURITY;
COMMIT;

-- Vérification
SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ('ProductCategory','StockUnit');
