'use client'
import Link from 'next/link'
import { Users, ClipboardList, Wallet, Calendar, Award } from 'lucide-react'

const MODULES = [
  { href: '/hr/employees', icon: Users, label: 'Employés', color: 'emerald', desc: 'Gestion des employés et contrats' },
  { href: '/hr/paie', icon: Wallet, label: 'Paie', color: 'amber', desc: 'Bulletins de salaire Tunisia' },
  { href: '/hr/attendances', icon: Calendar, label: 'Présences', color: 'blue', desc: 'Absences et retards' },
  { href: '/hr/evaluations', icon: Award, label: 'Évaluations', color: 'purple', desc: 'Management des qualifications' },
]

const C = { emerald: 'emerald', amber: 'amber', blue: 'blue', purple: 'purple' } as any

export default function HRDashboard() {
  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-black text-white">RH & Paie</h1>
        <p className="text-zinc-500 mt-1">Gestion des ressources humaines et payroll Tunisia</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {MODULES.map(m => (
          <Link key={m.href} href={m.href} className="group bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-8 hover:border-{C[m.color]}-500/30 transition-all">
            <m.icon className={`w-10 h-10 text-${C[m.color]}-400 mb-4`} />
            <h3 className="text-xl font-black text-white">{m.label}</h3>
            <p className="text-zinc-500 text-sm mt-1">{m.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
