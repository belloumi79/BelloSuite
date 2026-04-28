import { z } from 'zod'
import { prisma } from '@/lib/db'
import { AccountType, JournalType } from '@prisma/client'

// ─── Zod Schemas ────────────────────────────────────────────

export const journalEntrySchema = z.object({
  tenantId: z.string().min(1),
  journalId: z.string().min(1),
  periodId: z.string().min(1),
  entryNumber: z.string().min(1),
  date: z.string().or(z.date()),
  description: z.string().min(1),
  reference: z.string().optional().nullable(),
  lines: z.array(z.object({
    accountId: z.string().min(1),
    debit: z.number().default(0),
    credit: z.number().default(0),
    description: z.string().optional().nullable(),
  })).min(2),
})

export type JournalEntryData = z.infer<typeof journalEntrySchema>

// ─── Service Functions ──────────────────────────────────────

export async function getChartOfAccounts(tenantId: string) {
  return prisma.accountingAccount.findMany({
    where: { tenantId, isActive: true },
    orderBy: { accountNumber: 'asc' },
  })
}

export async function getJournals(tenantId: string) {
  return prisma.accountingJournal.findMany({
    where: { tenantId, isActive: true },
    orderBy: { code: 'asc' },
  })
}

export async function getPeriods(tenantId: string) {
  return prisma.accountingPeriod.findMany({
    where: { tenantId },
    orderBy: { startDate: 'desc' },
  })
}

/**
 * Initialize a standard Tunisian Chart of Accounts for a new tenant.
 */
export async function initChartOfAccounts(tenantId: string) {
  const standardAccounts = [
    { num: '101', name: 'Capital social', type: AccountType.EQUITY },
    { num: '221', name: 'Installations techniques', type: AccountType.ASSET },
    { num: '401', name: 'Fournisseurs d\'exploitation', type: AccountType.LIABILITY },
    { num: '411', name: 'Clients', type: AccountType.ASSET },
    { num: '512', name: 'Banque', type: AccountType.ASSET },
    { num: '531', name: 'Caisse', type: AccountType.ASSET },
    { num: '601', name: 'Achats de marchandises', type: AccountType.EXPENSE },
    { num: '701', name: 'Ventes de produits finis', type: AccountType.REVENUE },
  ]

  const journals = [
    { code: 'VT', name: 'Ventes', type: JournalType.SALES },
    { code: 'AC', name: 'Achats', type: JournalType.PURCHASES },
    { code: 'BQ', name: 'Banque', type: JournalType.BANK },
    { code: 'CS', name: 'Caisse', type: JournalType.CASH },
    { code: 'OD', name: 'Opérations Diverses', type: JournalType.GENERAL },
  ]

  return prisma.$transaction(async (tx) => {
    // 1. Create accounts
    for (const acc of standardAccounts) {
      await tx.accountingAccount.upsert({
        where: { tenantId_accountNumber: { tenantId, accountNumber: acc.num } },
        update: {},
        create: { 
          tenantId, 
          accountNumber: acc.num, 
          name: acc.name, 
          type: acc.type 
        }
      })
    }

    // 2. Create journals
    for (const j of journals) {
      await tx.accountingJournal.upsert({
        where: { tenantId_code: { tenantId, code: j.code } },
        update: {},
        create: { 
          tenantId, 
          code: j.code, 
          name: j.name, 
          type: j.type 
        }
      })
    }
  })
}

export async function createJournalEntry(data: JournalEntryData) {
  // 1. Validate balance
  const totalDebit = data.lines.reduce((sum, l) => sum + l.debit, 0)
  const totalCredit = data.lines.reduce((sum, l) => sum + l.credit, 0)

  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new Error('L\'écriture n\'est pas équilibrée (Débit != Crédit)')
  }

  return prisma.$transaction(async (tx) => {
    const entry = await tx.journalEntry.create({
      data: {
        tenantId: data.tenantId,
        journalId: data.journalId,
        periodId: data.periodId,
        entryNumber: data.entryNumber,
        date: new Date(data.date),
        description: data.description,
        reference: data.reference,
        lines: {
          createMany: {
            data: data.lines.map(l => ({
              accountId: l.accountId,
              debit: l.debit,
              credit: l.credit,
              description: l.description
            }))
          }
        }
      },
      include: { lines: true }
    })

    return entry
  })
}

export async function postInvoiceToAccounting(invoiceId: string, tenantId: string) {
  return prisma.$transaction(async (tx) => {
    // 1. Get invoice with details
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true, items: true }
    })

    if (!invoice || invoice.tenantId !== tenantId) throw new Error('Facture introuvable')
    if (invoice.accountingEntryId) throw new Error('Facture déjà comptabilisée')

    // 2. Find target accounts
    const acc411 = await tx.accountingAccount.findFirst({ where: { tenantId, accountNumber: '411' } })
    const acc701 = await tx.accountingAccount.findFirst({ where: { tenantId, accountNumber: '701' } })
    const acc445 = await tx.accountingAccount.findFirst({ where: { tenantId, accountNumber: '445' } }) // TVA (Simplified)
    const acc543 = await tx.accountingAccount.findFirst({ where: { tenantId, accountNumber: '543' } }) // Timbre (Simplified)

    if (!acc411 || !acc701) {
      throw new Error('Comptes comptables de base (411, 701) non configurés')
    }

    // 3. Find Sales Journal
    const journal = await tx.accountingJournal.findFirst({ where: { tenantId, code: 'VT' } })
    if (!journal) throw new Error('Journal des Ventes (VT) non configuré')

    // 4. Find/Create Period (simplified: current year)
    const currentYear = new Date().getFullYear().toString()
    let period = await tx.accountingPeriod.findFirst({ where: { tenantId, name: currentYear } })
    if (!period) {
      period = await tx.accountingPeriod.create({
        data: {
          tenantId,
          name: currentYear,
          startDate: new Date(`${currentYear}-01-01`),
          endDate: new Date(`${currentYear}-12-31`),
        }
      })
    }

    // 5. Prepare lines
    const lines = [
      { accountId: acc411.id, debit: Number(invoice.totalTTC), credit: 0, description: `Facture ${invoice.number}` },
      { accountId: acc701.id, debit: 0, credit: Number(invoice.subtotalHT), description: `Vente HT ${invoice.number}` },
    ]

    if (Number(invoice.totalVAT) > 0) {
      const vatAccId = acc445?.id || (await tx.accountingAccount.create({ data: { tenantId, accountNumber: '445', name: 'TVA Collectée', type: 'LIABILITY' } })).id
      lines.push({ accountId: vatAccId, debit: 0, credit: Number(invoice.totalVAT), description: `TVA sur ${invoice.number}` })
    }

    if (Number(invoice.timbreFiscal) > 0) {
      const stampAccId = acc543?.id || (await tx.accountingAccount.create({ data: { tenantId, accountNumber: '543', name: 'Timbre Fiscal', type: 'LIABILITY' } })).id
      lines.push({ accountId: stampAccId, debit: 0, credit: Number(invoice.timbreFiscal), description: `Timbre sur ${invoice.number}` })
    }

    // 6. Create Journal Entry
    const entry = await tx.journalEntry.create({
      data: {
        tenantId,
        journalId: journal.id,
        periodId: period.id,
        entryNumber: `POST-${invoice.number}`,
        date: invoice.date,
        description: `Comptabilisation Facture ${invoice.number}`,
        lines: {
          createMany: { data: lines }
        }
      }
    })

    // 7. Link to invoice
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { accountingEntryId: entry.id }
    })

    return entry
  })
}

export async function postPaymentToAccounting(invoiceId: string, tenantId: string, method: 'CASH' | 'BANK' = 'BANK') {
  return prisma.$transaction(async (tx) => {
    // 1. Get invoice
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true }
    })

    if (!invoice || invoice.tenantId !== tenantId) throw new Error('Facture introuvable')
    if (invoice.paymentEntryId) throw new Error('Règlement déjà comptabilisé')

    // 2. Find target accounts
    const acc411 = await tx.accountingAccount.findFirst({ where: { tenantId, accountNumber: '411' } })
    const accTreasury = await tx.accountingAccount.findFirst({ 
      where: { tenantId, accountNumber: method === 'BANK' ? '512' : '531' } 
    })

    if (!acc411 || !accTreasury) {
      throw new Error(`Comptes comptables (411, ${method === 'BANK' ? '512' : '531'}) non configurés`)
    }

    // 3. Find Journal (BANK or CASH)
    const journalCode = method === 'BANK' ? 'BQ' : 'CS'
    const journal = await tx.accountingJournal.findFirst({ where: { tenantId, code: journalCode } })
    if (!journal) throw new Error(`Journal ${journalCode} non configuré`)

    // 4. Find/Create Period
    const currentYear = new Date().getFullYear().toString()
    let period = await tx.accountingPeriod.findFirst({ where: { tenantId, name: currentYear } })
    if (!period) {
      period = await tx.accountingPeriod.create({
        data: {
          tenantId,
          name: currentYear,
          startDate: new Date(`${currentYear}-01-01`),
          endDate: new Date(`${currentYear}-12-31`),
        }
      })
    }

    // 5. Create Journal Entry
    const entry = await tx.journalEntry.create({
      data: {
        tenantId,
        journalId: journal.id,
        periodId: period.id,
        entryNumber: `PAY-${invoice.number}`,
        date: new Date(),
        description: `Règlement Facture ${invoice.number}`,
        lines: {
          create: [
            { accountId: accTreasury.id, debit: Number(invoice.totalTTC), credit: 0, description: `Encaissement ${invoice.number}` },
            { accountId: acc411.id, debit: 0, credit: Number(invoice.totalTTC), description: `Solder ${invoice.number}` },
          ]
        }
      }
    })

    // 6. Update invoice status & link
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { 
        status: 'PAID',
        paymentEntryId: entry.id 
      }
    })

    return entry
  })
}

export async function postPurchaseToAccounting(purchaseOrderId: string, tenantId: string) {
  return prisma.$transaction(async (tx) => {
    // 1. Get purchase order
    const po = await tx.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { supplier: true, items: true }
    })

    if (!po || po.tenantId !== tenantId) throw new Error('Bon de commande fournisseur introuvable')
    if (po.accountingEntryId) throw new Error('Achat déjà comptabilisé')

    // 2. Find target accounts
    const acc401 = await tx.accountingAccount.findFirst({ where: { tenantId, accountNumber: '401' } }) // Fournisseur
    const acc601 = await tx.accountingAccount.findFirst({ where: { tenantId, accountNumber: '601' } }) // Achats
    const acc445 = await tx.accountingAccount.findFirst({ where: { tenantId, accountNumber: '445' } }) // TVA Déductible (Simplified)

    if (!acc401 || !acc601) {
      throw new Error('Comptes comptables de base (401, 601) non configurés')
    }

    // 3. Find Purchase Journal
    const journal = await tx.accountingJournal.findFirst({ where: { tenantId, code: 'AC' } })
    if (!journal) throw new Error('Journal des Achats (AC) non configuré')

    // 4. Find/Create Period
    const currentYear = new Date().getFullYear().toString()
    let period = await tx.accountingPeriod.findFirst({ where: { tenantId, name: currentYear } })
    if (!period) {
      period = await tx.accountingPeriod.create({
        data: {
          tenantId,
          name: currentYear,
          startDate: new Date(`${currentYear}-01-01`),
          endDate: new Date(`${currentYear}-12-31`),
        }
      })
    }

    // 5. Prepare lines
    const lines = [
      { accountId: acc601.id, debit: Number(po.subtotal), credit: 0, description: `Achat ${po.number}` },
    ]

    if (Number(po.taxAmount) > 0) {
      const vatAccId = acc445?.id || (await tx.accountingAccount.create({ data: { tenantId, accountNumber: '445', name: 'TVA Déductible', type: 'ASSET' } })).id
      lines.push({ accountId: vatAccId, debit: Number(po.taxAmount), credit: 0, description: `TVA déductible sur ${po.number}` })
    }

    // Liability
    lines.push({ accountId: acc401.id, debit: 0, credit: Number(po.total), description: `Dette fournisseur ${po.number}` })

    // 6. Create Journal Entry
    const entry = await tx.journalEntry.create({
      data: {
        tenantId,
        journalId: journal.id,
        periodId: period.id,
        entryNumber: `ACH-${po.number}`,
        date: po.date,
        description: `Comptabilisation Achat ${po.number}`,
        lines: {
          createMany: { data: lines }
        }
      }
    })

    // 7. Link to PO
    await tx.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { accountingEntryId: entry.id }
    })

    return entry
  })
}

export async function getTrialBalance(tenantId: string, params: { startDate?: string; endDate?: string } = {}) {
  const { startDate, endDate } = params

  const where: any = { tenantId }
  if (startDate || endDate) {
    where.journalEntry = {
      date: {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      }
    }
  }

  const lines = await prisma.journalEntryLine.findMany({
    where,
    include: { account: true }
  })

  // Group by account
  const balanceMap = new Map<string, any>()

  for (const line of lines) {
    const acc = line.account
    if (!balanceMap.has(acc.id)) {
      balanceMap.set(acc.id, {
        id: acc.id,
        accountNumber: acc.accountNumber,
        name: acc.name,
        debit: 0,
        credit: 0,
        balance: 0
      })
    }

    const entry = balanceMap.get(acc.id)
    entry.debit += Number(line.debit)
    entry.credit += Number(line.credit)
    entry.balance = entry.debit - entry.credit
  }

  return Array.from(balanceMap.values()).sort((a, b) => a.accountNumber.localeCompare(b.accountNumber))
}

export async function getGeneralLedger(tenantId: string, params: { startDate?: string; endDate?: string; accountId?: string } = {}) {
  const { startDate, endDate, accountId } = params

  const where: any = { tenantId }
  if (accountId) where.accountId = accountId
  if (startDate || endDate) {
    where.journalEntry = {
      date: {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      }
    }
  }

  const lines = await prisma.journalEntryLine.findMany({
    where,
    include: {
      account: true,
      journalEntry: {
        include: { journal: true }
      }
    },
    orderBy: [
      { account: { accountNumber: 'asc' } },
      { journalEntry: { date: 'asc' } }
    ]
  })

  // Group by account for the Ledger view
  const ledger: Record<string, any> = {}

  for (const line of lines) {
    const accNum = line.account.accountNumber
    if (!ledger[accNum]) {
      ledger[accNum] = {
        account: line.account,
        lines: [],
        totalDebit: 0,
        totalCredit: 0,
        balance: 0
      }
    }

    ledger[accNum].lines.push({
      id: line.id,
      date: line.journalEntry.date,
      entryNumber: line.journalEntry.entryNumber,
      description: line.description || line.journalEntry.description,
      journal: line.journalEntry.journal.code,
      debit: Number(line.debit),
      credit: Number(line.credit)
    })

    ledger[accNum].totalDebit += Number(line.debit)
    ledger[accNum].totalCredit += Number(line.credit)
    ledger[accNum].balance = ledger[accNum].totalDebit - ledger[accNum].totalCredit
  }

  return ledger
}

