import { create } from 'zustand';
import {
  Transaction,
  Loan,
  Investment,
  Goal,
  Insurance,
  CreditCard,
  Asset,
  Account,
  RecurringItem,
  Budget,
  Category,
  CategoryGroup,
  FamilyMember,
  UserSettings,
  AppHistory,
  ScreenType,
  BackupSnapshot,
  DataHealthIssue,
} from '../types';
import { SEED_DATA, buildSeedAccounts, buildSeedRecurringItems } from '../utils/seedData';
import { buildSeedTransactions } from '../firebase/service';
import {
  PeriodFilter,
  netWorthBreakdown,
  deriveLoanMetrics,
  deriveGoalMetrics,
  deriveInvestmentMetrics,
  cardOutstanding,
  accountBalance,
} from '../lib/finance';
import {
  runInterlinkMigration,
  createSnapshotBackup,
  getSavedBackups,
  MigrationResult,
  buildMasterCategories,
  MASTER_GROUPS,
  MASTER_MEMBERS,
} from '../utils/interlinkMigration';

interface FinanceStoreState {
  // Navigation & UI state
  activeScreen: ScreenType;
  setActiveScreen: (screen: ScreenType) => void;
  activeMonthKey: string;
  setActiveMonthKey: (key: string) => void;
  period: PeriodFilter;
  setPeriod: (period: PeriodFilter) => void;
  todayDateStr: string;
  darkMode: boolean;
  toggleDarkMode: () => void;
  hideAmounts: boolean;
  toggleHideAmounts: () => void;
  syncStatus: 'synced' | 'offline' | 'syncing';
  setSyncStatus: (status: 'synced' | 'offline' | 'syncing') => void;
  quickAddOpen: boolean;
  setQuickAddOpen: (open: boolean) => void;
  testModalOpen: boolean;
  setTestModalOpen: (open: boolean) => void;
  globalSearchOpen: boolean;
  setGlobalSearchOpen: (open: boolean) => void;
  moreMenuOpen: boolean;
  setMoreMenuOpen: (open: boolean) => void;
  toast: { message: string; onUndo?: () => void } | null;
  showToast: (message: string, onUndo?: () => void) => void;
  clearToast: () => void;

  // Master Data collections
  transactions: Transaction[];
  loans: Loan[];
  investments: Investment[];
  goals: Goal[];
  insurance: Insurance[];
  cards: CreditCard[];
  assets: Asset[];
  accounts: Account[];
  recurringItems: RecurringItem[];
  budgets: Budget[];
  categories: Category[];
  groups: CategoryGroup[];
  members: FamilyMember[];
  settings: UserSettings;
  history: AppHistory;
  backups: BackupSnapshot[];
  migrationAudit: MigrationResult | null;

  // Setters
  setTransactions: (txs: Transaction[]) => void;
  setLoans: (loans: Loan[]) => void;
  setInvestments: (invs: Investment[]) => void;
  setGoals: (goals: Goal[]) => void;
  setAccounts: (accs: Account[]) => void;
  setBudgets: (budgets: Budget[]) => void;
  setCategories: (cats: Category[]) => void;
  setGroups: (grps: CategoryGroup[]) => void;
  setMembers: (mems: FamilyMember[]) => void;

  // Actions
  addOrUpdateTransaction: (tx: Omit<Transaction, 'id'> & { id?: string }) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  duplicateTransaction: (tx: Transaction) => Promise<void>;

  // One Action = One Record operations
  payLoanEMI: (loanId: string, amount: number, date?: string, accountId?: string) => Promise<void>;
  payInvestmentInstallment: (investmentId: string, amount: number, date?: string, accountId?: string) => Promise<void>;
  addMoneyToGoal: (goalId: string, amount: number, date?: string, accountId?: string, actionType?: 'add' | 'withdraw') => Promise<void>;
  payCreditCardBill: (cardId: string, amount: number, date?: string, accountId?: string) => Promise<void>;
  markRecurringPaid: (recurringId: string, paymentDate?: string, accountId?: string) => Promise<void>;
  toggleRecurringAutoCreate: (id: string) => Promise<void>;

  // Entity Management & Cascades
  addOrUpdateLoan: (loan: Omit<Loan, 'id'> & { id?: string }) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;
  addOrUpdateInvestment: (inv: Omit<Investment, 'id'> & { id?: string }) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  addOrUpdateGoal: (goal: Omit<Goal, 'id'> & { id?: string }) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addOrUpdateInsurance: (ins: Omit<Insurance, 'id'> & { id?: string }) => Promise<void>;
  deleteInsurance: (id: string) => Promise<void>;
  addOrUpdateCard: (card: Omit<CreditCard, 'id'> & { id?: string }) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  addOrUpdateAsset: (asset: Omit<Asset, 'id'> & { id?: string }) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  addOrUpdateAccount: (acc: Omit<Account, 'id'> & { id?: string }) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  reconcileAccount: (accountId: string, realBalance: number) => Promise<void>;
  recordTransfer: (fromAccountId: string, toAccountId: string, amount: number, date?: string, note?: string) => Promise<void>;
  bulkMapModeToAccount: (mapping: Record<string, string>) => Promise<number>;

  // Categories & Safe Cascades
  renameCategory: (oldNameOrId: string, newName: string, type?: 'expense' | 'income') => Promise<void>;
  mergeCategories: (fromIdOrName: string, toIdOrName: string) => Promise<{ count: number }>;
  deleteCategory: (idOrName: string, action: 'archive' | 'reassign', targetIdOrName?: string) => Promise<void>;
  addCategory: (name: string, type: 'expense' | 'income' | 'invest', groupId?: string) => Promise<void>;

  // Family & Budgets
  updateMemberBudget: (memberName: string, budgetLimit: number) => Promise<void>;
  applyBatchMemberAssignment: () => Promise<number>;
  addOrUpdateBudget: (budget: Budget) => Promise<void>;
  deleteBudget: (nameOrId: string) => Promise<void>;

  // Backup & Restore
  createManualBackup: (label?: string) => BackupSnapshot;
  restoreSnapshotBackup: (backupId: string) => Promise<boolean>;
  exportJSON: () => string;
  restoreFromJSON: (jsonStr: string) => Promise<void>;

  // Data Health
  getDataHealthIssues: () => DataHealthIssue[];
  fixDataHealthIssue: (issueId: string, fixType: string) => Promise<number>;

  // Live Selectors
  getDerivedLoans: () => Loan[];
  getDerivedInvestments: () => Investment[];
  getDerivedGoals: () => Goal[];
  getDerivedAccounts: () => Array<Account & { balance: number }>;
  getDerivedCards: () => Array<CreditCard & { currentOutstanding: number }>;
  getNetWorth: () => number;
}

/**
 * Initialize raw state and perform migration
 */
function initMigratedState() {
  const rawTx: Transaction[] = (() => {
    const seed = buildSeedTransactions();
    const saved = localStorage.getItem('mk_local_tx');
    if (!saved) return seed;
    const parsed: Transaction[] = JSON.parse(saved);
    const existingIds = new Set(parsed.map(t => t.id));
    const toAdd = seed.filter(t => !existingIds.has(t.id));
    return toAdd.length > 0 ? [...parsed, ...toAdd] : parsed;
  })();

  const rawLoans: Loan[] = (() => {
    const saved = localStorage.getItem('mk_local_loans');
    return saved ? JSON.parse(saved) : SEED_DATA.loans.map((l, i) => ({ ...l, id: `seed_loan_${i + 1}` }));
  })();

  const rawInv: Investment[] = (() => {
    const saved = localStorage.getItem('mk_local_investments');
    return saved ? JSON.parse(saved) : SEED_DATA.investments.map((inv, i) => ({ ...inv, id: `seed_inv_${i + 1}` }));
  })();

  const rawGoals: Goal[] = (() => {
    const saved = localStorage.getItem('mk_local_goals');
    return saved ? JSON.parse(saved) : SEED_DATA.goals.map((g, i) => ({ ...g, id: `seed_goal_${i + 1}` }));
  })();

  const rawInsurance: Insurance[] = (() => {
    const saved = localStorage.getItem('mk_local_insurance');
    return saved ? JSON.parse(saved) : SEED_DATA.insurance.map((ins, i) => ({ ...ins, id: `seed_ins_${i + 1}` }));
  })();

  const rawCards: CreditCard[] = (() => {
    const saved = localStorage.getItem('mk_local_cards');
    return saved ? JSON.parse(saved) : SEED_DATA.cards.map((c, i) => ({ ...c, id: `seed_card_${i + 1}` }));
  })();

  const rawAssets: Asset[] = (() => {
    const saved = localStorage.getItem('mk_local_assets');
    return saved ? JSON.parse(saved) : [];
  })();

  const rawRec: RecurringItem[] = (() => {
    const saved = localStorage.getItem('mk_local_recurring');
    return saved ? JSON.parse(saved) : buildSeedRecurringItems();
  })();

  const rawAcc: Account[] = (() => {
    const saved = localStorage.getItem('mk_local_accounts');
    return saved ? JSON.parse(saved) : buildSeedAccounts();
  })();

  const rawBudgets: Budget[] = (() => {
    const saved = localStorage.getItem('mk_local_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.budgets) return parsed.budgets;
      } catch (e) {}
    }
    return [...SEED_DATA.budgets];
  })();

  // Automatic Snapshot Backup before running migration
  createSnapshotBackup(
    {
      transactions: rawTx,
      loans: rawLoans,
      investments: rawInv,
      goals: rawGoals,
      cards: rawCards,
      accounts: rawAcc,
      categories: buildMasterCategories(),
      budgets: rawBudgets,
    },
    'Automatic Baseline Pre-Migration Backup'
  );

  // Run interlink migration
  const { migratedData, audit } = runInterlinkMigration({
    transactions: rawTx,
    loans: rawLoans,
    investments: rawInv,
    goals: rawGoals,
    cards: rawCards,
    accounts: rawAcc,
    assets: rawAssets,
    insurance: rawInsurance,
    recurringItems: rawRec,
    budgets: rawBudgets,
    history: SEED_DATA.history,
  });

  return { migratedData, audit };
}

const { migratedData, audit: initialAudit } = initMigratedState();

export const useFinanceStore = create<FinanceStoreState>((set, get) => ({
  // Navigation
  activeScreen: 'home',
  setActiveScreen: screen => set({ activeScreen: screen, moreMenuOpen: false }),
  activeMonthKey: '2026-10',
  setActiveMonthKey: key =>
    set(state => ({
      activeMonthKey: key,
      period: { ...state.period, monthKey: key },
    })),
  period: {
    type: 'month',
    monthKey: '2026-10',
    year: 2026,
    fyYear: 2026,
  },
  setPeriod: newP => {
    set({
      period: newP,
      activeMonthKey: newP.type === 'month' && newP.monthKey ? newP.monthKey : '2026-10',
    });
  },
  todayDateStr: '2026-10-15',

  // Pure light theme per user requirement (FIX 1 of 5)
  darkMode: false,
  toggleDarkMode: () => {},

  // Hide amounts privacy toggle
  hideAmounts: localStorage.getItem('mk_hide_amounts') === 'true',
  toggleHideAmounts: () => {
    set(state => {
      const next = !state.hideAmounts;
      localStorage.setItem('mk_hide_amounts', String(next));
      return { hideAmounts: next };
    });
  },

  syncStatus: 'synced',
  setSyncStatus: status => set({ syncStatus: status }),

  quickAddOpen: false,
  setQuickAddOpen: open => set({ quickAddOpen: open }),
  testModalOpen: false,
  setTestModalOpen: open => set({ testModalOpen: open }),
  globalSearchOpen: false,
  setGlobalSearchOpen: open => set({ globalSearchOpen: open }),
  moreMenuOpen: false,
  setMoreMenuOpen: open => set({ moreMenuOpen: open }),

  toast: null,
  showToast: (message, onUndo) => {
    set({ toast: { message, onUndo } });
    setTimeout(() => {
      const cur = get().toast;
      if (cur?.message === message) set({ toast: null });
    }, 8000);
  },
  clearToast: () => set({ toast: null }),

  // Data Collections
  transactions: migratedData.transactions,
  loans: migratedData.loans,
  investments: migratedData.investments,
  goals: migratedData.goals,
  insurance: migratedData.insurance,
  cards: migratedData.cards,
  assets: migratedData.assets,
  accounts: migratedData.accounts,
  recurringItems: migratedData.recurringItems,
  budgets: migratedData.budgets,
  categories: migratedData.categories,
  groups: migratedData.groups,
  members: migratedData.members,
  settings: {
    expenseCategories: [...SEED_DATA.expenseCategories],
    incomeCategories: [...SEED_DATA.incomeCategories],
    paymentModes: [...SEED_DATA.paymentModes],
    budgets: migratedData.budgets,
    groups: migratedData.groups,
    members: migratedData.members,
  },
  history: SEED_DATA.history,
  backups: getSavedBackups(),
  migrationAudit: initialAudit,

  // Setters
  setTransactions: txs => set({ transactions: txs }),
  setLoans: loans => set({ loans }),
  setInvestments: investments => set({ investments }),
  setGoals: goals => set({ goals }),
  setAccounts: accounts => set({ accounts }),
  setBudgets: budgets => set({ budgets }),
  setCategories: categories => set({ categories }),
  setGroups: groups => set({ groups }),
  setMembers: members => set({ members }),

  // Rule 3: One action = One record & safe cascades
  addOrUpdateTransaction: async txData => {
    const state = get();
    const id = txData.id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const categoryObj = state.categories.find(c => c.id === txData.categoryId || c.name === txData.category);

    const fullTx: Transaction = {
      ...txData,
      id,
      category: categoryObj ? categoryObj.name : txData.category || 'Other',
      categoryId: categoryObj ? categoryObj.id : txData.categoryId || 'cat_exp_other',
      createdAt: txData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const exists = state.transactions.some(t => t.id === id);
    const updatedTx = exists
      ? state.transactions.map(t => (t.id === id ? fullTx : t))
      : [fullTx, ...state.transactions];

    set({ transactions: updatedTx });
    localStorage.setItem('mk_local_tx', JSON.stringify(updatedTx));
  },

  deleteTransaction: async id => {
    const state = get();
    const target = state.transactions.find(t => t.id === id);
    if (!target) return;

    const remaining = state.transactions.filter(t => t.id !== id);
    set({ transactions: remaining });
    localStorage.setItem('mk_local_tx', JSON.stringify(remaining));

    // Offer 8-second Undo
    state.showToast(`Deleted transaction "${target.category} ₹${target.amount}"`, async () => {
      const restored = [target, ...get().transactions];
      set({ transactions: restored });
      localStorage.setItem('mk_local_tx', JSON.stringify(restored));
    });
  },

  duplicateTransaction: async tx => {
    const state = get();
    const newTx: Transaction = {
      ...tx,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newTx, ...state.transactions];
    set({ transactions: updated });
    localStorage.setItem('mk_local_tx', JSON.stringify(updated));
    state.showToast(`Duplicated transaction "${tx.category} ₹${tx.amount}"`);
  },

  // One action = One record: Pay EMI creates 1 linked transaction
  payLoanEMI: async (loanId, amount, date = get().todayDateStr, accountId = 'acc_bank_1') => {
    const state = get();
    const loan = state.loans.find(l => l.id === loanId);
    if (!loan) return;

    const newTx: Transaction = {
      id: `emi_tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date,
      type: 'expense',
      category: 'EMI',
      categoryId: loan.categoryId || 'cat_exp_emi',
      amount,
      mode: 'Bank',
      accountId,
      loanId,
      note: `EMI payment for ${loan.name}`,
      createdAt: new Date().toISOString(),
    };

    const updatedTx = [newTx, ...state.transactions];
    set({ transactions: updatedTx });
    localStorage.setItem('mk_local_tx', JSON.stringify(updatedTx));

    state.showToast(`Paid EMI of ₹${amount.toLocaleString('en-IN')} for ${loan.name}`);
  },

  // One action = One record: Paid installment creates 1 linked invest transaction
  payInvestmentInstallment: async (investmentId, amount, date = get().todayDateStr, accountId = 'acc_bank_1') => {
    const state = get();
    const inv = state.investments.find(i => i.id === investmentId);
    if (!inv) return;

    const newTx: Transaction = {
      id: `inv_tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date,
      type: 'invest',
      category: inv.name,
      categoryId: 'cat_inv_invest',
      amount,
      mode: 'Bank',
      accountId,
      investmentId,
      note: `Installment for ${inv.name}`,
      createdAt: new Date().toISOString(),
    };

    const updatedTx = [newTx, ...state.transactions];
    set({ transactions: updatedTx });
    localStorage.setItem('mk_local_tx', JSON.stringify(updatedTx));

    state.showToast(`Paid installment of ₹${amount.toLocaleString('en-IN')} for ${inv.name}`);
  },

  // One action = One record: Add money / withdraw from goal creates 1 linked transaction
  addMoneyToGoal: async (goalId, amount, date = get().todayDateStr, accountId = 'acc_bank_1', actionType = 'add') => {
    const state = get();
    const goal = state.goals.find(g => g.id === goalId);
    if (!goal) return;

    const isWithdraw = actionType === 'withdraw';
    const newTx: Transaction = {
      id: `goal_tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date,
      type: isWithdraw ? 'income' : 'transfer',
      category: 'Goal Savings',
      categoryId: 'cat_exp_goal_savings',
      amount,
      mode: 'Bank',
      accountId,
      goalId,
      note: `${isWithdraw ? 'Withdrawal from' : 'Contribution to'} goal: ${goal.name}`,
      createdAt: new Date().toISOString(),
    };

    const updatedTx = [newTx, ...state.transactions];
    set({ transactions: updatedTx });
    localStorage.setItem('mk_local_tx', JSON.stringify(updatedTx));

    state.showToast(`${isWithdraw ? 'Withdrew' : 'Added'} ₹${amount.toLocaleString('en-IN')} ${isWithdraw ? 'from' : 'to'} ${goal.name}`);
  },

  // One action = One record: Pay card bill creates 1 cardPayment transaction
  payCreditCardBill: async (cardId, amount, date = get().todayDateStr, accountId = 'acc_bank_1') => {
    const state = get();
    const card = state.cards.find(c => c.id === cardId);
    if (!card) return;

    const newTx: Transaction = {
      id: `card_pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date,
      type: 'cardPayment',
      category: 'Credit Card Bill',
      categoryId: 'cat_exp_other',
      amount,
      mode: 'Bank',
      accountId,
      cardId,
      note: `Bill payment for ${card.name}`,
      createdAt: new Date().toISOString(),
    };

    const updatedTx = [newTx, ...state.transactions];
    set({ transactions: updatedTx });
    localStorage.setItem('mk_local_tx', JSON.stringify(updatedTx));

    state.showToast(`Paid credit card bill of ₹${amount.toLocaleString('en-IN')}`);
  },

  // One action = One record: Mark recurring paid
  markRecurringPaid: async (recurringId, paymentDate = get().todayDateStr, accountId = 'acc_bank_1') => {
    const state = get();
    const item = state.recurringItems.find(r => r.id === recurringId);
    if (!item) return;

    const newTx: Transaction = {
      id: `rec_paid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: paymentDate,
      type: item.type,
      category: item.category,
      categoryId: item.categoryId || 'cat_exp_other',
      amount: item.amount,
      mode: item.mode || 'Bank',
      accountId: item.accountId || accountId,
      recurringId,
      loanId: item.linkedLoanId,
      investmentId: item.linkedInvestmentId,
      note: `Recurring: ${item.title}`,
      createdAt: new Date().toISOString(),
    };

    const updatedTx = [newTx, ...state.transactions];
    set({ transactions: updatedTx });
    localStorage.setItem('mk_local_tx', JSON.stringify(updatedTx));

    state.showToast(`Marked recurring item "${item.title}" as paid`);
  },

  toggleRecurringAutoCreate: async id => {
    const state = get();
    const updated = state.recurringItems.map(r => (r.id === id ? { ...r, autoCreate: !r.autoCreate } : r));
    set({ recurringItems: updated });
    localStorage.setItem('mk_local_recurring', JSON.stringify(updated));
  },

  // Safe Cascade: Rename Category (updates name everywhere automatically via ID linkage)
  renameCategory: async (oldNameOrId, newName, type = 'expense') => {
    const cleanName = newName.trim();
    if (!cleanName) return;
    const state = get();

    const targetCat = state.categories.find(c => c.id === oldNameOrId || c.name === oldNameOrId);
    if (!targetCat) return;

    // 1. Update master category name
    const updatedCats = state.categories.map(c =>
      c.id === targetCat.id ? { ...c, name: cleanName } : c
    );

    // 2. Sync category string on transactions for display
    const updatedTx = state.transactions.map(t =>
      t.categoryId === targetCat.id || t.category === targetCat.name
        ? { ...t, category: cleanName, categoryId: targetCat.id }
        : t
    );

    // 3. Update budgets
    const updatedBudgets = state.budgets.map(b => {
      const match = b.categories.includes(targetCat.name) || b.categoryIds?.includes(targetCat.id);
      if (!match) return b;
      return {
        ...b,
        categories: b.categories.map(c => (c === targetCat.name ? cleanName : c)),
        name: b.name === targetCat.name ? cleanName : b.name,
      };
    });

    set({ categories: updatedCats, transactions: updatedTx, budgets: updatedBudgets });
    localStorage.setItem('mk_local_tx', JSON.stringify(updatedTx));
    state.showToast(`Renamed category to "${cleanName}"`);
  },

  // Safe Cascade: Merge Categories
  mergeCategories: async (fromIdOrName, toIdOrName) => {
    const state = get();
    const fromCat = state.categories.find(c => c.id === fromIdOrName || c.name === fromIdOrName);
    const toCat = state.categories.find(c => c.id === toIdOrName || c.name === toIdOrName);
    if (!fromCat || !toCat || fromCat.id === toCat.id) return { count: 0 };

    let count = 0;
    const updatedTx = state.transactions.map(t => {
      if (t.categoryId === fromCat.id || t.category === fromCat.name) {
        count++;
        return { ...t, categoryId: toCat.id, category: toCat.name };
      }
      return t;
    });

    // Reassign budgets
    const updatedBudgets = state.budgets.map(b => {
      if (b.categories.includes(fromCat.name) || b.categoryIds?.includes(fromCat.id)) {
        const newCats = Array.from(new Set(b.categories.map(c => (c === fromCat.name ? toCat.name : c))));
        const newCIds = Array.from(new Set((b.categoryIds || []).map(id => (id === fromCat.id ? toCat.id : id))));
        return { ...b, categories: newCats, categoryIds: newCIds };
      }
      return b;
    });

    // Archive fromCat
    const updatedCats = state.categories.map(c => (c.id === fromCat.id ? { ...c, isArchived: true } : c));

    set({ transactions: updatedTx, budgets: updatedBudgets, categories: updatedCats });
    localStorage.setItem('mk_local_tx', JSON.stringify(updatedTx));

    state.showToast(`Merged "${fromCat.name}" into "${toCat.name}" (${count} entries updated)`);
    return { count };
  },

  // Safe Cascade: Delete Category (Archive or Reassign)
  deleteCategory: async (idOrName, action, targetIdOrName) => {
    const state = get();
    const cat = state.categories.find(c => c.id === idOrName || c.name === idOrName);
    if (!cat) return;

    if (action === 'archive') {
      const updatedCats = state.categories.map(c => (c.id === cat.id ? { ...c, isArchived: true } : c));
      set({ categories: updatedCats });
      state.showToast(`Archived category "${cat.name}"`);
    } else if (action === 'reassign' && targetIdOrName) {
      await get().mergeCategories(cat.id, targetIdOrName);
      const remainingCats = state.categories.filter(c => c.id !== cat.id);
      set({ categories: remainingCats });
      state.showToast(`Reassigned and deleted category "${cat.name}"`);
    }
  },

  addCategory: async (name, type, groupId = 'grp_other') => {
    const clean = name.trim();
    if (!clean) return;
    const state = get();

    const newCat: Category = {
      id: `cat_${type === 'income' ? 'inc' : type === 'invest' ? 'inv' : 'exp'}_${Date.now()}`,
      name: clean,
      type,
      groupId,
      isArchived: false,
    };

    set({ categories: [...state.categories, newCat] });
    state.showToast(`Added category "${clean}"`);
  },

  // Entity Management
  addOrUpdateLoan: async loanData => {
    const state = get();
    const id = loanData.id || `loan_${Date.now()}`;
    const fullLoan: Loan = {
      ...loanData,
      id,
      openingOutstanding: loanData.openingOutstanding ?? loanData.principal,
      openingPaidEmis: loanData.openingPaidEmis ?? 0,
      openingPaidAmount: loanData.openingPaidAmount ?? 0,
      outstanding: loanData.outstanding ?? loanData.principal,
      paidEmis: loanData.paidEmis ?? 0,
      paidAmount: loanData.paidAmount ?? 0,
    };

    const exists = state.loans.some(l => l.id === id);
    const updated = exists ? state.loans.map(l => (l.id === id ? fullLoan : l)) : [...state.loans, fullLoan];
    set({ loans: updated });
    localStorage.setItem('mk_local_loans', JSON.stringify(updated));
    state.showToast(`Saved loan "${fullLoan.name}"`);
  },

  deleteLoan: async id => {
    const state = get();
    const remaining = state.loans.filter(l => l.id !== id);
    set({ loans: remaining });
    localStorage.setItem('mk_local_loans', JSON.stringify(remaining));
  },

  addOrUpdateInvestment: async invData => {
    const state = get();
    const id = invData.id || `inv_${Date.now()}`;
    const fullInv: Investment = {
      ...invData,
      id,
      openingInvestedAmount: invData.openingInvestedAmount ?? invData.installment,
    };
    const exists = state.investments.some(i => i.id === id);
    const updated = exists ? state.investments.map(i => (i.id === id ? fullInv : i)) : [...state.investments, fullInv];
    set({ investments: updated });
    localStorage.setItem('mk_local_investments', JSON.stringify(updated));
    state.showToast(`Saved investment "${fullInv.name}"`);
  },

  deleteInvestment: async id => {
    const state = get();
    const remaining = state.investments.filter(i => i.id !== id);
    set({ investments: remaining });
    localStorage.setItem('mk_local_investments', JSON.stringify(remaining));
  },

  addOrUpdateGoal: async goalData => {
    const state = get();
    const id = goalData.id || `goal_${Date.now()}`;
    const fullGoal: Goal = {
      ...goalData,
      id,
      openingSaved: goalData.openingSaved ?? goalData.saved ?? 0,
    };
    const exists = state.goals.some(g => g.id === id);
    const updated = exists ? state.goals.map(g => (g.id === id ? fullGoal : g)) : [...state.goals, fullGoal];
    set({ goals: updated });
    localStorage.setItem('mk_local_goals', JSON.stringify(updated));
    state.showToast(`Saved goal "${fullGoal.name}"`);
  },

  deleteGoal: async id => {
    const state = get();
    const remaining = state.goals.filter(g => g.id !== id);
    set({ goals: remaining });
    localStorage.setItem('mk_local_goals', JSON.stringify(remaining));
  },

  addOrUpdateInsurance: async insData => {
    const state = get();
    const id = insData.id || `ins_${Date.now()}`;
    const fullIns: Insurance = { ...insData, id };
    const exists = state.insurance.some(i => i.id === id);
    const updated = exists ? state.insurance.map(i => (i.id === id ? fullIns : i)) : [...state.insurance, fullIns];
    set({ insurance: updated });
    localStorage.setItem('mk_local_insurance', JSON.stringify(updated));
    state.showToast(`Saved policy "${fullIns.name}"`);
  },

  deleteInsurance: async id => {
    const state = get();
    const remaining = state.insurance.filter(i => i.id !== id);
    set({ insurance: remaining });
    localStorage.setItem('mk_local_insurance', JSON.stringify(remaining));
  },

  addOrUpdateCard: async cardData => {
    const state = get();
    const id = cardData.id || `card_${Date.now()}`;
    const fullCard: CreditCard = { ...cardData, id };
    const exists = state.cards.some(c => c.id === id);
    const updated = exists ? state.cards.map(c => (c.id === id ? fullCard : c)) : [...state.cards, fullCard];
    set({ cards: updated });
    localStorage.setItem('mk_local_cards', JSON.stringify(updated));
    state.showToast(`Saved card "${fullCard.name}"`);
  },

  deleteCard: async id => {
    const state = get();
    const remaining = state.cards.filter(c => c.id !== id);
    set({ cards: remaining });
    localStorage.setItem('mk_local_cards', JSON.stringify(remaining));
  },

  addOrUpdateAsset: async assetData => {
    const state = get();
    const id = assetData.id || `asset_${Date.now()}`;
    const fullAsset: Asset = { ...assetData, id };
    const exists = state.assets.some(a => a.id === id);
    const updated = exists ? state.assets.map(a => (a.id === id ? fullAsset : a)) : [...state.assets, fullAsset];
    set({ assets: updated });
    localStorage.setItem('mk_local_assets', JSON.stringify(updated));
    state.showToast(`Saved asset "${fullAsset.name}"`);
  },

  deleteAsset: async id => {
    const state = get();
    const remaining = state.assets.filter(a => a.id !== id);
    set({ assets: remaining });
    localStorage.setItem('mk_local_assets', JSON.stringify(remaining));
  },

  addOrUpdateAccount: async accData => {
    const state = get();
    const id = accData.id || `acc_${Date.now()}`;
    const fullAcc: Account = { ...accData, id };
    const exists = state.accounts.some(a => a.id === id);
    const updated = exists ? state.accounts.map(a => (a.id === id ? fullAcc : a)) : [...state.accounts, fullAcc];
    set({ accounts: updated });
    localStorage.setItem('mk_local_accounts', JSON.stringify(updated));
    state.showToast(`Saved account "${fullAcc.name}"`);
  },

  deleteAccount: async id => {
    const state = get();
    const remaining = state.accounts.filter(a => a.id !== id);
    set({ accounts: remaining });
    localStorage.setItem('mk_local_accounts', JSON.stringify(remaining));
  },

  reconcileAccount: async (accountId, realBalance) => {
    const state = get();
    const acc = state.accounts.find(a => a.id === accountId);
    if (!acc) return;

    const currentBal = accountBalance(acc, state.transactions);
    const diff = realBalance - currentBal;

    if (Math.abs(diff) > 0.01) {
      const adjTx: Transaction = {
        id: `adj_${Date.now()}`,
        date: state.todayDateStr,
        type: diff > 0 ? 'income' : 'expense',
        category: 'Reconciliation Adjustment',
        categoryId: diff > 0 ? 'cat_inc_refund' : 'cat_exp_small_expense',
        amount: Math.abs(diff),
        mode: acc.kind === 'cash' ? 'Cash' : acc.kind === 'wallet' ? 'UPI' : 'Bank',
        accountId: acc.id,
        note: `Reconciled balance from ₹${currentBal.toLocaleString('en-IN')} to ₹${realBalance.toLocaleString('en-IN')}`,
        createdAt: new Date().toISOString(),
      };
      const updatedTx = [adjTx, ...state.transactions];
      set({ transactions: updatedTx });
      localStorage.setItem('mk_local_tx', JSON.stringify(updatedTx));
    }

    state.showToast(`Reconciled "${acc.name}" to ₹${realBalance.toLocaleString('en-IN')}`);
  },

  recordTransfer: async (fromAccountId, toAccountId, amount, date = get().todayDateStr, note = 'Self Transfer') => {
    const state = get();
    const tx: Transaction = {
      id: `xfer_${Date.now()}`,
      date,
      type: 'transfer',
      category: 'Transfer',
      categoryId: 'cat_exp_other',
      amount,
      mode: 'Bank',
      accountId: fromAccountId,
      toAccountId,
      note,
      createdAt: new Date().toISOString(),
    };
    const updated = [tx, ...state.transactions];
    set({ transactions: updated });
    localStorage.setItem('mk_local_tx', JSON.stringify(updated));
    state.showToast(`Transferred ₹${amount.toLocaleString('en-IN')}`);
  },

  bulkMapModeToAccount: async mapping => {
    const state = get();
    let count = 0;
    const updatedTx = state.transactions.map(t => {
      const targetAccId = mapping[t.mode];
      if (targetAccId && !t.accountId) {
        count++;
        return { ...t, accountId: targetAccId };
      }
      return t;
    });

    set({ transactions: updatedTx });
    localStorage.setItem('mk_local_tx', JSON.stringify(updatedTx));
    state.showToast(`Mapped ${count} entries to selected accounts`);
    return count;
  },

  updateMemberBudget: async (memberName, budgetLimit) => {
    const state = get();
    const updatedMems = state.members.map(m => (m.name === memberName ? { ...m, budgetLimit } : m));
    set({ members: updatedMems });
    state.showToast(`Updated budget for ${memberName}`);
  },

  applyBatchMemberAssignment: async () => {
    const state = get();
    let count = 0;
    const updatedTx = state.transactions.map(t => {
      if (!t.memberId) {
        const cat = state.categories.find(c => c.id === t.categoryId || c.name === t.category);
        if (cat?.defaultMemberId) {
          count++;
          return { ...t, memberId: cat.defaultMemberId };
        }
      }
      return t;
    });
    set({ transactions: updatedTx });
    localStorage.setItem('mk_local_tx', JSON.stringify(updatedTx));
    state.showToast(`Assigned members to ${count} entries`);
    return count;
  },

  addOrUpdateBudget: async budget => {
    const state = get();
    const id = budget.id || `b_${Date.now()}`;
    const full = { ...budget, id };
    const exists = state.budgets.some(b => b.id === id || b.name === budget.name);
    const updated = exists ? state.budgets.map(b => (b.id === id || b.name === budget.name ? full : b)) : [...state.budgets, full];
    set({ budgets: updated });
    state.showToast(`Saved budget for ${budget.name}`);
  },

  deleteBudget: async nameOrId => {
    const state = get();
    const remaining = state.budgets.filter(b => b.id !== nameOrId && b.name !== nameOrId);
    set({ budgets: remaining });
    state.showToast(`Deleted budget`);
  },

  // Backups
  createManualBackup: (label = 'Manual Backup') => {
    const state = get();
    const backup = createSnapshotBackup(
      {
        transactions: state.transactions,
        loans: state.loans,
        investments: state.investments,
        goals: state.goals,
        cards: state.cards,
        accounts: state.accounts,
        categories: state.categories,
        budgets: state.budgets,
      },
      label
    );
    set({ backups: getSavedBackups() });
    state.showToast(`Created backup snapshot: "${label}"`);
    return backup;
  },

  restoreSnapshotBackup: async backupId => {
    const state = get();
    const target = state.backups.find(b => b.id === backupId);
    if (!target) return false;

    try {
      const parsed = JSON.parse(target.dataJson);
      if (parsed.transactions) set({ transactions: parsed.transactions });
      if (parsed.loans) set({ loans: parsed.loans });
      if (parsed.investments) set({ investments: parsed.investments });
      if (parsed.goals) set({ goals: parsed.goals });
      if (parsed.cards) set({ cards: parsed.cards });
      if (parsed.accounts) set({ accounts: parsed.accounts });
      if (parsed.categories) set({ categories: parsed.categories });
      if (parsed.budgets) set({ budgets: parsed.budgets });

      // Save to localStorage
      if (parsed.transactions) localStorage.setItem('mk_local_tx', JSON.stringify(parsed.transactions));
      if (parsed.loans) localStorage.setItem('mk_local_loans', JSON.stringify(parsed.loans));
      if (parsed.investments) localStorage.setItem('mk_local_investments', JSON.stringify(parsed.investments));
      if (parsed.goals) localStorage.setItem('mk_local_goals', JSON.stringify(parsed.goals));

      state.showToast(`Restored backup from ${new Date(target.timestamp).toLocaleString('en-IN')}`);
      return true;
    } catch (e) {
      console.error('Failed to restore backup snapshot', e);
      return false;
    }
  },

  exportJSON: () => {
    const state = get();
    return JSON.stringify(
      {
        transactions: state.transactions,
        loans: state.loans,
        investments: state.investments,
        goals: state.goals,
        cards: state.cards,
        accounts: state.accounts,
        assets: state.assets,
        insurance: state.insurance,
        recurringItems: state.recurringItems,
        budgets: state.budgets,
        categories: state.categories,
        groups: state.groups,
        members: state.members,
        history: state.history,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  },

  restoreFromJSON: async jsonStr => {
    const state = get();
    try {
      const data = JSON.parse(jsonStr);
      if (data.transactions) set({ transactions: data.transactions });
      if (data.loans) set({ loans: data.loans });
      if (data.investments) set({ investments: data.investments });
      if (data.goals) set({ goals: data.goals });
      if (data.cards) set({ cards: data.cards });
      if (data.accounts) set({ accounts: data.accounts });
      if (data.assets) set({ assets: data.assets });
      if (data.insurance) set({ insurance: data.insurance });
      if (data.recurringItems) set({ recurringItems: data.recurringItems });
      if (data.budgets) set({ budgets: data.budgets });
      if (data.categories) set({ categories: data.categories });
      if (data.groups) set({ groups: data.groups });
      if (data.members) set({ members: data.members });

      state.showToast('Restored all data from JSON backup successfully');
    } catch (e) {
      console.error('JSON restore error:', e);
      state.showToast('Invalid JSON file format');
    }
  },

  // Data Health Check System
  getDataHealthIssues: () => {
    const state = get();
    const issues: DataHealthIssue[] = [];

    // 1. Entries without an account
    const noAccountTxs = state.transactions.filter(t => !t.accountId);
    if (noAccountTxs.length > 0) {
      issues.push({
        id: 'issue_missing_account',
        type: 'missing_account',
        severity: 'medium',
        title: 'Entries without a Linked Account',
        description: `${noAccountTxs.length} historical entries have no linked account. Linking them ensures bank & cash ledger balances reflect real money.`,
        count: noAccountTxs.length,
        affectedIds: noAccountTxs.map(t => t.id),
        autoFixAvailable: true,
        fixActionLabel: 'Auto-Map to Accounts by Mode',
      });
    }

    // 2. EMI entries not linked to a loan
    const unlinkedEmiTxs = state.transactions.filter(
      t => (t.category === 'EMI' || t.categoryId?.includes('emi')) && !t.loanId
    );
    if (unlinkedEmiTxs.length > 0) {
      issues.push({
        id: 'issue_unlinked_emi',
        type: 'unlinked_emi',
        severity: 'high',
        title: 'EMI Payments not Linked to a Loan',
        description: `${unlinkedEmiTxs.length} EMI transactions are recorded without a loan ID reference. Linking them updates loan outstanding & schedule live.`,
        count: unlinkedEmiTxs.length,
        affectedIds: unlinkedEmiTxs.map(t => t.id),
        autoFixAvailable: true,
        fixActionLabel: 'Link to ALL Bank Loan',
      });
    }

    // 3. Broken Category References
    const categoryIds = new Set(state.categories.map(c => c.id));
    const brokenRefTxs = state.transactions.filter(
      t => t.categoryId && !categoryIds.has(t.categoryId)
    );
    if (brokenRefTxs.length > 0) {
      issues.push({
        id: 'issue_broken_cat_ref',
        type: 'broken_reference',
        severity: 'high',
        title: 'Transactions with Broken Category Reference',
        description: `${brokenRefTxs.length} transactions reference a category ID that no longer exists in master records.`,
        count: brokenRefTxs.length,
        affectedIds: brokenRefTxs.map(t => t.id),
        autoFixAvailable: true,
        fixActionLabel: 'Reassign to Matching Category by Name',
      });
    }

    // 4. Likely duplicate entries (same date, amount, category within transactions)
    const seenMap = new Map<string, string[]>();
    state.transactions.forEach(t => {
      const key = `${t.date}_${t.amount}_${t.category}_${t.type}`;
      const arr = seenMap.get(key) || [];
      arr.push(t.id);
      seenMap.set(key, arr);
    });
    const duplicateIds: string[] = [];
    for (const ids of seenMap.values()) {
      if (ids.length > 1) {
        duplicateIds.push(...ids.slice(1));
      }
    }
    if (duplicateIds.length > 0) {
      issues.push({
        id: 'issue_duplicate_entries',
        type: 'duplicate_entry',
        severity: 'low',
        title: 'Potential Duplicate Transactions',
        description: `Found ${duplicateIds.length} transactions sharing the exact same date, amount, category and type.`,
        count: duplicateIds.length,
        affectedIds: duplicateIds,
        autoFixAvailable: true,
        fixActionLabel: 'Review & Deduplicate',
      });
    }

    // 5. Budgets pointing to archived categories
    const archivedCatNames = new Set(state.categories.filter(c => c.isArchived).map(c => c.name));
    const budgetsWithArchived = state.budgets.filter(b => b.categories.some(c => archivedCatNames.has(c)));
    if (budgetsWithArchived.length > 0) {
      issues.push({
        id: 'issue_archived_budget_cat',
        type: 'archived_budget_cat',
        severity: 'low',
        title: 'Budgets with Archived Categories',
        description: `${budgetsWithArchived.length} budgets include categories that are currently archived.`,
        count: budgetsWithArchived.length,
        affectedIds: budgetsWithArchived.map(b => b.name),
        autoFixAvailable: true,
        fixActionLabel: 'Remove Archived from Budgets',
      });
    }

    // 6. Goals with no contributions
    const emptyGoals = state.goals.filter(g => (g.openingSaved || g.saved || 0) === 0);
    if (emptyGoals.length > 0) {
      issues.push({
        id: 'issue_empty_goals',
        type: 'empty_goal',
        severity: 'low',
        title: 'Goals with Zero Contributions',
        description: `${emptyGoals.length} goals have zero saved amount recorded.`,
        count: emptyGoals.length,
        affectedIds: emptyGoals.map(g => g.id),
        autoFixAvailable: false,
        fixActionLabel: 'Add Initial Savings',
      });
    }

    return issues;
  },

  fixDataHealthIssue: async (issueId, fixType) => {
    const state = get();
    let fixedCount = 0;

    if (issueId === 'issue_missing_account') {
      const updatedTx = state.transactions.map(t => {
        if (!t.accountId) {
          fixedCount++;
          let accId = 'acc_bank_1';
          if (t.mode === 'Cash') accId = 'acc_cash_1';
          else if (t.mode === 'UPI') accId = 'acc_wallet_1';
          return { ...t, accountId: accId };
        }
        return t;
      });
      set({ transactions: updatedTx });
      localStorage.setItem('mk_local_tx', JSON.stringify(updatedTx));
      state.showToast(`Mapped ${fixedCount} entries to accounts by mode`);
    } else if (issueId === 'issue_unlinked_emi') {
      const updatedTx = state.transactions.map(t => {
        if ((t.category === 'EMI' || t.categoryId?.includes('emi')) && !t.loanId) {
          fixedCount++;
          return { ...t, loanId: 'seed_loan_1' };
        }
        return t;
      });
      set({ transactions: updatedTx });
      localStorage.setItem('mk_local_tx', JSON.stringify(updatedTx));
      state.showToast(`Linked ${fixedCount} EMI entries to ALL Bank loan`);
    } else if (issueId === 'issue_broken_cat_ref') {
      const catNameToId: Record<string, string> = {};
      state.categories.forEach(c => {
        catNameToId[c.name.toLowerCase()] = c.id;
      });
      const updatedTx = state.transactions.map(t => {
        const matchingId = catNameToId[t.category.toLowerCase()];
        if (matchingId && t.categoryId !== matchingId) {
          fixedCount++;
          return { ...t, categoryId: matchingId };
        }
        return t;
      });
      set({ transactions: updatedTx });
      localStorage.setItem('mk_local_tx', JSON.stringify(updatedTx));
      state.showToast(`Repaired ${fixedCount} category references`);
    } else if (issueId === 'issue_archived_budget_cat') {
      const archivedCatNames = new Set(state.categories.filter(c => c.isArchived).map(c => c.name));
      const updatedBudgets = state.budgets.map(b => {
        const cleanCats = b.categories.filter(c => !archivedCatNames.has(c));
        if (cleanCats.length !== b.categories.length) {
          fixedCount++;
          return { ...b, categories: cleanCats };
        }
        return b;
      });
      set({ budgets: updatedBudgets });
      state.showToast(`Cleaned archived categories from ${fixedCount} budgets`);
    }

    return fixedCount;
  },

  // Live Selectors (Rule 1: Store facts, derive everything else)
  getDerivedLoans: () => {
    const state = get();
    return state.loans.map(loan => deriveLoanMetrics(loan, state.transactions));
  },

  getDerivedInvestments: () => {
    const state = get();
    return state.investments.map(inv => deriveInvestmentMetrics(inv, state.transactions));
  },

  getDerivedGoals: () => {
    const state = get();
    return state.goals.map(g => deriveGoalMetrics(g, state.transactions));
  },

  getDerivedAccounts: () => {
    const state = get();
    return state.accounts.map(acc => ({
      ...acc,
      balance: accountBalance(acc, state.transactions),
    }));
  },

  getDerivedCards: () => {
    const state = get();
    return state.cards.map(card => ({
      ...card,
      currentOutstanding: cardOutstanding(card, state.transactions),
    }));
  },

  getNetWorth: () => {
    const state = get();
    return netWorthBreakdown({
      goals: state.getDerivedGoals(),
      investments: state.getDerivedInvestments(),
      loans: state.getDerivedLoans(),
      cards: state.cards,
      assets: state.assets,
      transactions: state.transactions,
    }).netWorth;
  },
}));
