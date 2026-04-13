-- ============================================
-- Migration: add_withholding_tax (TEJ 2026)
-- ============================================
-- Adds WithholdingTax model + RS calculation for Tunisian e-invoicing
-- Compatible with: BelloSuite - Phase 1-4 TEJ Module

BEGIN;

-- ── New Enums ──────────────────────────────

CREATE TYPE "BeneficiaryType" AS ENUM ('INDIVIDU', 'SOCIETE');
CREATE TYPE "ServiceType" AS ENUM ('PRESTATION_SERVICE', 'HONORAIRES', 'LOYERS', 'DIVIDENDES', 'INTERETS', 'ROYALTIES', 'REMUNERATION', 'AUTRE');
CREATE TYPE "TEJStatus" AS ENUM ('DRAFT', 'EXPORTED', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'CANCELLED');
CREATE TYPE "PaymentMethodType" AS ENUM ('VIREMENT', 'CHEQUE', 'ESPECE');

-- ── WithholdingTax Table ───────────────────

CREATE TABLE "WithholdingTax" (
  "id"          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  "tenantId"    UUID          NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "invoiceId"   UUID          REFERENCES "Invoice"("id") ON DELETE SET NULL,

  -- Beneficiary
  "beneficiaryTin"     VARCHAR(20),
  "beneficiaryName"    VARCHAR(255) NOT NULL,
  "beneficiaryAddress" TEXT,
  "beneficiaryType"    "BeneficiaryType" DEFAULT 'INDIVIDU',

  -- Service
  "serviceType"        "ServiceType" DEFAULT 'PRESTATION_SERVICE',
  "serviceDescription" TEXT,

  -- Montants
  "grossAmount"  DECIMAL(18,3) DEFAULT 0,
  "rate"         DECIMAL(10,6) DEFAULT 0,
  "taxAmount"    DECIMAL(18,3) DEFAULT 0,
  "netAmount"    DECIMAL(18,3) DEFAULT 0,
  "teeJAmount"   DECIMAL(18,3) DEFAULT 0,

  -- Période
  "periodMonth"  INT NOT NULL,
  "periodYear"  INT NOT NULL,

  -- TEJ / El Fatoora
  "tejId"            VARCHAR(50),
  "tejXmlId"         VARCHAR(50),
  "tejReference"     VARCHAR(100),
  "tejStatus"        "TEJStatus" DEFAULT 'DRAFT',
  "exportedAt"       TIMESTAMPTZ,
  "submittedAt"      TIMESTAMPTZ,
  "acceptedAt"       TIMESTAMPTZ,
  "rejectedAt"       TIMESTAMPTZ,
  "rejectionReason"  TEXT,

  -- Paiement
  "paymentDate"      TIMESTAMPTZ,
  "paymentMethod"    "PaymentMethodType",
  "paymentReference" VARCHAR(100),

  -- Meta
  "notes"      TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT "WithholdingTax_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
);

-- Index
CREATE UNIQUE INDEX "WithholdingTax_tenantId_tejId_key"
  ON "WithholdingTax"("tenantId", "tejId")
  WHERE "tejId" IS NOT NULL;
CREATE INDEX "WithholdingTax_tenantId_periodYear_periodMonth_idx"
  ON "WithholdingTax"("tenantId", "periodYear", "periodMonth");
CREATE INDEX "WithholdingTax_tenantId_tejStatus_idx"
  ON "WithholdingTax"("tenantId", "tejStatus");
CREATE INDEX "WithholdingTax_tenantId_beneficiaryTin_idx"
  ON "WithholdingTax"("tenantId", "beneficiaryTin")
  WHERE "beneficiaryTin" IS NOT NULL;

-- ── Invoice rsAmount column (ensure exists) ──
ALTER TABLE "Invoice"
  ADD COLUMN IF NOT EXISTS "rsAmount" DECIMAL(18,3) DEFAULT 0;
ALTER TABLE "Invoice"
  ADD COLUMN IF NOT EXISTS "irppAmount" DECIMAL(18,3) DEFAULT 0;

COMMIT;
