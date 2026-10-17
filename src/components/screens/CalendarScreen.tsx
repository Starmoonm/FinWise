import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  CreditCard,
  Building,
  Target,
  Shield,
  Check,
  List,
  Grid3X3,
  X,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Transaction, RecurringItem } from '../../types';
import { formatINR, formatCompactINR } from '../../utils/formatters';

export const CalendarScreen: React.FC = () => {
  const {
    activeMonthKey,
    todayDateStr,
    transactions,
    recurringItems,
    loans,
    investments,
    goals,
    insurance,
    setQuickAddOpen,
    markRecurringPaid,
    goToPrevMonth,
    goToNextMonth,
  } = useFinance();

  // Mode: Month Grid vs Agenda View
  const [viewMode, setViewMode] = useState<'grid' | 'agenda'>('grid');

  // Selected Day State for Day Details Drawer / Popover
  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);
  const [isDayDrawerOpen, setIsDayDrawerOpen] = useState(false);

  // Parse Year and Month
  const [currentYear, currentMonth] = useMemo(() => {
    const [y, m] = activeMonthKey.split('-').map(Number);
    return [y, m];
  }, [activeMonthKey]);

  // Calendar Grid Days Calculation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
    const startDayOfWeek = firstDayOfMonth.getUTCDay(); // 0 is Sunday
    const daysInMonth = new Date(Date.UTC(currentYear, currentMonth, 0)).getUTCDate();

    // Previous month filler days
    const prevMonthDaysCount = new Date(Date.UTC(currentYear, currentMonth - 1, 0)).getUTCDate();
    const days: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // Fill preceding days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDaysCount - i;
      const prevM = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevY = currentMonth === 1 ? currentYear - 1 : currentYear;
      const dStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr: dStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dStr === todayDateStr,
      });
    }

    // Fill current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr: dStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dStr === todayDateStr,
      });
    }

    // Fill succeeding days to complete grid (multiples of 7, up to 35 or 42)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextM = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextY = currentMonth === 12 ? currentYear + 1 : currentYear;
      const dStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr: dStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dStr === todayDateStr,
      });
    }

    return days;
  }, [currentYear, currentMonth, todayDateStr]);

  // Aggregate daily expenses and identify dues for each day
  const dailyDataMap = useMemo(() => {
    const map: Record<
      string,
      {
        totalSpent: number;
        totalIncome: number;
        entriesCount: number;
        dues: Array<{
          id: string;
          title: string;
          amount: number;
          kind: 'emi' | 'sip' | 'bill' | 'premium' | 'goal';
          isOverdue?: boolean;
          recurringId?: string;
        }>;
      }
    > = {};

    // 1. Transaction spending
    transactions.forEach(t => {
      map[t.date] = map[t.date] || { totalSpent: 0, totalIncome: 0, entriesCount: 0, dues: [] };
      if (t.type === 'expense') {
        map[t.date].totalSpent += t.amount;
      } else if (t.type === 'income') {
        map[t.date].totalIncome += t.amount;
      }
      map[t.date].entriesCount += 1;
    });

    // 2. Scheduled Recurring dues
    recurringItems.forEach(r => {
      if (!r.active || !r.nextDate) return;
      const dStr = r.nextDate;
      map[dStr] = map[dStr] || { totalSpent: 0, totalIncome: 0, entriesCount: 0, dues: [] };

      let kind: 'emi' | 'sip' | 'bill' | 'premium' | 'goal' = 'bill';
      if (r.linkedLoanId || r.category.toLowerCase().includes('emi')) kind = 'emi';
      else if (r.linkedInvestmentId || r.type === 'invest') kind = 'sip';
      else if (r.frequency === 'yearly' || r.category.toLowerCase().includes('insurance')) kind = 'premium';

      map[dStr].dues.push({
        id: r.id,
        title: r.title,
        amount: r.amount,
        kind,
        isOverdue: dStr < todayDateStr,
        recurringId: r.id,
      });
    });

    // 3. Goal Target Dates
    goals.forEach(g => {
      if (g.targetDate) {
        map[g.targetDate] = map[g.targetDate] || { totalSpent: 0, totalIncome: 0, entriesCount: 0, dues: [] };
        map[g.targetDate].dues.push({
          id: g.id,
          title: `Goal: ${g.name}`,
          amount: g.target - g.saved,
          kind: 'goal',
          isOverdue: g.targetDate < todayDateStr,
        });
      }
    });

    // 4. Insurance Renewal Dates
    insurance.forEach(ins => {
      if (ins.renewalDate) {
        map[ins.renewalDate] = map[ins.renewalDate] || { totalSpent: 0, totalIncome: 0, entriesCount: 0, dues: [] };
        map[ins.renewalDate].dues.push({
          id: ins.id,
          title: `Insurance: ${ins.name}`,
          amount: ins.yearlyPremium,
          kind: 'premium',
          isOverdue: ins.renewalDate < todayDateStr,
        });
      }
    });

    return map;
  }, [transactions, recurringItems, goals, insurance, todayDateStr]);

  // Max daily spending for calculating heat shades
  const maxDailySpend = useMemo(() => {
    let max = 1000;
    Object.values(dailyDataMap).forEach(d => {
      if (d.totalSpent > max) max = d.totalSpent;
    });
    return max;
  }, [dailyDataMap]);

  // Heat shade helper
  const getHeatShadeClass = (spent: number) => {
    if (spent <= 0) return '';
    const ratio = spent / maxDailySpend;
    if (ratio > 0.6) return 'bg-rose-500/15 border-rose-300';
    if (ratio > 0.3) return 'bg-amber-500/15 border-amber-300';
    if (ratio > 0.1) return 'bg-emerald-500/15 border-emerald-300';
    return 'bg-emerald-500/5 border-emerald-200';
  };

  // Agenda View: 60 Days upcoming dues + Overdue pinned on top
  const { overdueItems, upcomingAgendaItems } = useMemo(() => {
    const overdue: Array<{
      id: string;
      title: string;
      amount: number;
      dueDate: string;
      kind: 'emi' | 'sip' | 'bill' | 'premium' | 'goal';
      recurringId?: string;
    }> = [];

    const upcoming: Array<{
      id: string;
      title: string;
      amount: number;
      dueDate: string;
      kind: 'emi' | 'sip' | 'bill' | 'premium' | 'goal';
      recurringId?: string;
    }> = [];

    const [y, m, d] = todayDateStr.split('-').map(Number);
    const todayEpoch = new Date(Date.UTC(y, m - 1, d)).getTime();
    const in60DaysEpoch = todayEpoch + 60 * 86400000;

    recurringItems.forEach(r => {
      if (!r.active || !r.nextDate) return;
      const [ny, nm, nd] = r.nextDate.split('-').map(Number);
      const dueEpoch = new Date(Date.UTC(ny, nm - 1, nd)).getTime();

      let kind: 'emi' | 'sip' | 'bill' | 'premium' | 'goal' = 'bill';
      if (r.linkedLoanId || r.category.toLowerCase().includes('emi')) kind = 'emi';
      else if (r.linkedInvestmentId || r.type === 'invest') kind = 'sip';
      else if (r.frequency === 'yearly' || r.category.toLowerCase().includes('insurance')) kind = 'premium';

      const item = {
        id: r.id,
        title: r.title,
        amount: r.amount,
        dueDate: r.nextDate,
        kind,
        recurringId: r.id,
      };

      if (dueEpoch < todayEpoch) {
        overdue.push(item);
      } else if (dueEpoch <= in60DaysEpoch) {
        upcoming.push(item);
      }
    });

    // Sort upcoming by due date
    upcoming.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    return {
      overdueItems: overdue,
      upcomingAgendaItems: upcoming,
    };
  }, [recurringItems, todayDateStr]);

  // Selected Day Details
  const selectedDayEntries = useMemo(() => {
    return transactions.filter(t => t.date === selectedDate);
  }, [transactions, selectedDate]);

  const selectedDayDues = useMemo(() => {
    return dailyDataMap[selectedDate]?.dues || [];
  }, [dailyDataMap, selectedDate]);

  const selectedDayTotalSpend = useMemo(() => {
    return selectedDayEntries
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [selectedDayEntries]);

  // Handle Day Click
  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setIsDayDrawerOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3.5 sm:px-6 py-4 pb-24 md:pb-8">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            <span>Financial Calendar</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
              {activeMonthKey}
            </span>
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Spending heat-map, scheduled SIPs, EMIs, bill dues, and 60-day cash agenda
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Month Stepper */}
          <div className="flex items-center bg-white border border-zinc-200 rounded-xl p-0.5 shadow-xs">
            <button
              onClick={goToPrevMonth}
              className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-lg transition"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-bold text-zinc-800 min-w-[70px] text-center">
              {activeMonthKey}
            </span>
            <button
              onClick={goToNextMonth}
              className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-lg transition"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* View Mode Toggle: Grid vs Agenda */}
          <div className="flex items-center bg-zinc-100 p-0.5 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'grid'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>Month Grid</span>
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'agenda'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>60-Day Agenda ({upcomingAgendaItems.length + overdueItems.length})</span>
            </button>
          </div>

          <button
            onClick={() => setQuickAddOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>＋ Add Entry</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Overdue Items */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Overdue Dues
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className={`text-xl font-black font-mono ${
                overdueItems.length > 0 ? 'text-rose-600' : 'text-zinc-900'
              }`}
            >
              {overdueItems.length} items
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            {overdueItems.length > 0
              ? `Total ${formatINR(overdueItems.reduce((acc, i) => acc + i.amount, 0))} pending`
              : 'All scheduled dues up to date'}
          </span>
        </div>

        {/* 2. Upcoming in 60 Days */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Next 60 Days
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-zinc-900 font-mono">
              {upcomingAgendaItems.length} dues
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            Total {formatCompactINR(upcomingAgendaItems.reduce((acc, i) => acc + i.amount, 0))} commitment
          </span>
        </div>

        {/* 3. Heat Peak Spend */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Peak Day Spending
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-zinc-900 font-mono">
              {formatINR(maxDailySpend)}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            Maximum single day outflow
          </span>
        </div>

        {/* 4. Active Calendar Month */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Today
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-emerald-600 font-mono">
              {todayDateStr}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            Tap any date to inspect transactions
          </span>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'grid' ? (
        <div className="p-4 sm:p-6 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-4">
          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-200">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Month Calendar Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarDays.map((cell, idx) => {
              const data = dailyDataMap[cell.dateStr];
              const spent = data?.totalSpent || 0;
              const dues = data?.dues || [];
              const hasDues = dues.length > 0;
              const heatClass = getHeatShadeClass(spent);
              const isSelected = selectedDate === cell.dateStr;

              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(cell.dateStr)}
                  className={`min-h-[75px] sm:min-h-[92px] p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                    cell.isCurrentMonth
                      ? 'bg-zinc-50/60'
                      : 'bg-zinc-100/40 opacity-40'
                  } ${
                    cell.isToday
                      ? 'ring-2 ring-emerald-500 font-bold'
                      : 'hover:border-zinc-400'
                  } ${
                    isSelected ? 'ring-2 ring-zinc-900 shadow-md' : ''
                  } ${heatClass}`}
                >
                  {/* Top: Day number + badges */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-bold ${
                        cell.isToday
                          ? 'text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full'
                          : cell.isCurrentMonth
                          ? 'text-zinc-800'
                          : 'text-zinc-400'
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    {/* Dues indicators */}
                    {hasDues && (
                      <div className="flex items-center gap-0.5">
                        {dues.some(d => d.kind === 'emi') && (
                          <span
                            title="Loan EMI Due"
                            className="w-2 h-2 rounded-full bg-blue-500 shrink-0"
                          />
                        )}
                        {dues.some(d => d.kind === 'sip') && (
                          <span
                            title="SIP / Investment Due"
                            className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"
                          />
                        )}
                        {dues.some(d => d.kind === 'premium') && (
                          <span
                            title="Insurance Premium Due"
                            className="w-2 h-2 rounded-full bg-purple-500 shrink-0"
                          />
                        )}
                        {dues.some(d => d.kind === 'bill') && (
                          <span
                            title="Bill / Subscription Due"
                            className="w-2 h-2 rounded-full bg-amber-500 shrink-0"
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Middle / Bottom: Spent total */}
                  <div className="mt-1">
                    {spent > 0 ? (
                      <span className="text-[10px] sm:text-xs font-black font-mono text-zinc-900 block truncate">
                        {formatCompactINR(spent)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-400 invisible">—</span>
                    )}

                    {hasDues && (
                      <span className="text-[9px] font-semibold text-amber-700 truncate block">
                        {dues.length} due
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-zinc-200 text-[11px] text-zinc-500">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-zinc-700">Dues Legend:</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> EMI
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> SIP
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-500" /> Premium
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Bills
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span>Heat shade: Light (Low spend) → Dark (High spend)</span>
            </div>
          </div>
        </div>
      ) : (
        /* Agenda View: Next 60 days upcoming dues + Overdue pinned on top */
        <div className="space-y-4">
          {/* Overdue Section (Pinned on top in red with "Mark paid") */}
          {overdueItems.length > 0 && (
            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-300 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Overdue Items ({overdueItems.length})</span>
                </h3>
                <span className="text-xs font-bold font-mono text-rose-700">
                  Total: {formatINR(overdueItems.reduce((acc, i) => acc + i.amount, 0))}
                </span>
              </div>

              <div className="divide-y divide-rose-200/60">
                {overdueItems.map(item => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-rose-900">{item.title}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-200 text-rose-800">
                          Due {item.dueDate}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-black text-rose-700 block mt-0.5">
                        {formatINR(item.amount)}
                      </span>
                    </div>

                    {item.recurringId && (
                      <button
                        onClick={() => markRecurringPaid(item.recurringId!)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark paid</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 60-Day Timeline */}
          <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-zinc-900">
              Upcoming Commitments (Next 60 Days)
            </h3>

            {upcomingAgendaItems.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 text-xs">
                No upcoming dues scheduled in the next 60 days.
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {upcomingAgendaItems.map(item => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 flex flex-col items-center justify-center font-mono">
                        <span className="text-[10px] text-zinc-500 uppercase leading-none">
                          {item.dueDate.slice(5, 7)}/
                        </span>
                        <span className="text-sm font-black text-zinc-900 leading-none">
                          {item.dueDate.slice(8, 10)}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-900">{item.title}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-600 capitalize">
                            {item.kind}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-500 mt-0.5 block">
                          Due date: {item.dueDate}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-sm text-zinc-900">
                        {formatINR(item.amount)}
                      </span>

                      {item.recurringId && (
                        <button
                          onClick={() => markRecurringPaid(item.recurringId!, item.dueDate)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Pay Now</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Day Details Drawer / Popover Modal */}
      {isDayDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-600/30 backdrop-blur-xs">
          <div className="w-full max-w-md max-h-[85vh] flex flex-col rounded-2xl bg-white border border-zinc-200 p-5 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-emerald-600" />
                  <span>{selectedDate}</span>
                </h3>
                <span className="text-xs text-zinc-500">
                  Total spent: <strong className="text-zinc-900">{formatINR(selectedDayTotalSpend)}</strong>
                </span>
              </div>

              <button
                onClick={() => setIsDayDrawerOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content: Scheduled Dues + Entries */}
            <div className="overflow-y-auto flex-1 space-y-4 text-xs pr-1">
              {/* Scheduled Dues on this date */}
              {selectedDayDues.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-zinc-500 uppercase tracking-wider block text-[10px]">
                    Scheduled Dues on this Date
                  </span>
                  <div className="space-y-1.5">
                    {selectedDayDues.map((due, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-amber-900 block">{due.title}</span>
                          <span className="text-[10px] text-amber-700 capitalize">
                            {due.kind} · Due {selectedDate}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-900">
                            {formatINR(due.amount)}
                          </span>
                          {due.recurringId && (
                            <button
                              onClick={() => markRecurringPaid(due.recurringId!, selectedDate)}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition"
                            >
                              Mark paid
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transactions on this date */}
              <div className="space-y-2">
                <span className="font-bold text-zinc-500 uppercase tracking-wider block text-[10px]">
                  Entries on this Date ({selectedDayEntries.length})
                </span>

                {selectedDayEntries.length === 0 ? (
                  <p className="text-zinc-400 py-3 text-center italic">No transactions recorded on this day.</p>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {selectedDayEntries.map(tx => (
                      <div key={tx.id} className="py-2 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-zinc-900 block">{tx.category}</span>
                          <span className="text-[11px] text-zinc-500">
                            {tx.mode} {tx.note ? `· ${tx.note}` : ''}
                          </span>
                        </div>
                        <span
                          className={`font-mono font-bold ${
                            tx.type === 'expense'
                              ? 'text-rose-600'
                              : tx.type === 'income'
                              ? 'text-emerald-600'
                              : 'text-blue-600'
                          }`}
                        >
                          {tx.type === 'expense' ? '− ' : '+ '}
                          {formatINR(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer with ＋ Add Entry button */}
            <div className="pt-3 border-t border-zinc-200 flex items-center justify-between">
              <button
                onClick={() => setIsDayDrawerOpen(false)}
                className="px-4 py-2 rounded-xl border border-zinc-300 text-xs font-semibold hover:bg-zinc-100 transition"
              >
                Close
              </button>

              <button
                onClick={() => {
                  setIsDayDrawerOpen(false);
                  setQuickAddOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>＋ Add Entry for {selectedDate}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
