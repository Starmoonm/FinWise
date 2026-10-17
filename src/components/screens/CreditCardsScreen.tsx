import React, { useState, useMemo } from 'react';
import {
  CreditCard as CreditCardIcon,
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Percent,
  TrendingUp,
  Receipt,
  Info,
  ChevronRight,
  ShieldCheck,
  Building,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import { CreditCard, Transaction } from '../../types';
import { cardOutstanding } from '../../lib/finance';
import { formatINR, formatCompactINR } from '../../utils/formatters';
import { ConfirmDialog } from '../common/ConfirmDialog';

const PALETTE = ['#059669', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

export const CreditCardsScreen: React.FC = () => {
  const {
    cards,
    transactions,
    accounts,
    todayDateStr,
    activeMonthKey,
    addOrUpdateCard,
    deleteCard,
    payCardBill,
    showToast,
  } = useFinance();

  const [selectedCardId, setSelectedCardId] = useState<string>(() => cards[0]?.id || '');
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payingCard, setPayingCard] = useState<CreditCard | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states for Add/Edit
  const [formName, setFormName] = useState('');
  const [formLimit, setFormLimit] = useState('');
  const [formOpeningOutstanding, setFormOpeningOutstanding] = useState('');
  const [formStatementDay, setFormStatementDay] = useState('15');
  const [formDueDay, setFormDueDay] = useState('5');
  const [formLastStatementAmount, setFormLastStatementAmount] = useState('');
  const [formMinimumDue, setFormMinimumDue] = useState('');

  // Payment form states
  const [payAmountType, setPayAmountType] = useState<'total' | 'statement' | 'minimum' | 'custom'>('total');
  const [payCustomAmount, setPayCustomAmount] = useState('');
  const [payFromAccountId, setPayFromAccountId] = useState(() => accounts.find(a => a.kind === 'bank')?.id || accounts[0]?.id || '');

  // Calculate card details for each card
  const cardsWithDetails = useMemo(() => {
    return cards.map(c => {
      const outstanding = cardOutstanding(c, transactions);
      const limit = c.limit || 50000;
      const utilPercent = limit > 0 ? (outstanding / limit) * 100 : 0;

      let utilStatus: 'good' | 'watch' | 'high' = 'good';
      if (utilPercent > 60) utilStatus = 'high';
      else if (utilPercent >= 30) utilStatus = 'watch';

      // Current cycle spends: transactions with mode 'Credit Card' since last statement day
      // Determine statement date in current/last month
      const today = new Date(todayDateStr);
      const todayDay = today.getDate();
      const stmtDay = c.statementDay || 15;

      let cycleStartDate: string;
      if (todayDay >= stmtDay) {
        cycleStartDate = `${todayDateStr.slice(0, 7)}-${String(stmtDay).padStart(2, '0')}`;
      } else {
        const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const y = prevMonth.getFullYear();
        const m = String(prevMonth.getMonth() + 1).padStart(2, '0');
        cycleStartDate = `${y}-${m}-${String(stmtDay).padStart(2, '0')}`;
      }

      const cycleExpenses = transactions.filter(t => {
        return (
          t.type === 'expense' &&
          (t.cardId === c.id || (!t.cardId && t.mode === 'Credit Card')) &&
          t.date >= cycleStartDate &&
          t.date <= todayDateStr
        );
      });
      const cycleSpends = cycleExpenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      // Days until next due date
      const dueDay = c.dueDay || 5;
      let nextDueDateStr: string;
      if (todayDay <= dueDay) {
        nextDueDateStr = `${todayDateStr.slice(0, 7)}-${String(dueDay).padStart(2, '0')}`;
      } else {
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const y = nextMonth.getFullYear();
        const m = String(nextMonth.getMonth() + 1).padStart(2, '0');
        nextDueDateStr = `${y}-${m}-${String(dueDay).padStart(2, '0')}`;
      }

      const dueDateObj = new Date(nextDueDateStr);
      const diffTime = dueDateObj.getTime() - today.getTime();
      const daysUntilDue = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      const minimumDue = c.minimumDue ?? Math.max(500, Math.round(outstanding * 0.05));
      const lastStatementAmount = c.lastStatementAmount ?? Math.max(0, outstanding - cycleSpends);

      return {
        ...c,
        outstanding,
        limit,
        utilPercent,
        utilStatus,
        cycleSpends,
        cycleStartDate,
        daysUntilDue,
        nextDueDateStr,
        minimumDue,
        lastStatementAmount,
      };
    });
  }, [cards, transactions, todayDateStr]);

  const activeCard = useMemo(() => {
    return cardsWithDetails.find(c => c.id === selectedCardId) || cardsWithDetails[0] || null;
  }, [cardsWithDetails, selectedCardId]);

  // Overall KPI
  const overallKPI = useMemo(() => {
    const totalOutstanding = cardsWithDetails.reduce((sum, c) => sum + c.outstanding, 0);
    const totalLimit = cardsWithDetails.reduce((sum, c) => sum + c.limit, 0);
    const overallUtil = totalLimit > 0 ? (totalOutstanding / totalLimit) * 100 : 0;
    const totalCycleSpend = cardsWithDetails.reduce((sum, c) => sum + c.cycleSpends, 0);
    return {
      totalOutstanding,
      totalLimit,
      overallUtil,
      totalCycleSpend,
    };
  }, [cardsWithDetails]);

  // Active card spending by category (past 6 months)
  const categorySpends = useMemo(() => {
    if (!activeCard) return [];
    const catMap: Record<string, number> = {};

    transactions.forEach(t => {
      if (
        t.type === 'expense' &&
        (t.cardId === activeCard.id || (!t.cardId && t.mode === 'Credit Card'))
      ) {
        catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount);
      }
    });

    return Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, activeCard]);

  // Utilisation / Spend Trend (last 6 months)
  const monthlyCardTrend = useMemo(() => {
    const months = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
    const limit = activeCard?.limit || 50000;

    return months.map(mKey => {
      const spend = transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(mKey) && (t.cardId === activeCard?.id || (!t.cardId && t.mode === 'Credit Card')))
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const payments = transactions
        .filter(t => t.type === 'cardPayment' && t.date.startsWith(mKey) && (t.cardId === activeCard?.id || !t.cardId))
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const d = new Date(`${mKey}-01`);
      const label = d.toLocaleDateString('en-US', { month: 'short' });

      return {
        month: label,
        spend,
        payments,
        limit,
      };
    });
  }, [transactions, activeCard]);

  // Open modal handlers
  const openAddModal = () => {
    setEditingCard(null);
    setFormName('');
    setFormLimit('50000');
    setFormOpeningOutstanding('0');
    setFormStatementDay('15');
    setFormDueDay('5');
    setFormLastStatementAmount('0');
    setFormMinimumDue('0');
    setIsAddEditOpen(true);
  };

  const openEditModal = (c: CreditCard) => {
    setEditingCard(c);
    setFormName(c.name);
    setFormLimit(String(c.limit || 50000));
    setFormOpeningOutstanding(String(c.openingOutstanding || 0));
    setFormStatementDay(String(c.statementDay || 15));
    setFormDueDay(String(c.dueDay || 5));
    setFormLastStatementAmount(String(c.lastStatementAmount || 0));
    setFormMinimumDue(String(c.minimumDue || 0));
    setIsAddEditOpen(true);
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Please enter a card name');
      return;
    }

    const payload = {
      id: editingCard?.id,
      name: formName.trim(),
      limit: Number(formLimit) || 50000,
      openingOutstanding: Number(formOpeningOutstanding) || 0,
      statementDay: Number(formStatementDay) || 15,
      dueDay: Number(formDueDay) || 5,
      lastStatementAmount: Number(formLastStatementAmount) || 0,
      minimumDue: Number(formMinimumDue) || 0,
      asOf: editingCard?.asOf || `${todayDateStr}T23:59:59+05:30`,
    };

    await addOrUpdateCard(payload);
    setIsAddEditOpen(false);
    showToast(editingCard ? 'Card updated successfully' : 'Credit card added');
  };

  const openPayModal = (card: CreditCard) => {
    setPayingCard(card);
    setPayAmountType('total');
    setPayCustomAmount('');
    setIsPayModalOpen(true);
  };

  const handleConfirmPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingCard) return;

    const details = cardsWithDetails.find(c => c.id === payingCard.id);
    let amount = 0;
    if (payAmountType === 'total') {
      amount = details?.outstanding || 0;
    } else if (payAmountType === 'statement') {
      amount = details?.lastStatementAmount || details?.outstanding || 0;
    } else if (payAmountType === 'minimum') {
      amount = details?.minimumDue || 500;
    } else {
      amount = Number(payCustomAmount) || 0;
    }

    if (amount <= 0) {
      showToast('Please enter a valid payment amount');
      return;
    }

    const selectedAcc = accounts.find(a => a.id === payFromAccountId);
    await payCardBill(payingCard.id, amount, payFromAccountId, selectedAcc?.name || 'Bank');
    setIsPayModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2.5">
            <CreditCardIcon className="w-7 h-7 text-emerald-600" />
            Credit Cards
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Track statement cycles, credit utilisation, pay bills & monitor card spending
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Credit Card
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
          <span className="text-xs font-medium text-zinc-500">Total Outstanding</span>
          <p className="text-xl font-bold text-zinc-900 mt-1">
            {formatINR(overallKPI.totalOutstanding)}
          </p>
          <span className="text-[11px] text-zinc-400">across {cards.length} card{cards.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
          <span className="text-xs font-medium text-zinc-500">Total Credit Limit</span>
          <p className="text-xl font-bold text-zinc-900 mt-1">
            {formatINR(overallKPI.totalLimit)}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">
            Available: {formatINR(Math.max(0, overallKPI.totalLimit - overallKPI.totalOutstanding))}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
          <span className="text-xs font-medium text-zinc-500">Overall Utilisation</span>
          <p className="text-xl font-bold text-zinc-900 mt-1">
            {overallKPI.overallUtil.toFixed(1)}%
          </p>
          <span className={`text-[11px] font-medium ${
            overallKPI.overallUtil < 30 ? 'text-emerald-600' : overallKPI.overallUtil < 60 ? 'text-amber-600' : 'text-rose-600'
          }`}>
            {overallKPI.overallUtil < 30 ? '✓ Healthy (<30%)' : overallKPI.overallUtil < 60 ? '⚠ Watch (30–60%)' : '✖ High (>60%)'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
          <span className="text-xs font-medium text-zinc-500">This Cycle Spends</span>
          <p className="text-xl font-bold text-zinc-900 mt-1">
            {formatINR(overallKPI.totalCycleSpend)}
          </p>
          <span className="text-[11px] text-zinc-400">unbilled & current cycle</span>
        </div>
      </div>

      {/* Cards List / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cardsWithDetails.map(card => {
          const isSelected = card.id === activeCard?.id;
          return (
            <div
              key={card.id}
              onClick={() => setSelectedCardId(card.id)}
              className={`cursor-pointer rounded-2xl p-5 border transition-all relative ${
                isSelected
                  ? 'bg-gradient-to-br from-emerald-50/70 via-white to-zinc-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                  : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-inner">
                    CC
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900">{card.name}</h3>
                    <span className="text-xs text-zinc-500">
                      Limit {formatINR(card.limit)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(card);
                    }}
                    className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {cards.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(card.id);
                      }}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Outstanding & Utilisation Progress */}
              <div className="mt-5 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-zinc-500">Outstanding</span>
                  <span className="text-lg font-bold text-zinc-900">
                    {formatINR(card.outstanding)}
                  </span>
                </div>

                <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      card.utilStatus === 'good'
                        ? 'bg-emerald-500'
                        : card.utilStatus === 'watch'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, card.utilPercent))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium px-2 py-0.5 rounded-full text-[11px] ${
                    card.utilStatus === 'good'
                      ? 'bg-emerald-100 text-emerald-700'
                      : card.utilStatus === 'watch'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}>
                    {card.utilPercent.toFixed(1)}% Utilised ({card.utilStatus === 'good' ? 'Good' : card.utilStatus === 'watch' ? 'Watch' : 'High'})
                  </span>
                  <span className="text-zinc-400 text-[11px]">
                    Available {formatINR(Math.max(0, card.limit - card.outstanding))}
                  </span>
                </div>
              </div>

              {/* Cycle & Due info */}
              <div className="mt-4 pt-3 border-t border-zinc-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-zinc-400 text-[11px]">Stmt Day:</span>
                  <p className="font-medium text-zinc-700">
                    {card.statementDay}th of month
                  </p>
                </div>
                <div>
                  <span className="text-zinc-400 text-[11px]">Due Day:</span>
                  <p className="font-medium text-zinc-700">
                    {card.dueDay}th ({card.daysUntilDue} days left)
                  </p>
                </div>
              </div>

              {/* Pay Bill CTA */}
              <div className="mt-4 pt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openPayModal(card);
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  Pay Bill
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Card Deep Dive */}
      {activeCard && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <span>{activeCard.name} Analytics & Breakdown</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-zinc-100 text-zinc-600">
                  Cycle starts {activeCard.cycleStartDate}
                </span>
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Last Statement: {formatINR(activeCard.lastStatementAmount)} · Minimum Due: {formatINR(activeCard.minimumDue)}
              </p>
            </div>

            <button
              onClick={() => openPayModal(activeCard)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 self-start"
            >
              <Receipt className="w-4 h-4" />
              Pay {activeCard.name} Bill
            </button>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
              <h3 className="text-sm font-semibold text-zinc-800 mb-3 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Monthly Card Spends by Category
              </h3>
              {categorySpends.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-xs text-zinc-400">
                  No credit card expenses recorded yet
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-full sm:w-1/2 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categorySpends}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={3}
                        >
                          {categorySpends.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: any) => [formatINR(Number(val) || 0), 'Spent']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="w-full sm:w-1/2 space-y-1.5 max-h-48 overflow-y-auto pr-2">
                    {categorySpends.map((item, idx) => (
                      <div key={`${item.name}-${idx}`} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                          />
                          <span className="truncate text-zinc-700">{item.name}</span>
                        </div>
                        <span className="font-semibold text-zinc-900">
                          {formatINR(item.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Utilisation & Spend Trend */}
            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
              <h3 className="text-sm font-semibold text-zinc-800 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Monthly Spend & Payment Trend
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyCardTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${formatCompactINR(v)}`} />
                    <Tooltip formatter={(val: any) => [formatINR(Number(val) || 0)]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="spend" name="Spends" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="payments" name="Payments" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Card Transactions */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">
              Recent Transactions ({activeCard.name})
            </h3>
            <div className="border border-zinc-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Category / Note</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {transactions
                    .filter(
                      t =>
                        (t.type === 'expense' && (t.cardId === activeCard.id || (!t.cardId && t.mode === 'Credit Card'))) ||
                        (t.type === 'cardPayment' && (t.cardId === activeCard.id || !t.cardId))
                    )
                    .slice(0, 8)
                    .map(tx => (
                      <tr key={tx.id} className="hover:bg-zinc-50">
                        <td className="py-2.5 px-4 font-mono text-zinc-500">{tx.date}</td>
                        <td className="py-2.5 px-4">
                          <span className="font-medium text-zinc-800">
                            {tx.category}
                          </span>
                          {tx.note && <span className="text-zinc-400 block text-[11px]">{tx.note}</span>}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              tx.type === 'cardPayment'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {tx.type === 'cardPayment' ? 'Bill Paid' : 'Card Spend'}
                          </span>
                        </td>
                        <td className={`py-2.5 px-4 text-right font-mono font-bold ${
                          tx.type === 'cardPayment' ? 'text-emerald-600' : 'text-zinc-900'
                        }`}>
                          {tx.type === 'cardPayment' ? '-' : ''}{formatINR(tx.amount)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Pay Bill Modal */}
      {isPayModalOpen && payingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-600/30 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                Pay Bill — {payingCard.name}
              </h3>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmPay} className="space-y-4 text-xs">
              <div className="space-y-2">
                <label className="font-medium text-zinc-700">Select Amount Option</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayAmountType('total')}
                    className={`p-2.5 rounded-lg border text-left flex flex-col justify-between ${
                      payAmountType === 'total'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-semibold'
                        : 'border-zinc-200 bg-zinc-50'
                    }`}
                  >
                    <span className="text-[10px] text-zinc-500">Total Outstanding</span>
                    <span className="text-sm font-bold">
                      {formatINR(cardsWithDetails.find(c => c.id === payingCard.id)?.outstanding || 0)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayAmountType('statement')}
                    className={`p-2.5 rounded-lg border text-left flex flex-col justify-between ${
                      payAmountType === 'statement'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-semibold'
                        : 'border-zinc-200 bg-zinc-50'
                    }`}
                  >
                    <span className="text-[10px] text-zinc-500">Last Statement</span>
                    <span className="text-sm font-bold">
                      {formatINR(cardsWithDetails.find(c => c.id === payingCard.id)?.lastStatementAmount || 0)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayAmountType('minimum')}
                    className={`p-2.5 rounded-lg border text-left flex flex-col justify-between ${
                      payAmountType === 'minimum'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-semibold'
                        : 'border-zinc-200 bg-zinc-50'
                    }`}
                  >
                    <span className="text-[10px] text-zinc-500">Minimum Due</span>
                    <span className="text-sm font-bold">
                      {formatINR(cardsWithDetails.find(c => c.id === payingCard.id)?.minimumDue || 500)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayAmountType('custom')}
                    className={`p-2.5 rounded-lg border text-left flex flex-col justify-between ${
                      payAmountType === 'custom'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-semibold'
                        : 'border-zinc-200 bg-zinc-50'
                    }`}
                  >
                    <span className="text-[10px] text-zinc-500">Custom Amount</span>
                    <span className="text-sm font-bold">₹ Enter...</span>
                  </button>
                </div>
              </div>

              {payAmountType === 'custom' && (
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">
                    Custom Payment Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={payCustomAmount}
                    onChange={e => setPayCustomAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full px-3 py-2 border rounded-lg bg-white border-zinc-300 font-mono text-sm"
                    autoFocus
                  />
                </div>
              )}

              <div>
                <label className="block font-medium text-zinc-700 mb-1">
                  Pay From Bank Account
                </label>
                <select
                  value={payFromAccountId}
                  onChange={e => setPayFromAccountId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white border-zinc-300 text-xs"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.kind.toUpperCase()})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-zinc-400 mt-1">
                  ⓘ Recorded as a <code className="text-emerald-600 font-mono">cardPayment</code> transfer — not counted as spending!
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Card Modal */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-600/30 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-base font-bold text-zinc-900">
                {editingCard ? 'Edit Credit Card' : 'Add Credit Card'}
              </h3>
              <button
                onClick={() => setIsAddEditOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">
                  Card Name / Issuer
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. HDFC Regalia, ICICI Amazon Pay"
                  className="w-full px-3 py-2 border rounded-lg bg-white border-zinc-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">
                    Credit Limit (₹)
                  </label>
                  <input
                    type="number"
                    value={formLimit}
                    onChange={e => setFormLimit(e.target.value)}
                    placeholder="50000"
                    className="w-full px-3 py-2 border rounded-lg bg-white border-zinc-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">
                    Opening Outstanding (₹)
                  </label>
                  <input
                    type="number"
                    value={formOpeningOutstanding}
                    onChange={e => setFormOpeningOutstanding(e.target.value)}
                    placeholder="17212"
                    className="w-full px-3 py-2 border rounded-lg bg-white border-zinc-300 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">
                    Statement Day (1–31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formStatementDay}
                    onChange={e => setFormStatementDay(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-zinc-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">
                    Due Day (1–31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formDueDay}
                    onChange={e => setFormDueDay(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white border-zinc-300 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">
                    Last Statement Amt (optional)
                  </label>
                  <input
                    type="number"
                    value={formLastStatementAmount}
                    onChange={e => setFormLastStatementAmount(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg bg-white border-zinc-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">
                    Minimum Due (optional)
                  </label>
                  <input
                    type="number"
                    value={formMinimumDue}
                    onChange={e => setFormMinimumDue(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg bg-white border-zinc-300 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  {editingCard ? 'Save Changes' : 'Add Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <ConfirmDialog
          isOpen={Boolean(deleteConfirmId)}
          title="Delete Credit Card"
          message="Are you sure you want to remove this credit card? Existing transactions will retain their historical logs."
          confirmLabel="Delete"
          onConfirm={async () => {
            await deleteCard(deleteConfirmId);
            setDeleteConfirmId(null);
            showToast('Credit card deleted');
          }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
};
