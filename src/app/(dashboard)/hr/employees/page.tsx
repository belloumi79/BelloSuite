'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Upload, Users, Plus } from 'lucide-react'

export default function EmployeesPage() {
  const [tenantId, setTenantId] = useState('')

  useEffect(() => {
    try {
      const session = localStorage.getItem('bello_session')
      if (session) setTenantId(JSON.parse(session).tenantId || '')
    } catch {}
  }, [])

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">Employés</h1>
          <p className="text-stone-500 font-medium text-sm mt-1">Gérez vos employés et leur dossier RH</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/hr/employees/import"
            className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl font-bold text-sm transition-all"
          >
            <Upload className="w-4 h-4" /> Import CSV / Excel
          </Link>
          <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-sm transition-all">
            <Plus className="w-4 h-4" /> Nouvel Employé
          </button>
        </div>
      </div>

      {/* Placeholder card */}
      <div className="bg-white rounded-[2rem] border border-stone-200 shadow-sm p-16 text-center">
        <Users className="w-16 h-16 text-stone-300 mx-auto mb-4" />
        <h3 className="text-xl font-black text-stone-700 mb-2">Module Employés</h3>
        <p className="text-stone-400 font-medium mb-6">La liste complète des employés apparaîtra ici.</p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/hr/employees/import"
            className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-sm transition-all"
          >
            <Upload className="w-4 h-4 inline mr-2" />
            Importer depuis Excel
          </Link>
        </div>
      </div>
    </div>
  )
}