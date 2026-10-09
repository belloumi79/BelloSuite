-- Données de démonstration du cycle d'achat — tenant « Entreprise Démo SARL » (1f771e5b-391f-4450-8ff6-3e1e63bee33e).
-- 3 fournisseurs, 3 bons de commande (reçu / partiellement reçu / confirmé non reçu), 2 bons de réception
-- validés (avec de VRAIS mouvements ENTRY / PURCHASE / PURCHASE_RECEIPT, CMUP recalculé comme applyMovementTx),
-- 1 facture fournisseur liée à la commande reçue (purement commerciale : aucun mouvement).
-- IDEMPOTENT : fournisseurs ON CONFLICT ; le reste n'est créé que si BCF-2026-0001 n'existe pas. Aucune suppression.

BEGIN;

INSERT INTO "Supplier" ("id","tenantId","code","name","email","phone","address","city","matriculeFiscal","updatedAt")
VALUES
  (gen_random_uuid()::text,'1f771e5b-391f-4450-8ff6-3e1e63bee33e','FRS-001','Textiles du Sahel SARL','commandes@textiles-sahel.tn','+216 73 460 120','Zone industrielle Ksar Hellal','Monastir','1234567/A/M/000',now()),
  (gen_random_uuid()::text,'1f771e5b-391f-4450-8ff6-3e1e63bee33e','FRS-002','Bureautique Pro Tunis','ventes@bureautiquepro.tn','+216 71 800 455','Rue du Lac Léman, Les Berges du Lac','Tunis','7654321/B/M/000',now()),
  (gen_random_uuid()::text,'1f771e5b-391f-4450-8ff6-3e1e63bee33e','FRS-003','Quincaillerie Ben Arous','contact@qba.tn','+216 71 383 900','Avenue de la République','Ben Arous','2468135/C/M/000',now())
ON CONFLICT ("tenantId","code") DO NOTHING;

DO $$
DECLARE
  t   text := '1f771e5b-391f-4450-8ff6-3e1e63bee33e';
  s1  text; s2 text; s3 text;
  wTun text; wBar text;
  po1 text := gen_random_uuid()::text; po2 text := gen_random_uuid()::text; po3 text := gen_random_uuid()::text;
  inv text := gen_random_uuid()::text;
  br1 text := gen_random_uuid()::text; br2 text := gen_random_uuid()::text;
  l record;
  cur numeric; avg0 numeric; newAvg numeric; dep numeric;
BEGIN
  IF EXISTS (SELECT 1 FROM "PurchaseOrder" WHERE "tenantId"=t AND number='BCF-2026-0001') THEN
    RAISE NOTICE 'Seed achats déjà appliqué'; RETURN;
  END IF;
  SELECT id INTO s1 FROM "Supplier" WHERE "tenantId"=t AND code='FRS-001';
  SELECT id INTO s2 FROM "Supplier" WHERE "tenantId"=t AND code='FRS-002';
  SELECT id INTO s3 FROM "Supplier" WHERE "tenantId"=t AND code='FRS-003';
  SELECT id INTO wTun FROM "Warehouse" WHERE "tenantId"=t AND code='DEP-TUN';
  SELECT id INTO wBar FROM "Warehouse" WHERE "tenantId"=t AND code='DEP-BAR';

  -- Lignes : (po, ligne, code produit, qté commandée, prix, qté reçue)
  CREATE TEMP TABLE _l (po text, lid text, code text, qty numeric, price numeric, rec numeric) ON COMMIT DROP;
  INSERT INTO _l VALUES
    (po1, gen_random_uuid()::text, 'SKU-001', 100, 12.500, 100),
    (po1, gen_random_uuid()::text, 'SKU-002',  20, 44.000,  20),
    (po2, gen_random_uuid()::text, 'SKU-003',  50,  8.800,  30),
    (po2, gen_random_uuid()::text, 'PRD-050',  10, 43.000,  10),
    (po3, gen_random_uuid()::text, 'PRD-011',  20, 158.000,  0),
    (po3, gen_random_uuid()::text, 'PRD-035',  30, 27.500,   0);

  INSERT INTO "PurchaseOrder" ("id","tenantId","supplierId","warehouseId","number","type","status","date","expectedDate","subtotal","taxRate","taxAmount","total","notes","confirmedAt","createdAt","updatedAt")
  SELECT x.id, t, x.sup, x.wh, x.num, 'ORDER', x.st, x.d::timestamp, x.exp::timestamp, s.sub, 19, ROUND(s.sub*0.19,3), ROUND(s.sub*1.19,3), x.notes, x.d::timestamp, x.d::timestamp, now()
  FROM (VALUES
    (po1, s2, wTun, 'BCF-2026-0001', 'RECEIVED',           '2026-09-15 09:00', '2026-09-20 09:00', 'Réassort papeterie'),
    (po2, s3, wBar, 'BCF-2026-0002', 'PARTIALLY_RECEIVED', '2026-09-28 10:00', '2026-10-05 09:00', 'Quincaillerie atelier — reliquat de vis attendu'),
    (po3, s1, wTun, 'BCF-2026-0003', 'CONFIRMED',          '2026-10-06 11:00', '2026-10-20 09:00', 'Matières premières — livraison prévue')
  ) AS x(id, sup, wh, num, st, d, exp, notes)
  JOIN (SELECT po, SUM(qty*price) sub FROM _l GROUP BY po) s ON s.po = x.id;

  INSERT INTO "PurchaseOrderItem" ("id","purchaseOrderId","productId","description","quantity","unitPrice","total")
  SELECT l2.lid, l2.po, p.id, p.code||' — '||p.name, l2.qty, l2.price, ROUND(l2.qty*l2.price,3)
  FROM _l l2 JOIN "Product" p ON p."tenantId"=t AND p.code=l2.code;

  -- Bons de réception validés
  INSERT INTO "GoodsReceipt" ("id","tenantId","number","supplierId","purchaseOrderId","warehouseId","status","date","supplierRef","notes","total","validatedAt","createdAt","updatedAt")
  VALUES
    (br1, t, 'BR-2026-0001', s2, po1, wTun, 'VALIDATED', '2026-09-20 10:30', 'BL-BP-88412', 'Livraison complète', (SELECT ROUND(SUM(rec*price),3) FROM _l WHERE po=po1), '2026-09-20 10:30', '2026-09-20 10:30', now()),
    (br2, t, 'BR-2026-0002', s3, po2, wBar, 'VALIDATED', '2026-10-02 14:00', 'BL-QBA-3307', 'Livraison partielle : 30 boîtes de vis sur 50', (SELECT ROUND(SUM(rec*price),3) FROM _l WHERE po=po2), '2026-10-02 14:00', '2026-10-02 14:00', now());

  -- Lignes de réception + mouvements (même logique que applyMovementTx : CMUP, dépôt, total produit, solde du dépôt après)
  FOR l IN
    SELECT l2.*, p.id AS pid, CASE WHEN l2.po=po1 THEN br1 ELSE br2 END AS rid, CASE WHEN l2.po=po1 THEN wTun ELSE wBar END AS wid,
           CASE WHEN l2.po=po1 THEN 'BR-2026-0001' ELSE 'BR-2026-0002' END AS rnum,
           CASE WHEN l2.po=po1 THEN timestamp '2026-09-20 10:30' ELSE timestamp '2026-10-02 14:00' END AS rdate
    FROM _l l2 JOIN "Product" p ON p."tenantId"=t AND p.code=l2.code WHERE l2.rec > 0 ORDER BY l2.po, l2.code
  LOOP
    INSERT INTO "GoodsReceiptItem" ("id","receiptId","purchaseOrderItemId","productId","description","quantity","unitCost")
    SELECT gen_random_uuid()::text, l.rid, l.lid, l.pid, poi.description, l.rec, l.price FROM "PurchaseOrderItem" poi WHERE poi.id=l.lid;

    SELECT "currentStock", CASE WHEN "averageCost" > 0 THEN "averageCost" ELSE "purchasePrice" END INTO cur, avg0
      FROM "Product" WHERE id=l.pid FOR UPDATE;
    SELECT COALESCE((SELECT stock FROM "ProductWarehouse" WHERE "productId"=l.pid AND "warehouseId"=l.wid),0) INTO dep;
    newAvg := CASE WHEN GREATEST(cur,0) <= 0 THEN l.price ELSE ROUND((GREATEST(cur,0)*avg0 + l.rec*l.price)/(GREATEST(cur,0)+l.rec), 6) END;
    UPDATE "Product" SET "currentStock" = "currentStock" + l.rec, "averageCost" = newAvg WHERE id=l.pid;
    INSERT INTO "ProductWarehouse" ("productId","warehouseId","stock","updatedAt") VALUES (l.pid, l.wid, l.rec, now())
      ON CONFLICT ("productId","warehouseId") DO UPDATE SET "stock" = "ProductWarehouse"."stock" + EXCLUDED."stock", "updatedAt" = now();
    INSERT INTO "StockMovement" ("id","tenantId","productId","warehouseId","type","quantity","unitPrice","reference","reason","notes","sourceType","sourceId","balanceAfter","costAfter","createdAt")
    VALUES (gen_random_uuid()::text, t, l.pid, l.wid, 'ENTRY', l.rec, l.price, l.rnum, 'PURCHASE', 'Réception fournisseur', 'PURCHASE_RECEIPT', l.rid, dep + l.rec, newAvg, l.rdate);
  END LOOP;

  -- Facture fournisseur (commerciale) liée à la commande reçue
  INSERT INTO "PurchaseOrder" ("id","tenantId","supplierId","linkedOrderId","supplierRef","number","type","status","date","subtotal","taxRate","taxAmount","total","notes","createdAt","updatedAt")
  SELECT inv, t, s2, po1, 'FA-BP-2026-1187', 'FF-2026-0001', 'INVOICE', 'VALIDATED', '2026-09-22 09:00', s.sub, 19, ROUND(s.sub*0.19,3), ROUND(s.sub*1.19,3), 'Facture de la commande BCF-2026-0001', '2026-09-22 09:00', now()
  FROM (SELECT SUM(qty*price) sub FROM _l WHERE po=po1) s;
  INSERT INTO "PurchaseOrderItem" ("id","purchaseOrderId","productId","description","quantity","unitPrice","total")
  SELECT gen_random_uuid()::text, inv, poi."productId", poi.description, poi.quantity, poi."unitPrice", poi.total FROM "PurchaseOrderItem" poi WHERE poi."purchaseOrderId"=po1;
END $$;

COMMIT;
