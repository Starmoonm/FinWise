import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Search, X, ListOrdered, Tag, Landmark, FileText, ArrowRight } from 'lucide-react';
import { formatINR } from '../../utils/formatters';

export const GlobalSearchModal: React.FC = () => {
  const {
    globalSearchOpen,
    setGlobalSearchOpen,
    transactions,
    settings,
    loans,
    setActiveScreen,
    hideAmounts,
  } = useFinance();

  const [query, setQuery] = useState('');

  // Keyboard shortcut: '/' opens search, 'Escape' closes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !globalSearchOpen && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setGlobalSearchOpen(true);
      }
      if (e.key === 'Escape' && globalSearchOpen) {
        setGlobalSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [globalSearchOpen, setGlobalSearchOpen]);

  const results = useMemo(() => {
    if (!query.trim()) return { tx: [], categories: [], loans: [] };
    const q = query.toLowerCase();

    // 1. Transactions matching payee, category, note
    const matchedTx = transactions.filter(t =>
      (t.category && t.category.toLowerCase().includes(q)) ||
      (t.note && t.note.toLowerCase().includes(q)) ||
      (t.payee && t.payee.toLowerCase().includes(q)) ||
      (t.amount && String(t.amount).includes(q))
    ).slice(0, 8);

    // 2. Categories
    const matchedCats = settings.expenseCategories
      .concat(settings.incomeCategories)
      .filter(c => c.toLowerCase().includes(q))
      .slice(0, 5);

    // 3. Loans
    const matchedLoans = loans.filter(l =>
      l.name.toLowerCase().includes(q) ||
      (l.note && l.note.toLowerCase().includes(q))
    );

    return { tx: matchedTx, categories: matchedCats, loans: matchedLoans };
  }, [query, transactions, settings, loans]);

  if (!globalSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-slate-600/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl bg-white border border-zinc-200 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-zinc-200 flex items-center gap-3">
          <Search className="w-5 h-5 text-zinc-400 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Search entries, categories, loans, notes..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden"
          />
          <button
            onClick={() => setGlobalSearchOpen(false)}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {!query.trim() && (
            <div className="text-center py-8 text-zinc-400 space-y-1">
              <Search className="w-8 h-8 mx-auto opacity-30" />
              <p>Type to search across all your entries, categories, and debts.</p>
              <p className="text-[10px]">Tip: Press '/' anywhere to open search.</p>
            </div>
          )}

          {/* Categories Results */}
          {results.categories.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Categories
              </div>
              <div className="flex flex-wrap gap-1.5">
                {results.categories.map((cat, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setActiveScreen('categories');
                      setGlobalSearchOpen(false);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-zinc-100 text-zinc-800 font-semibold hover:bg-emerald-50 hover:text-emerald-700 transition flex items-center gap-1.5"
                  >
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{cat}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loans Results */}
          {results.loans.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Loans & Debt
              </div>
              <div className="space-y-1.5">
                {results.loans.map(loan => (
                  <div
                    key={loan.id}
                    onClick={() => {
                      setActiveScreen('loans');
                      setGlobalSearchOpen(false);
                    }}
                    className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 cursor-pointer hover:border-emerald-500 transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-blue-500" />
                      <div>
                        <span className="font-bold text-zinc-900">{loan.name}</span>
                        <span className="text-[10px] text-zinc-400 ml-2 capitalize">({loan.direction})</span>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-zinc-800">
                      {hideAmounts ? '••••••' : formatINR(loan.outstanding)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transactions Results */}
          {results.tx.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Transactions ({results.tx.length})
              </div>
              <div className="space-y-1.5">
                {results.tx.map(t => (
                  <div
                    key={t.id}
                    onClick={() => {
                      setActiveScreen('entries');
                      setGlobalSearchOpen(false);
                    }}
                    className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 cursor-pointer hover:border-emerald-500 transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <ListOrdered className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <div className="font-bold text-zinc-900">
                          {t.category} {t.payee ? `· ${t.payee}` : ''}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {t.date} · {t.mode} {t.note ? `· "${t.note}"` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-right">
                      <div className={t.type === 'income' ? 'text-emerald-600' : 'text-zinc-900'}>
                        {hideAmounts ? '••••••' : (t.type === 'income' ? `+${formatINR(t.amount)}` : formatINR(t.amount))}
                      </div>
                      <div className="text-[9px] uppercase text-zinc-400">{t.type}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {query.trim() && results.categories.length === 0 && results.loans.length === 0 && results.tx.length === 0 && (
            <div className="text-center py-6 text-zinc-400">
              No matching results found for "{query}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
