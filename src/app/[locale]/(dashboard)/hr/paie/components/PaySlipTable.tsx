"use client";

import { Eye, Loader2 } from "lucide-react";

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

const statusLabels: Record<string, string> = {
  PENDING:   "En attente",
  PAID:      "Payé",
  CANCELLED: "Annulé",
};

export function PaySlipTable({ payslips, loading, onViewPayslip }: PaySlipTableProps) {
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
        Aucun bulletin de salaire pour cette période
      </div>
    );
  }

  const fmt = (v: any) => Number(v ?? 0).toLocaleString("fr-TN", { minimumFractionDigits: 3 });

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matricule</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employé</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Salaire Base</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Brut</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cotisations</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">IRPP</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Statut</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
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
              <td className="px-4 py-3 text-sm text-right text-gray-900">
                {fmt(payslip.salaireBase)}
              </td>
              <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                {fmt(payslip.brutGlobal)}
              </td>
              <td className="px-4 py-3 text-sm text-right text-red-600">
                -{fmt(payslip.totalCotisations)}
              </td>
              <td className="px-4 py-3 text-sm text-right text-red-600">
                -{fmt(payslip.irpp)}
              </td>
              <td className="px-4 py-3 text-sm text-right font-bold text-green-600">
                {fmt(payslip.netAPayer)}
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[payslip.statut] ?? "bg-gray-100 text-gray-600"}`}>
                  {statusLabels[payslip.statut] ?? payslip.statut}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => onViewPayslip(payslip)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"
                  title="Voir le bulletin"
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