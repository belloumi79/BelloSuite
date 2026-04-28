import { z } from 'zod'
import { prisma } from '@/lib/db'
import { BusinessError } from '@/lib/errors'

// ─── Zod Schemas ────────────────────────────────────────────

export const createBankAccountSchema = z.object({
  tenantId: z.string().min(1, 'tenantId requis'),
  label: z.string().min(1, 'libellé requis'),
  bankName: z.string().min(1, 'nom de la banque requis'),
  accountNumber: z.string().min(1, 'numéro de compte requis'),
  rib: z.string().optional().nullable(),
  currency: z.string().default('TND'),
  accountingAccountId: z.string().optional().nullable(),
})

export type CreateBankAccountData = z.infer<typeof createBankAccountSchema>

export const reconcileSchema = z.object({
  tenantId: z.string().min(1),
  statementLineId: z.string().min(1),
  journalEntryLineId: z.string().min(1),
  amount: z.coerce.number(),
  notes: z.string().optional().nullable(),
})

export type ReconcileData = z.infer<typeof reconcileSchema>

// ─── Service Functions ──────────────────────────────────────

export async function getBankAccounts(tenantId: string) {
  return prisma.bankAccount.findMany({
    where: { tenantId, isActive: true },
    include: { accountingAccount: { select: { id: true, accountNumber: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createBankAccount(data: CreateBankAccountData) {
  const { tenantId, label, bankName, accountNumber, rib, currency, accountingAccountId } = data

  return prisma.bankAccount.create({
    data: {
      tenantId,
      label,
      bankName,
      accountNumber,
      rib,
      currency,
      accountingAccountId: accountingAccountId || null,
    },
    include: { accountingAccount: true },
  })
}

export async function getReconciliationData(tenantId: string, bankAccountId?: string) {
  const bankAccountFilter = bankAccountId ? { bankAccountId } : {}

  // Fetch unreconciled bank statement lines
  const statementLines = await prisma.bankStatementLine.findMany({
    where: {
      statement: { tenantId, ...bankAccountFilter },
      status: 'OPEN',
    },
    include: { statement: { select: { bankAccount: true, statementDate: true } } },
    orderBy: { lineDate: 'asc' },
  })

  // Fetch unreconciled journal entry lines for bank/cash journals
  const journalLines = await prisma.journalEntryLine.findMany({
    where: {
      journalEntry: { 
        tenantId, 
        isPosted: true, 
        journal: { type: { in: ['BANK', 'CASH'] } } 
      },
      reconciliations: { none: {} },
    },
    include: { 
      journalEntry: { select: { date: true, entryNumber: true, reference: true } }, 
      account: { select: { accountNumber: true, name: true } } 
    },
    orderBy: { journalEntry: { date: 'asc' } },
  })

  return { statementLines, journalLines }
}

export async function reconcile(data: ReconcileData) {
  const { tenantId, statementLineId, journalEntryLineId, amount, notes } = data

  const line = await prisma.bankStatementLine.findUnique({
    where: { id: statementLineId },
    include: { statement: { include: { bankAccount: true } } },
  })

  if (!line || line.statement.tenantId !== tenantId) {
    throw new BusinessError('Ligne de relevé introuvable', 404)
  }

  if (line.status === 'MATCHED') {
    throw new BusinessError('Cette ligne est déjà rapprochée', 400)
  }

  const bankAccountId = line.statement.bankAccount.id

  return prisma.$transaction(async (tx) => {
    const reconciliation = await tx.bankReconciliation.create({
      data: {
        tenantId,
        statementLineId,
        journalEntryLineId,
        bankStatementId: line.statementId,
        bankAccountId,
        amount,
        notes: notes || null,
      },
    })

    await tx.bankStatementLine.update({
      where: { id: statementLineId },
      data: { 
        status: 'MATCHED', 
        matchedEntryLineId: journalEntryLineId 
      },
    })

    return reconciliation
  })
}
