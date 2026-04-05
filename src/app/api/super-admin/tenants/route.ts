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
    const { name, subdomain, matriculeFiscal, address, city, phone, email, moduleIds, adminUser } = body

    if (!name || !subdomain) {
      return NextResponse.json({ error: 'name and subdomain are required' }, { status: 400 })
    }

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name,
        subdomain: subdomain.toLowerCase().replace(/\s+/g, '-'),
        matriculeFiscal,
        address,
        city,
        phone,
        email,
        isActive: true
      }
    })

    // Assign modules
    if (moduleIds && moduleIds.length > 0) {
      await prisma.tenantModule.createMany({
        data: moduleIds.map((moduleId: string) => ({
          tenantId: tenant.id,
          moduleId,
          isEnabled: true
        }))
      })
    }

    // Create admin user if provided
    if (adminUser?.email && adminUser?.password) {
      const hashedPassword = await bcrypt.hash(adminUser.password, 10)
      await prisma.user.create({
        data: {
          email: adminUser.email,
          password: hashedPassword,
          firstName: adminUser.firstName || '',
          lastName: adminUser.lastName || '',
          role: 'ADMIN',
          tenantId: tenant.id,
          isActive: true
        }
      })
    }

    return NextResponse.json(tenant, { status: 201 })
  } catch (error: any) {
    console.error(error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Un client avec ce sous-domaine existe déjà.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 })
  }
}
