'use client'

import { useState, useEffect } from 'react'
import { X, Save, User, Mail, Phone, MapPin, Building2, ShieldCheck } from 'lucide-react'
import gsap from 'gsap'

interface ClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  tenantId: string
  client?: any // For edit mode
}

export default function ClientModal({ isOpen, onClose, onSuccess, tenantId, client }: ClientModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zipCode: '',
    matriculeFiscal: '', // 1234567/A/M/000
  })

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        code: client.code || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        city: client.city || '',
        zipCode: client.zipCode || '',
        matriculeFiscal: client.matriculeFiscal || '',
      })
    } else {
      setFormData({
        name: '',
        code: `CLT-${Math.floor(Math.random() * 10000)}`,
        email: '',
        phone: '',
        address: '',
        city: '',
        zipCode: '',
        matriculeFiscal: '',
      })
    }
  }, [client, isOpen])

  useEffect(() => {
    if (isOpen) {
      gsap.fromTo('.modal-content', 
        { scale: 0.9, opacity: 0, y: 20 }, 
        { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.7)' }
      )
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const url = client ? `/api/commercial/clients/${client.id}` : '/api/commercial/clients'
      const method = client ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, tenantId }),
      })

      if (res.ok) {
        onSuccess()
        onClose()
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md">
      <div className="modal-content bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl shadow-emerald-500/5">
        
        {/* Header */}
        <div className="p-8 border-b border-zinc-800 flex items-center justify-between bg-gradient-to-r from-zinc-900 to-zinc-800/50">
          <div className="flex items-center gap-3">
             <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <User className="w-6 h-6 text-emerald-400" />
             </div>
             <div>
                <h2 className="text-2xl font-black text-white tracking-tight">{client ? 'Modifier Client' : 'Nouveau Client'}</h2>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Fiche Partenaire TN</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500 transition-all"><X className="w-6 h-6" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Désignation / Nom</label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-white focus:border-emerald-500 shadow-inner transition-all outline-none"
                  placeholder="Ex: Entreprise Tunisienne"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Matricule Fiscal</label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input 
                  required
                  value={formData.matriculeFiscal}
                  onChange={e => setFormData({...formData, matriculeFiscal: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-white focus:border-emerald-500 shadow-inner transition-all outline-none"
                  placeholder="1234567/A/M/000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input 
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-white focus:border-emerald-500 shadow-inner transition-all outline-none"
                  placeholder="contact@client.tn"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Téléphone</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-white focus:border-emerald-500 shadow-inner transition-all outline-none"
                  placeholder="+216 -- --- ---"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Adresse Complète</label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-4 top-8 -translate-y-1/2 text-zinc-600" />
              <textarea 
                rows={2}
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-white focus:border-emerald-500 shadow-inner transition-all outline-none"
                placeholder="Rue, Immeuble, Étage..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
               <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Gouvernorat / Ville</label>
               <input 
                 value={formData.city}
                 onChange={e => setFormData({...formData, city: e.target.value})}
                 className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:border-emerald-500 shadow-inner transition-all outline-none"
                 placeholder="Tunis, Sousse..."
               />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Code Postal</label>
               <input 
                 value={formData.zipCode}
                 onChange={e => setFormData({...formData, zipCode: e.target.value})}
                 className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:border-emerald-500 shadow-inner transition-all outline-none"
                 placeholder="1001"
               />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-4 bg-zinc-800 rounded-2xl text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all border border-transparent hover:border-zinc-700"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-[2] py-4 bg-emerald-600 rounded-2xl text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Enregistrement...' : 'Enregistrer Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
