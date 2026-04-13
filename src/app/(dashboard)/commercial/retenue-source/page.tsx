'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DollarSign, Plus, Download, Filter, RefreshCw,
  ChevronLeft, ChevronRight, CheckSquare, Square,
  AlertCircle, CheckCircle, Clock, XCircle, FileCode
} from 'lucide-react';
import { exportTEJ } from '@/lib/tej-generator';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT:      { label: 'Brouillon',  color: 'bg-stone-100 text-stone-600',  icon: AlertCircle },
  EXPORTED:   { label: 'Exporté',    color: 'bg-blue-100 text-blue-700',   icon: Clock },
  SUBMITTED:  { label: 'Soumis',     color: 'bg-amber-100 text-amber-700', icon: Clock },
  ACCEPTED:   { label: 'Accepté',   color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  REJECTED:   { label: 'Rejeté',     color: 'bg-red-100 text-red-600',     icon: XCircle },
  CANCELLED:  { label: 'Annulé',    color: 'bg-stone-100 text-stone-400',  icon: XCircle },
};

const MONTHS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
];

export default function RetenueSourcePage() {
  const router = useRouter();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState('');
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear());
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1);
  const [statusFilter, setStatusFilter] = useState('TOUT');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [resume, setResume] = useState<any>(null);

  useEffect(() => {
    const session = localStorage.getItem('bello_session');
    if (session) {
      const { tenantId: tid } = JSON.parse(session);
      setTenantId(tid);
    }
  }, []);

  const fetchRecords = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tenantId,
        periodYear: String(periodYear),
        periodMonth: String(periodMonth),
        ...(statusFilter !== 'TOUT' && { tejStatus: statusFilter }),
      });
      const res = await fetch(`/api/commercial/retenue-source?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchResume = async () => {
    if (!tenantId) return;
    try {
      const { getRSResume } = await import('@/lib/tej-generator');
      const r = await getRSResume(tenantId, periodYear, periodMonth);
      setResume(r);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (tenantId) {
      fetchRecords();
      fetchResume();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, periodYear, periodMonth, statusFilter]);

  const handleExport = async () => {
    if (!tenantId || selectedIds.length === 0) return;
    setExportLoading(true);
    try {
      const res = await fetch(`/api/commercial/retenue-source/export-tej`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          periodYear,
          periodMonth,
          withholdingTaxIds: selectedIds,
        }),
      });
      const result = await res.json();
      if (res.ok && result.xml) {
        const blob = new Blob([result.xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        a.click();
        fetchRecords();
        fetchResume();
      } else {
        alert(result.error || 'Erreur export');
      }
    } catch (e) { alert('Erreur de connexion'); }
    finally { setExportLoading(false); }
  };

  const toggleAll = () => {
    if (selectedIds.length === records.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(records.filter(r => r.tejStatus === 'DRAFT' || r.tejStatus === 'EXPORTED').map(r => r.id));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const fmt = (n: number) => n.toLocaleString('fr-TN', { style: 'currency', currency: 'TND', maximumFractionDigits: 3 });

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-amber-600" />
            Retenue à la Source
          </h1>
          <p className="text-stone-500 font-medium mt-1">Déclaration TEJ 2026 — Plateforme gouvernementale 🇹🇳</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/commercial/retenue-source/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-black text-sm shadow-lg">
            <Plus className="w-4 h-4" /> Nouvelle RS
          </Link>
        </div>
      </div>

      {/* Period Selector + Resume */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 space-y-3">
          <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Année</p>
          <select value={periodYear} onChange={e => setPeriodYear(Number(e.target.value))}
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm font-bold text-stone-900">
            {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 space-y-3">
          <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Mois</p>
          <select value={periodMonth} onChange={e => setPeriodMonth(Number(e.target.value))}
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm font-bold text-stone-900">
            {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 text-center">
          <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Total Brut HT</p>
          <p className="text-xl font-black text-teal-900 mt-1">{fmt(resume?.totalGross || 0)}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Total RS Due</p>
          <p className="text-xl font-black text-amber-900 mt-1">{fmt(resume?.totalRS || 0)}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-stone-400" />
          <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">Statut:</span>
          {['TOUT','DRAFT','EXPORTED','SUBMITTED','ACCEPTED','REJECTED'].map(s => (
            <button key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${statusFilter === s ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
              {s === 'TOUT' ? 'Tous' : s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={toggleAll}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-stone-200 rounded-lg text-xs font-bold text-stone-600 hover:bg-stone-50">
            {selectedIds.length === records.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            Tout sélectionner
          </button>
          <button onClick={handleExport} disabled={selectedIds.length === 0 || exportLoading}
            className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl font-black text-sm shadow">
            <Download className="w-4 h-4" />
            {exportLoading ? 'Export...' : `Export XML TEJ (${selectedIds.length})`}
          </button>
          <a href="https://www.tej.gov.tn" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-black text-sm shadow">
            🌏 Déclarer sur TEJ
          </a>
          <button onClick={fetchRecords}
            className="flex items-center gap-2 px-3 py-2 border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><RefreshCw className="w-6 h-6 animate-spin text-teal-500 mx-auto" /></div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-10 h-10 text-stone-300 mx-auto" />
            <p className="mt-3 font-bold text-stone-500">Aucune retenue pour cette période</p>
            <Link href="/commercial/retenue-source/new"
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold">
              <Plus className="w-4 h-4" /> Créer une première RS
            </Link>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="w-8 px-4 py-3"></th>
                <th className="px-4 py-3 text-[9px] font-black text-stone-500 uppercase tracking-widest">Bénéficiaire</th>
                <th className="px-4 py-3 text-[9px] font-black text-stone-500 uppercase tracking-widest">Type</th>
                <th className="px-4 py-3 text-[9px] font-black text-stone-500 uppercase tracking-widest">Prestation</th>
                <th className="px-4 py-3 text-right text-[9px] font-black text-stone-500 uppercase tracking-widest">Brut HT</th>
                <th className="px-4 py-3 text-center text-[9px] font-black text-stone-500 uppercase tracking-widest">Taux</th>
                <th className="px-4 py-3 text-right text-[9px] font-black text-stone-500 uppercase tracking-widest">Montant RS</th>
                <th className="px-4 py-3 text-right text-[9px] font-black text-stone-500 uppercase tracking-widest">Net Versé</th>
                <th className="px-4 py-3 text-center text-[9px] font-black text-stone-500 uppercase tracking-widest">Statut TEJ</th>
                <th className="px-4 py-3 text-[9px] font-black text-stone-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {records.map((r: any) => {
                const cfg = STATUS_CONFIG[r.tejStatus] || STATUS_CONFIG.DRAFT;
                const Icon = cfg.icon;
                const selectable = r.tejStatus === 'DRAFT' || r.tejStatus === 'EXPORTED';
                return (
                  <tr key={r.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-4 py-3">
                      {selectable ? (
                        <button onClick={() => toggleOne(r.id)} className="text-stone-400 hover:text-stone-600">
                          {selectedIds.includes(r.id) ? <CheckSquare className="w-4 h-4 text-teal-600" /> : <Square className="w-4 h-4" />}
                        </button>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-black text-stone-900">{r.beneficiaryName}</p>
                      <p className="text-xs text-stone-400 font-mono">{r.beneficiaryTin || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${r.beneficiaryType === 'SOCIETE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {r.beneficiaryType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-600">{r.serviceType}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-bold">{Number(r.grossAmount).toFixed(3)} DT</td>
                    <td className="px-4 py-3 text-center font-mono text-sm">{(Number(r.rate)*100).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-bold text-amber-700">{Number(r.taxAmount).toFixed(3)} DT</td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-bold text-stone-900">{Number(r.netAmount).toFixed(3)} DT</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${cfg.color}`}>
                        <Icon className="w-3 h-3" />{cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/commercial/retenue-source/${r.id}`}
                        className="text-xs font-bold text-teal-600 hover:underline">
                        Voir / Modifier
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
