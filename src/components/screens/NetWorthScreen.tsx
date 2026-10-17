import React, { useState, useMemo, useEffect } from 'react';
import {
  LineChart as LineChartIcon,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Camera,
  Layers,
  Sparkles,
  Calendar,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Percent,
  Wallet,
  Target,
  Coins,
  Database,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import { netWorthBreakdown, NetWorthBreakdown } from '../../lib/finance';
import { formatINR, formatCompactINR } from '../../utils/formatters';
import { projectNetWorthPositive } from '../../utils/calculations';
import { NetWorthSnapshot } from '../../types';

export const NetWorthScreen: React.FC = () => {
  const {
    accounts,
    goals,
    investments,
    assets,
    loans,
    cards,
    transactions,
    todayDateStr,
    setActiveScreen,
    showToast,
  } = useFinance();

  // Current Net Worth breakdown
  const nw: NetWorthBreakdown = useMemo(() => {
    return netWorthBreakdown({
      goals,
      investments,
      loans,
      cards,
      assets,
      accounts,
      transactions,
    });
  }, [goals, investments, loans, cards, assets, accounts, transactions]);

  // Snapshots stored in local storage
  const [snapshots, setSnapshots] = useState<NetWorthSnapshot[]>(() => {
    const saved = localStorage.getItem('mk_local_nw_snapshots');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }

    // Default seeded monthly snapshots for past 6 months leading to current:
    return [
      { id: 'snap_2026_05', date: '2026-05-01', assets: 145000, liabilities: 412000, netWorth: -267000 },
      { id: 'snap_2026_06', date: '2026-06-01', assets: 152000, liabilities: 405000, netWorth: -253000 },
      { id: 'snap_2026_07', date: '2026-07-01', assets: 159000, liabilities: 395000, netWorth: -236000 },
      { id: 'snap_2026_08', date: '2026-08-01', assets: 168000, liabilities: 388000, netWorth: -220000 },
      { id: 'snap_2026_09', date: '2026-09-01', assets: 178000, liabilities: 380000, netWorth: -202000 },
      { id: 'snap_2026_10', date: '2026-10-01', assets: nw.totalAssets, liabilities: nw.totalLiabilities, netWorth: nw.netWorth },
    ];
  });

  // Automatically take snapshot on the 1st of month if not present
  useEffect(() => {
    const firstOfMonth = `${todayDateStr.slice(0, 7)}-01`;
    const exists = snapshots.some(s => s.date === firstOfMonth);
    if (!exists) {
      const autoSnap: NetWorthSnapshot = {
        id: `snap_${Date.now()}`,
        date: firstOfMonth,
        assets: nw.totalAssets,
        liabilities: nw.totalLiabilities,
        netWorth: nw.netWorth,
      };
      const updated = [...snapshots, autoSnap].sort((a, b) => a.date.localeCompare(b.date));
      setSnapshots(updated);
      localStorage.setItem('mk_local_nw_snapshots', JSON.stringify(updated));
    }
  }, [todayDateStr, nw.totalAssets, nw.totalLiabilities, nw.netWorth]);

  // Save manual snapshot
  const handleSaveSnapshot = () => {
    const newSnap: NetWorthSnapshot = {
      id: `snap_${Date.now()}`,
      date: todayDateStr,
      assets: nw.totalAssets,
      liabilities: nw.totalLiabilities,
      netWorth: nw.netWorth,
    };
    const filtered = snapshots.filter(s => s.date !== todayDateStr);
    const updated = [...filtered, newSnap].sort((a, b) => a.date.localeCompare(b.date));
    setSnapshots(updated);
    localStorage.setItem('mk_local_nw_snapshots', JSON.stringify(updated));
    showToast(`Saved Net Worth snapshot for ${todayDateStr}`);
  };

  // Trend Chart Data (from snapshots + live today)
  const chartData = useMemo(() => {
    return snapshots.map(s => {
      const d = new Date(s.date);
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const debtToAsset = s.assets > 0 ? (s.liabilities / s.assets) * 100 : 0;
      return {
        month: label,
        date: s.date,
        netWorth: s.netWorth,
        assets: s.assets,
        liabilities: s.liabilities,
        debtToAsset: Math.round(debtToAsset * 10) / 10,
      };
    });
  }, [snapshots]);

  // Projection: Month when net worth turns positive at the last 6 months' average change
  const projection = useMemo(() => {
    if (snapshots.length < 2) return null;
    const firstSnap = snapshots[0];
    const lastSnap = snapshots[snapshots.length - 1];
    const monthsElapsed = Math.max(1, snapshots.length - 1);
    const delta = lastSnap.netWorth - firstSnap.netWorth;
    const avgMonthlyChange = delta / monthsElapsed; // typically +₹10,000 to +₹15,000 / mo

    return {
      avgMonthlyChange,
      ...projectNetWorthPositive(nw.netWorth, avgMonthlyChange, todayDateStr),
    };
  }, [snapshots, nw.netWorth, todayDateStr]);

  // Debt to Asset ratio
  const debtToAssetRatio = nw.totalAssets > 0 ? (nw.totalLiabilities / nw.totalAssets) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2.5">
            <LineChartIcon className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            Net Worth Statement
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Total Assets − Total Liabilities = True Financial Net Worth
          </p>
        </div>

        <button
          onClick={handleSaveSnapshot}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <Camera className="w-4 h-4" />
          Save Snapshot
        </button>
      </div>

      {/* Hero Net Worth Card */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 text-white p-6 sm:p-7 rounded-3xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
              Live Total Net Worth ({todayDateStr})
            </span>
            <div className="flex items-baseline gap-3 mt-1">
              <h2 className={`text-3xl sm:text-4xl font-extrabold tracking-tight font-mono ${
                nw.netWorth >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {formatINR(nw.netWorth)}
              </h2>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                nw.netWorth >= 0 ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
              }`}>
                {nw.netWorth >= 0 ? 'Positive Wealth' : 'In Net Liability Phase'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 sm:text-right">
            <div>
              <span className="text-[11px] text-zinc-400 block">Total Assets</span>
              <span className="text-lg font-bold text-emerald-400 font-mono">
                +{formatINR(nw.totalAssets)}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 block">Total Liabilities</span>
              <span className="text-lg font-bold text-rose-400 font-mono">
                −{formatINR(nw.totalLiabilities)}
              </span>
            </div>
          </div>
        </div>

        {/* Projection Crossover Banner */}
        {projection && projection.monthsToPositive && projection.monthsToPositive > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                <strong>Projected Crossover:</strong> Net worth turns positive in <strong>{projection.projectedMonth}</strong> (~{projection.monthsToPositive} months) at current average progress of <strong>+{formatINR(Math.round(projection.avgMonthlyChange))}/month</strong>.
              </span>
            </div>
            <div className="w-full sm:w-48 bg-zinc-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full"
                style={{ width: `${Math.min(100, Math.max(10, 100 - (projection.monthsToPositive * 4)))}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Net Worth Statement Grid — Every line clickable */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Assets Column */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Assets (What You Own)
            </h3>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm font-mono">
              {formatINR(nw.totalAssets)}
            </span>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs">
            {/* 1. Account Balances */}
            <div
              onClick={() => setActiveScreen('accounts')}
              className="py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 -mx-2 px-2 rounded-lg cursor-pointer group transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Wallet className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-emerald-600 flex items-center gap-1">
                    Account Balances
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                  <span className="text-[11px] text-zinc-400">Bank accounts, cash in hand, UPI wallets</span>
                </div>
              </div>
              <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-sm">
                {formatINR(nw.accountBalances)}
              </span>
            </div>

            {/* 2. Goal Savings */}
            <div
              onClick={() => setActiveScreen('futureTarget')}
              className="py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 -mx-2 px-2 rounded-lg cursor-pointer group transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Target className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-emerald-600 flex items-center gap-1">
                    Goal Savings
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                  <span className="text-[11px] text-zinc-400">Emergency fund and active targets</span>
                </div>
              </div>
              <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-sm">
                {formatINR(nw.goalSavings)}
              </span>
            </div>

            {/* 3. Investments */}
            <div
              onClick={() => setActiveScreen('wealth')}
              className="py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 -mx-2 px-2 rounded-lg cursor-pointer group transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Coins className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-emerald-600 flex items-center gap-1">
                    Investments Current Value
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                  <span className="text-[11px] text-zinc-400">SIP, FD, LIC, Stocks, PPF</span>
                </div>
              </div>
              <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-sm">
                {formatINR(nw.investmentsValue)}
              </span>
            </div>

            {/* 4. Other Assets */}
            <div
              onClick={() => setActiveScreen('assets')}
              className="py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 -mx-2 px-2 rounded-lg cursor-pointer group transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-emerald-600 flex items-center gap-1">
                    Physical & Fixed Assets
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                  <span className="text-[11px] text-zinc-400">Gold jewellery, vehicle, real estate, cash</span>
                </div>
              </div>
              <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-sm">
                {formatINR(nw.otherAssets)}
              </span>
            </div>

            {/* 5. Money Lent */}
            <div
              onClick={() => setActiveScreen('loans')}
              className="py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 -mx-2 px-2 rounded-lg cursor-pointer group transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-emerald-600 flex items-center gap-1">
                    Money Lent (Receivables)
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                  <span className="text-[11px] text-zinc-400">Owed to you by friends and relatives</span>
                </div>
              </div>
              <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-sm">
                {formatINR(nw.moneyLent)}
              </span>
            </div>
          </div>
        </div>

        {/* Liabilities Column */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Liabilities (What You Owe)
            </h3>
            <span className="font-bold text-rose-600 dark:text-rose-400 text-sm font-mono">
              −{formatINR(nw.totalLiabilities)}
            </span>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs">
            {/* 1. Borrowed Loans */}
            <div
              onClick={() => setActiveScreen('loans')}
              className="py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 -mx-2 px-2 rounded-lg cursor-pointer group transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <div>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-rose-600 flex items-center gap-1">
                    Borrowed Loans (Outstanding)
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                  <span className="text-[11px] text-zinc-400">ALL Bank loan & personal liabilities</span>
                </div>
              </div>
              <span className="font-bold text-rose-600 font-mono text-sm">
                {formatINR(nw.borrowedLoans)}
              </span>
            </div>

            {/* 2. Credit Card Outstanding */}
            <div
              onClick={() => setActiveScreen('cards')}
              className="py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 -mx-2 px-2 rounded-lg cursor-pointer group transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-rose-600" />
                <div>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-rose-600 flex items-center gap-1">
                    Credit Card Outstanding
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                  <span className="text-[11px] text-zinc-400">Current card debt & unbilled spends</span>
                </div>
              </div>
              <span className="font-bold text-rose-600 font-mono text-sm">
                {formatINR(nw.cardOutstanding)}
              </span>
            </div>

            {/* Ratio Summary */}
            <div className="py-4 mt-4 bg-zinc-50 dark:bg-zinc-950/60 -mx-2 px-4 rounded-xl border border-zinc-100 dark:border-zinc-800/80 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Debt-to-Asset Ratio:</span>
                <span className={`font-mono font-bold text-sm ${debtToAssetRatio > 100 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {debtToAssetRatio.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${debtToAssetRatio > 100 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, debtToAssetRatio)}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-400 block">
                {debtToAssetRatio > 100
                  ? 'Liabilities exceed assets — paying down borrowed debt will accelerate wealth creation.'
                  : 'Healthy asset coverage over outstanding debt.'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Net Worth Trend (Line) */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Net Worth Trend Over Time
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${formatCompactINR(v)}`} />
                <Tooltip formatter={(val: any) => [formatINR(Number(val) || 0), 'Net Worth']} />
                <Line type="monotone" dataKey="netWorth" stroke="#059669" strokeWidth={2.5} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Assets vs Liabilities per month (Bars) */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-600" />
            Assets vs Liabilities per Month
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${formatCompactINR(v)}`} />
                <Tooltip formatter={(val: any) => [formatINR(Number(val) || 0)]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="assets" name="Assets" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="liabilities" name="Liabilities" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Snapshots History Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-600" />
            Monthly Snapshot Log
          </h3>
          <span className="text-xs text-zinc-400">Auto-captured on the 1st of every month</span>
        </div>

        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-800/80 text-zinc-500 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-right">Assets</th>
                <th className="py-2.5 px-3 text-right">Liabilities</th>
                <th className="py-2.5 px-3 text-right">Net Worth</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {snapshots.slice().reverse().map(snap => (
                <tr key={snap.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="py-2.5 px-3 font-mono text-zinc-600 dark:text-zinc-400">{snap.date}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-600">
                    {formatINR(snap.assets)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-rose-600">
                    {formatINR(snap.liabilities)}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                    snap.netWorth >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {formatINR(snap.netWorth)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      snap.netWorth >= 0
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}>
                      {snap.netWorth >= 0 ? 'Positive' : 'Liability'}
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
