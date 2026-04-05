'use client'

import { 
  Users, 
  UserPlus, 
  FileText, 
  PlusCircle, 
  TrendingUp, 
  CreditCard,
  Truck,
  ArrowUpRight,
  History
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function CommercialDashboard() {
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto min-h-screen bg-transparent pt-0">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
             Module Commercial
             <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
               <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">v1.0 TN</span>
             </div>
          </h1>
          <p className="text-zinc-500 mt-2 font-medium max-w-md">Gestion de la facturation conforme à la loi tunisienne (TEIF 1.8.8).</p>
        </div>
      </div>

      {/* Main Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Clients Action */}
        <Link href="/commercial/clients" className="group">
          <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-[2.5rem] p-8 hover:border-emerald-500/30 transition-all relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-emerald-500/10 transition-all" />
            <div className="p-4 bg-emerald-500/10 rounded-2xl w-fit mb-6 border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <Users className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Gestion Clients</h3>
            <p className="text-zinc-500 text-sm font-medium mb-8">Fiche clients, matricule fiscal et suivi des créances.</p>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-widest">
              Accéder <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
        </Link>

        {/* Suppliers Action */}
        <Link href="/commercial/suppliers" className="group">
          <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-[2.5rem] p-8 hover:border-amber-500/30 transition-all relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-amber-500/10 transition-all" />
            <div className="p-4 bg-amber-500/10 rounded-2xl w-fit mb-6 border border-amber-500/20 group-hover:scale-110 transition-transform">
              <Truck className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Fournisseurs</h3>
            <p className="text-zinc-500 text-sm font-medium mb-8">Gestion des achats, bons de commande et partenaires.</p>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-widest">
              Accéder <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
        </Link>

        {/* Invoices Action */}
        <Link href="/commercial/invoices" className="group">
          <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-[2.5rem] p-8 hover:border-teal-500/30 transition-all relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-teal-500/10 transition-all" />
            <div className="p-4 bg-teal-500/10 rounded-2xl w-fit mb-6 border border-teal-500/20 group-hover:scale-110 transition-transform">
              <FileText className="w-8 h-8 text-teal-400" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Facturation</h3>
            <p className="text-zinc-500 text-sm font-medium mb-8">Émission de factures, TVA, FODEC et Timbre fiscal.</p>
            <div className="flex items-center gap-2 text-teal-400 text-xs font-black uppercase tracking-widest">
              Accéder <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
        </Link>

      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
        
        {/* Recent Invoices */}
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-[2.5rem] p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-500" />
              Activités Récentes
            </h3>
            <Link href="/commercial/invoices" className="text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-widest transition-all">Voir tout</Link>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 border border-zinc-800/50 rounded-2xl flex items-center justify-between hover:bg-zinc-800/30 transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                   <FileText className="w-5 h-5 text-zinc-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white tracking-tight">FA-2024-001</p>
                  <p className="text-[10px] text-emerald-500 font-black uppercase tracking-tighter">Société Exemple</p>
                </div>
              </div>
              <div className="text-right">
                 <p className="text-sm font-black text-white">450.000 DT</p>
                 <p className="text-[9px] text-zinc-500 font-bold">04 Avril 2024</p>
              </div>
            </div>
            {/* Empty state message if no real data yet */}
            <div className="py-10 text-center">
               <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">Aucune donnée trouvée</p>
            </div>
          </div>
        </div>

        {/* Sales Performance */}
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-[2.5rem] p-8">
          <h3 className="text-xl font-black text-white flex items-center gap-2 mb-8">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            Performance Ventes
          </h3>
          <div className="h-48 flex items-end justify-between gap-2 px-4">
            {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
              <div key={i} className="flex-1 space-y-2 group">
                 <div className="relative h-full w-full flex items-end">
                    <div 
                      className="w-full bg-gradient-to-t from-emerald-500/20 to-emerald-500/50 rounded-t-lg transition-all group-hover:scale-110 group-hover:from-emerald-400 group-hover:to-emerald-500 shadow-lg shadow-emerald-500/10" 
                      style={{ height: `${h}%` }} 
                    />
                 </div>
                 <p className="text-[9px] text-center font-black text-zinc-600 group-hover:text-white uppercase">J-{6-i}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  )
}
