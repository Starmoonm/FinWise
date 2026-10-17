import React, { useMemo } from 'react';
import {
  FileBarChart2,
  Download,
  Printer,
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  Coins,
  Wallet,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR, formatCompactINR } from '../../utils/formatters';

export const MonthlySummaryScreen: React.FC = () => {
  const {
    activeMonthKey,
    transactions,
    settings,
    loans,
    investments,
    exportCSV,
    setActiveScreen,
  } = useFinance();

  // Active month transactions
  const monthTxs = useMemo(
    () => transactions.filter(t => t.date.startsWith(activeMonthKey)),
    [transactions, activeMonthKey]
  );

  const curIncome = useMemo(
    () => monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [monthTxs]
  );
  const curSpending = useMemo(
    () => monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [monthTxs]
  );
  const curInvested = useMemo(
    () => monthTxs.filter(t => t.type === 'invest').reduce((s, t) => s + t.amount, 0),
    [monthTxs]
  );
  const curLeft = curIncome - curSpending - curInvested;
  const curOutflow = curSpending + curInvested;
  const savingsRate = curIncome > 0 ? ((curInvested / curIncome) * 100).toFixed(1) : '0';

  // Category breakdown
  const categorySummary = useMemo(() => {
    const spends: Record<string, number> = {};
    for (const t of monthTxs) {
      if (t.type === 'expense') {
        spends[t.category] = (spends[t.category] || 0) + t.amount;
      }
    }

    return settings.budgets.map(b => {
      const actual = b.categories.reduce((sum, c) => sum + (spends[c] || 0), 0);
      const variance = b.limit - actual;
      const isOver = variance < 0;
      return {
        name: b.name,
        limit: b.limit,
        actual,
        variance,
        isOver,
        fixed: b.fixed,
        percent: b.limit > 0 ? Math.round((actual / b.limit) * 100) : 0,
      };
    });
  }, [monthTxs, settings.budgets]);

  // Fixed budget analysis
  const fixedTotal = useMemo(
    () => settings.budgets.filter(b => b.fixed).reduce((s, b) => s + b.limit, 0),
    [settings.budgets]
  );
  const fixedActual = useMemo(
    () => categorySummary.filter(b => b.fixed).reduce((s, b) => s + b.actual, 0),
    [categorySummary]
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3.5 sm:px-6 py-6 pb-24 md:pb-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
              <FileBarChart2 className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Monthly Statement ({activeMonthKey})
            </h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Executive financial closing report with category variances, burn rate, and cashflow health
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 shadow-2xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Income</span>
          <div className="text-lg font-bold font-mono text-emerald-600 mt-1">{formatINR(curIncome)}</div>
          <span className="text-[10px] text-zinc-400">Inflow</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Spending</span>
          <div className="text-lg font-bold font-mono text-rose-600 mt-1">{formatINR(curSpending)}</div>
          <span className="text-[10px] text-zinc-400">Expenses</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Invested</span>
          <div className="text-lg font-bold font-mono text-blue-600 mt-1">{formatINR(curInvested)}</div>
          <span className="text-[10px] text-zinc-400">Wealth Building</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Net Left</span>
          <div className={`text-lg font-bold font-mono mt-1 ${curLeft >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatINR(curLeft)}
          </div>
          <span className="text-[10px] text-zinc-400">Income − Outflow</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Outflow</span>
          <div className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {formatINR(curOutflow)}
          </div>
          <span className="text-[10px] text-zinc-400">Spend + Invest</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Savings Rate</span>
          <div className="text-lg font-bold font-mono text-purple-600 mt-1">{savingsRate}%</div>
          <span className="text-[10px] text-zinc-400">Invested / Income</span>
        </div>
      </div>

      {/* Fixed vs Flexible Expense Highlight */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              Fixed Obligations Execution
            </span>
            <span className="text-xs font-mono font-bold text-zinc-600 dark:text-zinc-400">
              {formatINR(fixedActual)} / {formatINR(fixedTotal)}
            </span>
          </div>

          <p className="text-xs text-zinc-500">
            Expected fixed commitments: <strong>{formatINR(fixedTotal)}</strong>. Disbursed so far: <strong>{formatINR(fixedActual)}</strong>.
          </p>

          <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${Math.min(100, fixedTotal > 0 ? (fixedActual / fixedTotal) * 100 : 0)}%` }}
            />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              Budget Health & Variances
            </span>
            <span className="text-xs font-bold text-rose-500">
              {categorySummary.filter(c => c.isOver).length} over-budget
            </span>
          </div>

          <p className="text-xs text-zinc-500">
            {categorySummary.filter(c => c.isOver).length > 0
              ? `Watch out: ${categorySummary.filter(c => c.isOver).map(c => c.name).join(', ')} exceeded allocated limits.`
              : 'All budget categories are within their limits this month!'}
          </p>

          <button
            onClick={() => setActiveScreen('budget')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>Review Full Budget Screen</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Full Statement Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            Monthly Category Performance
          </h3>
          <span className="text-xs text-zinc-400">{categorySummary.length} tracked categories</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100/60 dark:bg-zinc-800/80 text-zinc-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3">Category</th>
                <th className="p-3">Type</th>
                <th className="p-3 text-right">Budget Limit</th>
                <th className="p-3 text-right">Actual Spent</th>
                <th className="p-3 text-right">Variance</th>
                <th className="p-3 text-right">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {categorySummary.map((row, idx) => (
                <tr key={`${row.name}-${idx}`} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition">
                  <td className="p-3 font-semibold text-zinc-800 dark:text-zinc-200">{row.name}</td>
                  <td className="p-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        row.fixed
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                          : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}
                    >
                      {row.fixed ? 'Fixed' : 'Flexible'}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-zinc-700 dark:text-zinc-300">
                    {formatINR(row.limit)}
                  </td>
                  <td
                    className={`p-3 text-right font-mono font-bold ${
                      row.isOver ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    {formatINR(row.actual)}
                  </td>
                  <td
                    className={`p-3 text-right font-mono font-bold ${
                      row.isOver ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {row.isOver ? `−${formatINR(Math.abs(row.variance))}` : `+${formatINR(row.variance)}`}
                  </td>
                  <td className="p-3 text-right font-mono">
                    <span className={row.isOver ? 'text-rose-600 font-bold' : 'text-zinc-500'}>
                      {row.percent}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
