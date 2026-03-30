export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-zinc-900 border-r border-zinc-800 min-h-screen p-4">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <span className="text-white text-xl font-bold">BelloSuite</span>
          </div>
          
          <nav className="space-y-1">
            <a href="/stock" className="flex items-center gap-3 px-4 py-2 rounded-lg bg-zinc-800 text-white">
              <Package className="w-5 h-5" />
              Stock
            </a>
          </nav>
        </aside>
        
        {/* Main */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

import { Package } from 'lucide-react'
