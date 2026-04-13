'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, FileText, User, Calendar, Printer, Download,
  ExternalLink, Send, CheckCircle, XCircle, Clock, AlertTriangle,
  RefreshCw, QrCode, Zap, FileCode
} from 'lucide-react'
import { generateTEIFXml } from '@/lib/teif-generator'

const TTN_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-stone-100 text-stone-500',
  SUBMITTED: 'bg-blue-100 text-blue-600',
  SIGNED: 'bg-purple-100 text-purple-600',
  TRANSMITTED: 'bg-amber-100 text-amber-600',
  ACCEPTED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-600',
  CANCELLED: 'bg-red-100 text-red-400',
}

const TTN_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumis',
  SIGNED: 'Signé',
  TRANSMITTED: 'Transmis',
  ACCEPTED: 'Accepté',
  REJECTED: 'Rejeté',
  CANCELLED: 'Annulé',
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [tenantId, setTenantId] = useState('')

  const fetchInvoice = async (id: string, tid: string) => {
    try {
      const res = await fetch(`/api/commercial/invoices?id=${id}&tenantId=${tid}`)
      if (res.ok) {
        const data = await res.json()
        setInvoice(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const session = localStorage.getItem('bello_session')
    if (session) {
      const { tenantId: tid } = JSON.parse(session)
      setTenantId(tid)
      if (params.id) fetchInvoice(params.id as string, tid)
    }
  }, [params.id])

  const handleTTNSubmit = async () => {
    if (!invoice) return
    if (!confirm('Soumettre cette facture à TTN (El Fatoora) ?')) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/commercial/invoices/${invoice.id}/ttn-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      })
      const result = await res.json()
      if (res.ok) {
        setInvoice(result)
        alert('Facture soumise à TTN avec succès !')
      } else {
        alert('Erreur: ' + (result.error || 'Échec de la soumission'))
      }
    } catch (e) {
      alert('Erreur de connexion')
    } finally {
      setSubmitting(false)
    }
  }

  const exportTEIF = () => {
    if (!invoice) return
    const xml = generateTEIFXml({
      invoiceNumber: invoice.number,
      type: invoice.type,
      issueDate: new Date(invoice.date).toISOString().split('T')[0],
      tenant: {
        name: invoice.tenant?.name || '',
        matriculeFiscal: invoice.tenant?.matriculeFiscal || '',
        address: invoice.tenant?.address || '',
        city: invoice.tenant?.city || '',
        zipCode: invoice.tenant?.zipCode || '',
        phone: invoice.tenant?.phone || '',
      },
      client: {
        name: invoice.client?.name || '',
        matriculeFiscal: invoice.client?.matriculeFiscal || '',
        address: invoice.client?.address || '',
        city: invoice.client?.city || '',
      },
      items: invoice.items,
      totals: {
        subtotalHT: Number(invoice.subtotalHT),
        totalFodec: Number(invoice.totalFodec),
        totalVAT: Number(invoice.totalVAT),
        timbreFiscal: Number(invoice.timbreFiscal || 1),
        totalTTC: Number(invoice.totalTTC),
        vatSummary: invoice.vatSummary || {},
      },
    })
    const blob = new Blob([xml], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${invoice.number}_TEIF.xml`
    a.click()
  }

  const fmt = (n: number) => n.toLocaleString('fr-TN', { style: 'currency', currency: 'TND', maximumFractionDigits: 3 })

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-screen">
      <div className="text-center"><RefreshCw className="w-8 h-8 animate-spin text-teal-500 mx-auto" /><p className="mt-4 text-stone-500 font-bold">Chargement...</p></div>
    </div>
  )

  if (!invoice) return (
    <div className="p-8 text-center">
      <p className="text-red-500 font-bold">Facture introuvable</p>
      <Link href="/commercial/documents" className="text-teal-500 hover:underline mt-4 inline-block">Retour aux documents</Link>
    </div>
  )

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/commercial/documents" className="p-3 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-all shadow-sm">
          <ArrowLeft className="w-5 h-5 text-stone-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">Facture <span className="font-mono">{invoice.number}</span></h1>
          <p className="text-stone-500 font-medium mt-1">Module Commercial — Compliance TEIF 1.8.8</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportTEIF} className="flex items-center gap-2 px-4 py-2.5 border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 font-bold text-sm shadow-sm">
            <FileCode className="w-4 h-4" /> TEIF XML
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 font-bold text-sm shadow-sm">
            <Printer className="w-4 h-4" /> Imprimer
          </button>
        </div>
      </div>

      {/* TTN Status Banner */}
      <div className={`rounded-2xl border p-6 ${invoice.ttnStatus === 'ACCEPTED' ? 'bg-emerald-50 border-emerald-200' : invoice.ttnStatus === 'REJECTED' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {invoice.ttnStatus === 'ACCEPTED' ? <CheckCircle className="w-8 h-8 text-emerald-600" /> :
             invoice.ttnStatus === 'REJECTED' ? <XCircle className="w-8 h-8 text-red-600" /> :
             invoice.ttnStatus === 'SUBMITTED' || invoice.ttnStatus === 'SIGNED' || invoice.ttnStatus === 'TRANSMITTED' ? <Clock className="w-8 h-8 text-blue-600 animate-pulse" /> :
             <Zap className="w-8 h-8 text-blue-500" />}
            <div>
              <p className="font-black text-stone-900 text-lg">Statut TTN — El Fatoora</p>
              <p className={`text-sm font-bold ${invoice.ttnStatus === 'ACCEPTED' ? 'text-emerald-700' : invoice.ttnStatus === 'REJECTED' ? 'text-red-700' : 'text-blue-700'}`}>
                {TTN_STATUS_LABELS[invoice.ttnStatus] || invoice.ttnStatus || 'Brouillon'}
                {invoice.ttnReference ? ` — Réf: ${invoice.ttnReference}` : ''}
              </p>
              {invoice.ttnErrorMessage && (
                <p className="text-xs text-red-600 mt-1 font-bold">⚠ {invoice.ttnErrorMessage}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {invoice.ttnStatus === 'ACCEPTED' && invoice.ttnQRCode && (
              <div className="text-center">
                <img src={invoice.ttnQRCode} alt="QR TTN" className="w-20 h-20 border rounded-xl" />
                <p className="text-[9px] text-stone-500 mt-1 font-bold">QR Code TTN</p>
              </div>
            )}
            {invoice.ttnStatus === 'DRAFT' && (
              <button
                onClick={handleTTNSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-black text-sm shadow-lg shadow-teal-600/20 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Soumission...' : 'Soumettre à TTN 🇹🇳'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-2xl border border-stone-200 shadow-sm p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-6">
            <div>
              <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">N° {invoice.number}</p>
              <p className="text-xs text-stone-400 mt-1">{invoice.type} — {invoice.status}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Date</p>
              <p className="text-sm font-bold text-stone-900">{new Date(invoice.date).toLocaleDateString('fr-TN')}</p>
              {invoice.dueDate && <p className="text-xs text-amber-600 mt-1">Échéance: {new Date(invoice.dueDate).toLocaleDateString('fr-TN')}</p>}
            </div>
          </div>

          {/* Supplier / Client */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-3">Émetteur (Vous)</p>
              <p className="font-black text-stone-900">{invoice.tenant?.name}</p>
              <p className="text-sm text-stone-500 font-mono mt-1">{invoice.tenant?.matriculeFiscal}</p>
              <p className="text-xs text-stone-400 mt-1">{invoice.tenant?.address}, {invoice.tenant?.city}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-3">Client</p>
              <p className="font-black text-stone-900 flex items-center gap-2"><User className="w-4 h-4" /> {invoice.client?.name}</p>
              <p className="text-sm text-stone-500 font-mono mt-1">{invoice.client?.matriculeFiscal || '—'}</p>
              <p className="text-xs text-stone-400 mt-1">{invoice.client?.address}, {invoice.client?.city}</p>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-4">Lignes de Facture</p>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-50 text-[9px] font-black text-stone-500 uppercase tracking-widest">
                  <th className="px-4 py-3">Désignation</th>
                  <th className="px-4 py-3 text-center">Qté</th>
                  <th className="px-4 py-3 text-center">Unité</th>
                  <th className="px-4 py-3 text-right">P.U HT</th>
                  <th className="px-4 py-3 text-right">TVA</th>
                  <th className="px-4 py-3 text-right">Total HT</th>
                  <th className="px-4 py-3 text-right">Total TTC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {invoice.items?.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="px-4 py-3 text-sm text-stone-700">{item.description}</td>
                    <td className="px-4 py-3 text-sm text-center font-mono">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-center font-mono">{item.unit}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono">{Number(item.unitPriceHT).toFixed(3)} DT</td>
                    <td className="px-4 py-3 text-sm text-center">{item.vatRate}%</td>
                    <td className="px-4 py-3 text-sm text-right font-mono font-bold">{Number(item.totalHT).toFixed(3)} DT</td>
                    <td className="px-4 py-3 text-sm text-right font-mono font-bold text-stone-900">{Number(item.totalTTC).toFixed(3)} DT</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {invoice.notes && (
            <div className="bg-stone-50 rounded-xl p-4">
              <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">Notes</p>
              <p className="text-sm text-stone-600">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Totals Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
            <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Totaux</p>
            <div className="flex items-center justify-between text-sm"><span className="text-stone-500">Total HT</span><span className="font-mono font-bold">{Number(invoice.subtotalHT).toFixed(3)} DT</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-stone-500">FODEC</span><span className="font-mono text-amber-600">{Number(invoice.totalFodec).toFixed(3)} DT</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-stone-500">TVA</span><span className="font-mono text-stone-600">{Number(invoice.totalVAT).toFixed(3)} DT</span></div>
            <div className="flex items-center justify-between text-sm border-t border-stone-100 pt-3"><span className="text-stone-500">Timbre Fiscal</span><span className="font-mono text-stone-400">{Number(invoice.timbreFiscal || 1).toFixed(3)} DT</span></div>
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl">
              <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Total TTC</p>
              <p className="text-2xl font-black text-teal-900 mt-1">{Number(invoice.totalTTC).toFixed(3)} DT</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
