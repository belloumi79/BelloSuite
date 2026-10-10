-- Bons de livraison : dépôt de sortie choisi par l'utilisateur (au lieu du dépôt par défaut implicite).
-- STRICTEMENT ADDITIF et IDEMPOTENT : colonne nullable, index et clé étrangère créés seulement s'ils manquent. Rejouable.
-- Les documents existants gardent warehouseId = NULL (affichés sans dépôt).

BEGIN;

ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "warehouseId" TEXT;
CREATE INDEX IF NOT EXISTS "Invoice_warehouseId_idx" ON "Invoice"("warehouseId");
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Invoice_warehouseId_fkey') THEN
  ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
END IF; END $$;

COMMIT;
