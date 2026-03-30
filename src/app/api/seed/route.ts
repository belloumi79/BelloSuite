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
        password: '$2a$10$dummy', // À changer lors du premier login
        firstName: 'Karim',
        lastName: 'Belloumi',
        role: 'SUPER_ADMIN',
      },
    })

    // Créer le tenant BelloSuite
    const belloSuite = await prisma.tenant.upsert({
      where: { subdomain: 'bellosuite' },
      update: {},
      create: {
        name: 'BelloSuite',
        subdomain: 'bellosuite',
      },
    })

    // Créer les modules disponibles
    const modules = [
      { name: 'stock', displayName: 'Gestion de Stock', description: 'Gestion complète des stocks', icon: 'Package' },
      { name: 'commercial', displayName: 'Module Commercial', description: 'CRM, devis, commandes, factures', icon: 'ShoppingCart' },
      { name: 'comptabilite', displayName: 'Comptabilité', description: 'Comptabilité générale', icon: 'Calculator' },
      { name: 'grh', displayName: 'GRH', description: 'Gestion des ressources humaines', icon: 'Users' },
      { name: 'gmao', displayName: 'GMAO', description: 'Gestion de la maintenance', icon: 'Wrench' },
      { name: 'gpao', displayName: 'GPAO', description: 'Gestion de la production', icon: 'Factory' },
      { name: 'paie', displayName: 'Paie', description: 'Gestion de la paie', icon: 'CreditCard' },
      { name: 'qualite', displayName: 'GQAO', description: 'Gestion qualité', icon: 'CheckCircle' },
    ]

    for (const mod of modules) {
      await prisma.module.upsert({
        where: { name: mod.name },
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
