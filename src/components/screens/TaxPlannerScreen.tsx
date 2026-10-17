import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Info,
  Calendar,
  Layers,
  Percent,
  TrendingUp,
  Receipt,
  Shield,
  Coins,
  ChevronRight,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { TaxSectionConfig, TaxQualifyingEntry } from '../../types';
import { formatINR } from '../../utils/formatters';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface DefaultSection {
  code: string;
  name: string;
  limit: number;
  description: string;
}

const DEFAULT_SECTIONS: DefaultSection[] = [
  {
    code: '80C',
    name: 'Section 80C Deductions',
    limit: 150000,
    description: 'LIC policy premiums, PPF, ELSS mutual funds, EPF, Home Loan principal repayment, and children tuition fees.',
  },
  {
    code: '80D',
    name: 'Section 80D Health Insurance',
    limit: 25000,
    description: 'Medical and health insurance premiums paid for Self, Spouse, Children (₹25k) and Parents (up to ₹50k for seniors).',
  },
  {
    code: '80CCD(1B)',
    name: 'Section 80CCD(1B) NPS',
    limit: 50000,
    description: 'Additional exclusive voluntary contributions to the National Pension System (NPS Tier 1).',
  },
];

export const TaxPlannerScreen: React.FC = () => {
  const {
    investments,
    insurance,
    loans,
    transactions,
    todayDateStr,
    showToast,
  } = useFinance();

  // Financial Year Switcher (e.g. FY 2026-27: Apr 1, 2026 to Mar 31, 2027)
  const [selectedFY, setSelectedFY] = useState<number>(2026); // FY 2026-27

  // Section configs with user editable limits
  const [sectionLimits, setSectionLimits] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('mk_local_tax_limits');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return {
      '80C': 150000,
      '80D': 25000,
      '80CCD(1B)': 50000,
    };
  });

  // Manual tax entries stored in localStorage
  const [manualEntries, setManualEntries] = useState<TaxQualifyingEntry[]>(() => {
    const saved = localStorage.getItem('mk_local_tax_manual_entries');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return [];
  });

  // Edit Limit modal
  const [editingSectionCode, setEditingSectionCode] = useState<string | null>(null);
  const [editLimitInput, setEditLimitInput] = useState('');

  // Manual Add Modal
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualSection, setManualSection] = useState('80C');
  const [manualDate, setManualDate] = useState(todayDateStr);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Auto-pull qualifying entries from investments and insurance for the selected FY
  const fyStart = `${selectedFY}-04-01`;
  const fyEnd = `${selectedFY + 1}-03-31`;

  const autoQualifyingEntries = useMemo(() => {
    const list: TaxQualifyingEntry[] = [];

    // 1. From Investments:
    for (const inv of investments) {
      const typeLower = (inv.type || '').toLowerCase();
      const nameLower = inv.name.toLowerCase();

      // 80C: LIC, PPF, ELSS, EPF
      if (
        typeLower.includes('lic') ||
        nameLower.includes('lic') ||
        typeLower.includes('ppf') ||
        typeLower.includes('epf') ||
        nameLower.includes('elss')
      ) {
        // Sum installments in this FY
        const linkedTxs = transactions.filter(
          t => t.type === 'invest' && (t.investmentId === inv.id || t.category === inv.name) && t.date >= fyStart && t.date <= fyEnd
        );
        const txAmount = linkedTxs.reduce((sum, t) => sum + t.amount, 0);
        const amount = txAmount > 0 ? txAmount : (inv.installment * (inv.frequency === 'yearly' ? 1 : 12));

        list.push({
          id: `auto_inv_${inv.id}`,
          name: `${inv.name} (${inv.type})`,
          amount,
          source: 'investment',
          date: inv.nextDueDate || fyStart,
          section: '80C',
        });
      }

      // 80CCD(1B): NPS
      if (typeLower.includes('nps') || nameLower.includes('nps')) {
        const linkedTxs = transactions.filter(
          t => t.type === 'invest' && (t.investmentId === inv.id || t.category === inv.name) && t.date >= fyStart && t.date <= fyEnd
        );
        const txAmount = linkedTxs.reduce((sum, t) => sum + t.amount, 0);
        const amount = txAmount > 0 ? txAmount : (inv.installment * 12);

        list.push({
          id: `auto_nps_${inv.id}`,
          name: `${inv.name} (NPS Contribution)`,
          amount,
          source: 'investment',
          date: inv.nextDueDate || fyStart,
          section: '80CCD(1B)',
        });
      }
    }

    // 2. From Insurance:
    for (const pol of insurance) {
      const typeLower = (pol.type || '').toLowerCase();
      const nameLower = pol.name.toLowerCase();

      // Health Insurance -> Section 80D
      if (typeLower.includes('health') || nameLower.includes('health') || nameLower.includes('medical')) {
        list.push({
          id: `auto_ins_${pol.id}`,
          name: `${pol.name} Premium`,
          amount: pol.yearlyPremium,
          source: 'insurance',
          date: pol.nextDueDate || pol.renewalDate || fyStart,
          section: '80D',
        });
      }

      // Life Insurance Premiums (if marked here) -> 80C
      if (typeLower.includes('life') || typeLower.includes('term') || nameLower.includes('term')) {
        list.push({
          id: `auto_ins_life_${pol.id}`,
          name: `${pol.name} Premium`,
          amount: pol.yearlyPremium,
          source: 'insurance',
          date: pol.nextDueDate || pol.renewalDate || fyStart,
          section: '80C',
        });
      }
    }

    return list;
  }, [investments, insurance, transactions, fyStart, fyEnd]);

  // Combined qualifying entries
  const allEntries = useMemo(() => {
    return [...autoQualifyingEntries, ...manualEntries];
  }, [autoQualifyingEntries, manualEntries]);

  // Section Summaries
  const sectionsSummary = useMemo(() => {
    return DEFAULT_SECTIONS.map(sec => {
      const limit = sectionLimits[sec.code] ?? sec.limit;
      const entries = allEntries.filter(e => e.section === sec.code);
      const totalUtilized = entries.reduce((sum, e) => sum + e.amount, 0);
      const eligibleDeduction = Math.min(limit, totalUtilized);
      const remainingRoom = Math.max(0, limit - totalUtilized);
      const utilPct = limit > 0 ? (totalUtilized / limit) * 100 : 0;

      return {
        ...sec,
        limit,
        entries,
        totalUtilized,
        eligibleDeduction,
        remainingRoom,
        utilPct,
      };
    });
  }, [sectionLimits, allEntries]);

  // Overall Total Deductions
  const overallEligibleDeduction = useMemo(() => {
    return sectionsSummary.reduce((sum, s) => sum + s.eligibleDeduction, 0);
  }, [sectionsSummary]);

  // Save edited limit
  const handleSaveLimit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSectionCode) return;

    const val = Number(editLimitInput) || 0;
    const updated = { ...sectionLimits, [editingSectionCode]: val };
    setSectionLimits(updated);
    localStorage.setItem('mk_local_tax_limits', JSON.stringify(updated));
    setEditingSectionCode(null);
    showToast(`Updated limit for ${editingSectionCode} to ₹${val.toLocaleString('en-IN')}`);
  };

  // Add Manual Entry
  const handleAddManualEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) {
      showToast('Please enter an entry name');
      return;
    }

    const amt = Number(manualAmount) || 0;
    if (amt <= 0) {
      showToast('Please enter a valid amount');
      return;
    }

    const newEntry: TaxQualifyingEntry = {
      id: `manual_${Date.now()}`,
      name: manualName.trim(),
      amount: amt,
      source: 'manual',
      date: manualDate,
      section: manualSection,
    };

    const updated = [...manualEntries, newEntry];
    setManualEntries(updated);
    localStorage.setItem('mk_local_tax_manual_entries', JSON.stringify(updated));
    setIsManualAddOpen(false);
    setManualName('');
    setManualAmount('');
    showToast(`Added ₹${amt.toLocaleString('en-IN')} to ${manualSection}`);
  };

  // Delete manual entry
  const handleDeleteManual = (id: string) => {
    const updated = manualEntries.filter(e => e.id !== id);
    setManualEntries(updated);
    localStorage.setItem('mk_local_tax_manual_entries', JSON.stringify(updated));
    showToast('Manual entry removed');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            Tax Planner (India Deductions)
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Section 80C, 80D, and 80CCD(1B) deduction tracker with auto-pulled investment & policy receipts
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* FY Switcher */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 text-xs font-semibold">
            <button
              onClick={() => setSelectedFY(2025)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                selectedFY === 2025
                  ? 'bg-white dark:bg-zinc-900 shadow-xs text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500'
              }`}
            >
              FY 2025-26
            </button>
            <button
              onClick={() => setSelectedFY(2026)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                selectedFY === 2026
                  ? 'bg-white dark:bg-zinc-900 shadow-xs text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500'
              }`}
            >
              FY 2026-27 (Current)
            </button>
          </div>

          <button
            onClick={() => setIsManualAddOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Receipt
          </button>
        </div>
      </div>

      {/* Mandatory Statutory Disclaimer Banner */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3.5 flex items-center gap-3 text-xs text-amber-900 dark:text-amber-200">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span>
          <strong>Statutory Notice:</strong> Limits and tax regimes change — verify before filing. Not tax advice.
        </span>
      </div>

      {/* Total Eligible Deductions Hero Card */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">
            Total Claimable Deductions (FY {selectedFY}–{selectedFY + 1})
          </span>
          <div className="flex items-baseline gap-3 mt-1">
            <h2 className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              {formatINR(overallEligibleDeduction)}
            </h2>
            <span className="text-xs text-zinc-400">
              across 80C, 80D & 80CCD(1B)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-zinc-600 dark:text-zinc-300">
          <div>
            <span className="text-zinc-400 block text-[11px]">80C Utilized</span>
            <span className="font-bold font-mono text-sm">
              {formatINR(sectionsSummary.find(s => s.code === '80C')?.eligibleDeduction || 0)} / {formatINR(sectionLimits['80C'] || 150000)}
            </span>
          </div>
          <div>
            <span className="text-zinc-400 block text-[11px]">80D Utilized</span>
            <span className="font-bold font-mono text-sm">
              {formatINR(sectionsSummary.find(s => s.code === '80D')?.eligibleDeduction || 0)} / {formatINR(sectionLimits['80D'] || 25000)}
            </span>
          </div>
          <div>
            <span className="text-zinc-400 block text-[11px]">80CCD(1B)</span>
            <span className="font-bold font-mono text-sm">
              {formatINR(sectionsSummary.find(s => s.code === '80CCD(1B)')?.eligibleDeduction || 0)} / {formatINR(sectionLimits['80CCD(1B)'] || 50000)}
            </span>
          </div>
        </div>
      </div>

      {/* Sections Cards */}
      <div className="space-y-4">
        {sectionsSummary.map(sec => {
          return (
            <div
              key={sec.code}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">{sec.name}</h3>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      {sec.utilPct >= 100 ? 'Limit Maxed ✓' : `${sec.utilPct.toFixed(0)}% Utilized`}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 max-w-2xl">{sec.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Limit:</span>
                  <span className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
                    {formatINR(sec.limit)}
                  </span>
                  <button
                    onClick={() => {
                      setEditingSectionCode(sec.code);
                      setEditLimitInput(String(sec.limit));
                    }}
                    className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded"
                    title="Edit deduction limit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress Bar & Room Indicator */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    Claimable Deduction: {formatINR(sec.eligibleDeduction)}
                    {sec.totalUtilized > sec.limit && (
                      <span className="text-zinc-400 font-normal ml-1">
                        (Total qualifying: {formatINR(sec.totalUtilized)})
                      </span>
                    )}
                  </span>
                  <span className={sec.remainingRoom > 0 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-emerald-600 font-medium'}>
                    {sec.remainingRoom > 0
                      ? `Remaining Room: ${formatINR(sec.remainingRoom)}`
                      : '✓ Limit fully utilized'}
                  </span>
                </div>

                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      sec.utilPct >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, sec.utilPct))}%` }}
                  />
                </div>
              </div>

              {/* Qualifying Entries Table */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
                  <span>Qualifying Receipts & Auto-Pulled Entries ({sec.entries.length})</span>
                  <button
                    onClick={() => {
                      setManualSection(sec.code);
                      setIsManualAddOpen(true);
                    }}
                    className="text-emerald-600 hover:underline font-semibold text-[11px]"
                  >
                    + Add manual receipt
                  </button>
                </h4>

                {sec.entries.length === 0 ? (
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800 text-xs text-zinc-400 text-center">
                    No qualifying entries found for {sec.code}. Add qualifying investments, insurance or manual receipts.
                  </div>
                ) : (
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-zinc-50 dark:bg-zinc-800/80 text-zinc-500 uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Receipt / Item</th>
                          <th className="py-2 px-3">Source</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3 text-right">Amount</th>
                          <th className="py-2 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {sec.entries.map(entry => (
                          <tr key={entry.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                            <td className="py-2 px-3 font-medium text-zinc-800 dark:text-zinc-200">
                              {entry.name}
                            </td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                entry.source === 'investment'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                  : entry.source === 'insurance'
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                              }`}>
                                {entry.source.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-zinc-500">{entry.date || '—'}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                              {formatINR(entry.amount)}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {entry.source === 'manual' ? (
                                <button
                                  onClick={() => handleDeleteManual(entry.id)}
                                  className="text-rose-600 hover:text-rose-700 font-semibold text-[11px]"
                                >
                                  Remove
                                </button>
                              ) : (
                                <span className="text-[10px] text-zinc-400">Auto-pulled</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Limit Modal */}
      {editingSectionCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Edit Limit for {editingSectionCode}
            </h3>

            <form onSubmit={handleSaveLimit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-500 mb-1">Deduction Limit (₹)</label>
                <input
                  type="number"
                  required
                  value={editLimitInput}
                  onChange={e => setEditLimitInput(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 font-mono text-sm font-bold"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingSectionCode(null)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  Save Limit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Add Receipt Modal */}
      {isManualAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Add Qualifying Tax Receipt
              </h3>
              <button
                onClick={() => setIsManualAddOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddManualEntry} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-500 mb-1">Receipt / Item Name</label>
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={e => setManualName(e.target.value)}
                  placeholder="e.g. Children School Tuition Fee, ELSS Receipt, Home Loan Principal"
                  className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-500 mb-1">Deduction Section</label>
                  <select
                    value={manualSection}
                    onChange={e => setManualSection(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700"
                  >
                    <option value="80C">Section 80C</option>
                    <option value="80D">Section 80D (Medical)</option>
                    <option value="80CCD(1B)">Section 80CCD(1B) (NPS)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={manualAmount}
                    onChange={e => setManualAmount(e.target.value)}
                    placeholder="25000"
                    className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 font-mono text-sm font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">Receipt Date</label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={e => setManualDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsManualAddOpen(false)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  Add Deduction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
