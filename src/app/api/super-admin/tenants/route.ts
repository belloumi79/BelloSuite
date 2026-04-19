import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import * as bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        users: { where: { isActive: true }, select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true } },
        modules: { include: { module: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(tenants)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { companyName, subdomain, matriculeFiscal, vatNumber, address, city, zipCode, phone, email, userEmail } = body

    if (!companyName || !subdomain) {
      return NextResponse.json({ error: 'Nom de l\'entreprise et sous-domaine requis' }, { status: 400 })
    }

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: companyName,
        subdomain: subdomain.toLowerCase().replace(/\s+/g, '-'),
        matriculeFiscal,
        vatNumber,
        address,
        city,
        zipCode,
        phone,
        email,
        isActive: true
      }
    })

    // Get default modules and assign them
    const defaultModules = await prisma.module.findMany({
      take: 3 // Stock, Commercial, Accounting
    })
    
    if (defaultModules.length > 0) {
      await prisma.tenantModule.createMany({
        data: defaultModules.map(m => ({
          tenantId: tenant.id,
          moduleId: m.id,
          isEnabled: true
        }))
      })
    }

    // Link existing user to tenant if provided
    if (userEmail) {
      await prisma.user.update({
        where: { email: userEmail },
        data: { 
          tenantId: tenant.id,
          role: 'ADMIN'
        }
      })
    }

    return NextResponse.json({ tenant }, { status: 201 })
  } catch (error: any) {
    console.error(error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Un client avec ce sous-domaine existe déjà.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 })
  }
}
