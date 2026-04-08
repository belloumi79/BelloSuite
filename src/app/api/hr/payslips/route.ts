import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { calculerImpotTunisie } from "@/lib/fiscal";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId required" }, { status: 400 });
    }

    const where: any = { tenantId };
    if (year) where.annee = parseInt(year);
    if (month) where.mois = parseInt(month);

    const payslips = await prisma.paySlip.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
            departement: true,
            poste: true,
            salary: true,
          },
        },
      },
      orderBy: [{ annee: "desc" }, { mois: "desc" }],
    });

    return NextResponse.json(payslips);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenantId,
      employeeId,
      mois,
      annee,
      joursTravailles = 26,
      heuresSupQte = 0,
      heuresSupMontant = 0,
      primeAnciennete = 0,
      primeTransport = 0,
      primePanier = 0,
      autresPrimes = 0,
      deductionAbsences = 0,
      deductionRetards = 0,
      autresDeductions = 0,
    } = body;

    if (!tenantId || !employeeId || mois === undefined || !annee) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get employee salary
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const salaryBase = Number(employee.salary || 0);
    const joursMois = 26;

    // Get paie parameters
    const params = await prisma.paieParameters.findUnique({ where: { tenantId } });
    const cnrpsSal = Number(params?.cnrpsSalarial || 4.75);
    const cnssSal = Number(params?.cnssSalarial || 1.5);
    const cnavsSal = Number(params?.cnavsSalarial || 3.5);
    const amoSal = Number(params?.amoSalarial || 0.75);
    const plafond = Number(params?.cnssPlafond || 10000);

    const brutGlobal = salaryBase + Number(heuresSupMontant) + Number(primeAnciennete) + Number(primeTransport) + Number(primePanier) + Number(autresPrimes);

    const cnrpsSalaire = Math.min(brutGlobal, plafond) * (cnrpsSal / 100);
    const cnssSalaire = Math.min(brutGlobal, plafond) * (cnssSal / 100);
    const cnavisSalaire = Math.min(brutGlobal, plafond) * (cnavsSal / 100);
    const amoSalaire = brutGlobal * (amoSal / 100);
    const totalCotisations = cnrpsSalaire + cnssSalaire + cnavisSalaire + amoSalaire;

    const salaireImposable = brutGlobal - cnrpsSalaire - cnssSalaire;
    const deductionChefFam = employee.situationFamiliale === "CHEF_FAMILLE" ? Number(params?.deductionChefFamille || 150) : 0;
    const deductionEnfants = Math.min(Number(employee.enfantsCharge || 0), Number(params?.enfantsMaxDeductible || 6)) * Number(params?.deductionParEnfant || 40);
    const deductionTotale = deductionChefFam + deductionEnfants;
    const taxableIncome = Math.max(0, salaireImposable - deductionTotale);

    const taxableIncomeAnnuel = taxableIncome * 12;
    const { impot: irpp, tauxEffectif } = calculerImpotTunisie(taxableIncomeAnnuel);

    const netAPayer = Math.max(0, brutGlobal - totalCotisations - irpp - Number(deductionAbsences) - Number(deductionRetards) - Number(autresDeductions));

    const reference = `${["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][mois-1]}-${annee}-${employee.employeeNumber}`;

    const payslip = await prisma.paySlip.create({
      data: {
        tenantId,
        employeeId,
        reference,
        mois,
        annee,
        joursTravailles,
        salaireBase: salaryBase,
        heuresSupQte,
        heuresSupMontant,
        primeAnciennete,
        primeTransport,
        primePanier,
        autresPrimes,
        brutGlobal,
        cnrpsSalaire,
        cnssSalaire,
        cnavisSalaire,
        amoSalaire,
        totalCotisations,
        salaireImposable,
        deductionChefFam,
        deductionEnfants,
        irpp,
        deductionAbsences,
        deductionRetards,
        autresDeductions,
        netAPayer,
        statut: "PENDING",
      },
    });

    return NextResponse.json(payslip, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
