'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const SERVICE_TYPES = [
  { value: 'PRESTATION_SERVICE', label: 'Prestations de services', taux: '15% (7.5% société)' },
  { value: 'HONORAIRES', label: 'Honoraires', taux: '15% (7.5% société)' },
  { value: 'LOYERS', label: 'Loyers', taux: '5% (2.5% société)' },
  { value: 'DIVIDENDES', label: 'Dividendes', taux: '5%' },
  { value: 'INTERETS', label: 'Intérêts', taux: '20%' },
  { value: 'ROYALTIES', label: 'Royalties', taux: '15% (7.5% société)' },
  { value: 'REMUNERATION', label: 'Rémunérations', taux: '19%' },
  { value: 'AUTRE', label: 'Autre', taux: '—' },
];

const BENEFICIARY_TYPES = [
  { value: 'INDIVIDU', label: 'Personne Physique' },
  { value: 'SOCIETE', label: 'Société' },
];

export default function NewRetenueSourcePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    beneficiaryName: '',
    beneficiaryTin: '',
    beneficiaryType: 'INDIVIDU',
    serviceType: 'PRESTATION_SERVICE',
    grossAmount: '',
    periodMonth: String(new Date().getMonth() + 1).padStart(2, '0'),
    periodYear: String(new Date().getFullYear()),
    paymentDate: '',
    paymentMethod: '',
    paymentReference: '',
    invoiceId: '',
    notes: '',
    tenantId: 'demo', // TODO: remplacer par tenant réel depuis le contexte
  });
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedService = SERVICE_TYPES.find((s) => s.value === form.serviceType);

  // Calcul en temps réel (côté client via l'API ou calcul direct)
  function calculateRS() {
    const montant = parseFloat(form.grossAmount);
    if (!montant || !form.serviceType) return null;

    const tauxNormal =
      { PRESTATION_SERVICE: 0.15, HONORAIRES: 0.15, LOYERS: 0.05, DIVIDENDES: 0.05, INTERETS: 0.20, ROYALTIES: 0.15, REMUNERATION: 0.19, AUTRE: 0 }[
        form.serviceType
      ] || 0;

    let taux = tauxNormal;
    if (form.beneficiaryType === 'SOCIETE' && ['PRESTATION_SERVICE', 'HONORAIRES', 'ROYALTIES'].includes(form.serviceType)) {
      taux = tauxNormal * 0.5;
    }

    const taxAmount = Number((montant * taux).toFixed(3));
    const netAmount = Number((montant - taxAmount).toFixed(3));
    const teeJAmount = Number((montant * 0.81).toFixed(3));

    return { taux, taxAmount, netAmount, teeJAmount };
  }

  function handleAmountChange(val: string) {
    setForm((f) => ({ ...f, grossAmount: val }));
    setPreview(calculateRS());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/commercial/retenue-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la création');
      }
      router.push('/commercial/retenue-source');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const calc = preview || calculateRS();

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nouvelle Retenue à la Source</h1>
        <p className="text-gray-500 text-sm mt-1">Calculez et enregistrez une retenue à la source (RS)</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white border rounded-xl p-6 shadow-sm">
        {/* Bénéficiaire */}
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-800 border-b pb-2">Bénéficiaire</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom / Raison sociale *</label>
              <input
                required
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.beneficiaryName}
                onChange={(e) => setForm((f) => ({ ...f, beneficiaryName: e.target.value }))}
                placeholder="Ex: Mohamed Ben Amor"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Matricule fiscal</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.beneficiaryTin}
                onChange={(e) => setForm((f) => ({ ...f, beneficiaryTin: e.target.value }))}
                placeholder="12345678ABC"
                maxLength={11}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de bénéficiaire</label>
            <div className="flex gap-4">
              {BENEFICIARY_TYPES.map((bt) => (
                <label key={bt.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="beneficiaryType"
                    value={bt.value}
                    checked={form.beneficiaryType === bt.value}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, beneficiaryType: e.target.value }));
                      setTimeout(() => setPreview(calculateRS()), 0);
                    }}
                  />
                  {bt.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Prestation */}
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-800 border-b pb-2">Type de Prestation</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nature de la prestation *</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.serviceType}
              onChange={(e) => {
                setForm((f) => ({ ...f, serviceType: e.target.value }));
                setTimeout(() => setPreview(calculateRS()), 0);
              }}
            >
              {SERVICE_TYPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            {selectedService && (
              <p className="text-xs text-gray-500 mt-1">Taux: {selectedService.taux}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant Brut HT (TND) *</label>
              <input
                required
                type="number"
                min="0"
                step="0.001"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.grossAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.000"
              />
            </div>
          </div>
        </div>

        {/* Calcul Preview */}
        {calc && parseFloat(form.grossAmount) > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
            <h3 className="font-semibold text-blue-800 text-sm">Aperçu du calcul</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <span className="text-gray-600">Taux RS appliqué:</span>
              <span className="font-medium text-blue-900">{(calc.taux * 100).toFixed(1)}%</span>
              <span className="text-gray-600">Montant brut HT:</span>
              <span className="font-medium">{Number(form.grossAmount).toFixed(3)} TND</span>
              <span className="text-gray-600">Montant RS:</span>
              <span className="font-medium text-red-600">{calc.taxAmount.toFixed(3)} TND</span>
              <span className="text-gray-600">Montant net:</span>
              <span className="font-medium text-green-700">{calc.netAmount.toFixed(3)} TND</span>
              <span className="text-gray-600">Montant TEEJ (81%):</span>
              <span className="font-medium text-blue-700">{calc.teeJAmount.toFixed(3)} TND</span>
            </div>
          </div>
        )}

        {/* Période */}
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-800 border-b pb-2">Période de Déclaration</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mois *</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.periodMonth}
                onChange={(e) => setForm((f) => ({ ...f, periodMonth: e.target.value }))}
              >
                {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Année *</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.periodYear}
                onChange={(e) => setForm((f) => ({ ...f, periodYear: e.target.value }))}
              >
                {[2024,2025,2026].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Paiement */}
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-800 border-b pb-2">Paiement</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de paiement</label>
              <input
                type="date"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.paymentDate}
                onChange={(e) => setForm((f) => ({ ...f, paymentDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Méthode</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.paymentMethod}
                onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
              >
                <option value="">—</option>
                <option value="VIREMENT">Virement</option>
                <option value="CHEQUE">Chèque</option>
                <option value="ESPECE">Espèces</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Référence</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.paymentReference}
                onChange={(e) => setForm((f) => ({ ...f, paymentReference: e.target.value }))}
                placeholder="N° virement/chèque"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Observations..."
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Enregistrement...' : 'Enregistrer la RS'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
