import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST() {
  try {
    // Créer le super admin (BelloSuite owner)
    const superAdmin = await prisma.user.upsert({
      where: { email: 'belloumi.kkarim.professional@gmail.com' },
      update: {},
      create: {
        email: 'belloumi.kkarim.professional@gmail.com',
        name: 'Karim Belloumi',
        role: 'SUPER_ADMIN',
      },
    })

    // Créer le tenant BelloSuite (la société qui vend les modules)
    const belloSuite = await prisma.tenant.upsert({
      where: { slug: 'bellosuite' },
      update: {},
      create: {
        name: 'BelloSuite',
        slug: 'bellosuite',
        type: 'RESELLER',
      },
    })

    // Attacher le super admin comme owner du tenant
    await prisma.tenantUser.upsert({
      where: {
        tenantId_userId: {
          tenantId: belloSuite.id,
          userId: superAdmin.id,
        },
      },
      update: {},
      create: {
        tenantId: belloSuite.id,
        userId: superAdmin.id,
        role: 'OWNER',
      },
    })

    // Créer les modules disponibles
    const modules = [
      { name: 'Gestion de Stock', slug: 'stock', description: 'Gestion complète des stocks et entrepôts', price: 299 },
      { name: 'Module Commercial', slug: 'commercial', description: 'CRM, devis, commandes, factures', price: 399 },
      { name: 'Comptabilité', slug: 'comptabilite', description: 'Comptabilité générale et analytique', price: 499 },
      { name: 'GRH', slug: 'grh', description: 'Gestion des ressources humaines', price: 349 },
      { name: 'GMAO', slug: 'gmao', description: 'Gestion de la maintenance', price: 299 },
      { name: 'GPAO', slug: 'gpao', description: 'Gestion de la production', price: 599 },
    ]

    for (const mod of modules) {
      await prisma.module.upsert({
        where: { slug: mod.slug },
        update: {},
        create: mod,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Super admin et modules créés',
      superAdmin,
      tenant: belloSuite,
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 })
  }
}
