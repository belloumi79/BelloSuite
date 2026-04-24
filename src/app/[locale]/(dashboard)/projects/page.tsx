'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Folder, Users, Calendar, CheckSquare, ArrowRight } from 'lucide-react'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [tenantId, setTenantId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/session')
        if (!res.ok) return
        const sessionData = await res.json()
        const tid = sessionData.tenantId || ''
        setTenantId(tid)
        fetch(`/api/projects?tenantId=${tid}`)
          .then(r => r.json())
          .then(data => { setProjects(Array.isArray(data) ? data : []); setLoading(false) })
          .catch(() => setLoading(false))
      } catch (err) {
        console.error('Session check failed:', err)
        setLoading(false)
      }
    }
    checkSession()
  }, [])

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Projets</h1>
          <p className="text-zinc-500 font-medium text-sm mt-1">Gérez vos projets en méthode Kanban</p>
        </div>
        <Link href={`/projects/new`}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-sm transition-colors">
          <Plus className="w-4 h-4" /> Nouveau projet
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" /></div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/50 rounded-3xl border border-zinc-800">
          <Folder className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-400 font-bold">Aucun projet</p>
          <p className="text-zinc-600 text-sm mt-1">Créez votre premier projet pour commencer</p>
          <Link href="/projects/new" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-sm">
            <Plus className="w-4 h-4" /> Créer un projet
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <Link key={p.id} href={`/projects/${p.id}/kanban`}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-teal-500/50 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
                  <Folder className="w-5 h-5 text-teal-400" />
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-teal-400 transition-colors" />
              </div>
              <h3 className="font-black text-white mb-1">{p.name}</h3>
              <p className="text-xs text-zinc-500 line-clamp-2 mb-4">{p.description || 'Aucune description'}</p>
              <div className="flex items-center gap-4 text-zinc-600 text-xs font-bold">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {p._count?.members || 0}</span>
                <span className="flex items-center gap-1"><CheckSquare className="w-3 h-3" /> {p._count?.tasks || 0} tâches</span>
                {p.dueDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(p.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
