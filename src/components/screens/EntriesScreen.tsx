import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Copy,
  Trash2,
  Edit2,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  CreditCard as CardIcon,
  Repeat,
  Calendar,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Transaction, TransactionType, RecurringTransaction } from '../../types';
import { formatINR, formatDateKolkata } from '../../utils/formatters';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { QuickAddModal } from '../common/QuickAddModal';
import { generateDueTransactions } from '../../utils/recurring';

export const EntriesScreen: React.FC = () => {
  const {
    transactions,
    activeMonthKey,
    todayDateStr,
    settings,
    deleteTransaction,
    duplicateTransaction,
    addOrUpdateTransaction,
  } = useFinance();

  // Tab: 'entries' | 'recurring'
  const [activeTab, setActiveTab] = useState<'entries' | 'recurring'>('entries');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMode, setSelectedMode] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>(activeMonthKey);

  // Modals state
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Recurring transactions state
  const [recurringRules, setRecurringRules] = useState<RecurringTransaction[]>(() => {
    const saved = localStorage.getItem('mk_recurring_rules');
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 'rec_salary',
            title: 'Monthly Salary',
            amount: 82000,
            type: 'income',
            category: 'Salary',
            mode: 'Bank',
            frequency: 'monthly',
            startDate: '2026-10-01',
            active: true,
            note: 'Monthly regular salary credit',
          },
          {
            id: 'rec_sip',
            title: 'Mutual Fund SIP',
            amount: 10000,
            type: 'invest',
            category: 'INVEST',
            mode: 'Bank',
            frequency: 'monthly',
            startDate: '2026-10-06',
            active: true,
            note: 'SIP Auto-debit',
          },
        ];
  });

  const saveRecurringRules = (rules: RecurringTransaction[]) => {
    setRecurringRules(rules);
    localStorage.setItem('mk_recurring_rules', JSON.stringify(rules));
  };

  // Add Recurring Rule Modal state
  const [isAddRecurringOpen, setIsAddRecurringOpen] = useState(false);
  const [newRecTitle, setNewRecTitle] = useState('');
  const [newRecAmount, setNewRecAmount] = useState('');
  const [newRecType, setNewRecType] = useState<TransactionType>('expense');
  const [newRecCategory, setNewRecCategory] = useState('EMI');
  const [newRecMode, setNewRecMode] = useState('Bank');
  const [newRecFreq, setNewRecFreq] = useState<RecurringTransaction['frequency']>('monthly');
  const [newRecStartDate, setNewRecStartDate] = useState(todayDateStr);
  const [newRecEndDate, setNewRecEndDate] = useState('');
  const [newRecNote, setNewRecNote] = useState('');

  // Process due recurring transactions
  const processRecurring = () => {
    let createdCount = 0;
    const updatedRules = recurringRules.map(rule => {
      const { transactions: newTx, lastDate } = generateDueTransactions(rule, todayDateStr);
      if (newTx.length > 0) {
        newTx.forEach(t => {
          // Check if already exists to avoid duplicates
          if (!transactions.some(existing => existing.id === t.id)) {
            addOrUpdateTransaction(t);
            createdCount++;
          }
        });
      }
      return { ...rule, lastProcessedDate: lastDate };
    });
    saveRecurringRules(updatedRules);
    return createdCount;
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Month
      if (monthFilter !== 'all' && !t.date.startsWith(monthFilter)) {
        return false;
      }
      // Type
      if (selectedType !== 'all' && t.type !== selectedType) {
        return false;
      }
      // Category
      if (selectedCategory !== 'all' && t.category !== selectedCategory) {
        return false;
      }
      // Mode
      if (selectedMode !== 'all' && t.mode !== selectedMode) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const catMatch = t.category.toLowerCase().includes(q);
        const noteMatch = (t.note || '').toLowerCase().includes(q);
        const modeMatch = (t.mode || '').toLowerCase().includes(q);
        const amountMatch = String(t.amount).includes(q);
        if (!catMatch && !noteMatch && !modeMatch && !amountMatch) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, monthFilter, selectedType, selectedCategory, selectedMode, searchQuery]);

  // Group by date with day totals
  const groupedByDate = useMemo(() => {
    const groups: Record<
      string,
      { date: string; dayTotalSpending: number; dayTotalIncome: number; items: Transaction[] }
    > = {};

    // Sort transactions newest to oldest
    const sorted = [...filteredTransactions].sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    for (const t of sorted) {
      if (!groups[t.date]) {
        groups[t.date] = {
          date: t.date,
          dayTotalSpending: 0,
          dayTotalIncome: 0,
          items: [],
        };
      }
      groups[t.date].items.push(t);
      if (t.type === 'expense') {
        groups[t.date].dayTotalSpending += t.amount;
      } else if (t.type === 'income') {
        groups[t.date].dayTotalIncome += t.amount;
      }
    }

    return Object.values(groups);
  }, [filteredTransactions]);

  // Available unique months from transactions
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach(t => months.add(t.date.slice(0, 7)));
    return Array.from(months).sort().reverse();
  }, [transactions]);

  const handleCreateRecurringRule = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(newRecAmount);
    if (!parsedAmount || parsedAmount <= 0) return;

    const newRule: RecurringTransaction = {
      id: `rec_${Date.now()}`,
      title: newRecTitle.trim() || `${newRecFreq} ${newRecCategory}`,
      amount: parsedAmount,
      type: newRecType,
      category: newRecCategory,
      mode: newRecMode,
      frequency: newRecFreq,
      startDate: newRecStartDate,
      nextDate: newRecStartDate,
      autoCreate: false,
      endDate: newRecEndDate.trim() || null,
      active: true,
      note: newRecNote.trim() || undefined,
    };

    const updated = [newRule, ...recurringRules];
    saveRecurringRules(updated);
    setIsAddRecurringOpen(false);

    // Reset
    setNewRecTitle('');
    setNewRecAmount('');
    setNewRecNote('');
  };

  const toggleRuleActive = (ruleId: string) => {
    const updated = recurringRules.map(r => (r.id === ruleId ? { ...r, active: !r.active } : r));
    saveRecurringRules(updated);
  };

  const deleteRule = (ruleId: string) => {
    const updated = recurringRules.filter(r => r.id !== ruleId);
    saveRecurringRules(updated);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3.5 sm:px-6 py-6 pb-24 md:pb-8">
      {/* Top Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Ledger & Entries</h2>
          <p className="text-xs text-zinc-500">
            {filteredTransactions.length} transaction(s) recorded · Grouped by day
          </p>
        </div>

        {/* Tab switcher: Entries vs Recurring Rules */}
        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-zinc-100 rounded-xl">
            <button
              onClick={() => setActiveTab('entries')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'entries'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              All Entries
            </button>
            <button
              onClick={() => setActiveTab('recurring')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'recurring'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Recurring ({recurringRules.length})</span>
            </button>
          </div>

          {activeTab === 'entries' ? (
            <button
              onClick={() => {
                setEditTx(null);
                setIsEditModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Entry</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAddRecurringOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Rule</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'entries' ? (
        <>
          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search category, note, amount, mode..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Month */}
              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                  Month
                </label>
                <select
                  value={monthFilter}
                  onChange={e => setMonthFilter(e.target.value)}
                  className="w-full min-h-[38px] px-2.5 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-900"
                >
                  <option value="all">All Months</option>
                  {availableMonths.map((m, idx) => (
                    <option key={`month_${m}_${idx}`} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                  Type
                </label>
                <select
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value)}
                  className="w-full min-h-[38px] px-2.5 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-900"
                >
                  <option value="all">All Types</option>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                  <option value="invest">Invest</option>
                  <option value="cardPayment">Card Payment</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="w-full min-h-[38px] px-2.5 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-900"
                >
                  <option value="all">All Categories</option>
                  {settings.expenseCategories.map(c => (
                    <option key={`exp_${c}`} value={c}>
                      {c}
                    </option>
                  ))}
                  {settings.incomeCategories.map(c => (
                    <option key={`inc_${c}`} value={c}>
                      {c} (Income)
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                  Payment Mode
                </label>
                <select
                  value={selectedMode}
                  onChange={e => setSelectedMode(e.target.value)}
                  className="w-full min-h-[38px] px-2.5 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-900"
                >
                  <option value="all">All Modes</option>
                  {settings.paymentModes.map((m, idx) => (
                    <option key={`mode_${m}_${idx}`} value={m}>
                      {m}
                    </option>
                  ))}
                  <option value="Imported">Imported</option>
                </select>
              </div>
            </div>
          </div>

          {/* Grouped Entries List */}
          {groupedByDate.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-zinc-200">
              <p className="text-sm text-zinc-500">No transactions match your filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedByDate.map(group => (
                <div
                  key={group.date}
                  className="rounded-2xl bg-white border border-zinc-200 overflow-hidden shadow-xs"
                >
                  {/* Date Header with Day Totals */}
                  <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between text-xs">
                    <div className="font-bold text-zinc-800 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{formatDateKolkata(group.date)}</span>
                      <span className="text-zinc-400 font-normal">({group.items.length})</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-mono">
                      {group.dayTotalIncome > 0 && (
                        <span className="text-emerald-600 font-bold">
                          +{formatINR(group.dayTotalIncome)}
                        </span>
                      )}
                      {group.dayTotalSpending > 0 && (
                        <span className="text-rose-600 font-bold">
                          −{formatINR(group.dayTotalSpending)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Transactions for this date */}
                  <div className="divide-y divide-zinc-100">
                    {group.items.map(t => (
                      <div
                        key={t.id}
                        className="p-3.5 flex items-center justify-between gap-3 hover:bg-zinc-50/50 transition text-xs"
                      >
                        {/* Left: Category, tags, note, mode */}
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div
                            className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                              t.type === 'income'
                                ? 'bg-emerald-50 text-emerald-600'
                                : t.type === 'invest'
                                ? 'bg-indigo-50 text-indigo-600'
                                : t.type === 'cardPayment'
                                ? 'bg-amber-50 text-amber-600'
                                : 'bg-zinc-100 text-zinc-600'
                            }`}
                          >
                            {t.type === 'income' && <ArrowDownLeft className="w-4 h-4" />}
                            {t.type === 'expense' && <ArrowUpRight className="w-4 h-4" />}
                            {t.type === 'invest' && <TrendingUp className="w-4 h-4" />}
                            {t.type === 'cardPayment' && <CardIcon className="w-4 h-4" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-zinc-900 truncate">
                                {t.category}
                              </span>
                              {t.imported && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                  Imported
                                </span>
                              )}
                              {t.recurringRuleId && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-800 flex items-center gap-0.5">
                                  <Repeat className="w-2.5 h-2.5" /> Recurring
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span>Mode: {t.mode}</span>
                              {t.note && (
                                <>
                                  <span>·</span>
                                  <span className="italic truncate max-w-xs">{t.note}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Amount & Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`font-mono font-bold text-sm ${
                              t.type === 'income'
                                ? 'text-emerald-600'
                                : t.type === 'invest'
                                ? 'text-indigo-600'
                                : t.type === 'cardPayment'
                                ? 'text-amber-600'
                                : 'text-zinc-900'
                            }`}
                          >
                            {t.type === 'income' ? `+${formatINR(t.amount)}` : formatINR(t.amount)}
                          </span>

                          <div className="flex items-center gap-1 pl-2 border-l border-zinc-200">
                            {/* Duplicate */}
                            <button
                              onClick={() => duplicateTransaction(t)}
                              title="Duplicate entry"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => {
                                setEditTx(t);
                                setIsEditModalOpen(true);
                              }}
                              title="Edit entry"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => setDeleteId(t.id)}
                              title="Delete entry"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Recurring Rules View */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                <Repeat className="w-4 h-4 text-indigo-600" />
                <span>Automatic Recurring Transaction Generator</span>
              </div>
              <p className="text-indigo-700 mt-0.5">
                Define rules with start and end dates. Transactions are generated automatically on schedule.
              </p>
            </div>
            <button
              onClick={() => {
                const count = processRecurring();
                alert(`Processed recurring rules. Generated ${count} new entry(ies).`);
              }}
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shrink-0"
            >
              Sync Recurring Now
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recurringRules.map(rule => (
              <div
                key={rule.id}
                className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-zinc-900 text-sm flex items-center gap-2">
                      <span>{rule.title}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-600">
                        {rule.frequency}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      Category: <strong>{rule.category}</strong> · Mode: {rule.mode}
                    </div>
                  </div>

                  <span
                    className={`font-mono font-bold text-sm ${
                      rule.type === 'income' ? 'text-emerald-600' : 'text-zinc-900'
                    }`}
                  >
                    {rule.type === 'income' ? `+${formatINR(rule.amount)}` : formatINR(rule.amount)}
                  </span>
                </div>

                <div className="text-[11px] text-zinc-500 space-y-0.5 border-t border-zinc-100 pt-2">
                  <div>Start: {rule.startDate} {rule.endDate ? `· End: ${rule.endDate}` : '(No end)'}</div>
                  {rule.lastProcessedDate && <div>Last processed: {rule.lastProcessedDate}</div>}
                  {rule.note && <div className="italic text-zinc-400">{rule.note}</div>}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                  <button
                    onClick={() => toggleRuleActive(rule.id)}
                    className={`flex items-center gap-1 text-xs font-semibold ${
                      rule.active ? 'text-emerald-600' : 'text-zinc-400'
                    }`}
                  >
                    {rule.active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                    <span>{rule.active ? 'Active' : 'Paused'}</span>
                  </button>

                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Add / Edit Transaction Modal */}
      <QuickAddModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditTx(null);
        }}
        editTransaction={editTx}
      />

      {/* New Recurring Rule Modal */}
      {isAddRecurringOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-600/30 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white border border-zinc-200 p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-900">
              Create Recurring Transaction Rule
            </h3>

            <form onSubmit={handleCreateRecurringRule} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-600 mb-1 font-medium">Title</label>
                <input
                  type="text"
                  placeholder="e.g., Monthly Rent, Internet Bill, SIP"
                  value={newRecTitle}
                  onChange={e => setNewRecTitle(e.target.value)}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-600 mb-1 font-medium">Amount (₹)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={newRecAmount}
                    onChange={e => setNewRecAmount(e.target.value)}
                    className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-600 mb-1 font-medium">Frequency</label>
                  <select
                    value={newRecFreq}
                    onChange={e => setNewRecFreq(e.target.value as RecurringTransaction['frequency'])}
                    className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 bg-white text-zinc-900"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-600 mb-1 font-medium">Type</label>
                  <select
                    value={newRecType}
                    onChange={e => setNewRecType(e.target.value as TransactionType)}
                    className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 bg-white text-zinc-900"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="invest">Invest</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-600 mb-1 font-medium">Category</label>
                  <select
                    value={newRecCategory}
                    onChange={e => setNewRecCategory(e.target.value)}
                    className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 bg-white text-zinc-900"
                  >
                    {settings.expenseCategories.map((c, idx) => (
                      <option key={`exp_${c}_${idx}`} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-600 mb-1 font-medium">Start Date</label>
                  <input
                    type="date"
                    value={newRecStartDate}
                    onChange={e => setNewRecStartDate(e.target.value)}
                    className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 bg-white text-zinc-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-600 mb-1 font-medium">End Date (Opt)</label>
                  <input
                    type="date"
                    value={newRecEndDate}
                    onChange={e => setNewRecEndDate(e.target.value)}
                    className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 bg-white text-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-600 mb-1 font-medium">Payment Mode</label>
                <select
                  value={newRecMode}
                  onChange={e => setNewRecMode(e.target.value)}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 bg-white text-zinc-900"
                >
                  {settings.paymentModes.map((m, idx) => (
                    <option key={`mode_${m}_${idx}`} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddRecurringOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                >
                  Save Recurring Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-app Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Delete Transaction?"
        message="Are you sure you want to delete this transaction entry? This cannot be undone."
        confirmText="Delete"
        onConfirm={() => {
          if (deleteId) {
            deleteTransaction(deleteId);
            setDeleteId(null);
          }
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
