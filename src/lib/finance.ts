import {
  Transaction,
  Loan,
  Investment,
  Goal,
  CreditCard,
  Asset,
  Budget,
  AppHistory,
  Account,
  PeriodType,
} from '../types';
export { formatINR } from '../utils/formatters';

export interface PeriodFilter {
  type: PeriodType;
  monthKey?: string; // e.g. '2026-10'
  quarter?: string; // e.g. '2026-Q4'
  year?: number; // e.g. 2026
  fyYear?: number; // e.g. 2026 for FY 2026-27 (Apr 2026 - Mar 2027)
  fromDate?: string; // YYYY-MM-DD
  toDate?: string; // YYYY-MM-DD
}

/**
 * Filter transactions by period: Month, Quarter, Year, FY, or Custom.
 */
export function filterTransactionsByPeriod(
  transactions: Transaction[],
  period: PeriodFilter
): Transaction[] {
  if (period.type === 'month' && period.monthKey) {
    return transactions.filter(t => t.date.startsWith(period.monthKey!));
  }
  if (period.type === 'year' && period.year) {
    const yrStr = `${period.year}-`;
    return transactions.filter(t => t.date.startsWith(yrStr));
  }
  if (period.type === 'fy' && period.fyYear) {
    const start = `${period.fyYear}-04-01`;
    const end = `${period.fyYear + 1}-03-31`;
    return transactions.filter(t => t.date >= start && t.date <= end);
  }
  if (period.type === 'quarter' && period.quarter) {
    // format YYYY-Q1 to Q4 (calendar or financial)
    const [yr, q] = period.quarter.split('-');
    let startMonth = 1;
    let endMonth = 3;
    if (q === 'Q2') { startMonth = 4; endMonth = 6; }
    else if (q === 'Q3') { startMonth = 7; endMonth = 9; }
    else if (q === 'Q4') { startMonth = 10; endMonth = 12; }
    return transactions.filter(t => {
      const parts = t.date.split('-');
      const m = parseInt(parts[1], 10);
      return parts[0] === yr && m >= startMonth && m <= endMonth;
    });
  }
  if (period.type === 'custom' && period.fromDate && period.toDate) {
    return transactions.filter(t => t.date >= period.fromDate! && t.date <= period.toDate!);
  }
  return transactions;
}

/**
 * income(period) = Σ income
 */
export function income(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
}

/**
 * spending(period) = Σ expense (EMI entries ARE spending)
 */
export function spending(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
}

/**
 * invested(period) = Σ invest
 */
export function invested(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.type === 'invest')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
}

/**
 * left = income − spending − invested
 */
export function left(inc: number, sp: number, inv: number): number {
  return inc - sp - inv;
}

/**
 * savingsRate = (income − spending) ÷ income
 */
export function savingsRate(inc: number, sp: number): number {
  if (inc <= 0) return 0;
  return (inc - sp) / inc;
}

/**
 * outflow = spending + invested (only for comparing with old-app history)
 */
export function outflow(sp: number, inv: number): number {
  return sp + inv;
}

/**
 * investingRate = invested / income
 */
export function investingRate(inc: number, inv: number): number {
  if (inc <= 0) return 0;
  return inv / inc;
}

/**
 * EMI spending = sum of expense in 'EMI' category
 */
export function emiSpending(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.type === 'expense' && t.category === 'EMI')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
}

/**
 * cardOutstanding = opening outstanding + card expenses after its as-of date − card payments after its as-of date
 */
export function cardOutstanding(card: CreditCard, transactions: Transaction[]): number {
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

  return Math.max(0, card.openingOutstanding + postAsOfExpenses - postAsOfPayments);
}

/**
 * accountBalance = openingBalance + income − expense − invest ± transfers − card payments (per account)
 */
export function accountBalance(account: Account, transactions: Transaction[]): number {
  let bal = account.openingBalance || 0;
  for (const t of transactions) {
    const isDirectMatch = t.accountId === account.id;
    const isModeFallback =
      !t.accountId &&
      ((account.kind === 'cash' && t.mode === 'Cash') ||
        (account.kind === 'bank' && (t.mode === 'Bank' || t.mode === 'Net Banking' || t.mode === 'Debit Card')) ||
        (account.kind === 'wallet' && t.mode === 'UPI'));

    if (isDirectMatch || isModeFallback) {
      if (t.type === 'income') bal += t.amount;
      else if (t.type === 'expense') bal -= t.amount;
      else if (t.type === 'invest') bal -= t.amount;
      else if (t.type === 'cardPayment') bal -= t.amount;
      else if (t.type === 'transfer') bal -= t.amount;
    } else if (t.toAccountId === account.id && t.type === 'transfer') {
      bal += t.amount;
    }
  }
  return bal;
}

export interface NetWorthBreakdown {
  goalSavings: number;
  investmentsValue: number;
  moneyLent: number;
  otherAssets: number;
  accountBalances: number;
  borrowedLoans: number;
  cardOutstanding: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

/**
 * netWorth = account balances + goal savings + investments current value + other assets + money lent outstanding − borrowed loans outstanding − card outstanding
 */
export function netWorthBreakdown(params: {
  goals: Goal[];
  investments: Investment[];
  loans: Loan[];
  cards: CreditCard[];
  assets?: Asset[];
  accounts?: Account[];
  transactions?: Transaction[];
}): NetWorthBreakdown {
  const { goals, investments, loans, cards, assets = [], accounts = [], transactions = [] } = params;

  const goalSavings = goals.reduce((sum, g) => sum + (Number(g.saved) || 0), 0);
  const investmentsValue = investments.reduce((sum, inv) => sum + (Number(inv.currentValue) || 0), 0);
  const otherAssets = assets.reduce((sum, a) => sum + (Number(a.value) || 0), 0);

  const moneyLent = loans
    .filter(l => l.direction === 'lent')
    .reduce((sum, l) => sum + (Number(l.outstanding) || 0), 0);

  const borrowedLoans = loans
    .filter(l => l.direction === 'borrowed')
    .reduce((sum, l) => sum + (Number(l.outstanding) || 0), 0);

  const totalCardDebt = cards.reduce((sum, c) => sum + cardOutstanding(c, transactions), 0);

  const totalAccountsBal = accounts.reduce((sum, a) => sum + accountBalance(a, transactions), 0);

  const totalAssets = totalAccountsBal + goalSavings + investmentsValue + otherAssets + moneyLent;
  const totalLiabilities = borrowedLoans + totalCardDebt;
  const nw = totalAssets - totalLiabilities;

  return {
    goalSavings,
    investmentsValue,
    moneyLent,
    otherAssets,
    accountBalances: totalAccountsBal,
    borrowedLoans,
    cardOutstanding: totalCardDebt,
    totalAssets,
    totalLiabilities,
    netWorth: nw,
  };
}

export function netWorth(params: {
  goals: Goal[];
  investments: Investment[];
  loans: Loan[];
  cards: CreditCard[];
  assets?: Asset[];
  accounts?: Account[];
  transactions?: Transaction[];
}): number {
  return netWorthBreakdown(params).netWorth;
}

/**
 * Live Derivation: Loan Metrics (Rule 1: Store facts, derive everything else)
 * loan.outstanding, EMIs paid, EMIs left, next due, overdue derived from loan opening values + linked transactions.
 */
export function deriveLoanMetrics(loan: Loan, transactions: Transaction[] = []) {
  const openingOutstanding = loan.openingOutstanding ?? loan.outstanding ?? 0;
  const openingPaidEmis = loan.openingPaidEmis ?? loan.paidEmis ?? 0;
  const openingPaidAmount = loan.openingPaidAmount ?? loan.paidAmount ?? 0;

  // Transactions strictly created AFTER opening baseline that represent additional EMI/repayments
  const postOpeningTxs = transactions.filter(
    t => t.loanId === loan.id && !t.imported && t.createdAt && new Date(t.createdAt).getTime() > new Date('2026-10-14T23:59:59Z').getTime()
  );

  const extraRepaidPrincipal = postOpeningTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const extraPaidEmis = postOpeningTxs.length;

  const outstanding = Math.max(0, openingOutstanding - extraRepaidPrincipal);
  const paidEmis = openingPaidEmis + extraPaidEmis;
  const paidAmount = openingPaidAmount + extraRepaidPrincipal;
  const remainingEmis = Math.max(0, loan.totalEmis - paidEmis);

  return {
    ...loan,
    outstanding,
    paidEmis,
    paidAmount,
    remainingEmis,
    linkedTransactions: transactions.filter(t => t.loanId === loan.id || (t.category === 'EMI' && loan.direction === 'borrowed')),
  };
}

/**
 * Live Derivation: Goal Metrics (Rule 1: Store facts, derive everything else)
 * goal.saved = openingSaved + Σ contributions − Σ withdrawals
 */
export function deriveGoalMetrics(goal: Goal, transactions: Transaction[] = []) {
  const openingSaved = goal.openingSaved ?? goal.saved ?? 0;

  const postOpeningTxs = transactions.filter(
    t => t.goalId === goal.id && t.createdAt && new Date(t.createdAt).getTime() > new Date('2026-10-14T23:59:59Z').getTime()
  );

  let netContributions = 0;
  for (const t of postOpeningTxs) {
    if (t.type === 'invest' || t.type === 'transfer' || (t.type === 'expense' && t.category === 'Goal Savings')) {
      netContributions += t.amount;
    } else if (t.type === 'income') {
      netContributions -= t.amount;
    }
  }

  const saved = Math.max(0, openingSaved + netContributions);
  const progressPct = goal.target > 0 ? (saved / goal.target) * 100 : 0;
  const remaining = Math.max(0, goal.target - saved);

  return {
    ...goal,
    saved,
    progressPct,
    remaining,
    linkedTransactions: transactions.filter(t => t.goalId === goal.id || t.category === 'Goal Savings'),
  };
}

/**
 * Live Derivation: Investment Metrics (Rule 1: Store facts, derive everything else)
 * investment.invested = openingInvested + Σ linked invest transactions
 */
export function deriveInvestmentMetrics(investment: Investment, transactions: Transaction[] = []) {
  const openingInvested = investment.openingInvestedAmount ?? investment.installment ?? 0;

  const postOpeningTxs = transactions.filter(
    t => t.investmentId === investment.id && t.createdAt && new Date(t.createdAt).getTime() > new Date('2026-10-14T23:59:59Z').getTime()
  );

  const extraInvested = postOpeningTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const invested = openingInvested + extraInvested;
  const currentValue = (investment.currentValue || 0) + extraInvested;

  return {
    ...investment,
    invested,
    currentValue,
    linkedTransactions: transactions.filter(t => t.investmentId === investment.id || t.category === investment.name),
  };
}

/**
 * Budget Health status for all budgets in a given transaction set.
 */
export interface BudgetHealthItem {
  name: string;
  categories: string[];
  limit: number;
  spent: number;
  remaining: number;
  percent: number;
  fixed: boolean;
  status: 'within' | 'near' | 'over';
}

export function calculateBudgetHealth(budgets: Budget[], transactions: Transaction[]): BudgetHealthItem[] {
  return budgets.map(b => {
    const spent = transactions
      .filter(t => {
        if (t.type !== 'expense') return false;
        if (b.categoryIds && t.categoryId && b.categoryIds.includes(t.categoryId)) return true;
        return b.categories.includes(t.category);
      })
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const percent = b.limit > 0 ? (spent / b.limit) * 100 : 0;
    const remaining = b.limit - spent;

    let status: 'within' | 'near' | 'over' = 'within';
    if (percent >= 100) status = 'over';
    else if (percent >= 80) status = 'near';

    return {
      name: b.name,
      categories: b.categories,
      limit: b.limit,
      spent,
      remaining,
      percent,
      fixed: b.fixed,
      status,
    };
  });
}

/**
 * Fixed Budgets expected, paid, and pending analysis.
 */
export function fixedBudgetsSummary(budgets: Budget[], transactions: Transaction[]) {
  const fixedBudgets = budgets.filter(b => b.fixed);
  const healthList = calculateBudgetHealth(fixedBudgets, transactions);

  const expected = fixedBudgets.reduce((sum, b) => sum + b.limit, 0); // 25,450
  const paid = healthList.reduce((sum, h) => sum + h.spent, 0); // 21,727
  const pendingBudgets = healthList.filter(h => h.spent === 0);

  return {
    expected,
    paid,
    pendingBudgets,
    allFixed: healthList,
  };
}

/**
 * Year to Date aggregation combining history and current transactions.
 */
export function yearToDate(
  history: AppHistory,
  currentYearTransactions: Transaction[]
) {
  const hist = history.jan_to_sep_2026;
  const curInc = income(currentYearTransactions);
  const curSp = spending(currentYearTransactions);
  const curInv = invested(currentYearTransactions);
  const curOutflow = outflow(curSp, curInv);

  const totalIncome = (hist?.income || 0) + curInc;
  const totalSpending = (hist?.spending || 0) + curSp;
  const totalInvested = (hist?.invested || 0) + curInv;
  const totalOutflow = (hist?.outflow || 0) + curOutflow;

  // Combine category totals
  const categoryTotals: Record<string, number> = { ...(hist?.spendingByCategory || {}) };

  for (const t of currentYearTransactions) {
    if (t.type === 'expense') {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    }
  }

  return {
    income: totalIncome,
    spending: totalSpending,
    invested: totalInvested,
    outflow: totalOutflow,
    categoryTotals,
  };
}

/**
 * Run Acceptance Checks for Message 1
 */
export interface AcceptanceCheckResult {
  id: string;
  title: string;
  passed: boolean;
  expected: string;
  actual: string;
  details?: string;
}

export function runAcceptanceChecks(params: {
  transactions: Transaction[];
  loans: Loan[];
  investments: Investment[];
  goals: Goal[];
  cards: CreditCard[];
  budgets: Budget[];
  history: AppHistory;
  monthKey: string; // '2026-10'
}): AcceptanceCheckResult[] {
  const { transactions, loans, investments, goals, cards, budgets, history, monthKey } = params;

  const octTx = transactions.filter(t => t.date.startsWith(monthKey));

  const inc = income(octTx);
  const sp = spending(octTx);
  const inv = invested(octTx);
  const lft = left(inc, sp, inv);
  const out = outflow(sp, inv);
  const savRate = savingsRate(inc, sp);
  const emiSpend = emiSpending(octTx);
  const emiRatio = inc > 0 ? (emiSpend / inc) * 100 : 0;
  const invRatio = inc > 0 ? (inv / inc) * 100 : 0;

  const bHealth = calculateBudgetHealth(budgets, octTx);
  const kitchenBudget = bHealth.find(b => b.name === 'Kitchen Item');
  const healthBudget = bHealth.find(b => b.name === 'Health & Medicine');
  const personalBudget = bHealth.find(b => b.name === 'My Personal Expense');

  const fixedSummary = fixedBudgetsSummary(budgets, octTx);

  const nwResult = netWorthBreakdown({ goals, investments, loans, cards, transactions });

  const ytd = yearToDate(history, transactions);

  const checks: AcceptanceCheckResult[] = [
    {
      id: 'check-income',
      title: 'October Income = ₹82,000',
      passed: inc === 82000,
      expected: '₹82,000',
      actual: `₹${inc.toLocaleString('en-IN')}`,
    },
    {
      id: 'check-spending',
      title: 'October Spending = ₹70,202',
      passed: sp === 70202,
      expected: '₹70,202',
      actual: `₹${sp.toLocaleString('en-IN')}`,
      details: 'EMI entries included as spending.',
    },
    {
      id: 'check-invested',
      title: 'October Invested = ₹21,000',
      passed: inv === 21000,
      expected: '₹21,000',
      actual: `₹${inv.toLocaleString('en-IN')}`,
      details: 'INVEST ₹10K + PL ₹11K',
    },
    {
      id: 'check-left',
      title: 'October Left = −₹9,202',
      passed: lft === -9202,
      expected: '−₹9,202',
      actual: `₹${lft.toLocaleString('en-IN')}`,
    },
    {
      id: 'check-outflow',
      title: 'October Outflow = ₹91,202 (−27% vs Sep)',
      passed: out === 91202,
      expected: '₹91,202',
      actual: `₹${out.toLocaleString('en-IN')}`,
      details: 'Sep was ₹1,25,203; reduction is −27%.',
    },
    {
      id: 'check-savings-rate',
      title: 'Savings Rate = 14.4%',
      passed: Math.abs(savRate * 100 - 14.4) < 0.1,
      expected: '14.4%',
      actual: `${(savRate * 100).toFixed(1)}%`,
    },
    {
      id: 'check-emi-ratio',
      title: 'EMI spending = 27.5% of income',
      passed: Math.abs(emiRatio - 27.5) < 0.1,
      expected: '27.5%',
      actual: `${emiRatio.toFixed(1)}%`,
      details: `EMI spent: ₹${emiSpend.toLocaleString('en-IN')}`,
    },
    {
      id: 'check-invest-ratio',
      title: 'Invested = 25.6% of income',
      passed: Math.abs(invRatio - 25.6) < 0.1,
      expected: '25.6%',
      actual: `${invRatio.toFixed(1)}%`,
    },
    {
      id: 'check-over-budget',
      title: 'Over budget: Kitchen Item, Health, Personal Expense',
      passed:
        kitchenBudget?.status === 'over' &&
        kitchenBudget.spent === 8578 &&
        healthBudget?.status === 'over' &&
        healthBudget.spent === 9476 &&
        personalBudget?.status === 'over' &&
        personalBudget.spent === 1730,
      expected: 'Kitchen: ₹8,578 / ₹6,500; Health: ₹9,476 / ₹5,000; Personal: ₹1,730 / ₹1,500',
      actual: `Kitchen: ₹${kitchenBudget?.spent} / ₹${kitchenBudget?.limit}; Health: ₹${healthBudget?.spent} / ₹${healthBudget?.limit}; Personal: ₹${personalBudget?.spent} / ₹${personalBudget?.limit}`,
    },
    {
      id: 'check-fixed-budgets',
      title: 'Fixed budgets: expected ₹25,450, paid ₹21,727, Other fixed pending',
      passed:
        fixedSummary.expected === 25450 &&
        fixedSummary.paid === 21727 &&
        fixedSummary.pendingBudgets.some(b => b.name === 'Other fixed expense'),
      expected: 'Expected: ₹25,450, Paid: ₹21,727, Other fixed pending',
      actual: `Expected: ₹${fixedSummary.expected.toLocaleString('en-IN')}, Paid: ₹${fixedSummary.paid.toLocaleString('en-IN')}, Pending: ${fixedSummary.pendingBudgets.map(b => b.name).join(', ')}`,
    },
    {
      id: 'check-net-worth',
      title: 'Net worth = −₹2,06,133',
      passed: nwResult.netWorth === -206133,
      expected: '−₹2,06,133',
      actual: `₹${nwResult.netWorth.toLocaleString('en-IN')}`,
      details: '50K + 24,032 + 87,047 − 3,50,000 − 17,212',
    },
    {
      id: 'check-ytd',
      title: 'Year 2026 to date: Income ₹8.61L, Spending ₹10.33L, Outflow ₹11.44L',
      passed:
        ytd.income === 861739 &&
        ytd.spending === 1033692 &&
        ytd.invested === 111132 &&
        ytd.outflow === 1144824 &&
        ytd.categoryTotals['EMI'] === 471147 &&
        ytd.categoryTotals['Ankita'] === 78349 &&
        ytd.categoryTotals['Small Expense'] === 75854 &&
        ytd.categoryTotals['MOM'] === 65800 &&
        ytd.categoryTotals['Kitchen Item'] === 41656 &&
        ytd.categoryTotals['Gifts'] === 33624,
      expected: 'Inc ₹8,61,739, Sp ₹10,33,692, Inv ₹1,11,132, Out ₹11,44,824 with exact category match',
      actual: `Inc ₹${ytd.income.toLocaleString('en-IN')}, Sp ₹${ytd.spending.toLocaleString('en-IN')}, Inv ₹${ytd.invested.toLocaleString('en-IN')}, Out ₹${ytd.outflow.toLocaleString('en-IN')}`,
      details: `EMI: ₹${ytd.categoryTotals['EMI']}, Ankita: ₹${ytd.categoryTotals['Ankita']}, Small: ₹${ytd.categoryTotals['Small Expense']}, MOM: ₹${ytd.categoryTotals['MOM']}, Kitchen: ₹${ytd.categoryTotals['Kitchen Item']}, Gifts: ₹${ytd.categoryTotals['Gifts']}`,
    },
  ];

  return checks;
}
