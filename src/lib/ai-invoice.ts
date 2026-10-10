/**
 * Affinage IA OPTIONNEL de l'extraction de facture fournisseur (côté serveur).
 * Fournisseurs gratuits pris en charge, par ordre de préférence :
 *  - Google AI Studio (Gemini) : env GEMINI_API_KEY, modèle env GEMINI_MODEL (défaut gemini-3.5-flash-lite, palier gratuit)
 *  - Groq (OpenAI-compatible)  : env GROQ_API_KEY,   modèle env GROQ_MODEL   (défaut qwen/qwen3.8-27b, vision)
 * Sans clé : `aiProvider()` renvoie null et la fonctionnalité reste 100 % déterministe.
 * Le contenu de la facture n'est jamais journalisé ni stocké.
 */
import { z } from 'zod'
import type { AiInvoice } from '@/lib/invoice-extract'

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite'
export const DEFAULT_GROQ_MODEL = 'qwen/qwen3.8-27b'
const TIMEOUT_MS = 25_000

const num = z.union([z.number(), z.string()]).transform((v) => (typeof v === 'number' ? v : Number(String(v).replace(/\s/g, '').replace(',', '.')))).pipe(z.number().finite())
const optNum = num.nullable().optional().catch(null)
const optStr = z.string().trim().max(200).nullable().optional().catch(null)

/** Schéma strict de la réponse IA (champs inconnus ignorés, valeurs invalides → null). */
export const aiInvoiceSchema = z.object({
  supplierName: optStr,
  matriculeFiscal: optStr,
  invoiceNumber: optStr,
  date: optStr,
  subtotal: optNum,
  fodec: optNum,
  vat: z.array(z.object({ rate: num, base: optNum, amount: num })).max(5).nullable().optional().catch(null),
  vatTotal: optNum,
  stamp: optNum,
  total: optNum,
  lines: z.array(z.object({
    reference: optStr,
    designation: z.string().trim().min(1).max(300),
    quantity: num,
    unitPrice: num,
    total: num,
  })).max(200).nullable().optional().catch(null),
})

export const extractRequestSchema = z.object({
  text: z.string().max(30_000).default(''),
  /** data:image/...;base64,... (≤ ~4 Mo une fois encodée) */
  image: z.string().max(4_200_000).regex(/^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/).nullable().optional(),
})

export type AiProvider = { name: 'gemini' | 'groq'; key: string; model: string }

export function aiProvider(env: Record<string, string | undefined> = process.env): AiProvider | null {
  if (env.GEMINI_API_KEY) return { name: 'gemini', key: env.GEMINI_API_KEY, model: env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL }
  if (env.GROQ_API_KEY) return { name: 'groq', key: env.GROQ_API_KEY, model: env.GROQ_MODEL || DEFAULT_GROQ_MODEL }
  return null
}

export const PROMPT = `Tu extrais les données d'une facture FOURNISSEUR tunisienne (texte OCR éventuellement bruité, et/ou image).
Réponds UNIQUEMENT avec un objet JSON, sans texte autour, de la forme :
{"supplierName":string|null,"matriculeFiscal":string|null,"invoiceNumber":string|null,"date":"YYYY-MM-DD"|null,
"subtotal":number|null,"fodec":number|null,"vat":[{"rate":7|13|19,"base":number|null,"amount":number}],"vatTotal":number|null,
"stamp":number|null,"total":number|null,"lines":[{"reference":string|null,"designation":string,"quantity":number,"unitPrice":number,"total":number}]}
Règles : le fournisseur est l'ÉMETTEUR (pas le client) ; matricule fiscal au format 1234567X/A/M/000 ; montants en dinars,
nombres JSON avec point décimal (« 1 250,000 » → 1250) ; subtotal = total HT ; fodec = FODEC 1 % s'il existe ;
stamp = timbre fiscal (souvent 1) ; total = TTC / net à payer. N'invente rien : null si absent ou illisible.`

/** Premier objet JSON d'une réponse (tolère ```json, balises <think>). */
export function parseAiJson(raw: string): AiInvoice | null {
  const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/```(?:json)?/g, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    const parsed = aiInvoiceSchema.safeParse(JSON.parse(cleaned.slice(start, end + 1)))
    return parsed.success ? (parsed.data as AiInvoice) : null
  } catch {
    return null
  }
}

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<unknown | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: ctrl.signal })
    if (!res.ok) {
      // statut seulement : jamais le contenu
      console.warn(`[ai-invoice] fournisseur IA HTTP ${res.status}`)
      return null
    }
    return await res.json()
  } catch (e) {
    console.warn('[ai-invoice] fournisseur IA indisponible :', (e as Error)?.name)
    return null
  } finally {
    clearTimeout(timer)
  }
}

function splitDataUrl(dataUrl: string): { mime: string; data: string } | null {
  const m = dataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/)
  return m ? { mime: m[1], data: m[2] } : null
}

export async function callAi(p: AiProvider, text: string, image?: string | null): Promise<AiInvoice | null> {
  const userText = `${PROMPT}\n\nTexte OCR :\n"""\n${text.slice(0, 30_000)}\n"""`
  const img = image ? splitDataUrl(image) : null
  if (p.name === 'gemini') {
    const parts: unknown[] = [{ text: userText }]
    if (img) parts.push({ inline_data: { mime_type: img.mime, data: img.data } })
    const json = (await postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(p.model)}:generateContent`,
      { 'x-goog-api-key': p.key },
      { contents: [{ role: 'user', parts }], generationConfig: { temperature: 0, responseMimeType: 'application/json' } },
    )) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> } | null
    const out = json?.candidates?.[0]?.content?.parts?.map((x) => x.text ?? '').join('') ?? ''
    return out ? parseAiJson(out) : null
  }
  const content: unknown[] = [{ type: 'text', text: userText }]
  if (img) content.push({ type: 'image_url', image_url: { url: image } })
  const json = (await postJson(
    'https://api.groq.com/openai/v1/chat/completions',
    { Authorization: `Bearer ${p.key}` },
    { model: p.model, temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: img ? content : userText }] },
  )) as { choices?: Array<{ message?: { content?: string } }> } | null
  const out = json?.choices?.[0]?.message?.content ?? ''
  return out ? parseAiJson(out) : null
}
