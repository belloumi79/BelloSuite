/**
 * Bons de livraison (BL) : seul document de vente qui sort la marchandise du stock.
 * Le dépôt de sortie est choisi par l'utilisateur (défaut : dépôt par défaut du tenant) et le contrôle
 * de stock suit le paramètre du module stock « autoriser le stock négatif » (settings.stock.allowNegativeStock).
 */
import { Prisma, StockMovementType } from '@prisma/client'
import { BusinessError } from '@/lib/errors'
import { applyMovementTx, getStockSettings } from '@/services/stock'
import { chooseWarehouse, findShortages, aggregateQuantities, type DeliveryLine } from '@/lib/delivery-note-logic'

type Tx = Prisma.TransactionClient

const WAREHOUSE_ERRORS = {
  WAREHOUSE_INVALID: { message: 'Référence invalide (warehouse)', status: 400 },
  WAREHOUSE_INACTIVE: { message: 'Ce dépôt est archivé', status: 409 },
} as const

async function isStockModuleEnabled(tx: Tx, tenantId: string): Promise<boolean> {
  const m = await tx.tenantModule.findFirst({
    where: { tenantId, module: { name: { equals: 'stock', mode: 'insensitive' } }, isEnabled: true },
    select: { id: true },
  })
  return !!m
}

export interface DeliveryWarehouse {
  warehouseId: string | null
  /** false si le module stock n'est pas activé : le BL ne mouvemente pas le stock. */
  stockEnabled: boolean
}

/** Valide le dépôt demandé (appartient au tenant, actif) ou retient le dépôt par défaut. */
export async function resolveDeliveryWarehouseTx(tx: Tx, tenantId: string, requestedId: string | null | undefined): Promise<DeliveryWarehouse> {
  const stockEnabled = await isStockModuleEnabled(tx, tenantId)
  const warehouses = await tx.warehouse.findMany({
    where: { tenantId },
    select: { id: true, isActive: true, isDefault: true },
    orderBy: { createdAt: 'asc' },
  })
  const choice = chooseWarehouse(requestedId || null, warehouses)
  if (!choice.ok) {
    const e = WAREHOUSE_ERRORS[choice.code]
    throw new BusinessError(e.message, e.status, { code: choice.code })
  }
  return { warehouseId: choice.warehouseId, stockEnabled }
}

/**
 * Sorties de stock d'un BL dans la transaction : verrouille les produits, refuse (409, code INSUFFICIENT_STOCK,
 * noms des produits) si le stock du dépôt est insuffisant et que le stock négatif n'est pas autorisé.
 */
export async function postDeliveryNoteStockTx(tx: Tx, input: {
  tenantId: string
  invoiceId: string
  number: string
  /** null : aucun dépôt actif → contrôle sur le stock global du produit. */
  warehouseId: string | null
  lines: DeliveryLine[]
  userId?: string | null
}) {
  const { tenantId, warehouseId } = input
  const requested = aggregateQuantities(input.lines)
  const productIds = Object.keys(requested).sort()
  if (!productIds.length) return

  // Verrou des lignes produit (ordre stable → pas d'interblocage), puis lecture du stock du dépôt
  await tx.$queryRaw`SELECT id FROM "Product" WHERE id IN (${Prisma.join(productIds)}) AND "tenantId" = ${tenantId} ORDER BY id FOR UPDATE`
  const settings = await getStockSettings(tenantId, tx)
  if (!settings.allowNegativeStock) {
    const available: Record<string, number> = {}
    if (warehouseId) {
      const pws = await tx.productWarehouse.findMany({
        where: { warehouseId, productId: { in: productIds } },
        select: { productId: true, stock: true },
      })
      for (const pw of pws) available[pw.productId] = Number(pw.stock)
    } else {
      const ps = await tx.product.findMany({ where: { id: { in: productIds }, tenantId }, select: { id: true, currentStock: true } })
      for (const p of ps) available[p.id] = Number(p.currentStock)
    }
    const shortages = findShortages(input.lines, available, false)
    if (shortages.length) {
      const prods = await tx.product.findMany({ where: { id: { in: shortages.map(s => s.productId) }, tenantId }, select: { id: true, name: true, code: true } })
      const nameOf = (id: string) => { const p = prods.find(x => x.id === id); return p ? p.name || p.code : id }
      const names = shortages.map(s => nameOf(s.productId))
      throw new BusinessError(`Stock insuffisant dans ce dépôt : ${names.join(', ')}`, 409, {
        code: 'INSUFFICIENT_STOCK',
        products: names,
        shortages: shortages.map(s => ({ ...s, name: nameOf(s.productId) })),
      })
    }
  }

  for (const productId of productIds) {
    await applyMovementTx(tx, {
      tenantId,
      productId,
      warehouseId,
      type: StockMovementType.EXIT,
      quantity: requested[productId],
      reference: input.number,
      reason: 'SALE',
      notes: `Livraison: BL ${input.number}`,
      sourceType: 'SALE',
      sourceId: input.invoiceId,
      createdById: input.userId ?? null,
      allowNegative: settings.allowNegativeStock,
    })
  }
}
