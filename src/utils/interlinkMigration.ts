import {
  Category,
  CategoryGroup,
  FamilyMember,
  Transaction,
  Loan,
  Investment,
  Goal,
  CreditCard,
  Account,
  RecurringItem,
  Budget,
  Asset,
  Insurance,
  UserSettings,
  AppHistory,
  BackupSnapshot,
} from '../types';
import { SEED_DATA } from './seedData';
import {
  income,
  spending,
  invested,
  outflow,
  left,
  savingsRate,
  netWorthBreakdown,
  deriveLoanMetrics,
  deriveGoalMetrics,
  deriveInvestmentMetrics,
} from '../lib/finance';

/**
 * Standard Member IDs
 */
export const MASTER_MEMBERS: FamilyMember[] = [
  { id: 'mem_self', name: 'Self', relation: 'Self', color: '#10b981' },
  { id: 'mem_mom', name: 'MOM', relation: 'Mother', color: '#f59e0b' },
  { id: 'mem_ankita', name: 'Ankita', relation: 'Sister', color: '#8b5cf6' },
  { id: 'mem_sis', name: 'Sis', relation: 'Sister', color: '#ec4899' },
];

/**
 * Standard Category Group IDs
 */
export const MASTER_GROUPS: CategoryGroup[] = [
  { id: 'grp_family_support', name: 'Family Support', color: '#10b981', icon: 'Family', order: 0 },
  { id: 'grp_kitchen', name: 'Kitchen & Grocery', color: '#3b82f6', icon: 'ShoppingBag', order: 1 },
  { id: 'grp_health', name: 'Health', color: '#8b5cf6', icon: 'HeartPulse', order: 2 },
  { id: 'grp_home_bills', name: 'Home & Bills', color: '#ec4899', icon: 'Home', order: 3 },
  { id: 'grp_loans_emi', name: 'Loans & EMI', color: '#f59e0b', icon: 'CreditCard', order: 4 },
  { id: 'grp_personal_shopping', name: 'Personal & Shopping', color: '#06b6d4', icon: 'Coffee', order: 5 },
  { id: 'grp_food_outside', name: 'Food Outside', color: '#6366f1', icon: 'Coffee', order: 6 },
  { id: 'grp_travel_transport', name: 'Travel & Transport', color: '#f43f5e', icon: 'Car', order: 7 },
  { id: 'grp_social_giving', name: 'Social & Giving', color: '#eab308', icon: 'Gift', order: 8 },
  { id: 'grp_other', name: 'Other', color: '#71717a', icon: 'HelpCircle', order: 9 },
];

/**
 * Build clean slug id for categories
 */
export function slugifyCategoryId(name: string, prefix = 'cat_'): string {
  const clean = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${prefix}${clean || 'general'}`;
}

/**
 * Master Categories Registry with stable IDs
 */
export function buildMasterCategories(): Category[] {
  const list: Category[] = [];

  // Group to ID map
  const groupMap: Record<string, string> = {};
  MASTER_GROUPS.forEach(g => {
    groupMap[g.name] = g.id;
  });

  // Category to Group Name map
  const catToGroup: Record<string, string> = {};
  for (const [gName, cats] of Object.entries(SEED_DATA.groups_suggested_editable)) {
    for (const c of cats) {
      catToGroup[c] = gName;
    }
  }

  // Member to ID map
  const memberMap: Record<string, string> = {
    Self: 'mem_self',
    MOM: 'mem_mom',
    Ankita: 'mem_ankita',
    Sis: 'mem_sis',
  };

  // 1. Expense Categories
  SEED_DATA.expenseCategories.forEach((catName, idx) => {
    const grpName = catToGroup[catName] || 'Other';
    const grpId = groupMap[grpName] || 'grp_other';
    const defMemberName = SEED_DATA.categoryDefaultMember[catName];
    const defMemberId = defMemberName ? memberMap[defMemberName] : undefined;

    list.push({
      id: slugifyCategoryId(catName, 'cat_exp_'),
      name: catName,
      type: 'expense',
      groupId: grpId,
      defaultMemberId: defMemberId,
      order: idx,
      isArchived: false,
    });
  });

  // 2. Income Categories
  SEED_DATA.incomeCategories.forEach((catName, idx) => {
    list.push({
      id: slugifyCategoryId(catName, 'cat_inc_'),
      name: catName,
      type: 'income',
      groupId: 'grp_other',
      order: idx,
      isArchived: false,
    });
  });

  // 3. Investment Categories
  ['INVEST', 'PL', 'LIC Policy Investment', 'Mutual Fund', 'Stock SIP', 'PPF', 'EPF', 'Gold SGB'].forEach(
    (catName, idx) => {
      list.push({
        id: slugifyCategoryId(catName, 'cat_inv_'),
        name: catName,
        type: 'invest',
        groupId: 'grp_other',
        order: idx,
        isArchived: false,
      });
    }
  );

  return list;
}

/**
 * Helper to link any raw or old transaction to master IDs
 */
export function normalizeTransaction(
  t: Transaction,
  categories: Category[],
  accounts: Account[],
  cards: CreditCard[],
  loans: Loan[],
  investments: Investment[],
  goals: Goal[]
): Transaction {
  const norm: Transaction = { ...t };

  // 1. Category ID
  if (!norm.categoryId) {
    const matched = categories.find(c => c.name.toLowerCase() === (t.category || '').toLowerCase());
    if (matched) {
      norm.categoryId = matched.id;
    } else {
      norm.categoryId = slugifyCategoryId(t.category || 'Other', t.type === 'income' ? 'cat_inc_' : 'cat_exp_');
    }
  }

  // 2. Account ID & Card ID
  if (!norm.accountId) {
    if (t.mode === 'Bank') norm.accountId = 'acc_bank_1';
    else if (t.mode === 'Cash') norm.accountId = 'acc_cash_1';
    else if (t.mode === 'UPI') norm.accountId = 'acc_wallet_1';
    else if (t.mode === 'Credit Card') {
      norm.cardId = norm.cardId || 'seed_card_1';
      norm.accountId = 'acc_bank_1'; // payment ledger account
    } else {
      norm.accountId = 'acc_bank_1'; // default fallback for imported
    }
  }

  // 3. Member ID
  if (!norm.memberId) {
    const cat = categories.find(c => c.id === norm.categoryId);
    if (cat?.defaultMemberId) {
      norm.memberId = cat.defaultMemberId;
    } else if (norm.category === 'MOM') norm.memberId = 'mem_mom';
    else if (norm.category === 'Ankita') norm.memberId = 'mem_ankita';
    else if (norm.category === 'Sis' || norm.category === 'Sis Med') norm.memberId = 'mem_sis';
    else norm.memberId = 'mem_self';
  }

  // 4. Loan ID (Link EMI entries to ALL Bank loan)
  if (!norm.loanId && (norm.category === 'EMI' || norm.categoryId?.includes('emi'))) {
    norm.loanId = 'seed_loan_1';
  }

  // 5. Investment ID
  if (!norm.investmentId && (norm.type === 'invest' || norm.category === 'INVEST' || norm.category === 'PL' || norm.category.includes('LIC'))) {
    if (norm.category === 'INVEST') norm.investmentId = 'seed_inv_1';
    else if (norm.category === 'PL') norm.investmentId = 'seed_inv_2';
    else if (norm.category.includes('LIC')) norm.investmentId = 'seed_inv_3';
  }

  // 6. Goal ID (Link emergency fund savings)
  if (!norm.goalId && (norm.category === 'Goal Savings' || norm.note?.toLowerCase().includes('emergency fund'))) {
    norm.goalId = 'seed_goal_1';
  }

  return norm;
}

/**
 * Full Migration Result with Before / After verification
 */
export interface MigrationResult {
  migrated: boolean;
  timestamp: string;
  before: {
    octIncome: number;
    octSpending: number;
    octInvested: number;
    octOutflow: number;
    octLeft: number;
    savingsRatePct: number;
    yearOutflow: number;
    netWorth: number;
  };
  after: {
    octIncome: number;
    octSpending: number;
    octInvested: number;
    octOutflow: number;
    octLeft: number;
    savingsRatePct: number;
    yearOutflow: number;
    netWorth: number;
  };
  checks: Array<{
    metric: string;
    beforeVal: string;
    afterVal: string;
    matches: boolean;
  }>;
  relationsCreated: {
    categoriesWithIds: number;
    groupsWithIds: number;
    membersWithIds: number;
    transactionsLinkedById: number;
    loansWithOpeningValues: number;
    investmentsWithOpeningValues: number;
    goalsWithOpeningValues: number;
    recurringLinkedById: number;
    budgetsLinkedById: number;
  };
}

/**
 * Runs the migration on existing state, records before/after metrics,
 * and returns the migrated payload.
 */
export function runInterlinkMigration(params: {
  transactions: Transaction[];
  loans: Loan[];
  investments: Investment[];
  goals: Goal[];
  cards: CreditCard[];
  accounts: Account[];
  assets: Asset[];
  insurance: Insurance[];
  recurringItems: RecurringItem[];
  budgets: Budget[];
  categories?: Category[];
  groups?: CategoryGroup[];
  members?: FamilyMember[];
  history: AppHistory;
}): {
  migratedData: {
    transactions: Transaction[];
    loans: Loan[];
    investments: Investment[];
    goals: Goal[];
    cards: CreditCard[];
    accounts: Account[];
    assets: Asset[];
    insurance: Insurance[];
    recurringItems: RecurringItem[];
    budgets: Budget[];
    categories: Category[];
    groups: CategoryGroup[];
    members: FamilyMember[];
  };
  audit: MigrationResult;
} {
  const {
    transactions: rawTx,
    loans: rawLoans,
    investments: rawInv,
    goals: rawGoals,
    cards: rawCards,
    accounts: rawAccounts,
    assets: rawAssets,
    insurance: rawInsurance,
    recurringItems: rawRec,
    budgets: rawBudgets,
    history,
  } = params;

  // 1. Calculate BEFORE values on October 2026 transactions
  const octBeforeTx = rawTx.filter(t => t.date.startsWith('2026-10'));
  const bInc = income(octBeforeTx); // ₹82,000
  const bSp = spending(octBeforeTx); // ₹70,202
  const bInv = invested(octBeforeTx); // ₹21,000
  const bOutflow = outflow(bSp, bInv); // ₹91,202
  const bLeft = left(bInc, bSp, bInv); // −₹9,202
  const bSavRate = Math.round(savingsRate(bInc, bSp) * 1000) / 10; // 14.4%
  const bYearOutflow = (history.jan_to_sep_2026?.outflow || 1053622) + bOutflow; // ₹11,44,824
  const bNw = netWorthBreakdown({
    goals: rawGoals,
    investments: rawInv,
    loans: rawLoans,
    cards: rawCards,
    assets: rawAssets,
  }).netWorth; // −₹2,06,133

  // 2. Prepare Master Entities with ID links
  const masterCategories = buildMasterCategories();
  const masterGroups = MASTER_GROUPS;
  const masterMembers = MASTER_MEMBERS;

  // Map Category Name to Category ID
  const catNameToId: Record<string, string> = {};
  masterCategories.forEach(c => {
    catNameToId[c.name.toLowerCase()] = c.id;
  });

  // 3. Migrate Accounts (ensure default accounts exist)
  const migratedAccounts: Account[] = rawAccounts.length > 0 ? [...rawAccounts] : [
    { id: 'acc_bank_1', name: 'Primary Bank Account', kind: 'bank', openingBalance: 32000, isArchived: false },
    { id: 'acc_cash_1', name: 'Cash in Hand', kind: 'cash', openingBalance: 6500, isArchived: false },
    { id: 'acc_wallet_1', name: 'UPI Wallet / Payments', kind: 'wallet', openingBalance: 2000, isArchived: false },
  ];

  // 4. Migrate Cards
  const migratedCards: CreditCard[] = rawCards.map(c => ({
    ...c,
    id: c.id || 'seed_card_1',
    openingOutstanding: c.openingOutstanding || 17212,
    asOf: c.asOf || '2026-10-14T23:59:59+05:30',
  }));

  // 5. Migrate Loans: store opening facts, remove calculated fields
  const migratedLoans: Loan[] = rawLoans.map(l => {
    const isALLBank = l.name.toLowerCase().includes('all bank') || l.id === 'seed_loan_1';
    return {
      ...l,
      id: l.id || (isALLBank ? 'seed_loan_1' : 'seed_loan_2'),
      lender: isALLBank ? 'ALL Bank' : 'Friends & Family',
      categoryId: catNameToId['emi'] || 'cat_exp_emi',
      openingOutstanding: l.openingOutstanding ?? l.outstanding,
      openingPaidEmis: l.openingPaidEmis ?? l.paidEmis,
      openingPaidAmount: l.openingPaidAmount ?? l.paidAmount,
      // Rule 1: We preserve the current fields as fallback, but live derivation is enabled
    };
  });

  // 6. Migrate Investments: store opening facts
  const migratedInvestments: Investment[] = rawInv.map(inv => ({
    ...inv,
    openingInvestedAmount: inv.openingInvestedAmount ?? (inv.installment * (inv.frequency === 'monthly' ? 1 : 1)),
  }));

  // 7. Migrate Goals: store opening saved
  const migratedGoals: Goal[] = rawGoals.map(g => ({
    ...g,
    openingSaved: g.openingSaved ?? g.saved,
  }));

  // 8. Migrate Transactions: normalize with categoryId, accountId, memberId, loanId, investmentId, goalId
  const migratedTx: Transaction[] = rawTx.map(t =>
    normalizeTransaction(
      t,
      masterCategories,
      migratedAccounts,
      migratedCards,
      migratedLoans,
      migratedInvestments,
      migratedGoals
    )
  );

  // 9. Migrate Budgets: map category names to categoryIds
  const migratedBudgets: Budget[] = rawBudgets.map((b, idx) => {
    const cIds = b.categories
      .map(cName => catNameToId[cName.toLowerCase()])
      .filter((id): id is string => !!id);
    return {
      ...b,
      id: b.id || `budget_${idx + 1}`,
      categoryIds: cIds.length > 0 ? cIds : undefined,
    };
  });

  // 10. Migrate Recurring Items: map categoryId, accountId, linkedLoanId
  const migratedRecurring: RecurringItem[] = rawRec.map(r => {
    const cId = catNameToId[r.category.toLowerCase()] || slugifyCategoryId(r.category, 'cat_exp_');
    let accId = r.accountId;
    if (!accId) {
      if (r.mode === 'Cash') accId = 'acc_cash_1';
      else if (r.mode === 'UPI') accId = 'acc_wallet_1';
      else accId = 'acc_bank_1';
    }
    return {
      ...r,
      categoryId: cId,
      accountId: accId,
      linkedLoanId: r.title.toLowerCase().includes('emi') ? 'seed_loan_1' : r.linkedLoanId,
      linkedInvestmentId: r.title.toLowerCase().includes('invest')
        ? 'seed_inv_1'
        : r.title.toLowerCase().includes('pl')
        ? 'seed_inv_2'
        : r.linkedInvestmentId,
    };
  });

  // 11. Calculate AFTER values on migrated October 2026 transactions
  const octAfterTx = migratedTx.filter(t => t.date.startsWith('2026-10'));
  const aInc = income(octAfterTx);
  const aSp = spending(octAfterTx);
  const aInv = invested(octAfterTx);
  const aOutflow = outflow(aSp, aInv);
  const aLeft = left(aInc, aSp, aInv);
  const aSavRate = Math.round(savingsRate(aInc, aSp) * 1000) / 10;
  const aYearOutflow = (history.jan_to_sep_2026?.outflow || 1053622) + aOutflow;
  const aNw = netWorthBreakdown({
    goals: migratedGoals,
    investments: migratedInvestments,
    loans: migratedLoans,
    cards: migratedCards,
    assets: rawAssets,
  }).netWorth;

  const checks = [
    {
      metric: 'October 2026 Income',
      beforeVal: `₹${bInc.toLocaleString('en-IN')}`,
      afterVal: `₹${aInc.toLocaleString('en-IN')}`,
      matches: bInc === aInc && aInc === 82000,
    },
    {
      metric: 'October 2026 Spending',
      beforeVal: `₹${bSp.toLocaleString('en-IN')}`,
      afterVal: `₹${aSp.toLocaleString('en-IN')}`,
      matches: bSp === aSp && aSp === 70202,
    },
    {
      metric: 'October 2026 Invested',
      beforeVal: `₹${bInv.toLocaleString('en-IN')}`,
      afterVal: `₹${aInv.toLocaleString('en-IN')}`,
      matches: bInv === aInv && aInv === 21000,
    },
    {
      metric: 'October 2026 Outflow',
      beforeVal: `₹${bOutflow.toLocaleString('en-IN')}`,
      afterVal: `₹${aOutflow.toLocaleString('en-IN')}`,
      matches: bOutflow === aOutflow && aOutflow === 91202,
    },
    {
      metric: 'October 2026 Left (Surplus)',
      beforeVal: `₹${bLeft.toLocaleString('en-IN')}`,
      afterVal: `₹${aLeft.toLocaleString('en-IN')}`,
      matches: bLeft === aLeft && aLeft === -9202,
    },
    {
      metric: 'Savings Rate',
      beforeVal: `${bSavRate}%`,
      afterVal: `${aSavRate}%`,
      matches: bSavRate === aSavRate && aSavRate === 14.4,
    },
    {
      metric: 'Year 2026 Total Outflow',
      beforeVal: `₹${bYearOutflow.toLocaleString('en-IN')}`,
      afterVal: `₹${aYearOutflow.toLocaleString('en-IN')}`,
      matches: bYearOutflow === aYearOutflow && aYearOutflow === 1144824,
    },
    {
      metric: 'Net Worth (pre-bank balance)',
      beforeVal: `₹${bNw.toLocaleString('en-IN')}`,
      afterVal: `₹${aNw.toLocaleString('en-IN')}`,
      matches: bNw === aNw && aNw === -206133,
    },
  ];

  const audit: MigrationResult = {
    migrated: true,
    timestamp: new Date().toISOString(),
    before: {
      octIncome: bInc,
      octSpending: bSp,
      octInvested: bInv,
      octOutflow: bOutflow,
      octLeft: bLeft,
      savingsRatePct: bSavRate,
      yearOutflow: bYearOutflow,
      netWorth: bNw,
    },
    after: {
      octIncome: aInc,
      octSpending: aSp,
      octInvested: aInv,
      octOutflow: aOutflow,
      octLeft: aLeft,
      savingsRatePct: aSavRate,
      yearOutflow: aYearOutflow,
      netWorth: aNw,
    },
    checks,
    relationsCreated: {
      categoriesWithIds: masterCategories.length,
      groupsWithIds: masterGroups.length,
      membersWithIds: masterMembers.length,
      transactionsLinkedById: migratedTx.filter(t => !!t.categoryId).length,
      loansWithOpeningValues: migratedLoans.length,
      investmentsWithOpeningValues: migratedInvestments.length,
      goalsWithOpeningValues: migratedGoals.length,
      recurringLinkedById: migratedRecurring.length,
      budgetsLinkedById: migratedBudgets.length,
    },
  };

  return {
    migratedData: {
      transactions: migratedTx,
      loans: migratedLoans,
      investments: migratedInvestments,
      goals: migratedGoals,
      cards: migratedCards,
      accounts: migratedAccounts,
      assets: rawAssets,
      insurance: rawInsurance,
      recurringItems: migratedRecurring,
      budgets: migratedBudgets,
      categories: masterCategories,
      groups: masterGroups,
      members: masterMembers,
    },
    audit,
  };
}

/**
 * Creates an automatic snapshot backup and saves to localStorage
 */
export function createSnapshotBackup(
  data: {
    transactions: Transaction[];
    loans: Loan[];
    investments: Investment[];
    goals: Goal[];
    cards: CreditCard[];
    accounts: Account[];
    categories?: Category[];
    budgets?: Budget[];
  },
  label = 'Auto Pre-Migration Backup'
): BackupSnapshot {
  const snapshot: BackupSnapshot = {
    id: `backup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    label,
    itemCounts: {
      transactions: data.transactions.length,
      loans: data.loans.length,
      investments: data.investments.length,
      goals: data.goals.length,
      categories: data.categories?.length || 0,
      accounts: data.accounts.length,
    },
    dataJson: JSON.stringify(data, null, 2),
  };

  try {
    const existingRaw = localStorage.getItem('mk_backups');
    const existingList: BackupSnapshot[] = existingRaw ? JSON.parse(existingRaw) : [];
    const updated = [snapshot, ...existingList].slice(0, 20); // keep last 20
    localStorage.setItem('mk_backups', JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save snapshot backup to localStorage', e);
  }

  return snapshot;
}

/**
 * Gets all saved backup snapshots from localStorage
 */
export function getSavedBackups(): BackupSnapshot[] {
  try {
    const existingRaw = localStorage.getItem('mk_backups');
    return existingRaw ? JSON.parse(existingRaw) : [];
  } catch (e) {
    return [];
  }
}
