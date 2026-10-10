/**
 * POST /api/ai/extract-invoice — affinage IA optionnel d'une facture fournisseur (« zéro saisie »).
 * Corps : { text: string (texte OCR / PDF), image?: data URL (image ≤ ~3 Mo) }.
 * Réponse : { available: false } sans clé (GEMINI_API_KEY / GROQ_API_KEY) — l'UI garde l'extraction déterministe ;
 *           { available: true, provider, result: AiInvoice | null } sinon.
 * Tenant depuis la session, limite par tenant, rien n'est stocké ni journalisé (ni texte ni image).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getApiContext, parseBody } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { rateLimitPersistent, tooManyRequests } from '@/lib/rate-limit-persistent'
import { aiProvider, callAi, extractRequestSchema } from '@/lib/ai-invoice'

export const runtime = 'nodejs'
export const maxDuration = 30

/** 5 Mo de fichier max côté client ; corps JSON (base64) plafonné ici. */
const MAX_BODY_BYTES = 5 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const ctx = await getApiContext(req)
    if (ctx instanceof NextResponse) return ctx

    const provider = aiProvider()
    if (!provider) return NextResponse.json({ available: false })

    const len = Number(req.headers.get('content-length') ?? 0)
    if (len > MAX_BODY_BYTES) return NextResponse.json({ error: 'Fichier trop volumineux (5 Mo max).' }, { status: 413 })

    const rl = await rateLimitPersistent(`ai-extract-invoice:tenant:${ctx.tenantId}`, 30, 3600)
    if (!rl.success) return tooManyRequests(rl)

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Corps invalide.' }, { status: 400 })
    }
    const data = parseBody(extractRequestSchema, body)
    if (data instanceof NextResponse) return data
    if (!data.text.trim() && !data.image) return NextResponse.json({ available: true, provider: provider.name, result: null })

    const result = await callAi(provider, data.text, data.image ?? null)
    return NextResponse.json({ available: true, provider: provider.name, result })
  } catch (err) {
    return handleApiError(err, 'POST ai extract-invoice')
  }
}
