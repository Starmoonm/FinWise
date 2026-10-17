import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  Calendar,
  Layers,
  ArrowUpDown,
  CreditCard,
  Wallet,
  Tag,
  Check,
  RefreshCw,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Transaction, TransactionType } from '../../types';
import { formatINR, formatShortINR } from '../../utils/formatters';

export const ReportBuilderScreen: React.FC = () => {
  const { transactions, settings, accounts, activeMonthKey } = useFinance();

  // Filters
  const [periodPreset, setPeriodPreset] = useState<'month' | '3months' | 'year' | 'all'>('month');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filtered transactions
  const filteredTxs = useMemo(() => {
    return transactions.filter(t => {
      // Period filter
      if (periodPreset === 'month') {
        if (!t.date.startsWith(activeMonthKey)) return false;
      } else if (periodPreset === 'year') {
        if (!t.date.startsWith(activeMonthKey.slice(0, 4))) return false;
      } else if (periodPreset === '3months') {
        // approx check
        const tDate = new Date(t.date);
        const refDate = new Date(`${activeMonthKey}-01`);
        const diffMonths = (refDate.getFullYear() - tDate.getFullYear()) * 12 + (refDate.getMonth() - tDate.getMonth());
        if (diffMonths < 0 || diffMonths > 2) return false;
      }

      // Type
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;

      // Category
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;

      // Mode
      if (modeFilter !== 'all' && t.mode !== modeFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inCat = t.category.toLowerCase().includes(q);
        const inNote = (t.note || '').toLowerCase().includes(q);
        const inPayee = (t.payee || '').toLowerCase().includes(q);
        const inMode = (t.mode || '').toLowerCase().includes(q);
        if (!inCat && !inNote && !inPayee && !inMode) return false;
      }

      return true;
    });
  }, [transactions, periodPreset, activeMonthKey, typeFilter, categoryFilter, modeFilter, searchQuery]);

  // Sorted
  const sortedTxs = useMemo(() => {
    return [...filteredTxs].sort((a, b) => {
      if (sortField === 'date') {
        const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
        return sortOrder === 'asc' ? diff : -diff;
      } else {
        return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
    });
  }, [filteredTxs, sortField, sortOrder]);

  // Aggregated Stats
  const stats = useMemo(() => {
    let totalAmt = 0;
    let maxAmt = 0;
    for (const t of filteredTxs) {
      totalAmt += t.amount;
      if (t.amount > maxAmt) maxAmt = t.amount;
    }
    const count = filteredTxs.length;
    const avg = count > 0 ? Math.round(totalAmt / count) : 0;
    return { count, totalAmt, avg, maxAmt };
  }, [filteredTxs]);

  // Export Filtered CSV
  const exportFilteredCSV = () => {
    if (sortedTxs.length === 0) return;
    const headers = ['Date', 'Type', 'Category', 'Amount', 'Payment Mode', 'Payee', 'Note'];
    const rows = sortedTxs.map(t => [
      t.date,
      t.type,
      `"${t.category}"`,
      t.amount,
      `"${t.mode}"`,
      `"${t.payee || ''}"`,
      `"${t.note || ''}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `MeraKhata_Report_${periodPreset}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3.5 sm:px-6 py-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Custom Report Builder
            </h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Build multi-dimensional queries, filter by date, category, mode or account, and export custom datasets
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportFilteredCSV}
            disabled={sortedTxs.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            <span>Export Filtered CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Control Box */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Filter Parameters
            </h3>
          </div>
          <button
            onClick={() => {
              setPeriodPreset('month');
              setTypeFilter('all');
              setCategoryFilter('all');
              setModeFilter('all');
              setSearchQuery('');
            }}
            className="text-[11px] font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Period Preset */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
              Time Range
            </label>
            <select
              value={periodPreset}
              onChange={e => setPeriodPreset(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100"
            >
              <option value="month">Active Month ({activeMonthKey})</option>
              <option value="3months">Past 3 Months</option>
              <option value="year">Full Year ({activeMonthKey.slice(0, 4)})</option>
              <option value="all">All Historical Time</option>
            </select>
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
              Transaction Type
            </label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100"
            >
              <option value="all">All Types</option>
              <option value="expense">Expense Only</option>
              <option value="income">Income Only</option>
              <option value="invest">Investment Only</option>
              <option value="transfer">Transfer Only</option>
              <option value="cardPayment">Card Payment</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100"
            >
              <option value="all">All Categories</option>
              {settings.expenseCategories.map(c => (
                <option key={`exp-${c}`} value={c}>
                  [Expense] {c}
                </option>
              ))}
              {settings.incomeCategories.map(c => (
                <option key={`inc-${c}`} value={c}>
                  [Income] {c}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
              Payment Mode
            </label>
            <select
              value={modeFilter}
              onChange={e => setModeFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100"
            >
              <option value="all">All Modes</option>
              {settings.paymentModes.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search keywords, payee, note, or tags..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100"
          />
        </div>
      </div>

      {/* Aggregated KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Matched Records</span>
          <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {stats.count}
          </div>
          <span className="text-[10px] text-zinc-400">Entries in query</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Volume</span>
          <div className="text-xl font-bold font-mono text-emerald-600 mt-1">
            {formatINR(stats.totalAmt)}
          </div>
          <span className="text-[10px] text-zinc-400">Sum of amounts</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Average Ticket</span>
          <div className="text-xl font-bold font-mono text-blue-600 mt-1">
            {formatINR(stats.avg)}
          </div>
          <span className="text-[10px] text-zinc-400">Mean per entry</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Largest Entry</span>
          <div className="text-xl font-bold font-mono text-purple-600 mt-1">
            {formatINR(stats.maxAmt)}
          </div>
          <span className="text-[10px] text-zinc-400">Single peak amount</span>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            Filtered Entries ({sortedTxs.length})
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (sortField === 'date') setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
                else setSortField('date');
              }}
              className="text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-emerald-600 flex items-center gap-1"
            >
              <span>Date</span>
              <ArrowUpDown className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                if (sortField === 'amount') setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
                else setSortField('amount');
              }}
              className="text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-emerald-600 flex items-center gap-1"
            >
              <span>Amount</span>
              <ArrowUpDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        {sortedTxs.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-400">
            No transactions match your specified filter parameters.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100/60 dark:bg-zinc-800/80 text-zinc-500 font-bold uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Mode</th>
                  <th className="p-3">Note / Payee</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {sortedTxs.map((t, idx) => (
                  <tr key={`${t.id}-${idx}`} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition">
                    <td className="p-3 font-mono text-zinc-500 whitespace-nowrap">{t.date}</td>
                    <td className="p-3 font-bold text-zinc-800 dark:text-zinc-200">{t.category}</td>
                    <td className="p-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          t.type === 'expense'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                            : t.type === 'income'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                        }`}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-500">{t.mode}</td>
                    <td className="p-3 text-zinc-400 truncate max-w-xs">{t.note || t.payee || '—'}</td>
                    <td
                      className={`p-3 text-right font-mono font-bold whitespace-nowrap ${
                        t.type === 'expense'
                          ? 'text-rose-600 dark:text-rose-400'
                          : t.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {formatINR(t.amount)}
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
};
