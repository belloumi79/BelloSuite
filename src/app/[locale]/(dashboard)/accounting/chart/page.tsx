'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, BookOpen, AlertCircle, CheckCircle2, ChevronRight, ChevronDown, Download } from 'lucide-react'

type Account = {
  id: string
  accountNumber: string
  name: string
  type: string
  parentId: string | null
  children?: Account[]
}

const TYPE_COLORS: Record<string, string> = {
  ASSET: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  LIABILITY: 'text-red-500 bg-red-500/10 border-red-500/20',
  EQUITY: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  REVENUE: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  EXPENSE: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
}

const TYPE_LABELS: Record<string, string> = {
  ASSET: 'Actifs',
  LIABILITY: 'Passifs',
  EQUITY: 'Capitaux Propres',
  REVENUE: 'Produits',
  EXPENSE: 'Charges',
}

export default function ChartOfAccountsPage() {
  const [tenantId, setTenantId] = useState('')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [initLoading, setInitLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function checkSession() { try { const res = await fetch('/api/auth/session'); if (res.ok) { const sessionData = await res.json(); setTenantId(sessionData.tenantId || ''); } } catch (err) { console.error('Session check failed:', err); } } checkSession(); /* const session = null
    if (session) {
      const { tenantId } = JSON.parse(session)
      setTenantId(tenantId)
      fetchAccounts(tenantId)
    }
  }, [])

  const fetchAccounts = async (tid: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/accounting/accounts?tenantId=${tid}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setAccounts(buildHierarchy(data))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const buildHierarchy = (flatAccounts: Account[]) => {
    const map = new Map<string, Account>()
    const roots: Account[] = []

    // Sort by length to assure parents exist
    flatAccounts.sort((a, b) => a.accountNumber.length - b.accountNumber.length).forEach(acc => {
      map.set(acc.id, { ...acc, children: [] })
    })

    flatAccounts.forEach(acc => {
      const node = map.get(acc.id)!
      if (acc.parentId && map.has(acc.parentId)) {
        map.get(acc.parentId)!.children!.push(node)
      } else {
        roots.push(node)
      }
    })

    // Sub-sort children lexicographically
    const deepSort = (nodes: Account[]) => {
      nodes.sort((a, b) => a.accountNumber.localeCompare(b.accountNumber))
      nodes.forEach(n => deepSort(n.children!))
    }
    deepSort(roots)

    return roots
  }

  const handleInit = async () => {
    if (!confirm('Voulez-vous initialiser le Plan Comptable Tunisien Standard ?')) return
    setInitLoading(true)
    try {
      const res = await fetch('/api/accounting/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId })
      })
      if (res.ok) {
        fetchAccounts(tenantId)
      } else {
        alert("Erreur d'initialisation")
      }
    } catch (err) {
      console.error(err)
    } finally {
      setInitLoading(false)
    }
  }

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const renderAccountNode = (account: Account, level: number = 0) => {
    const isExpanded = expanded[account.id]
    const hasChildren = account.children && account.children.length > 0
    const matchSearch = search && (account.accountNumber.includes(search) || account.name.toLowerCase().includes(search.toLowerCase()))

    // If searching, auto-expand logic could be applied, but sticking to simple render
    if (search && !matchSearch && !hasChildren) return null

    return (
      <div key={account.id} className="w-full">
        <div 
          className={`flex items-center justify-between p-3 border-b flex-wrap gap-2 border-zinc-800/50 hover:bg-zinc-800/30 transition-all cursor-pointer ${matchSearch ? 'bg-teal-500/10' : ''}`}
          style={{ paddingLeft: `${level * 2 + 1}rem` }}
          onClick={() => hasChildren && toggleExpand(account.id)}
        >
          <div className="flex items-center gap-3">
            <span className="w-6 flex justify-center text-zinc-500">
              {hasChildren ? (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />) : <span className="w-4 h-4" />}
            </span>
            <span className="font-mono font-bold text-teal-400">{account.accountNumber}</span>
            <span className="text-zinc-200 font-medium">{account.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${TYPE_COLORS[account.type] || 'text-zinc-400 bg-zinc-800 border-zinc-700'}`}>
              {TYPE_LABELS[account.type] || account.type}
            </span>
            <button className="text-zinc-600 hover:text-white transition-all text-xs opacity-0 group-hover:opacity-100">Modifier</button>
          </div>
        </div>
        
        {isExpanded && hasChildren && (
          <div className="flex flex-col">
            {account.children!.map(child => renderAccountNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter">Plan Comptable</h1>
          <p className="text-zinc-400 text-sm mt-1">Gérez la nomenclature comptable de votre entreprise</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded-xl transition-all font-semibold text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Ajouter un compte
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div></div>
      ) : accounts.length === 0 ? (
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-12 text-center space-y-6">
          <div className="w-20 h-20 bg-teal-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-teal-500" />
          </div>
          <h3 className="text-2xl font-black text-white">Aucun Plan Comptable Initialisé</h3>
          <p className="text-zinc-400 max-w-lg mx-auto">
            Votre base de données ne contient aucun compte. Vous pouvez initialiser automatiquement le Plan Comptable Tunisien officiel contenant les classes 1 à 7.
          </p>
          <button 
            onClick={handleInit}
            disabled={initLoading}
            className="px-8 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl font-bold transition-all flex items-center gap-2 mx-auto justify-center min-w-[250px]"
          >
            {initLoading ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span> : <Download className="w-5 h-5" />}
            {initLoading ? 'Initialisation...' : 'Importer Plan Comptable Tunisien'}
          </button>
        </div>
      ) : (
        <div className="bg-zinc-950 border border-zinc-800/50 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-zinc-800/50 bg-zinc-900/50 flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="text"
                placeholder="Rechercher par numéro ou libellé..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white outline-none focus:border-teal-500 transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setExpanded({})}
                className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-400 rounded-lg transition-all"
              >
                Tout réduire
              </button>
              {/* Optional "Expand all" logic could go here */}
            </div>
          </div>
          
          <div className="flex flex-col bg-zinc-950/80 max-h-[70vh] overflow-y-auto">
             {accounts.map(account => renderAccountNode(account))}
          </div>
        </div>
      )}
    </div>
  )
}
