import React from 'react';
import { X, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { evaluateAcceptanceChecks } from '../../utils/calculations';

interface AcceptanceTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AcceptanceTestModal: React.FC<AcceptanceTestModalProps> = ({ isOpen, onClose }) => {
  const {
    transactions,
    loans,
    investments,
    goals,
    cards,
    insurance,
    settings,
    history,
    importOldData,
  } = useFinance();

  const results = React.useMemo(() => {
    return evaluateAcceptanceChecks({
      transactions,
      loans,
      investments,
      goals,
      cards,
      insurance,
      budgets: settings.budgets,
      history,
      monthKey: '2026-10',
      todayStr: '2026-10-14',
    });
  }, [transactions, loans, investments, goals, cards, insurance, settings.budgets, history]);

  const passedCount = results.filter(r => r.pass).length;
  const allPassed = passedCount === results.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-600/30 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white border border-zinc-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-200">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                allPassed
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-amber-100 text-amber-600'
              }`}
            >
              {allPassed ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900">
                Acceptance Checks Verification (Oct 2026)
              </h2>
              <p className="text-xs text-zinc-500">
                Evaluated against the exact calculation rules and seed data reference
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                allPassed
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
              }`}
            >
              {passedCount} / {results.length} Passed
            </span>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Table content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3">Check / Area</th>
                  <th className="py-3 px-3">Expected (Specification)</th>
                  <th className="py-3 px-3">Actual (App Calculation)</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {results.map(r => (
                  <tr
                    key={r.id}
                    className={`hover:bg-zinc-50 transition ${
                      r.pass ? '' : 'bg-rose-50/50'
                    }`}
                  >
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-zinc-900">{r.category}</div>
                      <div className="text-xs text-zinc-500">{r.check}</div>
                    </td>
                    <td className="py-3.5 px-3 text-zinc-700 font-mono text-xs">
                      {r.expected}
                    </td>
                    <td className="py-3.5 px-3 text-zinc-900 font-mono text-xs">
                      {r.actual}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {r.pass ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Pass
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200">
                          <XCircle className="w-3.5 h-3.5" /> Fail
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-zinc-200 bg-zinc-50 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => importOldData('replace')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-zinc-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset to Fresh Seed State
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:opacity-90 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
