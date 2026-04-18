"use client";

import { Eye, Loader2 } from "lucide-react";

interface PaySlip {
  id: string;
  employee: {
    firstName: string;
    lastName: string;
    employeeCode: string;
    department: string | null;
    position: string | null;
  };
  baseSalary: string | number;
  grossSalary: string | number;
  netSalary: string | number;
  status: "DRAFT" | "VALIDATED" | "PAID" | "CANCELLED";
  socialSecurity: string | number;
  taxBracket: string | number;
  transportAllowance: string | number;
  mealAllowance: string | number;
  familyAllowance: string | number;
  overtimeAmount: string | number;
}

interface PaySlipTableProps {
  payslips: PaySlip[];
  loading: boolean;
  onViewPayslip: (payslip: PaySlip) => void;
}

const statusColors = {
  DRAFT: "bg-yellow-100 text-yellow-800",
  VALIDATED: "bg-blue-100 text-blue-800",
  PAID: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const statusLabels = {
  DRAFT: "Brouillon",
  VALIDATED: "Validé",
  PAID: "Payé",
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matricule</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employé</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Salaire Base</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Brut</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CNSS</th>
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
                {payslip.employee.employeeCode}
              </td>
              <td className="px-4 py-3">
                <div className="text-sm font-medium text-gray-900">
                  {payslip.employee.firstName} {payslip.employee.lastName}
                </div>
                <div className="text-xs text-gray-500">
                  {payslip.employee.position || "—"}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-right text-gray-900">
                {Number(payslip.baseSalary).toLocaleString("fr-TN", { minimumFractionDigits: 3 })}
              </td>
              <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                {Number(payslip.grossSalary).toLocaleString("fr-TN", { minimumFractionDigits: 3 })}
              </td>
              <td className="px-4 py-3 text-sm text-right text-red-600">
                -{Number(payslip.socialSecurity).toLocaleString("fr-TN", { minimumFractionDigits: 3 })}
              </td>
              <td className="px-4 py-3 text-sm text-right text-red-600">
                -{Number(payslip.taxBracket).toLocaleString("fr-TN", { minimumFractionDigits: 3 })}
              </td>
              <td className="px-4 py-3 text-sm text-right font-bold text-green-600">
                {Number(payslip.netSalary).toLocaleString("fr-TN", { minimumFractionDigits: 3 })}
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[payslip.status]}`}>
                  {statusLabels[payslip.status]}
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