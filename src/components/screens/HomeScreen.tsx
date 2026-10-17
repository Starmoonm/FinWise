import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Wallet,
  Coins,
  CreditCard as CardIcon,
  Plus,
  Minus,
  BarChart3,
  CalendarDays,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  ChevronRight,
  PieChart as PieIcon,
  RefreshCw,
  ArrowLeftRight,
  AlertTriangle,
  Building2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import { ExpenseBreakdownTable } from '../common/ExpenseBreakdownTable';
import {
  income as calcIncome,
  spending as calcSpending,
  invested as calcInvested,
  left as calcLeft,
  savingsRate as calcSavingsRate,
  netWorthBreakdown,
  calculateBudgetHealth,
} from '../../lib/finance';
import { formatINR, formatShortINR } from '../../utils/formatters';

const CATEGORY_COLORS: string[] = [
  '#4F46E5', // Indigo
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#64748B', // Slate
];

export const HomeScreen: React.FC = () => {
  const {
    activeMonthKey,
    setActiveMonthKey,
    transactions,
    loans,
    investments,
    goals,
    cards,
    assets,
    settings,
    setActiveScreen,
    payLoanEMI,
    payInvestmentInstallment,
    payCardBill,
    openQuickAdd,
    setQuickAddOpen,
    hideAmounts,
    showToast,
  } = useFinance();

  // Month toggle state for quick Current Month / Next Month view
  const [selectedMonthToggle, setSelectedMonthToggle] = useState<'current' | 'next'>('current');
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);

  // Month transactions
  const monthTx = useMemo(
    () => transactions.filter(t => t.date.startsWith(activeMonthKey)),
    [transactions, activeMonthKey]
  );

  // Core metrics via finance.ts calculation engine
  const curIncome = useMemo(() => calcIncome(monthTx), [monthTx]);
  const curSpending = useMemo(() => calcSpending(monthTx), [monthTx]);
  const curInvested = useMemo(() => calcInvested(monthTx), [monthTx]);

  // Breakdown of expenses: Bank/Cash/UPI vs Credit Card
  const bankCashExpenses = useMemo(() => {
    return monthTx
      .filter(t => t.type === 'expense' && t.mode !== 'Credit Card')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTx]);

  const cardExpenses = useMemo(() => {
    return monthTx
      .filter(t => t.type === 'expense' && t.mode === 'Credit Card')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTx]);

  const cardPayments = useMemo(() => {
    return monthTx
      .filter(t => t.type === 'cardPayment')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTx]);

  // Available Balance calculations matching FIX 3:
  // Big number: Income - Expenses (all modes incl. card) - Investments
  // e.g. 82,000 - 73,695 - 21,000 = -12,695
  const bigAvailableBalance = curIncome - curSpending - curInvested;

  // Small line: Bank/Cash only (card bill not yet paid) = Income - bank/cash/UPI expenses - Investments - card bill payments
  // e.g. 82,000 - 64,755 - 21,000 - 0 = -3,755
  const bankCashAvailable = curIncome - bankCashExpenses - curInvested - cardPayments;

  // Investments percentage of income
  const investmentsPct = curIncome > 0 ? ((curInvested / curIncome) * 100).toFixed(1) : '0.0';

  // Net Worth Breakdown
  const nwBreakdown = useMemo(() => {
    return netWorthBreakdown({ goals, investments, loans, cards, assets, transactions });
  }, [goals, investments, loans, cards, assets, transactions]);

  // Quick Add prefilled chips: top categories with usual amounts and times used
  const quickAddChips = useMemo(() => {
    const counts: Record<string, { count: number; total: number }> = {};
    for (const t of transactions) {
      if (t.type === 'expense' && t.category) {
        if (!counts[t.category]) counts[t.category] = { count: 0, total: 0 };
        counts[t.category].count += 1;
        counts[t.category].total += t.amount;
      }
    }
    const list = Object.entries(counts)
      .map(([cat, data]) => ({
        category: cat,
        usualAmount: Math.round(data.total / data.count / 50) * 50 || Math.round(data.total / data.count),
        timesUsed: data.count,
      }))
      .sort((a, b) => b.timesUsed - a.timesUsed)
      .slice(0, 6);

    // Default fallback chips if transaction count is small
    if (list.length === 0) {
      return [
        { category: 'Grocery', usualAmount: 3500, timesUsed: 6 },
        { category: 'Fuel / Petrol', usualAmount: 1500, timesUsed: 4 },
        { category: 'Dining Out', usualAmount: 850, timesUsed: 4 },
        { category: 'Milk & Dairy', usualAmount: 1200, timesUsed: 3 },
        { category: 'Electricity Bill', usualAmount: 2400, timesUsed: 2 },
        { category: 'Pharmacy', usualAmount: 650, timesUsed: 2 },
      ];
    }
    return list;
  }, [transactions]);

  // Card 1: 6-Month Overview Bar Chart Data
  const monthly6Data = useMemo(() => {
    return [
      { month: 'May', income: 82000, expenses: 73000, investments: 10000 },
      { month: 'Jun', income: 82000, expenses: 76000, investments: 10000 },
      { month: 'Jul', income: 82000, expenses: 75000, investments: 10000 },
      { month: 'Aug', income: 82000, expenses: 78000, investments: 10000 },
      { month: 'Sep', income: 80000, expenses: 105203, investments: 20000 },
      { month: 'Oct', income: curIncome, expenses: curSpending, investments: curInvested },
    ];
  }, [curIncome, curSpending, curInvested]);

  // Card 2: Where the money went (Top 5 Categories + Other)
  const topCategoriesData = useMemo(() => {
    const catsMap: Record<string, number> = {};
    for (const t of monthTx) {
      if (t.type === 'expense') {
        catsMap[t.category] = (catsMap[t.category] || 0) + t.amount;
      }
    }
    const sorted = Object.entries(catsMap)
      .filter(([_, amt]) => amt > 0)
      .sort((a, b) => b[1] - a[1]);

    const top5 = sorted.slice(0, 5);
    const otherSum = sorted.slice(5).reduce((sum, item) => sum + item[1], 0);

    const items = top5.map(([name, value], i) => ({
      name,
      value,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      pct: curSpending > 0 ? ((value / curSpending) * 100).toFixed(1) : '0',
    }));

    if (otherSum > 0) {
      items.push({
        name: 'Other',
        value: otherSum,
        color: CATEGORY_COLORS[CATEGORY_COLORS.length - 1],
        pct: curSpending > 0 ? ((otherSum / curSpending) * 100).toFixed(1) : '0',
      });
    }
    return items;
  }, [monthTx, curSpending]);

  // Card 3: Budgets to watch (over or near limit, max 5)
  const budgetsToWatch = useMemo(() => {
    const health = calculateBudgetHealth(settings.budgets, monthTx);
    // Prioritize budgets that are over limit or >= 70%
    const critical = health.filter(b => b.percent >= 70 || b.status === 'over');
    if (critical.length >= 3) {
      return critical.slice(0, 5);
    }
    // If not enough critical, take highest spent budgets
    return [...health].sort((a, b) => b.percent - a.percent).slice(0, 5);
  }, [settings.budgets, monthTx]);

  // Card 4: Upcoming Payments (Next 5 dues, overdue first)
  const upcomingPayments = useMemo(() => {
    return [
      {
        id: 'pay-emi-1',
        name: 'Bank Home Loan EMI',
        dueDate: '13 Nov 2026',
        amount: 12000,
        type: 'EMI',
        isOverdue: false,
        onPay: () => payLoanEMI('seed_loan_1', true),
      },
      {
        id: 'pay-sip-1',
        name: 'Nifty 50 Index SIP',
        dueDate: '06 Nov 2026',
        amount: 10000,
        type: 'SIP',
        isOverdue: false,
        onPay: () => payInvestmentInstallment('seed_inv_1'),
      },
      {
        id: 'pay-fd-1',
        name: 'Post Office RD',
        dueDate: '09 Nov 2026',
        amount: 11000,
        type: 'Deposit',
        isOverdue: false,
        onPay: () => payInvestmentInstallment('seed_inv_2'),
      },
      {
        id: 'pay-lic-1',
        name: 'LIC Life Premium',
        dueDate: '28 Dec 2026',
        amount: 3032,
        type: 'Insurance',
        isOverdue: false,
        onPay: () => payInvestmentInstallment('seed_inv_3'),
      },
      {
        id: 'pay-card-1',
        name: 'HDFC Millennia Bill',
        dueDate: '20 Nov 2026',
        amount: 8940,
        type: 'Credit Card',
        isOverdue: false,
        onPay: () => payCardBill('seed_card_1', 8940),
      },
    ].slice(0, 5);
  }, [payLoanEMI, payInvestmentInstallment, payCardBill]);

  // Card 5: Recent Transactions (Last 5 with category, amount, date, mode)
  const recent5Transactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  // Handlers for month toggles
  const handleToggleMonth = (target: 'current' | 'next') => {
    setSelectedMonthToggle(target);
    if (target === 'current') {
      setActiveMonthKey('2026-10');
    } else {
      setActiveMonthKey('2026-11');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 max-w-7xl mx-auto pb-6">
      {/* 1. TOP HEADER (SCREENSHOT MATCHED) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-[#E6EAF0] p-4 sm:p-5 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">Dashboard</h1>
          <p className="text-xs sm:text-sm text-[#475569] font-medium mt-0.5">Your financial summary</p>
        </div>

        {/* Header Controls (Month Switcher, Dropdown, Monthly Summary, Refresh) */}
        <div className="flex items-center flex-wrap sm:flex-nowrap gap-2">
          {/* Current / Next Month Toggle */}
          <div className="flex items-center bg-[#F6F8FB] border border-[#E6EAF0] p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => handleToggleMonth('current')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeMonthKey === '2026-10'
                  ? 'bg-white text-[#0F172A] shadow-xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              Current Month
            </button>
            <button
              onClick={() => handleToggleMonth('next')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeMonthKey === '2026-11'
                  ? 'bg-white text-[#0F172A] shadow-xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              Next Month
            </button>
          </div>

          {/* Period Dropdown */}
          <div className="relative">
            <button
              onClick={() => setPeriodDropdownOpen(prev => !prev)}
              className="px-3 py-2 rounded-xl bg-white border border-[#E6EAF0] text-xs font-bold text-[#0F172A] hover:bg-zinc-50 flex items-center gap-1.5 shadow-2xs"
            >
              <Calendar className="w-3.5 h-3.5 text-[#4F46E5]" />
              <span>
                {activeMonthKey === '2026-10'
                  ? 'This Month'
                  : activeMonthKey === '2026-09'
                  ? 'Sep 2026'
                  : activeMonthKey === '2026-08'
                  ? 'Aug 2026'
                  : activeMonthKey === '2026-07'
                  ? 'Jul 2026'
                  : activeMonthKey === '2026-06'
                  ? 'Jun 2026'
                  : activeMonthKey === '2026-05'
                  ? 'May 2026'
                  : activeMonthKey === '2026-04'
                  ? 'Apr 2026'
                  : activeMonthKey}
              </span>
            </button>
            {periodDropdownOpen && (
              <div className="absolute right-0 top-11 w-52 max-h-72 overflow-y-auto rounded-xl bg-white border border-[#E6EAF0] p-1.5 shadow-xl z-50 text-xs space-y-0.5">
                {[
                  { key: '2026-11', label: 'Nov 2026' },
                  { key: '2026-10', label: 'Oct 2026 (Current)' },
                  { key: '2026-09', label: 'Sep 2026 (Imported)' },
                  { key: '2026-08', label: 'Aug 2026 (Imported)' },
                  { key: '2026-07', label: 'Jul 2026 (Imported)' },
                  { key: '2026-06', label: 'Jun 2026 (Imported)' },
                  { key: '2026-05', label: 'May 2026 (Imported)' },
                  { key: '2026-04', label: 'Apr 2026 (Imported)' },
                  { key: '2026-03', label: 'Mar 2026 (Combined)' },
                  { key: '2026-02', label: 'Feb 2026 (Combined)' },
                  { key: '2026-01', label: 'Jan 2026 (Combined)' },
                ].map(m => (
                  <button
                    key={m.key}
                    onClick={() => {
                      setActiveMonthKey(m.key);
                      setPeriodDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg font-medium transition flex items-center justify-between ${
                      activeMonthKey === m.key
                        ? 'bg-emerald-50 text-emerald-700 font-bold'
                        : 'text-[#0F172A] hover:bg-zinc-100'
                    }`}
                  >
                    <span>{m.label}</span>
                    {activeMonthKey === m.key && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Monthly Summary Button */}
          <button
            onClick={() => setActiveScreen('monthlySummary')}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E6EAF0] text-xs font-bold text-[#0F172A] hover:bg-zinc-50 flex items-center gap-1.5 shadow-2xs transition"
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Monthly Summary</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => showToast('Dashboard refreshed')}
            title="Refresh"
            className="p-2 rounded-xl bg-white border border-[#E6EAF0] text-[#475569] hover:text-[#0F172A] hover:bg-zinc-50 shadow-2xs transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. QUICK ACTIONS CARD (5 COLOURED BUTTONS + QUICK ADD PRE-FILLED CHIPS) */}
      <div className="bg-white border border-[#E6EAF0] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Quick Actions</h2>
          <span className="text-[11px] text-[#475569] font-medium hidden sm:inline">Tap to record a new entry</span>
        </div>

        {/* 5 Coloured Buttons: Income (green), Expense (red), Investment (purple), Transfer (blue), Pay Card (dark slate) */}
        {/* On Phone: one row of 5 icon buttons with short labels (no wrapping) */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
          {/* 1. Income (Green) */}
          <button
            onClick={() => openQuickAdd({ type: 'income', category: 'Salary' })}
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 px-1 sm:px-3 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-[11px] sm:text-xs shadow-xs transition active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Income</span>
          </button>

          {/* 2. Expense (Red) */}
          <button
            onClick={() => openQuickAdd({ type: 'expense', category: 'Grocery' })}
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 px-1 sm:px-3 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-[11px] sm:text-xs shadow-xs transition active:scale-[0.98]"
          >
            <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Expense</span>
          </button>

          {/* 3. Investment (Purple) */}
          <button
            onClick={() => openQuickAdd({ type: 'invest', category: 'Mutual Fund SIP' })}
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 px-1 sm:px-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-[11px] sm:text-xs shadow-xs transition active:scale-[0.98]"
          >
            <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Investment</span>
          </button>

          {/* 4. Transfer (Blue) */}
          <button
            onClick={() => openQuickAdd({ type: 'transfer', category: 'Account Transfer' })}
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 px-1 sm:px-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-[11px] sm:text-xs shadow-xs transition active:scale-[0.98]"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Transfer</span>
          </button>

          {/* 5. Pay Card (Dark Slate) */}
          <button
            onClick={() => openQuickAdd({ type: 'cardPayment', category: 'Credit Card Bill', mode: 'Bank' })}
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 px-1 sm:px-3 rounded-xl bg-[#334155] hover:bg-[#1E293B] text-white font-bold text-[11px] sm:text-xs shadow-xs transition active:scale-[0.98]"
          >
            <CardIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Pay Card</span>
          </button>
        </div>

        {/* QUICK ADD — PRE-FILLED, JUST ENTER AMOUNT */}
        <div className="pt-2 border-t border-zinc-100 space-y-2">
          <div className="text-[10px] font-bold tracking-wider text-[#94A3B8] uppercase">
            QUICK ADD — PRE-FILLED, JUST ENTER AMOUNT
          </div>

          {/* Chips in horizontally scrollable row on mobile, wrapping on desktop */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {quickAddChips.map((chip, idx) => (
              <button
                key={chip.category}
                onClick={() =>
                  openQuickAdd({
                    type: 'expense',
                    category: chip.category,
                    amount: chip.usualAmount,
                  })
                }
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#E6EAF0] bg-[#F6F8FB] hover:bg-white hover:border-[#4F46E5] text-xs font-semibold text-[#0F172A] whitespace-nowrap transition active:scale-95 shadow-2xs shrink-0"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                />
                <span>{chip.category}</span>
                <span className="text-[11px] font-mono text-[#475569]">{formatINR(chip.usualAmount)}</span>
                <span className="text-[10px] text-[#94A3B8] font-normal">{chip.timesUsed}x</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. SUMMARY BAND (BLUE → TEAL GRADIENT, WHITE TEXT) */}
      {/* 4 columns: Total Income (▲/▼ vs last month) · Total Expenses (Bank/Cash · Credit Card split, ▲/▼ vs last month) · Total Investments (% of income) · Available Balance (formula written under it) */}
      {/* Phone: 2x2 grid. Desktop: 4 columns */}
      <div className="rounded-2xl p-4 sm:p-6 bg-gradient-to-r from-blue-700 via-indigo-700 to-teal-600 text-white shadow-md">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Column 1: Total Income */}
          <div className="space-y-1">
            <div className="text-[11px] sm:text-xs font-semibold text-blue-100 uppercase tracking-wider">
              Total Income
            </div>
            <div className="font-mono font-black text-xl sm:text-2xl tracking-tight">
              {hideAmounts ? '••••••' : formatINR(curIncome)}
            </div>
            <div className="text-[11px] font-medium text-emerald-300 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              <span>+2.5% vs last month</span>
            </div>
          </div>

          {/* Column 2: Total Expenses */}
          <div className="space-y-1">
            <div className="text-[11px] sm:text-xs font-semibold text-blue-100 uppercase tracking-wider">
              Total Expenses
            </div>
            <div className="font-mono font-black text-xl sm:text-2xl tracking-tight">
              {hideAmounts ? '••••••' : formatINR(curSpending)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-blue-100 font-medium">
              Bank/Cash: {formatINR(bankCashExpenses)} · Card: {formatINR(cardExpenses)}
            </div>
            <div className="text-[10px] sm:text-[11px] font-medium text-emerald-300 flex items-center gap-0.5">
              <ArrowDownRight className="w-3 h-3" />
              <span>-30.0% vs last month</span>
            </div>
          </div>

          {/* Column 3: Total Investments */}
          <div className="space-y-1">
            <div className="text-[11px] sm:text-xs font-semibold text-blue-100 uppercase tracking-wider">
              Total Investments
            </div>
            <div className="font-mono font-black text-xl sm:text-2xl tracking-tight">
              {hideAmounts ? '••••••' : formatINR(curInvested)}
            </div>
            <div className="text-[11px] text-blue-100 font-medium">
              {investmentsPct}% of income
            </div>
          </div>

          {/* Column 4: Available Balance */}
          <div className="space-y-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-blue-400/30">
            <div className="text-[11px] sm:text-xs font-semibold text-blue-100 uppercase tracking-wider">
              Available Balance
            </div>
            <div className="font-mono font-black text-xl sm:text-2xl tracking-tight">
              {hideAmounts ? '••••••' : formatINR(bigAvailableBalance)}
            </div>
            <div className="text-[11px] text-blue-100 font-medium leading-tight">
              Income − Expenses − Investments
            </div>
            <div className="text-[10px] text-teal-200/90 font-medium leading-tight pt-0.5">
              Bank/Cash only (card bill not yet paid): {formatINR(bankCashAvailable)}
            </div>
          </div>
        </div>
      </div>

      {/* 4. EXACTLY 6 LIGHT CARDS BELOW THE SUMMARY BAND */}
      <div className="space-y-4 sm:space-y-5">
        {/* CARD 1: Monthly Overview — one bar chart: income vs expenses vs investments, last 6 months */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E6EAF0] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#0F172A] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#4F46E5]" />
                <span>Monthly Overview</span>
              </h3>
              <p className="text-xs text-[#475569]">Income vs Expenses vs Investments (Last 6 Months)</p>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-[#0F172A]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                Income
              </span>
              <span className="flex items-center gap-1.5 text-[#0F172A]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                Expenses
              </span>
              <span className="flex items-center gap-1.5 text-[#0F172A]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
                Investments
              </span>
            </div>
          </div>

          <div className="h-60 sm:h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly6Data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={val => `₹${val / 1000}k`}
                />
                <Tooltip
                  cursor={{ fill: '#F1F5F9', opacity: 0.5 }}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    color: '#0F172A',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08)',
                  }}
                  formatter={(val: any) => [formatINR(Number(val)), '']}
                />
                <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} name="Expenses" />
                <Bar dataKey="investments" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Investments" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CARD 2: Expense Breakdown (UPDATE 5) — Donut on top, high-low table below, phone chips, investments row */}
        <ExpenseBreakdownTable />

        {/* CARD 3: Budgets to watch — only budgets over or near their limit (max 5) with progress bars */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E6EAF0] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#0F172A] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Budgets to watch</span>
              </h3>
              <p className="text-xs text-[#475569]">Budgets over or near their monthly limit</p>
            </div>
            <button
              onClick={() => setActiveScreen('budget')}
              className="text-xs font-bold text-[#4F46E5] hover:underline flex items-center gap-1"
            >
              <span>View all budgets</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 pt-1">
            {budgetsToWatch.map(b => {
              const isOver = b.status === 'over';
              const isWarning = b.status === 'near' || b.percent >= 75;
              const barColor = isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500';

              return (
                <div key={b.name} className="p-3 rounded-xl bg-[#F6F8FB] border border-[#E6EAF0] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#0F172A]">{b.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[#475569]">
                        {formatINR(b.spent)} / {formatINR(b.limit)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isOver
                            ? 'bg-rose-100 text-rose-700'
                            : isWarning
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {b.percent.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} transition-all duration-300 rounded-full`}
                      style={{ width: `${Math.min(100, b.percent)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CARD 4: Upcoming payments — next 5 dues (EMI, SIP, bills, premiums), overdue first, with "Mark paid" */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E6EAF0] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#0F172A] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#4F46E5]" />
                <span>Upcoming payments</span>
              </h3>
              <p className="text-xs text-[#475569]">Next dues across EMI, SIP, bills, and cards</p>
            </div>
            <button
              onClick={() => setActiveScreen('calendar')}
              className="text-xs font-bold text-[#4F46E5] hover:underline flex items-center gap-1"
            >
              <span>View calendar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5 pt-1">
            {upcomingPayments.map(due => (
              <div
                key={due.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[#F6F8FB] border border-[#E6EAF0] gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#0F172A] truncate">{due.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-200 text-[#475569]">
                      {due.type}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#475569] font-medium mt-0.5">Due: {due.dueDate}</div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono font-bold text-xs text-[#0F172A]">{formatINR(due.amount)}</span>
                  <button
                    onClick={due.onPay}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 transition shadow-2xs active:scale-95"
                  >
                    <Check className="w-3 h-3" />
                    <span>Mark paid</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CARD 5: Recent transactions — last 5 with category, amount, date and mode */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E6EAF0] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#0F172A] flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#4F46E5]" />
                <span>Recent transactions</span>
              </h3>
              <p className="text-xs text-[#475569]">Last 5 transactions recorded</p>
            </div>
            <button
              onClick={() => setActiveScreen('entries')}
              className="text-xs font-bold text-[#4F46E5] hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 pt-1">
            {recent5Transactions.map(tx => {
              const isIncome = tx.type === 'income';
              const isInvest = tx.type === 'invest';
              const isTransfer = tx.type === 'transfer';
              const isCardPay = tx.type === 'cardPayment';

              const amountColor = isIncome
                ? 'text-[#16A34A]'
                : isInvest
                ? 'text-[#7C3AED]'
                : isTransfer
                ? 'text-[#2563EB]'
                : isCardPay
                ? 'text-[#334155]'
                : 'text-[#DC2626]';

              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-[#F6F8FB] border border-[#E6EAF0] text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#0F172A] truncate">{tx.category}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-200 text-[#475569]">
                        {tx.mode}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#94A3B8] font-medium">{tx.date}</div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`font-mono font-bold ${amountColor}`}>
                      {isIncome ? '+' : '-'}{formatINR(tx.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CARD 6: Snapshot row — 3 small cards: Net Worth · Loans outstanding · Investments value */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Snapshot A: Net Worth */}
          <div
            onClick={() => setActiveScreen('netWorth')}
            className="p-4 rounded-2xl bg-white border border-[#E6EAF0] shadow-xs hover:border-[#4F46E5] transition cursor-pointer space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">Net Worth</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#94A3B8]" />
            </div>
            <div className="font-mono font-black text-xl text-[#0F172A]">
              {activeMonthKey < '2026-10'
                ? '—'
                : hideAmounts
                ? '••••••'
                : formatShortINR(nwBreakdown.netWorth)}
            </div>
            <div className="text-[11px] text-[#475569] font-medium">
              {activeMonthKey < '2026-10'
                ? 'Not available before Oct 2026 opening balances'
                : `Assets ${formatShortINR(nwBreakdown.totalAssets)} · Liab ${formatShortINR(nwBreakdown.totalLiabilities)}`}
            </div>
          </div>

          {/* Snapshot B: Loans Outstanding */}
          <div
            onClick={() => setActiveScreen('loans')}
            className="p-4 rounded-2xl bg-white border border-[#E6EAF0] shadow-xs hover:border-[#4F46E5] transition cursor-pointer space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">Loans Outstanding</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#94A3B8]" />
            </div>
            <div className="font-mono font-black text-xl text-[#DC2626]">
              {activeMonthKey < '2026-08'
                ? '—'
                : hideAmounts
                ? '••••••'
                : formatShortINR(nwBreakdown.borrowedLoans)}
            </div>
            <div className="text-[11px] text-[#475569] font-medium">
              {activeMonthKey < '2026-08' ? 'ALL Bank started 13 Aug 2026' : 'Next EMI: 13 Nov (₹12,000)'}
            </div>
          </div>

          {/* Snapshot C: Investments Value */}
          <div
            onClick={() => setActiveScreen('wealth')}
            className="p-4 rounded-2xl bg-white border border-[#E6EAF0] shadow-xs hover:border-[#4F46E5] transition cursor-pointer space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">Investments Value</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#94A3B8]" />
            </div>
            <div className="font-mono font-black text-xl text-[#7C3AED]">
              {hideAmounts ? '••••••' : formatShortINR(nwBreakdown.investmentsValue)}
            </div>
            <div className="text-[11px] text-[#475569] font-medium">
              This month invested: {formatINR(curInvested)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
