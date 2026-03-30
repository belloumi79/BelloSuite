import Link from 'next/link'
import {
  Package,
  ShoppingCart,
  FileText,
  Users,
  Wrench,
  Factory,
  CheckCircle,
  TrendingUp,
  ArrowRight,
  Star
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <nav className="container mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <span className="text-white text-xl font-bold">BelloSuite</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Connexion
            </Link>
            <Link
              href="/super-admin"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors"
            >
              Espace Admin
            </Link>
          </div>
        </nav>

        <div className="container mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800/50 rounded-full text-zinc-400 text-sm mb-8">
            <Star className="w-4 h-4 text-amber-400" />
            ERP Modulaire Tunisien
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Gérez votre entreprise
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
              en toute simplicité
            </span>
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-12">
            BelloSuite est un système ERP modulaire conçu pour les entreprises tunisiennes.
            Achetez uniquement les modules dont vous avez besoin.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/super-admin"
              className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-xl flex items-center gap-2 transition-all"
            >
              Démarrer <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="#modules"
              className="px-8 py-4 border border-zinc-700 hover:border-zinc-600 text-white rounded-xl transition-all"
            >
              Voir les modules
            </Link>
          </div>
        </div>

        {/* Gradient orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      </header>

      {/* Modules */}
      <section id="modules" className="py-24 bg-zinc-950">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Nos Modules</h2>
            <p className="text-zinc-400 text-lg">
              Choisissez parmi nos modules et ne payez que pour ce dont vous avez besoin
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module) => (
              <Link
                key={module.slug}
                href={`/super-admin/modules/${module.slug}`}
                className="group p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:border-amber-500/50 transition-all"
              >
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
                  <module.icon className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{module.name}</h3>
                <p className="text-zinc-400 text-sm mb-4">{module.description}</p>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold">{module.price}</span>
                  <span className="text-zinc-500 text-sm">/mois</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <feature.icon className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-zinc-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Prêt à digitaliser votre entreprise ?
          </h2>
          <p className="text-zinc-400 text-lg mb-8">
            Commencez gratuitement et payez uniquement pour les modules dont vous avez besoin.
          </p>
          <Link
            href="/super-admin"
            className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-xl transition-all"
          >
            Créer votre compte <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-zinc-800">
        <div className="container mx-auto px-6 text-center text-zinc-500 text-sm">
          © 2026 BelloSuite. ERP Modulaire Tunisien.
        </div>
      </footer>
    </div>
  )
}

const modules = [
  {
    name: 'Gestion de Stocks',
    slug: 'stock',
    description: 'Gérez votre inventaire, mouvements de stock et alertes de réapprovisionnement.',
    icon: Package,
    price: '149 DT',
  },
  {
    name: 'Module Commercial',
    slug: 'commercial',
    description: 'Clients, fournisseurs, devis, commandes et factures.',
    icon: ShoppingCart,
    price: '199 DT',
  },
  {
    name: 'Comptabilité',
    slug: 'comptabilite',
    description: 'Plan comptable, écritures journal et balance.',
    icon: FileText,
    price: '249 DT',
  },
  {
    name: 'GRH & Paie',
    slug: 'grh',
    description: 'Gestion des employés et bulletins de salaire.',
    icon: Users,
    price: '179 DT',
  },
  {
    name: 'GMAO',
    slug: 'gmao',
    description: 'Maintenance des équipements et ordres de travail.',
    icon: Wrench,
    price: '149 DT',
  },
  {
    name: 'GPAO',
    slug: 'gpao',
    description: 'Ordonnancement et suivi de la production.',
    icon: Factory,
    price: '299 DT',
  },
]

const features = [
  {
    icon: CheckCircle,
    title: 'Facile à utiliser',
    description: 'Interface intuitive conçue pour les entreprises tunisiennes.',
  },
  {
    icon: TrendingUp,
    title: 'Modulaire',
    description: 'Achtez uniquement les modules dont vous avez besoin.',
  },
  {
    icon: Users,
    title: 'Multi-utilisateurs',
    description: 'Invitez votre équipe et gérez les permissions.',
  },
]
// trigger redeploy
