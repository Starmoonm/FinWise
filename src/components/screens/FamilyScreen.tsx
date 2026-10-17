import React, { useState, useMemo } from 'react';
import {
  Users,
  Heart,
  PieChart as PieIcon,
  BarChart3,
  Sparkles,
  Check,
  ChevronRight,
  TrendingUp,
  Sliders,
  AlertCircle,
  Tag,
  Plus,
  RefreshCw,
  Edit2,
  Table as TableIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import { FamilyMember, Transaction } from '../../types';
import { formatINR, formatCompactINR } from '../../utils/formatters';
import { SEED_DATA } from '../../utils/seedData';

export const FamilyScreen: React.FC = () => {
  const {
    activeMonthKey,
    transactions,
    settings,
    members,
    applyBatchMemberAssignment,
    updateMemberBudget,
    showToast,
  } = useFinance();

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingBudgetMember, setEditingBudgetMember] = useState<string | null>(null);
  const [budgetLimitInput, setBudgetLimitInput] = useState<string>('');

  // Default member mapping per Message 2
  const defaultMemberMapping = useMemo(() => {
    return settings.categoryDefaultMember || SEED_DATA.categoryDefaultMember;
  }, [settings.categoryDefaultMember]);

  // Current month transactions
  const monthTransactions = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(activeMonthKey));
  }, [transactions, activeMonthKey]);

  // Year transactions for "Family support total"
  const yearTransactions = useMemo(() => {
    const yr = activeMonthKey.slice(0, 4);
    return transactions.filter(t => t.date.startsWith(yr));
  }, [transactions, activeMonthKey]);

  // Stable Member Colors Map
  const memberColors: Record<string, string> = {
    Self: '#10b981', // emerald
    MOM: '#f59e0b', // amber
    Ankita: '#8b5cf6', // purple
    Sis: '#ec4899', // pink
  };

  // Helper to resolve effective member for an entry
  const getEntryMember = (t: Transaction): string => {
    if (t.memberId) return t.memberId;
    if (defaultMemberMapping[t.category]) return defaultMemberMapping[t.category];
    return 'Self';
  };

  // Per-member stats for active month
  const memberStats = useMemo(() => {
    const list = members.map(m => {
      const memberTx = monthTransactions.filter(
        t => t.type === 'expense' && getEntryMember(t) === m.name
      );
      const spent = memberTx.reduce((sum, t) => sum + t.amount, 0);

      // Categories breakdown
      const byCat: Record<string, number> = {};
      memberTx.forEach(t => {
        byCat[t.category] = (byCat[t.category] || 0) + t.amount;
      });

      const categoriesBreakdown = Object.entries(byCat)
        .map(([cat, amt]) => ({ category: cat, amount: amt }))
        .sort((a, b) => b.amount - a.amount);

      // Monthly budget if configured
      const budgetLimit = settings.memberBudgets?.[m.name] || 0;
      const budgetPercent = budgetLimit > 0 ? Math.min(100, Math.round((spent / budgetLimit) * 100)) : 0;

      return {
        member: m,
        spent,
        count: memberTx.length,
        categories: categoriesBreakdown,
        budgetLimit,
        budgetPercent,
        color: memberColors[m.name] || m.color || '#10b981',
      };
    });

    return list;
  }, [members, monthTransactions, defaultMemberMapping, settings.memberBudgets]);

  const totalFamilySpentThisMonth = useMemo(() => {
    return memberStats.reduce((acc, m) => acc + m.spent, 0);
  }, [memberStats]);

  // Family Support Total for the year (MOM + Ankita + Sis)
  const familySupportYearTotal = useMemo(() => {
    return yearTransactions
      .filter(t => {
        if (t.type !== 'expense') return false;
        const mem = getEntryMember(t);
        return mem === 'MOM' || mem === 'Ankita' || mem === 'Sis';
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [yearTransactions, defaultMemberMapping]);

  // Monthly Spending Per Member (Past 6 Months Bar Chart)
  const past6Months = useMemo(() => {
    const [y, m] = activeMonthKey.split('-').map(Number);
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(y, m - 1 - i, 1));
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      months.push(`${d.getUTCFullYear()}-${mm}`);
    }
    return months;
  }, [activeMonthKey]);

  const barChartData = useMemo(() => {
    return past6Months.map(mKey => {
      const txs = transactions.filter(t => t.type === 'expense' && t.date.startsWith(mKey));
      const row: any = { month: mKey };

      members.forEach(mem => {
        const spent = txs
          .filter(t => getEntryMember(t) === mem.name)
          .reduce((sum, t) => sum + t.amount, 0);
        row[mem.name] = spent;
      });

      return row;
    });
  }, [past6Months, transactions, members, defaultMemberMapping]);

  // Donut chart data for member share of total spending
  const donutData = useMemo(() => {
    return memberStats
      .filter(m => m.spent > 0)
      .map(m => ({
        name: m.member.name,
        value: m.spent,
        percent: totalFamilySpentThisMonth > 0 ? Math.round((m.spent / totalFamilySpentThisMonth) * 100) : 0,
        color: m.color,
      }));
  }, [memberStats, totalFamilySpentThisMonth]);

  // Preview data for Bulk Assignment Tool
  const batchPreviewData = useMemo(() => {
    const unassigned = transactions.filter(t => {
      const defaultM = defaultMemberMapping[t.category];
      return defaultM && t.memberId !== defaultM;
    });

    const categoryBreakdown: Record<string, { count: number; targetMember: string; totalAmount: number }> = {};
    unassigned.forEach(t => {
      const target = defaultMemberMapping[t.category];
      if (!categoryBreakdown[t.category]) {
        categoryBreakdown[t.category] = { count: 0, targetMember: target, totalAmount: 0 };
      }
      categoryBreakdown[t.category].count += 1;
      categoryBreakdown[t.category].totalAmount += t.amount;
    });

    return {
      unassignedCount: unassigned.length,
      categoryBreakdown: Object.entries(categoryBreakdown).map(([cat, info]) => ({
        category: cat,
        ...info,
      })),
    };
  }, [transactions, defaultMemberMapping]);

  const handleApplyBatch = async () => {
    const count = await applyBatchMemberAssignment();
    setShowBatchModal(false);
  };

  const handleSaveBudget = (memberName: string) => {
    const val = parseFloat(budgetLimitInput);
    if (isNaN(val) || val < 0) return;
    updateMemberBudget(memberName, val);
    setEditingBudgetMember(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3.5 sm:px-6 py-4 pb-24 md:pb-8">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            <span>Family Finance</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
              {members.length} members
            </span>
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Member-wise spending, category breakdown, family support totals, and category default assignments
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Bulk Tool Button with preview indicator */}
          <button
            onClick={() => setShowBatchModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-semibold text-xs transition"
          >
            <RefreshCw className="w-4 h-4 text-emerald-600" />
            <span>
              Assign Members to Old Entries ({batchPreviewData.unassignedCount} pending)
            </span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Family Support Year Total */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/10 to-pink-500/10 border border-rose-300 shadow-xs">
          <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
            <span>Family Support (Year)</span>
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-rose-700 font-mono">
              {formatINR(familySupportYearTotal)}
            </span>
          </div>
          <span className="text-[11px] text-rose-600/90 mt-1 block">
            MOM + Ankita + Sis allowances & health
          </span>
        </div>

        {/* 2. Total Family Spending This Month */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            This Month Total
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-zinc-900 font-mono">
              {formatINR(totalFamilySpentThisMonth)}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            Across {memberStats.reduce((acc, m) => acc + m.count, 0)} member entries
          </span>
        </div>

        {/* 3. Top Spending Member */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Top Spender ({activeMonthKey})
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-zinc-900 font-mono">
              {memberStats.slice().sort((a, b) => b.spent - a.spent)[0]?.member.name || 'Self'}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            {formatINR(memberStats.slice().sort((a, b) => b.spent - a.spent)[0]?.spent || 0)} this month
          </span>
        </div>

        {/* 4. Category Defaults Mapping */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Auto-Category Rules
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-emerald-600 font-mono">
              {Object.keys(defaultMemberMapping).length} rules active
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            MOM, Ankita, Sis, Sis Med, My Med
          </span>
        </div>
      </div>

      {/* Main Charts: Member Spending Trend (Bars) + Share of Spending (Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Spending per member per month (Grouped Bar Chart) */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <span>Monthly Spending per Member</span>
              </h3>
              <p className="text-xs text-zinc-500">
                Last 6 months comparison with stable member colors
              </p>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.5} />
                <XAxis dataKey="month" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis
                  tickFormatter={v => formatCompactINR(v)}
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val: any, name: any) => [formatINR(Number(val) || 0), String(name)]}
                  contentStyle={{
                    backgroundColor: 'rgba(24, 24, 27, 0.95)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend />
                {members.map(m => (
                  <Bar
                    key={m.id}
                    dataKey={m.name}
                    fill={memberColors[m.name] || m.color || '#10b981'}
                    maxBarSize={24}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Member Share of Total Spending (Donut Chart) */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-600" />
              <span>Share of Spending</span>
            </h3>
            <p className="text-xs text-zinc-500">Percentage distribution for {activeMonthKey}</p>
          </div>

          <div className="h-44 sm:h-48 w-full flex items-center justify-center">
            {donutData.length === 0 ? (
              <span className="text-xs text-zinc-400">No member expenses recorded yet.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      `${formatINR(Number(val) || 0)} (${
                        totalFamilySpentThisMonth > 0
                          ? Math.round((Number(val) / totalFamilySpentThisMonth) * 100)
                          : 0
                      }%)`,
                      String(name),
                    ]}
                    contentStyle={{
                      backgroundColor: 'rgba(24, 24, 27, 0.95)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-zinc-100">
            {donutData.map((d, idx) => (
              <div key={`${d.name}-${idx}`} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="font-semibold text-zinc-800">{d.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-zinc-500">{formatINR(d.value)}</span>
                  <span className="font-bold text-zinc-900">{d.percent}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Member Cards: Per-Member Category Breakdown & Optional Monthly Budget */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-zinc-900">
          Member Deep-Dive ({activeMonthKey})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memberStats.map(stat => (
            <div
              key={stat.member.id}
              className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-4"
            >
              {/* Member Title + Spent + Optional Budget */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-xs"
                    style={{ backgroundColor: stat.color }}
                  >
                    {stat.member.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-zinc-900">
                        {stat.member.name}
                      </h3>
                      {stat.member.relation && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-100 text-zinc-600 font-semibold">
                          {stat.member.relation}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500">
                      {stat.count} entries recorded this month
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-lg font-black font-mono text-zinc-900 block">
                    {formatINR(stat.spent)}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {totalFamilySpentThisMonth > 0
                      ? `${Math.round((stat.spent / totalFamilySpentThisMonth) * 100)}% of total`
                      : '0%'}
                  </span>
                </div>
              </div>

              {/* Optional Monthly Budget Progress */}
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-medium flex items-center gap-1">
                    <span>Monthly Budget</span>
                    <button
                      onClick={() => {
                        setEditingBudgetMember(stat.member.name);
                        setBudgetLimitInput(String(stat.budgetLimit || ''));
                      }}
                      className="p-1 text-zinc-400 hover:text-zinc-700 rounded"
                      title="Set / update member budget"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </span>
                  <span className="font-mono font-bold text-zinc-800">
                    {stat.budgetLimit > 0
                      ? `${formatINR(stat.spent)} / ${formatINR(stat.budgetLimit)} (${stat.budgetPercent}%)`
                      : 'Not configured'}
                  </span>
                </div>

                {stat.budgetLimit > 0 && (
                  <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        stat.spent > stat.budgetLimit
                          ? 'bg-rose-500'
                          : stat.spent >= stat.budgetLimit * 0.8
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, (stat.spent / stat.budgetLimit) * 100)}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Inline Budget Editor */}
              {editingBudgetMember === stat.member.name && (
                <div className="p-3 rounded-xl bg-white border border-emerald-300 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="text-xs text-zinc-500">₹ Limit:</span>
                    <input
                      type="number"
                      placeholder="e.g. 15000"
                      value={budgetLimitInput}
                      onChange={e => setBudgetLimitInput(e.target.value)}
                      className="w-full px-2 py-1 text-xs font-mono font-bold rounded-lg border border-zinc-300 bg-zinc-50"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSaveBudget(stat.member.name)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingBudgetMember(null)}
                      className="px-2.5 py-1 rounded-lg border border-zinc-300 text-zinc-600 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Per-Member Category Breakdown */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
                  Category Breakdown ({stat.categories.length})
                </span>

                {stat.categories.length === 0 ? (
                  <p className="text-zinc-400 text-xs italic">No expenses recorded for this member this month.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {stat.categories.map((c, idx) => {
                      const pct = stat.spent > 0 ? Math.round((c.amount / stat.spent) * 100) : 0;
                      return (
                        <div
                          key={`${c.category}-${idx}`}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-zinc-50"
                        >
                          <div className="flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="font-medium text-zinc-800">{c.category}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-zinc-500">{formatINR(c.amount)}</span>
                            <span className="text-[11px] font-bold text-zinc-400">({pct}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Default Member Mapping Rules */}
      <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
          <Tag className="w-4 h-4 text-emerald-600" />
          <span>Category Default Member Rules (Message 2 Specification)</span>
        </h3>
        <p className="text-xs text-zinc-500">
          Any entry created with these categories automatically inherits its default member:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 text-xs">
          {Object.entries(defaultMemberMapping).map(([cat, mem], idx) => (
            <div
              key={`${cat}-${idx}`}
              className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80"
            >
              <span className="font-bold text-zinc-900 block truncate">{cat}</span>
              <span
                className="text-[11px] font-bold mt-1 inline-block px-1.5 py-0.5 rounded text-white"
                style={{ backgroundColor: memberColors[mem] || '#10b981' }}
              >
                → {mem}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bulk Tool Modal: "Assign members to old entries using category defaults" */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-600/30 backdrop-blur-xs">
          <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-white border border-zinc-200 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-600" />
                  <span>Assign Members to Old Entries</span>
                </h3>
                <p className="text-xs text-zinc-500">
                  Bulk tool with live preview before applying
                </p>
              </div>

              <button
                onClick={() => setShowBatchModal(false)}
                className="text-zinc-400 hover:text-zinc-700 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 text-xs pr-1">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                Found <strong>{batchPreviewData.unassignedCount} entries</strong> that will be updated to their specified category default member.
              </div>

              {batchPreviewData.unassignedCount === 0 ? (
                <div className="py-6 text-center text-zinc-500">
                  All past entries already match their default members. No action required!
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="font-bold text-zinc-700 block uppercase tracking-wider text-[10px]">
                    Preview by Category:
                  </span>
                  <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden">
                    {batchPreviewData.categoryBreakdown.map((item, idx) => (
                      <div key={`${item.category}-${idx}`} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-zinc-900">{item.category}</span>
                          <span className="text-[11px] text-zinc-500 block">
                            Assigns to: <strong>{item.targetMember}</strong>
                          </span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="font-bold text-zinc-900 block">
                            {item.count} entries
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            ({formatINR(item.totalAmount)})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-zinc-200 pt-3 flex items-center justify-between">
              <button
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 rounded-xl border border-zinc-300 text-xs font-semibold hover:bg-zinc-100 transition"
              >
                Cancel
              </button>

              <button
                onClick={handleApplyBatch}
                disabled={batchPreviewData.unassignedCount === 0}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Apply to All {batchPreviewData.unassignedCount} Entries</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
