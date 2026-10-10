import { aiProvider, aiProviders, extractWithAi, parseAiJson, callAi, extractRequestSchema, DEFAULT_GEMINI_MODEL, DEFAULT_GROQ_MODEL } from '@/lib/ai-invoice'

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
      expect(await extractWithAi(providers, 'x')).toEqual({ provider: 'groq', result: expect.objectContaining({ total: 10 }) })
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
