-- Achats : bons de réception fournisseurs (seuls documents qui font entrer du stock) et retours fournisseurs.
-- Pratique retenue : le bon de commande et la facture fournisseur sont commerciaux/fiscaux ; seul le bon de
-- réception (ENTRY, motif PURCHASE) et le retour fournisseur (EXIT, motif SUPPLIER_RETURN) mouvementent le stock.
-- STRICTEMENT ADDITIF et IDEMPOTENT : ADD COLUMN / CREATE ... IF NOT EXISTS uniquement. Rejouable.

BEGIN;

-- 1) PurchaseOrder : dépôt de livraison prévu, lien facture → commande, dates de cycle de vie
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "warehouseId" TEXT;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "linkedOrderId" TEXT;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "supplierRef" TEXT;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "PurchaseOrder_tenantId_type_status_idx" ON "PurchaseOrder"("tenantId", "type", "status");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_linkedOrderId_idx" ON "PurchaseOrder"("linkedOrderId");
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='PurchaseOrder_warehouseId_fkey') THEN
  ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='PurchaseOrder_linkedOrderId_fkey') THEN
  ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_linkedOrderId_fkey" FOREIGN KEY ("linkedOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
END IF; END $$;

-- 2) Bon de réception
CREATE TABLE IF NOT EXISTS "GoodsReceipt" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "supplierId" TEXT,
  "purchaseOrderId" TEXT,
  "warehouseId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "supplierRef" TEXT,
  "notes" TEXT,
  "total" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "validatedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "GoodsReceipt_tenantId_number_key" ON "GoodsReceipt"("tenantId", "number");
CREATE INDEX IF NOT EXISTS "GoodsReceipt_tenantId_status_idx" ON "GoodsReceipt"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "GoodsReceipt_purchaseOrderId_idx" ON "GoodsReceipt"("purchaseOrderId");
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='GoodsReceipt_tenantId_fkey') THEN
  ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='GoodsReceipt_supplierId_fkey') THEN
  ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='GoodsReceipt_purchaseOrderId_fkey') THEN
  ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='GoodsReceipt_warehouseId_fkey') THEN
  ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
END IF; END $$;

CREATE TABLE IF NOT EXISTS "GoodsReceiptItem" (
  "id" TEXT NOT NULL,
  "receiptId" TEXT NOT NULL,
  "purchaseOrderItemId" TEXT,
  "productId" TEXT NOT NULL,
  "description" TEXT,
  "quantity" DECIMAL(65,30) NOT NULL,
  "unitCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
  CONSTRAINT "GoodsReceiptItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "GoodsReceiptItem_receiptId_idx" ON "GoodsReceiptItem"("receiptId");
CREATE INDEX IF NOT EXISTS "GoodsReceiptItem_purchaseOrderItemId_idx" ON "GoodsReceiptItem"("purchaseOrderItemId");
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='GoodsReceiptItem_receiptId_fkey') THEN
  ALTER TABLE "GoodsReceiptItem" ADD CONSTRAINT "GoodsReceiptItem_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "GoodsReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='GoodsReceiptItem_purchaseOrderItemId_fkey') THEN
  ALTER TABLE "GoodsReceiptItem" ADD CONSTRAINT "GoodsReceiptItem_purchaseOrderItemId_fkey" FOREIGN KEY ("purchaseOrderItemId") REFERENCES "PurchaseOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='GoodsReceiptItem_productId_fkey') THEN
  ALTER TABLE "GoodsReceiptItem" ADD CONSTRAINT "GoodsReceiptItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
END IF; END $$;

-- 3) Retour fournisseur (depuis un bon de réception)
CREATE TABLE IF NOT EXISTS "SupplierReturn" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "receiptId" TEXT NOT NULL,
  "supplierId" TEXT,
  "warehouseId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'VALIDATED',
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  "total" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupplierReturn_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SupplierReturn_tenantId_number_key" ON "SupplierReturn"("tenantId", "number");
CREATE INDEX IF NOT EXISTS "SupplierReturn_receiptId_idx" ON "SupplierReturn"("receiptId");
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='SupplierReturn_tenantId_fkey') THEN
  ALTER TABLE "SupplierReturn" ADD CONSTRAINT "SupplierReturn_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='SupplierReturn_receiptId_fkey') THEN
  ALTER TABLE "SupplierReturn" ADD CONSTRAINT "SupplierReturn_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "GoodsReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='SupplierReturn_supplierId_fkey') THEN
  ALTER TABLE "SupplierReturn" ADD CONSTRAINT "SupplierReturn_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='SupplierReturn_warehouseId_fkey') THEN
  ALTER TABLE "SupplierReturn" ADD CONSTRAINT "SupplierReturn_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
END IF; END $$;

CREATE TABLE IF NOT EXISTS "SupplierReturnItem" (
  "id" TEXT NOT NULL,
  "returnId" TEXT NOT NULL,
  "receiptItemId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" DECIMAL(65,30) NOT NULL,
  "unitCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
  CONSTRAINT "SupplierReturnItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SupplierReturnItem_returnId_idx" ON "SupplierReturnItem"("returnId");
CREATE INDEX IF NOT EXISTS "SupplierReturnItem_receiptItemId_idx" ON "SupplierReturnItem"("receiptItemId");
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='SupplierReturnItem_returnId_fkey') THEN
  ALTER TABLE "SupplierReturnItem" ADD CONSTRAINT "SupplierReturnItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "SupplierReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='SupplierReturnItem_receiptItemId_fkey') THEN
  ALTER TABLE "SupplierReturnItem" ADD CONSTRAINT "SupplierReturnItem_receiptItemId_fkey" FOREIGN KEY ("receiptItemId") REFERENCES "GoodsReceiptItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='SupplierReturnItem_productId_fkey') THEN
  ALTER TABLE "SupplierReturnItem" ADD CONSTRAINT "SupplierReturnItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
END IF; END $$;

-- 4) RLS : même schéma que les autres tables (activée, aucune policy ; l'application passe par Prisma/propriétaire).
ALTER TABLE "GoodsReceipt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GoodsReceiptItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupplierReturn" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupplierReturnItem" ENABLE ROW LEVEL SECURITY;

COMMIT;
