-- =============================================================================
-- BELLO SUITE — Module Commercial Complet
-- Exécute en UN SEUL BLOC sur : 
-- https://supabase.com/dashboard/project/guhwnihenpqoxcugtkyr/sql/new
-- =============================================================================

-- ============ ENUMS ===========================================================
CREATE TYPE "TTNStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'CANCELLED');
CREATE TYPE "DocumentType" AS ENUM ('INVOICE', 'INVOICE_SERVICE', 'INVOICE_HONORARY', 'CREDIT_NOTE', 'QUOTE', 'ORDER', 'DELIVERY_NOTE', 'PURCHASE_ORDER', 'SUPPLIER_INVOICE', 'EXPORT_INVOICE');
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'PENDING', 'CONFIRMED', 'SENT', 'PAID', 'CANCELLED');
CREATE TYPE "PaymentFollowStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL', 'OVERDUE');
CREATE TYPE "ReminderMethod" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP');
CREATE TYPE "ReminderStatus" AS ENUM ('pending', 'sent', 'delivered', 'failed');
CREATE TYPE "ReconciliationStatus" AS ENUM ('UNMATCHED', 'MATCHED', 'DISPUTED');

-- ============ COLONNES INVOICE ================================================
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "ttnStatus" TEXT DEFAULT 'DRAFT';
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "ttnReference" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "ttnQRCode" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "ttnSubmittedAt" TIMESTAMPTZ(3);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "ttnAcceptedAt" TIMESTAMPTZ(3);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "ttnErrorCode" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "ttnErrorMessage" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "rsAmount" NUMERIC(15,3) DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "irppAmount" NUMERIC(15,3) DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'TND';
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "exchangeRate" NUMERIC(15,6) DEFAULT 1.000000;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "totalInCurrency" NUMERIC(15,3);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "convertedFromId" UUID REFERENCES "Invoice"("id");
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "convertedAt" TIMESTAMPTZ(3);
CREATE INDEX IF NOT EXISTS "Invoice_ttnStatus_idx" ON "Invoice"("ttnStatus");
CREATE INDEX IF NOT EXISTS "Invoice_conversion_idx" ON "Invoice"("convertedFromId");

-- ============ NOUVELLES TABLES ================================================
CREATE TABLE "ASPConfiguration" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID UNIQUE NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
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

CREATE TABLE "ExchangeRate" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "baseCurrency" TEXT NOT NULL DEFAULT 'EUR',
  "targetCurrency" TEXT NOT NULL DEFAULT 'TND',
  "rate" NUMERIC(15,6) NOT NULL,
  "fetchedFrom" TEXT,
  "fetchedAt" TIMESTAMPTZ(3) DEFAULT NOW(),
  UNIQUE("tenantId", "baseCurrency", "targetCurrency")
);

CREATE TABLE "PaymentFollowUp" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "invoiceId" UUID NOT NULL REFERENCES "Invoice"("id") ON DELETE CASCADE,
  "totalTTC" NUMERIC(15,3) NOT NULL,
  "paidTTC" NUMERIC(15,3) DEFAULT 0,
  "status" "PaymentFollowStatus" DEFAULT 'PENDING',
  "nextFollowUp" DATE,
  "createdAt" TIMESTAMPTZ(3) DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ(3) DEFAULT NOW()
);

CREATE TABLE "PaymentReminder" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "followUpId" UUID REFERENCES "PaymentFollowUp"("id") ON DELETE SET NULL,
  "invoiceId" UUID REFERENCES "Invoice"("id") ON DELETE SET NULL,
  "method" "ReminderMethod" NOT NULL,
  "recipientEmail" TEXT,
  "recipientPhone" TEXT,
  "scheduledFor" TIMESTAMPTZ(3),
  "sentAt" TIMESTAMPTZ(3),
  "status" "ReminderStatus" DEFAULT 'pending',
  "errorMessage" TEXT,
  "createdAt" TIMESTAMPTZ(3) DEFAULT NOW()
);

CREATE TABLE "ExportInvoice" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "invoiceId" UUID REFERENCES "Invoice"("id") ON DELETE SET NULL,
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

CREATE TABLE "BankAccount" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "accountNumber" VARCHAR(50) NOT NULL,
  "rib" TEXT,
  "bankName" TEXT NOT NULL,
  "agency" TEXT,
  "currency" TEXT DEFAULT 'TND',
  "openingBalance" NUMERIC(15,3) DEFAULT 0,
  "isActive" BOOLEAN DEFAULT true,
  UNIQUE("tenantId", "accountNumber")
);

CREATE TABLE "BankStatement" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bankAccountId" UUID NOT NULL REFERENCES "BankAccount"("id") ON DELETE CASCADE,
  "periodStart" DATE NOT NULL,
  "periodEnd" DATE NOT NULL,
  "openingBalance" NUMERIC(15,3) DEFAULT 0,
  "closingBalance" NUMERIC(15,3) DEFAULT 0,
  "fileName" TEXT,
  "importedAt" TIMESTAMPTZ(3) DEFAULT NOW()
);

CREATE TABLE "BankStatementLine" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "statementId" UUID NOT NULL REFERENCES "BankStatement"("id") ON DELETE CASCADE,
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

CREATE TABLE "BankReconciliation" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "statementLineId" UUID NOT NULL REFERENCES "BankStatementLine"("id") ON DELETE CASCADE,
  "journalEntryLineId" UUID NOT NULL REFERENCES "JournalEntryLine"("id") ON DELETE CASCADE,
  "amount" NUMERIC(15,3) NOT NULL,
  "status" "ReconciliationStatus" DEFAULT 'MATCHED',
  "createdAt" TIMESTAMPTZ(3) DEFAULT NOW(),
  UNIQUE("statementLineId", "journalEntryLineId")
);

-- =============================================================================
