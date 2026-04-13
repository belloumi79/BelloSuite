-- Migration: Commercial Module Enhancement
-- Date: 2026-04-13
-- Description: Multi-currency, payment follow-up, bank reconciliation, export invoices, TTN fields

BEGIN;

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE "TTNStatus" AS ENUM ('DRAFT', 'PENDING', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'CANCELLED');
CREATE TYPE "TTNSubmissionMode" AS ENUM ('WEB', 'SFTP', 'API');
CREATE TYPE "DocumentType" AS ENUM ('INVOICE', 'INVOICE_SERVICE', 'INVOICE_HONORARY', 'QUOTE', 'ORDER', 'DELIVERY_NOTE', 'CREDIT_NOTE', 'PURCHASE_ORDER', 'SUPPLIER_INVOICE');
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'PENDING', 'CONFIRMED', 'SENT', 'PAID', 'CANCELLED', 'EXPIRED');
CREATE TYPE "PaymentFollowStatus" AS ENEnum ('OPEN', 'PARTIAL', 'PAID', 'WRITTEN_OFF');
CREATE TYPE "ReminderMethod" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP');
CREATE TYPE "ReconciliationStatus" AS ENUM ('UNMATCHED', 'MATCHED', 'DISPUTED');
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "BankTransactionType" AS ENUM ('CREDIT', 'DEBIT');
CREATE TYPE "StatementImportFormat" AS ENUM ('CSV', 'OFx', 'QIF', 'CAMT');

-- ============================================================
-- EXISTING ENUMS (skip if already exist in DB)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'USER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- NEW FIELDS ON EXISTING TABLES
-- ============================================================

-- Invoice: TTN + multi-currency + conversion
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "ttnStatus" "TTNStatus" DEFAULT 'DRAFT';
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "ttnReference" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "ttnQRCode" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "ttnSubmittedAt" TIMESTAMP;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "ttnAcceptedAt" TIMESTAMP;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "ttnErrorCode" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "ttnErrorMessage" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "aspReference" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "currency" VARCHAR(3) DEFAULT 'TND';
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "exchangeRate" DECIMAL(18,6) DEFAULT 1.000000;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "convertedFromId" UUID;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "rsAmount" DECIMAL(18,3) DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "irppAmount" DECIMAL(18,3) DEFAULT 0;

-- ============================================================
-- NEW TABLES
-- ============================================================

-- ASP Configuration (TTN credentials per tenant)
CREATE TABLE IF NOT EXISTS "ASPConfiguration" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL UNIQUE REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "aspProvider" VARCHAR(50) NOT NULL DEFAULT 'TTN',
  "aspProviderName" VARCHAR(100) DEFAULT 'TradeNet Tunisia',
  "submissionMode" "TTNSubmissionMode" DEFAULT 'WEB',
  "sftpHost" VARCHAR(255),
  "sftpPort" INTEGER DEFAULT 22,
  "sftpUsername" VARCHAR(100),
  "sftpPassword" VARCHAR(255),
  "sftpRemotePath" VARCHAR(255) DEFAULT '/',
  "certificatePath" VARCHAR(255),
  "certificatePassword" VARCHAR(255),
  "webhooksEnabled" BOOLEAN DEFAULT false,
  "webhookSecret" VARCHAR(255),
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT now(),
  "updatedAt" TIMESTAMP DEFAULT now()
);

-- Payment Follow-Up
CREATE TABLE IF NOT EXISTS "PaymentFollowUp" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "invoiceId" UUID NOT NULL UNIQUE REFERENCES "Invoice"("id") ON DELETE CASCADE,
  "dueDate" DATE,
  "invoiceAmount" DECIMAL(18,3) NOT NULL DEFAULT 0,
  "paidAmount" DECIMAL(18,3) NOT NULL DEFAULT 0,
  "remainingAmount" DECIMAL(18,3) NOT NULL DEFAULT 0,
  "status" "PaymentFollowStatus" DEFAULT 'OPEN',
  "escalationLevel" INTEGER DEFAULT 0,
  "lastReminderSentAt" TIMESTAMP,
  "nextReminderAt" TIMESTAMP,
  "totalRemindersSent" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP DEFAULT now(),
  "updatedAt" TIMESTAMP DEFAULT now()
);

-- Payment Reminder
CREATE TABLE IF NOT EXISTS "PaymentReminder" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "followUpId" UUID REFERENCES "PaymentFollowUp"("id") ON DELETE CASCADE,
  "invoiceId" UUID REFERENCES "Invoice"("id") ON DELETE CASCADE,
  "sequenceNumber" INTEGER NOT NULL,
  "method" "ReminderMethod" NOT NULL,
  "recipientEmail" VARCHAR(255),
  "recipientPhone" VARCHAR(20),
  "subject" VARCHAR(255),
  "body" TEXT,
  "status" VARCHAR(20) DEFAULT 'pending',
  "errorMessage" TEXT,
  "sentAt" TIMESTAMP DEFAULT now(),
  "createdAt" TIMESTAMP DEFAULT now()
);

-- Exchange Rates
CREATE TABLE IF NOT EXISTS "ExchangeRate" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "currency" VARCHAR(3) NOT NULL,
  "rate" DECIMAL(18,6) NOT NULL,
  "effectiveDate" DATE NOT NULL,
  "source" VARCHAR(50) DEFAULT 'MANUAL',
  "createdAt" TIMESTAMP DEFAULT now(),
  UNIQUE("tenantId", "currency", "effectiveDate")
);

-- Export Invoice (for international)
CREATE TABLE IF NOT EXISTS "ExportInvoice" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "invoiceId" UUID NOT NULL UNIQUE REFERENCES "Invoice"("id") ON DELETE CASCADE,
  "invoiceNumber" VARCHAR(50) NOT NULL,
  "exportType" VARCHAR(20) NOT NULL DEFAULT 'EXPORT',
  "incoterm" VARCHAR(3),
  "destinationCountry" VARCHAR(3) NOT NULL DEFAULT 'TN',
  " customsReference" VARCHAR(50),
  "netMass" DECIMAL(18,3),
  "grossMass" DECIMAL(18,3),
  "numberOfPackages" INTEGER,
  "originCertificate" VARCHAR(100),
  "createdAt" TIMESTAMP DEFAULT now(),
  "updatedAt" TIMESTAMP DEFAULT now()
);

-- Bank Accounts
CREATE TABLE IF NOT EXISTS "BankAccount" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "accountNumber" VARCHAR(50) NOT NULL,
  "accountName" VARCHAR(100) NOT NULL,
  "bankName" VARCHAR(100),
  "bankCode" VARCHAR(20),
  "agencyCode" VARCHAR(20),
  "iban" VARCHAR(34),
  "bicSwift" VARCHAR(11),
  "accountingAccountId" UUID REFERENCES "AccountingAccount"("id"),
  "currency" VARCHAR(3) DEFAULT 'TND',
  "isActive" BOOLEAN DEFAULT true,
  "isDefault" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT now(),
  "updatedAt" TIMESTAMP DEFAULT now(),
  UNIQUE("tenantId", "accountNumber")
);

-- Bank Statement
CREATE TABLE IF NOT EXISTS "BankStatement" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "bankAccountId" UUID NOT NULL REFERENCES "BankAccount"("id") ON DELETE CASCADE,
  "statementNumber" VARCHAR(50) NOT NULL,
  "statementDate" DATE NOT NULL,
  "openingBalance" DECIMAL(18,2) DEFAULT 0,
  "closingBalance" DECIMAL(18,2) DEFAULT 0,
  "currency" VARCHAR(3) DEFAULT 'TND',
  "importFormat" "StatementImportFormat",
  "originalFilename" VARCHAR(255),
  "fileHash" VARCHAR(64),
  "status" VARCHAR(20) DEFAULT 'IMPORTED',
  "importedAt" TIMESTAMP DEFAULT now(),
  "createdAt" TIMESTAMP DEFAULT now(),
  UNIQUE("tenantId", "bankAccountId", "statementDate")
);

-- Bank Statement Line
CREATE TABLE IF NOT EXISTS "BankStatementLine" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "statementId" UUID NOT NULL REFERENCES "BankStatement"("id") ON DELETE CASCADE,
  "lineNumber" INTEGER NOT NULL,
  "valueDate" DATE NOT NULL,
  "transactionDate" DATE,
  "transactionType" "BankTransactionType" NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" VARCHAR(3) DEFAULT 'TND',
  "description" VARCHAR(255),
  "reference" VARCHAR(50),
  "partnerName" VARCHAR(100),
  "partnerAccount" VARCHAR(50),
  "status" VARCHAR(20) DEFAULT 'UNMATCHED',
  "matchedEntryLineId" UUID,
  "matchedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT now()
);

-- Bank Reconciliation
CREATE TABLE IF NOT EXISTS "BankReconciliation" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "bankStatementId" UUID NOT NULL REFERENCES "BankStatement"("id") ON DELETE CASCADE,
  "bankAccountId" UUID NOT NULL REFERENCES "BankAccount"("id") ON DELETE CASCADE,
  "journalEntryLineId" UUID NOT NULL REFERENCES "JournalEntryLine"("id") ON DELETE CASCADE,
  "statementLineId" UUID NOT NULL REFERENCES "BankStatementLine"("id") ON DELETE CASCADE,
  "matchedAmount" DECIMAL(18,2) NOT NULL,
  "difference" DECIMAL(18,2) DEFAULT 0,
  "reconciliationDate" DATE NOT NULL,
  "status" "ReconciliationStatus" DEFAULT 'MATCHED',
  "notes" TEXT,
  "createdAt" TIMESTAMP DEFAULT now(),
  UNIQUE("statementLineId", "journalEntryLineId")
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS "Invoice_ttnStatus_idx" ON "Invoice"("tenantId", "ttnStatus");
CREATE INDEX IF NOT EXISTS "Invoice_dueDate_idx" ON "Invoice"("tenantId", "dueDate");
CREATE INDEX IF NOT EXISTS "PaymentFollowUp_status_idx" ON "PaymentFollowUp"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "BankReconciliation_status_idx" ON "BankReconciliation"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "BankStatementLine_status_idx" ON "BankStatementLine"("statementId", "status");

-- ============================================================
-- FOREIGN KEYS (self-reference Invoice)
-- ============================================================
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_convertedFromId_fkey"
  FOREIGN KEY ("convertedFromId") REFERENCES "Invoice"("id");

COMMIT;
