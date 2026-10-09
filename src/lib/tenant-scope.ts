/**
 * Vérifications d'appartenance au tenant pour les tables « enfants » sans colonne tenantId
 * (ProjectColumn, ProjectTask, ProjectComment…). À appeler avant toute lecture/écriture par id.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { BusinessError } from '@/lib/errors'
import type { Prisma } from '@prisma/client'

export const notFound = () => NextResponse.json({ error: 'Introuvable' }, { status: 404 })

export async function projectInTenant(projectId: string | null | undefined, tenantId: string): Promise<boolean> {
  if (!projectId) return false
  return (await prisma.project.count({ where: { id: projectId, tenantId } })) > 0
}

export async function columnInTenant(columnId: string | null | undefined, tenantId: string): Promise<boolean> {
  if (!columnId) return false
  return (await prisma.projectColumn.count({ where: { id: columnId, project: { tenantId } } })) > 0
}

export async function taskInTenant(taskId: string | null | undefined, tenantId: string): Promise<boolean> {
  if (!taskId) return false
  return (await prisma.projectTask.count({ where: { id: taskId, column: { project: { tenantId } } } })) > 0
}

// ─── Clés étrangères reçues du client ────────────────────────────────────────
//
// SÉCURITÉ (IDOR) : tout id venant du body/query qui sera LIÉ à un enregistrement (clientId, productId,
// employeeId, warehouseId…) doit appartenir au tenant de la session. Sinon un utilisateur pourrait
// rattacher (et donc lire via les include) des lignes d'un autre tenant.


/** Modèles Prisma ayant une colonne `tenantId` (délégués prisma.<model>). */
export type TenantScopedModel =
  | 'accountingAccount' | 'accountingPeriod' | 'accountingJournal' | 'journalEntry'
  | 'costCenter' | 'bankAccount' | 'bankStatement'
  | 'client' | 'supplier' | 'invoice' | 'purchaseOrder'
  | 'cashDrawer' | 'pOSSession' | 'pOSOrder'
  | 'exportInvoice' | 'withholdingTax'
  | 'employee' | 'qualification' | 'user'
  | 'asset' | 'workOrder' | 'workStation' | 'billOfMaterials' | 'productionOrder'
  | 'project' | 'projectTag'
  | 'product' | 'warehouse' | 'inventory' | 'stockTransfer'
  | 'goodsReceipt' | 'supplierReturn'

type Db = typeof prisma | Prisma.TransactionClient
type CountDelegate = { count: (args: { where: { id: { in: string[] }; tenantId: string } }) => Promise<number> }

function uniqIds(ids: Array<string | null | undefined>): string[] {
  return Array.from(new Set(ids.filter((v): v is string => typeof v === 'string' && v.length > 0)))
}

/** true si TOUS les ids non vides appartiennent au tenant (ids vides/null ignorés). */
export async function allBelongToTenant(
  model: TenantScopedModel,
  ids: Array<string | null | undefined>,
  tenantId: string,
  db: Db = prisma
): Promise<boolean> {
  const list = uniqIds(ids)
  if (list.length === 0) return true
  const delegate = (db as unknown as Record<string, CountDelegate>)[model]
  if (!delegate) throw new Error(`assertBelongsToTenant : modèle inconnu "${model}"`)
  const n = await delegate.count({ where: { id: { in: list }, tenantId } })
  return n === list.length
}

/**
 * Lève BusinessError(400) si `id` (non vide) n'appartient pas au tenant.
 * Un id null/undefined/'' est ignoré (champ optionnel non renseigné).
 */
export async function assertBelongsToTenant(
  model: TenantScopedModel,
  id: string | null | undefined,
  tenantId: string,
  db: Db = prisma
): Promise<void> {
  if (!(await allBelongToTenant(model, [id], tenantId, db))) {
    throw new BusinessError(`Référence invalide (${model})`, 400)
  }
}

/** Variante liste (ex. productId de chaque ligne de facture). */
export async function assertAllBelongToTenant(
  model: TenantScopedModel,
  ids: Array<string | null | undefined>,
  tenantId: string,
  db: Db = prisma
): Promise<void> {
  if (!(await allBelongToTenant(model, ids, tenantId, db))) {
    throw new BusinessError(`Référence invalide (${model})`, 400)
  }
}

/**
 * Pour les routes qui n'utilisent pas handleApiError : vérifie plusieurs références d'un coup et
 * renvoie une réponse 400 prête à retourner, ou null si tout est OK.
 *   const bad = await tenantRefsError(tenantId, { client: body.clientId, product: items.map(i => i.productId) })
 *   if (bad) return bad
 */
export async function tenantRefsError(
  tenantId: string,
  refs: Partial<Record<TenantScopedModel, string | null | undefined | Array<string | null | undefined>>>,
  db: Db = prisma
): Promise<NextResponse | null> {
  for (const [model, value] of Object.entries(refs)) {
    const ids = Array.isArray(value) ? value : [value]
    if (!(await allBelongToTenant(model as TenantScopedModel, ids, tenantId, db))) {
      return NextResponse.json({ error: `Référence invalide (${model})` }, { status: 400 })
    }
  }
  return null
}

/**
 * Corps de mise à jour « libre » (`...updateData`) : retire les clés qui permettraient des écritures
 * imbriquées Prisma (`asset: { connect: { id } }`, `items: { deleteMany: {} }`…) ainsi que les champs
 * techniques (id, tenantId, createdAt, updatedAt). Les clés étrangères simples (assetId…) restent et
 * doivent être vérifiées avec tenantRefsError / assertBelongsToTenant.
 */
export function stripUnsafeUpdateFields<T extends Record<string, unknown>>(data: T): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data ?? {})) {
    if (['id', 'tenantId', 'createdAt', 'updatedAt'].includes(k)) continue
    if (v !== null && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) continue
    if (Array.isArray(v)) continue
    out[k] = v
  }
  return out as Partial<T>
}
