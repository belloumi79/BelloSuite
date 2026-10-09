'use client'

import { useState } from 'react'
import { useCookieConsent } from '@/hooks/useCookieConsent'
import { useTranslations, useLocale } from 'next-intl'

export function CookieConsentBanner() {
  const t = useTranslations('Cookies')
  const locale = useLocale()
  const { showBanner, acceptAll, rejectAll, consent } = useCookieConsent()
  const [showDetails, setShowDetails] = useState(false)

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-[9999] bg-zinc-900 border-t border-zinc-700 shadow-2xl">
      <div className="max-w-5xl mx-auto px-4 py-5">
        {/* Main banner row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white mb-1">
              {t('question')}
            </h3>
            <p className="text-xs text-zinc-400">
              {t('intro')}
              {' '}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-blue-400 hover:text-blue-300 underline text-xs"
              >
                {showDetails ? t('hide_details') : t('learn_more')}
              </button>
            </p>
          </div>

          <div className="flex gap-3 shrink-0">
            <button
              onClick={rejectAll}
              className="px-4 py-2 text-xs font-medium text-zinc-300 border border-zinc-600 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              {t('reject')}
            </button>
            <button
              onClick={acceptAll}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
            >
              {t('accept')}
            </button>
          </div>
        </div>

        {/* Detailed preferences */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-zinc-700 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2 p-3 bg-zinc-800 rounded-lg">
                <span className="text-green-400 mt-0.5">✅</span>
                <div>
                  <span className="text-white font-medium">{t('necessary')}</span>
                  <p className="text-zinc-400 mt-0.5">{t('necessary_desc')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-zinc-800 rounded-lg">
                <span className="text-blue-400 mt-0.5">📊</span>
                <div>
                  <span className="text-white font-medium">{t('analytics')}</span>
                  <p className="text-zinc-400 mt-0.5">{t('analytics_desc')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-zinc-800 rounded-lg">
                <span className="text-purple-400 mt-0.5">🎯</span>
                <div>
                  <span className="text-white font-medium">{t('functional')}</span>
                  <p className="text-zinc-400 mt-0.5">{t('functional_desc')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-zinc-800 rounded-lg">
                <span className="text-orange-400 mt-0.5">📢</span>
                <div>
                  <span className="text-white font-medium">{t('marketing')}</span>
                  <p className="text-zinc-400 mt-0.5">{t('marketing_desc')}</p>
                </div>
              </div>
            </div>

            {consent.timestamp > 0 && (
              <p className="text-xs text-zinc-500">
                {t('consent_given', { date: new Date(consent.timestamp).toLocaleDateString(`${locale}-TN`, {
                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                }) })}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
