'use client'
import { Link } from '@/i18n/routing'
import { Users, ClipboardList, Wallet, Calendar, Award } from 'lucide-react'
import { useTranslations } from 'next-intl'

const MODULES = [
  { href: '/hr/employees', icon: Users, key: 'employees', color: 'emerald' },
  { href: '/hr/paie', icon: Wallet, key: 'payroll', color: 'amber' },
  { href: '/hr/attendances', icon: Calendar, key: 'attendance', color: 'blue' },
  { href: '/hr/evaluations', icon: Award, key: 'evaluations', color: 'purple' },
]

const C = { emerald: 'emerald', amber: 'amber', blue: 'blue', purple: 'purple' } as any

export default function HRDashboard() {
  const t = useTranslations('HR.home')
  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-black text-white">{t('title')}</h1>
        <p className="text-zinc-500 mt-1">{t('subtitle')}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {MODULES.map(m => (
          <Link key={m.href} href={m.href} className="group bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-8 hover:border-{C[m.color]}-500/30 transition-all">
            <m.icon className={`w-10 h-10 text-${C[m.color]}-400 mb-4`} />
            <h3 className="text-xl font-black text-white">{t(`modules.${m.key}.label`)}</h3>
            <p className="text-zinc-500 text-sm mt-1">{t(`modules.${m.key}.desc`)}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
