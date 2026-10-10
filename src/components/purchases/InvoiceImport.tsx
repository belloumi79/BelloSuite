'use client'

/**
 * « Zéro saisie » : import d'une facture fournisseur (PDF ou photo).
 * 1. Texte extrait dans le navigateur (pdfjs / Tesseract) — fonctionne sans clé API.
 * 2. Parseur déterministe (src/lib/invoice-extract.ts).
 * 3. Affinage IA optionnel (/api/ai/extract-invoice) fusionné SANS jamais l'emporter sur l'arithmétique.
 * Le fichier n'est ni envoyé au serveur de BelloSuite (sauf l'image vers l'IA si une clé est configurée) ni stocké.
 */
import React, { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { FileUp, Loader2, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react'
import { useStockFormat } from '@/components/stock/ui'
import { extractInvoice, mergeAiExtraction, LOW_CONFIDENCE, type InvoiceExtraction, type AiInvoice } from '@/lib/invoice-extract'
import type { OcrProgress } from '@/lib/invoice-ocr-client'

const MAX_BYTES = 5 * 1024 * 1024

type Status = { kind: 'idle' } | { kind: 'busy'; p: OcrProgress | null; ai?: boolean } | { kind: 'error'; key: string } | { kind: 'done'; x: InvoiceExtraction; ai: boolean }

export function InvoiceImportPanel({ onExtracted }: { onExtracted: (x: InvoiceExtraction) => void }) {
  const t = useTranslations('Purchases')
  const f = useStockFormat()
  const input = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [drag, setDrag] = useState(false)

  async function handle(file: File | undefined) {
    if (!file) return
    if (file.size > MAX_BYTES) { setStatus({ kind: 'error', key: 'ocr_too_large' }); return }
    if (!(file.type === 'application/pdf' || file.type.startsWith('image/') || /\.pdf$/i.test(file.name))) { setStatus({ kind: 'error', key: 'ocr_unsupported' }); return }
    setStatus({ kind: 'busy', p: null })
    try {
      const { extractInvoiceText, imageDataUrlForAi } = await import('@/lib/invoice-ocr-client')
      const { text, image: pdfImage } = await extractInvoiceText(file, (p) => setStatus({ kind: 'busy', p }))
      let x = extractInvoice(text)
      let aiUsed = false
      // Affinage IA : silencieux si aucune clé n'est configurée ou en cas d'erreur
      try {
        setStatus({ kind: 'busy', p: { stage: 'done', progress: 1 }, ai: true })
        const image = pdfImage ?? (await imageDataUrlForAi(file))
        const res = await fetch('/api/ai/extract-invoice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text.slice(0, 30_000), image }) })
        if (res.ok) {
          const body = (await res.json()) as { available?: boolean; result?: AiInvoice | null }
          if (body.available && body.result) { x = mergeAiExtraction(x, body.result); aiUsed = true }
        }
      } catch { /* IA facultative */ }
      if (!text.trim() && !aiUsed) { setStatus({ kind: 'error', key: 'ocr_no_text' }); return }
      setStatus({ kind: 'done', x, ai: aiUsed })
      onExtracted(x)
    } catch (e) {
      setStatus({ kind: 'error', key: (e as Error)?.message === 'too_large' ? 'ocr_too_large' : 'ocr_failed' })
    } finally {
      if (input.current) input.current.value = ''
    }
  }

  const busy = status.kind === 'busy'
  const stageLabel = (p: OcrProgress | null, ai?: boolean) => {
    if (ai) return t('ocr_stage_ai')
    if (!p) return t('ocr_stage_start')
    const page = p.pages && p.pages > 1 ? ` (${t('ocr_page', { page: p.page ?? 1, pages: p.pages })})` : ''
    return t(`ocr_stage_${p.stage}` as 'ocr_stage_pdf') + page
  }

  return (
    <div className="mb-4">
      <div
        role="button" tabIndex={0}
        onClick={() => !busy && input.current?.click()}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !busy) input.current?.click() }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (!busy) handle(e.dataTransfer.files?.[0]) }}
        className={`flex flex-col sm:flex-row items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-3 cursor-pointer transition-colors ${drag ? 'border-teal-500 bg-teal-50' : 'border-zinc-300 bg-zinc-50 hover:bg-zinc-100'}`}
      >
        <div className="flex items-center gap-2 text-teal-700 font-semibold text-sm">
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileUp className="w-5 h-5" />}
          {t('import_invoice')}
        </div>
        <div className="text-xs text-zinc-500 text-start flex-1">{t('import_invoice_hint')}</div>
        <input ref={input} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
      </div>

      {status.kind === 'busy' && (
        <div className="mt-2" aria-live="polite">
          <div className="flex justify-between text-xs text-zinc-600 mb-1"><span>{stageLabel(status.p, status.ai)}</span><span className="tabular-nums">{Math.round((status.p?.progress ?? 0) * 100)} %</span></div>
          <div className="h-1.5 rounded-full bg-zinc-200 overflow-hidden"><div className="h-full bg-teal-500 transition-all" style={{ width: `${Math.round((status.p?.progress ?? 0) * 100)}%` }} /></div>
        </div>
      )}
      {status.kind === 'error' && <p className="mt-2 text-sm text-red-600 text-start">{t(status.key as 'ocr_failed')}</p>}
      {status.kind === 'done' && (
        <div className="mt-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-start space-y-1">
          <div className="flex items-center gap-2 font-semibold text-zinc-800">
            {status.x.checks.totalsConsistent ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
            {status.x.checks.totalsConsistent ? t('ocr_consistent') : t('ocr_check_totals')}
            {status.ai && <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-700"><Sparkles className="w-3.5 h-3.5" />{t('ocr_ai_refined')}</span>}
          </div>
          <div className="text-xs text-zinc-600 flex flex-wrap gap-x-4 gap-y-1">
            {status.x.subtotal.value !== null && <span>{t('subtotal')} : <b className="tabular-nums">{f.money(status.x.subtotal.value)}</b></span>}
            {status.x.vatTotal.value !== null && <span>{t('vat')} : <b className="tabular-nums">{f.money(status.x.vatTotal.value)}</b></span>}
            {status.x.fodec.value !== null && <span>FODEC : <b className="tabular-nums">{f.money(status.x.fodec.value)}</b></span>}
            {status.x.stamp.value !== null && <span>{t('stamp_duty')} : <b className="tabular-nums">{f.money(status.x.stamp.value)}</b></span>}
            {status.x.total.value !== null && <span>{t('total_ttc')} : <b className="tabular-nums">{f.money(status.x.total.value)}</b></span>}
          </div>
          <p className="text-xs text-amber-700">{t('ocr_review_hint', { threshold: Math.round(LOW_CONFIDENCE * 100) })}</p>
        </div>
      )}
    </div>
  )
}
