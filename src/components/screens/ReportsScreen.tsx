import React, { useState, useMemo, useRef } from 'react';
import {
  FileBarChart2,
  Download,
  Upload,
  Calendar,
  PieChart as PieIcon,
  TrendingUp,
  TrendingDown,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import {
  calculateIncome,
  calculateSpending,
  calculateInvested,
  calculateLeft,
  calculateOutflow,
  calculateSavingsRate,
  getTransactionsForMonth,
} from '../../utils/calculations';
import { formatINR, formatShortINR, formatMonthKey } from '../../utils/formatters';

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];

export const ReportsScreen: React.FC = () => {
  const {
    activeMonthKey,
    transactions,
    history,
    exportCSV,
    exportJSON,
    restoreFromJSON,
  } = useFinance();

  // Mode: 'month' | 'year'
  const [reportPeriod, setReportPeriod] = useState<'month' | 'year'>('month');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Month transactions vs Year transactions
  const activeTx = useMemo(() => {
    if (reportPeriod === 'month') {
      return getTransactionsForMonth(transactions, activeMonthKey);
    }
    const currentYear = activeMonthKey.slice(0, 4); // "2026"
    return transactions.filter(t => t.date.startsWith(currentYear));
  }, [transactions, activeMonthKey, reportPeriod]);

  // Totals
  const income = useMemo(() => {
    if (reportPeriod === 'month') {
      return calculateIncome(activeTx);
    }
    // Year 2026: Include jan_to_mar_2026 history + real transactions
    const aprToDecIncome = calculateIncome(activeTx);
    const janToMar = history.jan_to_mar_2026?.income || 373940;
    return aprToDecIncome + janToMar;
  }, [activeTx, reportPeriod, history]);

  const spending = useMemo(() => {
    if (reportPeriod === 'month') {
      return calculateSpending(activeTx);
    }
    const aprToDecSpending = calculateSpending(activeTx);
    const janToMarSp = history.jan_to_mar_2026?.spending || 474588;
    return aprToDecSpending + janToMarSp;
  }, [activeTx, reportPeriod, history]);

  const invested = useMemo(() => {
    if (reportPeriod === 'month') {
      return calculateInvested(activeTx);
    }
    const thisYearInv = calculateInvested(activeTx);
    const histInv = history.jan_to_mar_2026?.invested || 23200;
    return thisYearInv + histInv;
  }, [activeTx, reportPeriod, history]);

  const outflow = useMemo(() => {
    if (reportPeriod === 'month') {
      return calculateOutflow(spending, invested);
    }
    const aprToDecOutflow = calculateOutflow(calculateSpending(activeTx), calculateInvested(activeTx));
    const histOutflow = history.jan_to_mar_2026?.outflow || 497788;
    return aprToDecOutflow + histOutflow;
  }, [activeTx, spending, invested, reportPeriod, history]);

  const left = calculateLeft(income, spending, invested);
  const savingsRate = calculateSavingsRate(income, spending);

  // 12-Month Income vs Outflow Bar Chart
  const monthlyChartData = useMemo(() => {
    const months = [
      '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
      '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12',
    ];

    const janMarInc = Math.round((history.jan_to_mar_2026?.income || 373940) / 3);
    const janMarOut = Math.round((history.jan_to_mar_2026?.outflow || 497788) / 3);

    return months.map(m => {
      const monthTx = getTransactionsForMonth(transactions, m);

      let mIncome = 0;
      let mOutflow = 0;
      let isOldApp = false;

      if (monthTx.length > 0) {
        mIncome = calculateIncome(monthTx);
        const mSpending = calculateSpending(monthTx);
        const mInvested = calculateInvested(monthTx);
        mOutflow = calculateOutflow(mSpending, mInvested);
      } else if (history.monthlyTotals[m]) {
        mIncome = history.monthlyTotals[m].income;
        mOutflow = history.monthlyTotals[m].outflow;
        isOldApp = true;
      } else if (m <= '2026-03') {
        // Combined Jan-Mar history
        mIncome = janMarInc;
        mOutflow = janMarOut;
        isOldApp = true;
      }

      return {
        month: m.slice(5), // "01", "10", etc.
        monthKey: m,
        Income: mIncome,
        Outflow: mOutflow,
        isOldApp,
      };
    });
  }, [transactions, history]);

  // Payment mode split
  const paymentModeData = useMemo(() => {
    const modes: Record<string, number> = {};
    for (const t of activeTx) {
      if (t.type === 'expense' || t.type === 'invest') {
        modes[t.mode] = (modes[t.mode] || 0) + t.amount;
      }
    }
    return Object.entries(modes).map(([name, value]) => ({ name, value }));
  }, [activeTx]);

  // Category breakdown table
  const categoryTable = useMemo(() => {
    const map: Record<string, { count: number; total: number; type: string }> = {};
    for (const t of activeTx) {
      if (!map[t.category]) {
        map[t.category] = { count: 0, total: 0, type: t.type };
      }
      map[t.category].count++;
      map[t.category].total += t.amount;
    }

    return Object.entries(map)
      .map(([cat, data]) => ({ category: cat, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [activeTx]);

  const handleDownloadJSON = () => {
    const jsonStr = exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mera_khata_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const text = event.target?.result as string;
        await restoreFromJSON(text);
        alert('Data successfully restored from JSON backup.');
      } catch (err) {
        alert('Failed to restore data. Please verify the JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3.5 sm:px-6 py-6 pb-24 md:pb-8">
      {/* Header & Month/Year Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Financial Reports</h2>
          <p className="text-xs text-zinc-500">
            Cashflow analytics, category breakdown, 12-month trends, and data backup
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-zinc-100 rounded-xl">
            <button
              onClick={() => setReportPeriod('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                reportPeriod === 'month'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {formatMonthKey(activeMonthKey)}
            </button>
            <button
              onClick={() => setReportPeriod('year')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                reportPeriod === 'year'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Year 2026
            </button>
          </div>
        </div>
      </div>

      {/* Overview Totals Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <div className="text-[11px] font-semibold text-zinc-500">Income</div>
          <div className="text-lg font-black text-emerald-600 mt-1">
            {formatINR(income)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <div className="text-[11px] font-semibold text-zinc-500">Spending</div>
          <div className="text-lg font-black text-rose-600 mt-1">
            {formatINR(spending)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <div className="text-[11px] font-semibold text-zinc-500">Invested</div>
          <div className="text-lg font-black text-indigo-600 mt-1">
            {formatINR(invested)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <div className="text-[11px] font-semibold text-zinc-500">Left (Surplus)</div>
          <div
            className={`text-lg font-black mt-1 ${
              left < 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {formatINR(left)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <div className="text-[11px] font-semibold text-zinc-500">Total Outflow</div>
          <div className="text-lg font-black text-zinc-900 mt-1">
            {formatINR(outflow)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <div className="text-[11px] font-semibold text-zinc-500">Savings Rate</div>
          <div className="text-lg font-black text-zinc-900 mt-1">
            {(savingsRate * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* 12-Month Income vs Outflow Bar Chart */}
      <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h3 className="text-base font-bold text-zinc-900">
              12-Month Income vs Outflow (Year 2026)
            </h3>
            <p className="text-xs text-zinc-500">
              Historical months without individual records are populated from old app history
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span className="inline-block w-2.5 h-2.5 rounded bg-emerald-500" /> Income
            <span className="inline-block w-2.5 h-2.5 rounded bg-rose-500 ml-2" /> Outflow
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#71717a' }} />
              <YAxis tick={{ fontSize: 10, fill: '#71717a' }} tickFormatter={v => formatShortINR(v)} />
              <Tooltip
                formatter={(val: any, name: any) => [formatINR(Number(val) || 0), String(name || '')]}
                contentStyle={{
                  backgroundColor: '#18181b',
                  borderRadius: '12px',
                  color: '#fff',
                  border: 'none',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Outflow" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payment Mode Split & Category Breakdown Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Payment Mode Split */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-zinc-900">
            Payment Mode Distribution
          </h3>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentModeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {paymentModeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [formatINR(Number(val) || 0), 'Amount']}
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderRadius: '12px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '11px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 text-xs">
            {paymentModeData.map((d, i) => (
              <div key={`${d.name}-${i}`} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="text-zinc-700">{d.name}</span>
                </div>
                <span className="font-mono font-bold text-zinc-900">
                  {formatINR(d.value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Table */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900">
              Category Summary Table ({reportPeriod === 'month' ? activeMonthKey : 'Year 2026'})
            </h3>
            <span className="text-xs text-zinc-500">{categoryTable.length} categories</span>
          </div>

          <div className="max-h-64 overflow-y-auto overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-center">Entries</th>
                  <th className="py-2.5 px-3 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {categoryTable.map((item, idx) => (
                  <tr key={`${item.category}-${idx}`} className="hover:bg-zinc-50">
                    <td className="py-2 px-3 font-semibold text-zinc-900">
                      {item.category}
                    </td>
                    <td className="py-2 px-3 capitalize text-zinc-500">{item.type}</td>
                    <td className="py-2 px-3 text-center text-zinc-500">{item.count}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-zinc-900">
                      {formatINR(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Export / Backup & Restore Section */}
      <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-zinc-900">
          Data Export & Full JSON Backup
        </h3>
        <p className="text-xs text-zinc-500">
          Download your complete records for offline storage, spreadsheets, or migrations.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {/* CSV Export */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-xs font-semibold text-zinc-800 transition shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Transactions (CSV)</span>
          </button>

          {/* JSON Export */}
          <button
            onClick={handleDownloadJSON}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-xs font-semibold text-zinc-800 transition shadow-xs"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            <span>Download Full Backup (JSON)</span>
          </button>

          {/* Restore JSON */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-xs font-semibold text-zinc-800 transition shadow-xs"
          >
            <Upload className="w-4 h-4 text-amber-600" />
            <span>Restore from JSON</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};
