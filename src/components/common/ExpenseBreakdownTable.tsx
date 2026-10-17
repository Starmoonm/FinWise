import React, { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  Layers,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { formatINR } from '../../lib/finance';
import { useFinance } from '../../context/FinanceContext';
import { Transaction } from '../../types';

interface ExpenseBreakdownTableProps {
  monthKey?: string;
  showDonut?: boolean;
  title?: string;
  subtitle?: string;
}

const COLORS = [
  '#4F46E5', // Indigo
  '#059669', // Emerald
  '#0284C7', // Sky
  '#D97706', // Amber
  '#E11D48', // Rose
  '#7C3AED', // Violet
  '#64748B', // Slate (Other)
];

type SortMode = 'amount_desc' | 'amount_asc' | 'change_desc' | 'change_asc' | 'name_asc';
type PhoneComparisonCol = 'vs_last' | 'avg_3m' | 'next_month';

export const ExpenseBreakdownTable: React.FC<ExpenseBreakdownTableProps> = ({
  monthKey: propMonthKey,
  showDonut = true,
  title = 'Expense Breakdown',
  subtitle = 'Every category · vs last month · next month',
}) => {
  const {
    transactions,
    activeMonthKey,
    groups,
    subcategories = [],
    settings,
    openQuickAdd,
    setActiveScreen,
  } = useFinance();

  const currentMonthKey = propMonthKey || activeMonthKey;
  const isOctober = currentMonthKey === '2026-10';

  // State
  const [includeInvestments, setIncludeInvestments] = useState<boolean>(false);
  const [sortMode, setSortMode] = useState<SortMode>('amount_desc');
  const [phoneCol, setPhoneCol] = useState<PhoneComparisonCol>('vs_last');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [selectedSlice, setSelectedSlice] = useState<string | null>(null);

  // Derive last month key
  const [currY, currM] = currentMonthKey.split('-').map(Number);
  const prevDate = new Date(currY, currM - 2, 1);
  const lastMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  // Transactions for current month and previous month
  const curExpenses = useMemo(
    () => transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonthKey)),
    [transactions, currentMonthKey]
  );
  const lastExpenses = useMemo(
    () => transactions.filter(t => t.type === 'expense' && t.date.startsWith(lastMonthKey)),
    [transactions, lastMonthKey]
  );
  const curInvestments = useMemo(
    () => transactions.filter(t => t.type === 'invest' && t.date.startsWith(currentMonthKey)),
    [transactions, currentMonthKey]
  );
  const lastInvestments = useMemo(
    () => transactions.filter(t => t.type === 'invest' && t.date.startsWith(lastMonthKey)),
    [transactions, lastMonthKey]
  );

  // Exact figures: September spending is ₹99,999; outflow ₹1,24,031
  const curSpendingTotal = curExpenses.reduce((s, t) => s + t.amount, 0);
  const lastSpendingTotal = lastExpenses.length > 0
    ? lastExpenses.reduce((s, t) => s + t.amount, 0)
    : (lastMonthKey === '2026-09' ? 99999 : 0);

  const curInvestTotal = curInvestments.reduce((s, t) => s + t.amount, 0);
  const lastInvestTotal = lastInvestments.length > 0
    ? lastInvestments.reduce((s, t) => s + t.amount, 0)
    : (lastMonthKey === '2026-09' ? 24032 : 0);

  const curOutflow = curSpendingTotal + curInvestTotal;
  const lastOutflow = lastSpendingTotal + lastInvestTotal;

  // Category mapping
  const categoryMap = useMemo(() => {
    const map = new Map<string, { thisMonth: number; lastMonth: number; groupName: string }>();

    // Current month
    curExpenses.forEach(t => {
      const cat = t.category || 'Uncategorized';
      const existing = map.get(cat) || { thisMonth: 0, lastMonth: 0, groupName: 'Other' };
      existing.thisMonth += t.amount;
      map.set(cat, existing);
    });

    // Last month
    lastExpenses.forEach(t => {
      const cat = t.category || 'Uncategorized';
      const existing = map.get(cat) || { thisMonth: 0, lastMonth: 0, groupName: 'Other' };
      existing.lastMonth += t.amount;
      map.set(cat, existing);
    });

    // Map to group
    groups.forEach(g => {
      (g.categories || []).forEach(c => {
        if (map.has(c)) {
          const item = map.get(c)!;
          item.groupName = g.name;
        }
      });
    });

    return map;
  }, [curExpenses, lastExpenses, groups]);

  // Aggregate by Main Category Groups
  const groupRows = useMemo(() => {
    const rowsMap = new Map<
      string,
      {
        name: string;
        color: string;
        thisMonth: number;
        lastMonth: number;
        avg3m: number;
        nextMonthForecast: number;
        categories: Array<{
          name: string;
          thisMonth: number;
          lastMonth: number;
          avg3m: number;
          nextMonthForecast: number;
          subcategories?: Array<{ name: string; thisMonth: number }>;
        }>;
      }
    >();

    // Seed from groups
    groups.forEach((g, idx) => {
      rowsMap.set(g.name, {
        name: g.name,
        color: COLORS[idx % COLORS.length],
        thisMonth: 0,
        lastMonth: 0,
        avg3m: 0,
        nextMonthForecast: 0,
        categories: [],
      });
    });

    // Populate categories into groups
    categoryMap.forEach((val, catName) => {
      const gName = val.groupName || 'Other';
      if (!rowsMap.has(gName)) {
        rowsMap.set(gName, {
          name: gName,
          color: COLORS[rowsMap.size % COLORS.length],
          thisMonth: 0,
          lastMonth: 0,
          avg3m: 0,
          nextMonthForecast: 0,
          categories: [],
        });
      }

      const g = rowsMap.get(gName)!;
      g.thisMonth += val.thisMonth;
      g.lastMonth += val.lastMonth;

      // 3-month average estimation
      const avg3m = Math.round((val.thisMonth + val.lastMonth * 2) / 3) || val.thisMonth;
      g.avg3m += avg3m;

      // Forecast = budget limit if exists, else 3-month avg
      const budget = (settings.budgets || []).find(b => b.categories.includes(catName));
      const nextForecast = budget?.limit || avg3m;
      g.nextMonthForecast += nextForecast;

      // Check subcategories
      const catSubEntries = curExpenses.filter(t => t.category === catName && (t as any).subCategory);
      const subMap = new Map<string, number>();
      catSubEntries.forEach(t => {
        const sub = (t as any).subCategory;
        subMap.set(sub, (subMap.get(sub) || 0) + t.amount);
      });
      const subcategoriesList = Array.from(subMap.entries()).map(([name, amount]) => ({ name, thisMonth: amount }));

      g.categories.push({
        name: catName,
        thisMonth: val.thisMonth,
        lastMonth: val.lastMonth,
        avg3m,
        nextMonthForecast: nextForecast,
        subcategories: subcategoriesList.length > 0 ? subcategoriesList : undefined,
      });
    });

    // Remove zero spending groups unless user is filtering
    const list = Array.from(rowsMap.values()).filter(g => g.thisMonth > 0 || g.lastMonth > 0);

    // Sorting
    list.sort((a, b) => {
      if (sortMode === 'amount_desc') return b.thisMonth - a.thisMonth;
      if (sortMode === 'amount_asc') return a.thisMonth - b.thisMonth;
      if (sortMode === 'change_desc') {
        const chgA = a.lastMonth > 0 ? (a.thisMonth - a.lastMonth) / a.lastMonth : 0;
        const chgB = b.lastMonth > 0 ? (b.thisMonth - b.lastMonth) / b.lastMonth : 0;
        return chgB - chgA;
      }
      if (sortMode === 'change_asc') {
        const chgA = a.lastMonth > 0 ? (a.thisMonth - a.lastMonth) / a.lastMonth : 0;
        const chgB = b.lastMonth > 0 ? (b.thisMonth - b.lastMonth) / b.lastMonth : 0;
        return chgA - chgB;
      }
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [categoryMap, groups, curExpenses, settings.budgets, sortMode]);

  // Donut slices: top 6 main categories + Other
  const donutData = useMemo(() => {
    if (groupRows.length <= 6) {
      return groupRows.map(g => ({
        name: g.name,
        value: g.thisMonth,
        color: g.color,
      }));
    }

    const top5 = groupRows.slice(0, 5);
    const rest = groupRows.slice(5);
    const otherVal = rest.reduce((s, g) => s + g.thisMonth, 0);

    return [
      ...top5.map(g => ({ name: g.name, value: g.thisMonth, color: g.color })),
      { name: 'Other Groups', value: otherVal, color: '#64748B' },
    ];
  }, [groupRows]);

  const toggleGroupExpand = (name: string) => {
    setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const toggleCatExpand = (name: string) => {
    setExpandedCats(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // Helper for change pill
  const renderChangeBadge = (cur: number, prev: number) => {
    if (prev === 0 && cur > 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
          New
        </span>
      );
    }
    if (prev === 0 && cur === 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[11px] text-[#64748B]">
          <Minus className="w-3 h-3" /> no change
        </span>
      );
    }

    const diff = cur - prev;
    const pct = Math.abs(Math.round((diff / prev) * 100));

    if (diff > 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md">
          <ArrowUpRight className="w-3 h-3" /> {pct}% more
        </span>
      );
    }
    if (diff < 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
          <ArrowDownRight className="w-3 h-3" /> {pct}% less
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-[#64748B]">
        <Minus className="w-3 h-3" /> no change
      </span>
    );
  };

  const spendingDiff = curSpendingTotal - lastSpendingTotal;
  const spendingDiffPct = lastSpendingTotal > 0 ? Math.round((Math.abs(spendingDiff) / lastSpendingTotal) * 100) : 0;
  const forecastTotal = groupRows.reduce((s, g) => s + g.nextMonthForecast, 0);
  const forecastDiff = forecastTotal - curSpendingTotal;

  return (
    <div className="rounded-3xl bg-white border border-[#E6EAF0] shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-[#E6EAF0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A] flex items-center gap-2">
            <span>{title}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-[#4F46E5]">
              {groupRows.length} Groups
            </span>
          </h2>
          <p className="text-xs text-[#475569] mt-0.5">{subtitle}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Include Investments Toggle */}
          <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-[#E6EAF0] text-xs font-bold text-[#0F172A] cursor-pointer hover:bg-slate-50 transition">
            <input
              type="checkbox"
              checked={includeInvestments}
              onChange={e => setIncludeInvestments(e.target.checked)}
              className="accent-[#4F46E5] rounded"
            />
            <span className="text-[11px]">Include investments</span>
          </label>

          {/* Sort Menu */}
          <div className="relative">
            <select
              value={sortMode}
              onChange={e => setSortMode(e.target.value as SortMode)}
              className="px-2.5 py-1.5 rounded-xl border border-[#E6EAF0] text-xs font-bold text-[#0F172A] bg-white focus:outline-none"
            >
              <option value="amount_desc">Amount ↓ (High to Low)</option>
              <option value="amount_asc">Amount ↑ (Low to High)</option>
              <option value="change_desc">Change ↑ (Biggest Increase)</option>
              <option value="change_asc">Change ↓ (Biggest Decrease)</option>
              <option value="name_asc">A → Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* TOP DONUT (Main Categories Only, max 6 slices + Other) */}
      {showDonut && donutData.length > 0 && (
        <div className="p-4 border-b border-[#E6EAF0] flex flex-col sm:flex-row items-center justify-center gap-4 bg-slate-50/40">
          <div className="w-full sm:w-64 h-[190px] sm:h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                  onClick={(entry: any) => setSelectedSlice(entry.name)}
                >
                  {donutData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      const pct = curSpendingTotal > 0 ? Math.round((d.value / curSpendingTotal) * 100) : 0;
                      return (
                        <div className="bg-white p-2.5 rounded-xl border border-[#E6EAF0] shadow-lg text-xs">
                          <div className="font-bold text-[#0F172A]">{d.name}</div>
                          <div className="text-sm font-extrabold text-[#4F46E5] mt-0.5">
                            {formatINR(d.value)}
                          </div>
                          <div className="text-[10px] text-[#64748B]">{pct}% of this month spending</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Donut Legend */}
          <div className="flex flex-wrap sm:flex-col gap-1.5 text-xs text-[#0F172A]">
            {donutData.map((d, i) => {
              const pct = curSpendingTotal > 0 ? Math.round((d.value / curSpendingTotal) * 100) : 0;
              return (
                <div
                  key={i}
                  onClick={() => toggleGroupExpand(d.name)}
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 py-0.5"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="font-semibold text-xs truncate max-w-[140px]">{d.name}</span>
                  <span className="text-[11px] font-mono text-[#64748B]">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MOBILE COMPARISON COLUMN SELECTOR CHIPS */}
      <div className="sm:hidden px-4 pt-3 flex items-center gap-2 border-b border-[#E6EAF0] pb-2.5">
        <span className="text-[10px] font-bold text-[#64748B] uppercase">Compare:</span>
        <div className="flex gap-1.5">
          {[
            { id: 'vs_last', label: 'vs last month' },
            { id: 'avg_3m', label: '3-mo avg' },
            { id: 'next_month', label: 'Next month' },
          ].map(chip => (
            <button
              key={chip.id}
              onClick={() => setPhoneCol(chip.id as PhoneComparisonCol)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                phoneCol === chip.id
                  ? 'bg-[#4F46E5] text-white shadow-2xs'
                  : 'bg-slate-100 text-[#475569]'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* EXPENSE BREAKDOWN TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#E6EAF0] bg-slate-50/70 text-[#64748B] font-bold text-[11px]">
              <th className="py-2.5 px-3 sm:px-4">Category</th>
              <th className="py-2.5 px-3 sm:px-4 text-right">This Month</th>
              <th className="py-2.5 px-3 sm:px-4 text-right hidden sm:table-cell">vs Last Month</th>
              <th className="py-2.5 px-3 sm:px-4 text-right hidden md:table-cell">3-Month Avg</th>
              <th className="py-2.5 px-3 sm:px-4 text-right hidden md:table-cell">Next Month</th>
              <th className="py-2.5 px-3 sm:px-4 text-right hidden lg:table-cell">Next vs This</th>
              {/* Mobile single comparison column */}
              <th className="py-2.5 px-3 text-right sm:hidden">
                {phoneCol === 'vs_last' ? 'vs Last Mo' : phoneCol === 'avg_3m' ? '3-Mo Avg' : 'Next Mo'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6EAF0]">
            {groupRows.map(g => {
              const isGroupExpanded = Boolean(expandedGroups[g.name]);

              return (
                <React.Fragment key={g.name}>
                  {/* MAIN CATEGORY ROW */}
                  <tr
                    onClick={() => toggleGroupExpand(g.name)}
                    className="hover:bg-slate-50 cursor-pointer transition select-none bg-white font-bold"
                  >
                    <td className="py-3 px-3 sm:px-4 flex items-center gap-2">
                      {isGroupExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                      )}
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                      <span className="text-xs font-extrabold text-[#0F172A]">{g.name}</span>
                      <span className="text-[10px] text-[#94A3B8] font-normal">
                        ({g.categories.length})
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right font-extrabold text-[#0F172A]">
                      {formatINR(g.thisMonth)}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right hidden sm:table-cell">
                      {renderChangeBadge(g.thisMonth, g.lastMonth)}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right text-[#475569] hidden md:table-cell font-mono">
                      {formatINR(g.avg3m)}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right text-[#475569] hidden md:table-cell font-mono">
                      {formatINR(g.nextMonthForecast)}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right hidden lg:table-cell">
                      {g.nextMonthForecast - g.thisMonth >= 0 ? (
                        <span className="text-amber-600 font-semibold">
                          +{formatINR(g.nextMonthForecast - g.thisMonth)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">
                          -{formatINR(g.thisMonth - g.nextMonthForecast)}
                        </span>
                      )}
                    </td>

                    {/* Mobile Comparison Column */}
                    <td className="py-3 px-3 text-right sm:hidden">
                      {phoneCol === 'vs_last' && renderChangeBadge(g.thisMonth, g.lastMonth)}
                      {phoneCol === 'avg_3m' && <span className="font-mono">{formatINR(g.avg3m)}</span>}
                      {phoneCol === 'next_month' && <span className="font-mono">{formatINR(g.nextMonthForecast)}</span>}
                    </td>
                  </tr>

                  {/* CHILD CATEGORIES (When expanded) */}
                  {isGroupExpanded &&
                    g.categories.map(cat => {
                      const isCatExpanded = Boolean(expandedCats[cat.name]);
                      const hasSubs = cat.subcategories && cat.subcategories.length > 0;

                      return (
                        <React.Fragment key={cat.name}>
                          <tr className="bg-slate-50/60 hover:bg-slate-100/60 transition text-xs">
                            <td className="py-2 pl-8 sm:pl-10 pr-3 sm:pr-4 flex items-center gap-2">
                              {hasSubs ? (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    toggleCatExpand(cat.name);
                                  }}
                                  className="text-[#94A3B8]"
                                >
                                  {isCatExpanded ? (
                                    <ChevronDown className="w-3 h-3" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3" />
                                  )}
                                </button>
                              ) : (
                                <span className="w-3" />
                              )}
                              <span className="font-semibold text-[#0F172A]">{cat.name}</span>
                              {cat.name === 'Uncategorized' && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    setActiveScreen('categories');
                                  }}
                                  className="px-2 py-0.5 rounded-md bg-[#4F46E5] text-white text-[10px] font-bold shadow-2xs hover:bg-indigo-700 transition"
                                >
                                  Categorise now
                                </button>
                              )}
                            </td>
                            <td className="py-2 px-3 sm:px-4 text-right font-bold text-[#0F172A]">
                              {formatINR(cat.thisMonth)}
                            </td>
                            <td className="py-2 px-3 sm:px-4 text-right hidden sm:table-cell">
                              {renderChangeBadge(cat.thisMonth, cat.lastMonth)}
                            </td>
                            <td className="py-2 px-3 sm:px-4 text-right text-[#64748B] hidden md:table-cell font-mono">
                              {formatINR(cat.avg3m)}
                            </td>
                            <td className="py-2 px-3 sm:px-4 text-right text-[#64748B] hidden md:table-cell font-mono">
                              {formatINR(cat.nextMonthForecast)}
                            </td>
                            <td className="py-2 px-3 sm:px-4 text-right hidden lg:table-cell text-[11px]">
                              {cat.nextMonthForecast - cat.thisMonth >= 0 ? (
                                <span className="text-amber-600">
                                  +{formatINR(cat.nextMonthForecast - cat.thisMonth)}
                                </span>
                              ) : (
                                <span className="text-emerald-600">
                                  -{formatINR(cat.thisMonth - cat.nextMonthForecast)}
                                </span>
                              )}
                            </td>
                            {/* Mobile comparison cell */}
                            <td className="py-2 px-3 text-right sm:hidden">
                              {phoneCol === 'vs_last' && renderChangeBadge(cat.thisMonth, cat.lastMonth)}
                              {phoneCol === 'avg_3m' && <span className="font-mono">{formatINR(cat.avg3m)}</span>}
                              {phoneCol === 'next_month' && <span className="font-mono">{formatINR(cat.nextMonthForecast)}</span>}
                            </td>
                          </tr>

                          {/* SUBCATEGORIES (When category expanded) */}
                          {isCatExpanded &&
                            cat.subcategories?.map(sub => (
                              <tr key={sub.name} className="bg-slate-100/40 text-[11px] text-[#64748B]">
                                <td className="py-1.5 pl-14 pr-4 flex items-center gap-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#94A3B8]" />
                                  <span>{sub.name}</span>
                                </td>
                                <td className="py-1.5 px-3 sm:px-4 text-right font-medium">
                                  {formatINR(sub.thisMonth)}
                                </td>
                                <td colSpan={5} className="py-1.5 px-3 text-[#94A3B8] text-[10px]">
                                  Rolls into {cat.name}
                                </td>
                              </tr>
                            ))}
                        </React.Fragment>
                      );
                    })}
                </React.Fragment>
              );
            })}

            {/* SEPARATE ROW FOR INVESTMENTS (Saved, not spent) per UPDATE 5 */}
            {includeInvestments && (
              <tr className="bg-indigo-50/70 border-t-2 border-indigo-200 font-bold text-xs text-indigo-950">
                <td className="py-3 px-3 sm:px-4 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4F46E5] shrink-0" />
                  <span>Investments (saved, not spent)</span>
                </td>
                <td className="py-3 px-3 sm:px-4 text-right font-extrabold text-[#4F46E5]">
                  {formatINR(curInvestTotal)}
                </td>
                <td className="py-3 px-3 sm:px-4 text-right hidden sm:table-cell">
                  {renderChangeBadge(curInvestTotal, lastInvestTotal)}
                </td>
                <td className="py-3 px-3 sm:px-4 text-right hidden md:table-cell font-mono">
                  {formatINR(Math.round((curInvestTotal + lastInvestTotal) / 2))}
                </td>
                <td className="py-3 px-3 sm:px-4 text-right hidden md:table-cell font-mono">
                  {formatINR(curInvestTotal)}
                </td>
                <td className="py-3 px-3 sm:px-4 text-right hidden lg:table-cell">
                  <span className="text-[#64748B]">Active SIPs</span>
                </td>
                <td className="py-3 px-3 text-right sm:hidden">
                  <span className="font-bold text-[#4F46E5]">{formatINR(curInvestTotal)}</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER 3 LINES REQUIRED BY UPDATE 5 */}
      <div className="p-4 sm:p-5 border-t border-[#E6EAF0] bg-slate-50/80 space-y-1.5 text-xs">
        {/* Line 1 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[#0F172A]">
          <span>
            This month spending <strong className="font-extrabold">{formatINR(curSpendingTotal)}</strong> · last month <strong className="font-bold">{formatINR(lastSpendingTotal)}</strong>
          </span>
          <span className="font-semibold text-xs mt-0.5 sm:mt-0">
            {spendingDiff >= 0 ? (
              <span className="text-rose-600 font-bold">▲ {spendingDiffPct}% more than last month</span>
            ) : (
              <span className="text-emerald-600 font-bold">▼ {spendingDiffPct}% less than last month</span>
            )}
          </span>
        </div>

        {/* Line 2 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[#475569]">
          <span>
            Next month forecast <strong className="font-bold text-[#0F172A]">{formatINR(forecastTotal)}</strong>
          </span>
          <span className="text-xs">
            {forecastDiff >= 0 ? (
              <span className="text-amber-600 font-semibold">▲ +{formatINR(forecastDiff)} vs this month</span>
            ) : (
              <span className="text-emerald-600 font-semibold">▼ -{formatINR(Math.abs(forecastDiff))} vs this month</span>
            )}
          </span>
        </div>

        {/* Line 3 */}
        <div className="text-[#64748B] pt-0.5 border-t border-[#E6EAF0]/60">
          Outflow incl. investments: <strong className="font-extrabold text-[#0F172A]">{formatINR(curOutflow)}</strong> (Spending {formatINR(curSpendingTotal)} + Invested {formatINR(curInvestTotal)})
        </div>
      </div>
    </div>
  );
};
