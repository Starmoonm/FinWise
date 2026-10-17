import React, { useState, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  Tag,
  Table as TableIcon,
  LineChart as ChartIcon,
  ChevronRight,
  TrendingUp,
  Percent,
  Calendar,
  AlertCircle,
  Sliders,
  Check,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import { Budget, CategoryGroup } from '../../types';
import {
  getTransactionsForMonth,
  getBudgetStatus,
  calculateMonthEndForecast,
} from '../../utils/calculations';
import { formatINR, formatCompactINR } from '../../utils/formatters';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { SEED_DATA } from '../../utils/seedData';

export const BudgetScreen: React.FC = () => {
  const {
    activeMonthKey,
    todayDateStr,
    transactions,
    settings,
    groups,
    history,
    addOrUpdateBudget,
    deleteBudget,
    setActiveScreen,
    showToast,
  } = useFinance();

  // Mode: View by Category List vs View by Group
  const [viewMode, setViewMode] = useState<'category' | 'group'>('category');
  const [showChartAsTable, setShowChartAsTable] = useState(false);
  const [showPlannerModal, setShowPlannerModal] = useState(false);

  // Month transactions
  const monthTx = useMemo(
    () => getTransactionsForMonth(transactions, activeMonthKey),
    [transactions, activeMonthKey]
  );

  // Parse date info
  const { daysPassed, daysInMonth, daysLeft } = useMemo(() => {
    const [y, m, d] = todayDateStr.split('-').map(Number);
    const [currY, currM] = activeMonthKey.split('-').map(Number);
    const isCurrentActive = currY === y && currM === m;
    const maxDays = new Date(Date.UTC(currY, currM, 0)).getUTCDate();
    const passed = isCurrentActive ? Math.min(d, maxDays) : maxDays;
    const leftDays = Math.max(1, maxDays - passed);
    return { daysPassed: passed, daysInMonth: maxDays, daysLeft: leftDays };
  }, [todayDateStr, activeMonthKey]);

  // Month-end forecast calculation (lib engine)
  const forecast = useMemo(
    () => calculateMonthEndForecast(settings.budgets, monthTx, todayDateStr),
    [settings.budgets, monthTx, todayDateStr]
  );

  // Previous 6 months keys
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

  // Total budget & KPI strip calculations
  const totalBudgetLimit = useMemo(
    () => settings.budgets.reduce((sum, b) => sum + (Number(b.limit) || 0), 0),
    [settings.budgets]
  );

  const totalFixedBudget = useMemo(
    () => settings.budgets.filter(b => b.fixed).reduce((sum, b) => sum + (Number(b.limit) || 0), 0),
    [settings.budgets]
  );

  const totalVariableBudget = useMemo(
    () => settings.budgets.filter(b => !b.fixed).reduce((sum, b) => sum + (Number(b.limit) || 0), 0),
    [settings.budgets]
  );

  const totalSpent = useMemo(
    () => monthTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
    [monthTx]
  );

  const remainingBudget = Math.max(0, totalBudgetLimit - totalSpent);

  // Safe to spend per day = remaining variable budget ÷ days left
  const remainingVariable = Math.max(0, totalVariableBudget - forecast.variableSoFar);
  const safeToSpendPerDay = Math.round(remainingVariable / daysLeft);

  // Group-based budgets map
  const groupBudgets = useMemo(() => {
    return groups.map(g => {
      // Find all categories in this group
      const relatedBudgets = settings.budgets.filter(b => {
        if (b.groupId === g.id) return true;
        const groupCats = SEED_DATA.groups_suggested_editable[g.name] || g.categories || [];
        return b.categories.some(c => groupCats.includes(c));
      });

      const limit = relatedBudgets.reduce((sum, b) => sum + (Number(b.limit) || 0), 0);
      const catsInGroup = relatedBudgets.flatMap(b => b.categories);
      const spent = monthTx
        .filter(t => t.type === 'expense' && catsInGroup.includes(t.category))
        .reduce((sum, t) => sum + t.amount, 0);

      const status = getBudgetStatus(spent, limit);
      return {
        group: g,
        limit,
        spent,
        status,
        budgetsCount: relatedBudgets.length,
      };
    }).filter(gb => gb.limit > 0 || gb.spent > 0);
  }, [groups, settings.budgets, settings.groups, monthTx]);

  // Per budget item stats (spent, status, pace marker, 6-month history)
  const budgetStats = useMemo(() => {
    return settings.budgets.map(b => {
      const spent = monthTx
        .filter(t => t.type === 'expense' && b.categories.includes(t.category))
        .reduce((sum, t) => sum + t.amount, 0);

      const status = getBudgetStatus(spent, b.limit);
      const paceTarget = Math.round((b.limit * daysPassed) / daysInMonth);
      const pacePercent = b.limit > 0 ? Math.min(100, Math.round((paceTarget / b.limit) * 100)) : 0;
      const spentPercent = b.limit > 0 ? Math.min(100, Math.round((spent / b.limit) * 100)) : 0;

      // 6 month history dots
      const history6Months = past6Months.map(mKey => {
        const pTx = getTransactionsForMonth(transactions, mKey);
        const pSpent = pTx
          .filter(t => t.type === 'expense' && b.categories.includes(t.category))
          .reduce((sum, t) => sum + t.amount, 0);
        const isOver = pSpent > b.limit;
        return {
          monthKey: mKey,
          spent: pSpent,
          isOver,
        };
      });

      const overCount = history6Months.filter(h => h.isOver).length;

      return {
        ...b,
        spent,
        remaining: Math.max(0, b.limit - spent),
        status,
        paceTarget,
        pacePercent,
        spentPercent,
        history6Months,
        overCount,
      };
    });
  }, [settings.budgets, monthTx, daysPassed, daysInMonth, past6Months, transactions]);

  // Cumulative spending comparison data for chart: This month vs Last month vs Budget pace
  const cumulativeChartData = useMemo(() => {
    const [y, m] = activeMonthKey.split('-').map(Number);
    const lastMonthDate = new Date(Date.UTC(y, m - 2, 1));
    const lastMonthKey = `${lastMonthDate.getUTCFullYear()}-${String(lastMonthDate.getUTCMonth() + 1).padStart(2, '0')}`;
    const lastMonthTx = getTransactionsForMonth(transactions, lastMonthKey);

    const data: Array<{
      day: number;
      label: string;
      thisMonth?: number;
      lastMonth?: number;
      budgetPace: number;
    }> = [];

    let cumThis = 0;
    let cumLast = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const thisDayDate = `${activeMonthKey}-${dayStr}`;
      const lastDayDate = `${lastMonthKey}-${dayStr}`;

      const spentTodayThis = monthTx
        .filter(t => t.type === 'expense' && t.date === thisDayDate)
        .reduce((sum, t) => sum + t.amount, 0);

      const spentTodayLast = lastMonthTx
        .filter(t => t.type === 'expense' && t.date === lastDayDate)
        .reduce((sum, t) => sum + t.amount, 0);

      cumThis += spentTodayThis;
      cumLast += spentTodayLast;

      const pace = Math.round((totalBudgetLimit / daysInMonth) * d);

      data.push({
        day: d,
        label: `Day ${d}`,
        thisMonth: d <= daysPassed ? cumThis : undefined,
        lastMonth: cumLast,
        budgetPace: pace,
      });
    }

    return data;
  }, [activeMonthKey, transactions, monthTx, daysInMonth, daysPassed, totalBudgetLimit]);

  // Modal State for Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteBudgetName, setDeleteBudgetName] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formLimit, setFormLimit] = useState('');
  const [formFixed, setFormFixed] = useState(false);
  const [formRollover, setFormRollover] = useState(false);
  const [formAlertPercent, setFormAlertPercent] = useState(80);
  const [formGroupId, setFormGroupId] = useState('');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);

  const openAddModal = () => {
    setEditingBudget(null);
    setFormName('');
    setFormLimit('');
    setFormFixed(false);
    setFormRollover(false);
    setFormAlertPercent(80);
    setFormGroupId('');
    setSelectedCats([]);
    setIsModalOpen(true);
  };

  const openEditModal = (b: Budget) => {
    setEditingBudget(b);
    setFormName(b.name);
    setFormLimit(String(b.limit));
    setFormFixed(b.fixed);
    setFormRollover(b.rollover || false);
    setFormAlertPercent(b.alertAtPercent || 80);
    setFormGroupId(b.groupId || '');
    setSelectedCats([...b.categories]);
    setIsModalOpen(true);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedLimit = parseFloat(formLimit);
    if (!parsedLimit || parsedLimit <= 0 || !formName.trim()) return;

    addOrUpdateBudget({
      name: formName.trim(),
      limit: parsedLimit,
      fixed: formFixed,
      rollover: formRollover,
      alertAtPercent: formAlertPercent,
      groupId: formGroupId || undefined,
      categories: selectedCats.length > 0 ? selectedCats : [formName.trim()],
    });

    setIsModalOpen(false);
  };

  // Next Month Planner: 3-month average rounded up to nearest ₹500
  const suggestedPlan = useMemo(() => {
    return settings.budgets.map(b => {
      // Calculate average of past 3 complete months for this budget's categories
      const past3 = past6Months.slice(2, 5); // 3 complete months
      let sum = 0;
      for (const mKey of past3) {
        const pTx = getTransactionsForMonth(transactions, mKey);
        const pSpent = pTx
          .filter(t => t.type === 'expense' && b.categories.includes(t.category))
          .reduce((acc, t) => acc + t.amount, 0);
        sum += pSpent;
      }
      const avg = sum > 0 ? sum / 3 : b.limit;
      const suggested = Math.max(500, Math.ceil(avg / 500) * 500);

      return {
        budget: b,
        avgSpending: Math.round(avg),
        suggestedLimit: suggested,
      };
    });
  }, [settings.budgets, past6Months, transactions]);

  const [customPlanLimits, setCustomPlanLimits] = useState<Record<string, number>>({});

  const handleAcceptSinglePlan = (budgetName: string, newLimit: number) => {
    const existing = settings.budgets.find(b => b.name === budgetName);
    if (!existing) return;
    addOrUpdateBudget({
      ...existing,
      limit: newLimit,
    });
    showToast(`Updated ${budgetName} limit to ${formatINR(newLimit)}`);
  };

  const handleAcceptAllPlan = () => {
    suggestedPlan.forEach(p => {
      const targetLimit = customPlanLimits[p.budget.name] || p.suggestedLimit;
      addOrUpdateBudget({
        ...p.budget,
        limit: targetLimit,
      });
    });
    setShowPlannerModal(false);
    showToast(`Applied suggested limits to all ${suggestedPlan.length} budgets`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3.5 sm:px-6 py-4 pb-24 md:pb-8">
      {/* Header Row: Title, one-line description, primary actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            <span>Budget</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
              {activeMonthKey}
            </span>
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Plan, monitor pace, and track fixed commitments vs variable spending
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode toggle: By Category vs By Group */}
          <div className="flex items-center bg-zinc-100 p-0.5 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('category')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'category'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>By Category</span>
            </button>
            <button
              onClick={() => setViewMode('group')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'group'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>By Group</span>
            </button>
          </div>

          <button
            onClick={() => setShowPlannerModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-semibold text-xs transition"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Next Month Planner</span>
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Budget</span>
          </button>
        </div>
      </div>

      {/* KPI Strip: 5 Tiles per Section 1 & 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 1. Total Budget */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Total Budget
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-zinc-900 font-mono">
              {formatINR(totalBudgetLimit)}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            Fixed {formatCompactINR(totalFixedBudget)} · Var {formatCompactINR(totalVariableBudget)}
          </span>
        </div>

        {/* 2. Spent */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Spent This Month
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-zinc-900 font-mono">
              {formatINR(totalSpent)}
            </span>
          </div>
          <span className="text-[11px] font-medium text-emerald-600 mt-1 block">
            {totalBudgetLimit > 0 ? Math.round((totalSpent / totalBudgetLimit) * 100) : 0}% of budget
          </span>
        </div>

        {/* 3. Remaining */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Remaining Budget
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className={`text-xl font-black font-mono ${
                remainingBudget <= 0 ? 'text-rose-600' : 'text-zinc-900'
              }`}
            >
              {remainingBudget <= 0 ? '− ' : '+ '}
              {formatINR(remainingBudget)}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            {forecast.forecastTotal > totalBudgetLimit ? '▲ Forecast over budget' : '▼ Within projected'}
          </span>
        </div>

        {/* 4. Days Left */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Month Progress
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-zinc-900 font-mono">
              {daysLeft} days left
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            Day {daysPassed} of {daysInMonth} ({Math.round((daysPassed / daysInMonth) * 100)}%)
          </span>
        </div>

        {/* 5. Safe-To-Spend Per Day */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-300 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
            Safe To Spend / Day
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-emerald-700 font-mono">
              {formatINR(safeToSpendPerDay)}
            </span>
          </div>
          <span className="text-[11px] text-emerald-600/90 mt-1 block">
            Remaining variable ÷ {daysLeft} days
          </span>
        </div>
      </div>

      {/* Month-End Forecast Card & Cumulative Spending Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Forecast Card + Fixed Checklist */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Month-End Forecast</span>
            </h3>
            <span className="text-xs font-mono font-bold text-emerald-600">
              Day {forecast.daysPassed} of {forecast.daysInMonth}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-zinc-500">Projected Month Total</span>
              <span className="text-xl font-black text-zinc-900 font-mono">
                {formatINR(forecast.forecastTotal)}
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 leading-relaxed">
              Formula: Fixed commitments (<strong>{formatINR(forecast.expectedFixed)}</strong>) + Extrapolated variable (
              <strong>{formatINR(forecast.variableSoFar)}</strong> ÷ {forecast.daysPassed} × {forecast.daysInMonth}).
              One-time lump sums are never extrapolated.
            </div>
          </div>

          {/* Fixed Expenses Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Fixed Checklist
              </span>
              <span className="text-xs font-mono font-semibold text-zinc-500">
                Paid {formatINR(forecast.fixedPaid)} / Expected {formatINR(forecast.expectedFixed)}
              </span>
            </div>

            <div className="divide-y divide-zinc-100 max-h-56 overflow-y-auto pr-1">
              {forecast.fixedChecklist.map((item, idx) => (
                <div key={`${item.name}-${idx}`} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {item.status === 'Paid' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span className="font-semibold text-zinc-800">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-zinc-600">
                      {formatINR(item.spent)} / {formatINR(item.limit)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.status === 'Paid' ? 'Paid ✓' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart: Cumulative spending this month vs last month vs the budget line */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">
                Cumulative Spending Pace
              </h3>
              <p className="text-xs text-zinc-500">
                This month vs Last month vs Planned budget pace line ({activeMonthKey})
              </p>
            </div>

            <button
              onClick={() => setShowChartAsTable(!showChartAsTable)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs font-semibold hover:bg-zinc-100 transition"
            >
              {showChartAsTable ? <ChartIcon className="w-3.5 h-3.5" /> : <TableIcon className="w-3.5 h-3.5" />}
              <span>{showChartAsTable ? 'View as chart' : 'View as table'}</span>
            </button>
          </div>

          {!showChartAsTable ? (
            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cumulativeChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.5} />
                  <XAxis
                    dataKey="day"
                    tickFormatter={d => `${d}`}
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={v => formatCompactINR(v)}
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      formatINR(Number(value) || 0),
                      String(name) === 'thisMonth'
                        ? 'This Month'
                        : String(name) === 'lastMonth'
                        ? 'Last Month'
                        : 'Budget Pace',
                    ]}
                    labelFormatter={label => `Day ${label}`}
                    contentStyle={{
                      backgroundColor: 'rgba(24, 24, 27, 0.95)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    formatter={val =>
                      val === 'thisMonth'
                        ? 'This Month Cumulative'
                        : val === 'lastMonth'
                        ? 'Last Month Cumulative'
                        : 'Budget Target Pace'
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="budgetPace"
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    dot={false}
                    name="budgetPace"
                  />
                  <Line
                    type="monotone"
                    dataKey="lastMonth"
                    stroke="#a1a1aa"
                    strokeWidth={1.5}
                    dot={false}
                    name="lastMonth"
                  />
                  <Line
                    type="monotone"
                    dataKey="thisMonth"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 2 }}
                    name="thisMonth"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-72 border border-zinc-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-100 sticky top-0 font-semibold text-zinc-600">
                  <tr>
                    <th className="p-2.5">Day</th>
                    <th className="p-2.5 text-right">This Month</th>
                    <th className="p-2.5 text-right">Last Month</th>
                    <th className="p-2.5 text-right">Budget Pace</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {cumulativeChartData.map(row => (
                    <tr key={row.day} className="hover:bg-zinc-50">
                      <td className="p-2.5 font-medium">{row.label}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-600">
                        {row.thisMonth !== undefined ? formatINR(row.thisMonth) : '—'}
                      </td>
                      <td className="p-2.5 text-right font-mono text-zinc-500">
                        {row.lastMonth !== undefined ? formatINR(row.lastMonth) : '—'}
                      </td>
                      <td className="p-2.5 text-right font-mono text-zinc-500">
                        {formatINR(row.budgetPace)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Main Budget List: By Category vs By Group */}
      {viewMode === 'category' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-900">
              Budgets by Category ({budgetStats.length})
            </h2>
            <span className="text-xs text-zinc-500">
              Pace marker shows where spending should be today ({Math.round((daysPassed / daysInMonth) * 100)}%)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgetStats.map((b, idx) => (
              <div
                key={`${b.name}-${b.id || idx}`}
                className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-3.5 hover:border-zinc-300 transition"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-zinc-900">{b.name}</h3>
                      {b.fixed ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-100 text-zinc-600">
                          Fixed
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-600">
                          Variable
                        </span>
                      )}
                      {b.rollover && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-600">
                          Rollover
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      Covers: {b.categories.join(', ')}
                    </div>
                  </div>

                  {/* Status chip with icon + text */}
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${b.status.colorClass}`}
                  >
                    <span>{b.status.icon}</span>
                    <span>{b.status.label}</span>
                  </div>
                </div>

                {/* Spending, Limit, and Remaining */}
                <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase tracking-wider">Spent</span>
                    <span className="font-mono font-bold text-sm text-zinc-900">
                      {formatINR(b.spent)}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase tracking-wider">Limit</span>
                    <span className="font-mono font-bold text-sm text-zinc-700">
                      {formatINR(b.limit)}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase tracking-wider">Remaining</span>
                    <span
                      className={`font-mono font-bold text-sm ${
                        b.remaining <= 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {formatINR(b.remaining)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar with Pace Marker */}
                <div className="space-y-1">
                  <div className="relative w-full bg-zinc-100 h-3 rounded-full overflow-hidden">
                    {/* Spent bar */}
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        b.status.status === 'over'
                          ? 'bg-rose-500'
                          : b.status.status === 'near'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${b.spentPercent}%` }}
                    />
                    {/* Pace marker (where I should be today) */}
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-indigo-600 text-white shadow-md z-10"
                      style={{ left: `${b.pacePercent}%` }}
                      title={`Today's pace target: ${formatINR(b.paceTarget)} (${b.pacePercent}%)`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-400">
                    <span>0%</span>
                    <span className="font-medium text-zinc-600">
                      Pace marker: {formatINR(b.paceTarget)} today
                    </span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Footer: 6-month over dots + action buttons */}
                <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-zinc-100">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-semibold mr-1">Last 6M:</span>
                    <div className="flex items-center gap-1">
                      {b.history6Months.map((h, idx) => (
                        <div
                          key={idx}
                          title={`${h.monthKey}: ${formatINR(h.spent)} (${h.isOver ? 'Over budget' : 'Within budget'})`}
                          className={`w-2.5 h-2.5 rounded-full transition ${
                            h.isOver
                              ? 'bg-rose-500 ring-1 ring-rose-300'
                              : 'bg-emerald-500'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-zinc-400 ml-1">
                      ({b.overCount}/6 over)
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(b)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100"
                      title="Edit budget"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteBudgetName(b.name)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                      title="Delete budget"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* View by Group */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-900">
              Budgets by Group ({groupBudgets.length})
            </h2>
            <span className="text-xs text-zinc-500">
              Aggregated limits and spending per expense group
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupBudgets.map(gb => (
              <div
                key={gb.group.id}
                className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: gb.group.color || '#10b981' }}
                    />
                    <h3 className="font-bold text-sm text-zinc-900">
                      {gb.group.name}
                    </h3>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${gb.status.colorClass}`}
                  >
                    {gb.status.label}
                  </span>
                </div>

                <div className="flex items-baseline justify-between text-xs font-mono">
                  <span className="text-zinc-500">
                    Spent: <strong className="text-zinc-900">{formatINR(gb.spent)}</strong>
                  </span>
                  <span className="text-zinc-500">
                    Limit: <strong className="text-zinc-700">{formatINR(gb.limit)}</strong>
                  </span>
                </div>

                <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      gb.status.status === 'over'
                        ? 'bg-rose-500'
                        : gb.status.status === 'near'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, gb.status.percent)}%` }}
                  />
                </div>

                <div className="text-[11px] text-zinc-400 pt-1 flex items-center justify-between">
                  <span>{gb.budgetsCount} budgets linked</span>
                  <span>{Math.round(gb.status.percent)}% spent</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6-Month History Table: Budget × Month with status icon + colour */}
      <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">
              6-Month Budget Performance History
            </h3>
            <p className="text-xs text-zinc-500">
              Multi-month consistency check (Within = ✓, Near = !, Over = ✕)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-100 font-semibold text-zinc-600">
              <tr>
                <th className="p-3 sticky left-0 bg-zinc-100 z-10">Budget</th>
                <th className="p-3 text-right">Limit</th>
                {past6Months.map(mKey => (
                  <th key={mKey} className="p-3 text-center min-w-[90px]">
                    {mKey}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {budgetStats.map((b, idx) => (
                <tr key={`${b.name}-${b.id || idx}`} className="hover:bg-zinc-50">
                  <td className="p-3 font-semibold text-zinc-900 sticky left-0 bg-white z-10 border-r border-zinc-100">
                    {b.name}
                  </td>
                  <td className="p-3 text-right font-mono font-medium text-zinc-600">
                    {formatCompactINR(b.limit)}
                  </td>
                  {b.history6Months.map((h, i) => {
                    const status = getBudgetStatus(h.spent, b.limit);
                    return (
                      <td key={i} className="p-2.5 text-center">
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${status.colorClass}`}
                        >
                          <span>{status.icon}</span>
                          <span>{formatCompactINR(h.spent)}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Next Month Budget Planner Modal */}
      {showPlannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-600/30 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white border border-zinc-200 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Next Month Budget Planner</span>
                </h3>
                <p className="text-xs text-zinc-500">
                  Suggested limits based on past 3-month average rounded up to nearest ₹500
                </p>
              </div>

              <button
                onClick={() => setShowPlannerModal(false)}
                className="text-zinc-400 hover:text-zinc-700 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-zinc-100">
              {suggestedPlan.map((p, idx) => {
                const currentSuggested = customPlanLimits[p.budget.name] ?? p.suggestedLimit;
                return (
                  <div key={`${p.budget.name}-${idx}`} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-zinc-900 block">
                        {p.budget.name}
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        Current: {formatINR(p.budget.limit)} · 3M Avg: {formatINR(p.avgSpending)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-400">₹</span>
                        <input
                          type="number"
                          step="500"
                          value={currentSuggested}
                          onChange={e =>
                            setCustomPlanLimits({
                              ...customPlanLimits,
                              [p.budget.name]: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-24 px-2 py-1 font-mono font-bold rounded-lg border border-zinc-300 bg-zinc-50 text-right"
                        />
                      </div>

                      <button
                        onClick={() => handleAcceptSinglePlan(p.budget.name, currentSuggested)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] transition"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-zinc-200 pt-3 flex items-center justify-between">
              <span className="text-xs text-zinc-500">
                Accept per row or apply all at once
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPlannerModal(false)}
                  className="px-3 py-2 rounded-xl border border-zinc-300 text-xs font-semibold hover:bg-zinc-100 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAcceptAllPlan}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
                >
                  Accept All Suggestions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Budget Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-600/30 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white border border-zinc-200 p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-900">
              {editingBudget ? 'Edit Budget' : 'Create New Budget'}
            </h3>

            <form onSubmit={handleSaveBudget} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-600 mb-1 font-medium">Budget Name</label>
                <input
                  type="text"
                  placeholder="e.g. Health & Medicine, Fuel..."
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-600 mb-1 font-medium">Monthly Limit (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={formLimit}
                  onChange={e => setFormLimit(e.target.value)}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 font-bold"
                  required
                />
              </div>

              {/* Group selection */}
              <div>
                <label className="block text-zinc-600 mb-1 font-medium">Expense Group (Optional)</label>
                <select
                  value={formGroupId}
                  onChange={e => setFormGroupId(e.target.value)}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900"
                >
                  <option value="">No specific group</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fixed vs Variable */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="fixed-toggle"
                  checked={formFixed}
                  onChange={e => setFormFixed(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="fixed-toggle" className="text-zinc-700 font-medium">
                  Fixed commitment (Included in fixed expenses checklist)
                </label>
              </div>

              {/* Rollover option */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rollover-toggle"
                  checked={formRollover}
                  onChange={e => setFormRollover(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="rollover-toggle" className="text-zinc-700 font-medium">
                  Rollover unused amount to next month
                </label>
              </div>

              {/* Alert threshold */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-zinc-600 font-medium">
                    Alert Threshold: {formAlertPercent}%
                  </label>
                  <span className="text-[10px] text-zinc-400">Default 80%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={formAlertPercent}
                  onChange={e => setFormAlertPercent(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>

              {/* Categories selector */}
              <div>
                <label className="block text-zinc-600 mb-1 font-medium">
                  Covered Categories ({selectedCats.length} selected)
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-zinc-50 rounded-xl border border-zinc-200">
                  {settings.expenseCategories.map((cat, idx) => {
                    const isSelected = selectedCats.includes(cat);
                    return (
                      <button
                        type="button"
                        key={`${cat}-${idx}`}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedCats(selectedCats.filter(c => c !== cat));
                          } else {
                            setSelectedCats([...selectedCats, cat]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-zinc-700 border-zinc-200'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-300 text-zinc-700 font-semibold hover:bg-zinc-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs transition"
                >
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteBudgetName)}
        title="Delete Budget"
        message={`Are you sure you want to delete budget "${deleteBudgetName}"? Category spending history will not be deleted.`}
        confirmLabel="Delete"
        isDestructive
        onConfirm={() => {
          if (deleteBudgetName) {
            deleteBudget(deleteBudgetName);
            setDeleteBudgetName(null);
          }
        }}
        onCancel={() => setDeleteBudgetName(null)}
      />
    </div>
  );
};
