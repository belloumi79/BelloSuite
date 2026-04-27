'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { ShoppingCart, Search, Trash2, RefreshCw, Package, Lock, ShoppingBag, Plus, Minus, CreditCard, Clock } from 'lucide-react'
import PaymentModal from '@/components/pos/PaymentModal'
import ReceiptModal from '@/components/pos/ReceiptModal'
import SessionOpenModal from '@/components/pos/SessionOpenModal'
import type { POSCartItem, POSProduct, POSSessionInfo } from '@/lib/pos-types'

const TIMBRE = 1

export default function POSPage() {
  const [tenantId, setTenantId] = useState('')
  const [user, setUser] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [showSess, setShowSess] = useState<boolean>(false)
  const [products, setProducts] = useState<any[]>([])
  const [cart, setCart] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [discount, setDiscount] = useState<number>(0)
  const [showPay, setShowPay] = useState<boolean>(false)
  const [showRcpt, setShowRcpt] = useState<boolean>(false)
  const [lastOrder, setLastOrder] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/session')
        if (!res.ok) return
        const sessionData = await res.json()
        setTenantId(sessionData.tenantId || '')
        setUser(sessionData)
        const tid = sessionData.tenantId || ''
        if (!tid) return
        fetch('/api/pos/sessions?tenantId=' + tid + '&status=OPEN')
          .then(r => r.json())
          .then(data => {
            if (Array.isArray(data) && data.length > 0) {
              const d = data[0]
              setSession({ id: d.id, tenantId: tid, userId: d.userId, userName: d.userName, openingCash: d.openingCash, status: 'OPEN', ordersCount: d.ordersCount || 0, totalSales: d.totalSales || 0 })
            } else { setShowSess(true) }
          })
      } catch (err) {
        console.error('Session check failed:', err)
      }
    }
    checkSession()
  }, [])

  const loadProducts = useCallback(async (tid: string) => {
    const r = await fetch('/api/pos/products?tenantId=' + tid + '&limit=200')
    if (r.ok) { const d = await r.json(); setProducts(d.data || []) }
  }, [])

  useEffect(() => { if (tenantId) loadProducts(tenantId) }, [tenantId, loadProducts])

  const filtered = useMemo(() => {
    if (!q) return products
    const lo = q.toLowerCase()
    return products.filter((p) => p.name.toLowerCase().includes(lo) || p.code.toLowerCase().includes(lo))
  }, [products, q])

  const totals = useMemo(() => {
    const subtotalHT = cart.reduce((s, i) => s + i.totalHT, 0)
    const totalVAT = cart.reduce((s, i) => s + i.vatAmount, 0)
    const discountAmount = subtotalHT * (discount / 100)
    const afterDiscount = subtotalHT - discountAmount
    const totalTTC = afterDiscount + totalVAT + TIMBRE
    return { subtotalHT, totalVAT, discountAmount, totalTTC }
  }, [cart, discount])

  const addToCart = (p: any) => {
    setCart(prev => {
      const ex = prev.find(i => i.productId === p.id)
      if (ex) { return prev.map(i => i.productId === p.id ? { ...i, quantity: i.quantity + 1, totalHT: (i.quantity + 1) * i.unitPriceHT, vatAmount: (i.quantity + 1) * i.unitPriceHT * i.vatRate / 100, totalTTC: (i.quantity + 1) * i.unitPriceHT * (1 + i.vatRate / 100) } : i) }
      const unitPriceHT = Number(p.salePrice)
      const vatRate = Number(p.vatRate || 19)
      const totalHT = unitPriceHT
      const vatAmount = totalHT * vatRate / 100
      const totalTTC = totalHT + vatAmount
      return [...prev, { productId: p.id, productCode: p.code, description: p.name, quantity: 1, unitPriceHT, vatRate, vatAmount, discount: 0, totalHT, totalTTC }]
    })
  }

  const updateQty = (productId: any, delta: any) => {
    setCart(prev => prev.map(i => i.productId === productId ? { ...i, quantity: Math.max(0, i.quantity + delta), totalHT: Math.max(0, i.quantity + delta) * i.unitPriceHT, vatAmount: Math.max(0, i.quantity + delta) * i.unitPriceHT * i.vatRate / 100, totalTTC: Math.max(0, i.quantity + delta) * i.unitPriceHT * (1 + i.vatRate / 100) } : i).filter(i => i.quantity > 0))
  }

  const removeFromCart = (productId: any) => { setCart(prev => prev.filter(i => i.productId !== productId)) }

  const pay = async (paidAmount: any, paymentMethod: any) => {
    if (!session || cart.length === 0) return
    setLoading(true)
    try {
      const r = await fetch('/api/pos/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantId, sessionId: session.id, items: cart, paidAmount, paymentMethod, discountPercent: discount, notes: '' }) })
      if (r.ok) { const order = await r.json(); setLastOrder(order); setCart([]); setDiscount(0); setShowPay(false); setShowRcpt(true) }
    } finally { setLoading(false) }
  }

  const openSess = async (openingCash: any) => {
    const r = await fetch('/api/pos/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantId, userId: user?.id, userName: user?.firstName || user?.email, openingCash }) })
    if (r.ok) { const d = await r.json(); setSession({ id: d.id, tenantId, userId: user?.id || '', userName: user?.firstName || '', openingCash, status: 'OPEN', ordersCount: 0, totalSales: 0 }); setShowSess(false) }
  }

  const fmt = (n: number) => n.toLocaleString('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 3 })

  if (!session && !showSess) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-stone-100'>
        <div className='text-center space-y-4'>
          <div className='w-20 h-20 bg-stone-200 rounded-full flex items-center justify-center mx-auto'><Lock className='w-10 h-10 text-stone-400' /></div>
          <h2 className='text-2xl font-black text-stone-700'>Caisse Fermee</h2>
          <p className='text-stone-500'>Ouvrez une session pour commencer</p>
          <button onClick={() => setShowSess(true)} className='px-6 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700'>Ouvrir la Caisse</button>
        </div>
        {showSess && <SessionOpenModal onOpen={openSess} onClose={() => setShowSess(false)} />}
      </div>
    )
  }

  return (
    <div className='flex flex-col lg:flex-row gap-6 min-h-screen'>
      <div className='lg:w-2/3 space-y-4'>
        <div className='bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden'>
          <div className='p-4 border-b border-stone-100 flex flex-col sm:flex-row gap-3'>
            <div className='relative flex-1'>
              <Search className='w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400' />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder='Rechercher un produit...' className='w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none' />
            </div>
            <button onClick={() => tenantId && loadProducts(tenantId)} className='px-4 py-2 border border-stone-200 rounded-xl text-stone-500 hover:bg-stone-50'><RefreshCw className='w-4 h-4' /></button>
          </div>
          <div className='grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 p-4 max-h-[calc(100vh-220px)] overflow-y-auto'>
            {filtered.length === 0 ? (
              <div className='col-span-full text-center py-12 text-stone-400'><Package className='w-12 h-12 mx-auto mb-2' /><p className='font-medium'>Aucun produit</p></div>
            ) : filtered.map(p => (
              <button key={p.id} onClick={() => addToCart(p)} className='bg-stone-50 hover:bg-teal-50 border border-stone-200 hover:border-teal-300 rounded-xl p-3 text-left transition-all group'>
                <div className='w-full h-16 bg-stone-100 group-hover:bg-teal-100 rounded-lg mb-2 flex items-center justify-center'><Package className='w-8 h-8 text-stone-400 group-hover:text-teal-500' /></div>
                <p className='font-bold text-stone-800 text-xs truncate'>{p.name}</p>
                <p className='text-teal-600 font-black text-sm'>{fmt(Number(p.salePrice))}</p>
                <p className='text-stone-400 text-xs'>{p.currentStock} en stock</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className='lg:w-1/3 space-y-4'>
        <div className='bg-white rounded-2xl border border-stone-200 shadow-sm p-4 flex items-center justify-between'>
          <div className='flex items-center gap-2'><Clock className='w-4 h-4 text-stone-400' /><span className='text-xs font-bold text-stone-500'>{session?.userName}</span></div>
          <button onClick={() => setShowSess(true)} className='text-xs font-bold text-stone-400 hover:text-red-500'>Fermer</button>
        </div>

        <div className='bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col' style={{ maxHeight: 'calc(100vh - 420px)' }}>
          <div className='p-4 border-b border-stone-100 flex items-center gap-2'>
            <ShoppingCart className='w-5 h-5 text-teal-600' />
            <span className='font-bold text-stone-800'>Panier</span>
            <span className='ml-auto bg-teal-100 text-teal-700 text-xs font-bold px-2 py-0.5 rounded-full'>{cart.length}</span>
          </div>
          <div className='flex-1 overflow-y-auto divide-y divide-stone-50'>
            {cart.length === 0 ? (
              <div className='p-8 text-center'><ShoppingBag className='w-10 h-10 text-stone-200 mx-auto mb-2' /><p className='text-stone-400 text-sm font-medium'>Panier vide</p></div>
            ) : cart.map(item => (
              <div key={item.productId} className='p-3 flex items-center gap-3'>
                <div className='flex-1 min-w-0'>
                  <p className='font-bold text-stone-800 text-xs truncate'>{item.description}</p>
                  <p className='text-teal-600 font-black text-sm'>{fmt(item.totalTTC)}</p>
                </div>
                <div className='flex items-center gap-1.5 bg-stone-100 rounded-lg px-2 py-1'>
                  <button onClick={() => updateQty(item.productId, -1)} className='w-6 h-6 flex items-center justify-center text-stone-500 hover:text-red-500 hover:bg-red-50 rounded transition-all'><Minus className='w-3 h-3' /></button>
                  <span className='font-bold text-stone-800 text-xs w-6 text-center'>{item.quantity}</span>
                  <button onClick={() => updateQty(item.productId, 1)} className='w-6 h-6 flex items-center justify-center text-stone-500 hover:text-teal-600 hover:bg-teal-50 rounded transition-all'><Plus className='w-3 h-3' /></button>
                </div>
                <button onClick={() => removeFromCart(item.productId)} className='p-1 text-stone-300 hover:text-red-400 transition-colors'><Trash2 className='w-4 h-4' /></button>
              </div>
            ))}
          </div>
        </div>

        <div className='bg-white rounded-2xl border border-stone-200 shadow-sm p-4 flex items-center gap-3'>
          <span className='text-sm font-bold text-stone-600'>Remise %</span>
          <input type='number' min='0' max='100' value={discount} onChange={e => setDiscount(Number(e.target.value))} className='flex-1 px-3 py-2 border border-stone-200 rounded-xl text-sm font-bold text-center focus:ring-2 focus:ring-teal-500 outline-none' />
          <span className='text-sm text-teal-600 font-bold'>-{fmt(totals.discountAmount)}</span>
        </div>

        <div className='bg-white rounded-2xl border border-stone-200 shadow-sm p-4 space-y-2'>
          <div className='flex justify-between text-sm'><span className='text-stone-500'>Total HT</span><span className='font-bold text-stone-700'>{fmt(totals.subtotalHT)}</span></div>
          <div className='flex justify-between text-sm'><span className='text-stone-500'>TVA</span><span className='font-bold text-stone-700'>{fmt(totals.totalVAT)}</span></div>
          {totals.discountAmount > 0 && <div className='flex justify-between text-sm'><span className='text-teal-500'>Remise</span><span className='font-bold text-teal-600'>-{fmt(totals.discountAmount)}</span></div>}
          <div className='flex justify-between text-sm'><span className='text-stone-500'>Timbre</span><span className='font-bold text-stone-700'>{fmt(TIMBRE)}</span></div>
          <div className='border-t border-stone-200 pt-2 flex justify-between'><span className='font-black text-stone-900'>Total TTC</span><span className='font-black text-xl text-teal-600'>{fmt(totals.totalTTC)}</span></div>
        </div>

        <button onClick={() => setShowPay(true)} disabled={cart.length === 0 || loading} className='w-full py-4 bg-teal-600 hover:bg-teal-700 disabled:bg-stone-300 text-white rounded-2xl font-black text-lg shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-3'>
          {loading ? <RefreshCw className='w-5 h-5 animate-spin' /> : <CreditCard className='w-5 h-5' />}
          Payer {cart.length > 0 && <span className='ml-1'>{fmt(totals.totalTTC)}</span>}
        </button>
      </div>

      {showPay && <PaymentModal totalTTC={totals.totalTTC} onPay={pay} onClose={() => setShowPay(false)} />}
      {showRcpt && lastOrder && <ReceiptModal order={lastOrder} onClose={() => setShowRcpt(false)} />}
      {showSess && <SessionOpenModal onOpen={openSess} onClose={() => setShowSess(false)} />}
    </div>
  )
}
