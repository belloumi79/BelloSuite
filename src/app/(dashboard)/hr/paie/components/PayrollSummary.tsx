"use client";

import { DollarSign, Users, FileText, TrendingUp, Building2 } from "lucide-react";

interface PayrollSummaryProps {
  summary: {
    totalEmployees: number;
    totalGross: number;
    totalNet: number;
    totalCNSS: number;
    totalIRPP: number;
    totalTransport: number;
    totalMeal: number;
    totalFamily: number;
    totalOvertime: number;
    cnssEmployer: number;
    cnssEmployee: number;
  };
}

export function PayrollSummary({ summary }: PayrollSummaryProps) {
  const cards = [
    {
      label: "Salaire Brut Total",
      value: summary.totalGross.toLocaleString("fr-TN", { style: "currency", currency: "TND" }),
      icon: DollarSign,
      color: "text-teal-600",
      bg: "bg-teal-50",
    },
    {
      label: "Salaire Net Total",
      value: summary.totalNet.toLocaleString("fr-TN", { style: "currency", currency: "TND" }),
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Employés",
      value: summary.totalEmployees.toString(),
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Total CNSS (Employé)",
      value: summary.totalCNSS.toLocaleString("fr-TN", { style: "currency", currency: "TND" }),
      icon: Building2,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Total IRPP",
      value: summary.totalIRPP.toLocaleString("fr-TN", { style: "currency", currency: "TND" }),
      icon: FileText,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Heures Supp.",
      value: summary.totalOvertime.toLocaleString("fr-TN", { style: "currency", currency: "TND" }),
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, i) => (
        <div key={i} className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded-lg ${card.bg}`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-1">{card.label}</p>
          <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}

function Clock({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}