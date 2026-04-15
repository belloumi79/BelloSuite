import Link from 'next/link'
import { ArrowRight, CheckCircle2, Shield, TrendingUp, Headphones, Zap, Layers, Boxes, Users, Briefcase, FileText, Wrench, Factory } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                <Layers className="text-white w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-zinc-900">BelloSuite</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
                Connexion
              </Link>
              <Link href="/register" className="text-sm font-medium px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm">
                Essai gratuit
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 text-center max-w-5xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-zinc-900 mb-6 leading-tight">
          Contrôlez votre entreprise, optimisez vos finances, libérez votre potentiel de croissance.
        </h1>
        <p className="text-xl text-zinc-600 mb-10 max-w-3xl mx-auto">
          BelloSuite est le logiciel de facturation et de gestion commerciale (ERP) modulaire conçu pour les TPE et PME en Tunisie. Une solution pour tout gérer, en un seul endroit.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/register" className="px-8 py-4 bg-teal-600 text-white rounded-xl font-medium text-lg hover:bg-teal-700 transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group">
            Démarrez un essai gratuit
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/login" className="px-8 py-4 bg-white text-zinc-700 border border-zinc-200 rounded-xl font-medium text-lg hover:bg-zinc-50 transition-colors shadow-sm flex items-center justify-center gap-2">
            Connexion au tableau de bord
          </Link>
        </div>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-zinc-500">
          <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Sans engagement</span>
          <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Installation gratuite</span>
          <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Hébergement cloud sécurisé</span>
        </div>
      </section>

      {/* Modules Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-zinc-900 mb-4">Une solution complète et modulaire</h2>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
              BelloSuite s'adapte à la croissance de votre entreprise en ajoutant de nouveaux modules selon vos besoins fonctionnels.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Stock */}
            <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100 hover:border-teal-200 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-6 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                <Boxes className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3">Gestion de Stock</h3>
              <p className="text-zinc-600">
                Suivi du stock en temps réel, mouvements d'inventaire, alertes de rupture, transferts multi-dépôts.
              </p>
            </div>

            {/* Commercial */}
            <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100 hover:border-teal-200 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-6 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3">Commercial & Ventes</h3>
              <p className="text-zinc-600">
                Facturation locale et export, bons de commande, devis, notes de frais, paiements et relevés.
              </p>
            </div>

            {/* RH */}
            <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100 hover:border-teal-200 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3">Ressources Humaines</h3>
              <p className="text-zinc-600">
                Gestion des employés, contrats, absences administratives, qualification professionnelle.
              </p>
            </div>

            {/* Paie */}
            <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100 hover:border-teal-200 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3">Gestion de Paie</h3>
              <p className="text-zinc-600">
                Génération des fiches de paie conformes à la loi tunisienne, calcul automatisé d'impôts et CNSS.
              </p>
            </div>

            {/* Finances */}
            <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100 hover:border-teal-200 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center mb-6 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3">Comptabilité Financière</h3>
              <p className="text-zinc-600">
                Livre de comptes, balance générale, génération du certificat de déclaration de l'employeur (TEJ 2026).
              </p>
            </div>

            {/* Production */}
            <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100 hover:border-teal-200 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-6 text-slate-700 group-hover:bg-slate-700 group-hover:text-white transition-colors">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3">Projets & Kanban</h3>
              <p className="text-zinc-600">
                Vues de projet Kanban, management des tâches et commentaires, synchronisés en temps réel.
              </p>
            </div>
            {/* GMAO */}
            <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100 hover:border-teal-200 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mb-6 text-pink-600 group-hover:bg-pink-600 group-hover:text-white transition-colors">
                <Wrench className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3">Maintenance (GMAO)</h3>
              <p className="text-zinc-600">
                Gérez vos équipements, planifiez vos interventions préventives et suivez vos ordres de travail en temps réel.
              </p>
            </div>
            {/* GPAO */}
            <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100 hover:border-teal-200 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Factory className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3">Production (GPAO)</h3>
              <p className="text-zinc-600">
                Postes de charges, gammes opératoires, nomenclatures (BOM) et exécution des ordres de fabrication.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 bg-zinc-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Qu'est-ce qui nous distingue des autres ?</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Nous construisons nos outils avec la conviction profonde que logiciel Tunisien pour l'entreprise peut être à la fois magnifique et ultra-puissant.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-teal-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Confidentialité & Sécurité</h3>
              <p className="text-zinc-400 text-sm">Vos données hébergées sur le cloud sont séparées et encryptées tenant par tenant.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Headphones className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Support Exceptionnel</h3>
              <p className="text-zinc-400 text-sm">Notre équipe en Tunisie est à vos côtés pour un déploiement et un suivi continus.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Amélioration Continue</h3>
              <p className="text-zinc-400 text-sm">Des mises à jour régulières avec de nouveaux modules sans impacter vos workflows actuels.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-rose-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Équilibre Prix-Qualité</h3>
              <p className="text-zinc-400 text-sm">Une stratégie PME-friendly. Payez uniquement pour les modules dont vous avez besoin.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-teal-600 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold mb-6">Prêt à transformer votre entreprise ?</h2>
          <p className="text-teal-100 text-xl mb-10">
            Rejoignez d'autres entreprises tunisiennes qui font confiance à BelloSuite pour gérer leur activité au quotidien.
          </p>
          <Link href="/register" className="inline-block px-8 py-4 bg-white text-teal-600 rounded-xl font-bold text-lg hover:bg-zinc-100 transition-colors shadow-lg">
            Créer votre espace maintenant
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-950 text-zinc-400 py-12 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center justify-center gap-2">
            <Layers className="w-6 h-6 text-teal-500" />
            <span className="text-xl font-bold text-white">BelloSuite</span>
          </div>
          <p className="text-sm">
            © {new Date().getFullYear()} BelloSuite ERP Tunisien. Tous droits réservés.
          </p>
          <div className="flex gap-4 text-sm justify-center">
            <Link href="#" className="hover:text-white transition-colors">Mentions légales</Link>
            <Link href="#" className="hover:text-white transition-colors">Confidentialité</Link>
            <Link href="#" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
