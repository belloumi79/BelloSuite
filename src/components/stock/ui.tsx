'use client'

/**
 * Briques d'interface du module stock — thème clair cohérent avec le reste de l'application
 * (fond stone-50, cartes blanches, bordures zinc-200, accent teal). Classes logiques (ms/me/ps/pe/start/end) pour le RTL.
 */
import React, { useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/routing'
import { ArrowLeft, X, Loader2 } from 'lucide-react'
import { toCsv } from '@/lib/stock-logic'

// ─── Formatage dépendant de la langue ───────────────────────

export function intlLocale(locale: string): string {
  return locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-GB' : 'fr-TN'
}

export function useStockFormat() {
  const locale = useLocale()
  return useMemo(() => {
    const loc = intlLocale(locale)
    const money = new Intl.NumberFormat(loc, { style: 'currency', currency: 'TND', minimumFractionDigits: 3, maximumFractionDigits: 3 })
    const qty = new Intl.NumberFormat(loc, { maximumFractionDigits: 3 })
    const date = new Intl.DateTimeFormat(loc, { dateStyle: 'medium' })
    const dateTime = new Intl.DateTimeFormat(loc, { dateStyle: 'short', timeStyle: 'short' })
    const toNum = (v: unknown) => (v === null || v === undefined || v === '' ? 0 : Number(v))
    return {
      locale,
      money: (v: unknown) => money.format(toNum(v)),
      qty: (v: unknown) => qty.format(toNum(v)),
      signedQty: (v: unknown) => { const n = toNum(v); return (n > 0 ? '+' : '') + qty.format(n) },
      date: (v: string | Date | null | undefined) => (v ? date.format(new Date(v)) : '—'),
      dateTime: (v: string | Date | null | undefined) => (v ? dateTime.format(new Date(v)) : '—'),
    }
  }, [locale])
}

// ─── Export CSV (côté navigateur, sans dépendance) ─────────

export function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Appel API JSON : renvoie { ok, data, error }. */
export async function api<T = unknown>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T; error?: string }> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } })
  let data: unknown = null
  try { data = await res.json() } catch { /* corps vide */ }
  const error = !res.ok ? ((data as { error?: string } | null)?.error || `HTTP ${res.status}`) : undefined
  return { ok: res.ok, status: res.status, data: data as T, error }
}

// ─── Classes partagées ──────────────────────────────────────

export const cls = {
  card: 'bg-white border border-zinc-200 rounded-2xl shadow-sm',
  input: 'w-full bg-white border border-zinc-300 rounded-xl px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:bg-zinc-50 disabled:text-zinc-500',
  label: 'block text-xs font-semibold text-zinc-600 mb-1.5 text-start',
  btnPrimary: 'inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-sm shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  btnSecondary: 'inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-300 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  btnDanger: 'inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50',
  btnGhost: 'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-40',
  th: 'px-4 py-3 text-start text-xs font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap',
  td: 'px-4 py-3 text-sm text-zinc-700 text-start',
  tdNum: 'px-4 py-3 text-sm text-zinc-900 text-end tabular-nums whitespace-nowrap',
  table: 'w-full text-sm',
}

// ─── Navigation du module ───────────────────────────────────

export const STOCK_NAV = [
  { href: '/stock', key: 'nav_dashboard', exact: true },
  { href: '/stock/products', key: 'nav_products' },
  { href: '/stock/warehouses', key: 'nav_warehouses' },
  { href: '/stock/movements', key: 'nav_movements' },
  { href: '/stock/transfers', key: 'nav_transfers' },
  { href: '/stock/inventory', key: 'nav_inventory' },
  { href: '/stock/alerts', key: 'nav_alerts' },
  { href: '/stock/valuation', key: 'nav_valuation' },
  { href: '/stock/settings', key: 'nav_settings' },
] as const

export function StockNav() {
  const t = useTranslations('StockMod')
  const pathname = usePathname()
  return (
    <nav className="no-print -mx-1 mb-6 overflow-x-auto" aria-label={t('module')}>
      <div className="flex gap-1 px-1 min-w-max border-b border-zinc-200">
        {STOCK_NAV.map(item => {
          const active = 'exact' in item && item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${active ? 'border-teal-600 text-teal-700' : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:border-zinc-300'}`}
            >
              {t(item.key)}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// ─── Mise en page ───────────────────────────────────────────

export function StockPage({ children }: { children: React.ReactNode }) {
  return <div className="max-w-7xl mx-auto text-zinc-900">{children}</div>
}

export function PageHeader({ title, description, actions, backHref }: { title: string; description?: string; actions?: React.ReactNode; backHref?: string }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-3 min-w-0">
        {backHref && (
          <Link href={backHref} className="no-print p-2 rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50" aria-label="back">
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </Link>
        )}
        <div className="min-w-0 text-start">
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 tracking-tight truncate">{title}</h1>
          {description && <p className="text-sm text-zinc-500 mt-1">{description}</p>}
        </div>
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ title, actions, children, className = '', bodyClassName = 'p-5' }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={`${cls.card} ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-zinc-100">
          {title && <h2 className="text-base font-semibold text-zinc-900 text-start">{title}</h2>}
          {actions && <div className="no-print flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

const KPI_TONES: Record<string, string> = {
  teal: 'bg-teal-50 text-teal-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  blue: 'bg-blue-50 text-blue-700',
  zinc: 'bg-zinc-100 text-zinc-700',
  emerald: 'bg-emerald-50 text-emerald-700',
}

export function KpiCard({ label, value, sub, icon: Icon, tone = 'teal', href }: { label: string; value: React.ReactNode; sub?: React.ReactNode; icon?: React.ComponentType<{ className?: string }>; tone?: keyof typeof KPI_TONES | string; href?: string }) {
  const body = (
    <div className={`${cls.card} p-5 h-full ${href ? 'hover:border-teal-300 hover:shadow transition' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-start">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{label}</p>
          <p className="mt-2 text-2xl font-bold text-zinc-900 tabular-nums truncate">{value}</p>
          {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
        </div>
        {Icon && <div className={`p-2.5 rounded-xl shrink-0 ${KPI_TONES[tone] || KPI_TONES.teal}`}><Icon className="w-5 h-5" /></div>}
      </div>
    </div>
  )
  return href ? <Link href={href} className="block">{body}</Link> : body
}

const BADGE_TONES: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  zinc: 'bg-zinc-100 text-zinc-700 ring-zinc-500/20',
  teal: 'bg-teal-50 text-teal-700 ring-teal-600/20',
}

export function Badge({ tone = 'zinc', children }: { tone?: keyof typeof BADGE_TONES | string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ring-1 ring-inset whitespace-nowrap ${BADGE_TONES[tone] || BADGE_TONES.zinc}`}>{children}</span>
}

export const MOVEMENT_TONE: Record<string, string> = { ENTRY: 'green', EXIT: 'red', ADJUSTMENT: 'amber', TRANSFER: 'blue' }
export const STATUS_TONE: Record<string, string> = { DRAFT: 'zinc', IN_PROGRESS: 'amber', VALIDATED: 'green', TRANSFERRED: 'green', CANCELLED: 'red' }

export function MovementBadge({ type }: { type: string }) {
  const t = useTranslations('StockMod')
  return <Badge tone={MOVEMENT_TONE[type]}>{t(`type_${type}`)}</Badge>
}

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('StockMod')
  return <Badge tone={STATUS_TONE[status]}>{t(`status_${status}`)}</Badge>
}

export function EmptyState({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="py-14 text-center">
      <p className="text-sm text-zinc-500">{title}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function Loading() {
  const t = useTranslations('StockMod')
  return (
    <div className="py-14 flex items-center justify-center gap-2 text-sm text-zinc-500">
      <Loader2 className="w-4 h-4 animate-spin" /> {t('loading')}
    </div>
  )
}

export function Alert({ tone = 'red', children, onClose }: { tone?: 'red' | 'green' | 'amber'; children: React.ReactNode; onClose?: () => void }) {
  const tones = { red: 'bg-red-50 border-red-200 text-red-800', green: 'bg-emerald-50 border-emerald-200 text-emerald-800', amber: 'bg-amber-50 border-amber-200 text-amber-900' }
  return (
    <div role="alert" className={`no-print mb-4 flex items-start justify-between gap-3 px-4 py-3 border rounded-xl text-sm ${tones[tone]}`}>
      <div className="text-start">{children}</div>
      {onClose && <button onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100" aria-label="close"><X className="w-4 h-4" /></button>}
    </div>
  )
}

export function Modal({ open, title, onClose, children, footer, wide = false }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  if (!open) return null
  return (
    <div className="no-print fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" className={`bg-white rounded-2xl shadow-xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] flex flex-col`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h3 className="text-lg font-semibold text-zinc-900 text-start">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label="close"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-zinc-100 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className={cls.label}>{label}</span>
      {children}
      {hint && <span className="block mt-1 text-xs text-zinc-500 text-start">{hint}</span>}
    </label>
  )
}
