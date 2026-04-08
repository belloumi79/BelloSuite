'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Save, Package, Image, Hash, DollarSign, Layers, AlertTriangle } from 'lucide-react'

type Variant = {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  attributes: Record<string, string>
}

export default function NewProductPage() {
  const router = useRouter()
  const [tenantId, setTenantId] = useState('')
  const [loading, setLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<any[]>([])

  const [form, setForm] = useState({
    code: '', barcode: '', name: '', description: '',
    category: '', unit: 'unit', purchasePrice: '', salePrice: '',
    vatRate: '19', fodec: false, minStock: '', initialStock: '',
  })
  const [images, setImages] = useState<string[]>([])
  const [newImage, setNewImage] = useState('')
  const [variants, setVariants] = useState<Variant[]>([])
  const [newVariant, setNewVariant] = useState({ name: '', sku: '', price: '', stock: '', size: '', color: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    const session = localStorage.getItem('bello_session')
    if (session) {
      const { tenantId: tid } = JSON.parse(session)
      setTenantId(tid)
      fetch(`/api/commercial/suppliers?tenantId=${tid}`).then(r => { if (r.ok) r.json().then(d => setSuppliers(d)) }).catch(() => {})
    }
  }, [])

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const addImage = () => {
    if (newImage.trim()) setImages(im => [...im, newImage.trim()])
    setNewImage('')
  }

  const addVariant = () => {
    if (!newVariant.name || !newVariant.sku) return
    const v: Variant = {
      id: crypto.randomUUID(),
      name: newVariant.name,
      sku: newVariant.sku,
      price: Number(newVariant.price) || 0,
      stock: Number(newVariant.stock) || 0,
      attributes: { ...(newVariant.size && { Size: newVariant.size }), ...(newVariant.color && { Couleur: newVariant.color }) },
    }
    setVariants(vs => [...vs, v])
    setNewVariant({ name: '', sku: '', price: '', stock: '', size: '', color: '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.code || !form.name) { setError('Code et Nom sont requis'); return }
    setLoading(true)
    setError('')
    const res = await fetch('/api/stock/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, tenantId, images, variants }),
    })
    if (res.ok) {
      router.push('/stock/products')
    } else {
      const d = await res.json()
      setError(d.error || 'Erreur')
      setLoading(false)
    }
  }

  const inputCls = "w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-teal-500/50"
  const labelCls = "block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2"

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen bg-transparent pt-0">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/stock/products" className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-all"><ArrowLeft className="w-5 h-5" /></Link>
        <div><h1 className="text-3xl font-black text-white tracking-tight">Nouveau Produit</h1><p className="text-zinc-500 font-medium text-sm mt-1">Ajouter une nouvelle référence</p></div>
      </div>

      {error && <div className="mb-6 px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Infos générales */}
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-8">
          <h2 className="text-lg font-black text-white flex items-center gap-2 mb-6"><Package className="w-5 h-5 text-teal-400" /> Informations Produit</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Code / SKU *</label>
              <div className="relative"><Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" /><input value={form.code} onChange={e => set('code', e.target.value)} placeholder="PROD-001" className={inputCls + " pl-10"} required /></div>
            </div>
            <div>
              <label className={labelCls}>Code Barres</label>
              <input value={form.barcode} onChange={e => set('barcode', e.target.value)} placeholder="6291041500212" className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Nom *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nom du produit" className={inputCls} required />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Description..." className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Catégorie</label>
              <input value={form.category} onChange={e => set('category', e.target.value)} placeholder="Electronique" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Unité</label>
              <select value={form.unit} onChange={e => set('unit', e.target.value)} className={inputCls}>
                <option value="unit">Unité</option>
                <option value="kg">Kilogramme</option>
                <option value="l">Litre</option>
                <option value="m">Mètre</option>
                <option value="piece">Pièce</option>
                <option value="box">Boîte</option>
              </select>
            </div>
          </div>
        </div>

        {/* Prix */}
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-8">
          <h2 className="text-lg font-black text-white flex items-center gap-2 mb-6"><DollarSign className="w-5 h-5 text-emerald-400" /> Prix</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <div>
              <label className={labelCls}>Prix Achat (HT)</label>
              <input type="number" step="0.001" value={form.purchasePrice} onChange={e => set('purchasePrice', e.target.value)} placeholder="0.000" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Prix Vente (HT)</label>
              <input type="number" step="0.001" value={form.salePrice} onChange={e => set('salePrice', e.target.value)} placeholder="0.000" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>TVA (%)</label>
              <select value={form.vatRate} onChange={e => set('vatRate', e.target.value)} className={inputCls}>
                <option value="0">0%</option>
                <option value="7">7%</option>
                <option value="13">13%</option>
                <option value="19">19%</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Stock Initial</label>
              <input type="number" step="1" value={form.initialStock} onChange={e => set('initialStock', e.target.value)} placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Stock Minimum (Alerte)</label>
              <input type="number" step="1" value={form.minStock} onChange={e => set('minStock', e.target.value)} placeholder="0" className={inputCls} />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input type="checkbox" id="fodec" checked={form.fodec} onChange={e => set('fodec', e.target.checked)} className="w-5 h-5 rounded accent-teal-500" />
              <label htmlFor="fodec" className="text-zinc-400 text-sm font-bold cursor-pointer">FODEC applicable</label>
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-8">
          <h2 className="text-lg font-black text-white flex items-center gap-2 mb-6"><Image className="w-5 h-5 text-purple-400" /> Images</h2>
          <div className="flex gap-3 mb-4">
            <input value={newImage} onChange={e => setNewImage(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addImage())} placeholder="URL de l'image" className={inputCls + " flex-1"} />
            <button type="button" onClick={addImage} className="px-5 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl font-bold text-sm"><Plus className="w-4 h-4" /></button>
          </div>
          {images.length > 0 && (
            <div className="flex gap-3 flex-wrap">
              {images.map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden bg-zinc-800">
                  <img src={url} className="w-full h-full object-cover" alt="" />
                  <button type="button" onClick={() => setImages(im => im.filter((_, j) => j !== i))} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4 text-red-400" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Variantes */}
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-8">
          <h2 className="text-lg font-black text-white flex items-center gap-2 mb-6"><Layers className="w-5 h-5 text-amber-400" /> Variantes (Taille, Couleur...)</h2>
          {variants.length > 0 && (
            <div className="mb-6 space-y-2">
              {variants.map((v, i) => (
                <div key={v.id} className="flex items-center gap-4 bg-zinc-800/50 rounded-xl px-4 py-3">
                  <span className="font-bold text-white text-sm flex-1">{v.name}</span>
                  <span className="text-zinc-500 text-xs font-mono">{v.sku}</span>
                  <span className="text-emerald-400 text-sm font-mono">{Number(v.price).toFixed(3)} TND</span>
                  <span className="text-zinc-400 text-xs">Stock: {v.stock}</span>
                  <button type="button" onClick={() => setVariants(vs => vs.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <input value={newVariant.name} onChange={e => setNewVariant(v => ({ ...v, name: e.target.value }))} placeholder="Nom (ex: Rouge / XL)" className={inputCls} />
            <input value={newVariant.sku} onChange={e => setNewVariant(v => ({ ...v, sku: e.target.value }))} placeholder="SKU variante" className={inputCls} />
            <input value={newVariant.price} onChange={e => setNewVariant(v => ({ ...v, price: e.target.value }))} placeholder="Prix" type="number" step="0.001" className={inputCls} />
            <input value={newVariant.stock} onChange={e => setNewVariant(v => ({ ...v, stock: e.target.value }))} placeholder="Stock" type="number" className={inputCls} />
            <input value={newVariant.size} onChange={e => setNewVariant(v => ({ ...v, size: e.target.value }))} placeholder="Taille" className={inputCls} />
            <input value={newVariant.color} onChange={e => setNewVariant(v => ({ ...v, color: e.target.value }))} placeholder="Couleur" className={inputCls} />
          </div>
          <button type="button" onClick={addVariant} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm"><Plus className="w-4 h-4" /> Ajouter Variante</button>
        </div>

        <div className="flex items-center justify-end gap-4 pb-8">
          <Link href="/stock/products" className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold">Annuler</Link>
          <button type="submit" disabled={loading} className="flex items-center gap-2 px-8 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold shadow-lg shadow-teal-600/20 disabled:opacity-50"><Save className="w-5 h-5" />{loading ? 'Création...' : 'Créer Produit'}</button>
        </div>
      </form>
    </div>
  )
}
