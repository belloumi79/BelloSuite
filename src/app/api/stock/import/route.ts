import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import * as XLSX from 'xlsx'

const REQUIRED = ['code', 'name']
const OPTIONAL = ['barcode','description','category','unit','purchasePrice','salePrice','vatRate','fodec','minStock','initialStock']

function toBool(v: any): boolean {
  if (v === null || v === undefined) return false
  if (typeof v === 'boolean') return v
  const s = String(v).toLowerCase().trim()
  if (s === 'true' || s === '1' || s === 'oui' || s === 'yes') return true
  return false
}

function toNum(v: any, fallback = 0): number {
  if (v === null || v === undefined || v === '') return fallback
  const n = Number(v)
  return isNaN(n) ? fallback : n
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const tenantId = formData.get('tenantId') as string | null

    if (!file || !tenantId) {
      return NextResponse.json({ error: 'Fichier et tenantId requis' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Fichier vide' }, { status: 400 })
    }

    const headers = Object.keys(rows[0])
    const missing = REQUIRED.filter(h => !headers.map(x => x.toLowerCase()).includes(h.toLowerCase()))
    if (missing.length > 0) {
      return NextResponse.json({ error: `Colonnes requises manquantes: ${missing.join(', ')}` }, { status: 400 })
    }

    const log: any[] = []
    const errors: any[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2
      const get = (key: string) => {
        const k = headers.find(h => h.toLowerCase() === key.toLowerCase())
        return k ? row[k] : undefined
      }

      const code = String(get('code') || '').trim()
      const name = String(get('name') || '').trim()

      if (!code || !name) {
        errors.push({ row: rowNum, error: 'code ou name manquant' })
        continue
      }

      try {
        const existing = await prisma.product.findUnique({
          where: { tenantId_code: { tenantId, code } },
        })

        if (existing) {
          errors.push({ row: rowNum, code, error: 'Code déjà utilisé' })
          continue
        }

        const purchasePrice = toNum(get('purchasePrice'))
        const initialStock = toNum(get('initialStock'))

        const product = await prisma.product.create({
          data: {
            tenantId,
            code,
            barcode: String(get('barcode') || '').trim() || null,
            name,
            description: String(get('description') || '').trim() || null,
            category: String(get('category') || '').trim() || null,
            unit: String(get('unit') || 'unit').trim() || 'unit',
            purchasePrice,
            salePrice: toNum(get('salePrice')),
            vatRate: toNum(get('vatRate'), 19),
            fodec: toBool(get('fodec')),
            minStock: toNum(get('minStock')),
            currentStock: initialStock,
          },
        })

        if (initialStock > 0) {
          await prisma.stockMovement.create({
            data: {
              tenantId,
              productId: product.id,
              type: 'ENTRY',
              quantity: initialStock,
              unitPrice: purchasePrice,
              notes: 'Import initial',
            },
          })
        }

        log.push({ row: rowNum, code, name, status: 'created' })
      } catch (e: any) {
        errors.push({ row: rowNum, code, error: (e as Error).message })
      }
    }

    return NextResponse.json({
      total: rows.length,
      imported: log.length,
      failed: errors.length,
      log,
      errors,
    })
  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 })
  }
}
