'use client'

import { 
  Plus, 
  FileText, 
  Users, 
  Package, 
  ShoppingCart,
  Upload,
  ArrowRight,
  TrendingUp,
  Receipt,
  Building
} from 'lucide-react'
import Link from 'next/link'

interface QuickAction {
  label: string
  href: string
  icon: React.ElementType
  color: string
}

interface QuickActionsProps {
  userRole?: string
}

export function QuickActions({ userRole = 'USER' }: QuickActionsProps) {
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'

  const actions: QuickAction[] = [
    { 
      label: 'Nouvelle facture', 
      href: '/commercial/documents/new?type=INVOICE', 
      icon: Receipt,
      color: 'emerald'
    },
    { 
      label: 'Nouveau client', 
      href: '/commercial/clients/new', 
      icon: ShoppingCart,
      color: 'blue'
    },
    { 
      label: 'Nouveau produit', 
      href: '/stock/products/new', 
      icon: Package,
      color: 'amber'
    },
    { 
      label: 'Importer', 
      href: '/stock/import', 
      icon: Upload,
      color: 'purple'
    },
  ]

  const adminActions: QuickAction[] = [
    { 
      label: 'Nouvel employé', 
      href: '/hr/employees/new', 
      icon: Users,
      color: 'teal'
    },
    { 
      label: 'Devis', 
      href: '/commercial/documents/new?type=ESTIMATE', 
      icon: FileText,
      color: 'orange'
    },
  ]

  const displayActions = isAdmin ? [...actions, ...adminActions] : actions

  return (
    <div className="bg-white rounded-[2rem] p-6 border border-stone-200 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-emerald-600" />
        <h3 className="font-black text-stone-900">Actions rapides</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {displayActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`flex items-center gap-3 p-4 rounded-2xl border border-stone-100 hover:border-stone-300 hover:shadow-md transition-all group`}
          >
            <div className={`p-2.5 rounded-xl bg-${action.color}-50 text-${action.color}-600`}>
              <action.icon className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-stone-700 group-hover:text-stone-900">
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}