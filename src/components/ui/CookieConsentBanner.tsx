'use client'

import { useState } from 'react'
import { useCookieConsent } from '@/hooks/useCookieConsent'

export function CookieConsentBanner() {
  const { showBanner, acceptAll, rejectAll, consent } = useCookieConsent()
  const [showDetails, setShowDetails] = useState(false)

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-zinc-900 border-t border-zinc-700 shadow-2xl">
      <div className="max-w-5xl mx-auto px-4 py-5">
        {/* Main banner row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white mb-1">
              🍪 Acceptez-vous de nous laisser utiliser des cookies ?
            </h3>
            <p className="text-xs text-zinc-400">
              Nous utilisons des cookies pour améliorer votre expérience, analyser le trafic et personnaliser le contenu.
              {' '}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-blue-400 hover:text-blue-300 underline text-xs"
              >
                {showDetails ? 'Masquer les détails' : 'En savoir plus'}
              </button>
            </p>
          </div>

          <div className="flex gap-3 shrink-0">
            <button
              onClick={rejectAll}
              className="px-4 py-2 text-xs font-medium text-zinc-300 border border-zinc-600 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Refuser
            </button>
            <button
              onClick={acceptAll}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
            >
              Accepter
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
                  <span className="text-white font-medium">Nécessaires</span>
                  <p className="text-zinc-400 mt-0.5">Cookies essentiels au fonctionnement du site. Toujours actifs.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-zinc-800 rounded-lg">
                <span className="text-blue-400 mt-0.5">📊</span>
                <div>
                  <span className="text-white font-medium">Analytiques</span>
                  <p className="text-zinc-400 mt-0.5">Aident à comprendre comment les visiteurs utilisent le site.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-zinc-800 rounded-lg">
                <span className="text-purple-400 mt-0.5">🎯</span>
                <div>
                  <span className="text-white font-medium">Fonctionnels</span>
                  <p className="text-zinc-400 mt-0.5">Personnalisent votre expérience et préférences.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-zinc-800 rounded-lg">
                <span className="text-orange-400 mt-0.5">📢</span>
                <div>
                  <span className="text-white font-medium">Marketing</span>
                  <p className="text-zinc-400 mt-0.5">Utilisés pour afficher des publicités pertinentes.</p>
                </div>
              </div>
            </div>

            {consent.timestamp > 0 && (
              <p className="text-xs text-zinc-500">
                Consentement donné le {new Date(consent.timestamp).toLocaleDateString('fr-TN', {
                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
