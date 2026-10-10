/** Base de connaissances fiscale : ingestion (embeddings Gemini, upsert) + recherche hybride. DB et fetch mockés. */
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  embedTexts,
  embedPending,
  upsertChunks,
  normalize,
  toVectorLiteral,
  embedConfigFromEnv,
  EmbedHttpError,
  type RawDb,
  type FiscalChunkInput,
} from '@/lib/fiscal-kb-ingest'
import { searchFiscalKb, mergeRrf, citationFor, toOrQuery, formatContext, type FiscalChunkRow } from '@/lib/fiscal-kb'

const DIMS = 768
const vec = (seed: number) => Array.from({ length: DIMS }, (_, i) => ((i * 7 + seed) % 13) - 6)

function okResponse(json: unknown): Response {
  return { ok: true, status: 200, json: async () => json } as unknown as Response
}
function errResponse(status: number): Response {
  return { ok: false, status, json: async () => ({}) } as unknown as Response
}

function row(id: string, over: Partial<FiscalChunkRow> = {}): FiscalChunkRow {
  return {
    id, code: 'TVA', article: '7', section: null, title: 'Code TVA', version: '2026', lang: 'fr',
    source_url: 'https://jibaya.tn/x.pdf', outdated: false, part: 1, parts: 1, content: `contenu ${id}`, score: 1, ...over,
  }
}

function mockDb(handler: (sql: string, params: unknown[]) => unknown): RawDb & { calls: Array<{ sql: string; params: unknown[] }> } {
  const calls: Array<{ sql: string; params: unknown[] }> = []
  return {
    calls,
    $queryRawUnsafe: jest.fn(async (sql: string, ...params: unknown[]) => { calls.push({ sql, params }); return handler(sql, params) }) as RawDb['$queryRawUnsafe'],
    $executeRawUnsafe: jest.fn(async (sql: string, ...params: unknown[]) => { calls.push({ sql, params }); return (handler(sql, params) as number) ?? 1 }),
  }
}

describe('embedTexts (Gemini batchEmbedContents)', () => {
  const cfg = { apiKey: 'k', model: 'gemini-embedding-001', dims: DIMS }

  it('envoie outputDimensionality=768, taskType, et renvoie des vecteurs normalisés', async () => {
    const fetchImpl = jest.fn(async () => okResponse({ embeddings: [{ values: vec(1) }, { values: vec(2) }] }))
    const out = await embedTexts(['a', 'b'], cfg, { fetchImpl, titles: ['T1', undefined] })
    expect(out).toHaveLength(2)
    for (const v of out) expect(Math.hypot(...v)).toBeCloseTo(1, 6)
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain('models/gemini-embedding-001:batchEmbedContents')
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('k')
    const body = JSON.parse(init.body as string)
    expect(body.requests[0]).toMatchObject({ taskType: 'RETRIEVAL_DOCUMENT', outputDimensionality: 768, title: 'T1' })
    expect(body.requests[1].title).toBeUndefined()
  })

  it('réessaie sur 429 puis réussit', async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(errResponse(429))
      .mockResolvedValueOnce(okResponse({ embeddings: [{ values: vec(3) }] }))
    const out = await embedTexts(['a'], cfg, { fetchImpl, backoffMs: 1 })
    expect(out).toHaveLength(1)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('lève EmbedHttpError sans divulguer la clé', async () => {
    const fetchImpl = jest.fn(async () => errResponse(403))
    await expect(embedTexts(['a'], { ...cfg, apiKey: 'SECRET-KEY' }, { fetchImpl })).rejects.toThrow(EmbedHttpError)
    await expect(embedTexts(['a'], { ...cfg, apiKey: 'SECRET-KEY' }, { fetchImpl })).rejects.not.toThrow(/SECRET-KEY/)
  })

  it('rejette une dimension inattendue et les lots > 100', async () => {
    const fetchImpl = jest.fn(async () => okResponse({ embeddings: [{ values: [1, 2, 3] }] }))
    await expect(embedTexts(['a'], cfg, { fetchImpl })).rejects.toThrow(EmbedHttpError)
    await expect(embedTexts(Array(101).fill('x'), cfg, { fetchImpl })).rejects.toThrow(/lot trop grand/)
  })

  it('utilitaires : normalize, toVectorLiteral, config env', () => {
    expect(normalize([3, 4])).toEqual([0.6, 0.8])
    expect(toVectorLiteral([0.5, -1])).toBe('[0.5,-1]')
    expect(() => toVectorLiteral([NaN])).toThrow()
    expect(embedConfigFromEnv({})).toBeNull()
    expect(embedConfigFromEnv({ GEMINI_API_KEY: 'k' })).toEqual({ apiKey: 'k', model: 'gemini-embedding-001', dims: 768 })
  })
})

describe('upsertChunks / embedPending', () => {
  const chunk = (i: number): FiscalChunkInput => ({
    id: `id${i}xxxxxxxx`, code: 'TVA', article: '7', section: null, title: 'T', version: '2026', lang: 'fr',
    sourceUrl: 'https://jibaya.tn/x.pdf', outdated: false, kind: 'code', part: 1, parts: 1, content: 'c', contentHash: 'a'.repeat(64), tokens: 1,
  })

  it('upsert par lots en JSON, conserve l’embedding si le hash est inchangé', async () => {
    const db = mockDb(() => 2)
    const n = await upsertChunks(db, Array.from({ length: 5 }, (_, i) => chunk(i)), 2)
    expect(n).toBe(6) // 3 lots × 2
    expect(db.calls).toHaveLength(3)
    expect(db.calls[0].sql).toMatch(/ON CONFLICT \(id\) DO UPDATE/)
    expect(db.calls[0].sql).toMatch(/content_hash = excluded.content_hash THEN fiscal_chunks.embedding/)
    expect(JSON.parse(db.calls[0].params[0] as string)).toHaveLength(2)
  })

  it('embedPending : embeddé les lignes sans embedding et renvoie le reste', async () => {
    const db = mockDb((sql) => {
      if (sql.includes('WHERE embedding IS NULL ORDER BY')) return [{ id: 'a', content: 'x', title: 'T', article: '7' }, { id: 'b', content: 'y', title: 'T', article: null }]
      if (sql.startsWith('SELECT count(*)')) return [{ count: BigInt(3) }]
      return 1
    })
    const fetchImpl = jest.fn(async () => okResponse({ embeddings: [{ values: vec(1) }, { values: vec(2) }] }))
    const r = await embedPending(db, { apiKey: 'k' }, { fetchImpl, batch: 10 })
    expect(r).toEqual({ embedded: 2, remaining: 3 })
    const updates = db.calls.filter((c) => c.sql.startsWith('UPDATE'))
    expect(updates).toHaveLength(2)
    expect(updates[0].sql).toContain('::extensions.vector')
    expect(updates[0].params[1]).toBe('gemini-embedding-001@768')
  })

  it('embedPending : quota (429 persistant) → arrêt propre avec erreur', async () => {
    const db = mockDb((sql) => (sql.includes('ORDER BY') ? [{ id: 'a', content: 'x', title: 'T', article: null }] : sql.startsWith('SELECT count') ? [{ count: 1 }] : 1))
    const fetchImpl = jest.fn(async () => errResponse(429))
    const r = await embedPending(db, { apiKey: 'k' }, { fetchImpl, backoffMs: 1 })
    expect(r.embedded).toBe(0)
    expect(r.remaining).toBe(1)
    expect(r.error?.status).toBe(429)
  }, 20_000)
})

describe('recherche hybride', () => {
  it('toOrQuery : termes uniques, chiffres gardés, arabe sans harakat', () => {
    expect(toOrQuery('Taux de TVA 19 % — taux ?')).toBe('Taux or de or TVA or 19 or taux')
    expect(toOrQuery('الطَّابع الجبائي')).toBe('الطابع or الجبائي')
    expect(toOrQuery('  ?! ')).toBe('')
  })

  it('citationFor : libellé FR/AR, version périmée signalée', () => {
    expect(citationFor(row('1')).label).toBe('Code de la TVA 2026, art. 7')
    expect(citationFor(row('1', { lang: 'ar', article: '13 ثالثا' })).label).toBe('Code de la TVA 2026, الفصل 13 ثالثا [texte arabe]')
    expect(citationFor(row('1', { version: '2017', outdated: true, part: 2, parts: 3 })).label).toBe(
      'Code de la TVA 2017, art. 7 (partie 2/3) [version antérieure — à vérifier]',
    )
    expect(citationFor(row('1', { code: 'LF2026', article: '53' })).label).toBe('Loi de finances 2026 (loi n° 2025-17), art. 53')
  })

  it('mergeRrf : un chunk trouvé par les deux voies passe devant ; périmé pénalisé ou exclu', () => {
    const v = [row('a'), row('b'), row('old', { outdated: true })]
    const f = [row('b'), row('c'), row('old', { outdated: true })]
    const hits = mergeRrf([{ source: 'vector', rows: v }, { source: 'fulltext', rows: f }])
    expect(hits[0].id).toBe('b')
    expect(hits[0].matchedBy.sort()).toEqual(['fulltext', 'vector'])
    expect(hits[hits.length - 1].id).toBe('old')
    expect(mergeRrf([{ source: 'vector', rows: v }], { outdated: 'exclude' }).map((h) => h.id)).toEqual(['a', 'b'])
  })

  it('sans clé Gemini : plein texte seul, aucun appel réseau', async () => {
    const db = mockDb((sql) => (sql.includes('ts_rank_cd') ? [row('ft1'), row('ft2')] : []))
    const fetchImpl = jest.fn()
    const r = await searchFiscalKb('taux TVA 19', { db, embed: null, fetchImpl }, { codes: ['TVA'], outdated: 'exclude' })
    expect(r.mode).toBe('fulltext')
    expect(r.hits.map((h) => h.id)).toEqual(['ft1', 'ft2'])
    expect(fetchImpl).not.toHaveBeenCalled()
    const ft = db.calls.find((c) => c.sql.includes('ts_rank_cd'))!
    expect(ft.sql).toContain("websearch_to_tsquery('arabic', $1)")
    expect(ft.sql).toContain('code = ANY($3::text[])')
    expect(ft.sql).toContain('NOT outdated')
    expect(ft.params).toEqual(['taux or TVA or 19', 'taux TVA 19', ['TVA'], 24])
  })

  it('avec clé + embeddings en base : hybride (requête embeddée en RETRIEVAL_QUERY)', async () => {
    const db = mockDb((sql) => {
      if (sql.includes('EXISTS')) return [{ ok: true }]
      if (sql.includes('<=>')) return [row('v1'), row('both')]
      if (sql.includes('ts_rank_cd')) return [row('both'), row('f1')]
      return []
    })
    const fetchImpl = jest.fn(async () => okResponse({ embeddings: [{ values: vec(5) }] }))
    const r = await searchFiscalKb('retenue à la source loyers', { db, embed: { apiKey: 'k' }, fetchImpl }, { limit: 3 })
    expect(r.mode).toBe('hybrid')
    expect(r.hits[0].id).toBe('both')
    expect(r.hits).toHaveLength(3)
    const body = JSON.parse((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(body.requests[0].taskType).toBe('RETRIEVAL_QUERY')
    expect(body.requests[0].title).toBeUndefined()
  })

  it('embedding de la requête en échec : repli plein texte sans erreur', async () => {
    const db = mockDb((sql) => (sql.includes('EXISTS') ? [{ ok: true }] : sql.includes('ts_rank_cd') ? [row('f1')] : []))
    const fetchImpl = jest.fn(async () => errResponse(500))
    const r = await searchFiscalKb('timbre facture', { db, embed: { apiKey: 'k' }, fetchImpl })
    expect(r.mode).toBe('fulltext')
    expect(r.hits.map((h) => h.id)).toEqual(['f1'])
  }, 20_000)

  it('requête vide : aucun appel DB ; formatContext numérote les citations', async () => {
    const db = mockDb(() => [])
    expect(await searchFiscalKb('   ', { db, embed: null })).toEqual({ mode: 'fulltext', hits: [] })
    expect(db.calls).toHaveLength(0)
    const ctx = formatContext(mergeRrf([{ source: 'fulltext', rows: [row('a'), row('b')] }]))
    expect(ctx).toMatch(/^\[1\] Code de la TVA 2026, art\. 7\nSource : https:\/\/jibaya\.tn\/x\.pdf/)
    expect(ctx).toContain('[2] ')
  })
})

describe('corpus data/fiscal-kb (contrôles ponctuels)', () => {
  const chunks = readFileSync(join(__dirname, '..', 'data', 'fiscal-kb', 'chunks.jsonl'), 'utf8')
    .split('\n').filter(Boolean).map((l) => JSON.parse(l) as FiscalChunkInput)
  const art = (code: string, version: string, a: string) => chunks.filter((c) => c.code === code && c.version === version && c.article === a).map((c) => c.content).join('\n')

  it('métadonnées complètes, ids uniques, chunks bornés', () => {
    expect(new Set(chunks.map((c) => c.id)).size).toBe(chunks.length)
    for (const c of chunks) {
      expect(c.sourceUrl).toMatch(/^https:\/\/(jibaya\.tn|lake\.jort\.tn|www\.finances\.gov\.tn)\//)
      expect(['fr', 'ar']).toContain(c.lang)
      expect(c.content.length).toBeLessThan(5000)
    }
  })

  it('TVA 2026 art. 7 : taux 19 %, 13 %, 7 %', () => {
    const t = art('TVA', '2026', '7')
    expect(t).toMatch(/%\s?19|19\s?%/)
    expect(t).toMatch(/%\s?13|13\s?%/)
    expect(t).toMatch(/%\s?7|7\s?%/)
  })

  it('Timbre : 1 dinar par facture (DET art. 117) ; IRPP/IS art. 52 : retenue à la source', () => {
    expect(art('DET', '2025', '117')).toMatch(/Les factures[\s\S]{0,200}1,000 par facture/)
    expect(art('IRPP_IS', '2026', '52')).toMatch(/retenue à la source/)
  })

  it('FODEC : taxe professionnelle de 1 % ; LF 2026 présente', () => {
    expect(chunks.filter((c) => c.code === 'FODEC').map((c) => c.content).join(' ')).toMatch(/taxe professionnelle au\s+taux de 1%/)
    expect(art('LF2026', '2026', '1')).toMatch(/budget de l.Etat pour l.année 2026/)
  })
})
