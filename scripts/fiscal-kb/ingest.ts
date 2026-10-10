/**
 * Ingestion de la base de connaissances fiscale (data/fiscal-kb/chunks.jsonl → table fiscal_chunks).
 * Idempotent et reprenable : upsert par id (embedding conservé si content_hash inchangé),
 * puis embeddings uniquement pour `embedding IS NULL`.
 *
 * Mode local (DATABASE_URL + GEMINI_API_KEY dans l'environnement) :
 *   npx tsx scripts/fiscal-kb/ingest.ts [--no-embed] [--batch 20] [--delay 1500] [--max 2000]
 *
 * Mode distant (la clé Gemini reste dans Vercel) : appelle la route admin en boucle
 * jusqu'à remaining = 0, avec un cookie de session SUPER_ADMIN :
 *   BELLO_SESSION=<cookie bello_session> npx tsx scripts/fiscal-kb/ingest.ts --remote https://bellosuite.vercel.app [--upload]
 *   (--upload envoie aussi les chunks par lots de 100 avant d'embedder)
 *
 * Quota gratuit Gemini : le script s'arrête proprement sur 429 persistant ; relancez plus tard.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { PrismaClient } from '@prisma/client'
import { embedConfigFromEnv, embedPending, fiscalKbStats, upsertChunks, type FiscalChunkInput } from '../../src/lib/fiscal-kb-ingest'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const flag = (name: string) => process.argv.includes(`--${name}`)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function loadChunks(): FiscalChunkInput[] {
  const file = arg('file') || join(process.cwd(), 'data', 'fiscal-kb', 'chunks.jsonl')
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as FiscalChunkInput)
}

async function remote(base: string) {
  const cookie = process.env.BELLO_SESSION
  if (!cookie) throw new Error('BELLO_SESSION (cookie bello_session SUPER_ADMIN) requis en mode --remote')
  const url = `${base.replace(/\/$/, '')}/api/admin/fiscal-kb/ingest`
  const headers = { 'Content-Type': 'application/json', Cookie: `bello_session=${cookie}` }
  if (flag('upload')) {
    const chunks = loadChunks()
    for (let i = 0; i < chunks.length; i += 100) {
      const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ chunks: chunks.slice(i, i + 100), embed: false }) })
      console.log(`upload ${i}-${i + 99}: HTTP ${r.status}`, await r.text())
      if (!r.ok) return
    }
  }
  const max = Number(arg('max') || 5000)
  let done = 0
  for (let round = 0; done < max; round++) {
    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ limit: 60, batch: Number(arg('batch') || 20) }) })
    const j = (await r.json().catch(() => ({}))) as { embedded?: number; remaining?: number; error?: { status: number } }
    console.log(`round ${round}: HTTP ${r.status}`, j)
    done += j.embedded || 0
    if (!r.ok && !(j.embedded && j.embedded > 0)) {
      if (j.error?.status === 429) console.log('Quota Gemini atteint : relancez plus tard (reprise automatique).')
      return
    }
    if (!j.remaining) return
    await sleep(Number(arg('delay') || 1500))
  }
}

async function local() {
  const prisma = new PrismaClient()
  try {
    const chunks = loadChunks()
    const written = await upsertChunks(prisma, chunks)
    console.log(`upsert : ${chunks.length} chunks lus, ${written} lignes écrites/modifiées`)
    if (!flag('no-embed')) {
      const cfg = embedConfigFromEnv()
      if (!cfg) {
        console.log('GEMINI_API_KEY absente : embeddings non calculés (le plein texte fonctionne déjà).')
      } else {
        const max = Number(arg('max') || 5000)
        let total = 0
        while (total < max) {
          const r = await embedPending(prisma, cfg, { limit: 100, batch: Number(arg('batch') || 20), delayMs: Number(arg('delay') || 1500) })
          total += r.embedded
          console.log(`embeddés : +${r.embedded} (total ${total}), restants ${r.remaining}${r.error ? `, erreur HTTP ${r.error.status}` : ''}`)
          if (r.error || r.remaining === 0 || r.embedded === 0) break
        }
      }
    }
    console.table(await fiscalKbStats(prisma))
  } finally {
    await prisma.$disconnect()
  }
}

const base = arg('remote')
;(base ? remote(base) : local()).catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
