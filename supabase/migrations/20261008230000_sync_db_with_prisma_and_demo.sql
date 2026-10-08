-- Appliqué le 8 oct. 2026 vers 00:30 via l'API Supabase (projet guhwnihenpqoxcugtkyr).
-- 1) Valeurs d'enum manquantes
ALTER TYPE "ReconciliationStatus" ADD VALUE IF NOT EXISTS 'OPEN';
ALTER TYPE "PaymentFollowStatus" ADD VALUE IF NOT EXISTS 'REMINDED';
ALTER TYPE "PaymentFollowStatus" ADD VALUE IF NOT EXISTS 'PAID';
ALTER TYPE "PaymentFollowStatus" ADD VALUE IF NOT EXISTS 'DISPUTED';
ALTER TYPE "PaymentFollowStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "TTNStatus" ADD VALUE IF NOT EXISTS 'SIGNED';
ALTER TYPE "TTNStatus" ADD VALUE IF NOT EXISTS 'TRANSMITTED';
-- 2) Invoice : status -> InvoiceStatus, type -> text, colonnes manquantes
BEGIN;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='InvoiceStatus') THEN
    CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT','PENDING','SUBMITTED','CONFIRMED','SENT','ACCEPTED','PAID','REJECTED','CANCELLED');
  END IF;
END $$;
ALTER TABLE "Invoice" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "Invoice" ALTER COLUMN status TYPE "InvoiceStatus" USING status::text::"InvoiceStatus";
ALTER TABLE "Invoice" ALTER COLUMN status SET DEFAULT 'DRAFT';
ALTER TABLE "Invoice" ALTER COLUMN status SET NOT NULL;
ALTER TABLE "Invoice" ALTER COLUMN type DROP DEFAULT;
ALTER TABLE "Invoice" ALTER COLUMN type TYPE text USING type::text;
ALTER TABLE "Invoice" ALTER COLUMN type SET DEFAULT 'INVOICE';
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "originalAmount" DECIMAL(65,30), ADD COLUMN IF NOT EXISTS "accountingEntryId" TEXT, ADD COLUMN IF NOT EXISTS "paymentEntryId" TEXT, ADD COLUMN IF NOT EXISTS "ttnPDFUrl" TEXT, ADD COLUMN IF NOT EXISTS "ttnXMLSignedUrl" TEXT, ADD COLUMN IF NOT EXISTS "aspProvider" TEXT, ADD COLUMN IF NOT EXISTS "aspReference" TEXT, ADD COLUMN IF NOT EXISTS "lastReminderSentAt" TIMESTAMP(3);
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "warehouseId" TEXT;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "accountingEntryId" TEXT;
ALTER TABLE "PaymentFollowUp" ADD COLUMN IF NOT EXISTS "nextReminderDate" TIMESTAMP(3);
ALTER TABLE "PaymentReminder" ADD COLUMN IF NOT EXISTS "response" TEXT;
COMMIT;
SELECT data_type, udt_name, column_default FROM information_schema.columns WHERE table_name='Invoice' AND column_name IN ('status','type');
-- 3) Alignement complet sur prisma/schema (tables, colonnes, index, clés étrangères, RLS)
BEGIN;
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'IMPORTED', 'FAILED');
CREATE TYPE "POSSessionStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "POSType" AS ENUM ('SALE', 'RETURN');
CREATE TYPE "POSOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PAID', 'CANCELLED');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'CHECK', 'BANK_TRANSFER', 'MIXED');
CREATE TYPE "BeneficiaryType" AS ENUM ('INDIVIDU', 'SOCIETE');
CREATE TYPE "ServiceType" AS ENUM ('PRESTATION_SERVICE', 'HONORAIRES', 'LOYERS', 'DIVIDENDES', 'INTERETS', 'ROYALTIES', 'REMUNERATION', 'AUTRE');
CREATE TYPE "TEJStatus" AS ENUM ('DRAFT', 'EXPORTED', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'CANCELLED');
CREATE TYPE "PaymentMethodType" AS ENUM ('VIREMENT', 'CHEQUE', 'ESPECE');
CREATE TYPE "Genre" AS ENUM ('MALE', 'FEMALE');
CREATE TYPE "EstadoCivil" AS ENUM ('CELIBATAIRE', 'MARIE', 'DIVORCE', 'VEUF');
CREATE TYPE "SituationFamiliale" AS ENUM ('CHEF_FAMILLE', 'NON_CHEF_FAMILLE');
CREATE TYPE "TypeContrat" AS ENUM ('CDI', 'CDD', 'STAGE', 'SAISONNIER', 'INTERIM');
CREATE TYPE "ModePaie" AS ENUM ('VIREMENT', 'CHEQUE', 'ESPECE');
CREATE TYPE "TypeAbsence" AS ENUM ('MALADIE', 'ACCIDENT_TRAVAIL', 'CONGE_PAYE', 'SANS_SOLDE', 'MATERNITE', 'PATERNITE', 'AUTRE');
CREATE TYPE "StatutAbsence" AS ENUM ('EN_ATTENTE', 'APPROUVE', 'REJETE');
CREATE TYPE "TypeSanction" AS ENUM ('RIEN', 'AVERTISSEMENT', 'RETENUE');
CREATE TYPE "TypeMutation" AS ENUM ('PROMOTION', 'MUTATION', 'RECLASSEMENT', 'MISE_AU_REPOS');
CREATE TYPE "TTNSubmissionMode" AS ENUM ('WEB', 'EDI');
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ON_HOLD', 'CANCELLED', 'COMPLETED');
CREATE TYPE "ProjectPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "ProjectRole" AS ENUM ('OWNER', 'MANAGER', 'MEMBER', 'VIEWER');
CREATE TYPE "InventoryStatus" AS ENUM ('DRAFT', 'VALIDATED', 'CANCELLED');
CREATE TYPE "TransferStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'TRANSFERRED', 'CANCELLED');
DO $$ DECLARE r record; BEGIN FOR r IN SELECT conrelid::regclass::text tbl, conname FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace AND (conrelid::regclass::text = ANY(ARRAY['"Invoice"','"PurchaseOrder"','"ExchangeRate"','"BankAccount"','"BankStatementLine"','"BankStatement"','"PaymentFollowUp"','"BankReconciliation"','"ExportInvoice"','"ASPConfiguration"','"PaymentReminder"']) OR confrelid::regclass::text = ANY(ARRAY['"Invoice"','"PurchaseOrder"','"ExchangeRate"','"BankAccount"','"BankStatementLine"','"BankStatement"','"PaymentFollowUp"','"BankReconciliation"','"ExportInvoice"','"ASPConfiguration"','"PaymentReminder"'])) LOOP EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname); END LOOP; END $$;
ALTER TABLE "BankAccount" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "BankAccount" ALTER COLUMN "id" TYPE TEXT USING "id"::text::TEXT;
ALTER TABLE "BankStatement" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "BankStatement" ALTER COLUMN "id" TYPE TEXT USING "id"::text::TEXT;
ALTER TABLE "BankStatement" ALTER COLUMN "bankAccountId" DROP DEFAULT;
ALTER TABLE "BankStatement" ALTER COLUMN "bankAccountId" TYPE TEXT USING "bankAccountId"::text::TEXT;
ALTER TABLE "BankStatementLine" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "BankStatementLine" ALTER COLUMN "id" TYPE TEXT USING "id"::text::TEXT;
ALTER TABLE "BankStatementLine" ALTER COLUMN "statementId" DROP DEFAULT;
ALTER TABLE "BankStatementLine" ALTER COLUMN "statementId" TYPE TEXT USING "statementId"::text::TEXT;
ALTER TABLE "BankStatementLine" ALTER COLUMN "matchedEntryLineId" DROP DEFAULT;
ALTER TABLE "BankStatementLine" ALTER COLUMN "matchedEntryLineId" TYPE TEXT USING "matchedEntryLineId"::text::TEXT;
ALTER TABLE "BankStatementLine" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "BankStatementLine" ALTER COLUMN "status" TYPE "ReconciliationStatus" USING "status"::text::"ReconciliationStatus";
ALTER TABLE "BankStatementLine" ALTER COLUMN "status" SET DEFAULT 'OPEN';
ALTER TABLE "BankReconciliation" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "BankReconciliation" ALTER COLUMN "id" TYPE TEXT USING "id"::text::TEXT;
ALTER TABLE "BankReconciliation" ALTER COLUMN "statementLineId" DROP DEFAULT;
ALTER TABLE "BankReconciliation" ALTER COLUMN "statementLineId" TYPE TEXT USING "statementLineId"::text::TEXT;
ALTER TABLE "BankReconciliation" ALTER COLUMN "journalEntryLineId" DROP DEFAULT;
ALTER TABLE "BankReconciliation" ALTER COLUMN "journalEntryLineId" TYPE TEXT USING "journalEntryLineId"::text::TEXT;
ALTER TABLE "Invoice" ALTER COLUMN "convertedFromId" DROP DEFAULT;
ALTER TABLE "Invoice" ALTER COLUMN "convertedFromId" TYPE TEXT USING "convertedFromId"::text::TEXT;
ALTER TABLE "PurchaseOrder" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "PurchaseOrder" ALTER COLUMN "type" TYPE TEXT USING "type"::text::TEXT;
ALTER TABLE "PurchaseOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PurchaseOrder" ALTER COLUMN "status" TYPE TEXT USING "status"::text::TEXT;
ALTER TABLE "PurchaseOrder" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "PaymentFollowUp" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "PaymentFollowUp" ALTER COLUMN "id" TYPE TEXT USING "id"::text::TEXT;
ALTER TABLE "PaymentReminder" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "PaymentReminder" ALTER COLUMN "id" TYPE TEXT USING "id"::text::TEXT;
ALTER TABLE "PaymentReminder" ALTER COLUMN "followUpId" DROP DEFAULT;
ALTER TABLE "PaymentReminder" ALTER COLUMN "followUpId" TYPE TEXT USING "followUpId"::text::TEXT;
ALTER TABLE "ASPConfiguration" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "ASPConfiguration" ALTER COLUMN "id" TYPE TEXT USING "id"::text::TEXT;
ALTER TABLE "ExchangeRate" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "ExchangeRate" ALTER COLUMN "id" TYPE TEXT USING "id"::text::TEXT;
ALTER TABLE "ExportInvoice" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "ExportInvoice" ALTER COLUMN "id" TYPE TEXT USING "id"::text::TEXT;
ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "label" TEXT NOT NULL;
ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "accountingAccountId" TEXT;
ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "BankStatement" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL;
ALTER TABLE "BankStatement" ADD COLUMN IF NOT EXISTS "statementDate" TIMESTAMP(3) NOT NULL;
ALTER TABLE "BankStatement" ADD COLUMN IF NOT EXISTS "startBalance" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "BankStatement" ADD COLUMN IF NOT EXISTS "endBalance" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "BankStatement" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'TND';
ALTER TABLE "BankStatement" ADD COLUMN IF NOT EXISTS "filename" TEXT;
ALTER TABLE "BankStatement" ADD COLUMN IF NOT EXISTS "importStatus" "ImportStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "BankStatement" ADD COLUMN IF NOT EXISTS "reconciledAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "BankStatement" ADD COLUMN IF NOT EXISTS "unreconciledAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "BankStatement" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "BankStatement" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "BankStatementLine" ADD COLUMN IF NOT EXISTS "lineDate" TIMESTAMP(3) NOT NULL;
ALTER TABLE "BankStatementLine" ADD COLUMN IF NOT EXISTS "label" TEXT NOT NULL;
ALTER TABLE "BankStatementLine" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "BankReconciliation" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL;
ALTER TABLE "BankReconciliation" ADD COLUMN IF NOT EXISTS "bankStatementId" TEXT NOT NULL;
ALTER TABLE "BankReconciliation" ADD COLUMN IF NOT EXISTS "bankAccountId" TEXT NOT NULL;
ALTER TABLE "BankReconciliation" ADD COLUMN IF NOT EXISTS "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "BankReconciliation" ADD COLUMN IF NOT EXISTS "matchedBy" TEXT;
ALTER TABLE "BankReconciliation" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "ASPConfiguration" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL;
ALTER TABLE "ASPConfiguration" ADD COLUMN IF NOT EXISTS "apiKey" TEXT NOT NULL;
ALTER TABLE "ASPConfiguration" ADD COLUMN IF NOT EXISTS "apiSecret" TEXT NOT NULL;
ALTER TABLE "ASPConfiguration" ADD COLUMN IF NOT EXISTS "mode" "TTNSubmissionMode" NOT NULL DEFAULT 'EDI';
ALTER TABLE "ASPConfiguration" ADD COLUMN IF NOT EXISTS "sftpEndpoint" TEXT;
ALTER TABLE "ASPConfiguration" ADD COLUMN IF NOT EXISTS "webhookSecret" TEXT;
ALTER TABLE "ExchangeRate" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL;
ALTER TABLE "ExchangeRate" ADD COLUMN IF NOT EXISTS "rateToTND" DECIMAL(65,30) NOT NULL;
ALTER TABLE "ExchangeRate" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "ExchangeRate" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ExchangeRate" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ExportInvoice" ADD COLUMN IF NOT EXISTS "countryDest" TEXT NOT NULL;
ALTER TABLE "ExportInvoice" ADD COLUMN IF NOT EXISTS "hsCode" TEXT;
ALTER TABLE "ExportInvoice" ADD COLUMN IF NOT EXISTS "netWeightKg" DECIMAL(65,30);
ALTER TABLE "ExportInvoice" ADD COLUMN IF NOT EXISTS "countryOrigin" TEXT NOT NULL DEFAULT 'TN';
ALTER TABLE "ExportInvoice" ADD COLUMN IF NOT EXISTS "exportRegime" TEXT;
ALTER TABLE "ExportInvoice" ADD COLUMN IF NOT EXISTS "customsPort" TEXT;
ALTER TABLE "ExportInvoice" ADD COLUMN IF NOT EXISTS "transportMode" TEXT;
ALTER TABLE "ExportInvoice" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "birthPlace" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "nationality" TEXT NOT NULL DEFAULT 'Tunisienne';
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "genre" "Genre" NOT NULL DEFAULT 'MALE';
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "etatCivil" "EstadoCivil" NOT NULL DEFAULT 'CELIBATAIRE';
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "enfantsCharge" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "situationFamiliale" "SituationFamiliale" NOT NULL DEFAULT 'NON_CHEF_FAMILLE';
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "departement" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "poste" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "qualificationId" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "typeContrat" "TypeContrat" NOT NULL DEFAULT 'CDI';
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "modePaie" "ModePaie" NOT NULL DEFAULT 'VIREMENT';
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "banque" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "compteBancaire" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "cnssNumber" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "cnrpsNumber" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "amoNumber" TEXT;
ALTER TABLE "PaySlip" ADD COLUMN IF NOT EXISTS "mois" INTEGER NOT NULL;
ALTER TABLE "PaySlip" ADD COLUMN IF NOT EXISTS "annee" INTEGER NOT NULL;
ALTER TABLE "PaySlip" ADD COLUMN IF NOT EXISTS "joursTravailles" INTEGER NOT NULL DEFAULT 26;
ALTER TABLE "PaySlip" ADD COLUMN IF NOT EXISTS "salaireBase" DECIMAL(65,30) NOT NULL;
ALTER TABLE "PaySlip" ADD COLUMN IF NOT EXISTS "heuresSupQte" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "PaySlip" ADD COLUMN IF NOT EXISTS "heuresSupMontant" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "PaySlip" ADD COLUMN IF NOT EXISTS "primeAnciennete" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "PaySlip" ADD COLUMN IF NOT EXISTS "primeTransport" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "PaySlip" ADD COLUMN IF NOT EXISTS "primePanier" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "PaySlip" ADD COLUMN IF NOT EXISTS "autresPrimes" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "PaySlip" ADD COLUMN IF NOT EXISTS "brutGlobal" DECIMAL(65,30) NOT NULL;
ALTER TABLE "PaySlip" ADD COLUMN IF NOT EXISTS "cnrpsSalaire" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "PaySlip" ADD COLUMN IF NOT EXISTS "cnssSalaire" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "PaySlip" ADD COLUMN IF NOT EXISTS "cnavisSalaire" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "PaySlip" ADD COLUMN IF NOT EXISTS "amoSalaire" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "PaySlip" ADD COLUMN IF NOT EXISTS "totalCotisations" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "PaySlip" ADD COLUMN IF NOT EXISTS "salaireImposable" DECIMAL(65,30) NOT NULL;
ALTER TABLE "PaySlip" ADD COLUMN IF NOT EXISTS "deductionChefFam" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "PaySlip" ADD COLUMN IF NOT EXISTS "deductionEnfants" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "PaySlip" ADD COLUMN IF NOT EXISTS "irpp" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "PaySlip" ADD COLUMN IF NOT EXISTS "deductionAbsences" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "PaySlip" ADD COLUMN IF NOT EXISTS "deductionRetards" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "PaySlip" ADD COLUMN IF NOT EXISTS "autresDeductions" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "PaySlip" ADD COLUMN IF NOT EXISTS "netAPayer" DECIMAL(65,30) NOT NULL;
ALTER TABLE "PaySlip" ADD COLUMN IF NOT EXISTS "statut" "PaymentStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "PaySlip" ADD COLUMN IF NOT EXISTS "pdfUrl" TEXT;
ALTER TABLE "PaySlip" ADD COLUMN IF NOT EXISTS "accountingEntryId" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "purchaseValue" DECIMAL(65,30) DEFAULT 0;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "salvageValue" DECIMAL(65,30) DEFAULT 0;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "usefulLife" INTEGER DEFAULT 5;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "amortizationMethod" TEXT DEFAULT 'LINEAR';
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "accumulatedAmortization" DECIMAL(65,30) NOT NULL DEFAULT 0;
CREATE TABLE "CashDrawer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashDrawer_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "POSSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "openingCash" DECIMAL(65,30) NOT NULL,
    "closingCash" DECIMAL(65,30),
    "status" "POSSessionStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "POSSession_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "POSOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "type" "POSType" NOT NULL DEFAULT 'SALE',
    "status" "POSOrderStatus" NOT NULL DEFAULT 'CONFIRMED',
    "clientId" TEXT,
    "clientName" TEXT,
    "subtotalHT" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalVAT" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "timbreFiscal" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "totalTTC" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "changeGiven" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "discountPercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "POSOrder_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "POSOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "productCode" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unitPriceHT" DECIMAL(65,30) NOT NULL,
    "vatRate" DECIMAL(65,30) NOT NULL DEFAULT 19,
    "vatAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "discount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalHT" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalTTC" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "POSOrderItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "POSPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "POSPayment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WithholdingTax" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "beneficiaryTin" TEXT,
    "beneficiaryName" TEXT NOT NULL,
    "beneficiaryAddress" TEXT,
    "beneficiaryType" "BeneficiaryType" NOT NULL DEFAULT 'INDIVIDU',
    "serviceType" "ServiceType" NOT NULL DEFAULT 'PRESTATION_SERVICE',
    "serviceDescription" TEXT,
    "grossAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "rate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "teeJAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "periodMonth" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "tejId" TEXT,
    "tejXmlId" TEXT,
    "tejReference" TEXT,
    "tejStatus" "TEJStatus" NOT NULL DEFAULT 'DRAFT',
    "exportedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "paymentDate" TIMESTAMP(3),
    "paymentMethod" "PaymentMethodType",
    "paymentReference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WithholdingTax_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Qualification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "coefficient" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "salaryMin" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "salaryMax" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Qualification_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Absence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "type" "TypeAbsence" NOT NULL,
    "joursCal" INTEGER NOT NULL,
    "joursOuvres" INTEGER NOT NULL,
    "justifie" BOOLEAN NOT NULL DEFAULT false,
    "pieceJointe" TEXT,
    "montantRetenu" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "statut" "StatutAbsence" NOT NULL DEFAULT 'EN_ATTENTE',
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Absence_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Delay" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "heureArrivee" TEXT NOT NULL,
    "heureNormale" TEXT NOT NULL DEFAULT '08:00',
    "minutesRetard" INTEGER NOT NULL DEFAULT 0,
    "justifie" BOOLEAN NOT NULL DEFAULT false,
    "motif" TEXT,
    "sanction" "TypeSanction" NOT NULL DEFAULT 'AVERTISSEMENT',
    "montantRetenu" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "statut" "StatutAbsence" NOT NULL DEFAULT 'EN_ATTENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delay_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Mutation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "TypeMutation" NOT NULL,
    "ancienPoste" TEXT,
    "nouveauPoste" TEXT,
    "ancienDept" TEXT,
    "nouveauDept" TEXT,
    "ancienSalaire" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "nouveauSalaire" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "dateEffet" TIMESTAMP(3) NOT NULL,
    "observations" TEXT,
    "statut" "StatutAbsence" NOT NULL DEFAULT 'EN_ATTENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mutation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PaieParameters" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "annee" INTEGER NOT NULL DEFAULT 2025,
    "irppTranche1Max" DECIMAL(65,30) NOT NULL DEFAULT 5000,
    "irppTranche2Max" DECIMAL(65,30) NOT NULL DEFAULT 10000,
    "irppTranche3Max" DECIMAL(65,30) NOT NULL DEFAULT 30000,
    "irppTranche4Max" DECIMAL(65,30) NOT NULL DEFAULT 50000,
    "irppTaux1" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "irppTaux2" DECIMAL(65,30) NOT NULL DEFAULT 26,
    "irppTaux3" DECIMAL(65,30) NOT NULL DEFAULT 32,
    "irppTaux4" DECIMAL(65,30) NOT NULL DEFAULT 36,
    "irppTaux5" DECIMAL(65,30) NOT NULL DEFAULT 40,
    "cnavsPatronal" DECIMAL(65,30) NOT NULL DEFAULT 6.5,
    "cnavsPlafond" DECIMAL(65,30) NOT NULL DEFAULT 10000,
    "amoPatronal" DECIMAL(65,30) NOT NULL DEFAULT 2.5,
    "tfpPatronal" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "fppsPatronal" DECIMAL(65,30) NOT NULL DEFAULT 0.4,
    "cnrpsSalarial" DECIMAL(65,30) NOT NULL DEFAULT 4.75,
    "cnssSalarial" DECIMAL(65,30) NOT NULL DEFAULT 1.5,
    "cnavsSalarial" DECIMAL(65,30) NOT NULL DEFAULT 3.5,
    "amoSalarial" DECIMAL(65,30) NOT NULL DEFAULT 0.75,
    "cnrpsPlafond" DECIMAL(65,30) NOT NULL DEFAULT 10000,
    "cnssPlafond" DECIMAL(65,30) NOT NULL DEFAULT 10000,
    "cnavsPlafondSal" DECIMAL(65,30) NOT NULL DEFAULT 10000,
    "deductionChefFamille" DECIMAL(65,30) NOT NULL DEFAULT 150,
    "deductionParEnfant" DECIMAL(65,30) NOT NULL DEFAULT 40,
    "enfantsMaxDeductible" INTEGER NOT NULL DEFAULT 6,
    "smigMensuel" DECIMAL(65,30) NOT NULL DEFAULT 469.4,
    "heuresSup25" DECIMAL(65,30) NOT NULL DEFAULT 25,
    "heuresSup50" DECIMAL(65,30) NOT NULL DEFAULT 50,
    "heuresSup75" DECIMAL(65,30) NOT NULL DEFAULT 75,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaieParameters_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "ProjectPriority" NOT NULL DEFAULT 'MEDIUM',
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "budget" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "managerId" TEXT,
    "clientId" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProjectColumn" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectColumn_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProjectTask" (
    "id" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "priority" "ProjectPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "estimatedHours" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "spentHours" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "assigneeId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTask_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProjectChecklist" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectChecklist_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProjectChecklistItem" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isChecked" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectChecklistItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProjectAttachment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 0,
    "mimeType" TEXT,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectAttachment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProjectComment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectComment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProjectTag" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectTag_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProjectTaskTag" (
    "taskId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ProjectTaskTag_pkey" PRIMARY KEY ("taskId","tagId")
);
CREATE TABLE "ProjectMember" (
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ProjectRole" NOT NULL DEFAULT 'MEMBER',
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("projectId","userId")
);
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProductWarehouse" (
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "stock" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductWarehouse_pkey" PRIMARY KEY ("productId","warehouseId")
);
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "reference" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "InventoryStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "productId" TEXT NOT NULL,
    "expectedQty" DECIMAL(65,30) NOT NULL,
    "actualQty" DECIMAL(65,30) NOT NULL,
    "unitCost" DECIMAL(65,30),
    "variance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "StockTransfer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "fromWarehouseId" TEXT NOT NULL,
    "toWarehouseId" TEXT NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockTransfer_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "StockTransferItem" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "StockTransferItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "_ProjectToProjectTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS "BankStatement_tenantId_bankAccountId_idx" ON "BankStatement"("tenantId", "bankAccountId");
CREATE UNIQUE INDEX IF NOT EXISTS "BankStatement_tenantId_bankAccountId_statementDate_key" ON "BankStatement"("tenantId", "bankAccountId", "statementDate");
CREATE INDEX IF NOT EXISTS "BankStatementLine_statementId_status_idx" ON "BankStatementLine"("statementId", "status");
CREATE INDEX IF NOT EXISTS "BankReconciliation_tenantId_status_idx" ON "BankReconciliation"("tenantId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "CashDrawer_tenantId_key" ON "CashDrawer"("tenantId");
CREATE INDEX IF NOT EXISTS "POSOrder_tenantId_sessionId_idx" ON "POSOrder"("tenantId", "sessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "POSOrder_tenantId_orderNumber_key" ON "POSOrder"("tenantId", "orderNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentFollowUp_invoiceId_key" ON "PaymentFollowUp"("invoiceId");
CREATE UNIQUE INDEX IF NOT EXISTS "ExchangeRate_tenantId_key" ON "ExchangeRate"("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "ExchangeRate_tenantId_currency_key" ON "ExchangeRate"("tenantId", "currency");
CREATE UNIQUE INDEX IF NOT EXISTS "ExportInvoice_invoiceId_key" ON "ExportInvoice"("invoiceId");
CREATE INDEX IF NOT EXISTS "WithholdingTax_tenantId_periodYear_periodMonth_idx" ON "WithholdingTax"("tenantId", "periodYear", "periodMonth");
CREATE INDEX IF NOT EXISTS "WithholdingTax_tenantId_tejStatus_idx" ON "WithholdingTax"("tenantId", "tejStatus");
CREATE INDEX IF NOT EXISTS "WithholdingTax_tenantId_beneficiaryTin_idx" ON "WithholdingTax"("tenantId", "beneficiaryTin");
CREATE UNIQUE INDEX IF NOT EXISTS "WithholdingTax_tenantId_tejId_key" ON "WithholdingTax"("tenantId", "tejId");
CREATE UNIQUE INDEX IF NOT EXISTS "Qualification_tenantId_code_key" ON "Qualification"("tenantId", "code");
CREATE INDEX IF NOT EXISTS "Employee_tenantId_isActive_idx" ON "Employee"("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS "Absence_tenantId_employeeId_idx" ON "Absence"("tenantId", "employeeId");
CREATE INDEX IF NOT EXISTS "Absence_tenantId_statut_idx" ON "Absence"("tenantId", "statut");
CREATE INDEX IF NOT EXISTS "Delay_tenantId_employeeId_idx" ON "Delay"("tenantId", "employeeId");
CREATE INDEX IF NOT EXISTS "Delay_tenantId_statut_idx" ON "Delay"("tenantId", "statut");
CREATE INDEX IF NOT EXISTS "Mutation_tenantId_employeeId_idx" ON "Mutation"("tenantId", "employeeId");
CREATE UNIQUE INDEX IF NOT EXISTS "PaieParameters_tenantId_key" ON "PaieParameters"("tenantId");
CREATE INDEX IF NOT EXISTS "PaySlip_tenantId_employeeId_idx" ON "PaySlip"("tenantId", "employeeId");
CREATE INDEX IF NOT EXISTS "PaySlip_tenantId_annee_mois_statut_idx" ON "PaySlip"("tenantId", "annee", "mois", "statut");
CREATE INDEX IF NOT EXISTS "PaySlip_tenantId_annee_mois_idx" ON "PaySlip"("tenantId", "annee", "mois");
CREATE INDEX IF NOT EXISTS "QualityControl_tenantId_status_idx" ON "QualityControl"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "Project_tenantId_status_idx" ON "Project"("tenantId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "Project_tenantId_name_key" ON "Project"("tenantId", "name");
CREATE INDEX IF NOT EXISTS "ProjectColumn_projectId_idx" ON "ProjectColumn"("projectId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectColumn_projectId_position_key" ON "ProjectColumn"("projectId", "position");
CREATE INDEX IF NOT EXISTS "ProjectTask_columnId_position_idx" ON "ProjectTask"("columnId", "position");
CREATE INDEX IF NOT EXISTS "ProjectTask_columnId_assigneeId_idx" ON "ProjectTask"("columnId", "assigneeId");
CREATE INDEX IF NOT EXISTS "ProjectChecklist_taskId_idx" ON "ProjectChecklist"("taskId");
CREATE INDEX IF NOT EXISTS "ProjectChecklistItem_checklistId_idx" ON "ProjectChecklistItem"("checklistId");
CREATE INDEX IF NOT EXISTS "ProjectAttachment_taskId_idx" ON "ProjectAttachment"("taskId");
CREATE INDEX IF NOT EXISTS "ProjectComment_taskId_idx" ON "ProjectComment"("taskId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectTag_tenantId_name_key" ON "ProjectTag"("tenantId", "name");
CREATE INDEX IF NOT EXISTS "ProjectTaskTag_tagId_idx" ON "ProjectTaskTag"("tagId");
CREATE UNIQUE INDEX IF NOT EXISTS "Warehouse_tenantId_code_key" ON "Warehouse"("tenantId", "code");
CREATE INDEX IF NOT EXISTS "ProductWarehouse_productId_idx" ON "ProductWarehouse"("productId");
CREATE INDEX IF NOT EXISTS "ProductWarehouse_warehouseId_idx" ON "ProductWarehouse"("warehouseId");
CREATE INDEX IF NOT EXISTS "Inventory_tenantId_warehouseId_status_idx" ON "Inventory"("tenantId", "warehouseId", "status");
CREATE INDEX IF NOT EXISTS "Inventory_tenantId_date_idx" ON "Inventory"("tenantId", "date");
CREATE UNIQUE INDEX IF NOT EXISTS "Inventory_tenantId_reference_key" ON "Inventory"("tenantId", "reference");
CREATE INDEX IF NOT EXISTS "StockTransfer_tenantId_status_idx" ON "StockTransfer"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "StockTransfer_tenantId_date_idx" ON "StockTransfer"("tenantId", "date");
CREATE UNIQUE INDEX IF NOT EXISTS "StockTransfer_tenantId_reference_key" ON "StockTransfer"("tenantId", "reference");
CREATE UNIQUE INDEX IF NOT EXISTS "_ProjectToProjectTag_AB_unique" ON "_ProjectToProjectTag"("A", "B");
CREATE INDEX IF NOT EXISTS "_ProjectToProjectTag_B_index" ON "_ProjectToProjectTag"("B");
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='AccountingAccount_tenantId_fkey') THEN BEGIN ALTER TABLE "AccountingAccount" ADD CONSTRAINT "AccountingAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip AccountingAccount_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='AccountingAccount_parentId_fkey') THEN BEGIN ALTER TABLE "AccountingAccount" ADD CONSTRAINT "AccountingAccount_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AccountingAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip AccountingAccount_parentId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='AccountingPeriod_tenantId_fkey') THEN BEGIN ALTER TABLE "AccountingPeriod" ADD CONSTRAINT "AccountingPeriod_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip AccountingPeriod_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='AccountingJournal_tenantId_fkey') THEN BEGIN ALTER TABLE "AccountingJournal" ADD CONSTRAINT "AccountingJournal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip AccountingJournal_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='JournalEntry_tenantId_fkey') THEN BEGIN ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip JournalEntry_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='JournalEntry_journalId_fkey') THEN BEGIN ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "AccountingJournal"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip JournalEntry_journalId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='JournalEntry_periodId_fkey') THEN BEGIN ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AccountingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip JournalEntry_periodId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='JournalEntryLine_journalEntryId_fkey') THEN BEGIN ALTER TABLE "JournalEntryLine" ADD CONSTRAINT "JournalEntryLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip JournalEntryLine_journalEntryId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='JournalEntryLine_accountId_fkey') THEN BEGIN ALTER TABLE "JournalEntryLine" ADD CONSTRAINT "JournalEntryLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "AccountingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip JournalEntryLine_accountId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='CostCenter_tenantId_fkey') THEN BEGIN ALTER TABLE "CostCenter" ADD CONSTRAINT "CostCenter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip CostCenter_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='CostEntry_tenantId_fkey') THEN BEGIN ALTER TABLE "CostEntry" ADD CONSTRAINT "CostEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip CostEntry_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='CostEntry_costCenterId_fkey') THEN BEGIN ALTER TABLE "CostEntry" ADD CONSTRAINT "CostEntry_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip CostEntry_costCenterId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='BankAccount_tenantId_fkey') THEN BEGIN ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip BankAccount_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='BankAccount_accountingAccountId_fkey') THEN BEGIN ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_accountingAccountId_fkey" FOREIGN KEY ("accountingAccountId") REFERENCES "AccountingAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip BankAccount_accountingAccountId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='BankStatement_tenantId_fkey') THEN BEGIN ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip BankStatement_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='BankStatement_bankAccountId_fkey') THEN BEGIN ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip BankStatement_bankAccountId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='BankStatementLine_statementId_fkey') THEN BEGIN ALTER TABLE "BankStatementLine" ADD CONSTRAINT "BankStatementLine_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "BankStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip BankStatementLine_statementId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='BankStatementLine_matchedEntryLineId_fkey') THEN BEGIN ALTER TABLE "BankStatementLine" ADD CONSTRAINT "BankStatementLine_matchedEntryLineId_fkey" FOREIGN KEY ("matchedEntryLineId") REFERENCES "JournalEntryLine"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip BankStatementLine_matchedEntryLineId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='BankReconciliation_tenantId_fkey') THEN BEGIN ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip BankReconciliation_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='BankReconciliation_bankStatementId_fkey') THEN BEGIN ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_bankStatementId_fkey" FOREIGN KEY ("bankStatementId") REFERENCES "BankStatement"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip BankReconciliation_bankStatementId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='BankReconciliation_bankAccountId_fkey') THEN BEGIN ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip BankReconciliation_bankAccountId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='BankReconciliation_journalEntryLineId_fkey') THEN BEGIN ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_journalEntryLineId_fkey" FOREIGN KEY ("journalEntryLineId") REFERENCES "JournalEntryLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip BankReconciliation_journalEntryLineId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Client_tenantId_fkey') THEN BEGIN ALTER TABLE "Client" ADD CONSTRAINT "Client_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip Client_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Supplier_tenantId_fkey') THEN BEGIN ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip Supplier_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Invoice_tenantId_fkey') THEN BEGIN ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip Invoice_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Invoice_clientId_fkey') THEN BEGIN ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip Invoice_clientId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='InvoiceItem_invoiceId_fkey') THEN BEGIN ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip InvoiceItem_invoiceId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='PurchaseOrder_tenantId_fkey') THEN BEGIN ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip PurchaseOrder_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='PurchaseOrder_clientId_fkey') THEN BEGIN ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip PurchaseOrder_clientId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='PurchaseOrder_supplierId_fkey') THEN BEGIN ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip PurchaseOrder_supplierId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='PurchaseOrderItem_purchaseOrderId_fkey') THEN BEGIN ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip PurchaseOrderItem_purchaseOrderId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='CashDrawer_tenantId_fkey') THEN BEGIN ALTER TABLE "CashDrawer" ADD CONSTRAINT "CashDrawer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip CashDrawer_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='POSSession_tenantId_fkey') THEN BEGIN ALTER TABLE "POSSession" ADD CONSTRAINT "POSSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip POSSession_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='POSOrder_tenantId_fkey') THEN BEGIN ALTER TABLE "POSOrder" ADD CONSTRAINT "POSOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip POSOrder_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='POSOrder_sessionId_fkey') THEN BEGIN ALTER TABLE "POSOrder" ADD CONSTRAINT "POSOrder_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "POSSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip POSOrder_sessionId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='POSOrderItem_orderId_fkey') THEN BEGIN ALTER TABLE "POSOrderItem" ADD CONSTRAINT "POSOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "POSOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip POSOrderItem_orderId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='POSPayment_tenantId_fkey') THEN BEGIN ALTER TABLE "POSPayment" ADD CONSTRAINT "POSPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip POSPayment_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='POSPayment_orderId_fkey') THEN BEGIN ALTER TABLE "POSPayment" ADD CONSTRAINT "POSPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "POSOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip POSPayment_orderId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='PaymentFollowUp_tenantId_fkey') THEN BEGIN ALTER TABLE "PaymentFollowUp" ADD CONSTRAINT "PaymentFollowUp_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip PaymentFollowUp_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='PaymentFollowUp_invoiceId_fkey') THEN BEGIN ALTER TABLE "PaymentFollowUp" ADD CONSTRAINT "PaymentFollowUp_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip PaymentFollowUp_invoiceId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='PaymentReminder_invoiceId_fkey') THEN BEGIN ALTER TABLE "PaymentReminder" ADD CONSTRAINT "PaymentReminder_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip PaymentReminder_invoiceId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='PaymentReminder_followUpId_fkey') THEN BEGIN ALTER TABLE "PaymentReminder" ADD CONSTRAINT "PaymentReminder_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "PaymentFollowUp"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip PaymentReminder_followUpId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ASPConfiguration_tenantId_fkey') THEN BEGIN ALTER TABLE "ASPConfiguration" ADD CONSTRAINT "ASPConfiguration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip ASPConfiguration_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ExchangeRate_tenantId_fkey') THEN BEGIN ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip ExchangeRate_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ExportInvoice_tenantId_fkey') THEN BEGIN ALTER TABLE "ExportInvoice" ADD CONSTRAINT "ExportInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip ExportInvoice_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ExportInvoice_invoiceId_fkey') THEN BEGIN ALTER TABLE "ExportInvoice" ADD CONSTRAINT "ExportInvoice_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip ExportInvoice_invoiceId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='WithholdingTax_tenantId_fkey') THEN BEGIN ALTER TABLE "WithholdingTax" ADD CONSTRAINT "WithholdingTax_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip WithholdingTax_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='WithholdingTax_invoiceId_fkey') THEN BEGIN ALTER TABLE "WithholdingTax" ADD CONSTRAINT "WithholdingTax_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip WithholdingTax_invoiceId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Qualification_tenantId_fkey') THEN BEGIN ALTER TABLE "Qualification" ADD CONSTRAINT "Qualification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip Qualification_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Employee_tenantId_fkey') THEN BEGIN ALTER TABLE "Employee" ADD CONSTRAINT "Employee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip Employee_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Employee_qualificationId_fkey') THEN BEGIN ALTER TABLE "Employee" ADD CONSTRAINT "Employee_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "Qualification"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip Employee_qualificationId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Absence_tenantId_fkey') THEN BEGIN ALTER TABLE "Absence" ADD CONSTRAINT "Absence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip Absence_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Absence_employeeId_fkey') THEN BEGIN ALTER TABLE "Absence" ADD CONSTRAINT "Absence_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip Absence_employeeId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Delay_tenantId_fkey') THEN BEGIN ALTER TABLE "Delay" ADD CONSTRAINT "Delay_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip Delay_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Delay_employeeId_fkey') THEN BEGIN ALTER TABLE "Delay" ADD CONSTRAINT "Delay_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip Delay_employeeId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Mutation_tenantId_fkey') THEN BEGIN ALTER TABLE "Mutation" ADD CONSTRAINT "Mutation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip Mutation_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Mutation_employeeId_fkey') THEN BEGIN ALTER TABLE "Mutation" ADD CONSTRAINT "Mutation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip Mutation_employeeId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='PaieParameters_tenantId_fkey') THEN BEGIN ALTER TABLE "PaieParameters" ADD CONSTRAINT "PaieParameters_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip PaieParameters_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='PaySlip_tenantId_fkey') THEN BEGIN ALTER TABLE "PaySlip" ADD CONSTRAINT "PaySlip_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip PaySlip_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='PaySlip_employeeId_fkey') THEN BEGIN ALTER TABLE "PaySlip" ADD CONSTRAINT "PaySlip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip PaySlip_employeeId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='User_tenantId_fkey') THEN BEGIN ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip User_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='TenantModule_tenantId_fkey') THEN BEGIN ALTER TABLE "TenantModule" ADD CONSTRAINT "TenantModule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip TenantModule_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='TenantModule_moduleId_fkey') THEN BEGIN ALTER TABLE "TenantModule" ADD CONSTRAINT "TenantModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip TenantModule_moduleId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Asset_tenantId_fkey') THEN BEGIN ALTER TABLE "Asset" ADD CONSTRAINT "Asset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip Asset_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='WorkOrder_tenantId_fkey') THEN BEGIN ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip WorkOrder_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='WorkOrder_assetId_fkey') THEN BEGIN ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip WorkOrder_assetId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='WorkStation_tenantId_fkey') THEN BEGIN ALTER TABLE "WorkStation" ADD CONSTRAINT "WorkStation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip WorkStation_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='BillOfMaterials_tenantId_fkey') THEN BEGIN ALTER TABLE "BillOfMaterials" ADD CONSTRAINT "BillOfMaterials_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip BillOfMaterials_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='BillOfMaterialsItem_billOfMaterialsId_fkey') THEN BEGIN ALTER TABLE "BillOfMaterialsItem" ADD CONSTRAINT "BillOfMaterialsItem_billOfMaterialsId_fkey" FOREIGN KEY ("billOfMaterialsId") REFERENCES "BillOfMaterials"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip BillOfMaterialsItem_billOfMaterialsId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProductionOrder_tenantId_fkey') THEN BEGIN ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip ProductionOrder_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProductionOrder_workStationId_fkey') THEN BEGIN ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_workStationId_fkey" FOREIGN KEY ("workStationId") REFERENCES "WorkStation"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip ProductionOrder_workStationId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='QualityControl_tenantId_fkey') THEN BEGIN ALTER TABLE "QualityControl" ADD CONSTRAINT "QualityControl_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip QualityControl_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Project_tenantId_fkey') THEN BEGIN ALTER TABLE "Project" ADD CONSTRAINT "Project_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip Project_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProjectColumn_projectId_fkey') THEN BEGIN ALTER TABLE "ProjectColumn" ADD CONSTRAINT "ProjectColumn_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip ProjectColumn_projectId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProjectTask_columnId_fkey') THEN BEGIN ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "ProjectColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip ProjectTask_columnId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProjectChecklist_taskId_fkey') THEN BEGIN ALTER TABLE "ProjectChecklist" ADD CONSTRAINT "ProjectChecklist_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ProjectTask"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip ProjectChecklist_taskId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProjectChecklistItem_checklistId_fkey') THEN BEGIN ALTER TABLE "ProjectChecklistItem" ADD CONSTRAINT "ProjectChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "ProjectChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip ProjectChecklistItem_checklistId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProjectAttachment_taskId_fkey') THEN BEGIN ALTER TABLE "ProjectAttachment" ADD CONSTRAINT "ProjectAttachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ProjectTask"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip ProjectAttachment_taskId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProjectComment_taskId_fkey') THEN BEGIN ALTER TABLE "ProjectComment" ADD CONSTRAINT "ProjectComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ProjectTask"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip ProjectComment_taskId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProjectTag_tenantId_fkey') THEN BEGIN ALTER TABLE "ProjectTag" ADD CONSTRAINT "ProjectTag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip ProjectTag_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProjectTaskTag_taskId_fkey') THEN BEGIN ALTER TABLE "ProjectTaskTag" ADD CONSTRAINT "ProjectTaskTag_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ProjectTask"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip ProjectTaskTag_taskId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProjectTaskTag_tagId_fkey') THEN BEGIN ALTER TABLE "ProjectTaskTag" ADD CONSTRAINT "ProjectTaskTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ProjectTag"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip ProjectTaskTag_tagId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProjectMember_projectId_fkey') THEN BEGIN ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip ProjectMember_projectId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Product_tenantId_fkey') THEN BEGIN ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip Product_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='StockMovement_tenantId_fkey') THEN BEGIN ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip StockMovement_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='StockMovement_productId_fkey') THEN BEGIN ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip StockMovement_productId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='StockMovement_warehouseId_fkey') THEN BEGIN ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip StockMovement_warehouseId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Warehouse_tenantId_fkey') THEN BEGIN ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip Warehouse_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProductWarehouse_productId_fkey') THEN BEGIN ALTER TABLE "ProductWarehouse" ADD CONSTRAINT "ProductWarehouse_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip ProductWarehouse_productId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProductWarehouse_warehouseId_fkey') THEN BEGIN ALTER TABLE "ProductWarehouse" ADD CONSTRAINT "ProductWarehouse_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip ProductWarehouse_warehouseId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Inventory_tenantId_fkey') THEN BEGIN ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip Inventory_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Inventory_warehouseId_fkey') THEN BEGIN ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip Inventory_warehouseId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='InventoryItem_inventoryId_fkey') THEN BEGIN ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip InventoryItem_inventoryId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='InventoryItem_warehouseId_fkey') THEN BEGIN ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip InventoryItem_warehouseId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='InventoryItem_productId_fkey') THEN BEGIN ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip InventoryItem_productId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='StockTransfer_tenantId_fkey') THEN BEGIN ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip StockTransfer_tenantId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='StockTransfer_fromWarehouseId_fkey') THEN BEGIN ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip StockTransfer_fromWarehouseId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='StockTransfer_toWarehouseId_fkey') THEN BEGIN ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip StockTransfer_toWarehouseId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='StockTransferItem_transferId_fkey') THEN BEGIN ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "StockTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip StockTransferItem_transferId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='StockTransferItem_productId_fkey') THEN BEGIN ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip StockTransferItem_productId_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='_ProjectToProjectTag_A_fkey') THEN BEGIN ALTER TABLE "_ProjectToProjectTag" ADD CONSTRAINT "_ProjectToProjectTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip _ProjectToProjectTag_A_fkey: %', SQLERRM; END; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='_ProjectToProjectTag_B_fkey') THEN BEGIN ALTER TABLE "_ProjectToProjectTag" ADD CONSTRAINT "_ProjectToProjectTag_B_fkey" FOREIGN KEY ("B") REFERENCES "ProjectTag"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN others THEN RAISE NOTICE 'skip _ProjectToProjectTag_B_fkey: %', SQLERRM; END; END IF; END $$;
ALTER TABLE "CashDrawer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "POSSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "POSOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "POSOrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "POSPayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WithholdingTax" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Qualification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Absence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Delay" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Mutation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaieParameters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectColumn" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectChecklist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectChecklistItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectAttachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectComment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectTaskTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Warehouse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductWarehouse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockTransfer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockTransferItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_ProjectToProjectTag" ENABLE ROW LEVEL SECURITY;
COMMIT;
-- 4) ttnStatus non nul
UPDATE "Invoice" SET "ttnStatus"='DRAFT' WHERE "ttnStatus" IS NULL; ALTER TABLE "Invoice" ALTER COLUMN "ttnStatus" SET DEFAULT 'DRAFT'; ALTER TABLE "Invoice" ALTER COLUMN "ttnStatus" SET NOT NULL;
-- 5) Données de démo (tenant demo)
BEGIN;
UPDATE "Tenant" SET name='Entreprise Démo SARL', "matriculeFiscal"='1234567A/P/M/000', address='Zone Industrielle Charguia II', city='Tunis', phone='+216 71 000 000', email='contact@demo.tn', "updatedAt"=now() WHERE id='1f771e5b-391f-4450-8ff6-3e1e63bee33e';
UPDATE "TenantModule" SET "isEnabled"=true WHERE "tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e';
INSERT INTO "Client"(id,"tenantId",code,name,email,phone,address,city,country,"matriculeFiscal","isActive","createdAt","updatedAt")
SELECT gen_random_uuid()::text,'1f771e5b-391f-4450-8ff6-3e1e63bee33e','CL-'||lpad(i::text,3,'0'),
 'Société '||(ARRAY['Atlas','Maghreb','Carthage','El Manar','Zitouna','Numidia','Saphir','Oasis','Médina','Tanit'])[i%10+1]||CASE WHEN i>10 THEN ' Services '||i ELSE ' Tech' END,
 'contact@client'||i||'.tn','+216 '||(70+i%9)||' '||substr((100000+i*1111)::text,1,6), (i*12)||' Rue de la République',
 (ARRAY['Tunis','Sfax','Sousse','Bizerte','Nabeul','Kairouan','Gabès','Monastir','Ariana','Ben Arous'])[i%10+1],'Tunisie',(1000000+i*12345)||'A/P/M/000',true,now()-interval '7 months',now()
FROM generate_series(1,30) i
WHERE NOT EXISTS (SELECT 1 FROM "Client" c WHERE c."tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e' AND c.code='CL-'||lpad(i::text,3,'0'));
INSERT INTO "Product"(id,"tenantId",code,name,category,unit,"purchasePrice","salePrice","minStock","currentStock","vatRate","isActive","createdAt","updatedAt")
SELECT gen_random_uuid()::text,'1f771e5b-391f-4450-8ff6-3e1e63bee33e','PRD-'||lpad(i::text,3,'0'),
 cat||' - Référence '||chr(65+i%26)||(i*10), cat, CASE WHEN i%5=0 THEN 'boîte' WHEN i%3=0 THEN 'kg' ELSE 'unité' END,
 p, round(p*(1.3+random()*0.5)::numeric,1), floor(random()*15)+5, floor(random()*80), (ARRAY[7,13,19])[i%3+1], true, now()-interval '7 months', now()
FROM (SELECT i, (ARRAY['Fournitures','Informatique','Outillage','Sécurité','Consommables','Matières Premières'])[i%6+1] cat, round((10+random()*200)::numeric,1) p FROM generate_series(1,50) i) s
WHERE NOT EXISTS (SELECT 1 FROM "Product" x WHERE x."tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e' AND x.code='PRD-'||lpad(i::text,3,'0'));
CREATE TEMP TABLE inv ON COMMIT DROP AS
SELECT row_number() over (order by m desc,k) n, m, k,
 (date_trunc('month',now()) - (m||' months')::interval + interval '14 days' + (k*2||' days')::interval) d,
 floor(200+random()*1300)::numeric ht, random() r1, random() r2
FROM generate_series(0,5) m, LATERAL generate_series(1, 8+floor(random()*6)::int + m*0) k
WHERE NOT EXISTS (SELECT 1 FROM "Invoice" WHERE "tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e');
INSERT INTO "Invoice"(id,"tenantId","clientId",number,type,status,date,"dueDate","subtotalHT","totalVAT","timbreFiscal","totalTTC",currency,"createdAt","updatedAt")
SELECT gen_random_uuid()::text,'1f771e5b-391f-4450-8ff6-3e1e63bee33e',
 (SELECT id FROM "Client" WHERE "tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e' ORDER BY md5(id||inv.n) LIMIT 1),
 'FAC-2026-'||lpad(n::text,4,'0'),'INVOICE',
 (CASE WHEN m>0 OR r1>0.4 THEN 'PAID' WHEN r2>0.5 THEN 'PENDING' ELSE 'SENT' END)::"DocumentStatus",
 d, d+interval '30 days', ht, round(ht*0.19,1), 1, ht+round(ht*0.19,1)+1,'TND', d, now()
FROM inv;
INSERT INTO "StockMovement"(id,"tenantId","productId",type,quantity,reference,"createdAt")
SELECT gen_random_uuid()::text,'1f771e5b-391f-4450-8ff6-3e1e63bee33e',
 (SELECT id FROM "Product" WHERE "tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e' ORDER BY md5(id||inv.n) LIMIT 1),
 'EXIT', floor(random()*5)+1, 'FAC-2026-'||lpad(n::text,4,'0'), d
FROM inv;
COMMIT;
SELECT (SELECT count(*) FROM "Client" WHERE "tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e') clients,
 (SELECT count(*) FROM "Product" WHERE "tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e') produits,
 (SELECT count(*) FROM "Invoice" WHERE "tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e') factures,
 (SELECT count(*) FROM "StockMovement" WHERE "tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e') mouvements;
INSERT INTO "InvoiceItem"(id,"invoiceId","productId",description,quantity,"unitPriceHT","vatRate","vatAmount","totalHT","totalTTC",discount,unit)
SELECT gen_random_uuid()::text, i.id, sm."productId", p.name, sm.quantity, round(i."subtotalHT"/sm.quantity,3), 19, i."totalVAT", i."subtotalHT", i."subtotalHT"+i."totalVAT", 0, p.unit
FROM "Invoice" i
JOIN "StockMovement" sm ON sm.reference=i.number AND sm."tenantId"=i."tenantId"
JOIN "Product" p ON p.id=sm."productId"
WHERE i."tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e' AND NOT EXISTS (SELECT 1 FROM "InvoiceItem" x WHERE x."invoiceId"=i.id);
SELECT count(*) FROM "InvoiceItem" x JOIN "Invoice" i ON i.id=x."invoiceId" WHERE i."tenantId"='1f771e5b-391f-4450-8ff6-3e1e63bee33e';
