export type TransactionType = 'income' | 'expense' | 'invest' | 'transfer' | 'cardPayment';

export type PaymentMode = 'Cash' | 'UPI' | 'Bank' | 'Credit Card' | 'Imported';

export interface SplitItem {
  amount: number;
  categoryId: string;
  memberId?: string;
  note?: string;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  category: string;
  categoryId?: string;
  amount: number;
  mode: PaymentMode | string;
  accountId?: string;
  toAccountId?: string;
  payee?: string;
  note?: string;
  memberId?: string;
  tags?: string[];
  loanId?: string;
  investmentId?: string;
  goalId?: string;
  cardId?: string;
  policyId?: string;
  assetId?: string;
  recurringId?: string;
  recurringRuleId?: string;
  receiptId?: string;
  splits?: SplitItem[];
  imported?: boolean;
  importBatchId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income' | 'invest';
  groupId: string;
  icon?: string;
  color?: string;
  defaultMemberId?: string;
  isArchived?: boolean;
  order?: number;
}

export interface CategoryGroup {
  id: string;
  name: string;
  categories?: string[];
  icon?: string;
  color?: string;
  order?: number;
}

export interface FamilyMember {
  id: string;
  name: string;
  relation?: string;
  color?: string;
}

export interface Account {
  id: string;
  name: string;
  kind: 'bank' | 'cash' | 'wallet';
  openingBalance: number;
  openingDate?: string;
  isArchived?: boolean;
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';

export interface RecurringItem {
  id: string;
  title: string;
  amount: number;
  isEstimate?: boolean;
  type: TransactionType;
  category: string;
  categoryId?: string;
  accountId?: string;
  mode?: PaymentMode | string;
  frequency: RecurringFrequency;
  day?: number;
  startDate?: string;
  nextDate: string; // YYYY-MM-DD
  endDate?: string | null;
  lastProcessedDate?: string | null;
  linkedLoanId?: string;
  linkedInvestmentId?: string;
  autoCreate: boolean;
  isSubscription?: boolean;
  cancelReminder?: string | null;
  lastChargedDate?: string | null;
  active: boolean;
  note?: string;
  createdAt?: string;
}

export type RecurringTransaction = RecurringItem;

export interface Loan {
  id: string;
  name: string;
  lender?: string;
  direction: 'borrowed' | 'lent';
  category: string;
  categoryId?: string;
  principal: number;
  openingOutstanding?: number;
  openingPaidEmis?: number;
  openingPaidAmount?: number;
  outstanding: number;
  emi: number;
  totalEmis: number;
  paidEmis: number;
  paidAmount: number;
  firstEmiDate: string | null; // YYYY-MM-DD
  emiDay: number | null;
  interestRate: number | null;
  note?: string;
}

export type InvestmentFrequency = 'monthly' | 'quarterly' | 'yearly' | 'one-time';

export type InvestmentType =
  | 'SIP / Mutual Fund'
  | 'FD'
  | 'RD'
  | 'LIC'
  | 'PPF'
  | 'EPF'
  | 'NPS'
  | 'Stocks'
  | 'Gold / SGB'
  | 'Other';

export interface InvestmentValueHistory {
  date: string;
  value: number;
  note?: string;
}

export interface Investment {
  id: string;
  name: string;
  type: string; // From the 21 investment types
  currentValue: number;
  currentValueDate?: string;
  valueHistory?: InvestmentValueHistory[];
  openingInvestedAmount?: number;
  invested?: number;
  installment: number;
  frequency: InvestmentFrequency;
  nextDueDate: string; // YYYY-MM-DD
  maturityDate?: string;
  expectedReturnRate?: number;
  autoPay: boolean;
  linkedGoalId?: string;
  note?: string;
  purchasePrice?: number;
  quantity?: number;
  purchaseDate?: string; // YYYY-MM-DD
  costBasis?: number;
  
  // Specific fields for UPDATE 4
  assetClass?: 'Equity' | 'Debt' | 'Gold & Silver' | 'Real estate' | 'Cash-like';
  ownerMemberId?: string;
  // Gold / Silver / Digital gold
  weightGrams?: number;
  purity?: '24K' | '22K' | '18K' | '999' | '925';
  buyRatePerGram?: number;
  makingCharges?: number;
  // Shares
  exchange?: 'NSE' | 'BSE';
  symbol?: string;
  avgBuyPrice?: number;
  // Mutual funds
  fundName?: string;
  schemeCode?: string; // AMFI scheme code (searchable)
  folioLast4?: string;
  units?: number;
  navAtPurchase?: number;
  monthlyAmount?: number;
  sipDate?: number;
  stepUpPercent?: number;
  // FD / RD
  bank?: string;
  principalOrMonthly?: number;
  interestRate?: number;
  compounding?: 'Quarterly' | 'Monthly' | 'Yearly';
  startDate?: string;
  maturityAmount?: number;
  interestEarned?: number;
  // Government / Post Office / Pension (PPF, EPF, NPS, SSY, etc.)
  accountLast4?: string;
  yearlyContribution?: number;
  rate?: number;
  // Real Estate / Land
  location?: string;
  area?: string; // sq ft, cents, acres
  stampDutyRegistration?: number;
  currentEstimatedValue?: number;
  estimatedValueDate?: string;
  rentalIncome?: number;
  // LIC / ULIP
  policyNumberLast4?: string;
  premium?: number;
  sumAssured?: number;
  maturityValue?: number;
  // Other / Bonds / Crypto
  unitsOrAmount?: number;
  rateOrPrice?: number;
  attachments?: string[];
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  openingSaved?: number;
  saved: number;
  targetDate: string; // YYYY-MM-DD
  isEmergencyFund?: boolean;
  priority?: 'high' | 'medium' | 'low';
  category?: string;
  linkedInvestmentId?: string;
  linkedRecurringId?: string;
}

export type InsuranceType =
  | 'Life / Term'
  | 'Health'
  | 'Vehicle'
  | 'Home'
  | 'Personal accident'
  | 'Other';

export interface Insurance {
  id: string;
  name: string;
  type?: InsuranceType;
  insurer?: string;
  policyNumberLast4?: string;
  insuredMember?: string;
  cover: number;
  yearlyPremium: number;
  premiumAmount?: number;
  premiumFrequency?: 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
  renewalDate: string | null;
  nextDueDate?: string;
  maturityDate?: string;
  nominee?: string;
  note?: string;
}

export interface CreditCard {
  id: string;
  name: string;
  limit?: number;
  statementDay?: number;
  dueDay?: number;
  lastStatementAmount?: number;
  minimumDue?: number;
  openingOutstanding: number;
  asOf: string; // ISO date-time string
  bankName?: string;
  color?: string;
}

export type AssetType = 'gold' | 'property' | 'land' | 'vehicle' | 'cash' | 'other';

export interface AssetValueHistory {
  date: string;
  value: number;
}

export interface Asset {
  id: string;
  name: string;
  type?: AssetType;
  value: number;
  goldGrams?: number;
  goldRatePerGram?: number;
  vehicleDepreciationPct?: number;
  purchasePrice?: number;
  purchaseDate?: string;
  valueHistory?: AssetValueHistory[];
  note?: string;
}

export interface NetWorthSnapshot {
  id: string;
  date: string;
  assets: number;
  liabilities: number;
  netWorth: number;
  breakdown?: Record<string, number>;
}

export interface TaxQualifyingEntry {
  id: string;
  name: string;
  amount: number;
  source: 'investment' | 'insurance' | 'manual' | 'loan';
  date?: string;
  section: string;
}

export interface TaxSectionConfig {
  code: string; // '80C', '80D', '80CCD(1B)'
  name: string;
  limit: number;
  description: string;
}

export interface Budget {
  id?: string;
  name: string;
  categories: string[];
  categoryIds?: string[];
  groupId?: string;
  limit: number;
  fixed: boolean;
  rollover?: boolean;
  alertAtPercent?: number;
}

export interface UserSettings {
  expenseCategories: string[];
  incomeCategories: string[];
  paymentModes: string[];
  budgets: Budget[];
  groups?: CategoryGroup[];
  members?: FamilyMember[];
  categoryDefaultMember?: Record<string, string>;
  categoryColors?: Record<string, string>;
  categoryIcons?: Record<string, string>;
  hideAmountsDefault?: boolean;
  pinLockEnabled?: boolean;
  pinCode?: string;
  autoLockMinutes?: number;
  financialYearStartMonth?: number; // 4 for April
  firstDayOfWeek?: number; // 0 for Sunday, 1 for Monday
  defaultAccountId?: string;
  memberBudgets?: Record<string, number>;
}

export interface AppHistory {
  monthlyTotals: Record<string, { income: number; outflow: number }>;
  jan_to_mar_2026?: {
    income: number;
    spending: number;
    invested: number;
    outflow: number;
    spendingByCategory: Record<string, number>;
    investedByCategory?: Record<string, number>;
    topCategories?: Record<string, number>;
  };
  jan_to_sep_2026?: {
    income: number;
    spending: number;
    invested: number;
    outflow: number;
    spendingByCategory: Record<string, number>;
    investedByCategory?: Record<string, number>;
    topCategories?: Record<string, number>;
  };
  avg3MonthsByCategory: Record<string, number>;
  avg3MonthsInvested: number;
}

export interface FinancialHealthCheck {
  id: string;
  title: string;
  currentLabel: string;
  targetLabel: string;
  passed: boolean;
  maxPoints: number;
  earnedPoints: number;
}

export interface FinancialHealthResult {
  score: number; // 0 - 100
  checks: FinancialHealthCheck[];
}

export interface EMIScheduleItem {
  installmentNumber: number;
  dueDate: string; // YYYY-MM-DD
  amount: number;
  status: 'paid' | 'overdue' | 'upcoming';
}

export type PeriodType = 'month' | 'quarter' | 'year' | 'fy' | 'custom';

export type ScreenType =
  // OVERVIEW
  | 'home'
  | 'calendar'
  | 'finwiseAi'
  | 'assistant'
  // MONEY IN & OUT
  | 'entries'
  | 'recurring'
  | 'budget'
  | 'categories'
  | 'hierarchy'
  | 'family'
  // ACCOUNTS & DEBT
  | 'accounts'
  | 'cards'
  | 'loans'
  | 'emiManager'
  // WEALTH
  | 'wealth'
  | 'investments'
  | 'assets'
  | 'insurance'
  | 'futureTarget'
  | 'netWorth'
  | 'taxPlanner'
  // REPORTS
  | 'reports'
  | 'analytics'
  | 'monthlySummary'
  | 'yearlyReport'
  | 'reportBuilder'
  // SYSTEM
  | 'auditor'
  | 'dataMigration'
  | 'dataHealth'
  | 'activityLog'
  | 'settings';

export interface BackupSnapshot {
  id: string;
  timestamp: string;
  label: string;
  itemCounts: {
    transactions: number;
    loans: number;
    investments: number;
    goals: number;
    categories: number;
    accounts: number;
  };
  dataJson: string;
}

export interface DataHealthIssue {
  id: string;
  type:
    | 'broken_reference'
    | 'missing_account'
    | 'unlinked_emi'
    | 'duplicate_entry'
    | 'archived_budget_cat'
    | 'idle_recurring'
    | 'empty_goal';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  count: number;
  affectedIds: string[];
  autoFixAvailable: boolean;
  fixActionLabel: string;
}

// -------------------------------------------------------------
// WORKSPACES & SHARING (UPDATE 1)
// -------------------------------------------------------------
export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer' | 'entries_only';

export interface WorkspaceMember {
  email: string;
  role: WorkspaceRole;
  name?: string;
  addedAt: string;
  status: 'active' | 'pending';
}

export interface Workspace {
  id: string;
  name: string; // e.g. "My Personal", "Family", "Business"
  ownerId: string;
  ownerEmail: string;
  members: Record<string, WorkspaceMember>; // key: sanitized email or uid
  memberEmails: string[];
  sharingEnabled: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------
// 3-LEVEL CATEGORIES (UPDATE 3)
// -------------------------------------------------------------
export interface SubCategory {
  id: string;
  name: string;
  categoryId: string; // parent Category ID
  groupId?: string;    // top-level Main Category ID
  icon?: string;
  color?: string;
  order?: number;
  isArchived?: boolean;
}

// -------------------------------------------------------------
// FINWISE AUDITOR TYPES (UPDATE 2)
// -------------------------------------------------------------
export interface AuditorCheckItem {
  id: number;
  title: string;
  description: string;
  status: 'pass' | 'fail' | 'warn';
  lastRun: string;
  val1Label: string;
  val1: number | string;
  val2Label: string;
  val2: number | string;
  diff: number;
  diffDisplay: string;
  affectedEntries?: {
    id: string;
    title: string;
    amount: number;
    date: string;
    note?: string;
  }[];
  fixActionLabel?: string;
  fixType?: string;
}

export interface AuditRunResult {
  id: string;
  timestamp: string;
  timeDisplay: string;
  passed: boolean;
  checkCount: number;
  passCount: number;
  failCount: number;
  checks: AuditorCheckItem[];
  trigger: 'save' | 'refresh' | 'open' | 'daily' | 'manual';
}

// -------------------------------------------------------------
// FUTURE TARGET 21 HEALTH RULES & PROFILE (UPDATE 7)
// -------------------------------------------------------------
export type HealthPillar = 'protect' | 'save_spend' | 'borrow_wisely' | 'grow' | 'retire_tax';

export interface HealthRule {
  id: number;
  pillar: HealthPillar;
  pillarName: string;
  name: string;
  description: string;
  weight: number;
  targetValue: number;
  currentValue: number;
  unit: string;
  pointsEarned: number;
  status: 'met' | 'partial' | 'not_met';
  progressPct: number;
  howToFix: string;
  enabled: boolean;
}

export interface FinancialProfile {
  age: number;
  dependents: number;
  retirementAge: number;
  riskProfile: 'Conservative' | 'Moderate' | 'Aggressive';
  city: string;
  categoryTags: Record<string, 'Need' | 'Want' | 'Saving'>;
}

export interface QuickTargetTemplate {
  id: string;
  name: string;
  icon: string;
  color: string;
  defaultAmountFormula: string;
  defaultAmount: number;
  defaultDurationMonths: number;
  suggestedInvestmentType: string;
  isDefault?: boolean;
}

// -------------------------------------------------------------
// LIVE MARKET & FINWISE AI (UPDATE 8)
// -------------------------------------------------------------
export interface MarketRateItem {
  name: string;
  category: 'gold' | 'silver' | 'index' | 'currency' | 'share' | 'fund';
  value: number;
  unit: string;
  change: number;
  changePercent: number;
  asOf: string;
  sourceUrl: string;
  status: 'live' | 'delayed' | 'cached';
  openClosed?: 'Open' | 'Closed';
}

export interface MarketConditionSummary {
  mood: 'Positive' | 'Neutral' | 'Negative';
  headline: string;
  summaryPoints: string[];
  newsHeadlines: {
    title: string;
    source: string;
    url: string;
    timeAgo: string;
  }[];
  asOf: string;
}

