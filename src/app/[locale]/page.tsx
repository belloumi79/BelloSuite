import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { 
  ArrowRight, 
  CheckCircle2, 
  Shield, 
  TrendingUp, 
  Headphones, 
  Zap, 
  Layers, 
  Boxes, 
  Users, 
  Briefcase, 
  FileText, 
  Wrench, 
  Factory 
} from 'lucide-react'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

export default function Home() {
  const t = useTranslations('Home');

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
              <span className="text-xl font-bold tracking-tight text-zinc-900">{t('title')}</span>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <Link href="/fr/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
                {t('nav.login')}
              </Link>
              <Link href="/register" className="text-sm font-medium px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm">
                {t('nav.register')}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 text-center max-w-5xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-zinc-900 mb-6 leading-tight">
          {t('hero.title')}
        </h1>
        <p className="text-xl text-zinc-600 mb-10 max-w-3xl mx-auto">
          {t('hero.description')}
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/register" className="px-8 py-4 bg-teal-600 text-white rounded-xl font-medium text-lg hover:bg-teal-700 transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group">
            {t('hero.cta_primary')}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
          </Link>
          <Link href="/fr/login" className="px-8 py-4 bg-white text-zinc-700 border border-zinc-200 rounded-xl font-medium text-lg hover:bg-zinc-50 transition-colors shadow-sm flex items-center justify-center gap-2">
            {t('hero.cta_secondary')}
          </Link>
        </div>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-zinc-500">
          <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-teal-600" /> {t('hero.badges.commitment')}</span>
          <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-teal-600" /> {t('hero.badges.installation')}</span>
          <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-teal-600" /> {t('hero.badges.security')}</span>
        </div>
      </section>

      {/* Modules Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-zinc-900 mb-4">{t('modules.title')}</h2>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
              {t('modules.description')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Stock */}
            <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100 hover:border-teal-200 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-6 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                <Boxes className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3">{t('modules.stock.title')}</h3>
              <p className="text-zinc-600">
                {t('modules.stock.description')}
              </p>
            </div>

            {/* Commercial */}
            <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100 hover:border-teal-200 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-6 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3">{t('modules.commercial.title')}</h3>
              <p className="text-zinc-600">
                {t('modules.commercial.description')}
              </p>
            </div>

            {/* RH */}
            <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100 hover:border-teal-200 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3">{t('modules.hr.title')}</h3>
              <p className="text-zinc-600">
                {t('modules.hr.description')}
              </p>
            </div>

            {/* Paie */}
            <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100 hover:border-teal-200 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3">{t('modules.payroll.title')}</h3>
              <p className="text-zinc-600">
                {t('modules.payroll.description')}
              </p>
            </div>

            {/* Finances */}
            <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100 hover:border-teal-200 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center mb-6 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3">{t('modules.accounting.title')}</h3>
              <p className="text-zinc-600">
                {t('modules.accounting.description')}
              </p>
            </div>

            {/* Production */}
            <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100 hover:border-teal-200 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-6 text-slate-700 group-hover:bg-slate-700 group-hover:text-white transition-colors">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3">{t('modules.projects.title')}</h3>
              <p className="text-zinc-600">
                {t('modules.projects.description')}
              </p>
            </div>

            {/* GMAO */}
            <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100 hover:border-teal-200 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mb-6 text-pink-600 group-hover:bg-pink-600 group-hover:text-white transition-colors">
                <Wrench className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3">{t('modules.maintenance.title')}</h3>
              <p className="text-zinc-600">
                {t('modules.maintenance.description')}
              </p>
            </div>

            {/* GPAO */}
            <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100 hover:border-teal-200 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Factory className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3">{t('modules.production.title')}</h3>
              <p className="text-zinc-600">
                {t('modules.production.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 bg-zinc-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">{t('features.title')}</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              {t('features.description')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-teal-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('features.security.title')}</h3>
              <p className="text-zinc-400 text-sm">{t('features.security.description')}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Headphones className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('features.support.title')}</h3>
              <p className="text-zinc-400 text-sm">{t('features.support.description')}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('features.improvement.title')}</h3>
              <p className="text-zinc-400 text-sm">{t('features.improvement.description')}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-rose-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('features.pricing.title')}</h3>
              <p className="text-zinc-400 text-sm">{t('features.pricing.description')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-teal-600 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold mb-6">{t('cta.title')}</h2>
          <p className="text-teal-100 text-xl mb-10">
            {t('cta.description')}
          </p>
          <Link href="/register" className="inline-block px-8 py-4 bg-white text-teal-600 rounded-xl font-bold text-lg hover:bg-zinc-100 transition-colors shadow-lg">
            {t('cta.button')}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-950 text-zinc-400 py-12 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center md:text-left flex flex-col md:row justify-between items-center gap-6">
          <div className="flex items-center justify-center gap-2">
            <Layers className="w-6 h-6 text-teal-500" />
            <span className="text-xl font-bold text-white">BelloSuite</span>
          </div>
          <p className="text-sm">
            {t('footer.rights')}
          </p>
          <div className="flex gap-4 text-sm justify-center">
            <Link href="#" className="hover:text-white transition-colors">{t('footer.legal')}</Link>
            <Link href="#" className="hover:text-white transition-colors">{t('footer.privacy')}</Link>
            <Link href="#" className="hover:text-white transition-colors">{t('footer.contact')}</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
