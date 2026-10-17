import React, { useState, useMemo } from 'react';
import {
  Landmark,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar,
  Info,
  DollarSign,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  GitFork,
  HelpCircle,
  Edit2,
  Trash2,
  Receipt,
  Percent,
  UserCheck,
  ChevronRight,
  ArrowRight,
  Calculator,
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
} from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import { Loan } from '../../types';
import {
  calculateLoanSchedule,
  computeImpliedAnnualRate,
  generateDetailedLoanAmortization,
} from '../../utils/calculations';
import { formatINR, formatCompactINR } from '../../utils/formatters';
import { ConfirmDialog } from '../common/ConfirmDialog';

export const LoansScreen: React.FC = () => {
  const {
    loans,
    transactions,
    todayDateStr,
    payLoanEMI,
    recordLentLoanPayment,
    addOrUpdateLoan,
    deleteLoan,
    setActiveScreen,
    showToast,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'borrowed' | 'lent'>('borrowed');

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [isPayEmiOpen, setIsPayEmiOpen] = useState(false);
  const [payingLoan, setPayingLoan] = useState<Loan | null>(null);
  const [alsoAddExpense, setAlsoAddExpense] = useState(true);

  const [isRepaymentOpen, setIsRepaymentOpen] = useState(false);
  const [repayingLoan, setRepayingLoan] = useState<Loan | null>(null);
  const [repaymentAmount, setRepaymentAmount] = useState('');

  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [loanToSplit, setLoanToSplit] = useState<Loan | null>(null);
  const [splitLoan1Name, setSplitLoan1Name] = useState('Friend / Colleague Loan');
  const [splitLoan1Amount, setSplitLoan1Amount] = useState('50000');
  const [splitLoan2Name, setSplitLoan2Name] = useState('Relative Loan');
  const [splitLoan2Amount, setSplitLoan2Amount] = useState('37047');

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states for Add/Edit
  const [formName, setFormName] = useState('');
  const [formDirection, setFormDirection] = useState<'borrowed' | 'lent'>('borrowed');
  const [formCategory, setFormCategory] = useState('personal');
  const [formPrincipal, setFormPrincipal] = useState('');
  const [formOutstanding, setFormOutstanding] = useState('');
  const [formEmi, setFormEmi] = useState('');
  const [formTotalEmis, setFormTotalEmis] = useState('48');
  const [formPaidEmis, setFormPaidEmis] = useState('0');
  const [formFirstEmiDate, setFormFirstEmiDate] = useState('2026-08-13');
  const [formInterestRate, setFormInterestRate] = useState('');
  const [formNote, setFormNote] = useState('');

  // Implied rate explanation tooltip toggle
  const [showImpliedExplanation, setShowImpliedExplanation] = useState<string | null>(null);

  // KPI Calculations
  const kpi = useMemo(() => {
    let borrowedOutstanding = 0;
    let lentOutstanding = 0;
    let emisDueThisMonth = 0;
    let latestPayoffDate = '';
    let totalMonthlyEmi = 0;

    const currentMonth = todayDateStr.slice(0, 7);

    for (const l of loans) {
      if (l.direction === 'borrowed') {
        borrowedOutstanding += l.outstanding;
        totalMonthlyEmi += l.emi;
        const sch = calculateLoanSchedule(l, todayDateStr);
        const thisMonth = sch.schedule.find(s => s.dueDate.startsWith(currentMonth));
        if (thisMonth && thisMonth.status !== 'paid') {
          emisDueThisMonth += thisMonth.amount;
        }
        if (sch.lastEmiDate && sch.lastEmiDate > latestPayoffDate) {
          latestPayoffDate = sch.lastEmiDate;
        }
      } else {
        lentOutstanding += l.outstanding;
      }
    }

    const netDebt = borrowedOutstanding - lentOutstanding;

    // Average income from recent transactions or history (~₹80,000/mo)
    const incomeTx = transactions.filter(t => t.type === 'income');
    const avgIncome = incomeTx.length > 0 ? (incomeTx.reduce((s, t) => s + t.amount, 0) / 10) : 80000;
    const emiPercentOfIncome = avgIncome > 0 ? (totalMonthlyEmi / avgIncome) * 100 : 0;

    return {
      borrowedOutstanding,
      lentOutstanding,
      netDebt,
      emisDueThisMonth,
      latestPayoffDate,
      totalMonthlyEmi,
      emiPercentOfIncome,
    };
  }, [loans, transactions, todayDateStr]);

  // Filtered lists
  const borrowedLoans = useMemo(() => loans.filter(l => l.direction === 'borrowed'), [loans]);
  const lentLoans = useMemo(() => loans.filter(l => l.direction === 'lent'), [loans]);

  // Detect combined loan seed
  const combinedLentLoan = useMemo(() => {
    return lentLoans.find(l => l.name.toLowerCase().includes('combined') || l.note?.toLowerCase().includes('split'));
  }, [lentLoans]);

  // Open Add Modal
  const openAddModal = (dir: 'borrowed' | 'lent') => {
    setEditingLoan(null);
    setFormName('');
    setFormDirection(dir);
    setFormCategory('personal');
    setFormPrincipal('');
    setFormOutstanding('');
    setFormEmi(dir === 'borrowed' ? '12000' : '0');
    setFormTotalEmis(dir === 'borrowed' ? '48' : '0');
    setFormPaidEmis('0');
    setFormFirstEmiDate(todayDateStr);
    setFormInterestRate('');
    setFormNote('');
    setIsAddEditOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (l: Loan) => {
    setEditingLoan(l);
    setFormName(l.name);
    setFormDirection(l.direction);
    setFormCategory(l.category || 'personal');
    setFormPrincipal(String(l.principal || ''));
    setFormOutstanding(String(l.outstanding || ''));
    setFormEmi(String(l.emi || ''));
    setFormTotalEmis(String(l.totalEmis || ''));
    setFormPaidEmis(String(l.paidEmis || ''));
    setFormFirstEmiDate(l.firstEmiDate || todayDateStr);
    setFormInterestRate(l.interestRate !== null && l.interestRate !== undefined ? String(l.interestRate) : '');
    setFormNote(l.note || '');
    setIsAddEditOpen(true);
  };

  // Save Loan
  const handleSaveLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Please enter a loan name');
      return;
    }

    const principal = Number(formPrincipal) || 0;
    const outstanding = formOutstanding !== '' ? Number(formOutstanding) : principal;
    const emi = Number(formEmi) || 0;
    const totalEmis = Number(formTotalEmis) || 0;
    const paidEmis = Number(formPaidEmis) || 0;
    const interestRate = formInterestRate !== '' ? Number(formInterestRate) : null;

    const payload: Omit<Loan, 'id'> & { id?: string } = {
      id: editingLoan?.id,
      name: formName.trim(),
      direction: formDirection,
      category: formCategory,
      principal,
      outstanding,
      emi,
      totalEmis,
      paidEmis,
      paidAmount: editingLoan?.paidAmount || (paidEmis * emi),
      firstEmiDate: formFirstEmiDate || null,
      emiDay: formFirstEmiDate ? parseInt(formFirstEmiDate.split('-')[2], 10) : null,
      interestRate,
      note: formNote.trim(),
    };

    await addOrUpdateLoan(payload);
    setIsAddEditOpen(false);
    showToast(editingLoan ? 'Loan updated' : 'Loan added');
  };

  // Open Pay EMI
  const openPayEmiModal = (l: Loan) => {
    setPayingLoan(l);
    setAlsoAddExpense(true);
    setIsPayEmiOpen(true);
  };

  const handleConfirmPayEmi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingLoan) return;

    await payLoanEMI(payingLoan.id, alsoAddExpense);
    setIsPayEmiOpen(false);
    showToast(`Paid EMI of ₹${payingLoan.emi.toLocaleString('en-IN')} for ${payingLoan.name}`);
  };

  // Open Repayment for Lent Loan
  const openRepaymentModal = (l: Loan) => {
    setRepayingLoan(l);
    setRepaymentAmount(String(l.outstanding));
    setIsRepaymentOpen(true);
  };

  const handleConfirmRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayingLoan) return;

    const amt = Number(repaymentAmount) || 0;
    if (amt <= 0) {
      showToast('Please enter a valid amount');
      return;
    }

    await recordLentLoanPayment(repayingLoan.id, amt);
    setIsRepaymentOpen(false);
    showToast(`Recorded repayment of ₹${amt.toLocaleString('en-IN')} from ${repayingLoan.name}`);
  };

  // Split Combined Loan helper
  const openSplitModal = (l: Loan) => {
    setLoanToSplit(l);
    const half = Math.round(l.outstanding / 2);
    setSplitLoan1Name('Loan to Friend / Colleague');
    setSplitLoan1Amount(String(half));
    setSplitLoan2Name('Loan to Relative');
    setSplitLoan2Amount(String(l.outstanding - half));
    setIsSplitModalOpen(true);
  };

  const handleConfirmSplit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanToSplit) return;

    const amt1 = Number(splitLoan1Amount) || 0;
    const amt2 = Number(splitLoan2Amount) || 0;

    if (amt1 <= 0 || amt2 <= 0) {
      showToast('Both split amounts must be greater than 0');
      return;
    }

    // Delete original combined loan
    await deleteLoan(loanToSplit.id);

    // Create loan 1
    await addOrUpdateLoan({
      name: splitLoan1Name.trim(),
      direction: 'lent',
      category: 'personal',
      principal: amt1,
      outstanding: amt1,
      emi: 0,
      totalEmis: 0,
      paidEmis: 0,
      paidAmount: 0,
      firstEmiDate: null,
      emiDay: null,
      interestRate: null,
      note: `Split from ${loanToSplit.name}`,
    });

    // Create loan 2
    await addOrUpdateLoan({
      name: splitLoan2Name.trim(),
      direction: 'lent',
      category: 'personal',
      principal: amt2,
      outstanding: amt2,
      emi: 0,
      totalEmis: 0,
      paidEmis: 0,
      paidAmount: 0,
      firstEmiDate: null,
      emiDay: null,
      interestRate: null,
      note: `Split from ${loanToSplit.name}`,
    });

    setIsSplitModalOpen(false);
    showToast('Successfully split into 2 loans');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2.5">
            <Landmark className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            Loans & Debt
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Track borrowed liabilities, lent receivables, implied rates, and repayment schedules
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveScreen('emiManager')}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-semibold transition-colors"
          >
            <Calculator className="w-4 h-4 text-emerald-600" />
            Open EMI Manager
          </button>
          <button
            onClick={() => openAddModal(activeTab)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add {activeTab === 'borrowed' ? 'Borrowed Loan' : 'Lent Loan'}
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-[11px] font-medium text-zinc-500">Borrowed (I Owe)</span>
          <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5">
            {formatINR(kpi.borrowedOutstanding)}
          </p>
          <span className="text-[10px] text-zinc-400">{borrowedLoans.length} active loan{borrowedLoans.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-[11px] font-medium text-zinc-500">Lent (Owed to Me)</span>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatINR(kpi.lentOutstanding)}
          </p>
          <span className="text-[10px] text-zinc-400">{lentLoans.length} receivable{lentLoans.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-[11px] font-medium text-zinc-500">Net Debt</span>
          <p className={`text-lg font-bold mt-0.5 ${kpi.netDebt > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {formatINR(Math.abs(kpi.netDebt))}
          </p>
          <span className="text-[10px] text-zinc-400">
            {kpi.netDebt > 0 ? 'Net Borrowed' : 'Net Asset'}
          </span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-[11px] font-medium text-zinc-500">Due This Month</span>
          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
            {formatINR(kpi.emisDueThisMonth)}
          </p>
          <span className="text-[10px] text-zinc-400">EMI obligations</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-[11px] font-medium text-zinc-500">Loan-Free Date</span>
          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
            {kpi.latestPayoffDate ? kpi.latestPayoffDate.slice(0, 7) : 'Debt Free'}
          </p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Final payoff</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-[11px] font-medium text-zinc-500">EMI % of Income</span>
          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
            {kpi.emiPercentOfIncome.toFixed(1)}%
          </p>
          <span className="text-[10px] text-zinc-400">of avg ₹80k income</span>
        </div>
      </div>

      {/* Helper Banner for Seed Lent Loan Split */}
      {combinedLentLoan && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-300 dark:border-amber-800/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 mt-0.5">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                Seed Data Helper: Split Combined Lent Loan
              </h4>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                "{combinedLentLoan.name}" has combined 2 loans totaling {formatINR(combinedLentLoan.outstanding)}.
                Split it into 2 separate named borrowers with individual repayment tracking.
              </p>
            </div>
          </div>
          <button
            onClick={() => openSplitModal(combinedLentLoan)}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm whitespace-nowrap self-start sm:self-center transition-colors"
          >
            Split into 2 Named Loans
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab('borrowed')}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'borrowed'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          Borrowed (I Owe)
          <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
            {borrowedLoans.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('lent')}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'lent'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          Lent (Owed to Me)
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            {lentLoans.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Borrowed Loans */}
      {activeTab === 'borrowed' && (
        <div className="space-y-4">
          {borrowedLoans.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">No Borrowed Loans</h3>
              <p className="text-xs text-zinc-500 mt-1">You are completely debt free!</p>
            </div>
          ) : (
            borrowedLoans.map(loan => {
              const amort = generateDetailedLoanAmortization(loan, todayDateStr);
              const emisLeft = Math.max(0, loan.totalEmis - loan.paidEmis);
              const overdueCount = amort.rows.filter(r => r.status === 'overdue').length;

              return (
                <div
                  key={loan.id}
                  className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center font-bold text-sm">
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">{loan.name}</h3>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                            {loan.category}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Principal: {formatINR(loan.principal)} · EMI: {formatINR(loan.emi)}/mo · First EMI: {loan.firstEmiDate || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <button
                        onClick={() => openPayEmiModal(loan)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        Pay EMI
                      </button>
                      <button
                        onClick={() => openEditModal(loan)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(loan.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Overdue Alert banner if any */}
                  {overdueCount > 0 && (
                    <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-xl p-3 flex items-center justify-between text-xs text-rose-800 dark:text-rose-200">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        <span>
                          <strong>{overdueCount} Overdue EMI{overdueCount > 1 ? 's' : ''}!</strong> (
                          {amort.rows.filter(r => r.status === 'overdue').map(r => r.dueDate).join(', ')})
                        </span>
                      </div>
                      <button
                        onClick={() => openPayEmiModal(loan)}
                        className="underline font-bold hover:text-rose-900 ml-2"
                      >
                        Mark Paid
                      </button>
                    </div>
                  )}

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 dark:bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80 text-xs">
                    <div>
                      <span className="text-zinc-400 text-[11px]">Outstanding Principal</span>
                      <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm mt-0.5">
                        {formatINR(loan.outstanding)}
                      </p>
                    </div>

                    <div>
                      <span className="text-zinc-400 text-[11px]">Remaining Payable</span>
                      <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm mt-0.5">
                        {formatINR(amort.remainingPayable)}
                      </p>
                      <span className="text-[10px] text-zinc-400">({emisLeft} EMIs × {formatINR(loan.emi)})</span>
                    </div>

                    <div>
                      <span className="text-zinc-400 text-[11px]">Interest Rate</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                          {amort.effectiveAnnualRate > 0 ? `${amort.effectiveAnnualRate.toFixed(2)}% p.a.` : '0%'}
                        </p>
                        {amort.isImplied && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setShowImpliedExplanation(showImpliedExplanation === loan.id ? null : loan.id)}
                              className="text-amber-500 hover:text-amber-600"
                              title="Implied rate explanation"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                            {showImpliedExplanation === loan.id && (
                              <div className="absolute z-20 left-0 top-5 w-64 p-3 bg-zinc-900 text-white rounded-xl shadow-xl text-[11px] leading-relaxed">
                                <p className="font-semibold text-amber-300 mb-1">Implied Interest Rate ≈ {amort.effectiveAnnualRate.toFixed(2)}% p.a.</p>
                                <p>
                                  Old app showed 0%, but <strong>{loan.totalEmis} × {formatINR(loan.emi)} = {formatINR(loan.totalEmis * loan.emi)}</strong>, which is <strong>{formatINR((loan.totalEmis * loan.emi) - loan.principal)}</strong> above the principal {formatINR(loan.principal)}.
                                </p>
                                <p className="mt-1 text-zinc-300">
                                  Solved using standard monthly compounding amortization formula.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {amort.isImplied && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">implied rate</span>
                      )}
                    </div>

                    <div>
                      <span className="text-zinc-400 text-[11px]">EMIs Progress & Last Date</span>
                      <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm mt-0.5">
                        {loan.paidEmis} / {loan.totalEmis} paid
                      </p>
                      <span className="text-[10px] text-zinc-400">Ends {amort.lastEmiDate ? amort.lastEmiDate.slice(0, 7) : 'N/A'}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>Progress: {((loan.paidEmis / Math.max(1, loan.totalEmis)) * 100).toFixed(1)}%</span>
                      <span>{emisLeft} installments left</span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${(loan.paidEmis / Math.max(1, loan.totalEmis)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Lent Loans */}
      {activeTab === 'lent' && (
        <div className="space-y-4">
          {lentLoans.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">No Lent Loans</h3>
              <p className="text-xs text-zinc-500 mt-1">You haven't lent money to anyone or all have been returned.</p>
            </div>
          ) : (
            lentLoans.map(loan => {
              const isCombined = loan.name.toLowerCase().includes('combined') || loan.note?.toLowerCase().includes('split');

              return (
                <div
                  key={loan.id}
                  className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold text-sm">
                        <ArrowDownLeft className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">{loan.name}</h3>
                          {isCombined && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                              Combined Seed
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Initial Principal: {formatINR(loan.principal)} · Received so far: {formatINR(loan.paidAmount || 0)}
                        </p>
                        {loan.note && (
                          <p className="text-xs text-zinc-400 italic mt-0.5">"{loan.note}"</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      {isCombined ? (
                        <button
                          onClick={() => openSplitModal(loan)}
                          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
                        >
                          <GitFork className="w-3.5 h-3.5" />
                          Split Loan
                        </button>
                      ) : (
                        <button
                          onClick={() => openRepaymentModal(loan)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          Received Repayment
                        </button>
                      )}

                      <button
                        onClick={() => openEditModal(loan)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(loan.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-zinc-50 dark:bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80 text-xs">
                    <div>
                      <span className="text-zinc-400 text-[11px]">Outstanding Receivable</span>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400 text-base mt-0.5">
                        {formatINR(loan.outstanding)}
                      </p>
                    </div>

                    <div>
                      <span className="text-zinc-400 text-[11px]">Expected Return Date</span>
                      <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm mt-0.5">
                        {loan.firstEmiDate || 'Open / As agreed'}
                      </p>
                    </div>

                    <div>
                      <span className="text-zinc-400 text-[11px]">Status</span>
                      <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm mt-0.5">
                        {loan.outstanding === 0 ? 'Fully Returned' : 'Active Receivable'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Pay EMI Modal */}
      {isPayEmiOpen && payingLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                Pay Loan EMI — {payingLoan.name}
              </h3>
              <button
                onClick={() => setIsPayEmiOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmPayEmi} className="space-y-4 text-xs">
              <div className="bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-500">EMI Amount:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-sm">
                    {formatINR(payingLoan.emi)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Current Paid EMIs:</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {payingLoan.paidEmis} / {payingLoan.totalEmis}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Current Outstanding:</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {formatINR(payingLoan.outstanding)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                <div>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                    Also add as expense entry
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Creates an expense in "EMI" category today ({todayDateStr})
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={alsoAddExpense}
                  onChange={e => setAlsoAddExpense(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsPayEmiOpen(false)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  Confirm EMI Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lent Loan Repayment Modal */}
      {isRepaymentOpen && repayingLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                Record Received Repayment
              </h3>
              <button
                onClick={() => setIsRepaymentOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmRepayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Amount Received (₹)
                </label>
                <input
                  type="number"
                  required
                  value={repaymentAmount}
                  onChange={e => setRepaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 font-mono text-sm"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  ⓘ Loan repayments received are not income — they reduce the receivable balance!
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsRepaymentOpen(false)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  Record Received
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Split Combined Loan Modal */}
      {isSplitModalOpen && loanToSplit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <GitFork className="w-5 h-5 text-amber-600" />
                Split "{loanToSplit.name}" ({formatINR(loanToSplit.outstanding)})
              </h3>
              <button
                onClick={() => setIsSplitModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmSplit} className="space-y-4 text-xs">
              <p className="text-zinc-500">
                Split the combined lent loan into 2 distinct loans with specific names and amounts:
              </p>

              {/* Loan 1 */}
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 space-y-2">
                <h4 className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs">Loan 1</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-zinc-500">Borrower / Name</label>
                    <input
                      type="text"
                      required
                      value={splitLoan1Name}
                      onChange={e => setSplitLoan1Name(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-500">Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={splitLoan1Amount}
                      onChange={e => {
                        const v = Number(e.target.value) || 0;
                        setSplitLoan1Amount(e.target.value);
                        setSplitLoan2Amount(String(Math.max(0, loanToSplit.outstanding - v)));
                      }}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Loan 2 */}
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 space-y-2">
                <h4 className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs">Loan 2</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-zinc-500">Borrower / Name</label>
                    <input
                      type="text"
                      required
                      value={splitLoan2Name}
                      onChange={e => setSplitLoan2Name(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-500">Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={splitLoan2Amount}
                      onChange={e => {
                        const v = Number(e.target.value) || 0;
                        setSplitLoan2Amount(e.target.value);
                        setSplitLoan1Amount(String(Math.max(0, loanToSplit.outstanding - v)));
                      }}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs font-semibold px-1">
                <span>Sum of splits:</span>
                <span className={`font-mono ${
                  (Number(splitLoan1Amount) + Number(splitLoan2Amount)) === loanToSplit.outstanding
                    ? 'text-emerald-600'
                    : 'text-rose-600'
                }`}>
                  {formatINR(Number(splitLoan1Amount) + Number(splitLoan2Amount))} / {formatINR(loanToSplit.outstanding)}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsSplitModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  Confirm Split
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Loan Modal */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {editingLoan ? 'Edit Loan' : `Add ${formDirection === 'borrowed' ? 'Borrowed Loan' : 'Lent Loan'}`}
              </h3>
              <button
                onClick={() => setIsAddEditOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLoan} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Direction
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormDirection('borrowed')}
                    className={`p-2 rounded-lg border font-semibold ${
                      formDirection === 'borrowed'
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
                    }`}
                  >
                    Borrowed (I owe)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormDirection('lent')}
                    className={`p-2 rounded-lg border font-semibold ${
                      formDirection === 'lent'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
                    }`}
                  >
                    Lent (Owed to me)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Loan Name / Lender / Borrower
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. ALL Bank Loan, Rahul"
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Principal Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={formPrincipal}
                    onChange={e => setFormPrincipal(e.target.value)}
                    placeholder="400000"
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Current Outstanding (₹)
                  </label>
                  <input
                    type="number"
                    value={formOutstanding}
                    onChange={e => setFormOutstanding(e.target.value)}
                    placeholder="Auto if same"
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 font-mono"
                  />
                </div>
              </div>

              {formDirection === 'borrowed' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Monthly EMI (₹)
                      </label>
                      <input
                        type="number"
                        value={formEmi}
                        onChange={e => setFormEmi(e.target.value)}
                        placeholder="12000"
                        className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Total EMIs (tenure)
                      </label>
                      <input
                        type="number"
                        value={formTotalEmis}
                        onChange={e => setFormTotalEmis(e.target.value)}
                        placeholder="48"
                        className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Paid EMIs count
                      </label>
                      <input
                        type="number"
                        value={formPaidEmis}
                        onChange={e => setFormPaidEmis(e.target.value)}
                        placeholder="1"
                        className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        First EMI Date
                      </label>
                      <input
                        type="date"
                        value={formFirstEmiDate}
                        onChange={e => setFormFirstEmiDate(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Annual Interest Rate (%) — leave blank to compute implied rate
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formInterestRate}
                      onChange={e => setFormInterestRate(e.target.value)}
                      placeholder="e.g. 18.35 (leave empty for auto implied rate)"
                      className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 font-mono"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Note / Reminder
                </label>
                <textarea
                  value={formNote}
                  onChange={e => setFormNote(e.target.value)}
                  placeholder="Optional notes or repayment terms"
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  {editingLoan ? 'Save Changes' : 'Create Loan'}
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
          title="Delete Loan"
          message="Are you sure you want to delete this loan record? Existing expense entries will remain intact."
          confirmLabel="Delete"
          onConfirm={async () => {
            await deleteLoan(deleteConfirmId);
            setDeleteConfirmId(null);
            showToast('Loan record deleted');
          }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
};
