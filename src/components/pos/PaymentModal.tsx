'use client'

import { useState } from 'react'
import { X, CheckCircle, Banknote, CreditCard, QrCode, TrendingUp } from 'lucide-react'
import type { PaymentMethod } from '@/lib/pos-types'
import { useTranslations, useLocale } from 'next-intl'

interface PaymentModalProps {
  totalTTC: number
  onPay: (method: PaymentMethod, paidAmount: number) => void
  onClose: () => void
}

function formatMoney(amount: number, locale = 'fr') {
  return amount.toLocaleString(`${locale}-TN`, { style: 'currency', currency: 'TND', minimumFractionDigits: 3 })
}

export default function PaymentModal({ totalTTC, onPay, onClose }: PaymentModalProps) {
  const t = useTranslations('POS.payment')
  const locale = useLocale()
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [cashGiven, setCashGiven] = useState('')

  const change = method === 'CASH'
    ? Math.max(0, (parseFloat(cashGiven) || 0) - totalTTC)
    : 0

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <h3 className="font-black text-stone-900 text-lg">{t('title')}</h3>
          <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-xl transition-colors">
            <X className="w-5 h-5 text-stone-400" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Total */}
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 text-center">
            <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1">{t('total_due')}</p>
            <p className="text-4xl font-black text-teal-700">{formatMoney(totalTTC, locale)}</p>
          </div>

          {/* Method selector */}
          <div className="space-y-2">
            <p className="text-xs font-black text-stone-500 uppercase tracking-widest">{t('method')}</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['CASH', Banknote],
                ['CARD', CreditCard],
                ['CHECK', QrCode],
                ['BANK_TRANSFER', TrendingUp],
              ] as const).map(([val, Icon]) => (
                <button
                  key={val}
                  onClick={() => setMethod(val)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                    method === val
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {t(`methods.${val}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Cash input */}
          {method === 'CASH' && (
            <div className="space-y-2">
              <p className="text-xs font-black text-stone-500 uppercase tracking-widest">{t('cash_received')}</p>
              <input
                type="number"
                step="0.001"
                min="0"
                value={cashGiven}
                onChange={e => setCashGiven(e.target.value)}
                placeholder="0.000"
                className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl text-xl font-black text-end focus:border-teal-500 focus:outline-none font-mono"
              />
              {parseFloat(cashGiven || '0') >= totalTTC && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">{t('change')}</span>
                  <span className="text-2xl font-black text-emerald-700">{formatMoney(change, locale)}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 border-2 border-stone-200 rounded-xl font-bold text-stone-600 hover:bg-stone-50 transition-all"
            >
              {t('cancel')}
            </button>
            <button
              onClick={() => {
                const paid = method === 'CASH' ? parseFloat(cashGiven) || totalTTC : totalTTC
                onPay(method, paid)
              }}
              disabled={method === 'CASH' && (!cashGiven || parseFloat(cashGiven) < totalTTC)}
              className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-stone-300 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              {t('confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}