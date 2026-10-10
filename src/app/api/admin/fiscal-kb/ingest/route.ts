/**
 * /api/admin/fiscal-kb/ingest — ingestion de la base de connaissances fiscale (SUPER_ADMIN uniquement).
 *
 * GET  → état : chunks par code/version/langue, nb embeddés.
 * POST → body JSON (tout optionnel) :
 *   { chunks?: FiscalChunkInput[] (≤ 200, upsert idempotent par id/content_hash),
 *     embed?: boolean (défaut true), limit?: number (≤ 200, défaut 60), batch?: number (≤ 100, défaut 20) }
 *   Embeddé côté serveur avec GEMINI_API_KEY (variable Vercel, jamais exposée) les chunks
 *   `embedding IS NULL`, dans la limite de ~50 s (Vercel Hobby : 60 s max).
 *   Réponse : { upserted, embedded, remaining, error? } → rappeler tant que remaining > 0.
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/db'
import { embedConfigFromEnv, embedPending, fiscalKbStats, upsertChunks, type FiscalChunkInput } from '@/lib/fiscal-kb-ingest'

export const runtime = 'nodejs'
export const maxDuration = 60

const chunkSchema = z.object({
  id: z.string().min(8).max(64),
  code: z.string().min(1).max(32),
  article: z.string().max(64).nullable(),
  section: z.string().max(500).nullable(),
  title: z.string().min(1).max(500),
  version: z.string().min(1).max(16),
  lang: z.enum(['fr', 'ar']),
  sourceUrl: z.string().url().max(1000),
  outdated: z.boolean(),
  kind: z.string().max(32),
  part: z.number().int().min(1),
  parts: z.number().int().min(1),
  content: z.string().min(1).max(20_000),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  tokens: z.number().int().min(0),
})

const bodySchema = z.object({
  chunks: z.array(chunkSchema).max(200).optional(),
  embed: z.boolean().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  batch: z.number().int().min(1).max(100).optional(),
})

export async function GET(req: Request) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth
  try {
    const stats = await fiscalKbStats(prisma)
    return NextResponse.json({ stats, embeddingsConfigured: Boolean(embedConfigFromEnv()) })
  } catch (e) {
    console.error('[fiscal-kb] stats', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth
  const raw = await req.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(raw ?? {})
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
  const { chunks, embed = true, limit = 60, batch = 20 } = parsed.data
  try {
    const upserted = chunks?.length ? await upsertChunks(prisma, chunks as FiscalChunkInput[]) : 0
    if (!embed) return NextResponse.json({ upserted, embedded: 0, remaining: null })
    const cfg = embedConfigFromEnv()
    if (!cfg) return NextResponse.json({ upserted, embedded: 0, remaining: null, error: { status: 503, message: 'GEMINI_API_KEY non configurée' } }, { status: 503 })
    const r = await embedPending(prisma, cfg, { limit, batch, delayMs: 700, deadlineMs: 45_000 })
    return NextResponse.json({ upserted, ...r }, { status: r.error && r.embedded === 0 ? 502 : 200 })
  } catch (e) {
    console.error('[fiscal-kb] ingest', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
