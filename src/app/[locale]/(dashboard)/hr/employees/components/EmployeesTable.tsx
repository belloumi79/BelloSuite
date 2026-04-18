"use client";

import { Eye, Edit2, Loader2 } from "lucide-react";

interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  poste: string | null;
  typeContrat: string;
  isActive: boolean;
}

interface EmployeesTableProps {
  employees: Employee[];
  loading: boolean;
  onEditEmployee: (employee: Employee) => void;
}

export function EmployeesTable({ employees, loading, onEditEmployee }: EmployeesTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="text-center py-12 text-stone-500 bg-white rounded-xl border border-stone-200">
        Aucun employé trouvé.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-x-auto shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-stone-50">
            <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase">Matricule</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase">Employé</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase">Contact</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase">Poste & Contrat</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-stone-500 uppercase">Statut</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-stone-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {employees.map((employee) => (
            <tr key={employee.id} className="hover:bg-stone-50">
              <td className="px-4 py-3 text-sm font-mono text-stone-900 border-l-4 border-transparent hover:border-teal-500">
                {employee.employeeNumber}
              </td>
              <td className="px-4 py-3">
                <div className="text-sm font-bold text-stone-900">
                  {employee.firstName} {employee.lastName}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="text-xs text-stone-500">{employee.email || "—"}</div>
                <div className="text-xs text-stone-500">{employee.phone || "—"}</div>
              </td>
              <td className="px-4 py-3">
                <div className="text-sm font-medium text-stone-900">{employee.poste || "—"}</div>
                <div className="text-xs text-stone-500">{employee.typeContrat}</div>
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${employee.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-800'}`}>
                  {employee.isActive ? 'Actif' : 'Inactif'}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => onEditEmployee(employee)}
                  className="p-1.5 hover:bg-stone-200 rounded-lg text-stone-600 transition-colors"
                  title="Modifier"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
