"use client";

import { useState, useEffect } from "react";
import { PayrollSummary } from "./components/PayrollSummary";
import { PaySlipTable } from "./components/PaySlipTable";
import { PaySlipModal } from "./components/PaySlipModal";
import { DollarSign, FileText, Users, Settings, Plus } from "lucide-react";

const MONTHS = [
  { value: 1, label: "Janvier" },
  { value: 2, label: "Février" },
  { value: 3, label: "Mars" },
  { value: 4, label: "Avril" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Juin" },
  { value: 7, label: "Juillet" },
  { value: 8, label: "Août" },
  { value: 9, label: "Septembre" },
  { value: 10, label: "Octobre" },
  { value: 11, label: "Novembre" },
  { value: 12, label: "Décembre" },
];

export default function PaiePage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [tenantId] = useState("demo-tenant");
  const [summary, setSummary] = useState<any>(null);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchPayrollData();
  }, [selectedMonth, selectedYear, tenantId]);

  async function fetchPayrollData() {
    setLoading(true);
    try {
      const [summaryRes, payslipsRes] = await Promise.all([
        fetch(`/api/hr/payroll?tenantId=${tenantId}&month=${selectedMonth}&year=${selectedYear}`),
        fetch(`/api/hr/payslips?tenantId=${tenantId}&month=${selectedMonth}&year=${selectedYear}`),
      ]);
      const summaryData = await summaryRes.json();
      const payslipsData = await payslipsRes.json();
      setSummary(summaryData);
      setPayslips(Array.isArray(payslipsData) ? payslipsData : []);
    } catch (error) {
      console.error("Error fetching payroll data:", error);
    }
    setLoading(false);
  }

  async function handleGeneratePayslips() {
    try {
      const res = await fetch("/api/hr/payslips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeIds: summary?.employeeIds || [],
          month: selectedMonth,
          year: selectedYear,
          tenantId,
        }),
      });
      const data = await res.json();
      if (data.generated > 0) {
        fetchPayrollData();
      }
    } catch (error) {
      console.error("Error generating payslips:", error);
    }
  }

  function handleViewPayslip(payslip: any) {
    setSelectedPayslip(payslip);
    setShowModal(true);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paie</h1>
          <p className="text-gray-500">Gestion des bulletins de salaire</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">
            <Settings className="w-4 h-4" />
            Paramètres
          </button>
          <button
            onClick={handleGeneratePayslips}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Générer Bulletins
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-4 p-4 bg-white rounded-xl border">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Période:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            {[2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-400" />
            <span className="text-gray-600">Brouillon ({summary?.statusBreakdown?.draft || 0})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-400" />
            <span className="text-gray-600">Validé ({summary?.statusBreakdown?.validated || 0})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-400" />
            <span className="text-gray-600">Payé ({summary?.statusBreakdown?.paid || 0})</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && <PayrollSummary summary={summary} />}

      {/* Payslips Table */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-900">Bulletins de Salaire</h2>
        </div>
        <PaySlipTable
          payslips={payslips}
          loading={loading}
          onViewPayslip={handleViewPayslip}
        />
      </div>

      {/* PaySlip Modal */}
      {showModal && selectedPayslip && (
        <PaySlipModal
          payslip={selectedPayslip}
          onClose={() => {
            setShowModal(false);
            setSelectedPayslip(null);
          }}
        />
      )}
    </div>
  );
}