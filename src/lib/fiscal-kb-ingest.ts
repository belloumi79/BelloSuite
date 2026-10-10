/**
 * Base de connaissances fiscale tunisienne — ingestion (upsert des chunks + embeddings Gemini).
 *
 * - Embeddings GRATUITS : Google AI Studio, modèle `gemini-embedding-001` (env GEMINI_EMBED_MODEL),
 *   outputDimensionality = 768, vecteurs re-normalisés (obligatoire hors 3072 dims) → distance cosinus.
 * - Idempotent : une ligne n'est ré-embeddée que si son contenu change (content_hash) ;
 *   reprise naturelle : on ne traite que `embedding IS NULL`.
 * - Utilisé par la route admin POST /api/admin/fiscal-kb/ingest et par scripts/fiscal-kb/ingest.ts.
 */

export const FISCAL_EMBED_DIMS = 768
export const DEFAULT_EMBED_MODEL = 'gemini-embedding-001'
/** Limite de l'API batchEmbedContents. */
export const MAX_EMBED_BATCH = 100

/** Sous-ensemble de PrismaClient utilisé ici (mockable dans les tests). */
export interface RawDb {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export interface FiscalChunkInput {
  id: string
  code: string
  article: string | null
  section: string | null
  title: string
  version: string
  lang: 'fr' | 'ar'
  sourceUrl: string
  outdated: boolean
  kind: string
  part: number
  parts: number
  content: string
  contentHash: string
  tokens: number
}

export type EmbedTask = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'

export interface EmbedConfig {
  apiKey: string
  model?: string
  dims?: number
}

export class EmbedHttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'EmbedHttpError'
  }
}

export function embedConfigFromEnv(env: Record<string, string | undefined> = process.env): EmbedConfig | null {
  if (!env.GEMINI_API_KEY) return null
  return { apiKey: env.GEMINI_API_KEY, model: env.GEMINI_EMBED_MODEL || DEFAULT_EMBED_MODEL, dims: FISCAL_EMBED_DIMS }
}

export function normalize(v: number[]): number[] {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0))
  return n > 0 ? v.map((x) => x / n) : v
}

/** Littéral pgvector : "[0.1,0.2,...]" (passé en paramètre puis casté en ::extensions.vector). */
export function toVectorLiteral(v: number[]): string {
  if (!v.every((x) => Number.isFinite(x))) throw new Error('vecteur invalide')
  return `[${v.join(',')}]`
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Embeddings d'un lot de textes (≤ 100). Réessaie sur 429/503 avec backoff ;
 * lève EmbedHttpError sinon (la clé n'apparaît jamais dans les messages).
 */
export async function embedTexts(
  texts: string[],
  cfg: EmbedConfig,
  opts: { task?: EmbedTask; titles?: (string | undefined)[]; fetchImpl?: FetchLike; retries?: number; backoffMs?: number } = {},
): Promise<number[][]> {
  if (texts.length === 0) return []
  if (texts.length > MAX_EMBED_BATCH) throw new Error(`lot trop grand (${texts.length} > ${MAX_EMBED_BATCH})`)
  const model = cfg.model || DEFAULT_EMBED_MODEL
  const dims = cfg.dims || FISCAL_EMBED_DIMS
  const task = opts.task || 'RETRIEVAL_DOCUMENT'
  const f: FetchLike = opts.fetchImpl || ((i, init) => fetch(i, init))
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:batchEmbedContents`
  const body = {
    requests: texts.map((t, i) => ({
      model: `models/${model}`,
      content: { parts: [{ text: t.slice(0, 8000) }] },
      taskType: task,
      ...(task === 'RETRIEVAL_DOCUMENT' && opts.titles?.[i] ? { title: opts.titles[i] } : {}),
      outputDimensionality: dims,
    })),
  }
  const retries = opts.retries ?? 3
  const backoff = opts.backoffMs ?? 2000
  for (let attempt = 0; ; attempt++) {
    const res = await f(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.apiKey },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const json = (await res.json()) as { embeddings?: Array<{ values?: number[] }> }
      const out = (json.embeddings || []).map((e) => e.values || [])
      if (out.length !== texts.length || out.some((v) => v.length !== dims)) {
        throw new EmbedHttpError(502, `réponse d'embedding inattendue (${out.length} vecteurs)`)
      }
      return out.map(normalize)
    }
    if ((res.status === 429 || res.status === 503 || res.status === 500) && attempt < retries) {
      await sleep(backoff * 2 ** attempt)
      continue
    }
    throw new EmbedHttpError(res.status, `embedding HTTP ${res.status}`)
  }
}

const UPSERT_SQL = `
INSERT INTO public.fiscal_chunks (id, code, article, section, title, version, lang, source_url, outdated, kind, part, parts, content, content_hash, tokens)
SELECT id, code, article, section, title, version, lang, "sourceUrl", outdated, kind, part, parts, content, "contentHash", tokens
FROM jsonb_to_recordset($1::jsonb) AS r(id text, code text, article text, section text, title text, version text, lang text,
  "sourceUrl" text, outdated boolean, kind text, part int, parts int, content text, "contentHash" text, tokens int)
ON CONFLICT (id) DO UPDATE SET
  code = excluded.code, article = excluded.article, section = excluded.section, title = excluded.title,
  version = excluded.version, lang = excluded.lang, source_url = excluded.source_url, outdated = excluded.outdated,
  kind = excluded.kind, part = excluded.part, parts = excluded.parts, content = excluded.content,
  content_hash = excluded.content_hash, tokens = excluded.tokens, updated_at = now(),
  embedding = CASE WHEN fiscal_chunks.content_hash = excluded.content_hash THEN fiscal_chunks.embedding END,
  embedding_model = CASE WHEN fiscal_chunks.content_hash = excluded.content_hash THEN fiscal_chunks.embedding_model END,
  embedded_at = CASE WHEN fiscal_chunks.content_hash = excluded.content_hash THEN fiscal_chunks.embedded_at END
WHERE fiscal_chunks.content_hash IS DISTINCT FROM excluded.content_hash
   OR fiscal_chunks.section IS DISTINCT FROM excluded.section
   OR fiscal_chunks.outdated IS DISTINCT FROM excluded.outdated`

/** Upsert idempotent (un embedding n'est effacé que si le contenu a changé). Renvoie le nb de lignes écrites. */
export async function upsertChunks(db: RawDb, chunks: FiscalChunkInput[], batchSize = 200): Promise<number> {
  let written = 0
  for (let i = 0; i < chunks.length; i += batchSize) {
    written += await db.$executeRawUnsafe(UPSERT_SQL, JSON.stringify(chunks.slice(i, i + batchSize)))
  }
  return written
}

export interface EmbedPendingResult {
  embedded: number
  remaining: number
  error?: { status: number; message: string }
}

/** Embeddé jusqu'à `limit` chunks sans embedding (lots de `batch`), avec pause entre lots. */
export async function embedPending(
  db: RawDb,
  cfg: EmbedConfig,
  opts: { limit?: number; batch?: number; delayMs?: number; fetchImpl?: FetchLike; deadlineMs?: number; backoffMs?: number } = {},
): Promise<EmbedPendingResult> {
  const limit = Math.max(1, Math.min(opts.limit ?? 50, 1000))
  const batch = Math.max(1, Math.min(opts.batch ?? 20, MAX_EMBED_BATCH))
  const started = Date.now()
  const rows = await db.$queryRawUnsafe<Array<{ id: string; content: string; title: string; article: string | null }>>(
    `SELECT id, content, title, article FROM public.fiscal_chunks WHERE embedding IS NULL ORDER BY id LIMIT $1`,
    limit,
  )
  let embedded = 0
  let error: EmbedPendingResult['error']
  for (let i = 0; i < rows.length; i += batch) {
    if (opts.deadlineMs && Date.now() - started > opts.deadlineMs) break
    const slice = rows.slice(i, i + batch)
    try {
      const vecs = await embedTexts(
        slice.map((r) => r.content),
        cfg,
        { task: 'RETRIEVAL_DOCUMENT', titles: slice.map((r) => (r.article ? `${r.title} — art. ${r.article}` : r.title)), fetchImpl: opts.fetchImpl, backoffMs: opts.backoffMs },
      )
      for (let j = 0; j < slice.length; j++) {
        await db.$executeRawUnsafe(
          `UPDATE public.fiscal_chunks SET embedding = $1::extensions.vector, embedding_model = $2, embedded_at = now() WHERE id = $3`,
          toVectorLiteral(vecs[j]),
          `${cfg.model || DEFAULT_EMBED_MODEL}@${cfg.dims || FISCAL_EMBED_DIMS}`,
          slice[j].id,
        )
        embedded++
      }
    } catch (e) {
      error = e instanceof EmbedHttpError ? { status: e.status, message: e.message } : { status: 500, message: 'erreur embedding' }
      break
    }
    if (opts.delayMs && i + batch < rows.length) await sleep(opts.delayMs)
  }
  const [{ count }] = await db.$queryRawUnsafe<Array<{ count: bigint | number }>>(
    `SELECT count(*) AS count FROM public.fiscal_chunks WHERE embedding IS NULL`,
  )
  return { embedded, remaining: Number(count), ...(error ? { error } : {}) }
}

export async function fiscalKbStats(db: RawDb) {
  const rows = await db.$queryRawUnsafe<Array<{ code: string; version: string; lang: string; total: bigint | number; embedded: bigint | number }>>(
    `SELECT code, version, lang, count(*) AS total, count(embedding) AS embedded FROM public.fiscal_chunks GROUP BY 1, 2, 3 ORDER BY 1, 2, 3`,
  )
  return rows.map((r) => ({ ...r, total: Number(r.total), embedded: Number(r.embedded) }))
}
