import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useAuth } from './AuthContext';
import {
  Transaction,
  TransactionType,
  Loan,
  Investment,
  Goal,
  Insurance,
  CreditCard,
  Asset,
  UserSettings,
  AppHistory,
  Budget,
  CategoryGroup,
  FamilyMember,
  RecurringItem,
  Account,
  Workspace,
  WorkspaceRole,
  WorkspaceMember,
  BackupSnapshot,
  SubCategory,
  AuditRunResult,
  FinancialProfile,
  QuickTargetTemplate,
} from '../types';
import { SEED_DATA, buildSeedRecurringItems, buildSeedAccounts } from '../utils/seedData';
import {
  buildSeedTransactions,
  getTxPath,
  getLoansPath,
  getInvestmentsPath,
  getGoalsPath,
  getInsurancePath,
  getCardsPath,
  getAssetsPath,
  getSettingsDocPath,
  getHistoryDocPath,
  subscribeToUserCollection,
  subscribeToUserDoc,
  saveTransaction,
  deleteTransactionDoc,
  saveLoan,
  deleteLoanDoc,
  saveInvestment,
  deleteInvestmentDoc,
  saveGoal,
  deleteGoalDoc,
  saveCard,
  deleteCardDoc,
  saveInsurance,
  deleteInsuranceDoc,
  saveAsset,
  deleteAssetDoc,
  saveSettings,
  saveHistory,
  importSeedDataToFirestore,
  subscribeToWorkspaces,
  createWorkspace as createWorkspaceApi,
  renameWorkspace as renameWorkspaceApi,
  archiveWorkspace as archiveWorkspaceApi,
  toggleWorkspaceSharing as toggleWorkspaceSharingApi,
  inviteWorkspaceMember as inviteWorkspaceMemberApi,
  removeWorkspaceMember as removeWorkspaceMemberApi,
  saveWorkspaceBackupSnapshot,
  fetchWorkspaceBackups,
} from '../firebase/service';
import { computePayEMI, addMonthsToDate, DEFAULT_APP_TODAY } from '../utils/calculations';
import { runFinWiseAuditor } from '../lib/auditor';
import { DEFAULT_FINANCIAL_PROFILE } from '../lib/healthRules';
import { waitForPendingWrites } from 'firebase/firestore';
import { db } from '../firebase/config';

import { PeriodFilter, accountBalance } from '../lib/finance';
import type { ScreenType } from '../types';

export type { ScreenType };

interface FinanceContextType {
  // Navigation & UI state
  activeScreen: ScreenType;
  setActiveScreen: (screen: ScreenType) => void;
  activeMonthKey: string; // YYYY-MM
  setActiveMonthKey: (key: string) => void;
  period: PeriodFilter;
  setPeriod: (period: PeriodFilter) => void;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  todayDateStr: string;
  darkMode: boolean;
  toggleDarkMode: () => void;
  hideAmounts: boolean;
  toggleHideAmounts: () => void;
  syncStatus: 'synced' | 'offline' | 'syncing';
  quickAddOpen: boolean;
  setQuickAddOpen: (open: boolean) => void;
  quickAddInitialData: { type?: TransactionType; category?: string; amount?: number; mode?: string } | null;
  openQuickAdd: (params?: { type?: TransactionType; category?: string; amount?: number; mode?: string }) => void;
  testModalOpen: boolean;
  setTestModalOpen: (open: boolean) => void;
  globalSearchOpen: boolean;
  setGlobalSearchOpen: (open: boolean) => void;
  moreMenuOpen: boolean;
  setMoreMenuOpen: (open: boolean) => void;

  // Data
  transactions: Transaction[];
  loans: Loan[];
  investments: Investment[];
  goals: Goal[];
  insurance: Insurance[];
  cards: CreditCard[];
  assets: Asset[];
  settings: UserSettings;
  history: AppHistory;
  groups: CategoryGroup[];
  setGroups: React.Dispatch<React.SetStateAction<CategoryGroup[]>>;
  members: FamilyMember[];
  setMembers: React.Dispatch<React.SetStateAction<FamilyMember[]>>;
  isLoading: boolean;

  // Toast
  toast: { message: string; onUndo?: () => void } | null;
  showToast: (message: string, onUndo?: () => void) => void;
  clearToast: () => void;

  // Actions
  addOrUpdateTransaction: (tx: Omit<Transaction, 'id'> & { id?: string }) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  duplicateTransaction: (tx: Transaction) => Promise<void>;
  
  addOrUpdateLoan: (loan: Omit<Loan, 'id'> & { id?: string }) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;
  payLoanEMI: (loanId: string, alsoAddExpense?: boolean) => Promise<void>;
  recordLentLoanPayment: (loanId: string, amount: number) => Promise<void>;

  addOrUpdateInvestment: (inv: Omit<Investment, 'id'> & { id?: string }) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  payInvestmentInstallment: (invId: string) => Promise<void>;
  updateInvestmentValue: (invId: string, newValue: number) => Promise<void>;

  addOrUpdateGoal: (goal: Omit<Goal, 'id'> & { id?: string }) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addMoneyToGoal: (goalId: string, amount: number) => Promise<void>;

  addOrUpdateCard: (card: Omit<CreditCard, 'id'> & { id?: string }) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  payCardBill: (cardId: string, amount: number, accountId?: string, mode?: string) => Promise<void>;

  addOrUpdateInsurance: (ins: Omit<Insurance, 'id'> & { id?: string }) => Promise<void>;
  deleteInsurance: (id: string) => Promise<void>;

  addOrUpdateAsset: (asset: Omit<Asset, 'id'> & { id?: string }) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;

  addOrUpdateBudget: (budget: Budget) => Promise<void>;
  deleteBudget: (budgetName: string) => Promise<void>;

  // Recurring & AutoPay
  recurringItems: RecurringItem[];
  addOrUpdateRecurringItem: (item: Omit<RecurringItem, 'id'> & { id?: string }) => Promise<void>;
  deleteRecurringItem: (id: string) => Promise<void>;
  toggleRecurringAutoCreate: (id: string) => Promise<void>;
  markRecurringPaid: (id: string, paymentDate?: string) => Promise<void>;

  // Accounts, Cash & Transfers
  accounts: Account[];
  addOrUpdateAccount: (acc: Omit<Account, 'id'> & { id?: string }) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  reconcileAccount: (accountId: string, realBalance: number) => Promise<void>;
  recordTransfer: (fromAccountId: string, toAccountId: string, amount: number, date?: string, note?: string) => Promise<void>;
  bulkMapModeToAccount: (mapping: Record<string, string>) => Promise<number>;
  splitCombinedLentLoan: (loan1: { name: string; amount: number }, loan2: { name: string; amount: number }) => Promise<void>;

  // Family Support & Batch tools
  applyBatchMemberAssignment: () => Promise<number>;
  updateMemberBudget: (memberName: string, budgetLimit: number) => Promise<void>;

  renameCategory: (oldName: string, newName: string, type: 'expense' | 'income') => Promise<void>;
  addCategory: (name: string, type: 'expense' | 'income', groupId?: string) => Promise<void>;
  deleteCategory: (name: string, type: 'expense' | 'income') => Promise<void>;
  mergeCategories: (fromCategory: string, toCategory: string) => Promise<void>;

  importOldData: (mode: 'replace' | 'skip') => Promise<void>;
  exportCSV: () => void;
  exportJSON: () => string;
  restoreFromJSON: (jsonStr: string) => Promise<void>;

  // Workspaces & Sharing (UPDATE 1)
  workspaces: Workspace[];
  activeWorkspaceId: string;
  activeWorkspace: Workspace | null;
  switchWorkspace: (id: string) => void;
  createWorkspace: (name: string) => Promise<Workspace>;
  renameWorkspace: (id: string, name: string) => Promise<void>;
  archiveWorkspace: (id: string, archived: boolean) => Promise<void>;
  toggleSharing: (id: string, enabled: boolean) => Promise<void>;
  inviteMember: (id: string, email: string, role: WorkspaceRole) => Promise<void>;
  removeMember: (id: string, email: string) => Promise<void>;
  backups: BackupSnapshot[];
  createBackupNow: () => Promise<void>;
  restoreBackup: (snapshot: BackupSnapshot) => Promise<void>;
  migrationBeforeAfter: {
    before: { income: number; spending: number; invested: number; outflow2026: number; count: number };
    after: { income: number; spending: number; invested: number; outflow2026: number; count: number };
  } | null;

  // 3-Level Categories (UPDATE 3)
  subcategories: SubCategory[];
  addSubCategory: (name: string, categoryId: string, groupId?: string) => Promise<void>;
  renameSubCategory: (id: string, newName: string) => Promise<void>;
  deleteSubCategory: (id: string) => Promise<void>;
  addMainCategory: (name: string, icon?: string, color?: string) => Promise<void>;
  renameMainCategory: (id: string, newName: string) => Promise<void>;
  moveCategoryToGroup: (categoryIdOrName: string, targetGroupId: string) => Promise<void>;

  // FinWise Auditor & Refresh (UPDATE 2)
  auditResult: AuditRunResult | null;
  runAuditorNow: (trigger?: 'save' | 'refresh' | 'open' | 'daily' | 'manual') => AuditRunResult;
  fixAuditorIssue: (checkId: number) => Promise<void>;
  lastRefreshedTime: string;
  refreshPageData: () => Promise<void>;

  // Future Target Profile & Templates (UPDATE 7)
  financialProfile: FinancialProfile;
  updateFinancialProfile: (profile: Partial<FinancialProfile>) => void;
  targetTemplates: QuickTargetTemplate[];
  addTargetTemplate: (tpl: QuickTargetTemplate) => void;
  updateTargetTemplate: (id: string, tpl: Partial<QuickTargetTemplate>) => void;
  deleteTargetTemplate: (id: string) => void;
  restoreDefaultTargetTemplates: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

// Initial fallback state from seed data
const getInitialSettings = (): UserSettings => ({
  expenseCategories: [...SEED_DATA.expenseCategories],
  incomeCategories: [...SEED_DATA.incomeCategories],
  paymentModes: [...SEED_DATA.paymentModes],
  budgets: [...SEED_DATA.budgets],
});

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeScreen, setActiveScreen] = useState<ScreenType>('home');
  const [activeMonthKey, setActiveMonthKey] = useState<string>('2026-10');
  const [period, setPeriodState] = useState<PeriodFilter>({
    type: 'month',
    monthKey: '2026-10',
    year: 2026,
    fyYear: 2026,
  });
  const [todayDateStr] = useState<string>(DEFAULT_APP_TODAY);
  const [quickAddOpen, setQuickAddOpen] = useState<boolean>(false);
  const [quickAddInitialData, setQuickAddInitialData] = useState<{
    type?: TransactionType;
    category?: string;
    amount?: number;
    mode?: string;
  } | null>(null);

  const openQuickAdd = (params?: {
    type?: TransactionType;
    category?: string;
    amount?: number;
    mode?: string;
  }) => {
    if (params) {
      setQuickAddInitialData(params);
    } else {
      setQuickAddInitialData(null);
    }
    setQuickAddOpen(true);
  };
  const [testModalOpen, setTestModalOpen] = useState<boolean>(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState<boolean>(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'offline' | 'syncing'>('synced');

  // Hide amounts privacy mode
  const [hideAmounts, setHideAmounts] = useState<boolean>(() => {
    return localStorage.getItem('mk_hide_amounts') === 'true';
  });

  const toggleHideAmounts = () => {
    setHideAmounts(prev => {
      localStorage.setItem('mk_hide_amounts', String(!prev));
      return !prev;
    });
  };

  // Toast with 8-second undo
  const [toast, setToast] = useState<{ message: string; onUndo?: () => void } | null>(null);
  const toastTimerRef = React.useRef<any>(null);

  const showToast = (message: string, onUndo?: () => void) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, onUndo });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 8000); // 8 seconds per Section 3
  };

  const clearToast = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  };

  const setPeriod = (newP: PeriodFilter) => {
    setPeriodState(newP);
    if (newP.type === 'month' && newP.monthKey) {
      setActiveMonthKey(newP.monthKey);
    }
  };

  // Groups and Members state
  const [groups, setGroups] = useState<CategoryGroup[]>(() => {
    const saved = localStorage.getItem('mk_local_groups');
    if (saved) return JSON.parse(saved);
    return Object.keys(SEED_DATA.groups_suggested_editable).map((name, i) => ({
      id: `group_${i + 1}`,
      name,
      order: i,
      icon: ['Family', 'ShoppingBag', 'HeartPulse', 'Home', 'CreditCard', 'Coffee', 'Car', 'Gift', 'HelpCircle'][i % 9],
      color: ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#6366f1', '#f43f5e', '#71717a'][i % 9],
    }));
  });

  const [members, setMembers] = useState<FamilyMember[]>(() => {
    const saved = localStorage.getItem('mk_local_members');
    if (saved) return JSON.parse(saved);
    return SEED_DATA.members.map((name, i) => ({
      id: `member_${i + 1}`,
      name,
      relation: name === 'Self' ? 'Self' : name === 'MOM' ? 'Mother' : 'Sister',
      color: ['#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][i % 4],
    }));
  });

  // Pure light theme per user requirement (FIX 1 of 5)
  // The app has exactly one theme: light. Remove any 'dark' class and clear stored theme keys.
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
    localStorage.removeItem('mk_theme_preference');
    localStorage.removeItem('mk_dark_mode');
  }, []);
  const darkMode = false;
  const toggleDarkMode = () => {};

  // Workspaces state (UPDATE 1)
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    const saved = localStorage.getItem('fw_workspaces');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    const defaultWs: Workspace = {
      id: 'ws_personal_default',
      name: 'My Personal',
      ownerId: user?.uid || 'user_owner',
      ownerEmail: user?.email || 'suchitm4@gmail.com',
      members: {
        owner: {
          email: user?.email || 'suchitm4@gmail.com',
          role: 'owner',
          name: 'Owner',
          addedAt: '2026-01-01T00:00:00.000Z',
          status: 'active',
        },
      },
      memberEmails: [user?.email?.toLowerCase() || 'suchitm4@gmail.com'],
      sharingEnabled: false,
      archived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-10-17T00:00:00.000Z',
    };
    return [defaultWs];
  });

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => {
    return localStorage.getItem('fw_active_workspace') || 'ws_personal_default';
  });

  const activeWorkspace = useMemo(() => {
    return workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0] || null;
  }, [workspaces, activeWorkspaceId]);

  // Backups state (UPDATE 1)
  const [backups, setBackups] = useState<BackupSnapshot[]>(() => {
    const saved = localStorage.getItem('fw_local_backups');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: 'backup_2026-10-17',
        timestamp: '2026-10-17T00:00:00.000Z',
        label: 'Daily Automated Snapshot (2026-10-17)',
        itemCounts: {
          transactions: 136,
          loans: 2,
          investments: 3,
          goals: 1,
          categories: 40,
          accounts: 4,
        },
        dataJson: '{}',
      },
    ];
  });

  // 3-Level Subcategories (UPDATE 3)
  const [subcategories, setSubcategories] = useState<SubCategory[]>(() => {
    const saved = localStorage.getItem('fw_local_subcategories');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { id: 'sub_1', name: 'Vegetables', categoryId: 'Kitchen Item', groupId: 'Kitchen & Grocery' },
      { id: 'sub_2', name: 'Cooking Oil', categoryId: 'Kitchen Item', groupId: 'Kitchen & Grocery' },
      { id: 'sub_3', name: 'Rice & Grains', categoryId: 'Kitchen Item', groupId: 'Kitchen & Grocery' },
      { id: 'sub_4', name: 'Doctor Consultation', categoryId: 'My Med', groupId: 'Health' },
      { id: 'sub_5', name: 'Prescription Medicine', categoryId: 'My Med', groupId: 'Health' },
      { id: 'sub_6', name: 'Diagnostic Tests', categoryId: 'My Med', groupId: 'Health' },
    ];
  });

  // Financial Profile & Templates (UPDATE 7)
  const [financialProfile, setFinancialProfile] = useState<FinancialProfile>(() => {
    const saved = localStorage.getItem('fw_fin_profile');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_FINANCIAL_PROFILE;
  });

  const [targetTemplates, setTargetTemplates] = useState<QuickTargetTemplate[]>(() => {
    const saved = localStorage.getItem('fw_target_templates');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { id: 'tpl_1', name: 'Emergency Fund', icon: 'Shield', color: '#059669', defaultAmountFormula: '6 × monthly expenses', defaultAmount: 286800, defaultDurationMonths: 12, suggestedInvestmentType: 'Fixed Deposit (FD)', isDefault: true },
      { id: 'tpl_2', name: 'Retirement', icon: 'Landmark', color: '#4F46E5', defaultAmountFormula: '25 × annual expenses', defaultAmount: 14340000, defaultDurationMonths: 180, suggestedInvestmentType: 'Mutual Fund – SIP', isDefault: true },
      { id: 'tpl_3', name: 'Child Education', icon: 'Award', color: '#0284C7', defaultAmountFormula: 'Target education corpus', defaultAmount: 2000000, defaultDurationMonths: 120, suggestedInvestmentType: 'Mutual Fund – SIP', isDefault: true },
      { id: 'tpl_4', name: 'Marriage', icon: 'Heart', color: '#E11D48', defaultAmountFormula: 'Wedding celebration budget', defaultAmount: 1000000, defaultDurationMonths: 36, suggestedInvestmentType: 'Recurring Deposit (RD)', isDefault: true },
      { id: 'tpl_5', name: 'Vehicle', icon: 'Zap', color: '#D97706', defaultAmountFormula: 'Down payment / purchase', defaultAmount: 800000, defaultDurationMonths: 24, suggestedInvestmentType: 'Fixed Deposit (FD)', isDefault: true },
      { id: 'tpl_6', name: 'House Down Payment', icon: 'Building2', color: '#7C3AED', defaultAmountFormula: '20% property cost', defaultAmount: 1500000, defaultDurationMonths: 48, suggestedInvestmentType: 'Mutual Fund – lumpsum', isDefault: true },
      { id: 'tpl_7', name: 'Travel', icon: 'Sparkles', color: '#10B981', defaultAmountFormula: 'Vacation fund', defaultAmount: 150000, defaultDurationMonths: 12, suggestedInvestmentType: 'Recurring Deposit (RD)', isDefault: true },
      { id: 'tpl_8', name: 'Gadget', icon: 'Coins', color: '#64748B', defaultAmountFormula: 'Tech purchase', defaultAmount: 80000, defaultDurationMonths: 6, suggestedInvestmentType: 'Cash-like', isDefault: true },
      { id: 'tpl_9', name: 'Gold Purchase', icon: 'Coins', color: '#F59E0B', defaultAmountFormula: 'Jewelry / Sovereign Gold', defaultAmount: 250000, defaultDurationMonths: 18, suggestedInvestmentType: 'Sovereign Gold Bond (SGB)', isDefault: true },
      { id: 'tpl_10', name: 'Medical Corpus', icon: 'HeartPulse', color: '#EC4899', defaultAmountFormula: 'Buffer for health needs', defaultAmount: 500000, defaultDurationMonths: 24, suggestedInvestmentType: 'Fixed Deposit (FD)', isDefault: true },
      { id: 'tpl_11', name: 'Debt-free', icon: 'CheckCircle2', color: '#16A34A', defaultAmountFormula: 'Prepay all borrowed loans', defaultAmount: 437047, defaultDurationMonths: 36, suggestedInvestmentType: 'Debt', isDefault: true },
    ];
  });

  const [lastRefreshedTime, setLastRefreshedTime] = useState<string>('Updated just now ✓');

  // Core collections state
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const seed = buildSeedTransactions();
    const saved = localStorage.getItem('mk_local_tx');
    if (!saved) return seed;
    const parsed: Transaction[] = JSON.parse(saved);
    const existingIds = new Set(parsed.map(t => t.id));
    const toAdd = seed.filter(t => !existingIds.has(t.id));
    if (toAdd.length > 0) {
      const merged = [...parsed, ...toAdd];
      localStorage.setItem('mk_local_tx', JSON.stringify(merged));
      return merged;
    }
    return parsed;
  });

  const [loans, setLoans] = useState<Loan[]>(() => {
    const saved = localStorage.getItem('mk_local_loans');
    return saved ? JSON.parse(saved) : SEED_DATA.loans.map((l, i) => ({ ...l, id: `seed_loan_${i + 1}` }));
  });

  const [investments, setInvestments] = useState<Investment[]>(() => {
    const saved = localStorage.getItem('mk_local_investments');
    return saved ? JSON.parse(saved) : SEED_DATA.investments.map((inv, i) => ({ ...inv, id: `seed_inv_${i + 1}` }));
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem('mk_local_goals');
    return saved ? JSON.parse(saved) : SEED_DATA.goals.map((g, i) => ({ ...g, id: `seed_goal_${i + 1}` }));
  });

  const [insurance, setInsurance] = useState<Insurance[]>(() => {
    const saved = localStorage.getItem('mk_local_insurance');
    return saved ? JSON.parse(saved) : SEED_DATA.insurance.map((ins, i) => ({ ...ins, id: `seed_ins_${i + 1}` }));
  });

  const [cards, setCards] = useState<CreditCard[]>(() => {
    const saved = localStorage.getItem('mk_local_cards');
    return saved ? JSON.parse(saved) : SEED_DATA.cards.map((c, i) => ({ ...c, id: `seed_card_${i + 1}` }));
  });

  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem('mk_local_assets');
    return saved ? JSON.parse(saved) : [];
  });

  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>(() => {
    const saved = localStorage.getItem('mk_local_recurring');
    return saved ? JSON.parse(saved) : buildSeedRecurringItems();
  });

  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem('mk_local_accounts');
    return saved ? JSON.parse(saved) : buildSeedAccounts();
  });

  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('mk_local_settings');
    return saved ? JSON.parse(saved) : getInitialSettings();
  });

  const [history, setHistory] = useState<AppHistory>(() => {
    const saved = localStorage.getItem('mk_local_history');
    const parsed: AppHistory = saved ? JSON.parse(saved) : { ...SEED_DATA.history };
    if (parsed.monthlyTotals && parsed.monthlyTotals['2026-09']) {
      delete parsed.monthlyTotals['2026-09'];
    }
    parsed.jan_to_mar_2026 = SEED_DATA.history.jan_to_mar_2026;
    localStorage.setItem('mk_local_history', JSON.stringify(parsed));
    return parsed;
  });

  // Local storage persistence helper
  const syncToLocalStorage = (
    newTx = transactions,
    newLoans = loans,
    newInv = investments,
    newGoals = goals,
    newCards = cards,
    newIns = insurance,
    newAssets = assets,
    newSettings = settings,
    newHistory = history,
    newRec = recurringItems,
    newAcc = accounts
  ) => {
    try {
      localStorage.setItem('mk_local_tx', JSON.stringify(newTx));
      localStorage.setItem('mk_local_loans', JSON.stringify(newLoans));
      localStorage.setItem('mk_local_investments', JSON.stringify(newInv));
      localStorage.setItem('mk_local_goals', JSON.stringify(newGoals));
      localStorage.setItem('mk_local_cards', JSON.stringify(newCards));
      localStorage.setItem('mk_local_insurance', JSON.stringify(newIns));
      localStorage.setItem('mk_local_assets', JSON.stringify(newAssets));
      localStorage.setItem('mk_local_recurring', JSON.stringify(newRec));
      localStorage.setItem('mk_local_accounts', JSON.stringify(newAcc));
      localStorage.setItem('mk_local_settings', JSON.stringify(newSettings));
      localStorage.setItem('mk_local_history', JSON.stringify(newHistory));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  };

  // Month navigation
  const goToPrevMonth = () => {
    const [y, m] = activeMonthKey.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 2, 1));
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    setActiveMonthKey(`${date.getUTCFullYear()}-${mm}`);
  };

  const goToNextMonth = () => {
    const [y, m] = activeMonthKey.split('-').map(Number);
    const date = new Date(Date.UTC(y, m, 1));
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    setActiveMonthKey(`${date.getUTCFullYear()}-${mm}`);
  };

  // Real-time Firestore sync when user is authenticated
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const uid = user.uid;

    const unsubTx = subscribeToUserCollection<Transaction>(getTxPath(uid), items => {
      if (items.length > 0) {
        setTransactions(items);
        syncToLocalStorage(items);
      }
    });

    const unsubLoans = subscribeToUserCollection<Loan>(getLoansPath(uid), items => {
      if (items.length > 0) {
        setLoans(items);
        syncToLocalStorage(undefined, items);
      }
    });

    const unsubInvestments = subscribeToUserCollection<Investment>(getInvestmentsPath(uid), items => {
      if (items.length > 0) {
        setInvestments(items);
        syncToLocalStorage(undefined, undefined, items);
      }
    });

    const unsubGoals = subscribeToUserCollection<Goal>(getGoalsPath(uid), items => {
      if (items.length > 0) {
        setGoals(items);
        syncToLocalStorage(undefined, undefined, undefined, items);
      }
    });

    const unsubCards = subscribeToUserCollection<CreditCard>(getCardsPath(uid), items => {
      if (items.length > 0) {
        setCards(items);
        syncToLocalStorage(undefined, undefined, undefined, undefined, items);
      }
    });

    const unsubInsurance = subscribeToUserCollection<Insurance>(getInsurancePath(uid), items => {
      if (items.length > 0) {
        setInsurance(items);
        syncToLocalStorage(undefined, undefined, undefined, undefined, undefined, items);
      }
    });

    const unsubAssets = subscribeToUserCollection<Asset>(getAssetsPath(uid), items => {
      setAssets(items);
      syncToLocalStorage(undefined, undefined, undefined, undefined, undefined, undefined, items);
    });

    const unsubSettings = subscribeToUserDoc<UserSettings>(getSettingsDocPath(uid), data => {
      if (data) {
        setSettings(data);
        syncToLocalStorage(undefined, undefined, undefined, undefined, undefined, undefined, undefined, data);
      }
    });

    const unsubHistory = subscribeToUserDoc<AppHistory>(getHistoryDocPath(uid), data => {
      if (data) {
        setHistory(data);
        syncToLocalStorage(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, data);
      }
    });

    setIsLoading(false);

    return () => {
      unsubTx?.();
      unsubLoans?.();
      unsubInvestments?.();
      unsubGoals?.();
      unsubCards?.();
      unsubInsurance?.();
      unsubAssets?.();
      unsubSettings?.();
      unsubHistory?.();
    };
  }, [user]);

  // Operations
  const addOrUpdateTransaction = async (tx: Omit<Transaction, 'id'> & { id?: string }) => {
    const id = tx.id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullTx: Transaction = {
      ...tx,
      id,
      createdAt: tx.createdAt || new Date().toISOString(),
    };

    setTransactions(prev => {
      const idx = prev.findIndex(item => item.id === id);
      const updated = idx >= 0 ? prev.map(item => (item.id === id ? fullTx : item)) : [fullTx, ...prev];
      syncToLocalStorage(updated);
      return updated;
    });

    if (user) {
      await saveTransaction(user.uid, fullTx);
    }
  };

  const deleteTransaction = async (id: string) => {
    setTransactions(prev => {
      const updated = prev.filter(t => t.id !== id);
      syncToLocalStorage(updated);
      return updated;
    });

    if (user) {
      await deleteTransactionDoc(user.uid, id);
    }
  };

  const duplicateTransaction = async (tx: Transaction) => {
    const newTx: Omit<Transaction, 'id'> = {
      date: tx.date,
      type: tx.type,
      category: tx.category,
      amount: tx.amount,
      mode: tx.mode,
      note: tx.note ? `${tx.note} (Copy)` : 'Copy',
      imported: false,
      loanId: tx.loanId,
      investmentId: tx.investmentId,
    };
    await addOrUpdateTransaction(newTx);
  };

  const addOrUpdateLoan = async (loan: Omit<Loan, 'id'> & { id?: string }) => {
    const id = loan.id || `loan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullLoan: Loan = { ...loan, id };

    setLoans(prev => {
      const idx = prev.findIndex(l => l.id === id);
      const updated = idx >= 0 ? prev.map(l => (l.id === id ? fullLoan : l)) : [...prev, fullLoan];
      syncToLocalStorage(undefined, updated);
      return updated;
    });

    if (user) {
      await saveLoan(user.uid, fullLoan);
    }
  };

  const deleteLoan = async (id: string) => {
    setLoans(prev => {
      const updated = prev.filter(l => l.id !== id);
      syncToLocalStorage(undefined, updated);
      return updated;
    });
    if (user) {
      await deleteLoanDoc(user.uid, id);
    }
  };

  const payLoanEMI = async (loanId: string, alsoAddExpense: boolean = true) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    const { updatedLoan } = computePayEMI(loan);
    await addOrUpdateLoan(updatedLoan);

    if (alsoAddExpense) {
      await addOrUpdateTransaction({
        date: todayDateStr,
        type: 'expense',
        category: 'EMI',
        amount: loan.emi,
        mode: 'Bank',
        note: `EMI payment for ${loan.name}`,
        loanId: loan.id,
        imported: false,
      });
    }
  };

  const recordLentLoanPayment = async (loanId: string, amount: number) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    const newOutstanding = Math.max(0, loan.outstanding - amount);
    const updatedLoan: Loan = {
      ...loan,
      outstanding: newOutstanding,
      paidAmount: (loan.paidAmount || 0) + amount,
    };
    await addOrUpdateLoan(updatedLoan);
  };

  const addOrUpdateInvestment = async (inv: Omit<Investment, 'id'> & { id?: string }) => {
    const id = inv.id || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullInv: Investment = { ...inv, id };

    setInvestments(prev => {
      const idx = prev.findIndex(item => item.id === id);
      const updated = idx >= 0 ? prev.map(item => (item.id === id ? fullInv : item)) : [...prev, fullInv];
      syncToLocalStorage(undefined, undefined, updated);
      return updated;
    });

    if (user) {
      await saveInvestment(user.uid, fullInv);
    }
  };

  const deleteInvestment = async (id: string) => {
    setInvestments(prev => {
      const updated = prev.filter(item => item.id !== id);
      syncToLocalStorage(undefined, undefined, updated);
      return updated;
    });
    if (user) {
      await deleteInvestmentDoc(user.uid, id);
    }
  };

  const payInvestmentInstallment = async (invId: string) => {
    const inv = investments.find(i => i.id === invId);
    if (!inv) return;

    // "Paid installment" creates an invest entry, increases currentValue by the installment and moves nextDueDate forward.
    const monthsStep = inv.frequency === 'quarterly' ? 3 : inv.frequency === 'yearly' ? 12 : 1;
    const newDueDate = addMonthsToDate(inv.nextDueDate, monthsStep);
    const updatedInv: Investment = {
      ...inv,
      currentValue: inv.currentValue + inv.installment,
      nextDueDate: newDueDate,
    };

    await addOrUpdateInvestment(updatedInv);
    await addOrUpdateTransaction({
      date: todayDateStr,
      type: 'invest',
      category: inv.name,
      amount: inv.installment,
      mode: 'Bank',
      note: `Installment for ${inv.name}`,
      investmentId: inv.id,
      imported: false,
    });
  };

  const updateInvestmentValue = async (invId: string, newValue: number) => {
    const inv = investments.find(i => i.id === invId);
    if (!inv) return;
    await addOrUpdateInvestment({ ...inv, currentValue: newValue });
  };

  const addOrUpdateGoal = async (goal: Omit<Goal, 'id'> & { id?: string }) => {
    const id = goal.id || `goal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullGoal: Goal = { ...goal, id };

    setGoals(prev => {
      const idx = prev.findIndex(g => g.id === id);
      const updated = idx >= 0 ? prev.map(g => (g.id === id ? fullGoal : g)) : [...prev, fullGoal];
      syncToLocalStorage(undefined, undefined, undefined, updated);
      return updated;
    });

    if (user) {
      await saveGoal(user.uid, fullGoal);
    }
  };

  const deleteGoal = async (id: string) => {
    setGoals(prev => {
      const updated = prev.filter(g => g.id !== id);
      syncToLocalStorage(undefined, undefined, undefined, updated);
      return updated;
    });
    if (user) {
      await deleteGoalDoc(user.uid, id);
    }
  };

  const addMoneyToGoal = async (goalId: string, amount: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const updatedGoal: Goal = {
      ...goal,
      saved: (goal.saved || 0) + amount,
    };
    await addOrUpdateGoal(updatedGoal);
  };

  const addOrUpdateCard = async (card: Omit<CreditCard, 'id'> & { id?: string }) => {
    const id = card.id || `card_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullCard: CreditCard = { ...card, id };

    setCards(prev => {
      const idx = prev.findIndex(c => c.id === id);
      const updated = idx >= 0 ? prev.map(c => (c.id === id ? fullCard : c)) : [...prev, fullCard];
      syncToLocalStorage(undefined, undefined, undefined, undefined, updated);
      return updated;
    });

    if (user) {
      await saveCard(user.uid, fullCard);
    }
  };

  const deleteCard = async (id: string) => {
    setCards(prev => {
      const updated = prev.filter(c => c.id !== id);
      syncToLocalStorage(undefined, undefined, undefined, undefined, updated);
      return updated;
    });
    if (user) {
      await deleteCardDoc(user.uid, id);
    }
  };

  const payCardBill = async (cardId: string, amount: number, accountId?: string, mode: string = 'Bank') => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    // creates a cardPayment entry (neither income nor spending)
    await addOrUpdateTransaction({
      date: todayDateStr,
      type: 'cardPayment',
      category: 'Credit Card Bill',
      amount,
      mode,
      accountId: accountId || undefined,
      cardId: card.id,
      note: `Payment for ${card.name}`,
      imported: false,
    });
    showToast(`Paid ₹${amount.toLocaleString('en-IN')} towards ${card.name}`);
  };

  const addOrUpdateInsurance = async (ins: Omit<Insurance, 'id'> & { id?: string }) => {
    const id = ins.id || `ins_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullIns: Insurance = { ...ins, id };

    setInsurance(prev => {
      const idx = prev.findIndex(i => i.id === id);
      const updated = idx >= 0 ? prev.map(i => (i.id === id ? fullIns : i)) : [...prev, fullIns];
      syncToLocalStorage(undefined, undefined, undefined, undefined, undefined, updated);
      return updated;
    });

    if (user) {
      await saveInsurance(user.uid, fullIns);
    }
  };

  const deleteInsurance = async (id: string) => {
    setInsurance(prev => {
      const updated = prev.filter(i => i.id !== id);
      syncToLocalStorage(undefined, undefined, undefined, undefined, undefined, updated);
      return updated;
    });
    if (user) {
      await deleteInsuranceDoc(user.uid, id);
    }
  };

  const addOrUpdateAsset = async (asset: Omit<Asset, 'id'> & { id?: string }) => {
    const id = asset.id || `asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullAsset: Asset = { ...asset, id };

    setAssets(prev => {
      const idx = prev.findIndex(a => a.id === id);
      const updated = idx >= 0 ? prev.map(a => (a.id === id ? fullAsset : a)) : [...prev, fullAsset];
      syncToLocalStorage(undefined, undefined, undefined, undefined, undefined, undefined, updated);
      return updated;
    });

    if (user) {
      await saveAsset(user.uid, fullAsset);
    }
  };

  const deleteAsset = async (id: string) => {
    setAssets(prev => {
      const updated = prev.filter(a => a.id !== id);
      syncToLocalStorage(undefined, undefined, undefined, undefined, undefined, undefined, updated);
      return updated;
    });
    if (user) {
      await deleteAssetDoc(user.uid, id);
    }
  };

  const addOrUpdateBudget = async (budget: Budget) => {
    const existing = settings.budgets || [];
    const idx = existing.findIndex(b => b.name === budget.name);
    const updatedBudgets = idx >= 0 ? existing.map(b => (b.name === budget.name ? budget : b)) : [...existing, budget];

    const updatedSettings: UserSettings = {
      ...settings,
      budgets: updatedBudgets,
    };
    setSettings(updatedSettings);
    syncToLocalStorage(undefined, undefined, undefined, undefined, undefined, undefined, undefined, updatedSettings);

    if (user) {
      await saveSettings(user.uid, updatedSettings);
    }
  };

  const deleteBudget = async (budgetName: string) => {
    const updatedBudgets = (settings.budgets || []).filter(b => b.name !== budgetName);
    const updatedSettings: UserSettings = {
      ...settings,
      budgets: updatedBudgets,
    };
    setSettings(updatedSettings);
    syncToLocalStorage(undefined, undefined, undefined, undefined, undefined, undefined, undefined, updatedSettings);

    if (user) {
      await saveSettings(user.uid, updatedSettings);
    }
  };

  // Recurring & AutoPay Methods
  const addOrUpdateRecurringItem = async (item: Omit<RecurringItem, 'id'> & { id?: string }) => {
    const id = item.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullItem: RecurringItem = { ...item, id };
    const updated = recurringItems.some(r => r.id === id)
      ? recurringItems.map(r => (r.id === id ? fullItem : r))
      : [...recurringItems, fullItem];
    setRecurringItems(updated);
    syncToLocalStorage(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, updated);
    showToast(`Saved recurring item: ${fullItem.title}`);
  };

  const deleteRecurringItem = async (id: string) => {
    const deleted = recurringItems.find(r => r.id === id);
    const updated = recurringItems.filter(r => r.id !== id);
    setRecurringItems(updated);
    syncToLocalStorage(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, updated);
    showToast(`Deleted recurring item: ${deleted?.title || ''}`, () => {
      if (deleted) {
        setRecurringItems(prev => [...prev, deleted]);
        syncToLocalStorage(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, [...updated, deleted]);
      }
    });
  };

  const toggleRecurringAutoCreate = async (id: string) => {
    const updatedList = recurringItems.map(r => (r.id === id ? { ...r, autoCreate: !r.autoCreate } : r));
    setRecurringItems(updatedList);
    syncToLocalStorage(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, updatedList);
    const item = updatedList.find(r => r.id === id);
    showToast(`Auto-create ${item?.autoCreate ? 'enabled' : 'disabled'} for ${item?.title}`);
  };

  const markRecurringPaid = async (id: string, paymentDate?: string) => {
    const item = recurringItems.find(r => r.id === id);
    if (!item) return;

    const payDate = paymentDate || item.nextDate || todayDateStr;
    const defaultMember = settings.categoryDefaultMember?.[item.category] || SEED_DATA.categoryDefaultMember[item.category];

    // Create entry
    const newTx: Omit<Transaction, 'id'> = {
      date: payDate,
      type: item.type,
      category: item.category,
      amount: item.amount,
      mode: item.mode || 'Bank',
      payee: item.title,
      memberId: defaultMember || undefined,
      note: item.note || `Auto/Scheduled: ${item.title}`,
      recurringId: item.id,
      loanId: item.linkedLoanId,
      investmentId: item.linkedInvestmentId,
    };
    await addOrUpdateTransaction(newTx);

    // Calculate next due date
    const [y, m, d] = payDate.split('-').map(Number);
    let nextDateStr = item.nextDate;
    if (item.frequency === 'monthly') {
      const nextMonthDate = new Date(Date.UTC(y, m, d || item.day || 1));
      const nm = String(nextMonthDate.getUTCMonth() + 1).padStart(2, '0');
      const nd = String(nextMonthDate.getUTCDate()).padStart(2, '0');
      nextDateStr = `${nextMonthDate.getUTCFullYear()}-${nm}-${nd}`;
    } else if (item.frequency === 'yearly') {
      nextDateStr = `${y + 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    } else if (item.frequency === 'quarterly') {
      const nextQDate = new Date(Date.UTC(y, m + 2, d || item.day || 1));
      const nm = String(nextQDate.getUTCMonth() + 1).padStart(2, '0');
      const nd = String(nextQDate.getUTCDate()).padStart(2, '0');
      nextDateStr = `${nextQDate.getUTCFullYear()}-${nm}-${nd}`;
    } else if (item.frequency === 'weekly') {
      const nextWDate = new Date(Date.UTC(y, m - 1, d + 7));
      const nm = String(nextWDate.getUTCMonth() + 1).padStart(2, '0');
      const nd = String(nextWDate.getUTCDate()).padStart(2, '0');
      nextDateStr = `${nextWDate.getUTCFullYear()}-${nm}-${nd}`;
    }

    const updatedItem: RecurringItem = {
      ...item,
      nextDate: nextDateStr,
      lastChargedDate: payDate,
    };

    const updatedList = recurringItems.map(r => (r.id === id ? updatedItem : r));
    setRecurringItems(updatedList);
    syncToLocalStorage(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, updatedList);

    showToast(`Paid ${item.title} (₹${item.amount.toLocaleString('en-IN')}) · Entry created`);
  };

  // Family Support & Batch tools
  const applyBatchMemberAssignment = async (): Promise<number> => {
    const mapping = settings.categoryDefaultMember || SEED_DATA.categoryDefaultMember;
    let count = 0;
    const updated = transactions.map(t => {
      const targetMember = mapping[t.category];
      if (targetMember && t.memberId !== targetMember) {
        count++;
        return { ...t, memberId: targetMember };
      }
      return t;
    });

    if (count > 0) {
      setTransactions(updated);
      syncToLocalStorage(updated);
      if (user) {
        for (const t of updated) {
          if (mapping[t.category] && t.memberId === mapping[t.category]) {
            await saveTransaction(user.uid, t);
          }
        }
      }
      showToast(`Assigned members to ${count} entries based on defaults`);
    } else {
      showToast('All entries already match their default members');
    }
    return count;
  };

  const updateMemberBudget = async (memberName: string, budgetLimit: number) => {
    const updatedSettings: UserSettings = {
      ...settings,
      memberBudgets: {
        ...(settings.memberBudgets || {}),
        [memberName]: budgetLimit,
      },
    };
    setSettings(updatedSettings);
    syncToLocalStorage(undefined, undefined, undefined, undefined, undefined, undefined, undefined, updatedSettings);
    if (user) {
      await saveSettings(user.uid, updatedSettings);
    }
    showToast(`Updated monthly budget for ${memberName} to ₹${budgetLimit.toLocaleString('en-IN')}`);
  };

  // Accounts & Transfers
  const addOrUpdateAccount = async (acc: Omit<Account, 'id'> & { id?: string }) => {
    const id = acc.id || `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullAcc: Account = { ...acc, id };
    const updated = accounts.some(a => a.id === id)
      ? accounts.map(a => (a.id === id ? fullAcc : a))
      : [...accounts, fullAcc];
    setAccounts(updated);
    syncToLocalStorage(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, updated);
    showToast(`Saved account: ${fullAcc.name}`);
  };

  const deleteAccount = async (id: string) => {
    const deleted = accounts.find(a => a.id === id);
    const updated = accounts.filter(a => a.id !== id);
    setAccounts(updated);
    syncToLocalStorage(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, updated);
    showToast(`Deleted account: ${deleted?.name || ''}`, () => {
      if (deleted) {
        setAccounts(prev => [...prev, deleted]);
        syncToLocalStorage(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, [...updated, deleted]);
      }
    });
  };

  const reconcileAccount = async (accountId: string, realBalance: number) => {
    const acc = accounts.find(a => a.id === accountId);
    if (!acc) return;
    const currentCalculated = accountBalance(acc, transactions);
    const diff = realBalance - currentCalculated;
    if (Math.abs(diff) < 1) {
      showToast(`${acc.name} is already reconciled and accurate!`);
      return;
    }

    const isPositive = diff > 0;
    const adjTx: Omit<Transaction, 'id'> = {
      date: todayDateStr,
      type: isPositive ? 'income' : 'expense',
      category: 'Other',
      amount: Math.abs(diff),
      accountId: acc.id,
      mode: acc.kind === 'bank' ? 'Bank' : acc.kind === 'cash' ? 'Cash' : 'UPI',
      note: `Reconciliation adjustment (${isPositive ? '+' : '-'}${Math.abs(diff)}) to match balance ₹${realBalance.toLocaleString('en-IN')}`,
    };
    await addOrUpdateTransaction(adjTx);
    showToast(`Reconciled ${acc.name}. Adjustment of ₹${Math.abs(diff).toLocaleString('en-IN')} recorded.`);
  };

  const recordTransfer = async (
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    date?: string,
    note?: string
  ) => {
    const fromAcc = accounts.find(a => a.id === fromAccountId);
    const toAcc = accounts.find(a => a.id === toAccountId);
    const txDate = date || todayDateStr;

    const tx: Omit<Transaction, 'id'> = {
      date: txDate,
      type: 'transfer',
      category: 'Transfer',
      amount,
      accountId: fromAccountId,
      toAccountId,
      mode: fromAcc?.kind === 'bank' ? 'Bank' : fromAcc?.kind === 'cash' ? 'Cash' : 'UPI',
      note: note || `Transfer: ${fromAcc?.name || 'Account'} → ${toAcc?.name || 'Account'}`,
    };
    await addOrUpdateTransaction(tx);
    showToast(`Transferred ₹${amount.toLocaleString('en-IN')} from ${fromAcc?.name || 'Account'} to ${toAcc?.name || 'Account'}`);
  };

  const bulkMapModeToAccount = async (mapping: Record<string, string>): Promise<number> => {
    let count = 0;
    const updated = transactions.map(t => {
      const targetAccId = mapping[t.mode];
      if (targetAccId && t.accountId !== targetAccId) {
        count++;
        return { ...t, accountId: targetAccId };
      }
      return t;
    });

    if (count > 0) {
      setTransactions(updated);
      syncToLocalStorage(updated);
      if (user) {
        for (const t of updated) {
          if (mapping[t.mode] && t.accountId === mapping[t.mode]) {
            await saveTransaction(user.uid, t);
          }
        }
      }
      showToast(`Mapped ${count} entries to their designated accounts`);
    } else {
      showToast('All entries are already mapped to their accounts');
    }
    return count;
  };

  const splitCombinedLentLoan = async (
    loan1: { name: string; amount: number },
    loan2: { name: string; amount: number }
  ) => {
    const combined = loans.find(
      l => l.direction === 'lent' && l.name.toLowerCase().includes('combined')
    ) || loans.find(l => l.direction === 'lent');

    if (!combined) {
      showToast('Combined lent loan not found');
      return;
    }

    const newLoan1: Loan = {
      id: `loan_lent_1_${Date.now()}`,
      name: loan1.name,
      direction: 'lent',
      category: 'Money Lent',
      principal: loan1.amount,
      outstanding: loan1.amount,
      emi: 0,
      totalEmis: 0,
      paidEmis: 0,
      paidAmount: 0,
      firstEmiDate: null,
      emiDay: null,
      interestRate: null,
      note: `Split from "${combined.name}"`,
    };

    const newLoan2: Loan = {
      id: `loan_lent_2_${Date.now() + 1}`,
      name: loan2.name,
      direction: 'lent',
      category: 'Money Lent',
      principal: loan2.amount,
      outstanding: loan2.amount,
      emi: 0,
      totalEmis: 0,
      paidEmis: 0,
      paidAmount: 0,
      firstEmiDate: null,
      emiDay: null,
      interestRate: null,
      note: `Split from "${combined.name}"`,
    };

    const updatedLoans = loans.filter(l => l.id !== combined.id).concat([newLoan1, newLoan2]);
    setLoans(updatedLoans);
    syncToLocalStorage(undefined, updatedLoans);
    if (user) {
      await deleteLoanDoc(user.uid, combined.id);
      await saveLoan(user.uid, newLoan1);
      await saveLoan(user.uid, newLoan2);
    }
    showToast(`Successfully split "${combined.name}" into "${loan1.name}" and "${loan2.name}"`);
  };

  const renameCategory = async (oldName: string, newName: string, type: 'expense' | 'income') => {
    if (!newName.trim() || oldName === newName) return;

    let updatedExp = [...settings.expenseCategories];
    let updatedInc = [...settings.incomeCategories];

    if (type === 'expense') {
      updatedExp = updatedExp.map(c => (c === oldName ? newName : c));
    } else {
      updatedInc = updatedInc.map(c => (c === oldName ? newName : c));
    }

    // Also update budgets containing this category
    const updatedBudgets = (settings.budgets || []).map(b => {
      if (b.categories.includes(oldName)) {
        return {
          ...b,
          categories: b.categories.map(c => (c === oldName ? newName : c)),
        };
      }
      return b;
    });

    const updatedSettings: UserSettings = {
      ...settings,
      expenseCategories: updatedExp,
      incomeCategories: updatedInc,
      budgets: updatedBudgets,
    };

    setSettings(updatedSettings);

    // Update transactions with old category name
    const updatedTx = transactions.map(t => {
      if (t.category === oldName && ((type === 'expense' && t.type === 'expense') || (type === 'income' && t.type === 'income'))) {
        return { ...t, category: newName };
      }
      return t;
    });

    setTransactions(updatedTx);
    syncToLocalStorage(updatedTx, undefined, undefined, undefined, undefined, undefined, undefined, updatedSettings);

    if (user) {
      await saveSettings(user.uid, updatedSettings);
      for (const t of updatedTx) {
        if (t.category === newName) {
          await saveTransaction(user.uid, t);
        }
      }
    }
  };

  const addCategory = async (name: string, type: 'expense' | 'income', groupId?: string) => {
    const clean = name.trim();
    if (!clean) return;

    const updatedSettings: UserSettings = {
      ...settings,
      expenseCategories:
        type === 'expense'
          ? settings.expenseCategories.includes(clean)
            ? settings.expenseCategories
            : [...settings.expenseCategories, clean]
          : settings.expenseCategories,
      incomeCategories:
        type === 'income'
          ? settings.incomeCategories.includes(clean)
            ? settings.incomeCategories
            : [...settings.incomeCategories, clean]
          : settings.incomeCategories,
    };

    setSettings(updatedSettings);
    syncToLocalStorage(undefined, undefined, undefined, undefined, undefined, undefined, undefined, updatedSettings);

    if (user) {
      await saveSettings(user.uid, updatedSettings);
    }
    showToast(`Added category "${clean}"`);
  };

  const deleteCategory = async (name: string, type: 'expense' | 'income') => {
    const updatedSettings: UserSettings = {
      ...settings,
      expenseCategories:
        type === 'expense' ? settings.expenseCategories.filter(c => c !== name) : settings.expenseCategories,
      incomeCategories:
        type === 'income' ? settings.incomeCategories.filter(c => c !== name) : settings.incomeCategories,
    };

    setSettings(updatedSettings);
    syncToLocalStorage(undefined, undefined, undefined, undefined, undefined, undefined, undefined, updatedSettings);

    if (user) {
      await saveSettings(user.uid, updatedSettings);
    }
    showToast(`Deleted category "${name}"`);
  };

  const mergeCategories = async (fromCategory: string, toCategory: string) => {
    if (fromCategory === toCategory) return;

    // 1. Update all transactions
    const updatedTx = transactions.map(t => {
      if (t.category === fromCategory) {
        return { ...t, category: toCategory };
      }
      return t;
    });
    setTransactions(updatedTx);

    // 2. Update budgets
    const updatedBudgets = settings.budgets.map(b => {
      if (b.categories.includes(fromCategory)) {
        const newCats = b.categories.map(c => c === fromCategory ? toCategory : c);
        return { ...b, categories: Array.from(new Set(newCats)) };
      }
      return b;
    });

    // 3. Update expense categories list
    const updatedExpenseCats = settings.expenseCategories.filter(c => c !== fromCategory);
    if (!updatedExpenseCats.includes(toCategory)) {
      updatedExpenseCats.push(toCategory);
    }

    const updatedSettings: UserSettings = {
      ...settings,
      expenseCategories: updatedExpenseCats,
      budgets: updatedBudgets,
    };
    setSettings(updatedSettings);

    syncToLocalStorage(updatedTx, undefined, undefined, undefined, undefined, undefined, undefined, updatedSettings);

    if (user) {
      await saveSettings(user.uid, updatedSettings);
      for (const t of updatedTx) {
        if (t.category === toCategory) {
          await saveTransaction(user.uid, t);
        }
      }
    }

    showToast(`Merged "${fromCategory}" into "${toCategory}"`);
  };

  const importOldData = async (mode: 'replace' | 'skip') => {
    if (mode === 'skip' && transactions.length > 0) {
      return;
    }

    const freshTx = buildSeedTransactions();
    const freshLoans = SEED_DATA.loans.map((l, i) => ({ ...l, id: `seed_loan_${i + 1}` }));
    const freshInv = SEED_DATA.investments.map((inv, i) => ({ ...inv, id: `seed_inv_${i + 1}` }));
    const freshGoals = SEED_DATA.goals.map((g, i) => ({ ...g, id: `seed_goal_${i + 1}` }));
    const freshIns = SEED_DATA.insurance.map((ins, i) => ({ ...ins, id: `seed_ins_${i + 1}` }));
    const freshCards = SEED_DATA.cards.map((c, i) => ({ ...c, id: `seed_card_${i + 1}` }));
    const freshAssets: Asset[] = [];
    const freshSettings: UserSettings = {
      expenseCategories: [...SEED_DATA.expenseCategories],
      incomeCategories: [...SEED_DATA.incomeCategories],
      paymentModes: [...SEED_DATA.paymentModes],
      budgets: [...SEED_DATA.budgets],
    };
    const freshHistory: AppHistory = SEED_DATA.history;

    setTransactions(freshTx);
    setLoans(freshLoans);
    setInvestments(freshInv);
    setGoals(freshGoals);
    setInsurance(freshIns);
    setCards(freshCards);
    setAssets(freshAssets);
    setSettings(freshSettings);
    setHistory(freshHistory);

    syncToLocalStorage(
      freshTx,
      freshLoans,
      freshInv,
      freshGoals,
      freshCards,
      freshIns,
      freshAssets,
      freshSettings,
      freshHistory
    );

    if (user) {
      await importSeedDataToFirestore(user.uid);
    }
  };

  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Category', 'Amount', 'Payment Mode', 'Note', 'Imported', 'ID'];
    const rows = transactions.map(t => [
      t.date,
      t.type,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      t.amount,
      `"${(t.mode || '').replace(/"/g, '""')}"`,
      `"${(t.note || '').replace(/"/g, '""')}"`,
      t.imported ? 'Yes' : 'No',
      t.id,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mera_khata_transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = (): string => {
    const backup = {
      exportDate: new Date().toISOString(),
      transactions,
      loans,
      investments,
      goals,
      insurance,
      cards,
      assets,
      settings,
      history,
    };
    return JSON.stringify(backup, null, 2);
  };

  const restoreFromJSON = async (jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.transactions) setTransactions(data.transactions);
      if (data.loans) setLoans(data.loans);
      if (data.investments) setInvestments(data.investments);
      if (data.goals) setGoals(data.goals);
      if (data.insurance) setInsurance(data.insurance);
      if (data.cards) setCards(data.cards);
      if (data.assets) setAssets(data.assets);
      if (data.settings) setSettings(data.settings);
      if (data.history) setHistory(data.history);

      syncToLocalStorage(
        data.transactions,
        data.loans,
        data.investments,
        data.goals,
        data.cards,
        data.insurance,
        data.assets,
        data.settings,
        data.history
      );

      if (user) {
        // save items to Firestore
        if (data.settings) await saveSettings(user.uid, data.settings);
        if (data.history) await saveHistory(user.uid, data.history);
        for (const t of data.transactions || []) await saveTransaction(user.uid, t);
        for (const l of data.loans || []) await saveLoan(user.uid, l);
        for (const inv of data.investments || []) await saveInvestment(user.uid, inv);
        for (const g of data.goals || []) await saveGoal(user.uid, g);
        for (const c of data.cards || []) await saveCard(user.uid, c);
        for (const ins of data.insurance || []) await saveInsurance(user.uid, ins);
        for (const a of data.assets || []) await saveAsset(user.uid, a);
      }
    } catch (e) {
      console.error('Failed to restore from JSON', e);
      throw e;
    }
  };

  return (
    <FinanceContext.Provider
      value={{
        activeScreen,
        setActiveScreen,
        activeMonthKey,
        setActiveMonthKey,
        period,
        setPeriod,
        goToPrevMonth,
        goToNextMonth,
        todayDateStr,
        darkMode,
        toggleDarkMode,
        hideAmounts,
        toggleHideAmounts,
        syncStatus,
        quickAddOpen,
        setQuickAddOpen,
        quickAddInitialData,
        openQuickAdd,
        testModalOpen,
        setTestModalOpen,
        globalSearchOpen,
        setGlobalSearchOpen,
        moreMenuOpen,
        setMoreMenuOpen,
        transactions,
        loans,
        investments,
        goals,
        insurance,
        cards,
        assets,
        settings,
        history,
        groups,
        setGroups,
        members,
        setMembers,
        isLoading,
        toast,
        showToast,
        clearToast,
        addOrUpdateTransaction,
        deleteTransaction,
        duplicateTransaction,
        addOrUpdateLoan,
        deleteLoan,
        payLoanEMI,
        recordLentLoanPayment,
        addOrUpdateInvestment,
        deleteInvestment,
        payInvestmentInstallment,
        updateInvestmentValue,
        addOrUpdateGoal,
        deleteGoal,
        addMoneyToGoal,
        addOrUpdateCard,
        deleteCard,
        payCardBill,
        addOrUpdateInsurance,
        deleteInsurance,
        addOrUpdateAsset,
        deleteAsset,
        addOrUpdateBudget,
        deleteBudget,
        recurringItems,
        addOrUpdateRecurringItem,
        deleteRecurringItem,
        toggleRecurringAutoCreate,
        markRecurringPaid,
        // Accounts, Cash & Transfers
        accounts,
        addOrUpdateAccount,
        deleteAccount,
        reconcileAccount,
        recordTransfer,
        bulkMapModeToAccount,
        splitCombinedLentLoan,
        applyBatchMemberAssignment,
        updateMemberBudget,
        renameCategory,
        addCategory,
        deleteCategory,
        mergeCategories,
        importOldData,
        exportCSV,
        exportJSON,
        restoreFromJSON,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
