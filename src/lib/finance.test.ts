import { SEED_DATA } from '../utils/seedData';
import {
  income,
  spending,
  invested,
  left,
  savingsRate,
  outflow,
  netWorthBreakdown,
  fixedBudgetsSummary,
  calculateBudgetHealth,
  yearToDate,
  runAcceptanceChecks,
} from './finance';
import { Transaction, Goal, Loan, Investment, CreditCard, Budget } from '../types';

// Expand SEED_DATA for testing
function buildTestDataset() {
  const transactions: Transaction[] = [];

  // 1. Expand importedOctTotals
  const importDate = SEED_DATA.importedOctTotals.date;
  for (const [cat, amt] of Object.entries(SEED_DATA.importedOctTotals.income)) {
    transactions.push({
      id: `imported_inc_${cat}`,
      date: importDate,
      type: 'income',
      category: cat,
      amount: amt,
      mode: 'Imported',
      imported: true,
      note: 'Old app: 1–14 Oct total',
    });
  }
  for (const [cat, amt] of Object.entries(SEED_DATA.importedOctTotals.expense)) {
    transactions.push({
      id: `imported_exp_${cat}`,
      date: importDate,
      type: 'expense',
      category: cat,
      amount: amt,
      mode: 'Imported',
      imported: true,
      note: 'Old app: 1–14 Oct total',
    });
  }
  for (const [cat, amt] of Object.entries(SEED_DATA.importedOctTotals.invest)) {
    transactions.push({
      id: `imported_inv_${cat}`,
      date: importDate,
      type: 'invest',
      category: cat,
      amount: amt,
      mode: 'Imported',
      imported: true,
      note: 'Old app: 1–14 Oct total',
    });
  }

  // 2. Add itemized transactions
  for (let i = 0; i < SEED_DATA.transactions.length; i++) {
    const t = SEED_DATA.transactions[i];
    transactions.push({
      id: `tx_${i + 1}`,
      date: t.date,
      type: t.type,
      category: t.category,
      amount: t.amount,
      mode: t.mode,
    });
  }

  const loans: Loan[] = SEED_DATA.loans.map((l, i) => ({
    id: `loan_${i + 1}`,
    name: l.name,
    direction: l.direction,
    category: l.category,
    principal: l.principal,
    outstanding: l.outstanding,
    emi: l.emi,
    totalEmis: l.totalEmis || 0,
    paidEmis: l.paidEmis || 0,
    paidAmount: l.paidAmount || 0,
    firstEmiDate: l.firstEmiDate || null,
    emiDay: l.emiDay || null,
    interestRate: l.interestRate || null,
    note: l.note,
  }));

  const investments: Investment[] = SEED_DATA.investments.map((inv, i) => ({
    id: `inv_${i + 1}`,
    name: inv.name,
    type: inv.type,
    currentValue: inv.currentValue,
    installment: inv.installment,
    frequency: inv.frequency,
    nextDueDate: inv.nextDueDate,
    autoPay: inv.autoPay,
    note: inv.note,
  }));

  const goals: Goal[] = SEED_DATA.goals.map((g, i) => ({
    id: `goal_${i + 1}`,
    name: g.name,
    target: g.target,
    saved: g.saved,
    targetDate: g.targetDate,
    isEmergencyFund: g.isEmergencyFund,
  }));

  const cards: CreditCard[] = SEED_DATA.cards.map((c, i) => ({
    id: `card_${i + 1}`,
    name: c.name,
    openingOutstanding: c.openingOutstanding,
    asOf: c.asOf,
  }));

  const budgets: Budget[] = SEED_DATA.budgets.map((b, i) => ({
    id: `budget_${i + 1}`,
    name: b.name,
    categories: b.categories,
    limit: b.limit,
    fixed: b.fixed,
  }));

  return { transactions, loans, investments, goals, cards, budgets, history: SEED_DATA.history };
}

function runTests() {
  console.log('=== Running FinWise Finance Engine Unit Tests ===');
  const data = buildTestDataset();

  const results = runAcceptanceChecks({
    transactions: data.transactions,
    loans: data.loans,
    investments: data.investments,
    goals: data.goals,
    cards: data.cards,
    budgets: data.budgets,
    history: data.history,
    monthKey: '2026-10',
  });

  let allPassed = true;
  for (const r of results) {
    if (r.passed) {
      console.log(`✓ [PASS] ${r.title} => Actual: ${r.actual}`);
    } else {
      console.error(`✗ [FAIL] ${r.title} => Expected: ${r.expected}, Got: ${r.actual}`);
      allPassed = false;
    }
  }

  if (allPassed) {
    console.log('\n ALL 12 ACCEPTANCE CHECKS PASSED PERFECTLY! \n');
  } else {
    console.error('\n❌ SOME ACCEPTANCE CHECKS FAILED! Please inspect.\n');
    process.exit(1);
  }
}

runTests();
