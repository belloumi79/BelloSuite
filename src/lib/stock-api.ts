/** Aides communes aux routes /api/stock/* (rôles, lecture des paramètres). */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { ApiContext } from '@/lib/api'

/** Opérations sensibles (paramètres, référentiels, suppression de dépôt, validation d'inventaire). */
export function isStockAdmin(ctx: ApiContext): boolean {
  return ctx.userRole === 'ADMIN' || ctx.userRole === 'SUPER_ADMIN'
}

export function forbidden() {
  return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
}

/** Lecture tolérante du corps JSON (corps vide → {}). */
export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json()
    return b && typeof b === 'object' ? (b as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional().nullable(),
})

export const unitSchema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(60),
  decimals: z.coerce.number().int().min(0).max(3).default(0),
})

const num0 = z.preprocess(v => (v === '' || v === null || v === undefined ? undefined : v), z.coerce.number().min(0).default(0))

export const createProductSchema = z.object({
  tenantId: z.string().min(1, 'tenantId requis'),
  code: z.string().trim().min(1, 'code requis'),
  name: z.string().trim().min(1, 'name requis'),
  description: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().default('unit'),
  purchasePrice: num0,
  salePrice: num0,
  vatRate: z.preprocess(v => (v === '' || v === null || v === undefined ? undefined : v), z.coerce.number().min(0).max(100).default(19)),
  fodec: z.boolean().default(false),
  minStock: num0,
  reorderPoint: num0,
  reorderQty: num0,
  initialStock: num0,
  /** Dépôt recevant le stock initial (défaut : dépôt par défaut) */
  warehouseId: z.string().optional().nullable(),
  barcode: z.string().optional(),
})
