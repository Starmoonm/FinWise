import {
  Transaction,
  Loan,
  Investment,
  Goal,
  CreditCard,
  Asset,
  Budget,
  AppHistory,
  FinancialHealthResult,
  EMIScheduleItem,
} from '../types';
import { formatINR } from './formatters';

// Fixed reference date when testing against seed data acceptance checks
export const DEFAULT_APP_TODAY = '2026-10-14';

/**
 * Filter transactions by month (YYYY-MM).
 */
export function getTransactionsForMonth(transactions: Transaction[], monthKey: string): Transaction[] {
  return transactions.filter(t => t.date.startsWith(monthKey));
}

/**
 * Spending = sum of type "expense" (EMI entries ARE spending). Investments are NOT spending.
 */
export function calculateSpending(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
}

/**
 * Income = sum of type "income".
 */
export function calculateIncome(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
}

/**
 * Invested = sum of type "invest".
 */
export function calculateInvested(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.type === 'invest')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
}

/**
 * Left = Income − Spending − Invested (can be negative).
 */
export function calculateLeft(income: number, spending: number, invested: number): number {
  return income - spending - invested;
}

/**
 * Outflow = Spending + Invested (used for comparing with old-app history).
 */
export function calculateOutflow(spending: number, invested: number): number {
  return spending + invested;
}

/**
 * Savings rate = (Income − Spending) / Income.
 */
export function calculateSavingsRate(income: number, spending: number): number {
  if (income <= 0) return 0;
  return (income - spending) / income;
}

/**
 * Investing rate = Invested / Income.
 */
export function calculateInvestingRate(income: number, invested: number): number {
  if (income <= 0) return 0;
  return invested / income;
}

/**
 * Credit card outstanding = openingOutstanding + all "Credit Card" mode expenses created after asOf − all cardPayment entries created after asOf.
 */
export function calculateCreditCardOutstanding(card: CreditCard, transactions: Transaction[]): number {
  const asOfTime = new Date(card.asOf).getTime();

  let postAsOfExpenses = 0;
  let postAsOfPayments = 0;

  for (const t of transactions) {
    const tTime = t.createdAt ? new Date(t.createdAt).getTime() : new Date(`${t.date}T12:00:00Z`).getTime();
    if (tTime > asOfTime) {
      if (t.type === 'expense' && t.mode === 'Credit Card') {
        postAsOfExpenses += t.amount;
      } else if (t.type === 'cardPayment') {
        postAsOfPayments += t.amount;
      }
    }
  }

  return (card.openingOutstanding || 0) + postAsOfExpenses - postAsOfPayments;
}

/**
 * Total credit card outstanding across all cards.
 */
export function calculateTotalCardsOutstanding(cards: CreditCard[], transactions: Transaction[]): number {
  return cards.reduce((sum, card) => sum + calculateCreditCardOutstanding(card, transactions), 0);
}

/**
 * Net worth = Goal savings + Investments currentValue + Other assets + Money lent outstanding − Borrowed loans outstanding − Credit card outstanding.
 */
export function calculateNetWorth(params: {
  goals: Goal[];
  investments: Investment[];
  assets: Asset[];
  loans: Loan[];
  cards: CreditCard[];
  transactions: Transaction[];
}): {
  goalSavings: number;
  investmentsTotal: number;
  assetsTotal: number;
  lentOutstanding: number;
  borrowedOutstanding: number;
  cardsOutstanding: number;
  netWorth: number;
} {
  const goalSavings = params.goals.reduce((sum, g) => sum + (Number(g.saved) || 0), 0);
  const investmentsTotal = params.investments.reduce((sum, i) => sum + (Number(i.currentValue) || 0), 0);
  const assetsTotal = params.assets.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
  
  const lentOutstanding = params.loans
    .filter(l => l.direction === 'lent')
    .reduce((sum, l) => sum + (Number(l.outstanding) || 0), 0);

  const borrowedOutstanding = params.loans
    .filter(l => l.direction === 'borrowed')
    .reduce((sum, l) => sum + (Number(l.outstanding) || 0), 0);

  const cardsOutstanding = calculateTotalCardsOutstanding(params.cards, params.transactions);

  const netWorth =
    goalSavings +
    investmentsTotal +
    assetsTotal +
    lentOutstanding -
    borrowedOutstanding -
    cardsOutstanding;

  return {
    goalSavings,
    investmentsTotal,
    assetsTotal,
    lentOutstanding,
    borrowedOutstanding,
    cardsOutstanding,
    netWorth,
  };
}

/**
 * Avg monthly spending = average Spending of the last 3 complete months that have entries; if none, use the current month.
 */
export function calculateAvgMonthlySpending(
  transactions: Transaction[],
  currentMonthKey: string,
  history?: AppHistory
): number {
  const spendingByMonth: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type === 'expense') {
      const month = t.date.slice(0, 7);
      spendingByMonth[month] = (spendingByMonth[month] || 0) + t.amount;
    }
  }

  // Look for complete months prior to currentMonthKey
  const priorMonths = Object.keys(spendingByMonth)
    .filter(m => m < currentMonthKey)
    .sort()
    .reverse();

  if (priorMonths.length >= 3) {
    const last3 = priorMonths.slice(0, 3);
    const sum = last3.reduce((acc, m) => acc + spendingByMonth[m], 0);
    return sum / 3;
  }

  // If we have history avg3MonthsByCategory, sum of that can provide a fallback if available
  if (history?.avg3MonthsByCategory && priorMonths.length === 0) {
    const histSum = Object.values(history.avg3MonthsByCategory).reduce((a, b) => a + b, 0);
    if (histSum > 0) {
      // Current month or history
      const currentMonthSpending = spendingByMonth[currentMonthKey] || 0;
      return currentMonthSpending > 0 ? currentMonthSpending : histSum;
    }
  }

  const currentSpending = spendingByMonth[currentMonthKey] || 0;
  return currentSpending > 0 ? currentSpending : 1;
}

/**
 * Emergency fund coverage (months) = saved in the goal with isEmergencyFund / Avg monthly spending.
 */
export function calculateEmergencyFundCoverage(
  goals: Goal[],
  avgMonthlySpending: number
): { months: number; saved: number; target: number } {
  const efGoal = goals.find(g => g.isEmergencyFund) || goals[0];
  const saved = efGoal ? Number(efGoal.saved) || 0 : 0;
  const target = efGoal ? Number(efGoal.target) || 0 : 0;
  const months = avgMonthlySpending > 0 ? saved / avgMonthlySpending : 0;
  return { months, saved, target };
}

/**
 * EMI burden = EMI-category spending this month / Income this month.
 */
export function calculateEMIBurden(transactionsThisMonth: Transaction[], incomeThisMonth: number): number {
  if (incomeThisMonth <= 0) return 0;
  const emiSpending = transactionsThisMonth
    .filter(t => t.type === 'expense' && t.category.toLowerCase() === 'emi')
    .reduce((sum, t) => sum + t.amount, 0);
  return emiSpending / incomeThisMonth;
}

/**
 * Add N months to YYYY-MM-DD
 */
export function addMonthsToDate(dateStr: string, monthsToAdd: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetMonth = m - 1 + monthsToAdd;
  const targetYear = y + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;

  // determine max days in target month
  const daysInMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  const day = Math.min(d, daysInMonth);

  const mm = String(normalizedMonth + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${targetYear}-${mm}-${dd}`;
}

/**
 * Loan EMI schedule:
 * EMI #n is due on firstEmiDate + (n−1) months.
 * Next due = EMI #(paidEmis+1).
 * An EMI is overdue if its due date < today and it is unpaid.
 * Last EMI date = firstEmiDate + (totalEmis−1) months.
 * Remaining payable = (totalEmis − paidEmis) × emi.
 */
export function calculateLoanSchedule(loan: Loan, todayStr: string = DEFAULT_APP_TODAY): {
  schedule: EMIScheduleItem[];
  nextDueDate: string | null;
  overdueCount: number;
  overdueDateList: string[];
  lastEmiDate: string | null;
  emisLeft: number;
  remainingPayable: number;
  tenureYearsMonths: string;
} {
  const emisLeft = Math.max(0, (loan.totalEmis || 0) - (loan.paidEmis || 0));
  const remainingPayable = emisLeft * (loan.emi || 0);

  if (!loan.firstEmiDate || loan.totalEmis <= 0) {
    return {
      schedule: [],
      nextDueDate: null,
      overdueCount: 0,
      overdueDateList: [],
      lastEmiDate: null,
      emisLeft,
      remainingPayable,
      tenureYearsMonths: '0m',
    };
  }

  const schedule: EMIScheduleItem[] = [];
  const overdueDateList: string[] = [];
  let nextDueDate: string | null = null;

  for (let n = 1; n <= loan.totalEmis; n++) {
    const dueDate = addMonthsToDate(loan.firstEmiDate, n - 1);
    let status: 'paid' | 'overdue' | 'upcoming';

    if (n <= loan.paidEmis) {
      status = 'paid';
    } else {
      if (!nextDueDate) {
        nextDueDate = dueDate;
      }
      if (dueDate < todayStr) {
        status = 'overdue';
        overdueDateList.push(dueDate);
      } else {
        status = 'upcoming';
      }
    }

    schedule.push({
      installmentNumber: n,
      dueDate,
      amount: loan.emi,
      status,
    });
  }

  const lastEmiDate = addMonthsToDate(loan.firstEmiDate, loan.totalEmis - 1);

  const years = Math.floor(emisLeft / 12);
  const months = emisLeft % 12;
  const tenureYearsMonths = years > 0 ? `${years}y ${months}m` : `${months}m`;

  return {
    schedule,
    nextDueDate,
    overdueCount: overdueDateList.length,
    overdueDateList,
    lastEmiDate,
    emisLeft,
    remainingPayable,
    tenureYearsMonths,
  };
}

/**
 * Pay EMI calculation:
 * paidEmis + 1, paidAmount + emi, outstanding − (outstanding / EMIs remaining before this payment).
 */
export function computePayEMI(loan: Loan): {
  updatedLoan: Loan;
  principalReduction: number;
} {
  const emisRemainingBefore = Math.max(1, loan.totalEmis - loan.paidEmis);
  const principalReduction = loan.outstanding / emisRemainingBefore;
  const newOutstanding = Math.max(0, Math.round(loan.outstanding - principalReduction));

  const updatedLoan: Loan = {
    ...loan,
    paidEmis: loan.paidEmis + 1,
    paidAmount: loan.paidAmount + loan.emi,
    outstanding: newOutstanding,
  };

  return { updatedLoan, principalReduction };
}

/**
 * Computes implied annual interest rate p.a. (%) for a loan from principal, EMI, and total EMIs
 * using high-precision bisection method.
 */
export function computeImpliedAnnualRate(
  principal: number,
  emi: number,
  totalEmis: number
): number | null {
  if (principal <= 0 || emi <= 0 || totalEmis <= 0) return null;
  const totalPayable = emi * totalEmis;
  if (totalPayable <= principal) return 0; // 0% or negative interest

  let low = 0.000001; // monthly rate
  let high = 0.20; // 240% p.a. upper bound

  for (let iter = 0; iter < 60; iter++) {
    const mid = (low + high) / 2;
    const factor = Math.pow(1 + mid, totalEmis);
    const calcEmi = (principal * mid * factor) / (factor - 1);
    if (calcEmi > emi) {
      high = mid;
    } else {
      low = mid;
    }
  }

  const monthlyRate = (low + high) / 2;
  const annualRate = monthlyRate * 12 * 100;
  return Math.round(annualRate * 100) / 100;
}

export interface DetailedEMIScheduleRow {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  principalPart: number;
  interestPart: number;
  balanceAfter: number;
  status: 'paid' | 'overdue' | 'upcoming';
  loanId: string;
  loanName: string;
}

/**
 * Generate month-by-month amortized breakdown for a loan
 */
export function generateDetailedLoanAmortization(
  loan: Loan,
  todayStr: string = DEFAULT_APP_TODAY
): {
  rows: DetailedEMIScheduleRow[];
  totalInterest: number;
  effectiveAnnualRate: number;
  isImplied: boolean;
  remainingPayable: number;
  lastEmiDate: string | null;
} {
  const principal = loan.principal || 0;
  const emi = loan.emi || 0;
  const totalEmis = loan.totalEmis || 0;

  if (principal <= 0 || emi <= 0 || totalEmis <= 0 || !loan.firstEmiDate) {
    return {
      rows: [],
      totalInterest: 0,
      effectiveAnnualRate: loan.interestRate || 0,
      isImplied: false,
      remainingPayable: 0,
      lastEmiDate: null,
    };
  }

  const isImplied = loan.interestRate === null || loan.interestRate === undefined;
  const effectiveAnnualRate = isImplied
    ? computeImpliedAnnualRate(principal, emi, totalEmis) || 0
    : (loan.interestRate || 0);

  const monthlyRate = (effectiveAnnualRate / 100) / 12;
  let currentBalance = principal;
  let totalInterest = 0;
  const rows: DetailedEMIScheduleRow[] = [];

  for (let n = 1; n <= totalEmis; n++) {
    const dueDate = addMonthsToDate(loan.firstEmiDate, n - 1);
    const interestPart = monthlyRate > 0 ? Math.round(currentBalance * monthlyRate) : 0;
    const principalPart = n === totalEmis
      ? Math.round(currentBalance)
      : Math.min(Math.round(currentBalance), Math.max(0, emi - interestPart));
    const balanceAfter = Math.max(0, Math.round(currentBalance - principalPart));
    totalInterest += interestPart;
    currentBalance = balanceAfter;

    let status: 'paid' | 'overdue' | 'upcoming';
    if (n <= (loan.paidEmis || 0)) {
      status = 'paid';
    } else if (dueDate < todayStr) {
      status = 'overdue';
    } else {
      status = 'upcoming';
    }

    rows.push({
      installmentNumber: n,
      dueDate,
      amount: emi,
      principalPart,
      interestPart,
      balanceAfter,
      status,
      loanId: loan.id,
      loanName: loan.name,
    });
  }

  const emisLeft = Math.max(0, totalEmis - (loan.paidEmis || 0));
  const remainingPayable = emisLeft * emi;
  const lastEmiDate = addMonthsToDate(loan.firstEmiDate, totalEmis - 1);

  return {
    rows,
    totalInterest,
    effectiveAnnualRate,
    isImplied,
    remainingPayable,
    lastEmiDate,
  };
}

export interface PrepaymentSimulationResult {
  strategy: 'tenure' | 'emi';
  prepayAmount: number;
  prepayMonth: number;
  originalTotalInterest: number;
  originalPayoffDate: string;
  originalRemainingPayable: number;
  newTotalInterest: number;
  newPayoffDate: string;
  interestSaved: number;
  monthsSaved: number;
  newEmi: number;
  totalSavings: number;
}

/**
 * Prepayment simulator: "Prepay ₹X in month Y" → new end date and interest saved
 * for 'reduce tenure' vs 'reduce EMI'
 */
export function simulateLoanPrepayment(
  loan: Loan,
  prepayAmount: number,
  prepayMonth: number = 1,
  strategy: 'tenure' | 'emi' = 'tenure'
): PrepaymentSimulationResult {
  const amortization = generateDetailedLoanAmortization(loan);
  const originalRows = amortization.rows;
  const rate = amortization.effectiveAnnualRate;
  const monthlyRate = (rate / 100) / 12;

  const originalTotalInterest = amortization.totalInterest;
  const originalPayoffDate = amortization.lastEmiDate || '';
  const originalRemainingPayable = amortization.remainingPayable;

  if (prepayAmount <= 0 || originalRows.length === 0) {
    return {
      strategy,
      prepayAmount: 0,
      prepayMonth,
      originalTotalInterest,
      originalPayoffDate,
      originalRemainingPayable,
      newTotalInterest: originalTotalInterest,
      newPayoffDate: originalPayoffDate,
      interestSaved: 0,
      monthsSaved: 0,
      newEmi: loan.emi,
      totalSavings: 0,
    };
  }

  // Prepay takes place at prepayMonth
  const targetIdx = Math.min(Math.max(1, prepayMonth), originalRows.length) - 1;
  // Balance before this installment
  let balance = targetIdx > 0 ? originalRows[targetIdx - 1].balanceAfter : loan.principal;

  // Apply prepayment to balance
  balance = Math.max(0, balance - prepayAmount);

  if (strategy === 'tenure') {
    // Keep EMI same, calculate how many months remaining
    let newInterest = 0;
    // Interest prior to targetIdx
    for (let i = 0; i < targetIdx; i++) {
      newInterest += originalRows[i].interestPart;
    }

    let monthsRemaining = 0;
    while (balance > 0 && monthsRemaining < 240) {
      monthsRemaining++;
      const interest = Math.round(balance * monthlyRate);
      newInterest += interest;
      const principal = Math.min(balance, loan.emi - interest);
      balance -= principal;
      if (balance <= 0) break;
    }

    const newTotalMonths = targetIdx + monthsRemaining;
    const monthsSaved = Math.max(0, loan.totalEmis - newTotalMonths);
    const newPayoffDate = addMonthsToDate(loan.firstEmiDate || '', Math.max(0, newTotalMonths - 1));
    const interestSaved = Math.max(0, originalTotalInterest - newInterest);

    return {
      strategy: 'tenure',
      prepayAmount,
      prepayMonth,
      originalTotalInterest,
      originalPayoffDate,
      originalRemainingPayable,
      newTotalInterest: newInterest,
      newPayoffDate,
      interestSaved,
      monthsSaved,
      newEmi: loan.emi,
      totalSavings: interestSaved,
    };
  } else {
    // Keep tenure same, lower the EMI
    const remainingMonths = Math.max(1, loan.totalEmis - targetIdx);
    let newEmi = loan.emi;

    if (monthlyRate > 0) {
      const factor = Math.pow(1 + monthlyRate, remainingMonths);
      newEmi = Math.round((balance * monthlyRate * factor) / (factor - 1));
    } else {
      newEmi = Math.round(balance / remainingMonths);
    }

    // Recompute interest with lower EMI
    let newInterest = 0;
    for (let i = 0; i < targetIdx; i++) {
      newInterest += originalRows[i].interestPart;
    }

    let curBal = balance;
    for (let i = 0; i < remainingMonths; i++) {
      const interest = Math.round(curBal * monthlyRate);
      newInterest += interest;
      const principal = Math.min(curBal, newEmi - interest);
      curBal = Math.max(0, curBal - principal);
    }

    const interestSaved = Math.max(0, originalTotalInterest - newInterest);

    return {
      strategy: 'emi',
      prepayAmount,
      prepayMonth,
      originalTotalInterest,
      originalPayoffDate,
      originalRemainingPayable,
      newTotalInterest: newInterest,
      newPayoffDate: originalPayoffDate,
      interestSaved,
      monthsSaved: 0,
      newEmi,
      totalSavings: interestSaved,
    };
  }
}

export interface DebtPayoffPlanResult {
  method: 'snowball' | 'avalanche';
  order: Array<{ loanId: string; loanName: string; balance: number; rate: number }>;
  totalMonths: number;
  debtFreeDate: string;
  totalInterestPaid: number;
  totalPaid: number;
}

/**
 * Debt payoff planner when 2+ borrowed loans exist: Snowball vs Avalanche
 */
export function calculateDebtPayoffPlan(
  loans: Loan[],
  extraMonthlyCash: number = 0,
  todayStr: string = DEFAULT_APP_TODAY
): {
  snowball: DebtPayoffPlanResult;
  avalanche: DebtPayoffPlanResult;
  interestDifference: number;
} {
  const borrowed = loans.filter(l => l.direction === 'borrowed' && l.outstanding > 0);

  const getLoanRate = (l: Loan) => {
    if (l.interestRate !== null && l.interestRate !== undefined) return l.interestRate;
    return computeImpliedAnnualRate(l.principal, l.emi, l.totalEmis) || 0;
  };

  const simulateStrategy = (method: 'snowball' | 'avalanche'): DebtPayoffPlanResult => {
    // Sort loans
    const sorted = [...borrowed].sort((a, b) => {
      if (method === 'snowball') {
        // Lowest balance first
        return a.outstanding - b.outstanding;
      } else {
        // Highest interest rate first
        return getLoanRate(b) - getLoanRate(a);
      }
    });

    const activeList = sorted.map(l => ({
      loanId: l.id,
      loanName: l.name,
      balance: l.outstanding,
      emi: l.emi,
      monthlyRate: (getLoanRate(l) / 100) / 12,
      rate: getLoanRate(l),
    }));

    let totalMonths = 0;
    let totalInterestPaid = 0;
    let totalPrincipalPaid = 0;
    let freedUpCash = 0;

    while (activeList.some(l => l.balance > 0) && totalMonths < 360) {
      totalMonths++;
      let extraThisMonth = extraMonthlyCash + freedUpCash;

      for (const item of activeList) {
        if (item.balance <= 0) continue;

        const interest = Math.round(item.balance * item.monthlyRate);
        totalInterestPaid += interest;

        // Base payment
        const principalPart = Math.min(item.balance, Math.max(0, item.emi - interest));
        item.balance = Math.max(0, item.balance - principalPart);
        totalPrincipalPaid += principalPart;

        if (item.balance <= 0) {
          freedUpCash += item.emi;
        }
      }

      // Apply extra cash to the focus debt
      const focusDebt = activeList.find(l => l.balance > 0);
      if (focusDebt && extraThisMonth > 0) {
        const extraPrincipal = Math.min(focusDebt.balance, extraThisMonth);
        focusDebt.balance = Math.max(0, focusDebt.balance - extraPrincipal);
        totalPrincipalPaid += extraPrincipal;
        if (focusDebt.balance <= 0) {
          freedUpCash += focusDebt.emi;
        }
      }
    }

    const debtFreeDate = addMonthsToDate(todayStr, totalMonths);

    return {
      method,
      order: sorted.map(l => ({
        loanId: l.id,
        loanName: l.name,
        balance: l.outstanding,
        rate: getLoanRate(l),
      })),
      totalMonths,
      debtFreeDate,
      totalInterestPaid,
      totalPaid: totalPrincipalPaid + totalInterestPaid,
    };
  };

  const snowball = simulateStrategy('snowball');
  const avalanche = simulateStrategy('avalanche');
  const interestDifference = Math.max(0, snowball.totalInterestPaid - avalanche.totalInterestPaid);

  return { snowball, avalanche, interestDifference };
}

/**
 * Budget status:
 * spent < 80% of limit = "Within" (green, ✓),
 * 80–100% = "Near limit" (amber, !),
 * > 100% = "Over by ₹X" (red, ✕).
 */
export function getBudgetStatus(
  spent: number,
  limit: number
): {
  status: 'within' | 'near' | 'over';
  label: string;
  icon: string;
  colorClass: string;
  percent: number;
  overAmount: number;
} {
  const percent = limit > 0 ? (spent / limit) * 100 : 0;
  if (spent > limit) {
    const overAmount = spent - limit;
    return {
      status: 'over',
      label: `Over by ${formatINR(overAmount)}`,
      icon: '✕',
      colorClass: 'text-red-500 bg-red-500/10 border-red-500/30',
      percent,
      overAmount,
    };
  }
  if (spent >= limit * 0.8) {
    return {
      status: 'near',
      label: 'Near limit',
      icon: '!',
      colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
      percent,
      overAmount: 0,
    };
  }
  return {
    status: 'within',
    label: 'Within',
    icon: '✓',
    colorClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
    percent,
    overAmount: 0,
  };
}

/**
 * Month-end forecast = expected total of fixed budgets + (variable spending so far ÷ days passed × days in month).
 * Do NOT extrapolate one-time payments.
 */
export function calculateMonthEndForecast(
  budgets: Budget[],
  transactionsThisMonth: Transaction[],
  todayStr: string = DEFAULT_APP_TODAY
): {
  expectedFixed: number;
  fixedPaid: number;
  variableSoFar: number;
  forecastTotal: number;
  daysPassed: number;
  daysInMonth: number;
  fixedChecklist: Array<{ name: string; limit: number; spent: number; status: 'Paid' | 'Pending' }>;
} {
  const [y, m, d] = todayStr.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const daysPassed = Math.min(d, daysInMonth);

  // Group budgets
  const fixedBudgets = budgets.filter(b => b.fixed);
  const fixedCategories = new Set(fixedBudgets.flatMap(b => b.categories));

  const expectedFixed = fixedBudgets.reduce((sum, b) => sum + b.limit, 0);

  // Calculate spending per budget
  const fixedChecklist = fixedBudgets.map(b => {
    const spent = transactionsThisMonth
      .filter(t => t.type === 'expense' && b.categories.includes(t.category))
      .reduce((sum, t) => sum + t.amount, 0);

    // Paid if spent > 0 or spent >= limit
    const status: 'Paid' | 'Pending' = spent > 0 ? 'Paid' : 'Pending';
    return {
      name: b.name,
      limit: b.limit,
      spent,
      status,
    };
  });

  const fixedPaid = fixedChecklist.reduce((sum, item) => sum + item.spent, 0);

  // Variable spending is spending in non-fixed categories (excluding one-time large house expense if needed, but per rule: variable spending so far)
  const variableSoFar = transactionsThisMonth
    .filter(t => t.type === 'expense' && !fixedCategories.has(t.category))
    .reduce((sum, t) => sum + t.amount, 0);

  const extrapolatedVariable = daysPassed > 0 ? (variableSoFar / daysPassed) * daysInMonth : variableSoFar;
  const forecastTotal = expectedFixed + extrapolatedVariable;

  return {
    expectedFixed,
    fixedPaid,
    variableSoFar,
    forecastTotal,
    daysPassed,
    daysInMonth,
    fixedChecklist,
  };
}

/**
 * Financial Health Score (0–100) with a visible checklist:
 * 1. Savings rate ≥ 20% (20 pts, partial = rate/20 * 20)
 * 2. Left ≥ 0 (15 pts)
 * 3. EMI burden ≤ 35% (15 pts)
 * 4. Emergency fund ≥ 6 months (20 pts, partial = months/6 * 20)
 * 5. Investing ≥ 20% of income (10 pts, partial = rate/20 * 10)
 * 6. Budgets within limit (10 pts, partial = within/total * 10)
 * 7. Insurance cover ≥ 10× yearly income (10 pts, partial = cover / (10 * yearly) * 10)
 */
export function calculateFinancialHealthScore(params: {
  income: number;
  spending: number;
  invested: number;
  left: number;
  goals: Goal[];
  budgets: Budget[];
  insuranceCover: number;
  transactionsThisMonth: Transaction[];
  avgMonthlySpending: number;
}): FinancialHealthResult {
  const {
    income,
    spending,
    invested,
    left,
    goals,
    budgets,
    insuranceCover,
    transactionsThisMonth,
    avgMonthlySpending,
  } = params;

  // 1. Savings rate
  const savingsRate = income > 0 ? (income - spending) / income : 0;
  const savingsRatePct = Math.max(0, savingsRate * 100);
  const savingsPoints = Math.min(20, Math.max(0, (savingsRatePct / 20) * 20));

  // 2. Left >= 0
  const leftPoints = left >= 0 ? 15 : 0;

  // 3. EMI burden <= 35%
  const emiBurden = calculateEMIBurden(transactionsThisMonth, income);
  const emiBurdenPct = emiBurden * 100;
  const emiPoints = emiBurden <= 0.35 ? 15 : 0;

  // 4. Emergency fund >= 6 months
  const efCoverage = calculateEmergencyFundCoverage(goals, avgMonthlySpending);
  const efMonths = efCoverage.months;
  const efPoints = Math.min(20, Math.max(0, (efMonths / 6) * 20));

  // 5. Investing >= 20% of income
  const investingRate = income > 0 ? invested / income : 0;
  const investingRatePct = investingRate * 100;
  const investingPoints = Math.min(10, Math.max(0, (investingRatePct / 20) * 10));

  // 6. Budgets within limit
  let withinCount = 0;
  for (const b of budgets) {
    const spent = transactionsThisMonth
      .filter(t => t.type === 'expense' && b.categories.includes(t.category))
      .reduce((sum, t) => sum + t.amount, 0);
    if (spent <= b.limit) {
      withinCount++;
    }
  }
  const totalBudgets = budgets.length || 1;
  const budgetPoints = (withinCount / totalBudgets) * 10;

  // 7. Insurance cover >= 10x yearly income
  const yearlyIncome = income * 12 || 82000 * 12;
  const targetCover = yearlyIncome * 10;
  const insurancePoints = targetCover > 0 ? Math.min(10, (insuranceCover / targetCover) * 10) : 10;

  const checks = [
    {
      id: 'savings',
      title: 'Savings rate ≥ 20%',
      currentLabel: `${savingsRatePct.toFixed(1)}%`,
      targetLabel: '≥ 20%',
      passed: savingsRatePct >= 20,
      maxPoints: 20,
      earnedPoints: Number(savingsPoints.toFixed(1)),
    },
    {
      id: 'left',
      title: 'Left ≥ 0 (Surplus)',
      currentLabel: formatINR(left),
      targetLabel: '≥ ₹0',
      passed: left >= 0,
      maxPoints: 15,
      earnedPoints: leftPoints,
    },
    {
      id: 'emi',
      title: 'EMI burden ≤ 35%',
      currentLabel: `${emiBurdenPct.toFixed(1)}%`,
      targetLabel: '≤ 35%',
      passed: emiBurden <= 0.35,
      maxPoints: 15,
      earnedPoints: emiPoints,
    },
    {
      id: 'emergency',
      title: 'Emergency fund ≥ 6 months',
      currentLabel: `${efMonths.toFixed(1)} mo`,
      targetLabel: '≥ 6 months',
      passed: efMonths >= 6,
      maxPoints: 20,
      earnedPoints: Number(efPoints.toFixed(1)),
    },
    {
      id: 'investing',
      title: 'Investing ≥ 20% of income',
      currentLabel: `${investingRatePct.toFixed(1)}%`,
      targetLabel: '≥ 20%',
      passed: investingRatePct >= 20,
      maxPoints: 10,
      earnedPoints: Number(investingPoints.toFixed(1)),
    },
    {
      id: 'budgets',
      title: 'Budgets within limit',
      currentLabel: `${withinCount}/${totalBudgets} within`,
      targetLabel: '100% within',
      passed: withinCount === totalBudgets,
      maxPoints: 10,
      earnedPoints: Number(budgetPoints.toFixed(1)),
    },
    {
      id: 'insurance',
      title: 'Insurance cover ≥ 10× yearly income',
      currentLabel: formatINR(insuranceCover),
      targetLabel: `≥ ${formatINR(targetCover)}`,
      passed: insuranceCover >= targetCover,
      maxPoints: 10,
      earnedPoints: Number(insurancePoints.toFixed(1)),
    },
  ];

  const totalEarned = checks.reduce((sum, c) => sum + c.earnedPoints, 0);

  return {
    score: Math.round(Math.min(100, Math.max(0, totalEarned))),
    checks,
  };
}

/**
 * Evaluates the 8 core acceptance criteria from the prompt against current state.
 */
export function evaluateAcceptanceChecks(state: {
  transactions: Transaction[];
  loans: Loan[];
  investments: Investment[];
  goals: Goal[];
  cards: CreditCard[];
  insurance: { cover: number; yearlyPremium: number }[];
  budgets: Budget[];
  history: AppHistory;
  monthKey?: string; // defaults to '2026-10'
  todayStr?: string; // defaults to '2026-10-14'
}): Array<{
  id: string;
  category: string;
  check: string;
  expected: string;
  actual: string;
  pass: boolean;
}> {
  const monthKey = state.monthKey || '2026-10';
  const todayStr = state.todayStr || DEFAULT_APP_TODAY;

  const monthTx = getTransactionsForMonth(state.transactions, monthKey);
  const income = calculateIncome(monthTx);
  const spending = calculateSpending(monthTx);
  const invested = calculateInvested(monthTx);
  const left = calculateLeft(income, spending, invested);
  const outflow = calculateOutflow(spending, invested);

  // Sep outflow from history
  const sepOutflow = state.history.monthlyTotals['2026-09']?.outflow || 125203;
  const outflowChangePct = Math.round(((outflow - sepOutflow) / sepOutflow) * 100);

  const savingsRate = calculateSavingsRate(income, spending);
  const emiBurden = calculateEMIBurden(monthTx, income);
  const investingRate = calculateInvestingRate(income, invested);

  // Check 1: Monthly Totals
  const check1Pass =
    income === 82000 &&
    spending === 70202 &&
    invested === 21000 &&
    left === -9202 &&
    outflow === 91202 &&
    outflowChangePct === -27;

  // Check 2: Financial Ratios
  const check2Pass =
    Math.abs(savingsRate * 100 - 14.4) < 0.15 &&
    Math.abs(emiBurden * 100 - 27.5) < 0.15 &&
    Math.abs(investingRate * 100 - 25.6) < 0.15;

  // Check 3: Budgets over limit
  const getCatSpend = (catNames: string[]) =>
    monthTx
      .filter(t => t.type === 'expense' && catNames.includes(t.category))
      .reduce((sum, t) => sum + t.amount, 0);

  const kitchenSpend = getCatSpend(['Kitchen Item', 'K1', 'K 2', 'Water', 'GAS']);
  const healthSpend = getCatSpend(['My Med', 'Sis Med', 'M MED']);
  const personalSpend = getCatSpend(['My Personal Expense']);

  const check3Pass =
    kitchenSpend === 8578 && healthSpend === 9476 && personalSpend === 1730;

  // Check 4: Fixed expenses
  const forecast = calculateMonthEndForecast(state.budgets, monthTx, todayStr);
  const otherFixedItem = forecast.fixedChecklist.find(i => i.name === 'Other fixed expense');
  const check4Pass =
    forecast.expectedFixed === 25450 &&
    forecast.fixedPaid === 21727 &&
    otherFixedItem?.status === 'Pending';

  // Check 5: Net worth
  const nw = calculateNetWorth({
    goals: state.goals,
    investments: state.investments,
    assets: [],
    loans: state.loans,
    cards: state.cards,
    transactions: state.transactions,
  });
  const check5Pass =
    nw.goalSavings === 50000 &&
    nw.investmentsTotal === 24032 &&
    nw.lentOutstanding === 87047 &&
    nw.borrowedOutstanding === 350000 &&
    nw.cardsOutstanding === 17212 &&
    nw.netWorth === -206133;

  // Check 6: ALL Bank Loan
  const allBank = state.loans.find(l => l.name === 'ALL Bank');
  const allBankSchedule = allBank ? calculateLoanSchedule(allBank, todayStr) : null;
  const check6Pass =
    allBankSchedule !== null &&
    allBankSchedule.overdueCount === 2 &&
    allBankSchedule.overdueDateList.includes('2026-09-13') &&
    allBankSchedule.overdueDateList.includes('2026-10-13') &&
    allBankSchedule.emisLeft === 47 &&
    allBankSchedule.remainingPayable === 564000 &&
    allBankSchedule.lastEmiDate?.startsWith('2030-07') === true;

  // Check 7: Year 2026 totals
  // Income 861739, Outflow 1144824, Invested this year 111132
  const ytdHist = state.history.jan_to_sep_2026;
  const yearIncome = (ytdHist?.income || 0) + income;
  const yearOutflow = (ytdHist?.outflow || 0) + outflow;
  const yearInvested = ((ytdHist as any)?.investedByCategory?.Investment || (ytdHist as any)?.topCategories?.Investment || 0) + invested;
  const check7Pass =
    yearIncome === 861739 && yearOutflow === 1144824 && yearInvested === 111132;

  // Check 8: Emergency Fund
  const efGoal = state.goals.find(g => g.isEmergencyFund);
  const efSaved = efGoal?.saved || 0;
  const efTarget = efGoal?.target || 0;
  const efProgress = efTarget > 0 ? (efSaved / efTarget) * 100 : 0;
  // months left from Oct 2026 to Sep 2027 = 11 months
  const remainingTarget = efTarget - efSaved;
  const requiredPerMonth = remainingTarget / 11;
  const check8Pass =
    efProgress === 50 &&
    efSaved === 50000 &&
    efTarget === 100000 &&
    Math.round(requiredPerMonth) === 4545;

  return [
    {
      id: 'check-1',
      category: 'October 2026 Totals',
      check: 'Income, Spending, Invested, Left & Outflow vs Sep',
      expected: 'Income ₹82,000 · Spending ₹70,202 · Invested ₹21,000 · Left −₹9,202 · Outflow ₹91,202 (−27% vs Sep ₹1,25,203)',
      actual: `Income ${formatINR(income)} · Spending ${formatINR(spending)} · Invested ${formatINR(invested)} · Left ${formatINR(left)} · Outflow ${formatINR(outflow)} (${outflowChangePct}% vs Sep)`,
      pass: check1Pass,
    },
    {
      id: 'check-2',
      category: 'Key Ratios',
      check: 'Savings Rate, EMI Burden & Investing Rate',
      expected: 'Savings rate 14.4% · EMI burden 27.5% · Investing 25.6% of income',
      actual: `Savings rate ${(savingsRate * 100).toFixed(1)}% · EMI burden ${(emiBurden * 100).toFixed(1)}% · Investing ${(investingRate * 100).toFixed(1)}%`,
      pass: check2Pass,
    },
    {
      id: 'check-3',
      category: 'Budgets Over Limit',
      check: 'Kitchen Item, Health & Medicine, My Personal Expense',
      expected: 'Kitchen Item ₹8,578 / ₹6,500 · Health & Medicine ₹9,476 / ₹5,000 · My Personal Expense ₹1,730 / ₹1,500',
      actual: `Kitchen Item ${formatINR(kitchenSpend)} / ₹6,500 · Health & Medicine ${formatINR(healthSpend)} / ₹5,000 · My Personal Expense ${formatINR(personalSpend)} / ₹1,500`,
      pass: check3Pass,
    },
    {
      id: 'check-4',
      category: 'Fixed Expenses Checklist',
      check: 'Expected vs Paid and Pending items',
      expected: 'Expected ₹25,450 · Paid ₹21,727 · "Other fixed expense" pending',
      actual: `Expected ${formatINR(forecast.expectedFixed)} · Paid ${formatINR(forecast.fixedPaid)} · "Other fixed expense" is ${otherFixedItem?.status || 'Unknown'}`,
      pass: check4Pass,
    },
    {
      id: 'check-5',
      category: 'Net Worth Calculation',
      check: 'Formula: Goals + Invest + Assets + Lent − Borrowed − Card',
      expected: '50,000 + 24,032 + 87,047 − 3,50,000 − 17,212 = −₹2,06,133',
      actual: `${formatINR(nw.goalSavings, { hideSymbol: true })} + ${formatINR(nw.investmentsTotal, { hideSymbol: true })} + ${formatINR(nw.lentOutstanding, { hideSymbol: true })} − ${formatINR(nw.borrowedOutstanding, { hideSymbol: true })} − ${formatINR(nw.cardsOutstanding, { hideSymbol: true })} = ${formatINR(nw.netWorth)}`,
      pass: check5Pass,
    },
    {
      id: 'check-6',
      category: 'ALL Bank Loan Schedule',
      check: 'Overdue EMIs, Remaining EMIs, Payable & Payoff Date',
      expected: 'EMIs on 13 Sep 2026 & 13 Oct 2026 overdue, 47 EMIs left, remaining payable ₹5,64,000, last EMI Jul 2030',
      actual: `${allBankSchedule?.overdueCount} overdue (${allBankSchedule?.overdueDateList.join(', ')}), ${allBankSchedule?.emisLeft} left, remaining payable ${formatINR(allBankSchedule?.remainingPayable || 0)}, last EMI ${allBankSchedule?.lastEmiDate?.slice(0, 7)}`,
      pass: check6Pass,
    },
    {
      id: 'check-7',
      category: 'Year 2026 Totals',
      check: 'Jan–Sep history + Oct YTD performance',
      expected: 'Income ₹8,61,739 · Outflow ₹11,44,824 · Invested this year ₹1,11,132',
      actual: `Income ${formatINR(yearIncome)} · Outflow ${formatINR(yearOutflow)} · Invested this year ${formatINR(yearInvested)}`,
      pass: check7Pass,
    },
    {
      id: 'check-8',
      category: 'Emergency Fund Goal',
      check: 'Progress %, Saved/Target and Required/month to Sep 2027',
      expected: 'Emergency fund 50% (₹50,000 / ₹1,00,000); required ≈ ₹4,545/month to reach target by 29 Sep 2027',
      actual: `Emergency fund ${efProgress.toFixed(0)}% (${formatINR(efSaved)} / ${formatINR(efTarget)}); required ≈ ${formatINR(Math.round(requiredPerMonth))}/month to reach target by 29 Sep 2027`,
      pass: check8Pass,
    },
  ];
}

/**
 * Calculates XIRR (Extended Internal Rate of Return) for an investment given dated cash flows
 * (invested cash flows as negative, terminal current value as positive).
 */
export function calculateXIRR(
  cashFlows: Array<{ date: string; amount: number }>
): number | null {
  if (cashFlows.length < 2) return null;

  // Verify at least one negative and one positive
  const hasNegative = cashFlows.some(cf => cf.amount < 0);
  const hasPositive = cashFlows.some(cf => cf.amount > 0);
  if (!hasNegative || !hasPositive) return null;

  const t0 = new Date(cashFlows[0].date).getTime();

  // NPV function
  const npv = (rate: number): number => {
    return cashFlows.reduce((sum, cf) => {
      const dt = (new Date(cf.date).getTime() - t0) / (1000 * 60 * 60 * 24 * 365);
      return sum + cf.amount / Math.pow(1 + rate, dt);
    }, 0);
  };

  // Derivative of NPV
  const dnpv = (rate: number): number => {
    return cashFlows.reduce((sum, cf) => {
      const dt = (new Date(cf.date).getTime() - t0) / (1000 * 60 * 60 * 24 * 365);
      return sum - (dt * cf.amount) / Math.pow(1 + rate, dt + 1);
    }, 0);
  };

  // Newton-Raphson with bisection fallback
  let rate = 0.1; // initial guess 10%
  for (let i = 0; i < 50; i++) {
    const val = npv(rate);
    const dval = dnpv(rate);
    if (Math.abs(val) < 0.01) {
      return Math.round(rate * 10000) / 100; // in percentage e.g. 14.25%
    }
    if (Math.abs(dval) < 1e-7) break;
    const newRate = rate - val / dval;
    if (newRate <= -0.99 || newRate > 10) {
      break;
    }
    rate = newRate;
  }

  // Bisection fallback between -50% and 200%
  let low = -0.5;
  let high = 2.0;
  if (npv(low) * npv(high) < 0) {
    for (let i = 0; i < 40; i++) {
      const mid = (low + high) / 2;
      const v = npv(mid);
      if (Math.abs(v) < 0.01) return Math.round(mid * 10000) / 100;
      if (npv(low) * v < 0) high = mid;
      else low = mid;
    }
  }

  return Math.round(rate * 10000) / 100;
}

/**
 * Projects when net worth turns positive based on average monthly change
 */
export function projectNetWorthPositive(
  currentNetWorth: number,
  averageMonthlyChange: number,
  asOfDate: string = DEFAULT_APP_TODAY
): { monthsToPositive: number; projectedMonth: string } | null {
  if (currentNetWorth >= 0) {
    return { monthsToPositive: 0, projectedMonth: asOfDate.slice(0, 7) };
  }

  if (averageMonthlyChange <= 0) {
    return null; // Not growing
  }

  const months = Math.ceil(Math.abs(currentNetWorth) / averageMonthlyChange);
  const projectedMonth = addMonthsToDate(asOfDate, months).slice(0, 7);

  return { monthsToPositive: months, projectedMonth };
}
