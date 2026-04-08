'use client'

import { useState } from 'react'

interface SessionOpenModalProps {
  onOpen: (openingCash: number) => void
  onClose: () => void
}

export default function SessionOpenModal({ onOpen, onClose }: SessionOpenModalProps) {
  const [cash, setCash] = useState('200')

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-stone-100 bg-stone-50">
          <h3 className="font-black text-stone-900 text-lg">Ouvrir une Session</h3>
          <p className="text-xs text-stone-500 mt-1">Initialisez votre caisse avant de commencer</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-black text-stone-500 uppercase tracking-widest">Fond de Caisse Initial</label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={cash}
              onChange={e => setCash(e.target.value)}
              className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl text-2xl font-black text-right focus:border-teal-500 focus:outline-none font-mono"
            />
            <p className="text-xs text-stone-400">Dinar Tunisien (TND)</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border-2 border-stone-200 rounded-xl font-bold text-stone-600 hover:bg-stone-50"
            >
              Annuler
            </button>
            <button
              onClick={() => onOpen(parseFloat(cash))}
              className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold"
            >
              Ouvrir la Caisse
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}