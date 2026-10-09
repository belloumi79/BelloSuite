"use client";

import { Eye, Loader2 } from "lucide-react";
import { useTranslations, useLocale } from 'next-intl'

interface PaySlip {
  id: string;
  employee: {
    firstName: string;
    lastName: string;
    employeeNumber: string;
    departement: string | null;
    poste: string | null;
  };
  salaireBase: string | number;
  brutGlobal: string | number;
  netAPayer: string | number;
  statut: "PENDING" | "PAID" | "CANCELLED";
  totalCotisations: string | number;
  irpp: string | number;
}

interface PaySlipTableProps {
  payslips: PaySlip[];
  loading: boolean;
  onViewPayslip: (payslip: any) => void;
}

const statusColors: Record<string, string> = {
  PENDING:   "bg-yellow-100 text-yellow-800",
  PAID:      "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};


export function PaySlipTable({ payslips, loading, onViewPayslip }: PaySlipTableProps) {
  const t = useTranslations('HR.payroll.table')
  const locale = useLocale()
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  if (payslips.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {t('empty')}
      </div>
    );
  }

  const fmt = (v: any) => Number(v ?? 0).toLocaleString(`${locale}-TN`, { minimumFractionDigits: 3 });

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">{t('id_number')}</th>
            <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">{t('employee')}</th>
            <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 uppercase">{t('base_salary')}</th>
            <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 uppercase">{t('gross')}</th>
            <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 uppercase">{t('contributions')}</th>
            <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 uppercase">IRPP</th>
            <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 uppercase">{t('net')}</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('status')}</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {payslips.map((payslip) => (
            <tr key={payslip.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-mono text-gray-900">
                {payslip.employee?.employeeNumber ?? "—"}
              </td>
              <td className="px-4 py-3">
                <div className="text-sm font-medium text-gray-900">
                  {payslip.employee?.firstName} {payslip.employee?.lastName}
                </div>
                <div className="text-xs text-gray-500">
                  {payslip.employee?.poste ?? "—"}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-end text-gray-900">
                {fmt(payslip.salaireBase)}
              </td>
              <td className="px-4 py-3 text-sm text-end font-medium text-gray-900">
                {fmt(payslip.brutGlobal)}
              </td>
              <td className="px-4 py-3 text-sm text-end text-red-600">
                -{fmt(payslip.totalCotisations)}
              </td>
              <td className="px-4 py-3 text-sm text-end text-red-600">
                -{fmt(payslip.irpp)}
              </td>
              <td className="px-4 py-3 text-sm text-end font-bold text-green-600">
                {fmt(payslip.netAPayer)}
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[payslip.statut] ?? "bg-gray-100 text-gray-600"}`}>
                  {['PENDING', 'PAID', 'CANCELLED'].includes(payslip.statut) ? t(`status.${payslip.statut}`) : payslip.statut}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => onViewPayslip(payslip)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"
                  title={t('view')}
                >
                  <Eye className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}