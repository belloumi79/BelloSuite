-- ============================================================
-- BELLO SUITE — Migration CLEAN basée sur l'état réel de la DB
-- Exécute en UN SEUL BLOC sur :
-- https://supabase.com/dashboard/project/guhwnihenpqoxcugtkyr/sql/new
-- ============================================================

-- ============ ENUMS MANQUANTS ==================================
DO $$
BEGIN
  CREATE TYPE "TTNStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PaymentFollowStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL', 'OVERDUE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ReminderMethod" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ReconciliationStatus" AS ENUM ('UNMATCHED', 'MATCHED', 'DISPUTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Ajouter valeurs aux enums DocumentType (si supporté par la version Postgres)
DO $$
BEGIN
  ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS ('INVOICE_SERVICE');
  ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS ('INVOICE_HONORARY');
  ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS ('EXPORT_INVOICE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============ COLONNES INVOICE MANQUANTES =====================
-- (certaines existent déjà, ADD COLUMN IF NOT EXISTS est sans risque)
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'TND';
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "ttnStatus" TEXT DEFAULT 'DRAFT';

-- ============ TABLES MANQUANTES ===============================

-- ASPConfiguration
CREATE TABLE IF NOT EXISTS "ASPConfiguration" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "aspProvider" TEXT NOT NULL DEFAULT 'EL_FATOORA',
  "clientId" TEXT,
  "clientSecret" TEXT,
  "sftpHost" TEXT,
  "sftpUsername" TEXT,
  "sftpPassword" TEXT,
  "sftpPort" INTEGER DEFAULT 22,
  "webHookSecret" TEXT,
  "isActive" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ(3) DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ(3) DEFAULT NOW()
);

-- ExchangeRate
CREATE TABLE IF NOT EXISTS "ExchangeRate" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "baseCurrency" TEXT NOT NULL DEFAULT 'EUR',
  "targetCurrency" TEXT NOT NULL DEFAULT 'TND',
  "rate" NUMERIC(15,6) NOT NULL,
  "fetchedFrom" TEXT,
  "fetchedAt" TIMESTAMPTZ(3) DEFAULT NOW(),
  UNIQUE("tenantId", "baseCurrency", "targetCurrency")
);

-- PaymentFollowUp
CREATE TABLE IF NOT EXISTS "PaymentFollowUp" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "totalTTC" NUMERIC(15,3) NOT NULL,
  "paidTTC" NUMERIC(15,3) DEFAULT 0,
  "status" "PaymentFollowStatus" DEFAULT 'PENDING',
  "nextFollowUp" DATE,
  "createdAt" TIMESTAMPTZ(3) DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ(3) DEFAULT NOW()
);

-- PaymentReminder
CREATE TABLE IF NOT EXISTS "PaymentReminder" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "followUpId" UUID,
  "invoiceId" TEXT,
  "method" "ReminderMethod" NOT NULL,
  "recipientEmail" TEXT,
  "recipientPhone" TEXT,
  "scheduledFor" TIMESTAMPTZ(3),
  "sentAt" TIMESTAMPTZ(3),
  "status" "ReminderStatus" DEFAULT 'PENDING',
  "errorMessage" TEXT,
  "createdAt" TIMESTAMPTZ(3) DEFAULT NOW()
);

-- ExportInvoice
CREATE TABLE IF NOT EXISTS "ExportInvoice" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "invoiceId" TEXT,
  "invoiceNumber" VARCHAR(50) NOT NULL,
  "countryOfDestination" TEXT NOT NULL DEFAULT 'TN',
  "exportNetAmount" NUMERIC(15,3) NOT NULL,
  "exportCurrency" TEXT DEFAULT 'USD',
  "incoterm" TEXT DEFAULT 'CIP',
  "portOfEntry" TEXT,
  "customsCode" TEXT,
  "documentTypes" TEXT[] DEFAULT '{}',
  "status" TEXT DEFAULT 'DRAFT',
  "createdAt" TIMESTAMPTZ(3) DEFAULT NOW()
);

-- BankAccount
CREATE TABLE IF NOT EXISTS "BankAccount" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "accountNumber" VARCHAR(50) NOT NULL,
  "rib" TEXT,
  "bankName" TEXT NOT NULL,
  "agency" TEXT,
  "currency" TEXT DEFAULT 'TND',
  "openingBalance" NUMERIC(15,3) DEFAULT 0,
  "isActive" BOOLEAN DEFAULT true,
  UNIQUE("tenantId", "accountNumber")
);

-- BankStatement
CREATE TABLE IF NOT EXISTS "BankStatement" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bankAccountId" UUID NOT NULL,
  "periodStart" DATE NOT NULL,
  "periodEnd" DATE NOT NULL,
  "openingBalance" NUMERIC(15,3) DEFAULT 0,
  "closingBalance" NUMERIC(15,3) DEFAULT 0,
  "fileName" TEXT,
  "importedAt" TIMESTAMPTZ(3) DEFAULT NOW()
);

-- BankStatementLine
CREATE TABLE IF NOT EXISTS "BankStatementLine" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "statementId" UUID NOT NULL,
  "lineNumber" INTEGER,
  "transactionDate" DATE NOT NULL,
  "description" TEXT,
  "debit" NUMERIC(15,3) DEFAULT 0,
  "credit" NUMERIC(15,3) DEFAULT 0,
  "balance" NUMERIC(15,3),
  "reference" TEXT,
  "matchedEntryLineId" UUID UNIQUE,
  "matchedJournalEntryLine" JSONB,
  "status" TEXT DEFAULT 'UNMATCHED'
);

-- BankReconciliation
CREATE TABLE IF NOT EXISTS "BankReconciliation" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "statementLineId" UUID NOT NULL,
  "journalEntryLineId" UUID NOT NULL,
  "amount" NUMERIC(15,3) NOT NULL,
  "status" "ReconciliationStatus" DEFAULT 'MATCHED',
  "createdAt" TIMESTAMPTZ(3) DEFAULT NOW(),
  UNIQUE("statementLineId", "journalEntryLineId")
);

-- Index sur Invoice
CREATE INDEX IF NOT EXISTS "Invoice_ttnStatus_idx" ON "Invoice"("ttnStatus");
CREATE INDEX IF NOT EXISTS "Invoice_conversion_idx" ON "Invoice"("convertedFromId");

-- Résultat
SELECT '✅ Migration terminée avec succès' as result;
