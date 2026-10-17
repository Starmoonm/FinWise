import React, { useState, useMemo } from 'react';
import {
  Calculator,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingDown,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  Link2,
  DollarSign,
  Sliders,
  Flame,
  Snowflake,
  HelpCircle,
  Receipt,
  FileSpreadsheet,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import { Loan, Transaction } from '../../types';
import {
  generateDetailedLoanAmortization,
  simulateLoanPrepayment,
  calculateDebtPayoffPlan,
  DetailedEMIScheduleRow,
} from '../../utils/calculations';
import { formatINR, formatCompactINR } from '../../utils/formatters';

export const EmiManagerScreen: React.FC = () => {
  const {
    loans,
    transactions,
    todayDateStr,
    payLoanEMI,
    addOrUpdateTransaction,
    addOrUpdateLoan,
    showToast,
  } = useFinance();

  const borrowedLoans = useMemo(() => loans.filter(l => l.direction === 'borrowed'), [loans]);
  const [selectedLoanFilter, setSelectedLoanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'upcoming' | 'paid'>('all');

  // Pay EMI modal
  const [payEmiRow, setPayEmiRow] = useState<DetailedEMIScheduleRow | null>(null);
  const [alsoAddExpense, setAlsoAddExpense] = useState(true);

  // Link existing entries modal / state
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<{
    tx: Transaction;
    row: DetailedEMIScheduleRow;
  } | null>(null);

  // Prepayment Simulator state
  const [simLoanId, setSimLoanId] = useState<string>(() => borrowedLoans[0]?.id || '');
  const [prepayAmount, setPrepayAmount] = useState<number>(50000);
  const [prepayMonth, setPrepayMonth] = useState<number>(3);
  const [prepayStrategy, setPrepayStrategy] = useState<'tenure' | 'emi'>('tenure');

  // Debt Payoff Planner state
  const [extraCash, setExtraCash] = useState<number>(5000);

  // Combine and sort amortized rows for all borrowed loans
  const allScheduleRows = useMemo(() => {
    let list: DetailedEMIScheduleRow[] = [];
    for (const loan of borrowedLoans) {
      if (selectedLoanFilter !== 'all' && loan.id !== selectedLoanFilter) continue;
      const amort = generateDetailedLoanAmortization(loan, todayDateStr);
      list = list.concat(amort.rows);
    }

    // Sort: overdue pinned on top, then upcoming by dueDate ascending, then paid by dueDate
    return list.sort((a, b) => {
      const order = { overdue: 1, upcoming: 2, paid: 3 };
      if (order[a.status] !== order[b.status]) {
        return order[a.status] - order[b.status];
      }
      return a.dueDate.localeCompare(b.dueDate);
    });
  }, [borrowedLoans, selectedLoanFilter, todayDateStr]);

  // Filtered rows for the table
  const displayedRows = useMemo(() => {
    if (statusFilter === 'all') return allScheduleRows;
    return allScheduleRows.filter(r => r.status === statusFilter);
  }, [allScheduleRows, statusFilter]);

  // KPI Summary
  const kpis = useMemo(() => {
    const overdueList = allScheduleRows.filter(r => r.status === 'overdue');
    const upcomingList = allScheduleRows.filter(r => r.status === 'upcoming');
    const totalRemainingPayable = upcomingList.reduce((sum, r) => sum + r.amount, 0) + overdueList.reduce((sum, r) => sum + r.amount, 0);

    return {
      overdueCount: overdueList.length,
      overdueTotal: overdueList.reduce((sum, r) => sum + r.amount, 0),
      upcomingCount: upcomingList.length,
      totalRemainingPayable,
      activeLoansCount: borrowedLoans.length,
    };
  }, [allScheduleRows, borrowedLoans]);

  // Candidate existing entries for "Link existing EMI entries"
  // Find transactions in 'EMI' category without loanId or matching dates
  const linkCandidates = useMemo(() => {
    const unlinkedEmiTx = transactions.filter(
      t => t.type === 'expense' && t.category === 'EMI' && !t.loanId
    );

    const candidates: Array<{
      tx: Transaction;
      matchingRow: DetailedEMIScheduleRow;
      dayDiff: number;
    }> = [];

    const overdueOrUpcoming = allScheduleRows.filter(r => r.status === 'overdue' || r.status === 'upcoming');

    for (const tx of unlinkedEmiTx) {
      const txTime = new Date(tx.date).getTime();
      let bestMatch: DetailedEMIScheduleRow | null = null;
      let minDiff = Infinity;

      for (const row of overdueOrUpcoming) {
        if (Math.abs(row.amount - tx.amount) < 500) {
          const rowTime = new Date(row.dueDate).getTime();
          const diffDays = Math.abs(Math.round((txTime - rowTime) / (1000 * 60 * 60 * 24)));
          if (diffDays <= 45 && diffDays < minDiff) {
            minDiff = diffDays;
            bestMatch = row;
          }
        }
      }

      if (bestMatch) {
        candidates.push({
          tx,
          matchingRow: bestMatch,
          dayDiff: minDiff,
        });
      }
    }

    return candidates;
  }, [transactions, allScheduleRows]);

  // Chart 1: Outstanding balance projection until payoff (area chart)
  const balanceProjectionChart = useMemo(() => {
    // Generate combined month timeline
    const monthBalanceMap: Record<string, number> = {};

    for (const loan of borrowedLoans) {
      const amort = generateDetailedLoanAmortization(loan, todayDateStr);
      for (const row of amort.rows) {
        if (row.status !== 'paid') {
          const m = row.dueDate.slice(0, 7);
          monthBalanceMap[m] = (monthBalanceMap[m] || 0) + row.balanceAfter;
        }
      }
    }

    const sortedMonths = Object.keys(monthBalanceMap).sort();
    return sortedMonths.map(m => {
      const d = new Date(`${m}-01`);
      return {
        month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        balance: monthBalanceMap[m],
      };
    });
  }, [borrowedLoans, todayDateStr]);

  // Chart 2: Principal vs Interest per year (stacked bars)
  const yearlyPrincipalInterestChart = useMemo(() => {
    const yearMap: Record<string, { principal: number; interest: number }> = {};

    for (const loan of borrowedLoans) {
      const amort = generateDetailedLoanAmortization(loan, todayDateStr);
      for (const row of amort.rows) {
        const yr = row.dueDate.slice(0, 4);
        if (!yearMap[yr]) {
          yearMap[yr] = { principal: 0, interest: 0 };
        }
        yearMap[yr].principal += row.principalPart;
        yearMap[yr].interest += row.interestPart;
      }
    }

    const sortedYears = Object.keys(yearMap).sort();
    return sortedYears.map(yr => ({
      year: yr,
      principal: yearMap[yr].principal,
      interest: yearMap[yr].interest,
    }));
  }, [borrowedLoans, todayDateStr]);

  // Prepayment simulation result
  const simLoan = useMemo(() => borrowedLoans.find(l => l.id === simLoanId) || borrowedLoans[0], [borrowedLoans, simLoanId]);
  const simResult = useMemo(() => {
    if (!simLoan) return null;
    return simulateLoanPrepayment(simLoan, prepayAmount, prepayMonth, prepayStrategy);
  }, [simLoan, prepayAmount, prepayMonth, prepayStrategy]);

  // Debt payoff plan (Snowball vs Avalanche)
  const payoffPlan = useMemo(() => {
    if (borrowedLoans.length < 2) return null;
    return calculateDebtPayoffPlan(borrowedLoans, extraCash, todayDateStr);
  }, [borrowedLoans, extraCash, todayDateStr]);

  // Handle Pay EMI button click on table row
  const handleOpenPayEmi = (row: DetailedEMIScheduleRow) => {
    setPayEmiRow(row);
    // If overdue, default alsoAddExpense to false because the user might have already entered it earlier;
    // if upcoming, default to true!
    setAlsoAddExpense(row.status === 'upcoming');
  };

  const handleConfirmPayEmi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payEmiRow) return;

    await payLoanEMI(payEmiRow.loanId, alsoAddExpense);
    setPayEmiRow(null);
    showToast(`Marked EMI #${payEmiRow.installmentNumber} paid for ${payEmiRow.loanName}`);
  };

  // Handle Link Candidate
  const handleLinkTransaction = async (candidate: { tx: Transaction; row: DetailedEMIScheduleRow }) => {
    // 1. Mark transaction with loanId
    await addOrUpdateTransaction({
      ...candidate.tx,
      loanId: candidate.row.loanId,
    });

    // 2. Increment loan paidEmis if this row wasn't marked paid
    const targetLoan = loans.find(l => l.id === candidate.row.loanId);
    if (targetLoan && candidate.row.installmentNumber > targetLoan.paidEmis) {
      await addOrUpdateLoan({
        ...targetLoan,
        paidEmis: targetLoan.paidEmis + 1,
        paidAmount: targetLoan.paidAmount + candidate.tx.amount,
        outstanding: Math.max(0, targetLoan.outstanding - (targetLoan.outstanding / Math.max(1, targetLoan.totalEmis - targetLoan.paidEmis))),
      });
    }

    showToast(`Linked transaction of ₹${candidate.tx.amount.toLocaleString('en-IN')} to EMI #${candidate.row.installmentNumber}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2.5">
            <Calculator className="w-7 h-7 text-emerald-600" />
            EMI Manager & Amortization
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Master schedule across all loans, prepayment simulator, and snowball vs avalanche payoff planner
          </p>
        </div>

        {linkCandidates.length > 0 && (
          <button
            onClick={() => setIsLinkModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Link2 className="w-4 h-4" />
            Link Existing EMI Entries ({linkCandidates.length} suggestions)
          </button>
        )}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className={`p-4 rounded-xl border shadow-sm ${
          kpis.overdueCount > 0
            ? 'bg-rose-50/80 border-rose-200'
            : 'bg-white border-zinc-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Overdue EMIs</span>
            {kpis.overdueCount > 0 && <AlertCircle className="w-4 h-4 text-rose-600" />}
          </div>
          <p className="text-xl font-bold text-rose-600 mt-1">
            {kpis.overdueCount} Overdue ({formatINR(kpis.overdueTotal)})
          </p>
          <span className="text-[11px] text-zinc-400">pinned at the top of the schedule</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
          <span className="text-xs font-medium text-zinc-500">Remaining Payable</span>
          <p className="text-xl font-bold text-zinc-900 mt-1">
            {formatINR(kpis.totalRemainingPayable)}
          </p>
          <span className="text-[11px] text-zinc-400">total remaining installments</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
          <span className="text-xs font-medium text-zinc-500">Upcoming EMIs</span>
          <p className="text-xl font-bold text-zinc-900 mt-1">
            {kpis.upcomingCount} installments
          </p>
          <span className="text-[11px] text-zinc-400">scheduled till payoff</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
          <span className="text-xs font-medium text-zinc-500">Tracked Borrowed Loans</span>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            {kpis.activeLoansCount} loan{kpis.activeLoansCount !== 1 ? 's' : ''}
          </p>
          <span className="text-[11px] text-zinc-400">ALL Bank & other liabilities</span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Outstanding balance projection until payoff */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-800 mb-1 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-emerald-600" />
            Outstanding Balance Projection until Payoff
          </h3>
          <p className="text-xs text-zinc-500 mb-3">
            Principal remaining curve month-by-month until full debt freedom
          </p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={balanceProjectionChart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${formatCompactINR(v)}`} />
                <Tooltip formatter={(val: any) => [formatINR(Number(val) || 0), 'Remaining Balance']} />
                <Area type="monotone" dataKey="balance" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#balanceGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Principal vs Interest per year */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-800 mb-1 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            Principal vs Interest per Year
          </h3>
          <p className="text-xs text-zinc-500 mb-3">
            Yearly breakdown of loan amortization payments
          </p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearlyPrincipalInterestChart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${formatCompactINR(v)}`} />
                <Tooltip formatter={(val: any) => [formatINR(Number(val) || 0)]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="principal" name="Principal" fill="#059669" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="interest" name="Interest" fill="#f59e0b" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Prepayment Simulator Card */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              Loan Prepayment Simulator
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Simulate prepaying extra cash and evaluate "Reduce Tenure" vs "Reduce EMI"
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={simLoanId}
              onChange={e => setSimLoanId(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-zinc-300 bg-white font-medium"
            >
              {borrowedLoans.map(l => (
                <option key={l.id} value={l.id}>{l.name} ({formatINR(l.outstanding)})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-zinc-500 mb-1">Prepay Amount (₹)</label>
            <input
              type="number"
              value={prepayAmount}
              onChange={e => setPrepayAmount(Number(e.target.value) || 0)}
              step="5000"
              className="w-full px-3 py-2 border rounded-lg bg-zinc-50 border-zinc-300 font-mono text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-zinc-500 mb-1">In Installment Month #</label>
            <input
              type="number"
              min="1"
              max={simLoan?.totalEmis || 48}
              value={prepayMonth}
              onChange={e => setPrepayMonth(Number(e.target.value) || 1)}
              className="w-full px-3 py-2 border rounded-lg bg-zinc-50 border-zinc-300 font-mono text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-zinc-500 mb-1">Prepayment Strategy</label>
            <div className="grid grid-cols-2 gap-1.5 h-[38px]">
              <button
                type="button"
                onClick={() => setPrepayStrategy('tenure')}
                className={`rounded-lg border text-xs font-semibold ${
                  prepayStrategy === 'tenure'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                    : 'border-zinc-200 text-zinc-500'
                }`}
              >
                Reduce Tenure
              </button>
              <button
                type="button"
                onClick={() => setPrepayStrategy('emi')}
                className={`rounded-lg border text-xs font-semibold ${
                  prepayStrategy === 'emi'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                    : 'border-zinc-200 text-zinc-500'
                }`}
              >
                Reduce EMI
              </button>
            </div>
          </div>
        </div>

        {/* Simulator Outcome Result Box */}
        {simResult && (
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-zinc-500 text-[11px]">Interest Saved</span>
              <p className="text-base font-bold text-emerald-600 mt-0.5">
                {formatINR(simResult.interestSaved)}
              </p>
              <span className="text-[10px] text-zinc-400">direct savings</span>
            </div>

            <div>
              <span className="text-zinc-500 text-[11px]">
                {prepayStrategy === 'tenure' ? 'Tenure Reduction' : 'New Monthly EMI'}
              </span>
              <p className="text-base font-bold text-zinc-900 mt-0.5">
                {prepayStrategy === 'tenure'
                  ? `${simResult.monthsSaved} months saved`
                  : formatINR(simResult.newEmi)}
              </p>
              <span className="text-[10px] text-zinc-400">
                {prepayStrategy === 'tenure' ? 'earlier payoff' : `was ${formatINR(simLoan?.emi || 0)}`}
              </span>
            </div>

            <div>
              <span className="text-zinc-500 text-[11px]">New Payoff Date</span>
              <p className="text-base font-bold text-zinc-900 mt-0.5">
                {simResult.newPayoffDate ? simResult.newPayoffDate.slice(0, 7) : 'N/A'}
              </p>
              <span className="text-[10px] text-zinc-400">
                Original was {simResult.originalPayoffDate ? simResult.originalPayoffDate.slice(0, 7) : 'N/A'}
              </span>
            </div>

            <div>
              <span className="text-zinc-500 text-[11px]">Total Payments Saved</span>
              <p className="text-base font-bold text-emerald-600 mt-0.5">
                {formatINR(simResult.totalSavings)}
              </p>
              <span className="text-[10px] text-emerald-600 font-medium">ROI on prepayment</span>
            </div>
          </div>
        )}
      </div>

      {/* Debt Payoff Planner (Snowball vs Avalanche) */}
      {payoffPlan && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-600" />
                Debt Payoff Strategy: Snowball vs Avalanche
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Compare psychological momentum (Snowball) vs mathematical optimization (Avalanche)
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500">Extra Monthly Cash:</span>
              <input
                type="number"
                value={extraCash}
                onChange={e => setExtraCash(Number(e.target.value) || 0)}
                step="1000"
                className="w-24 px-2 py-1 border rounded-lg bg-zinc-50 border-zinc-300 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Snowball */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-blue-900 flex items-center gap-1.5 text-sm">
                  <Snowflake className="w-4 h-4 text-blue-600" />
                  Debt Snowball
                </h4>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Smallest Balance First
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-zinc-500 text-[11px]">Debt-Free Date:</span>
                  <p className="font-bold text-zinc-900 mt-0.5">
                    {payoffPlan.snowball.debtFreeDate.slice(0, 7)} ({payoffPlan.snowball.totalMonths} months)
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500 text-[11px]">Total Interest:</span>
                  <p className="font-bold text-zinc-900 mt-0.5">
                    {formatINR(payoffPlan.snowball.totalInterestPaid)}
                  </p>
                </div>
              </div>
              <div className="text-[11px] text-zinc-600">
                Order: {payoffPlan.snowball.order.map(l => l.loanName).join(' → ')}
              </div>
            </div>

            {/* Avalanche */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-amber-900 flex items-center gap-1.5 text-sm">
                  <Flame className="w-4 h-4 text-amber-600" />
                  Debt Avalanche
                </h4>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Highest Rate First
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-zinc-500 text-[11px]">Debt-Free Date:</span>
                  <p className="font-bold text-zinc-900 mt-0.5">
                    {payoffPlan.avalanche.debtFreeDate.slice(0, 7)} ({payoffPlan.avalanche.totalMonths} months)
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500 text-[11px]">Total Interest:</span>
                  <p className="font-bold text-zinc-900 mt-0.5">
                    {formatINR(payoffPlan.avalanche.totalInterestPaid)}
                  </p>
                </div>
              </div>
              <div className="text-[11px] text-zinc-600">
                Order: {payoffPlan.avalanche.order.map(l => l.loanName).join(' → ')}
                {payoffPlan.interestDifference > 0 && (
                  <span className="text-emerald-600 font-semibold ml-2">
                    (Saves {formatINR(payoffPlan.interestDifference)} more interest than Snowball)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Master Schedule Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              Master EMI Schedule
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              All installments across all borrowed loans with principal/interest amortized breakdown
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by loan */}
            <select
              value={selectedLoanFilter}
              onChange={e => setSelectedLoanFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-300 bg-white font-medium"
            >
              <option value="all">All Loans ({borrowedLoans.length})</option>
              {borrowedLoans.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>

            {/* Filter by status */}
            <div className="flex rounded-lg border border-zinc-300 overflow-hidden text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 font-medium ${statusFilter === 'all' ? 'bg-zinc-800 text-white' : 'bg-transparent text-zinc-600'}`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('overdue')}
                className={`px-2.5 py-1 font-medium ${statusFilter === 'overdue' ? 'bg-rose-600 text-white' : 'bg-transparent text-rose-600'}`}
              >
                Overdue
              </button>
              <button
                onClick={() => setStatusFilter('upcoming')}
                className={`px-2.5 py-1 font-medium ${statusFilter === 'upcoming' ? 'bg-amber-600 text-white' : 'bg-transparent text-amber-600'}`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setStatusFilter('paid')}
                className={`px-2.5 py-1 font-medium ${statusFilter === 'paid' ? 'bg-emerald-600 text-white' : 'bg-transparent text-emerald-600'}`}
              >
                Paid
              </button>
            </div>
          </div>
        </div>

        {/* Schedule Table */}
        <div className="border border-zinc-200 rounded-xl overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider text-[10px] sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="py-2.5 px-3">EMI #</th>
                <th className="py-2.5 px-3">Loan</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3 text-right">Principal</th>
                <th className="py-2.5 px-3 text-right">Interest</th>
                <th className="py-2.5 px-3 text-right">Balance After</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-zinc-400">
                    No installments matching the selected filter
                  </td>
                </tr>
              ) : (
                displayedRows.map((row, idx) => (
                  <tr
                    key={`${row.loanId}-${row.installmentNumber}-${idx}`}
                    className={`hover:bg-zinc-50 transition-colors ${
                      row.status === 'overdue' ? 'bg-rose-50/40' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-zinc-700">
                      #{row.installmentNumber}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-zinc-900">
                      {row.loanName}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-zinc-600">
                      {row.dueDate}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-900">
                      {formatINR(row.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-600 font-medium">
                      {formatINR(row.principalPart)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-600">
                      {formatINR(row.interestPart)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-zinc-800">
                      {formatINR(row.balanceAfter)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          row.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : row.status === 'overdue'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {row.status === 'paid' ? 'Paid ✓' : row.status === 'overdue' ? 'Overdue !' : 'Upcoming'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {row.status !== 'paid' ? (
                        <button
                          onClick={() => handleOpenPayEmi(row)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition-colors shadow-sm"
                        >
                          Pay EMI
                        </button>
                      ) : (
                        <span className="text-[11px] text-zinc-400 font-medium">Completed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pay EMI Modal */}
      {payEmiRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-600/30 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                Pay EMI #{payEmiRow.installmentNumber} — {payEmiRow.loanName}
              </h3>
              <button
                onClick={() => setPayEmiRow(null)}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmPayEmi} className="space-y-4 text-xs">
              <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-500">EMI Amount:</span>
                  <span className="font-bold text-zinc-900 font-mono text-sm">
                    {formatINR(payEmiRow.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Scheduled Due Date:</span>
                  <span className="font-mono text-zinc-700">
                    {payEmiRow.dueDate}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Principal Part / Interest Part:</span>
                  <span className="font-mono text-zinc-700">
                    {formatINR(payEmiRow.principalPart)} / {formatINR(payEmiRow.interestPart)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Current Status:</span>
                  <span className={`font-semibold capitalize ${payEmiRow.status === 'overdue' ? 'text-rose-600' : 'text-amber-600'}`}>
                    {payEmiRow.status}
                  </span>
                </div>
              </div>

              {/* Toggle "Also add as expense": default ON for upcoming; default OFF for overdue */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 bg-zinc-50">
                <div className="pr-3">
                  <span className="font-semibold text-zinc-800 block">
                    Also add as expense entry
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    {payEmiRow.status === 'overdue'
                      ? 'Default OFF for overdue EMIs you may have already entered earlier in Bank/Cash records.'
                      : 'Default ON: records an expense under "EMI" category today.'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={alsoAddExpense}
                  onChange={e => setAlsoAddExpense(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setPayEmiRow(null)}
                  className="px-4 py-2 border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  Confirm Pay EMI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Existing EMI Entries Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-600/30 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl p-6 shadow-2xl border border-zinc-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-amber-600" />
                Link Existing EMI Entries ({linkCandidates.length})
              </h3>
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-500">
              Found existing transactions recorded in the "EMI" category that match scheduled installments. Link them to attach their loanId and mark the corresponding EMI paid instead of creating duplicate entries.
            </p>

            <div className="space-y-3">
              {linkCandidates.map((candidate, idx) => (
                <div
                  key={`${candidate.tx.id}-${candidate.matchingRow.installmentNumber}-${idx}`}
                  className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900">
                        {candidate.tx.note || candidate.tx.category} — {formatINR(candidate.tx.amount)}
                      </span>
                      <span className="font-mono text-zinc-500">({candidate.tx.date})</span>
                    </div>
                    <div className="text-zinc-500 text-[11px] mt-1 flex items-center gap-1.5">
                      <ArrowRight className="w-3 h-3 text-amber-600" />
                      Matches: <strong>{candidate.matchingRow.loanName}</strong> EMI #{candidate.matchingRow.installmentNumber} due {candidate.matchingRow.dueDate} (diff: {candidate.dayDiff} days)
                    </div>
                  </div>

                  <button
                    onClick={() => handleLinkTransaction({ tx: candidate.tx, row: candidate.matchingRow })}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm self-start sm:self-center whitespace-nowrap"
                  >
                    Link & Mark Paid
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-zinc-100">
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className="px-4 py-2 bg-zinc-800 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
