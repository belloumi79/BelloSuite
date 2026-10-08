import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Charger .env.local avant de créer le PrismaClient
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const prisma = new PrismaClient()

async function main() {
  console.log('--- SEEDING DEMO ENVIRONMENT ---')

  // 1. Tenant démo
  const demoTenant = await prisma.tenant.upsert({
    where: { subdomain: 'demo' },
    update: {
      name: 'Entreprise Démo SARL',
      matriculeFiscal: '1234567A/P/M/000',
      address: 'Zone Industrielle Charguia II',
      city: 'Tunis',
      phone: '+216 71 000 000',
      email: 'contact@demo.tn',
    },
    create: {
      name: 'Entreprise Démo SARL',
      subdomain: 'demo',
      matriculeFiscal: '1234567A/P/M/000',
      address: 'Zone Industrielle Charguia II',
      city: 'Tunis',
      phone: '+216 71 000 000',
      email: 'contact@demo.tn',
      isActive: true,
    },
  })

  // 2. User démo
  await prisma.user.upsert({
    where: { email: 'admin@demo.tn' },
    update: {
      tenantId: demoTenant.id,
      isActive: true,
    },
    create: {
      email: 'admin@demo.tn',
      password: bcrypt.hashSync('demo123', 10),
      firstName: 'Directeur',
      lastName: 'Commercial',
      role: 'ADMIN',
      tenantId: demoTenant.id,
      isActive: true,
    },
  })

  // 3. Activer tous les modules pour demo
  const allModules = await prisma.module.findMany()
  for (const mod of allModules) {
    await prisma.tenantModule.upsert({
      where: { tenantId_moduleId: { tenantId: demoTenant.id, moduleId: mod.id } },
      update: { isEnabled: true },
      create: { tenantId: demoTenant.id, moduleId: mod.id, isEnabled: true },
    })
  }

  // 4. Créer 30 Clients Tunisiens
  const cities = ['Tunis', 'Sfax', 'Sousse', 'Bizerte', 'Nabeul', 'Kairouan', 'Gabès', 'Monastir', 'Ariana', 'Ben Arous']
  const clientsData = []
  for (let i = 1; i <= 30; i++) {
    const city = cities[i % cities.length]
    clientsData.push({
      code: `CL-${String(i).padStart(3, '0')}`,
      name: `Société ${['Atlas', 'Maghreb', 'Carthage', 'El Manar', 'Zitouna', 'Numidia', 'Saphir', 'Oasis', 'Médina', 'Tanit'][i % 10]} ${i > 10 ? 'Services ' + i : 'Tech'}`,
      email: `contact@client${i}.tn`,
      phone: `+216 ${70 + (i % 9)} ${String(100000 + i * 1111).slice(0, 6)}`,
      city: city,
      address: `${i * 12} Rue de la République`,
      matriculeFiscal: `${1000000 + i * 12345}A/P/M/000`,
      isActive: true,
      tenantId: demoTenant.id,
    })
  }

  for (const client of clientsData) {
    await prisma.client.upsert({
      where: { tenantId_code: { tenantId: demoTenant.id, code: client.code } },
      update: client,
      create: client,
    })
  }
  const createdClients = await prisma.client.findMany({ where: { tenantId: demoTenant.id } })

  // 5. Créer 50 Produits variés (Stock)
  const categories = ['Fournitures', 'Informatique', 'Outillage', 'Sécurité', 'Consommables', 'Matières Premières']
  const productsData = []
  
  for (let i = 1; i <= 50; i++) {
    const cat = categories[i % categories.length]
    const purchase = Math.round((10 + Math.random() * 200) * 10) / 10
    const margin = 1.3 + Math.random() * 0.5
    const sale = Math.round((purchase * margin) * 10) / 10
    const stock = Math.floor(Math.random() * 80)
    const minStock = Math.floor(Math.random() * 15) + 5

    productsData.push({
      code: `PRD-${String(i).padStart(3, '0')}`,
      name: `${cat} - Référence ${String.fromCharCode(65 + (i % 26))}${i * 10}`,
      category: cat,
      purchasePrice: purchase,
      salePrice: sale,
      currentStock: stock,
      minStock: minStock,
      vatRate: [7, 13, 19][i % 3],
      unit: i % 5 === 0 ? 'boîte' : (i % 3 === 0 ? 'kg' : 'unité'),
      tenantId: demoTenant.id,
    })
  }

  for (const prod of productsData) {
    await prisma.product.upsert({
      where: { tenantId_code: { tenantId: demoTenant.id, code: prod.code } },
      update: prod,
      create: prod,
    })
  }
  const createdProducts = await prisma.product.findMany({ where: { tenantId: demoTenant.id } })

  // 6. Historique de Factures & Ventes (6 derniers mois)
  const now = new Date()
  let invoiceCount = 0

  for (let m = 5; m >= 0; m--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - m, 15)
    const nbInvoices = 8 + Math.floor(Math.random() * 6) // 8 à 14 factures par mois

    for (let k = 0; k < nbInvoices; k++) {
      invoiceCount++
      const client = createdClients[Math.floor(Math.random() * createdClients.length)]
      const isPaid = m > 0 || Math.random() > 0.4
      const status = isPaid ? 'ACCEPTED' : (Math.random() > 0.5 ? 'PENDING' : 'SENT')
      
      const subtotalHT = Math.floor(200 + Math.random() * 1500)
      const totalVAT = Math.round(subtotalHT * 0.19 * 10) / 10
      const totalTTC = subtotalHT + totalVAT + 1 // Timbre fiscal 1 TND

      const invDate = new Date(monthDate.getTime() + (k * 2) * 86400000)

      await prisma.invoice.create({
        data: {
          tenantId: demoTenant.id,
          clientId: client.id,
          number: `FAC-2026-${String(invoiceCount).padStart(4, '0')}`,
          status: status,
          date: invDate,
          dueDate: new Date(invDate.getTime() + 30 * 86400000),
          subtotalHT,
          totalVAT,
          timbreFiscal: 1.000,
          totalTTC,
          createdAt: invDate,
        }
      })

      // Mouvement de stock associé pour la vente
      const randomProd = createdProducts[Math.floor(Math.random() * createdProducts.length)]
      await prisma.stockMovement.create({
        data: {
          tenantId: demoTenant.id,
          productId: randomProd.id,
          type: 'EXIT',
          quantity: Math.floor(Math.random() * 5) + 1,
          createdAt: invDate,
          reference: `FAC-2026-${String(invoiceCount).padStart(4, '0')}`,
        }
      })
    }
  }

  console.log(`Demo seed completed! ${createdProducts.length} produits, ${createdClients.length} clients, ${invoiceCount} factures générées.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
