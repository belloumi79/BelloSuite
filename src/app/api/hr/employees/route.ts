import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const isActive = searchParams.get('isActive')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    }

    const where: any = { tenantId }
    if (isActive !== null) where.isActive = isActive === 'true'

    const employees = await prisma.employee.findMany({
      where,
      include: { qualification: true },
      orderBy: { employeeNumber: 'asc' },
    })

    return NextResponse.json(employees)
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      tenantId, employeeNumber, firstName, lastName, email, phone, cin,
      birthDate, birthPlace, nationality, genre, etatCivil, enfantsCharge,
      situationFamiliale, address, city, hireDate, departement, poste,
      qualificationId, typeContrat, salary, modePaie, banque, compteBancaire,
      cnssNumber, cnrpsNumber, amoNumber,
    } = body

    if (!tenantId || !firstName || !lastName || !employeeNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const employee = await prisma.employee.create({
      data: {
        tenantId,
        employeeNumber,
        firstName,
        lastName,
        email,
        phone,
        cin,
        birthDate: birthDate ? new Date(birthDate) : null,
        birthPlace,
        nationality: nationality || 'Tunisienne',
        genre: genre || 'MALE',
        etatCivil: etatCivil || 'CELIBATAIRE',
        enfantsCharge: Number(enfantsCharge) || 0,
        situationFamiliale: situationFamiliale || 'NON_CHEF_FAMILLE',
        address,
        city,
        hireDate: new Date(hireDate),
        departement,
        poste,
        qualificationId,
        typeContrat: typeContrat || 'CDI',
        salary: Number(salary) || 0,
        modePaie: modePaie || 'VIREMENT',
        banque,
        compteBancaire,
        cnssNumber,
        cnrpsNumber,
        amoNumber,
      },
    })

    return NextResponse.json(employee)
  } catch (error: any) {
    console.error('Error creating employee:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Employee number already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
