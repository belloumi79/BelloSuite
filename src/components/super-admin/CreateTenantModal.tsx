'use client'

import { useState } from 'react'
import { X, Building2, User, Package, CheckCircle, Circle, Eye, EyeOff, ChevronRight, ChevronLeft, Save } from 'lucide-react'

interface Module { id: string; displayName: string; description: string; icon: string; monthlyPrice: number }

export default function CreateTenantModal({ isOpen, onClose, allModules, onCreated }: {
  isOpen: boolean
  onClose: () => void
  allModules: Module[]
  onCreated: () => void
}) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [form, setForm] = useState({
    name: '',
    subdomain: '',
    matriculeFiscal: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    moduleIds: [] as string[],
    adminEmail: '',
    adminPassword: '',
    adminFirstName: '',
    adminLastName: ''
  })

  if (!isOpen) return null

  const totalPrice = allModules
    .filter(m => form.moduleIds.includes(m.id))
    .reduce((sum, m) => sum + m.monthlyPrice, 0)

  const toggleModule = (id: string) => {
    setForm(f => ({
      ...f,
      moduleIds: f.moduleIds.includes(id) ? f.moduleIds.filter(x => x !== id) : [...f.moduleIds, id]
    }))
  }

  const handleNameChange = (name: string) => {
    const sub = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    setForm(f => ({ ...f, name, subdomain: sub }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/super-admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          subdomain: form.subdomain,
          matriculeFiscal: form.matriculeFiscal,
          address: form.address,
          city: form.city,
          phone: form.phone,
          email: form.email,
          moduleIds: form.moduleIds,
          adminUser: form.adminEmail ? {
            email: form.adminEmail,
            password: form.adminPassword,
            firstName: form.adminFirstName,
            lastName: form.adminLastName
          } : null
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      onCreated()
      onClose()
      // reset
      setStep(1)
      setForm({ name: '', subdomain: '', matriculeFiscal: '', address: '', city: '', phone: '', email: '', moduleIds: [], adminEmail: '', adminPassword: '', adminFirstName: '', adminLastName: '' })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md">
      <div className="bg-zinc-900 w-full max-w-2xl rounded-[2.5rem] border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-8 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight">Nouveau Client</h3>
            <div className="flex items-center gap-2 mt-2">
              {[1, 2, 3].map(s => (
                <div key={s} className={`flex items-center gap-2`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${step >= s ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-600'}`}>{s}</div>
                  {s < 3 && <div className={`w-10 h-0.5 rounded-full transition-all ${step > s ? 'bg-emerald-500' : 'bg-zinc-800'}`} />}
                </div>
              ))}
              <span className="text-xs font-bold text-zinc-500 ml-2">
                {step === 1 ? 'Infos entreprise' : step === 2 ? 'Modules SaaS' : 'Admin utilisateur'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl transition-all">
            <X className="w-6 h-6 text-zinc-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto flex-1">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">⚠️ {error}</div>
          )}

          {/* Step 1: Company Info */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-emerald-500" /></div>
                <h4 className="font-bold text-white">Informations de l'entreprise cliente</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-black text-zinc-500 uppercase mb-1.5">Raison sociale *</label>
                  <input className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:border-emerald-500 outline-none transition-all" placeholder="Société ABC SARL" value={form.name} onChange={e => handleNameChange(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase mb-1.5">Sous-domaine *</label>
                  <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden focus-within:border-emerald-500 transition-all">
                    <input className="flex-1 px-4 py-3 bg-transparent text-white outline-none text-sm font-mono" value={form.subdomain} onChange={e => setForm(f => ({ ...f, subdomain: e.target.value }))} />
                    <span className="px-3 text-zinc-600 text-xs font-bold">.bellosuite.tn</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase mb-1.5">Matricule Fiscal</label>
                  <input className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:border-emerald-500 outline-none transition-all text-sm font-mono" placeholder="1234567/A/M/000" value={form.matriculeFiscal} onChange={e => setForm(f => ({ ...f, matriculeFiscal: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase mb-1.5">Email</label>
                  <input type="email" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:border-emerald-500 outline-none transition-all" placeholder="contact@abc.tn" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase mb-1.5">Téléphone</label>
                  <input className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:border-emerald-500 outline-none transition-all" placeholder="+216 xx xxx xxx" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase mb-1.5">Ville</label>
                    <input className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:border-emerald-500 outline-none transition-all" placeholder="Tunis" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase mb-1.5">Adresse</label>
                    <input className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:border-emerald-500 outline-none transition-all" placeholder="Rue de la liberté" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Modules */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center"><Package className="w-5 h-5 text-blue-500" /></div>
                <div>
                  <h4 className="font-bold text-white">Sélectionner les modules actifs</h4>
                  <p className="text-xs text-zinc-500">Ces modules seront immédiatement accessibles au client</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {allModules.map(mod => {
                  const active = form.moduleIds.includes(mod.id)
                  return (
                    <button key={mod.id} type="button" onClick={() => toggleModule(mod.id)} className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${active ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-zinc-800/30 border-zinc-800 hover:border-zinc-700'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${active ? 'bg-emerald-500/10' : 'bg-zinc-900'}`}>{mod.icon}</div>
                        <div>
                          <p className={`font-bold text-sm ${active ? 'text-white' : 'text-zinc-400'}`}>{mod.displayName}</p>
                          <p className="text-xs text-zinc-600">{mod.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-xs font-black ${active ? 'text-emerald-400' : 'text-zinc-600'}`}>{mod.monthlyPrice} TND/mois</span>
                        {active ? <CheckCircle className="w-6 h-6 text-emerald-500" /> : <Circle className="w-6 h-6 text-zinc-700" />}
                      </div>
                    </button>
                  )
                })}
              </div>
              {form.moduleIds.length > 0 && (
                <div className="mt-6 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex justify-between items-center">
                  <span className="text-sm font-bold text-white">{form.moduleIds.length} module(s) sélectionné(s)</span>
                  <span className="text-sm font-black text-emerald-400">{totalPrice} TND / mois</span>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Admin User */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><User className="w-5 h-5 text-amber-500" /></div>
                <div>
                  <h4 className="font-bold text-white">Créer l'administrateur du client</h4>
                  <p className="text-xs text-zinc-500">Optionnel — peut être créé ultérieurement</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase mb-1.5">Prénom</label>
                  <input className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-all" placeholder="Ahmed" value={form.adminFirstName} onChange={e => setForm(f => ({ ...f, adminFirstName: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase mb-1.5">Nom</label>
                  <input className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-all" placeholder="Ben Ali" value={form.adminLastName} onChange={e => setForm(f => ({ ...f, adminLastName: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-black text-zinc-500 uppercase mb-1.5">Email</label>
                  <input type="email" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-all" placeholder="admin@abc.tn" value={form.adminEmail} onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-black text-zinc-500 uppercase mb-1.5">Mot de passe</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 pr-12 text-white focus:border-amber-500 outline-none transition-all" placeholder="••••••••" value={form.adminPassword} onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))} />
                    <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-all">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="mt-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl p-5 space-y-3">
                <h5 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Résumé</h5>
                <div className="flex justify-between text-sm"><span className="text-zinc-500">Client</span><span className="font-bold text-white">{form.name}</span></div>
                <div className="flex justify-between text-sm"><span className="text-zinc-500">Modules</span><span className="font-bold text-emerald-400">{form.moduleIds.length} modules</span></div>
                <div className="flex justify-between text-sm"><span className="text-zinc-500">MRR</span><span className="font-black text-emerald-400">{totalPrice} TND/mois</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 flex gap-4 shrink-0">
          {step > 1 && (
            <button type="button" onClick={() => setStep(s => s - 1)} className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-2xl transition-all text-sm">
              <ChevronLeft className="w-4 h-4" /> Retour
            </button>
          )}
          {step < 3 ? (
            <button type="button" onClick={() => { if (step === 1 && !form.name) return setError('La raison sociale est obligatoire'); setError(''); setStep(s => s + 1) }} className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl transition-all text-sm">
              Suivant <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-bold rounded-2xl transition-all text-sm">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              Créer le client
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
