-- Données de démonstration du module stock — tenant « Entreprise Démo SARL » (1f771e5b-391f-4450-8ff6-3e1e63bee33e).
-- Appliqué le 9 oct. 2026 via l'API Supabase (projet guhwnihenpqoxcugtkyr).
-- IDEMPOTENT : chaque insertion est gardée par un code / une référence / une date fixe (ON CONFLICT ou NOT EXISTS).
-- Aucune suppression. Ne touche QUE le tenant de démo.
-- Conventions (src/lib/stock-logic.ts) : ENTRY +|q|, EXIT −|q|, ADJUSTMENT et TRANSFER signés.
-- Le statut « validé » d'un transfert est TRANSFERRED (l'enum TransferStatus n'a pas de VALIDATED).

BEGIN;

-- ─── 1) Dépôts ─────────────────────────────────────────────────────────────
INSERT INTO "Warehouse" ("id","tenantId","code","name","address","manager","phone","isDefault","isActive","createdAt","updatedAt")
VALUES
  (gen_random_uuid()::text,'1f771e5b-391f-4450-8ff6-3e1e63bee33e','DEP-TUN','Dépôt principal Tunis','Zone industrielle Charguia II, 2035 Tunis','Sami Trabelsi','+216 71 940 210',true ,true,'2026-05-01 07:00','2026-05-01 07:00'),
  (gen_random_uuid()::text,'1f771e5b-391f-4450-8ff6-3e1e63bee33e','DEP-SFX','Magasin Sfax','Route de Gabès km 3, 3003 Sfax','Amira Ben Salah','+216 74 402 118',false,true,'2026-09-01 07:00','2026-09-01 07:00'),
  (gen_random_uuid()::text,'1f771e5b-391f-4450-8ff6-3e1e63bee33e','DEP-BAR','Entrepôt Ben Arous','Zone industrielle Ben Arous, 2013 Ben Arous','Hichem Gharbi','+216 71 381 654',false,true,'2026-09-01 07:00','2026-09-01 07:00')
ON CONFLICT ("tenantId","code") DO NOTHING;

-- ─── 2) Référentiels : catégories (celles des produits) et unités (codes = Product.unit) ──
INSERT INTO "ProductCategory" ("id","tenantId","name","description","updatedAt")
SELECT gen_random_uuid()::text, '1f771e5b-391f-4450-8ff6-3e1e63bee33e', c.name, c.descr, now()
FROM (VALUES
  ('Informatique','Matériel et périphériques informatiques'),
  ('Outillage','Outils et équipements d''atelier'),
  ('Sécurité','Équipements de protection et sécurité'),
  ('Consommables','Consommables bureau et atelier'),
  ('Matières Premières','Matières premières de production'),
  ('Fournitures','Fournitures de bureau'),
  ('Quincaillerie','Visserie et petite quincaillerie')
) AS c(name, descr)
ON CONFLICT ("tenantId","name") DO NOTHING;

INSERT INTO "StockUnit" ("id","tenantId","code","name","decimals","updatedAt")
SELECT gen_random_uuid()::text, '1f771e5b-391f-4450-8ff6-3e1e63bee33e', u.code, u.name, u.dec, now()
FROM (VALUES ('unité','Unité',0),('kg','Kilogramme',3),('boîte','Boîte',0),('ramette','Ramette',0),('m','Mètre',2),('l','Litre',3)) AS u(code,name,dec)
ON CONFLICT ("tenantId","code") DO NOTHING;

-- ─── 3) Mouvements existants sans dépôt → DEP-TUN (ventes FAC-…) ───────────
UPDATE "StockMovement" m
SET "warehouseId" = w.id,
    "reason"     = COALESCE(m."reason", CASE WHEN m."type"='EXIT' AND m."reference" LIKE 'FAC-%' THEN 'SALE' END),
    "sourceType" = COALESCE(m."sourceType", CASE WHEN m."type"='EXIT' AND m."reference" LIKE 'FAC-%' THEN 'SALE' END)
FROM "Warehouse" w
WHERE m."tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e' AND m."warehouseId" IS NULL
  AND w."tenantId"=m."tenantId" AND w.code='DEP-TUN';

-- ─── 4) Stock d'ouverture DEP-TUN : tous les produits, 01/05/2026 ──────────
-- Quantité = stock actuel + sorties déjà enregistrées → après rejeu des ventes, on retrouve le stock actuel.
INSERT INTO "StockMovement" ("id","tenantId","productId","type","quantity","unitPrice","reference","notes","warehouseId","reason","sourceType","createdAt")
SELECT gen_random_uuid()::text, p."tenantId", p.id, 'ENTRY',
       p."currentStock" + COALESCE((SELECT SUM(ABS(x.quantity)) FROM "StockMovement" x WHERE x."productId"=p.id AND x."tenantId"=p."tenantId" AND x."type"='EXIT'),0),
       p."purchasePrice", 'OUV-DEP-TUN', 'Stock d''ouverture du dépôt principal', w.id, 'OPENING', 'OPENING', '2026-05-01 08:00'
FROM "Product" p JOIN "Warehouse" w ON w."tenantId"=p."tenantId" AND w.code='DEP-TUN'
WHERE p."tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e'
  AND p."currentStock" + COALESCE((SELECT SUM(ABS(x.quantity)) FROM "StockMovement" x WHERE x."productId"=p.id AND x."tenantId"=p."tenantId" AND x."type"='EXIT'),0) > 0
  AND NOT EXISTS (SELECT 1 FROM "StockMovement" e WHERE e."tenantId"=p."tenantId" AND e."productId"=p.id AND e."warehouseId"=w.id AND e."reference"='OUV-DEP-TUN');

-- ─── 5) Stock d'ouverture DEP-SFX et DEP-BAR : 01/09/2026 ──────────────────
INSERT INTO "StockMovement" ("id","tenantId","productId","type","quantity","unitPrice","reference","notes","warehouseId","reason","sourceType","createdAt")
SELECT gen_random_uuid()::text, p."tenantId", p.id, 'ENTRY', o.qty, p."purchasePrice", 'OUV-'||o.dep, 'Stock d''ouverture du dépôt', w.id, 'OPENING', 'OPENING', '2026-09-01 08:00'
FROM (VALUES
  ('DEP-SFX','PRD-001',20),('DEP-SFX','PRD-002',40),('DEP-SFX','PRD-004',25),('DEP-SFX','PRD-006',30),
  ('DEP-SFX','PRD-010',18),('DEP-SFX','PRD-012',35),('DEP-SFX','PRD-016',22),('DEP-SFX','PRD-022',15),
  ('DEP-SFX','PRD-035',30),('DEP-SFX','PRD-048',50),('DEP-SFX','SKU-001',120),('DEP-SFX','SKU-002',15),
  ('DEP-BAR','PRD-003',10),('DEP-BAR','PRD-005',40),('DEP-BAR','PRD-008',12),('DEP-BAR','PRD-011',25),
  ('DEP-BAR','PRD-017',60),('DEP-BAR','PRD-021',40),('DEP-BAR','PRD-023',45),('DEP-BAR','PRD-029',30),
  ('DEP-BAR','PRD-041',35),('DEP-BAR','PRD-047',80)
) AS o(dep, code, qty)
JOIN "Product" p ON p."tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e' AND p.code=o.code
JOIN "Warehouse" w ON w."tenantId"=p."tenantId" AND w.code=o.dep
WHERE NOT EXISTS (SELECT 1 FROM "StockMovement" e WHERE e."tenantId"=p."tenantId" AND e."productId"=p.id AND e."warehouseId"=w.id AND e."reference"='OUV-'||o.dep);

-- ─── 6) Activité des 4 dernières semaines (entrées, sorties, ajustements) ──
INSERT INTO "StockMovement" ("id","tenantId","productId","type","quantity","unitPrice","reference","notes","warehouseId","reason","sourceType","createdAt")
SELECT gen_random_uuid()::text, p."tenantId", p.id, a.typ::"StockMovementType", a.qty,
       CASE WHEN a.typ='ENTRY' THEN ROUND(p."purchasePrice" * a.costf, 3) END,
       a.ref, a.notes, w.id, a.reason, 'MANUAL', a.ts::timestamp
FROM (VALUES
  ('DEP-TUN','PRD-001','ENTRY',      20, 1.04,'PURCHASE',       'BR-2026-0141','Réception fournisseur',               '2026-09-14 09:30'),
  ('DEP-TUN','PRD-013','ENTRY',      15, 1.03,'PURCHASE',       'BR-2026-0141','Réception fournisseur',               '2026-09-14 09:35'),
  ('DEP-SFX','PRD-002','EXIT',        8, NULL,'SALE',           'BL-SFX-0087', 'Vente comptoir Sfax',                 '2026-09-15 11:00'),
  ('DEP-TUN','PRD-019','ENTRY',      30, 1.05,'PURCHASE',       'BR-2026-0145','Réception fournisseur',               '2026-09-17 10:00'),
  ('DEP-BAR','PRD-017','EXIT',       12, NULL,'CONSUMPTION',    'BS-BAR-0012', 'Consommation atelier',                '2026-09-18 14:00'),
  ('DEP-TUN','PRD-007','EXIT',        3, NULL,'DAMAGE',         NULL,          'Cartons endommagés à la réception',   '2026-09-19 16:00'),
  ('DEP-SFX','SKU-001','EXIT',       25, NULL,'SALE',           'BL-SFX-0091', 'Vente comptoir Sfax',                 '2026-09-21 10:15'),
  ('DEP-BAR','PRD-047','EXIT',       20, NULL,'CONSUMPTION',    'BS-BAR-0015', 'Consommation atelier',                '2026-09-22 08:45'),
  ('DEP-TUN','PRD-028','ENTRY',      25, 1.06,'PURCHASE',       'BR-2026-0152','Réception fournisseur',               '2026-09-23 09:00'),
  ('DEP-TUN','PRD-034','ENTRY',      20, 1.02,'PURCHASE',       'BR-2026-0152','Réception fournisseur',               '2026-09-23 09:05'),
  ('DEP-SFX','PRD-006','ADJUSTMENT', -2, NULL,'LOSS',           NULL,          'Perte constatée en rayon',            '2026-09-25 17:30'),
  ('DEP-TUN','PRD-038','ENTRY',      25, 1.03,'PURCHASE',       'BR-2026-0158','Réception fournisseur',               '2026-09-26 10:00'),
  ('DEP-TUN','PRD-039','ENTRY',      20, 1.04,'PURCHASE',       'BR-2026-0158','Réception fournisseur',               '2026-09-26 10:05'),
  ('DEP-SFX','PRD-012','EXIT',        6, NULL,'SALE',           'BL-SFX-0098', 'Vente comptoir Sfax',                 '2026-09-28 15:20'),
  ('DEP-TUN','PRD-044','ENTRY',      15, 1.05,'PURCHASE',       'BR-2026-0163','Réception fournisseur',               '2026-10-01 09:15'),
  ('DEP-BAR','PRD-023','EXIT',       10, NULL,'SALE',           'BL-BAR-0021', 'Livraison client Ben Arous',          '2026-10-02 11:00'),
  ('DEP-TUN','PRD-014','ENTRY',       4, 1.00,'CUSTOMER_RETURN','AV-2026-0007','Retour client',                       '2026-10-03 14:00'),
  ('DEP-TUN','PRD-022','ADJUSTMENT',  3, NULL,'CORRECTION',     NULL,          'Correction après recomptage',         '2026-10-05 16:45'),
  ('DEP-SFX','PRD-016','EXIT',        5, NULL,'SALE',           'BL-SFX-0104', 'Vente comptoir Sfax',                 '2026-10-06 10:30'),
  ('DEP-TUN','PRD-050','EXIT',        4, NULL,'SUPPLIER_RETURN','RF-2026-0004','Retour fournisseur : lot non conforme','2026-10-07 09:00'),
  ('DEP-BAR','PRD-029','EXIT',        6, NULL,'CONSUMPTION',    'BS-BAR-0019', 'Consommation atelier',                '2026-10-07 13:00'),
  ('DEP-TUN','PRD-043','EXIT',        7, NULL,'SALE',           'BL-2026-0212','Livraison client',                    '2026-10-08 10:00'),
  ('DEP-SFX','PRD-048','ENTRY',      20, 1.03,'PURCHASE',       'BR-2026-0171','Réception fournisseur',               '2026-10-08 11:30')
) AS a(dep, code, typ, qty, costf, reason, ref, notes, ts)
JOIN "Product" p ON p."tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e' AND p.code=a.code
JOIN "Warehouse" w ON w."tenantId"=p."tenantId" AND w.code=a.dep
WHERE NOT EXISTS (SELECT 1 FROM "StockMovement" e WHERE e."tenantId"=p."tenantId" AND e."productId"=p.id AND e."warehouseId"=w.id
                  AND e."type"=a.typ::"StockMovementType" AND e."createdAt"=a.ts::timestamp);

-- ─── 7) Transferts : TRF-2026-0001 effectué (TRANSFERRED), TRF-2026-0002 brouillon ──
INSERT INTO "StockTransfer" ("id","tenantId","reference","date","fromWarehouseId","toWarehouseId","status","validatedAt","notes","createdAt","updatedAt")
SELECT gen_random_uuid()::text, '1f771e5b-391f-4450-8ff6-3e1e63bee33e', t.ref, t.d::timestamp, wf.id, wt.id, t.st::"TransferStatus",
       t.val::timestamp, t.notes, t.d::timestamp, COALESCE(t.val, t.d)::timestamp
FROM (VALUES
  ('TRF-2026-0001','2026-09-24 10:00','DEP-TUN','DEP-SFX','TRANSFERRED','2026-09-24 10:00','Approvisionnement du magasin de Sfax'),
  ('TRF-2026-0002','2026-10-08 15:00','DEP-TUN','DEP-BAR','DRAFT',       NULL,              'Réassort Ben Arous (à valider)')
) AS t(ref, d, f, tt, st, val, notes)
JOIN "Warehouse" wf ON wf."tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e' AND wf.code=t.f
JOIN "Warehouse" wt ON wt."tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e' AND wt.code=t.tt
ON CONFLICT ("tenantId","reference") DO NOTHING;

INSERT INTO "StockTransferItem" ("id","transferId","productId","quantity","notes")
SELECT gen_random_uuid()::text, tr.id, p.id, l.qty, NULL
FROM (VALUES ('TRF-2026-0001','PRD-001',10),('TRF-2026-0001','PRD-013',8),('TRF-2026-0001','PRD-028',6),
             ('TRF-2026-0002','PRD-019',10),('TRF-2026-0002','PRD-043',5),('TRF-2026-0002','PRD-012',8)) AS l(ref, code, qty)
JOIN "StockTransfer" tr ON tr."tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e' AND tr.reference=l.ref
JOIN "Product" p ON p."tenantId"=tr."tenantId" AND p.code=l.code
WHERE NOT EXISTS (SELECT 1 FROM "StockTransferItem" i WHERE i."transferId"=tr.id AND i."productId"=p.id);

-- Mouvements du transfert effectué : −q au dépôt source, +q au dépôt destination
INSERT INTO "StockMovement" ("id","tenantId","productId","type","quantity","unitPrice","reference","notes","warehouseId","reason","sourceType","sourceId","createdAt")
SELECT gen_random_uuid()::text, tr."tenantId", i."productId", 'TRANSFER', s.sign * i.quantity, NULL, tr.reference,
       CASE WHEN s.sign < 0 THEN '→ ' || wt.code ELSE '← ' || wf.code END,
       CASE WHEN s.sign < 0 THEN tr."fromWarehouseId" ELSE tr."toWarehouseId" END,
       'TRANSFER', 'TRANSFER', tr.id, tr."validatedAt"
FROM "StockTransfer" tr
JOIN "StockTransferItem" i ON i."transferId"=tr.id
JOIN "Warehouse" wf ON wf.id=tr."fromWarehouseId"
JOIN "Warehouse" wt ON wt.id=tr."toWarehouseId"
CROSS JOIN (VALUES (-1),(1)) AS s(sign)
WHERE tr."tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e' AND tr.reference='TRF-2026-0001' AND tr.status='TRANSFERRED'
  AND NOT EXISTS (SELECT 1 FROM "StockMovement" e WHERE e."tenantId"=tr."tenantId" AND e."sourceType"='TRANSFER' AND e."sourceId"=tr.id
                  AND e."productId"=i."productId" AND SIGN(e.quantity)=s.sign);

-- ─── 8) Inventaire validé INV-2026-0001 (Ben Arous, 30/09/2026) ────────────
INSERT INTO "Inventory" ("id","tenantId","warehouseId","reference","date","status","scope","validatedAt","notes","createdAt","updatedAt")
SELECT gen_random_uuid()::text, w."tenantId", w.id, 'INV-2026-0001', '2026-09-30 08:00', 'VALIDATED', 'FULL', '2026-09-30 17:00',
       'Inventaire de fin de trimestre — Ben Arous', '2026-09-30 08:00', '2026-09-30 17:00'
FROM "Warehouse" w WHERE w."tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e' AND w.code='DEP-BAR'
ON CONFLICT ("tenantId","reference") DO NOTHING;

-- Lignes : théorique = stock du dépôt à la date d'ouverture ; toutes comptées, 3 écarts
INSERT INTO "InventoryItem" ("id","inventoryId","warehouseId","productId","expectedQty","actualQty","unitCost","variance","counted","notes")
SELECT gen_random_uuid()::text, inv.id, inv."warehouseId", st."productId", st.qty, st.qty + COALESCE(g.gap,0),
       CASE WHEN p."averageCost" > 0 THEN p."averageCost" ELSE p."purchasePrice" END,
       COALESCE(g.gap,0), true, g.note
FROM "Inventory" inv
JOIN LATERAL (
  SELECT m."productId", SUM(CASE m."type" WHEN 'ENTRY' THEN ABS(m.quantity) WHEN 'EXIT' THEN -ABS(m.quantity) ELSE m.quantity END) AS qty
  FROM "StockMovement" m
  WHERE m."tenantId"=inv."tenantId" AND m."warehouseId"=inv."warehouseId" AND m."createdAt" < inv.date
  GROUP BY m."productId"
) st ON st.qty <> 0
JOIN "Product" p ON p.id=st."productId"
LEFT JOIN (VALUES ('PRD-005',-2,'2 boîtes manquantes'),('PRD-017',1,'1 unité non enregistrée'),('PRD-047',-3,'Casse non déclarée')) AS g(code,gap,note) ON g.code=p.code
WHERE inv."tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e' AND inv.reference='INV-2026-0001'
  AND NOT EXISTS (SELECT 1 FROM "InventoryItem" x WHERE x."inventoryId"=inv.id AND x."productId"=st."productId");

-- Écarts convertis en ajustements (comme validateInventory)
INSERT INTO "StockMovement" ("id","tenantId","productId","type","quantity","unitPrice","reference","notes","warehouseId","reason","sourceType","sourceId","createdAt")
SELECT gen_random_uuid()::text, inv."tenantId", it."productId", 'ADJUSTMENT', it.variance, NULL, inv.reference,
       'Inventaire ' || inv.reference, inv."warehouseId", 'INVENTORY', 'INVENTORY', inv.id, inv."validatedAt"
FROM "Inventory" inv JOIN "InventoryItem" it ON it."inventoryId"=inv.id
WHERE inv."tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e' AND inv.reference='INV-2026-0001' AND inv.status='VALIDATED'
  AND it.counted AND it.variance <> 0
  AND NOT EXISTS (SELECT 1 FROM "StockMovement" e WHERE e."tenantId"=inv."tenantId" AND e."sourceType"='INVENTORY' AND e."sourceId"=inv.id AND e."productId"=it."productId");

-- ─── 9) Inventaire en cours INV-2026-0002 (Sfax, 09/10/2026) ───────────────
INSERT INTO "Inventory" ("id","tenantId","warehouseId","reference","date","status","scope","notes","createdAt","updatedAt")
SELECT gen_random_uuid()::text, w."tenantId", w.id, 'INV-2026-0002', '2026-10-09 08:00', 'IN_PROGRESS', 'FULL',
       'Inventaire tournant — magasin de Sfax', '2026-10-09 08:00', '2026-10-09 11:00'
FROM "Warehouse" w WHERE w."tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e' AND w.code='DEP-SFX'
ON CONFLICT ("tenantId","reference") DO NOTHING;

-- Lignes : théorique figé ; 6 lignes comptées (3 avec écart), le reste non compté (actual = théorique)
INSERT INTO "InventoryItem" ("id","inventoryId","warehouseId","productId","expectedQty","actualQty","unitCost","variance","counted","notes")
SELECT gen_random_uuid()::text, inv.id, inv."warehouseId", st."productId", st.qty,
       st.qty + COALESCE(c.gap,0),
       CASE WHEN p."averageCost" > 0 THEN p."averageCost" ELSE p."purchasePrice" END,
       COALESCE(c.gap,0), c.code IS NOT NULL, c.note
FROM "Inventory" inv
JOIN LATERAL (
  SELECT m."productId", SUM(CASE m."type" WHEN 'ENTRY' THEN ABS(m.quantity) WHEN 'EXIT' THEN -ABS(m.quantity) ELSE m.quantity END) AS qty
  FROM "StockMovement" m
  WHERE m."tenantId"=inv."tenantId" AND m."warehouseId"=inv."warehouseId" AND m."createdAt" < inv.date
  GROUP BY m."productId"
) st ON st.qty <> 0
JOIN "Product" p ON p.id=st."productId"
LEFT JOIN (VALUES ('PRD-001',0,NULL),('PRD-004',0,NULL),('PRD-010',0,NULL),
                  ('PRD-002',-1,'1 unité introuvable'),('SKU-001',-4,'4 ramettes abîmées (humidité)'),('PRD-035',2,'2 boîtes en réserve non saisies')) AS c(code,gap,note)
  ON c.code=p.code
WHERE inv."tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e' AND inv.reference='INV-2026-0002'
  AND NOT EXISTS (SELECT 1 FROM "InventoryItem" x WHERE x."inventoryId"=inv.id AND x."productId"=st."productId");

-- ─── 10) Recalcul : stock par dépôt, stock produit ─────────────────────────
INSERT INTO "ProductWarehouse" ("productId","warehouseId","stock","createdAt","updatedAt")
SELECT m."productId", m."warehouseId",
       SUM(CASE m."type" WHEN 'ENTRY' THEN ABS(m.quantity) WHEN 'EXIT' THEN -ABS(m.quantity) ELSE m.quantity END), now(), now()
FROM "StockMovement" m
WHERE m."tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e' AND m."warehouseId" IS NOT NULL
GROUP BY m."productId", m."warehouseId"
ON CONFLICT ("productId","warehouseId") DO UPDATE SET "stock"=EXCLUDED."stock", "updatedAt"=now()
  WHERE "ProductWarehouse"."stock" IS DISTINCT FROM EXCLUDED."stock";

UPDATE "Product" p
SET "currentStock" = COALESCE((SELECT SUM(pw.stock) FROM "ProductWarehouse" pw WHERE pw."productId"=p.id),0), "updatedAt"=now()
WHERE p."tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e';

-- ─── 11) Solde après mouvement (par dépôt) ─────────────────────────────────
UPDATE "StockMovement" m SET "balanceAfter" = r.bal
FROM (
  SELECT id, SUM(CASE "type" WHEN 'ENTRY' THEN ABS(quantity) WHEN 'EXIT' THEN -ABS(quantity) ELSE quantity END)
           OVER (PARTITION BY "productId","warehouseId" ORDER BY "createdAt", SIGN(CASE "type" WHEN 'EXIT' THEN -1 ELSE quantity END), id
                 ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS bal
  FROM "StockMovement" WHERE "tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e' AND "warehouseId" IS NOT NULL
) r
WHERE m.id=r.id AND m."balanceAfter" IS DISTINCT FROM r.bal;

-- ─── 12) CMUP rejoué chronologiquement (computeCmup) → costAfter, Product.averageCost ──
DO $$
DECLARE
  prod RECORD; mv RECORD;
  q NUMERIC; avg NUMERIC; d NUMERIC;
BEGIN
  FOR prod IN SELECT id, "purchasePrice" FROM "Product" WHERE "tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e' LOOP
    q := 0; avg := prod."purchasePrice";
    FOR mv IN SELECT id, "type", quantity, "unitPrice" FROM "StockMovement"
              WHERE "productId"=prod.id AND "tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e'
              ORDER BY "createdAt", SIGN(CASE "type" WHEN 'EXIT' THEN -1 ELSE quantity END), id LOOP
      d := CASE mv."type" WHEN 'ENTRY' THEN ABS(mv.quantity) WHEN 'EXIT' THEN -ABS(mv.quantity) ELSE mv.quantity END;
      IF mv."type"='ENTRY' AND mv."unitPrice" IS NOT NULL AND mv."unitPrice" >= 0 AND d > 0 THEN
        IF q <= 0 THEN avg := ROUND(mv."unitPrice", 6);
        ELSE avg := ROUND((q*avg + d*mv."unitPrice") / (q + d), 6);
        END IF;
      END IF;
      q := q + d;
      UPDATE "StockMovement" SET "costAfter" = ROUND(avg, 6) WHERE id = mv.id AND "costAfter" IS DISTINCT FROM ROUND(avg, 6);
    END LOOP;
    IF avg > 0 THEN
      UPDATE "Product" SET "averageCost" = ROUND(avg, 6) WHERE id = prod.id AND "averageCost" IS DISTINCT FROM ROUND(avg, 6);
    END IF;
  END LOOP;
END $$;

-- ─── 13) Seuils : 5 produits volontairement sous le point de commande ──────
UPDATE "Product" p
SET "reorderPoint" = GREATEST(p."minStock", p."currentStock" + t.margin), "reorderQty" = t.rq, "updatedAt"=now()
FROM (VALUES ('PRD-031',5,40),('PRD-033',5,30),('PRD-040',5,50),('PRD-049',4,25),('SKU-003',10,100)) AS t(code, margin, rq)
WHERE p."tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e' AND p.code=t.code;

-- Les autres produits passent au-dessus de leur seuil (seuil abaissé seulement si nécessaire)
UPDATE "Product" p
SET "minStock" = FLOOR(p."currentStock" / 2), "reorderPoint" = 0, "updatedAt"=now()
WHERE p."tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e'
  AND p.code NOT IN ('PRD-031','PRD-033','PRD-040','PRD-049','SKU-003')
  AND p."currentStock" <= GREATEST(p."minStock", p."reorderPoint");

COMMIT;

-- ─── Vérification ──────────────────────────────────────────────────────────
-- SELECT … (voir rapport) : comptes, currentStock = Σ ProductWarehouse.stock, aucun stock négatif.
