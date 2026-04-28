import { z } from 'zod'
import { prisma } from '@/lib/db'
import { BusinessError } from '@/lib/errors'
import { Genre, EstadoCivil, SituationFamiliale, TypeContrat, ModePaie, PaymentStatus } from '@prisma/client'

// ─── Zod Schemas ────────────────────────────────────────────

export const createEmployeeSchema = z.object({
  tenantId: z.string().min(1),
  employeeNumber: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  cin: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  birthPlace: z.string().optional().nullable(),
  nationality: z.string().default('Tunisienne'),
  genre: z.nativeEnum(Genre).default(Genre.MALE),
  etatCivil: z.nativeEnum(EstadoCivil).default(EstadoCivil.CELIBATAIRE),
  enfantsCharge: z.coerce.number().default(0),
  situationFamiliale: z.nativeEnum(SituationFamiliale).default(SituationFamiliale.NON_CHEF_FAMILLE),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  hireDate: z.string(),
  departement: z.string().optional().nullable(),
  poste: z.string().optional().nullable(),
  qualificationId: z.string().optional().nullable(),
  typeContrat: z.nativeEnum(TypeContrat).default(TypeContrat.CDI),
  salary: z.coerce.number().default(0),
  modePaie: z.nativeEnum(ModePaie).default(ModePaie.VIREMENT),
  banque: z.string().optional().nullable(),
  compteBancaire: z.string().optional().nullable(),
  cnssNumber: z.string().optional().nullable(),
  cnrpsNumber: z.string().optional().nullable(),
  amoNumber: z.string().optional().nullable(),
})

export type CreateEmployeeData = z.infer<typeof createEmployeeSchema>

// ─── Service Functions ──────────────────────────────────────

export async function getEmployees(tenantId: string, isActive?: boolean) {
  return prisma.employee.findMany({
    where: { 
      tenantId, 
      ...(isActive !== undefined ? { isActive } : {}) 
    },
    include: { qualification: true },
    orderBy: { employeeNumber: 'asc' },
  })
}

export async function createEmployee(data: CreateEmployeeData) {
  const { birthDate, hireDate, ...rest } = data

  return prisma.employee.create({
    data: {
      ...rest,
      birthDate: birthDate ? new Date(birthDate) : null,
      hireDate: new Date(hireDate),
    },
  })
}

export async function getPayrollSummary(tenantId: string, month: number, year: number) {
  const where = {
    tenantId,
    mois: month,
    annee: year,
  }

  const [payslips, params] = await Promise.all([
    prisma.paySlip.findMany({ where }),
    prisma.paieParameters.findFirst({ where: { tenantId } }),
  ])

  return {
    totalEmployees: payslips.length,
    totalGross: payslips.reduce((sum, p) => sum + Number(p.brutGlobal), 0),
    totalNet: payslips.reduce((sum, p) => sum + Number(p.netAPayer), 0),
    totalCNSS: payslips.reduce((sum, p) => sum + Number(p.cnssSalaire), 0),
    totalIRPP: payslips.reduce((sum, p) => sum + Number(p.irpp), 0),
    statusBreakdown: {
      pending: payslips.filter((p) => p.statut === PaymentStatus.PENDING).length,
      paid: payslips.filter((p) => p.statut === PaymentStatus.PAID).length,
      cancelled: payslips.filter((p) => p.statut === PaymentStatus.CANCELLED).length,
    },
    params,
  }
}

/**
 * Logique de calcul de paie simplifiée (Tunisie)
 */
export function calculateTunisianTax(taxableIncomeMonthly: number, params: any, familyInfo: { isChefFamille: boolean, childrenCount: number }) {
  const annualTaxable = taxableIncomeMonthly * 12
  
  // 1. Déductions professionnelles (10% plafonné à 2000 TND généralement, mais ici simplifié selon params)
  const profDeduction = Math.min(annualTaxable * 0.1, 2000)
  let baseImposable = annualTaxable - profDeduction

  // 2. Déductions familiales
  if (familyInfo.isChefFamille) {
    baseImposable -= Number(params.deductionChefFamille || 150)
  }
  const childrenDeduction = Math.min(familyInfo.childrenCount, Number(params.enfantsMaxDeductible || 4)) * Number(params.deductionParEnfant || 100)
  baseImposable -= childrenDeduction

  if (baseImposable < 0) baseImposable = 0

  // 3. Calcul IRPP par tranches
  let tax = 0
  const tranches = [
    { max: Number(params.irppTranche1Max), rate: Number(params.irppTaux1) / 100 },
    { max: Number(params.irppTranche2Max), rate: Number(params.irppTaux2) / 100 },
    { max: Number(params.irppTranche3Max), rate: Number(params.irppTaux3) / 100 },
    { max: Number(params.irppTranche4Max), rate: Number(params.irppTaux4) / 100 },
    { max: Infinity, rate: Number(params.irppTaux5) / 100 },
  ]

  let prevMax = 0
  for (const tranche of tranches) {
    if (baseImposable > prevMax) {
      const taxableInTranche = Math.min(baseImposable, tranche.max) - prevMax
      tax += taxableInTranche * tranche.rate
      prevMax = tranche.max
    } else {
      break
    }
  }

  return tax / 12 // Ramené au mois
}
