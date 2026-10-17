import React, { useMemo } from 'react';
import {
  CalendarDays,
  Download,
  Printer,
  TrendingUp,
  TrendingDown,
  Coins,
  Shield,
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
  CartesianGrid,
} from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import { formatINR, formatCompactINR } from '../../utils/formatters';

export const YearlyReportScreen: React.FC = () => {
  const { history, transactions, exportCSV, exportJSON } = useFinance();

  // Combine Jan-Sep 2026 with October 2026
  // Jan-Mar 2026 combined history
  const janMar = history.jan_to_mar_2026 || {
    income: 373940,
    spending: 474588,
    invested: 23200,
    outflow: 497788,
    spendingByCategory: {},
  };

  // 2026 Transactions
  const tx2026 = useMemo(() => transactions.filter(t => t.date.startsWith('2026')), [transactions]);

  // April to September real transactions
  const aprSepTxs = useMemo(
    () => tx2026.filter(t => t.date >= '2026-04-01' && t.date <= '2026-09-30'),
    [tx2026]
  );
  const aprSepIncome = useMemo(
    () => aprSepTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [aprSepTxs]
  );
  const aprSepSpending = useMemo(
    () => aprSepTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [aprSepTxs]
  );
  const aprSepInvested = useMemo(
    () => aprSepTxs.filter(t => t.type === 'invest').reduce((s, t) => s + t.amount, 0),
    [aprSepTxs]
  );
  const aprSepOutflow = aprSepSpending + aprSepInvested;

  // Jan–Sep Combined: Income ₹7,79,739 · Outflow ₹10,53,622 · Invested ₹90,132
  const janSepIncome = janMar.income + aprSepIncome;
  const janSepSpending = janMar.spending + aprSepSpending;
  const janSepInvested = janMar.invested + aprSepInvested;
  const janSepOutflow = janMar.outflow + aprSepOutflow;

  // October transactions
  const octTxs = useMemo(() => tx2026.filter(t => t.date.startsWith('2026-10')), [tx2026]);
  const octIncome = useMemo(
    () => octTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [octTxs]
  );
  const octSpending = useMemo(
    () => octTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [octTxs]
  );
  const octInvested = useMemo(
    () => octTxs.filter(t => t.type === 'invest').reduce((s, t) => s + t.amount, 0),
    [octTxs]
  );
  const octOutflow = octSpending + octInvested;

  // Year to Date totals
  const totalYearIncome = janSepIncome + octIncome;
  const totalYearSpending = janSepSpending + octSpending;
  const totalYearInvested = janSepInvested + octInvested;
  const totalYearOutflow = janSepOutflow + octOutflow;

  // 10-month historical chart data (Jan-Mar combined average + Apr to Oct real monthly totals)
  const chartData = useMemo(() => {
    const list = [];
    const q1AvgInc = Math.round(janMar.income / 3);
    const q1AvgSp = Math.round(janMar.spending / 3);
    const q1AvgInv = Math.round(janMar.invested / 3);

    // Jan, Feb, Mar (Combined Q1)
    list.push({ month: 'Jan', Income: q1AvgInc, Spending: q1AvgSp, Invested: q1AvgInv, note: 'Jan–Mar (old app, combined)' });
    list.push({ month: 'Feb', Income: q1AvgInc, Spending: q1AvgSp, Invested: q1AvgInv, note: 'Jan–Mar (old app, combined)' });
    list.push({ month: 'Mar', Income: q1AvgInc, Spending: q1AvgSp, Invested: q1AvgInv, note: 'Jan–Mar (old app, combined)' });

    // Apr to Oct (Real monthly data from transactions)
    const months = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
    const monthLabels = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];

    months.forEach((mKey, idx) => {
      const mTxs = tx2026.filter(t => t.date.startsWith(mKey));
      const mInc = mTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const mSp = mTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const mInv = mTxs.filter(t => t.type === 'invest').reduce((s, t) => s + t.amount, 0);

      list.push({
        month: monthLabels[idx],
        Income: mInc,
        Spending: mSp,
        Invested: mInv,
      });
    });

    return list;
  }, [janMar, tx2026]);

  // Combined top spending categories across Jan-Mar history + April–October transactions
  const topCategories = useMemo(() => {
    const map: Record<string, number> = { ...janMar.spendingByCategory };
    for (const t of tx2026) {
      if (t.type === 'expense' && t.category) {
        map[t.category] = (map[t.category] || 0) + t.amount;
      }
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }, [janMar, tx2026]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3.5 sm:px-6 py-6 pb-24 md:pb-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <CalendarDays className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">
              Annual Financial Report (2026)
            </h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Complete FY2026 Year-to-Date executive statement combining Jan–Sep FinWise archive and October live ledger
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-700 hover:bg-zinc-50 shadow-2xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Annual Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Year Income</span>
          <div className="text-xl font-bold font-mono text-emerald-600 mt-1">
            {formatINR(totalYearIncome)}
          </div>
          <span className="text-[10px] text-zinc-400">Jan–Oct 2026</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Year Spending</span>
          <div className="text-xl font-bold font-mono text-rose-600 mt-1">
            {formatINR(totalYearSpending)}
          </div>
          <span className="text-[10px] text-zinc-400">Essential & discretionary</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Year Invested</span>
          <div className="text-xl font-bold font-mono text-blue-600 mt-1">
            {formatINR(totalYearInvested)}
          </div>
          <span className="text-[10px] text-zinc-400">Wealth accumulation</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Outflow</span>
          <div className="text-xl font-bold font-mono text-zinc-900 mt-1">
            {formatINR(totalYearOutflow)}
          </div>
          <span className="text-[10px] text-zinc-400">Spending + Invested</span>
        </div>
      </div>

      {/* Monthly Outflow Trajectory Chart */}
      <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
            2026 Monthly Cashflow Trajectory (Income vs Spending vs Invested)
          </h3>
          <span className="text-xs text-zinc-400">10 Months Recorded</span>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
              <XAxis dataKey="month" stroke="#a1a1aa" fontSize={11} tickLine={false} />
              <YAxis stroke="#a1a1aa" fontSize={11} tickFormatter={val => formatCompactINR(val)} tickLine={false} />
              <Tooltip
                formatter={(val: any) => [formatINR(Number(val)), '']}
                contentStyle={{
                  backgroundColor: '#18181b',
                  borderRadius: '12px',
                  border: 'none',
                  color: '#fff',
                  fontSize: '11px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Spending" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Invested" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 10 Spending Categories Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
            Top 10 Spending Categories of 2026
          </h3>
          <span className="text-xs text-zinc-400">Ranked by Annual Total</span>
        </div>

        <div className="divide-y divide-zinc-100">
          {topCategories.map(([cat, amt], idx) => {
            const pct = totalYearSpending > 0 ? (amt / totalYearSpending) * 100 : 0;
            return (
              <div key={`${cat}-${idx}`} className="p-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-zinc-900">{cat}</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-24 sm:w-36 hidden sm:block">
                    <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-zinc-900 block">
                      {formatINR(amt)}
                    </span>
                    <span className="text-[10px] text-zinc-400">{pct.toFixed(1)}% of spending</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
