"use client";

import { X, Printer, CheckCircle, XCircle, FileText } from "lucide-react";

interface PaySlipModalProps {
  payslip: any;
  onClose: () => void;
}

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export function PaySlipModal({ payslip, onClose }: PaySlipModalProps) {
  const period = `${MONTHS[payslip.periodMonth - 1]} ${payslip.periodYear}`;

  const statusConfig = {
    DRAFT: { label: "Brouillon", color: "text-yellow-600", bg: "bg-yellow-50", icon: FileText },
    VALIDATED: { label: "Validé", color: "text-blue-600", bg: "bg-blue-50", icon: CheckCircle },
    PAID: { label: "Payé", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle },
    CANCELLED: { label: "Annulé", color: "text-red-600", bg: "bg-red-50", icon: XCircle },
  };

  const status = statusConfig[payslip.status as keyof typeof statusConfig];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Bulletin de Salaire</h2>
            <p className="text-sm text-gray-500">{period}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color} ${status.bg}`}>
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
              <p className="text-xs text-gray-500">Employé</p>
              <p className="font-medium text-gray-900">
                {payslip.employee?.firstName} {payslip.employee?.lastName}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Matricule</p>
              <p className="font-mono font-medium text-gray-900">
                {payslip.employee?.employeeCode}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Département</p>
              <p className="text-gray-900">{payslip.employee?.department || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Poste</p>
              <p className="text-gray-900">{payslip.employee?.position || "—"}</p>
            </div>
          </div>
        </div>

        {/* Earnings */}
        <div className="px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">Éléments de Salaire</h3>
          <div className="space-y-2">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Salaire de base</span>
              <span className="font-medium text-gray-900">
                {Number(payslip.baseSalary).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Indemnité transport</span>
              <span className="font-medium text-gray-900">
                +{Number(payslip.transportAllowance).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Indemnité repas</span>
              <span className="font-medium text-gray-900">
                +{Number(payslip.mealAllowance).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Allocations familiales</span>
              <span className="font-medium text-gray-900">
                +{Number(payslip.familyAllowance).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND
              </span>
            </div>
            {Number(payslip.overtimeAmount) > 0 && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Heures supplémentaires ({payslip.overtimeHours}h)</span>
                <span className="font-medium text-gray-900">
                  +{Number(payslip.overtimeAmount).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND
                </span>
              </div>
            )}
            {Number(payslip.bonuses) > 0 && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Primes</span>
                <span className="font-medium text-gray-900">
                  +{Number(payslip.bonuses).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND
                </span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b bg-teal-50 px-3 rounded">
              <span className="font-semibold text-gray-900">Salaire Brut</span>
              <span className="font-bold text-teal-700">
                {Number(payslip.grossSalary).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND
              </span>
            </div>
          </div>
        </div>

        {/* Deductions */}
        <div className="px-6 py-4 bg-red-50">
          <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">Retenues</h3>
          <div className="space-y-2">
            <div className="flex justify-between py-2 border-b border-red-200">
              <span className="text-gray-600">Cotisation CNSS (9.18%)</span>
              <span className="font-medium text-red-600">
                -{Number(payslip.socialSecurity).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-red-200">
              <span className="text-gray-600">IRPP</span>
              <span className="font-medium text-red-600">
                -{Number(payslip.taxBracket).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND
              </span>
            </div>
            {Number(payslip.absenceDeductions) > 0 && (
              <div className="flex justify-between py-2 border-b border-red-200">
                <span className="text-gray-600">Déductions absences</span>
                <span className="font-medium text-red-600">
                  -{Number(payslip.absenceDeductions).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND
                </span>
              </div>
            )}
            {Number(payslip.otherDeductions) > 0 && (
              <div className="flex justify-between py-2 border-b border-red-200">
                <span className="text-gray-600">Autres retenues</span>
                <span className="font-medium text-red-600">
                  -{Number(payslip.otherDeductions).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND
                </span>
              </div>
            )}
            <div className="flex justify-between py-2 font-bold text-lg">
              <span className="text-gray-900">NET À PAYER</span>
              <span className="text-green-700">
                {Number(payslip.netSalary).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">
            <Printer className="w-4 h-4" />
            Imprimer
          </button>
          {payslip.status === "DRAFT" && (
            <button className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
              <CheckCircle className="w-4 h-4" />
              Valider
            </button>
          )}
          {payslip.status === "VALIDATED" && (
            <button className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg">
              <CheckCircle className="w-4 h-4" />
              Marquer Payé
            </button>
          )}
        </div>
      </div>
    </div>
  );
}