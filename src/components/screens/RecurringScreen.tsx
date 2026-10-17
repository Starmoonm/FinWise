import React, { useState, useMemo } from 'react';
import {
  Repeat,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  CreditCard,
  Building,
  Calendar,
  Bell,
  Check,
  ChevronRight,
  ShieldAlert,
  Zap,
  Info,
  Layers,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { RecurringItem, RecurringFrequency, TransactionType } from '../../types';
import { formatINR, formatCompactINR } from '../../utils/formatters';
import { ConfirmDialog } from '../common/ConfirmDialog';

export const RecurringScreen: React.FC = () => {
  const {
    recurringItems,
    transactions,
    settings,
    loans,
    investments,
    todayDateStr,
    addOrUpdateRecurringItem,
    deleteRecurringItem,
    toggleRecurringAutoCreate,
    markRecurringPaid,
    showToast,
  } = useFinance();

  // Tab filter: All Recurring vs Subscriptions
  const [activeTab, setActiveTab] = useState<'all' | 'subscriptions'>('all');
  const [showDetectModal, setShowDetectModal] = useState(false);

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringItem | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  // Form inputs
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formIsEstimate, setFormIsEstimate] = useState(false);
  const [formType, setFormType] = useState<TransactionType>('expense');
  const [formCategory, setFormCategory] = useState('');
  const [formMode, setFormMode] = useState('Bank');
  const [formFrequency, setFormFrequency] = useState<RecurringFrequency>('monthly');
  const [formDay, setFormDay] = useState(1);
  const [formNextDate, setFormNextDate] = useState(todayDateStr);
  const [formEndDate, setFormEndDate] = useState('');
  const [formLinkedLoanId, setFormLinkedLoanId] = useState('');
  const [formLinkedInvestmentId, setFormLinkedInvestmentId] = useState('');
  const [formAutoCreate, setFormAutoCreate] = useState(false);
  const [formIsSubscription, setFormIsSubscription] = useState(false);
  const [formCancelReminder, setFormCancelReminder] = useState('');
  const [formNote, setFormNote] = useState('');

  // Income approximation from transactions or history
  const monthlyIncomeEstimate = useMemo(() => {
    const incomes = transactions.filter(t => t.type === 'income');
    if (incomes.length > 0) {
      const sum = incomes.reduce((acc, t) => acc + t.amount, 0);
      return Math.round(sum / 3) || 50000;
    }
    return 50000;
  }, [transactions]);

  // KPI Calculations
  const { totalMonthlyCommitments, commitmentIncomePercent, dueIn7DaysCount, totalSubsMonthly, totalSubsYearly } = useMemo(() => {
    let monthlyTotal = 0;
    let dueIn7 = 0;
    let subsMonthly = 0;

    const [y, m, d] = todayDateStr.split('-').map(Number);
    const todayEpoch = new Date(Date.UTC(y, m - 1, d)).getTime();
    const in7DaysEpoch = todayEpoch + 7 * 86400000;

    recurringItems.forEach(r => {
      if (!r.active) return;
      // Convert frequency to monthly equivalent
      let mWeight = 1;
      if (r.frequency === 'yearly') mWeight = 1 / 12;
      else if (r.frequency === 'quarterly') mWeight = 1 / 3;
      else if (r.frequency === 'half-yearly') mWeight = 1 / 6;
      else if (r.frequency === 'weekly') mWeight = 4.33;

      const monthlyEquiv = r.amount * mWeight;
      monthlyTotal += monthlyEquiv;

      if (r.isSubscription) {
        subsMonthly += monthlyEquiv;
      }

      // Check next due within 7 days
      if (r.nextDate) {
        const [ny, nm, nd] = r.nextDate.split('-').map(Number);
        const dueEpoch = new Date(Date.UTC(ny, nm - 1, nd)).getTime();
        if (dueEpoch >= todayEpoch && dueEpoch <= in7DaysEpoch) {
          dueIn7++;
        }
      }
    });

    const incomePct = monthlyIncomeEstimate > 0 ? Math.round((monthlyTotal / monthlyIncomeEstimate) * 100) : 0;

    return {
      totalMonthlyCommitments: Math.round(monthlyTotal),
      commitmentIncomePercent: incomePct,
      dueIn7DaysCount: dueIn7,
      totalSubsMonthly: Math.round(subsMonthly),
      totalSubsYearly: Math.round(subsMonthly * 12),
    };
  }, [recurringItems, todayDateStr, monthlyIncomeEstimate]);

  // Filter items
  const displayedItems = useMemo(() => {
    if (activeTab === 'subscriptions') {
      return recurringItems.filter(r => r.isSubscription);
    }
    return recurringItems;
  }, [recurringItems, activeTab]);

  // Open edit modal
  const openEditModal = (item: RecurringItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormAmount(String(item.amount));
    setFormIsEstimate(item.isEstimate || false);
    setFormType(item.type);
    setFormCategory(item.category);
    setFormMode(item.mode || 'Bank');
    setFormFrequency(item.frequency);
    setFormDay(item.day || 1);
    setFormNextDate(item.nextDate || todayDateStr);
    setFormEndDate(item.endDate || '');
    setFormLinkedLoanId(item.linkedLoanId || '');
    setFormLinkedInvestmentId(item.linkedInvestmentId || '');
    setFormAutoCreate(item.autoCreate || false);
    setFormIsSubscription(item.isSubscription || false);
    setFormCancelReminder(item.cancelReminder || '');
    setFormNote(item.note || '');
    setIsModalOpen(true);
  };

  const openAddModal = (presetSubscription: boolean = false) => {
    setEditingItem(null);
    setFormTitle('');
    setFormAmount('');
    setFormIsEstimate(false);
    setFormType('expense');
    setFormCategory(settings.expenseCategories[0] || 'Other');
    setFormMode('Bank');
    setFormFrequency('monthly');
    setFormDay(1);
    setFormNextDate(todayDateStr);
    setFormEndDate('');
    setFormLinkedLoanId('');
    setFormLinkedInvestmentId('');
    setFormAutoCreate(false);
    setFormIsSubscription(presetSubscription || activeTab === 'subscriptions');
    setFormCancelReminder('');
    setFormNote('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formAmount);
    if (!amt || amt <= 0 || !formTitle.trim()) return;

    addOrUpdateRecurringItem({
      ...(editingItem ? { id: editingItem.id } : {}),
      title: formTitle.trim(),
      amount: amt,
      isEstimate: formIsEstimate,
      type: formType,
      category: formCategory || 'Other',
      mode: formMode,
      frequency: formFrequency,
      day: formDay,
      nextDate: formNextDate,
      endDate: formEndDate ? formEndDate : null,
      linkedLoanId: formLinkedLoanId || undefined,
      linkedInvestmentId: formLinkedInvestmentId || undefined,
      autoCreate: formAutoCreate,
      isSubscription: formIsSubscription,
      cancelReminder: formCancelReminder ? formCancelReminder.trim() : null,
      note: formNote ? formNote.trim() : undefined,
      active: true,
    });

    setIsModalOpen(false);
  };

  // "Detect recurring" smart scanner: scans transactions for monthly repeats
  const detectedSuggestions = useMemo(() => {
    const existingCategories = new Set(recurringItems.map(r => r.category.toLowerCase()));
    const existingTitles = new Set(recurringItems.map(r => r.title.toLowerCase()));

    // Group transactions by category
    const byCategory: Record<string, typeof transactions> = {};
    transactions.forEach(t => {
      if (t.type === 'expense' || t.type === 'invest') {
        byCategory[t.category] = byCategory[t.category] || [];
        byCategory[t.category].push(t);
      }
    });

    const suggestions: Array<{
      category: string;
      avgAmount: number;
      count: number;
      monthsCount: number;
      mode: string;
      suggestedTitle: string;
      type: TransactionType;
    }> = [];

    Object.entries(byCategory).forEach(([cat, txs]) => {
      // Find how many distinct months this category appeared in
      const months = new Set(txs.map(t => t.date.slice(0, 7)));
      if (months.size >= 2 || txs.length >= 2) {
        const sum = txs.reduce((acc, t) => acc + t.amount, 0);
        const avg = Math.round(sum / txs.length);
        const modeCount: Record<string, number> = {};
        txs.forEach(t => {
          modeCount[t.mode] = (modeCount[t.mode] || 0) + 1;
        });
        const commonMode = Object.entries(modeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Bank';

        // Check if already in recurring
        const alreadyCovered =
          existingCategories.has(cat.toLowerCase()) ||
          existingTitles.has(cat.toLowerCase()) ||
          existingTitles.has(`Monthly ${cat}`.toLowerCase());

        suggestions.push({
          category: cat,
          avgAmount: avg,
          count: txs.length,
          monthsCount: months.size,
          mode: commonMode,
          suggestedTitle: cat,
          type: txs[0].type,
        });
      }
    });

    // Sort by frequency / count
    return suggestions.sort((a, b) => b.count - a.count);
  }, [transactions, recurringItems]);

  const handleAddDetected = (sug: typeof detectedSuggestions[0]) => {
    addOrUpdateRecurringItem({
      title: sug.suggestedTitle,
      amount: sug.avgAmount,
      type: sug.type,
      category: sug.category,
      mode: sug.mode,
      frequency: 'monthly',
      day: 1,
      nextDate: `${todayDateStr.slice(0, 8)}01`,
      autoCreate: false,
      active: true,
      note: `Auto-detected from ${sug.count} past entries`,
    });
    showToast(`Added ${sug.suggestedTitle} to recurring items`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3.5 sm:px-6 py-4 pb-24 md:pb-8">
      {/* Header Row: Title, one-line description, primary actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            <span>Recurring & AutoPay</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              {recurringItems.length} active
            </span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Fixed monthly commitments, AutoPay mandates, subscriptions, and smart due date execution
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Detect recurring scanner button */}
          <button
            onClick={() => setShowDetectModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-xs transition"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Detect Recurring ({detectedSuggestions.length} found)</span>
          </button>

          <button
            onClick={() => openAddModal(false)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Recurring</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Total Monthly Commitments */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Monthly Commitments
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-zinc-900 dark:text-zinc-100 font-mono">
              {formatINR(totalMonthlyCommitments)}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            {commitmentIncomePercent}% of monthly income (~{formatCompactINR(monthlyIncomeEstimate)})
          </span>
        </div>

        {/* 2. Dues in Next 7 Days */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Due in 7 Days
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {dueIn7DaysCount} items
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            Upcoming payments require attention
          </span>
        </div>

        {/* 3. Subscriptions Total */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Subscriptions Monthly
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-zinc-900 dark:text-zinc-100 font-mono">
              {formatINR(totalSubsMonthly)}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            Yearly: {formatINR(totalSubsYearly)}
          </span>
        </div>

        {/* 4. Auto-Create Status */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            AutoPay Mandates
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {recurringItems.filter(r => r.autoCreate).length} / {recurringItems.length}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            Automatic entry creation on due date
          </span>
        </div>
      </div>

      {/* Tabs Switcher: All Recurring vs Subscriptions */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>All Recurring ({recurringItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'subscriptions'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Subscriptions ({recurringItems.filter(r => r.isSubscription).length})</span>
          </button>
        </div>

        <span className="text-xs text-zinc-400 hidden sm:inline">
          Seed items initialized per Message 2 with Auto-create OFF
        </span>
      </div>

      {/* Recurring Items List / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedItems.map(item => {
          const isOverdue = item.nextDate < todayDateStr;
          const isDueToday = item.nextDate === todayDateStr;

          return (
            <div
              key={item.id}
              className={`p-5 rounded-2xl bg-white dark:bg-zinc-900 border transition shadow-xs flex flex-col justify-between ${
                isOverdue
                  ? 'border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-200 dark:ring-rose-950'
                  : isDueToday
                  ? 'border-amber-300 dark:border-amber-900/60'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="space-y-3">
                {/* Header: Title, Category, Amount */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">{item.title}</h3>
                      {item.isSubscription && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          Sub
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-500 mt-0.5 block">
                      {item.category} · {item.mode || 'Bank'} · {item.frequency}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-black font-mono text-zinc-900 dark:text-zinc-100 block">
                      {item.isEstimate ? '≈ ' : ''}
                      {formatINR(item.amount)}
                    </span>
                    <span className="text-[10px] font-medium text-zinc-400 capitalize">
                      {item.frequency}
                    </span>
                  </div>
                </div>

                {/* Status, Linked info, and Due date */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {/* Due Status Chip */}
                  {isOverdue ? (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Overdue ({item.nextDate})</span>
                    </span>
                  ) : isDueToday ? (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                      <Clock className="w-3 h-3" />
                      <span>Due Today!</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      <Calendar className="w-3 h-3 text-zinc-400" />
                      <span>Next: {item.nextDate}</span>
                    </span>
                  )}

                  {item.linkedLoanId && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      Linked Loan
                    </span>
                  )}
                  {item.linkedInvestmentId && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      Linked Investment
                    </span>
                  )}
                </div>

                {/* Subscriptions extras */}
                {item.isSubscription && (
                  <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between text-zinc-500">
                      <span>Yearly cost:</span>
                      <strong className="text-zinc-900 dark:text-zinc-100 font-mono">
                        {formatINR(item.amount * 12)}
                      </strong>
                    </div>
                    {item.lastChargedDate && (
                      <div className="flex items-center justify-between text-zinc-500">
                        <span>Last charged:</span>
                        <span>{item.lastChargedDate}</span>
                      </div>
                    )}
                    {item.cancelReminder && (
                      <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
                        <Bell className="w-3 h-3 shrink-0" />
                        <span>Reminder: {item.cancelReminder}</span>
                      </div>
                    )}
                  </div>
                )}

                {item.note && (
                  <p className="text-[11px] text-zinc-500 italic bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded-lg">
                    {item.note}
                  </p>
                )}
              </div>

              {/* Action Bar */}
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                {/* Auto-create Toggle */}
                <button
                  onClick={() => toggleRecurringAutoCreate(item.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition ${
                    item.autoCreate
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-zinc-50 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 hover:text-zinc-800'
                  }`}
                  title="When ON, auto-creates the transaction on due date when the app opens"
                >
                  <Zap className={`w-3.5 h-3.5 ${item.autoCreate ? 'text-emerald-600' : 'text-zinc-400'}`} />
                  <span>Auto-create {item.autoCreate ? 'ON' : 'OFF'}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {/* Mark Paid One-Click Action */}
                  <button
                    onClick={() => markRecurringPaid(item.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                    title="Creates the transaction for this due date and advances to next cycle"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isOverdue || isDueToday ? 'Due – Mark paid' : 'Mark paid'}</span>
                  </button>

                  <button
                    onClick={() => openEditModal(item)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setDeleteItemId(item.id)}
                    className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detect Recurring Modal */}
      {showDetectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Detected Recurring Expenses</span>
                </h3>
                <p className="text-xs text-zinc-500">
                  Scanned transactions for repeating monthly patterns (found {detectedSuggestions.length} candidates)
                </p>
              </div>

              <button
                onClick={() => setShowDetectModal(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-zinc-100 dark:divide-zinc-800 pr-1">
              {detectedSuggestions.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-xs">
                  No new recurring patterns detected yet.
                </div>
              ) : (
                detectedSuggestions.map((sug, i) => (
                  <div key={i} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{sug.category}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                          {sug.count} entries across {sug.monthsCount} months
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-500 mt-0.5 block">
                        Average: {formatINR(sug.avgAmount)} · Default mode: {sug.mode}
                      </span>
                    </div>

                    <button
                      onClick={() => handleAddDetected(sug)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add as Recurring</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 flex justify-end">
              <button
                onClick={() => setShowDetectModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Recurring Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {editingItem ? 'Edit Recurring Item' : 'New Recurring Item'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">Title</label>
                <input
                  type="text"
                  placeholder="e.g. ALL Bank EMI, MOM, Milk, Netflix..."
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 10000"
                    value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">Frequency</label>
                  <select
                    value={formFrequency}
                    onChange={e => setFormFrequency(e.target.value as RecurringFrequency)}
                    className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="half-yearly">Half-yearly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              {/* Estimate toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="estimate-toggle"
                  checked={formIsEstimate}
                  onChange={e => setFormIsEstimate(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600"
                />
                <label htmlFor="estimate-toggle" className="text-zinc-700 dark:text-zinc-300 font-medium">
                  Amount is an estimate (display as ≈ ₹{formAmount || '0'}, e.g. Milk bill)
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">Category</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  >
                    {settings.expenseCategories.map((c, idx) => (
                      <option key={`rec_exp_${c}_${idx}`} value={c}>
                        {c}
                      </option>
                    ))}
                    {settings.incomeCategories.map((c, idx) => (
                      <option key={`rec_inc_${c}_${idx}`} value={c}>
                        [Income] {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">Payment Mode</label>
                  <select
                    value={formMode}
                    onChange={e => setFormMode(e.target.value)}
                    className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  >
                    {settings.paymentModes.map(m => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">Next Due Date</label>
                  <input
                    type="date"
                    value={formNextDate}
                    onChange={e => setFormNextDate(e.target.value)}
                    className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">Day of Month</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formDay}
                    onChange={e => setFormDay(Number(e.target.value))}
                    className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              {/* Linked Loan or Investment */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">Linked Loan (Optional)</label>
                  <select
                    value={formLinkedLoanId}
                    onChange={e => setFormLinkedLoanId(e.target.value)}
                    className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="">None</option>
                    {loans.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.name} (EMI: {formatINR(l.emi)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">Linked Investment (Optional)</label>
                  <select
                    value={formLinkedInvestmentId}
                    onChange={e => setFormLinkedInvestmentId(e.target.value)}
                    className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="">None</option>
                    {investments.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name} (Installment: {formatINR(inv.installment)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subscription Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="sub-toggle"
                  checked={formIsSubscription}
                  onChange={e => setFormIsSubscription(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500"
                />
                <label htmlFor="sub-toggle" className="text-zinc-700 dark:text-zinc-300 font-medium">
                  Classify as Subscription (Track renewal & cancel reminder)
                </label>
              </div>

              {formIsSubscription && (
                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">Cancel Reminder / Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Cancel 3 days before renewal if not utilized"
                    value={formCancelReminder}
                    onChange={e => setFormCancelReminder(e.target.value)}
                    className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              )}

              {/* Auto-create Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="auto-create-toggle"
                  checked={formAutoCreate}
                  onChange={e => setFormAutoCreate(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600"
                />
                <label htmlFor="auto-create-toggle" className="text-zinc-700 dark:text-zinc-300 font-medium">
                  Auto-create entry on due date when app opens (default OFF)
                </label>
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Bank mandate ID, account number..."
                  value={formNote}
                  onChange={e => setFormNote(e.target.value)}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs transition"
                >
                  Save Recurring Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteItemId)}
        title="Delete Recurring Item"
        message="Are you sure you want to delete this recurring schedule? Past created entries will remain safe."
        confirmLabel="Delete"
        isDestructive
        onConfirm={() => {
          if (deleteItemId) {
            deleteRecurringItem(deleteItemId);
            setDeleteItemId(null);
          }
        }}
        onCancel={() => setDeleteItemId(null)}
      />
    </div>
  );
};
