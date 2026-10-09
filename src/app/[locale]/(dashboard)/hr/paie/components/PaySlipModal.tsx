"use client";

import { X, Printer, CheckCircle, XCircle, FileText } from "lucide-react";
import { useTranslations, useLocale } from 'next-intl'

interface PaySlipModalProps {
  payslip: any;
  onClose: () => void;
}


export function PaySlipModal({ payslip, onClose }: PaySlipModalProps) {
  const t = useTranslations('HR.payroll.slip')
  const tm = useTranslations('Commercial.months')
  const locale = useLocale()
  const period = `${tm(String(payslip.mois ?? 1))} ${payslip.annee}`;

  const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    PENDING:   { label: t('pending'), color: "text-yellow-600", bg: "bg-yellow-50", icon: FileText },
    PAID:      { label: t('paid'),       color: "text-green-600",  bg: "bg-green-50",  icon: CheckCircle },
    CANCELLED: { label: t('cancelled'),     color: "text-red-600",    bg: "bg-red-50",    icon: XCircle },
  };

  const status = statusConfig[payslip.statut] ?? statusConfig.PENDING;
  const StatusIcon = status.icon;

  const fmt = (v: any) => Number(v ?? 0).toLocaleString(`${locale}-TN`, { minimumFractionDigits: 3 });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('title')}</h2>
            <p className="text-sm text-gray-500">{period}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${status.color} ${status.bg}`}>
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </span>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Employee Info */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">{t('employee')}</p>
              <p className="font-medium text-gray-900">
                {payslip.employee?.firstName} {payslip.employee?.lastName}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('id_number')}</p>
              <p className="font-mono font-medium text-gray-900">
                {payslip.employee?.employeeNumber ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('department')}</p>
              <p className="text-gray-900">{payslip.employee?.departement ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('position')}</p>
              <p className="text-gray-900">{payslip.employee?.poste ?? "—"}</p>
            </div>
          </div>
        </div>

        {/* Earnings */}
        <div className="px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">{t('earnings')}</h3>
          <div className="space-y-1">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">{t('base_salary')}</span>
              <span className="font-medium text-gray-900">{fmt(payslip.salaireBase)} TND</span>
            </div>
            {Number(payslip.primeTransport) > 0 && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">{t('transport')}</span>
                <span className="font-medium text-gray-900">+{fmt(payslip.primeTransport)} TND</span>
              </div>
            )}
            {Number(payslip.primePanier) > 0 && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">{t('meal')}</span>
                <span className="font-medium text-gray-900">+{fmt(payslip.primePanier)} TND</span>
              </div>
            )}
            {Number(payslip.primeAnciennete) > 0 && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">{t('seniority')}</span>
                <span className="font-medium text-gray-900">+{fmt(payslip.primeAnciennete)} TND</span>
              </div>
            )}
            {Number(payslip.autresPrimes) > 0 && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">{t('other_bonuses')}</span>
                <span className="font-medium text-gray-900">+{fmt(payslip.autresPrimes)} TND</span>
              </div>
            )}
            {Number(payslip.heuresSupMontant) > 0 && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">{t('overtime', { hours: payslip.heuresSupQte })}</span>
                <span className="font-medium text-gray-900">+{fmt(payslip.heuresSupMontant)} TND</span>
              </div>
            )}
            <div className="flex justify-between py-2 bg-teal-50 px-3 rounded">
              <span className="font-semibold text-gray-900">{t('gross')}</span>
              <span className="font-bold text-teal-700">{fmt(payslip.brutGlobal)} TND</span>
            </div>
          </div>
        </div>

        {/* Deductions */}
        <div className="px-6 py-4 bg-red-50">
          <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">{t('deductions')}</h3>
          <div className="space-y-1">
            <div className="flex justify-between py-2 border-b border-red-200">
              <span className="text-gray-600">{t('cnrps')}</span>
              <span className="font-medium text-red-600">-{fmt(payslip.cnrpsSalaire)} TND</span>
            </div>
            <div className="flex justify-between py-2 border-b border-red-200">
              <span className="text-gray-600">{t('cnss')}</span>
              <span className="font-medium text-red-600">-{fmt(payslip.cnssSalaire)} TND</span>
            </div>
            <div className="flex justify-between py-2 border-b border-red-200">
              <span className="text-gray-600">{t('cnavis')}</span>
              <span className="font-medium text-red-600">-{fmt(payslip.cnavisSalaire)} TND</span>
            </div>
            <div className="flex justify-between py-2 border-b border-red-200">
              <span className="text-gray-600">{t('amo')}</span>
              <span className="font-medium text-red-600">-{fmt(payslip.amoSalaire)} TND</span>
            </div>
            <div className="flex justify-between py-2 border-b border-red-200">
              <span className="text-gray-600">IRPP</span>
              <span className="font-medium text-red-600">-{fmt(payslip.irpp)} TND</span>
            </div>
            {Number(payslip.deductionAbsences) > 0 && (
              <div className="flex justify-between py-2 border-b border-red-200">
                <span className="text-gray-600">{t('absences')}</span>
                <span className="font-medium text-red-600">-{fmt(payslip.deductionAbsences)} TND</span>
              </div>
            )}
            {Number(payslip.autresDeductions) > 0 && (
              <div className="flex justify-between py-2 border-b border-red-200">
                <span className="text-gray-600">{t('other_deductions')}</span>
                <span className="font-medium text-red-600">-{fmt(payslip.autresDeductions)} TND</span>
              </div>
            )}
            <div className="flex justify-between py-2 font-bold text-lg">
              <span className="text-gray-900">{t('net')}</span>
              <span className="text-green-700">{fmt(payslip.netAPayer)} TND</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">
            <Printer className="w-4 h-4" />
            {t('print')}
          </button>
          {payslip.statut === "PENDING" && (
            <button className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
              <CheckCircle className="w-4 h-4" />
              {t('validate')}
            </button>
          )}
          {payslip.statut === "PAID" && (
            <span className="flex items-center gap-2 px-4 py-2 text-sm bg-green-100 text-green-700 rounded-lg font-medium">
              <CheckCircle className="w-4 h-4" />
              {t('paid')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}