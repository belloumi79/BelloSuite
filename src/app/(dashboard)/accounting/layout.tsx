'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Calendar, Settings2, FileText, CheckCircle2 } from 'lucide-react'

export default function AccountingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const tabs = [
    { name: 'Plan Comptable', path: '/accounting/chart', icon: BookOpen },
    { name: 'Journaux', path: '/accounting/journals', icon: Settings2 },
    { name: 'Exercices', path: '/accounting/periods', icon: Calendar },
    { name: 'Écritures (Brouillard)', path: '/accounting/entries', icon: FileText },
    { name: 'Grand Livre', path: '/accounting/ledger', icon: CheckCircle2 }
  ]

  return (
    <div className="flex flex-col w-full min-h-screen bg-zinc-950">
      {/* Accounting Sub-navbar */}
      <div className="border-b border-zinc-800/50 bg-zinc-900/30 sticky top-0 z-40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto py-3 no-scrollbar">
            {tabs.map((tab) => {
              const isActive = pathname.startsWith(tab.path)
              const Icon = tab.icon
              return (
                <Link
                  key={tab.path}
                  href={tab.path}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap ${
                    isActive 
                      ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' 
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
