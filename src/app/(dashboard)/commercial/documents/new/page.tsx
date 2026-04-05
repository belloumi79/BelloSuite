'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Save, ArrowLeft, Search, User, Package, Calendar, Info, CreditCard, FileText } from 'lucide-react'
import { calculateInvoiceTotals, VAT_RATES, FISCAL_STAMP } from '@/lib/fiscal'
import Link from 'next/link'

export default function NewInvoicePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [tenantId, setTenantId] = useState('')
  const [clients, setClients] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  
  const [invoiceData, setInvoiceData] = useState({
    clientId: '',
    type: 'INVOICE',
    number: `FAC-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    items: [
      { productId: '', description: '', quantity: 1, unitPriceHT: 0, discount: 0, vatRate: 19, fodecApply: false, unit: 'EA' }
    ],
    notes: ''
  })

  useEffect(() => {
    const session = localStorage.getItem('bello_session')
    if (session) {
      const { tenantId } = JSON.parse(session)
      setTenantId(tenantId)
      fetchClients(tenantId)
      fetchProducts(tenantId)
    }
  }, [])

  const fetchClients = async (tid: string) => {
    const res = await fetch(`/api/commercial/clients?tenantId=${tid}`)
    const data = await res.json()
    setClients(data)
  }

  const fetchProducts = async (tid: string) => {
    const res = await fetch(`/api/stock/products?tenantId=${tid}`)
    const data = await res.json()
    setProducts(data)
  }

  const handleAddItem = () => {
    setInvoiceData({
      ...invoiceData,
      items: [...invoiceData.items, { productId: '', description: '', quantity: 1, unitPriceHT: 0, discount: 0, vatRate: 19, fodecApply: false, unit: 'EA' }]
    })
  }

  const handleRemoveItem = (index: number) => {
    const newItems = invoiceData.items.filter((_, i) => i !== index)
    setInvoiceData({ ...invoiceData, items: newItems })
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...invoiceData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // If selecting a product, autofill description and price
    if (field === 'productId') {
      const product = products.find(p => p.id === value)
      if (product) {
        newItems[index].description = product.name
        newItems[index].unitPriceHT = Number(product.salePrice)
        newItems[index].vatRate = Number(product.vatRate)
        newItems[index].fodecApply = product.fodec
      }
    }
    
    setInvoiceData({ ...invoiceData, items: newItems })
  }

  const totals = calculateInvoiceTotals(invoiceData.items)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invoiceData.clientId) return alert('Veuillez sélectionner un client')
    setLoading(true)

    try {
      const res = await fetch('/api/commercial/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...invoiceData,
          tenantId,
          ...totals
        })
      })

      if (res.ok) {
        router.push('/commercial/documents')
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-white min-h-screen bg-transparent pt-0">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/commercial/documents" className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tighter">Éditeur de Document 🇹🇳</h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">Conformité TEIF V2.0 / LOI 2026</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
        
        {/* Left: Invoice Data & Items */}
        <div className="lg:col-span-2 space-y-8">
           
           {/* Section: Header Info */}
           <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-[2.5rem] p-8 space-y-6 shadow-2xl shadow-teal-500/5">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Client Destinataire</label>
                   <div className="relative">
                      <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <select 
                        required
                        value={invoiceData.clientId}
                        onChange={e => setInvoiceData({...invoiceData, clientId: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-white outline-none focus:border-teal-500 transition-all appearance-none"
                      >
                        <option value="">Sélectionner un client...</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.matriculeFiscal || '---'})</option>)}
                      </select>
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Type de Document</label>
                   <div className="relative">
                      <FileText className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <select 
                        required
                        value={invoiceData.type}
                        onChange={e => setInvoiceData({...invoiceData, type: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-white outline-none focus:border-teal-500 transition-all appearance-none uppercase"
                      >
                        <option value="INVOICE">Facture</option>
                        <option value="QUOTE">Devis</option>
                        <option value="ORDER">Bon de commande</option>
                        <option value="DELIVERY_NOTE">Bon de livraison</option>
                        <option value="CREDIT_NOTE">Avoir</option>
                      </select>
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">N° Facture / Référence</label>
                   <input 
                     value={invoiceData.number}
                     onChange={e => setInvoiceData({...invoiceData, number: e.target.value})}
                     className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-teal-500 transition-all font-mono"
                   />
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Date Facture</label>
                   <div className="relative">
                      <Calendar className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input 
                        type="date"
                        value={invoiceData.date}
                        onChange={e => setInvoiceData({...invoiceData, date: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-white outline-none focus:border-teal-500 transition-all"
                      />
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Date d'Échéance</label>
                   <input 
                     type="date"
                     value={invoiceData.dueDate}
                     onChange={e => setInvoiceData({...invoiceData, dueDate: e.target.value})}
                     className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-teal-500 transition-all"
                   />
                </div>

             </div>
           </div>

           {/* Section: Line Items */}
           <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-[2.5rem] p-8 shadow-2xl shadow-teal-500/5">
              <div className="flex items-center justify-between mb-8">
                 <h2 className="text-xl font-black flex items-center gap-2">
                    <Package className="w-5 h-5 text-teal-500" /> Articles & Services
                 </h2>
                 <button 
                   type="button"
                   onClick={handleAddItem}
                   className="p-3 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 rounded-xl transition-all border border-teal-500/20"
                 >
                   <Plus className="w-5 h-5" />
                 </button>
              </div>

              <div className="space-y-4">
                 {invoiceData.items.map((item, index) => (
                   <div key={index} className="p-6 bg-zinc-950/50 border border-zinc-800/50 rounded-3xl space-y-4 relative group">
                      <div className="grid grid-cols-12 gap-4">
                         <div className="col-span-12 md:col-span-4 space-y-1">
                            <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Produit / Service</label>
                            <select 
                              value={item.productId}
                              onChange={e => handleItemChange(index, 'productId', e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-500/50 transition-all appearance-none"
                            >
                               <option value="">Sélectionner...</option>
                               {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                         </div>
                         <div className="col-span-12 md:col-span-8 space-y-1">
                            <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Description</label>
                            <input 
                              value={item.description}
                              onChange={e => handleItemChange(index, 'description', e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm outline-none focus:border-teal-500/50 transition-all font-medium"
                              placeholder="Désignation"
                            />
                         </div>
                      </div>

                      <div className="grid grid-cols-12 gap-4 items-end">
                         <div className="col-span-2 space-y-1">
                             <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Unité</label>
                             <input 
                               type="text"
                               maxLength={8}
                               value={item.unit}
                               onChange={e => handleItemChange(index, 'unit', e.target.value.toUpperCase())}
                               className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2 text-sm outline-none focus:border-teal-500/50 transition-all uppercase text-center"
                               placeholder="EA"
                             />
                         </div>
                         <div className="col-span-2 space-y-1">
                             <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Qté</label>
                             <input 
                               type="number"
                               step="0.001"
                               value={item.quantity}
                               onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                               className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-500/50 transition-all"
                             />
                         </div>
                         <div className="col-span-3 space-y-1">
                             <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">P.U HT (DT)</label>
                             <input 
                               type="number"
                               step="0.001"
                               value={item.unitPriceHT}
                               onChange={e => handleItemChange(index, 'unitPriceHT', e.target.value)}
                               className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-500/50 transition-all"
                             />
                         </div>
                         <div className="col-span-2 space-y-1">
                             <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">TVA %</label>
                             <select 
                               value={item.vatRate}
                               onChange={e => handleItemChange(index, 'vatRate', e.target.value)}
                               className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2 text-sm outline-none focus:border-teal-500/50 transition-all appearance-none"
                             >
                                {VAT_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                             </select>
                         </div>
                         <div className="col-span-3 flex items-center gap-3 pt-4 mb-2">
                             <input 
                               type="checkbox"
                               checked={item.fodecApply}
                               onChange={e => handleItemChange(index, 'fodecApply', e.target.checked)}
                               className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-teal-500 focus:ring-teal-500/20 transition-all"
                             />
                             <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Fodec (1%)</label>
                         </div>
                         <div className="col-span-1 pb-1">
                             <button 
                               type="button" 
                               onClick={() => handleRemoveItem(index)}
                               className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                             >
                               <Trash2 className="w-5 h-5" />
                             </button>
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           {/* Notes */}
           <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-[2.5rem] p-8 shadow-2xl shadow-teal-500/5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 block mb-3">Notes & Conditions de Règlement</label>
              <textarea 
                rows={3}
                value={invoiceData.notes}
                onChange={e => setInvoiceData({...invoiceData, notes: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-sm outline-none focus:border-teal-500/50 transition-all"
                placeholder="Ex: Paiement par virement bancaire sous 30 jours..."
              />
           </div>

        </div>

        {/* Right: Totals Sidebar */}
        <div className="space-y-8">
           <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-[2.5rem] p-8 shadow-2xl shadow-teal-500/5 sticky top-8">
              <h2 className="text-xl font-black mb-8 flex items-center gap-2">
                 <CreditCard className="w-5 h-5 text-teal-400" /> Récapitulatif
              </h2>
              
              <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Total Net HT</span>
                    <span className="text-white font-mono text-lg">{totals.subtotalHT.toFixed(3)} <span className="text-[10px]">DT</span></span>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">FODEC (1%)</span>
                    <span className="text-amber-500/70 font-mono text-sm">{totals.totalFodec.toFixed(3)} <span className="text-[10px]">DT</span></span>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Total TVA</span>
                    <span className="text-white/80 font-mono text-sm">{totals.totalVAT.toFixed(3)} <span className="text-[10px]">DT</span></span>
                 </div>
                 <div className="flex items-center justify-between border-t border-zinc-800/50 pt-4">
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Timbre Fiscal</span>
                    <span className="text-zinc-400 font-mono text-sm">{totals.timbreFiscal.toFixed(3)} <span className="text-[10px]">DT</span></span>
                 </div>
                 
                 <div className="p-6 bg-gradient-to-br from-teal-500/10 to-teal-900/10 border border-teal-500/20 rounded-3xl mt-4 space-y-1">
                    <span className="text-teal-400 text-[10px] font-black uppercase tracking-[0.2em]">Total Net TTC</span>
                    <p className="text-3xl font-black text-white tracking-tighter">{totals.totalTTC.toFixed(3)} <span className="text-sm font-medium opacity-60">DT</span></p>
                 </div>

                 {/* VAT Summary for TEIF */}
                 <div className="space-y-2 mt-4">
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2"><Info className="w-3 h-3" /> Détail Taxes (TEIF)</p>
                    {Object.entries(totals.vatSummary).map(([rate, data]: any) => (
                       <div key={rate} className="flex items-center justify-between text-[11px] font-bold text-zinc-500">
                          <span>Base TVA {rate}%: {data.base.toFixed(3)}</span>
                          <span className="text-zinc-400">{data.amount.toFixed(3)}</span>
                       </div>
                    ))}
                 </div>

                 <button 
                   type="submit"
                   disabled={loading}
                   className="w-full py-5 bg-teal-600 hover:bg-teal-500 text-white rounded-3xl transition-all shadow-xl shadow-teal-600/30 font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 mt-4"
                 >
                   <Save className="w-5 h-5" />
                   {loading ? 'Traitement...' : 'Enregistrer le Document'}
                 </button>
              </div>
           </div>
        </div>

      </form>
    </div>
  )
}
