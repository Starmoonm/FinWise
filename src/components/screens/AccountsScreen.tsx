import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Building,
  Banknote,
  Smartphone,
  Plus,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  RefreshCw,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Info,
  Calendar,
  Layers,
  Check,
  ChevronRight,
  Sliders,
  DollarSign,
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
import { Account, Transaction } from '../../types';
import { accountBalance } from '../../lib/finance';
import { formatINR, formatCompactINR } from '../../utils/formatters';
import { ConfirmDialog } from '../common/ConfirmDialog';

export const AccountsScreen: React.FC = () => {
  const {
    accounts,
    transactions,
    todayDateStr,
    activeMonthKey,
    addOrUpdateAccount,
    deleteAccount,
    reconcileAccount,
    recordTransfer,
    bulkMapModeToAccount,
    showToast,
  } = useFinance();

  // Modals state
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isReconcileOpen, setIsReconcileOpen] = useState(false);
  const [reconcileAcc, setReconcileAcc] = useState<Account | null>(null);
  const [realBalanceInput, setRealBalanceInput] = useState('');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isBulkMapOpen, setIsBulkMapOpen] = useState(false);
  const [deleteAccId, setDeleteAccId] = useState<string | null>(null);

  // Form states for Account Add/Edit
  const [accName, setAccName] = useState('');
  const [accKind, setAccKind] = useState<'bank' | 'cash' | 'wallet'>('bank');
  const [accOpeningBal, setAccOpeningBal] = useState('');
  const [accOpeningDate, setAccOpeningDate] = useState(todayDateStr);

  // Transfer modal form
  const [transferFromId, setTransferFromId] = useState('');
  const [transferToId, setTransferToId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(todayDateStr);
  const [transferNote, setTransferNote] = useState('');

  // Bulk mode mapping form
  const [modeMapping, setModeMapping] = useState<Record<string, string>>({
    Bank: accounts.find(a => a.kind === 'bank')?.id || accounts[0]?.id || '',
    Cash: accounts.find(a => a.kind === 'cash')?.id || accounts[0]?.id || '',
    UPI: accounts.find(a => a.kind === 'wallet')?.id || accounts[0]?.id || '',
  });

  // Calculate balances using single calculation engine
  const accountsWithBalances = useMemo(() => {
    return accounts.map(acc => {
      const balance = accountBalance(acc, transactions);
      // Monthly in / out for this account in activeMonthKey
      const monthTx = transactions.filter(t => t.date.startsWith(activeMonthKey));
      let moneyIn = 0;
      let moneyOut = 0;

      for (const t of monthTx) {
        if (t.accountId === acc.id) {
          if (t.type === 'income') moneyIn += t.amount;
          else if (t.type === 'expense' || t.type === 'invest' || t.type === 'cardPayment') moneyOut += t.amount;
          else if (t.type === 'transfer') moneyOut += t.amount;
        } else if (t.toAccountId === acc.id && t.type === 'transfer') {
          moneyIn += t.amount;
        }
      }

      return {
        ...acc,
        balance,
        moneyIn,
        moneyOut,
      };
    });
  }, [accounts, transactions, activeMonthKey]);

  // Total balance across all accounts
  const totalBalance = useMemo(() => {
    return accountsWithBalances.reduce((sum, a) => sum + a.balance, 0);
  }, [accountsWithBalances]);

  // Past 6 months list for charts
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

  // Chart 1: Balance over time per account (lines)
  const balanceTrendData = useMemo(() => {
    return past6Months.map(mKey => {
      const row: any = { month: mKey };
      accounts.forEach(acc => {
        // Calculate balance up to the end of month mKey
        const endOfMonthDate = `${mKey}-31`;
        const txsUpToMonth = transactions.filter(t => t.date <= endOfMonthDate);
        row[acc.name] = accountBalance(acc, txsUpToMonth);
      });
      return row;
    });
  }, [past6Months, accounts, transactions]);

  // Chart 2: Money In vs Money Out per account per month (Grouped Bars)
  const inOutData = useMemo(() => {
    return accountsWithBalances.map(acc => ({
      name: acc.name,
      'Money In': acc.moneyIn,
      'Money Out': acc.moneyOut,
    }));
  }, [accountsWithBalances]);

  // Bulk Mode Mapping Preview Data
  const modeStats = useMemo(() => {
    const counts: Record<string, { count: number; total: number }> = {
      Bank: { count: 0, total: 0 },
      Cash: { count: 0, total: 0 },
      UPI: { count: 0, total: 0 },
      'Credit Card': { count: 0, total: 0 },
    };

    transactions.forEach(t => {
      if (counts[t.mode]) {
        counts[t.mode].count += 1;
        counts[t.mode].total += t.amount;
      }
    });

    return counts;
  }, [transactions]);

  // Open add/edit modal
  const openAddModal = (acc?: Account) => {
    if (acc) {
      setEditingAccount(acc);
      setAccName(acc.name);
      setAccKind(acc.kind);
      setAccOpeningBal(String(acc.openingBalance));
      setAccOpeningDate(acc.openingDate || todayDateStr);
    } else {
      setEditingAccount(null);
      setAccName('');
      setAccKind('bank');
      setAccOpeningBal('0');
      setAccOpeningDate(todayDateStr);
    }
    setIsAddAccountOpen(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const bal = parseFloat(accOpeningBal);
    if (!accName.trim() || isNaN(bal)) return;

    addOrUpdateAccount({
      ...(editingAccount ? { id: editingAccount.id } : {}),
      name: accName.trim(),
      kind: accKind,
      openingBalance: bal,
      openingDate: accOpeningDate,
      isArchived: false,
    });
    setIsAddAccountOpen(false);
  };

  // Open transfer modal
  const openTransferModal = (fromId?: string) => {
    setTransferFromId(fromId || accounts[0]?.id || '');
    setTransferToId(accounts.find(a => a.id !== (fromId || accounts[0]?.id))?.id || '');
    setTransferAmount('');
    setTransferDate(todayDateStr);
    setTransferNote('');
    setIsTransferOpen(true);
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(transferAmount);
    if (!amt || amt <= 0 || !transferFromId || !transferToId || transferFromId === transferToId) {
      showToast('Please select valid different source and destination accounts and amount');
      return;
    }

    recordTransfer(transferFromId, transferToId, amt, transferDate, transferNote);
    setIsTransferOpen(false);
  };

  // Open reconcile modal
  const openReconcileModal = (acc: Account) => {
    setReconcileAcc(acc);
    const curr = accountBalance(acc, transactions);
    setRealBalanceInput(String(Math.round(curr)));
    setIsReconcileOpen(true);
  };

  const handleExecuteReconcile = (e: React.FormEvent) => {
    e.preventDefault();
    const real = parseFloat(realBalanceInput);
    if (!reconcileAcc || isNaN(real)) return;

    reconcileAccount(reconcileAcc.id, real);
    setIsReconcileOpen(false);
  };

  const handleApplyBulkMapping = async () => {
    const updatedCount = await bulkMapModeToAccount(modeMapping);
    setIsBulkMapOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3.5 sm:px-6 py-4 pb-24 md:pb-8">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            <span>Accounts & Cash</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
              {accounts.length} active
            </span>
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Bank accounts, cash in hand, UPI wallets, transfers, and real-balance reconciliation
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* First time wizard / Bulk tool */}
          <button
            onClick={() => setIsBulkMapOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-semibold text-xs transition"
          >
            <RefreshCw className="w-4 h-4 text-emerald-600" />
            <span>Map Modes to Accounts</span>
          </button>

          <button
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-semibold text-xs transition"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Setup Wizard</span>
          </button>

          <button
            onClick={() => openTransferModal()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Transfer</span>
          </button>

          <button
            onClick={() => openAddModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Account</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Total Liquid Balance */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Total Account Balances
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-zinc-900 font-mono">
              {formatINR(totalBalance)}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            Across {accounts.length} liquid accounts
          </span>
        </div>

        {/* 2. Bank Balance */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Bank Deposits
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-zinc-900 font-mono">
              {formatINR(
                accountsWithBalances.filter(a => a.kind === 'bank').reduce((s, a) => s + a.balance, 0)
              )}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            {accounts.filter(a => a.kind === 'bank').length} bank accounts
          </span>
        </div>

        {/* 3. Cash & Wallets */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Cash & Wallets
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-zinc-900 font-mono">
              {formatINR(
                accountsWithBalances.filter(a => a.kind !== 'bank').reduce((s, a) => s + a.balance, 0)
              )}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            Cash in hand & UPI balances
          </span>
        </div>

        {/* 4. Month Net Inflow */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
            Month Inflow ({activeMonthKey})
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-emerald-600 font-mono">
              + {formatINR(accountsWithBalances.reduce((s, a) => s + a.moneyIn, 0))}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            Outflow: {formatINR(accountsWithBalances.reduce((s, a) => s + a.moneyOut, 0))}
          </span>
        </div>
      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {accountsWithBalances.map(acc => {
          const isNegative = acc.balance < 0;
          const Icon =
            acc.kind === 'bank' ? Building : acc.kind === 'cash' ? Banknote : Smartphone;

          return (
            <div
              key={acc.id}
              className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-4 hover:border-zinc-300 transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2.5 rounded-xl ${
                        acc.kind === 'bank'
                          ? 'bg-blue-50 text-blue-600'
                          : acc.kind === 'cash'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-purple-50 text-purple-600'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-zinc-900">{acc.name}</h3>
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold block capitalize">
                        {acc.kind} account · As of {acc.openingDate || '2026-01-01'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openAddModal(acc)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100"
                      title="Edit Account"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteAccId(acc.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                      title="Delete Account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Calculated Real Balance */}
                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                    Calculated Balance
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-2xl font-black font-mono tracking-tight ${
                        isNegative ? 'text-rose-600' : 'text-zinc-900'
                      }`}
                    >
                      {formatINR(acc.balance)}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 block">
                    Opening: {formatINR(acc.openingBalance)}
                  </span>
                </div>

                {/* In / Out for month */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="flex items-center gap-1.5 text-emerald-600">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>In: {formatINR(acc.moneyIn)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-rose-600">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>Out: {formatINR(acc.moneyOut)}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-zinc-100 flex items-center gap-2">
                <button
                  onClick={() => openReconcileModal(acc)}
                  className="flex-1 min-h-[38px] flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-semibold text-xs transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Reconcile</span>
                </button>

                <button
                  onClick={() => openTransferModal(acc.id)}
                  className="flex-1 min-h-[38px] flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-zinc-800 text-white font-semibold text-xs transition"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Transfer</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section: Balance Over Time (Lines) + Money In vs Money Out (Bars) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Balance Over Time Per Account */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">
              Balance Trend Over Time
            </h3>
            <p className="text-xs text-zinc-500">Month-end balances across your liquid accounts</p>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={balanceTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                {accounts.map((acc, i) => (
                  <Line
                    key={acc.id}
                    type="monotone"
                    dataKey={acc.name}
                    stroke={['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'][i % 4]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Money In vs Money Out per Account per Month */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">
              Money In vs Money Out ({activeMonthKey})
            </h3>
            <p className="text-xs text-zinc-500">Inflows and outflows by account for this period</p>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inOutData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.5} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} />
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
                <Bar dataKey="Money In" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Money Out" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Transfer Between Accounts Modal */}
      {isTransferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-600/30 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white border border-zinc-200 p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-blue-600" />
              <span>Transfer Between Accounts</span>
            </h3>
            <p className="text-xs text-zinc-500">
              Transfers shift balance between accounts and are neither income nor spending.
            </p>

            <form onSubmit={handleExecuteTransfer} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-600 mb-1 font-medium">From Account</label>
                <select
                  value={transferFromId}
                  onChange={e => setTransferFromId(e.target.value)}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900"
                  required
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatINR(accountBalance(a, transactions))})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-600 mb-1 font-medium">To Account</label>
                <select
                  value={transferToId}
                  onChange={e => setTransferToId(e.target.value)}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900"
                  required
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id} disabled={a.id === transferFromId}>
                      {a.name} ({formatINR(accountBalance(a, transactions))})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 mb-1 font-medium">Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 5000"
                    value={transferAmount}
                    onChange={e => setTransferAmount(e.target.value)}
                    className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-600 mb-1 font-medium">Date</label>
                  <input
                    type="date"
                    value={transferDate}
                    onChange={e => setTransferDate(e.target.value)}
                    className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-600 mb-1 font-medium">Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. ATM cash withdrawal, self transfer..."
                  value={transferNote}
                  onChange={e => setTransferNote(e.target.value)}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-300 text-zinc-700 font-semibold hover:bg-zinc-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs transition"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reconcile Modal: Real Balance input -> show diff -> Adjustment entry */}
      {isReconcileOpen && reconcileAcc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-600/30 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white border border-zinc-200 p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Reconcile {reconcileAcc.name}</span>
            </h3>
            <p className="text-xs text-zinc-500">
              Enter your actual bank statement or physical cash balance. We will calculate the difference and record an Adjustment entry.
            </p>

            <form onSubmit={handleExecuteReconcile} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between">
                <span className="text-zinc-500">Current App Balance:</span>
                <span className="font-mono font-bold text-sm text-zinc-900">
                  {formatINR(accountBalance(reconcileAcc, transactions))}
                </span>
              </div>

              <div>
                <label className="block text-zinc-600 mb-1 font-medium">
                  Real Bank / Statement Balance (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={realBalanceInput}
                  onChange={e => setRealBalanceInput(e.target.value)}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 font-mono font-bold text-base"
                  required
                />
              </div>

              {/* Calculated Difference Preview */}
              {(() => {
                const real = parseFloat(realBalanceInput) || 0;
                const calc = accountBalance(reconcileAcc, transactions);
                const diff = real - calc;

                return (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between font-semibold ${
                      Math.abs(diff) < 1
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : diff > 0
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : 'bg-rose-50 text-rose-800 border-rose-300'
                    }`}
                  >
                    <span>Adjustment Required:</span>
                    <span className="font-mono font-bold">
                      {diff > 0 ? `+ ${formatINR(diff)} (Positive Adjustment)` : `${formatINR(diff)} (Negative Adjustment)`}
                    </span>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setIsReconcileOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-300 text-zinc-700 font-semibold hover:bg-zinc-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs transition"
                >
                  Create Adjustment & Reconcile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Tool: Map Each Payment Mode to an Account */}
      {isBulkMapOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-600/30 backdrop-blur-xs">
          <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-white border border-zinc-200 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-600" />
                  <span>Bulk Tool: Map Modes to Accounts</span>
                </h3>
                <p className="text-xs text-zinc-500">
                  Assign accounts to your past entries based on their payment mode
                </p>
              </div>

              <button
                onClick={() => setIsBulkMapOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-4 text-xs pr-1">
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-600">
                Old entries only carried modes like Bank, Cash, UPI. Mapping them links each past transaction to an account so balances reflect accurately.
              </div>

              {['Bank', 'Cash', 'UPI'].map((mode, idx) => {
                const stat = modeStats[mode] || { count: 0, total: 0 };
                return (
                  <div key={`${mode}-${idx}`} className="p-3.5 rounded-xl border border-zinc-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-sm text-zinc-900">{mode} Mode</span>
                        <span className="text-[11px] text-zinc-500 block">
                          {stat.count} historical entries ({formatINR(stat.total)})
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400">Target Account</span>
                    </div>

                    <select
                      value={modeMapping[mode] || ''}
                      onChange={e => setModeMapping({ ...modeMapping, [mode]: e.target.value })}
                      className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 font-medium"
                    >
                      <option value="">Do not map</option>
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.kind})
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-zinc-200 pt-3 flex items-center justify-between">
              <button
                onClick={() => setIsBulkMapOpen(false)}
                className="px-4 py-2 rounded-xl border border-zinc-300 text-xs font-semibold hover:bg-zinc-100 transition"
              >
                Cancel
              </button>

              <button
                onClick={handleApplyBulkMapping}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Apply Mode Mapping</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* First Time Setup Wizard Modal */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-600/30 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-zinc-200 p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Accounts Setup Wizard</span>
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              FinWise tracks 3 primary types of liquid funds: Bank Accounts, Cash in Hand, and Wallets. Check or adjust your starting balances as of Jan 1, 2026:
            </p>

            <div className="space-y-3 text-xs">
              {accounts.map(acc => (
                <div
                  key={acc.id}
                  className="p-3.5 rounded-xl border border-zinc-200 flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="font-bold text-zinc-900 block">{acc.name}</span>
                    <span className="text-[11px] text-zinc-500 capitalize">{acc.kind}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400">Opening:</span>
                    <span className="font-mono font-bold text-zinc-900">
                      {formatINR(acc.openingBalance)}
                    </span>
                    <button
                      onClick={() => {
                        setIsWizardOpen(false);
                        openAddModal(acc);
                      }}
                      className="p-1 text-emerald-600 hover:text-emerald-700"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-zinc-200 pt-3 flex justify-end">
              <button
                onClick={() => setIsWizardOpen(false)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
              >
                Looks Good! Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Account Modal */}
      {isAddAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-600/30 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white border border-zinc-200 p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-900">
              {editingAccount ? 'Edit Account' : 'New Account'}
            </h3>

            <form onSubmit={handleSaveAccount} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-600 mb-1 font-medium">Account Name</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Salary, Cash in Hand, Paytm..."
                  value={accName}
                  onChange={e => setAccName(e.target.value)}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-600 mb-1 font-medium">Account Kind</label>
                <select
                  value={accKind}
                  onChange={e => setAccKind(e.target.value as any)}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900"
                >
                  <option value="bank">Bank Account</option>
                  <option value="cash">Cash in Hand</option>
                  <option value="wallet">UPI / Digital Wallet</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 mb-1 font-medium">Opening Balance (₹)</label>
                  <input
                    type="number"
                    value={accOpeningBal}
                    onChange={e => setAccOpeningBal(e.target.value)}
                    className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-600 mb-1 font-medium">Opening Date</label>
                  <input
                    type="date"
                    value={accOpeningDate}
                    onChange={e => setAccOpeningDate(e.target.value)}
                    className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setIsAddAccountOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-300 text-zinc-700 font-semibold hover:bg-zinc-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs transition"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteAccId)}
        title="Delete Account"
        message="Are you sure you want to delete this account? Entries linked to this account will remain in your history."
        confirmLabel="Delete"
        isDestructive
        onConfirm={() => {
          if (deleteAccId) {
            deleteAccount(deleteAccId);
            setDeleteAccId(null);
          }
        }}
        onCancel={() => setDeleteAccId(null)}
      />
    </div>
  );
};
