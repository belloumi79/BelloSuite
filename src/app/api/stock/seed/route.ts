import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tenantId } = body
    if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })

    const products = [
      { code: 'ELEC-001', barcode: '6291041500101', name: 'Clavier Mécanique RGB', description: 'Clavier gaming mecanique avec retroeclairage RGB, switches blue', category: 'Informatique', unit: 'piece', purchasePrice: 45.000, salePrice: 89.900, minStock: 10, currentStock: 50 },
      { code: 'ELEC-002', barcode: '6291041500102', name: 'Souris Sans Fil Ergonomique', description: 'Souris wireless rechargeable, design ergonomique, 1600 DPI', category: 'Informatique', unit: 'piece', purchasePrice: 22.000, salePrice: 49.900, minStock: 15, currentStock: 35 },
      { code: 'ELEC-003', barcode: '6291041500103', name: 'Ecran LED 27 Pouces Full HD', description: 'Moniteur 27 pouces 1920x1080, 75Hz, HDMI/VGA, temps de reponse 5ms', category: 'Informatique', unit: 'piece', purchasePrice: 320.000, salePrice: 549.000, minStock: 5, currentStock: 12 },
      { code: 'FURN-001', barcode: '6291041500104', name: 'Fauteuil de Bureau Ergonomique', description: 'Fauteuil bureau mesh, soutien lombaire, accoudoirs 4D reglab', category: 'Mobilier', unit: 'piece', purchasePrice: 280.000, salePrice: 499.000, minStock: 3, currentStock: 8 },
      { code: 'STOC-001', barcode: '6291041500105', name: 'Disque Dur Externe 1To USB 3.0', description: 'HDD portable 1To, transfert 5Gbps, compatible USB-C', category: 'Informatique', unit: 'piece', purchasePrice: 55.000, salePrice: 99.900, minStock: 10, currentStock: 25 },
      { code: 'FURN-002', barcode: '6291041500106', name: 'Bureau Standing Adjustable', description: 'Bureau electrique hauteur ajustable, 160x80cm, panneau bois', category: 'Mobilier', unit: 'piece', purchasePrice: 650.000, salePrice: 1099.000, minStock: 2, currentStock: 4 },
      { code: 'CONS-001', barcode: '6291041500107', name: 'Cartouche Encre HP 304 Noir', description: 'Cartouche encre noire originale HP, ~120 pages A4', category: 'Consommables', unit: 'piece', purchasePrice: 28.000, salePrice: 59.900, minStock: 20, currentStock: 60 },
      { code: 'ELEC-004', barcode: '6291041500108', name: 'Cable HDMI 2.1 Haute Vitesse 3m', description: 'Cable HDMI 8K/4K 120Hz, Ethernet integre, tresse nylon', category: 'Accessoires', unit: 'piece', purchasePrice: 8.000, salePrice: 24.900, minStock: 30, currentStock: 100 },
      { code: 'NETW-001', barcode: '6291041500109', name: 'Routeur WiFi 6 AX1500 Bi-Bande', description: 'Routeur dual-band WiFi 6, 1.5 Gbps, 4 ports LAN Gigabit', category: 'Reseau', unit: 'piece', purchasePrice: 95.000, salePrice: 179.000, minStock: 5, currentStock: 15 },
      { code: 'CONS-002', barcode: '6291041500110', name: 'Ramette Papier A4 80g 500 Feuilles', description: 'Papier blanc qualite premium, 500 feuilles, opacite 90%', category: 'Consommables', unit: 'ream', purchasePrice: 4.500, salePrice: 9.900, minStock: 50, currentStock: 200 },
    ]

    const created = []
    for (const p of products) {
      try {
        const existing = await prisma.product.findUnique({ where: { tenantId_code: { tenantId, code: p.code } } })
        if (existing) continue
        const product = await prisma.product.create({
          data: { tenantId, ...p, vatRate: 19, fodec: false },
        })
        await prisma.stockMovement.create({
          data: { tenantId, productId: product.id, type: 'ENTRY', quantity: p.currentStock, unitPrice: p.purchasePrice, notes: 'Stock initial seed' },
        })
        created.push(product.code)
      } catch (e) { console.error('Error creating', p.code, (e as Error).message) }
    }

    return NextResponse.json({ success: true, created: created.length, codes: created })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
