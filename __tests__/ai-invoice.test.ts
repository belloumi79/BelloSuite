import { aiProvider, aiProviders, extractWithAi, parseAiJson, parseAiJsonDetailed, callAi, extractRequestSchema, coerceAmount, isIncomplete, resolveAmbiguous, DEFAULT_GEMINI_MODEL, DEFAULT_GROQ_MODEL } from '@/lib/ai-invoice'
import { extractInvoice, mergeAiExtraction, emptyExtraction } from '@/lib/invoice-extract'

describe('ai-invoice', () => {
  it('aucun fournisseur sans clé ; Gemini prioritaire ; modèles surchargeables', () => {
    expect(aiProvider({})).toBeNull()
    expect(aiProvider({ GROQ_API_KEY: 'g' })).toEqual({ name: 'groq', key: 'g', model: DEFAULT_GROQ_MODEL })
    expect(aiProvider({ GEMINI_API_KEY: 'k', GROQ_API_KEY: 'g' })).toEqual({ name: 'gemini', key: 'k', model: DEFAULT_GEMINI_MODEL })
    expect(aiProvider({ GEMINI_API_KEY: 'k', GEMINI_MODEL: 'gemini-3.8-flash' })?.model).toBe('gemini-3.8-flash')
    expect(aiProviders({ GEMINI_API_KEY: 'k', GROQ_API_KEY: 'g' }).map((p) => p.name)).toEqual(['gemini', 'groq'])
    expect(aiProviders({})).toEqual([])
  })

  it('parseAiJson : JSON entouré, <think>, valeurs invalides neutralisées', () => {
    const raw = '<think>calculs</think>```json\n{"supplierName":"X SARL","total":"1 191,000","subtotal":1000,"date":42,"vat":[{"rate":19,"amount":190}],"lines":"nope","extra":1}\n```'
    const r = parseAiJson(raw)
    expect(r).toMatchObject({ supplierName: 'X SARL', total: 1191, subtotal: 1000, date: null, vat: [{ rate: 19, amount: 190 }], lines: null })
    expect(parseAiJson('pas de json')).toBeNull()
    expect(parseAiJson('{cassé')).toBeNull()
  })

  it('schéma de requête : image data URL uniquement', () => {
    expect(extractRequestSchema.safeParse({ text: 'a', image: 'data:image/png;base64,AAAA' }).success).toBe(true)
    expect(extractRequestSchema.safeParse({ text: 'a', image: 'https://evil.example/x.png' }).success).toBe(false)
    expect(extractRequestSchema.safeParse({ text: 'x'.repeat(30_001) }).success).toBe(false)
  })

  describe('callAi (fetch simulé)', () => {
    const realFetch = global.fetch
    afterEach(() => { global.fetch = realFetch })

    it('Gemini : generateContent + JSON', async () => {
      const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"total":5951,"stamp":1}' }] } }] }) })
      global.fetch = fetchMock as unknown as typeof fetch
      const r = await callAi({ name: 'gemini', key: 'k', model: 'gemini-3.5-flash-lite' }, 'Total TTC 5 951,000', 'data:image/png;base64,AAAA')
      expect(r).toMatchObject({ total: 5951, stamp: 1 })
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toContain('/models/gemini-3.5-flash-lite:generateContent')
      expect(init.headers['x-goog-api-key']).toBe('k')
      const body = JSON.parse(init.body)
      expect(body.contents[0].parts[1].inline_data.mime_type).toBe('image/png')
      expect(body.generationConfig.responseMimeType).toBe('application/json')
      expect(body.generationConfig.responseSchema.type).toBe('OBJECT')
    })

    it('Gemini : schéma refusé (400) → une seule nouvelle tentative sans schéma', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
      const fetchMock = jest.fn()
        .mockResolvedValueOnce({ ok: false, status: 400 })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"invoiceNumber":"FA-9"}' }] } }] }) })
      global.fetch = fetchMock as unknown as typeof fetch
      expect(await callAi({ name: 'gemini', key: 'k', model: 'm' }, 'x')).toMatchObject({ invoiceNumber: 'FA-9' })
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(JSON.parse(fetchMock.mock.calls[1][1].body).generationConfig.responseSchema).toBeUndefined()
      warn.mockRestore()
    })

    it('quota Gemini (429) → repli Groq ; tout en échec → null', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
      const providers = aiProviders({ GEMINI_API_KEY: 'k', GROQ_API_KEY: 'g' })
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: false, status: 429 })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: '{"total":10}' } }] }) }) as unknown as typeof fetch
      expect(await extractWithAi(providers, 'x')).toEqual({ provider: 'groq', result: expect.objectContaining({ total: 10 }), warnings: [] })
      global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch
      expect(await extractWithAi(providers, 'x')).toBeNull()
      warn.mockRestore()
    })

    it('Groq : chat completions, json_object', async () => {
      const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: '{"invoiceNumber":"F-1"}' } }] }) })
      global.fetch = fetchMock as unknown as typeof fetch
      const r = await callAi({ name: 'groq', key: 'g', model: DEFAULT_GROQ_MODEL }, 'Facture F-1')
      expect(r).toMatchObject({ invoiceNumber: 'F-1' })
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.response_format).toEqual({ type: 'json_object' })
      expect(body.model).toBe(DEFAULT_GROQ_MODEL)
    })

    it('erreur HTTP → null, sans journaliser le contenu', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429 }) as unknown as typeof fetch
      expect(await callAi({ name: 'groq', key: 'g', model: 'm' }, 'SECRET-CONTENT')).toBeNull()
      expect(JSON.stringify(warn.mock.calls)).not.toContain('SECRET-CONTENT')
      warn.mockRestore()
    })
  })
})

describe('ai-invoice : nombres TN / FR robustes', () => {
  it.each([
    [7344.609, 7344.609],
    ['7344.609', 7344.609],
    ['7.344,609', 7344.609],
    ['7 344,609', 7344.609],
    ['7\u00a0344,609', 7344.609],
    ['7\u202f344,609 DT', 7344.609],
    ['6110,000 DT', 6110],
    ['6110,000 TND', 6110],
    ['TND 12,500', 12.5],
    ['1,250.000', 1250],
    ['1.250.000,000', 1250000],
    ['  19 ', 19],
    ['0,600', 0.6],
    ['7.344', 7.344],
    ['+5', 5],
  ])('coerceAmount(%p) = %p', (raw, expected) => {
    expect(coerceAmount(raw)).toBe(expected)
  })

  it.each([[null], [undefined], [''], ['N/A'], ['illisible'], ['2026-01-05'], [{}], [[]], [Number.NaN], [Number.POSITIVE_INFINITY], [true]])('coerceAmount(%p) = null', (raw) => {
    expect(coerceAmount(raw)).toBeNull()
  })

  it('un champ invalide → null pour ce champ seulement', () => {
    const r = parseAiJson(JSON.stringify({ supplierName: 'ALPHA SARL', subtotal: '6110,000 DT', fodec: 'n/a', vatTotal: '1 172,509', stamp: 1, total: '7.344,609' }))
    expect(r).toMatchObject({ supplierName: 'ALPHA SARL', subtotal: 6110, fodec: null, vatTotal: 1172.509, stamp: 1, total: 7344.609 })
  })

  it('une ligne invalide est retirée seule, les autres sont gardées', () => {
    const { result, diag } = parseAiJsonDetailed(JSON.stringify({
      total: 100,
      lines: [
        { designation: 'Fil coton', quantity: '10', unitPrice: '5,000', total: '50,000' },
        { designation: 'Ligne cassée', quantity: 'beaucoup', unitPrice: 1, total: 1 },
        { designation: '', quantity: 1, unitPrice: 1, total: 1 },
        'pas un objet',
        { reference: 'T-2', designation: 'Teinture', quantity: 2, unitPrice: '25', total: '50' },
      ],
      vat: [{ rate: '19', amount: '19,000' }, { rate: 'x', amount: 1 }],
    }))
    expect(result?.lines).toEqual([
      { designation: 'Fil coton', quantity: 10, unitPrice: 5, total: 50 },
      { reference: 'T-2', designation: 'Teinture', quantity: 2, unitPrice: 25, total: 50 },
    ])
    expect(result?.vat).toEqual([{ rate: 19, base: null, amount: 19 }])
    expect(diag).toMatchObject({ linesIn: 5, linesKept: 2 })
    expect(diag?.issues).toEqual(expect.arrayContaining(['lines.1.quantity:custom', 'vat.1.rate:custom']))
    expect(diag?.issues.some((i) => i.startsWith('lines.2.designation'))).toBe(true)
  })

  it('diagnostic : types et clés nulles uniquement, aucune valeur', () => {
    const { diag } = parseAiJsonDetailed(JSON.stringify({ supplierName: 'SECRET FOURNISSEUR', total: '7.344,609', subtotal: null, lines: [] }))
    expect(diag?.numericTypes).toEqual({ subtotal: 'null', fodec: 'missing', vatTotal: 'missing', stamp: 'missing', total: 'string' })
    expect(diag?.nullKeys).toEqual(expect.arrayContaining(['subtotal', 'fodec', 'matriculeFiscal']))
    expect(diag?.stringNumbers).toBe(1)
    const s = JSON.stringify(diag)
    expect(s).not.toContain('SECRET')
    expect(s).not.toContain('7344')
  })

  it('« 7.344 » ambigu : relu en milliers seulement si l’arithmétique le confirme', () => {
    // ligne : 2 × 3.672 = 7.344 (millimes) → inchangé ; 1 × 7.344 vs total 7344 → milliers
    const a: Record<string, unknown> = { lines: [{ quantity: 2, unitPrice: 3.672, total: '7.344' }, { quantity: 1, unitPrice: '7.344', total: 7344 }] }
    expect(resolveAmbiguous(a)).toBe(1)
    expect((a.lines as Array<Record<string, unknown>>)[0].total).toBe('7.344')
    expect((a.lines as Array<Record<string, unknown>>)[1].unitPrice).toBe(7344)
    // pied : HT 6.110 (= 6110) + FODEC 61,1 + TVA 1172,509 + timbre 1 = 7344,609
    const b: Record<string, unknown> = { subtotal: '6.110', fodec: 61.1, vatTotal: '1 172,509', stamp: 1, total: '7.344,609' }
    expect(resolveAmbiguous(b)).toBe(1)
    expect(parseAiJson(JSON.stringify({ subtotal: '6.110', fodec: 61.1, vatTotal: '1 172,509', stamp: 1, total: '7.344,609' }))).toMatchObject({ subtotal: 6110, total: 7344.609 })
    // aucune lecture cohérente → lecture par défaut (millimes)
    expect(parseAiJson(JSON.stringify({ subtotal: '6.110', total: 99 }))).toMatchObject({ subtotal: 6.11 })
  })

  it('isIncomplete : ni HT ni TTC et pas de lignes, ou totaux trouvés par l’extraction déterministe', () => {
    expect(isIncomplete(null)).toBe(true)
    expect(isIncomplete({ supplierName: 'X', total: null, subtotal: null, lines: [] })).toBe(true)
    expect(isIncomplete({ total: 10 })).toBe(false)
    const lines = [{ designation: 'a', quantity: 1, unitPrice: 1, total: 1 }]
    expect(isIncomplete({ lines })).toBe(false)
    const det = emptyExtraction(); det.total = { value: 10, confidence: 0.8 }
    expect(isIncomplete({ lines }, det)).toBe(true)
  })
})

describe('extractWithAi : relance si réponse incomplète (fetch simulé)', () => {
  const realFetch = global.fetch
  let warn: jest.SpyInstance
  beforeEach(() => { warn = jest.spyOn(console, 'warn').mockImplementation(() => {}) })
  afterEach(() => { global.fetch = realFetch; warn.mockRestore() })
  const gemini = (text: string) => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }) })
  const groq = (content: string) => ({ ok: true, json: async () => ({ choices: [{ message: { content } }] }) })
  const PARTIAL = JSON.stringify({ supplierName: 'SECRET ALPHA', subtotal: '6110,000 DT x', total: 'sept mille', lines: [{ designation: 'Fil', quantity: 'dix', unitPrice: 1, total: 1 }] })
  const FULL = JSON.stringify({ supplierName: 'ALPHA', subtotal: '6.110,000', fodec: '61,100', vatTotal: '1 172,509', stamp: '1,000', total: '7.344,609 DT', lines: [{ designation: 'Fil', quantity: '1 222', unitPrice: '5,000', total: '6 110,000' }] })

  it('1re réponse partielle (chaînes FR) → relance Gemini → complète', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(gemini(PARTIAL)).mockResolvedValueOnce(gemini(FULL))
    global.fetch = fetchMock as unknown as typeof fetch
    const out = await extractWithAi(aiProviders({ GEMINI_API_KEY: 'k', GROQ_API_KEY: 'g' }), 'texte')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls.every(([url]) => String(url).includes('generativelanguage'))).toBe(true)
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).contents[0].parts[0].text).toContain('ATTENTION')
    expect(out).toMatchObject({ provider: 'gemini', result: { subtotal: 6110, fodec: 61.1, vatTotal: 1172.509, stamp: 1, total: 7344.609, lines: [{ quantity: 1222, unitPrice: 5, total: 6110 }] } })
    expect(out?.warnings).toEqual(expect.arrayContaining(['ai:retried', 'ai:string_numbers']))
    expect(out?.warnings).not.toContain('ai:incomplete')
    // journal : forme seulement
    const logged = JSON.stringify(warn.mock.calls)
    expect(logged).toContain('nullKeys')
    expect(logged).not.toContain('SECRET')
    expect(logged).not.toContain('sept mille')
  })

  it('deux réponses Gemini partielles → Groq ; au plus 2 appels Gemini', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(gemini(PARTIAL)).mockResolvedValueOnce(gemini('pas du json')).mockResolvedValueOnce(groq(FULL))
    global.fetch = fetchMock as unknown as typeof fetch
    const out = await extractWithAi(aiProviders({ GEMINI_API_KEY: 'k', GROQ_API_KEY: 'g' }), 'texte')
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('generativelanguage'))).toHaveLength(2)
    expect(out).toMatchObject({ provider: 'groq', result: { total: 7344.609 } })
    expect(out?.warnings).toEqual(expect.arrayContaining(['ai:retried', 'ai:invalid_output', 'ai:fallback']))
  })

  it('tout reste partiel → meilleure réponse obtenue, marquée incomplète', async () => {
    const fetchMock = jest.fn().mockResolvedValue(gemini(PARTIAL))
    global.fetch = fetchMock as unknown as typeof fetch
    const out = await extractWithAi(aiProviders({ GEMINI_API_KEY: 'k' }), 'texte')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(out).toMatchObject({ provider: 'gemini', result: { supplierName: 'SECRET ALPHA', total: null, subtotal: null, lines: [] } })
    expect(out?.warnings).toEqual(expect.arrayContaining(['ai:incomplete', 'ai:lines_dropped']))
  })

  it('schéma refusé (400) puis réponse partielle : budget de 2 appels Gemini épuisé, pas de 3e appel', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce({ ok: false, status: 400 }).mockResolvedValueOnce(gemini(PARTIAL)).mockResolvedValue(gemini(FULL))
    global.fetch = fetchMock as unknown as typeof fetch
    await extractWithAi(aiProviders({ GEMINI_API_KEY: 'k' }), 'texte')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('réponse complète du premier coup → un seul appel', async () => {
    const fetchMock = jest.fn().mockResolvedValue(gemini(FULL))
    global.fetch = fetchMock as unknown as typeof fetch
    expect(await extractWithAi(aiProviders({ GEMINI_API_KEY: 'k', GROQ_API_KEY: 'g' }), 'texte')).toMatchObject({ provider: 'gemini', warnings: ['ai:string_numbers'] })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('totaux trouvés par l’extraction déterministe mais absents de l’IA → relance', async () => {
    const lineOnly = JSON.stringify({ lines: [{ designation: 'Fil', quantity: 1, unitPrice: 5, total: 5 }] })
    const fetchMock = jest.fn().mockResolvedValueOnce(gemini(lineOnly)).mockResolvedValueOnce(gemini(FULL))
    global.fetch = fetchMock as unknown as typeof fetch
    const det = extractInvoice('FACTURE N° FA-1\nTotal HT 6 110,000\nTotal TTC 7 344,609')
    expect(det.total.value).not.toBeNull()
    expect(await extractWithAi(aiProviders({ GEMINI_API_KEY: 'k' }), 'x', null, det)).toMatchObject({ result: { total: 7344.609 } })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('fusion : l’arithmétique prime toujours sur les montants IA (même relus depuis des chaînes)', () => {
  const TEXT = ['STE ALPHA TEXTILE SARL', 'MF : 1234567A/B/M/000', 'FACTURE N° FA-2026-014', 'Date : 05/01/2026',
    'Fil coton 1 222 5,000 6 110,000', 'Total HT 6 110,000', 'FODEC 1% 61,100', 'TVA 19% 1 172,509', 'Timbre fiscal 1,000', 'Total TTC 7 344,609'].join('\n')

  it('extraction déterministe cohérente : montants IA divergents ignorés', () => {
    const det = extractInvoice(TEXT)
    expect(det.checks.totalsConsistent).toBe(true)
    const ai = parseAiJson(JSON.stringify({ subtotal: '9.999,000', total: '12 000,000', lines: [{ designation: 'Autre', quantity: '1', unitPrice: '9 999', total: '9 999' }] }))!
    const m = mergeAiExtraction(det, ai)
    expect(m.total.value).toBe(7344.609)
    expect(m.subtotal.value).toBe(6110)
  })

  it('extraction déterministe incomplète : montants IA (chaînes TN) retenus seulement s’ils sont cohérents', () => {
    const det = extractInvoice('STE ALPHA TEXTILE SARL\nFACTURE N° FA-1')
    const good = parseAiJson(JSON.stringify({ subtotal: '6.110,000', fodec: '61,100', vat: [{ rate: 19, amount: '1 172,509' }], stamp: '1,000', total: '7.344,609 DT' }))!
    expect(mergeAiExtraction(det, good).total.value).toBe(7344.609)
    const bad = parseAiJson(JSON.stringify({ subtotal: '6.110,000', fodec: '61,100', vat: [{ rate: 19, amount: '1 172,509' }], stamp: '1,000', total: '9 000,000' }))!
    const m = mergeAiExtraction(det, bad)
    expect(m.warnings).toContain('ai:amounts_rejected')
    expect(m.total.value).toBeNull()
  })
})
