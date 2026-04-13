-- ============================================================
-- BELLO SUITE — Migration FINAL CLEAN
-- Basé sur l'état RÉEL de la DB Supabase
-- Toutes les clés = TEXT (pas UUID)
-- ============================================================

-- 1. ENUMS MANQUANTS
DO $$ BEGIN CREATE TYPE "ReminderMethod" AS ENUM ('EMAIL','SMS','WHATSAPP'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReminderStatus" AS ENUM ('PENDING','SENT','DELIVERED','FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReconciliationStatus" AS ENUM ('UNMATCHED','MATCHED','DISPUTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PaymentFollowStatus" AS ENUM ('PENDING','IN_PROGRESS','COMPLETED','PARTIAL','OVERDUE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. AJOUTER VALEURS À DocumentType (Postgres 14+)
DO $$ BEGIN ALTER TYPE "DocumentType" ADD VALUE AFTER 'CREDIT_NOTE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- PostgreSQL < 14: impossible via SQL. Via dashboard Supabase: Storage > SQL Editor > exécuter manuellement

-- 3. COLONNES MANQUANTES SUR INVOICE (type TEXT pour FK!)
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'TND';
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "ttnStatus" TEXT DEFAULT 'DRAFT';
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "convertedFromId" TEXT;  -- clé TEXT, pas UUID!
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "convertedAt" TIMESTAMPTZ;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "rsAmount" NUMERIC(15,3) DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "irppAmount" NUMERIC(15,3) DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "exchangeRate" NUMERIC(15,6) DEFAULT 1;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "totalInCurrency" NUMERIC(15,3);
-- Note: les colonnes TTN (ttnReference, ttnQRCode, etc.) existent déjà

-- 4. TABLES NOUVELLES

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
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("tenantId")
);

-- ExchangeRate
CREATE TABLE IF NOT EXISTS "ExchangeRate" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT,
  "baseCurrency" TEXT NOT NULL DEFAULT 'EUR',
  "targetCurrency" TEXT NOT NULL DEFAULT 'TND',
  "rate" NUMERIC(15,6) NOT NULL,
  "fetchedFrom" TEXT,
  "fetchedAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("tenantId","baseCurrency","targetCurrency")
);

-- PaymentFollowUp
CREATE TABLE IF NOT EXISTS "PaymentFollowUp" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "totalTTC" NUMERIC(15,3) NOT NULL DEFAULT 0,
  "paidTTC" NUMERIC(15,3) DEFAULT 0,
  "status" "PaymentFollowStatus" DEFAULT 'PENDING',
  "nextFollowUp" DATE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
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
  "scheduledFor" TIMESTAMPTZ,
  "sentAt" TIMESTAMPTZ,
  "status" "ReminderStatus" DEFAULT 'PENDING',
  "errorMessage" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ExportInvoice
CREATE TABLE IF NOT EXISTS "ExportInvoice" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" TEXT NOT NULL,
  "invoiceId" TEXT,
  "invoiceNumber" VARCHAR(50) NOT NULL,
  "countryOfDestination" TEXT NOT NULL DEFAULT 'TN',
  "exportNetAmount" NUMERIC(15,3) NOT NULL DEFAULT 0,
  "exportCurrency" TEXT DEFAULT 'USD',
  "incoterm" TEXT DEFAULT 'CIP',
  "portOfEntry" TEXT,
  "customsCode" TEXT,
  "documentTypes" TEXT[] DEFAULT '{}',
  "status" TEXT DEFAULT 'DRAFT',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
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
  UNIQUE("tenantId","accountNumber")
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
  "importedAt" TIMESTAMPTZ DEFAULT NOW()
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
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("statementLineId","journalEntryLineId")
);

-- 5. FOREIGN KEYS
DO $$ BEGIN
  ALTER TABLE "ASPConfiguration" ADD CONSTRAINT "ASPConfiguration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "PaymentFollowUp" ADD CONSTRAINT "PaymentFollowUp_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentFollowUp" ADD CONSTRAINT "PaymentFollowUp_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "PaymentReminder" ADD CONSTRAINT "PaymentReminder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentReminder" ADD CONSTRAINT "PaymentReminder_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "PaymentFollowUp"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentReminder" ADD CONSTRAINT "PaymentReminder_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ExportInvoice" ADD CONSTRAINT "ExportInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ExportInvoice" ADD CONSTRAINT "ExportInvoice_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "BankStatementLine" ADD CONSTRAINT "BankStatementLine_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "BankStatement"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "BankStatementLine" ADD CONSTRAINT "BankStatementLine_matchedEntryLineId_fkey" FOREIGN KEY ("matchedEntryLineId") REFERENCES "JournalEntryLine"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_statementLineId_fkey" FOREIGN KEY ("statementLineId") REFERENCES "BankStatementLine"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_journalEntryLineId_fkey" FOREIGN KEY ("journalEntryLineId") REFERENCES "JournalEntryLine"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- FK self sur Invoice (convertedFromId = TEXT)
DO $$ BEGIN
  ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_convertedFromId_fkey" FOREIGN KEY ("convertedFromId") REFERENCES "Invoice"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. INDEX
CREATE INDEX IF NOT EXISTS "Invoice_convertedFromId_idx" ON "Invoice"("convertedFromId");
CREATE INDEX IF NOT EXISTS "Invoice_ttnStatus_idx" ON "Invoice"("ttnStatus");
CREATE INDEX IF NOT EXISTS "Invoice_dueDate_idx" ON "Invoice"("dueDate");

SELECT '✅ Migration terminée avec succès' AS result;
