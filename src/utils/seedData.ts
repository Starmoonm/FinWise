import { UserSettings, Transaction, Loan, Investment, Goal, Insurance, CreditCard, Asset, AppHistory } from '../types';

export interface SeedDataPayload {
  members: string[];
  groups_suggested_editable: Record<string, string[]>;
  categoryDefaultMember: Record<string, string>;
  expenseCategories: string[];
  incomeCategories: string[];
  paymentModes: string[];
  budgets: Array<{ name: string; categories: string[]; limit: number; fixed: boolean }>;
  transactions: Array<{ date: string; type: 'expense' | 'income' | 'invest' | 'cardPayment'; category: string; amount: number; mode: string }>;
  importedOctTotals: {
    date: string;
    income: Record<string, number>;
    expense: Record<string, number>;
    invest: Record<string, number>;
  };
  loans: Array<{
    name: string;
    direction: 'borrowed' | 'lent';
    category: string;
    principal: number;
    outstanding: number;
    emi: number;
    totalEmis: number;
    paidEmis: number;
    paidAmount: number;
    firstEmiDate: string | null;
    emiDay: number | null;
    interestRate: number | null;
    note?: string;
  }>;
  investments: Array<{
    name: string;
    type: string;
    currentValue: number;
    installment: number;
    frequency: 'monthly' | 'quarterly' | 'yearly' | 'one-time';
    nextDueDate: string;
    autoPay: boolean;
    note?: string;
  }>;
  goals: Array<{
    name: string;
    target: number;
    saved: number;
    targetDate: string;
    isEmergencyFund: boolean;
  }>;
  insurance: Array<{
    name: string;
    cover: number;
    yearlyPremium: number;
    renewalDate: string | null;
    note?: string;
  }>;
  cards: Array<{
    name: string;
    openingOutstanding: number;
    asOf: string;
    limit?: number;
    statementDay?: number;
    dueDay?: number;
    lastStatementAmount?: number;
    minimumDue?: number;
  }>;
  accounts: Asset[];
  assets: Asset[];
  history: AppHistory;
}

export const SEED_DATA: SeedDataPayload = {
  members: ["Self", "MOM", "Ankita", "Sis"],
  groups_suggested_editable: {
    "Family Support": ["Ankita", "MOM", "Sis"],
    "Kitchen & Grocery": ["Fruit", "GAS", "K 2", "K1", "Kitchen Item", "Milk", "Vegtable", "Water"],
    "Health": ["Health & Medicine", "M MED", "My Med", "Sis Med"],
    "Home & Bills": ["Home Expenses", "Hosekeeping", "One time expense House", "Other fixed expense", "Social media app", "WIFI Bill"],
    "Loans & EMI": ["EMI"],
    "Personal & Shopping": ["My Personal Expense", "Online Shopping", "Shopping", "Small Expense"],
    "Food Outside": ["Food & Dining", "Zomato"],
    "Travel & Transport": ["Fuel & Repair", "Tour", "Tour and Travel", "Transportation"],
    "Social & Giving": ["Donation", "Festival", "Gifts", "Guest"],
    "Other": ["Entertainment", "Farming", "Goal Savings", "Other"]
  },
  categoryDefaultMember: {
    "MOM": "MOM",
    "Ankita": "Ankita",
    "Sis": "Sis",
    "Sis Med": "Sis",
    "My Med": "Self",
    "My Personal Expense": "Self"
  },
  expenseCategories: [
    "EMI", "Ankita", "MOM", "My Med", "Sis Med", "M MED", "K1", "K 2",
    "Kitchen Item", "Milk", "Water", "GAS", "Vegtable", "Fruit",
    "My Personal Expense", "Hosekeeping", "Social media app", "Food & Dining",
    "Zomato", "Donation", "Fuel & Repair", "Transportation", "Small Expense",
    "Guest", "Gifts", "WIFI Bill", "One time expense House", "Home Expenses",
    "Other fixed expense", "Sis", "Entertainment", "Shopping", "Online Shopping",
    "Tour", "Tour and Travel", "Festival", "Farming", "Goal Savings", "Health & Medicine", "Other"
  ],
  incomeCategories: ["Business", "Freelance", "Interest", "Other income", "Refund", "Salary"],
  paymentModes: ["Bank", "Cash", "Credit Card", "UPI"],
  budgets: [
    { name: "MOM", categories: ["MOM"], limit: 10000, fixed: true },
    { name: "Kitchen Item", categories: ["Kitchen Item", "K1", "K 2", "Water", "GAS"], limit: 6500, fixed: true },
    { name: "Milk", categories: ["Milk"], limit: 1750, fixed: true },
    { name: "Hosekeeping", categories: ["Hosekeeping"], limit: 1200, fixed: true },
    { name: "Fuel & Repair", categories: ["Fuel & Repair"], limit: 1000, fixed: true },
    { name: "Other fixed expense", categories: ["Other fixed expense"], limit: 5000, fixed: true },
    { name: "EMI", categories: ["EMI"], limit: 25000, fixed: false },
    { name: "Health & Medicine", categories: ["My Med", "Sis Med", "M MED", "Health & Medicine"], limit: 5000, fixed: false },
    { name: "My Personal Expense", categories: ["My Personal Expense"], limit: 1500, fixed: false },
    { name: "Home Expenses", categories: ["Home Expenses"], limit: 20000, fixed: false },
    { name: "Transportation", categories: ["Transportation"], limit: 8000, fixed: false },
    { name: "Entertainment", categories: ["Entertainment"], limit: 5000, fixed: false },
    { name: "Zomato", categories: ["Zomato"], limit: 1000, fixed: false },
    { name: "Shopping", categories: ["Shopping"], limit: 500, fixed: false }
  ],
  transactions: [
    { date: "2026-10-14", type: "expense", category: "EMI", amount: 16500, mode: "Cash" },
    { date: "2026-10-13", type: "expense", category: "My Med", amount: 3452, mode: "Cash" },
    { date: "2026-10-12", type: "expense", category: "My Med", amount: 1460, mode: "Cash" },
    { date: "2026-10-12", type: "expense", category: "My Med", amount: 200, mode: "Cash" },
    { date: "2026-10-11", type: "expense", category: "K 2", amount: 1897, mode: "Credit Card" },
    { date: "2026-10-11", type: "expense", category: "K1", amount: 2844, mode: "Credit Card" },
    { date: "2026-10-11", type: "expense", category: "K1", amount: 39, mode: "Cash" },
    { date: "2026-10-10", type: "expense", category: "Small Expense", amount: 110, mode: "Cash" }
  ],
  importedOctTotals: {
    date: "2026-10-01",
    income: { Salary: 82000 },
    expense: {
      EMI: 6052, Ankita: 10000, MOM: 10000, "My Med": 1380, "Sis Med": 2339,
      Other: 2200, "My Personal Expense": 1730, Milk: 1650, Water: 1529,
      "Kitchen Item": 1291, Hosekeeping: 1200, "Social media app": 1077,
      GAS: 978, "M MED": 645, "Food & Dining": 600, Donation: 400,
      "Fuel & Repair": 299, "Small Expense": 110, Guest: 120, Gifts: 100
    },
    invest: { INVEST: 10000, PL: 11000 }
  },
  loans: [
    {
      name: "ALL Bank",
      direction: "borrowed",
      category: "personal",
      principal: 400000,
      outstanding: 350000,
      emi: 12000,
      totalEmis: 48,
      paidEmis: 1,
      paidAmount: 60000,
      firstEmiDate: "2026-08-13",
      emiDay: 13,
      interestRate: null,
      note: "Old app showed 0% interest, but 48 x 12,000 = 5,76,000 (1,76,000 above principal). Show implied rate."
    },
    {
      name: "Money lent (2 loans, combined)",
      direction: "lent",
      category: "personal",
      principal: 87047,
      outstanding: 87047,
      emi: 0,
      totalEmis: 0,
      paidEmis: 0,
      paidAmount: 0,
      firstEmiDate: null,
      emiDay: null,
      interestRate: null,
      note: "Old app total of 2 lent loans. Ask me to split."
    }
  ],
  investments: [
    {
      name: "INVEST",
      type: "SIP / Mutual Fund",
      currentValue: 10000,
      installment: 10000,
      frequency: "monthly",
      nextDueDate: "2026-11-06",
      autoPay: true
    },
    {
      name: "PL",
      type: "FD",
      currentValue: 11000,
      installment: 11000,
      frequency: "monthly",
      nextDueDate: "2026-11-09",
      autoPay: false
    },
    {
      name: "LIC Policy Investment",
      type: "LIC",
      currentValue: 3032,
      installment: 3032,
      frequency: "yearly",
      nextDueDate: "2026-12-28",
      autoPay: false,
      note: "Check frequency and amount"
    }
  ],
  goals: [
    {
      name: "Emergency Fund",
      target: 100000,
      saved: 50000,
      targetDate: "2027-09-29",
      isEmergencyFund: true
    }
  ],
  insurance: [
    {
      name: "All policies (old app total of 3)",
      cover: 16300000,
      yearlyPremium: 61000,
      renewalDate: null,
      note: "Old app: life cover >= 15x income and health cover >= 10 lakh were both met. Ask me to split into 3 policies."
    }
  ],
  cards: [
    {
      name: "Credit Card",
      openingOutstanding: 17212,
      asOf: "2026-10-14T23:59:59+05:30",
      limit: 50000,
      statementDay: 15,
      dueDay: 5,
    }
  ],
  accounts: [],
  assets: [],
  history: {
    monthlyTotals: {},
    jan_to_mar_2026: {
      income: 373940,
      spending: 474588,
      invested: 23200,
      outflow: 497788,
      spendingByCategory: {
        "EMI": 261616,
        "Small Expense": 68944,
        "Tour": 27650,
        "Other": 23840,
        "Kitchen Item": 18772,
        "Ankita": 18207,
        "Gifts": 16040,
        "My Personal Expense": 12779,
        "One time expense House": 3990,
        "Zomato": 3729,
        "Milk": 3190,
        "My Med": 2915,
        "Health & Medicine": 2779,
        "Fruit": 2080,
        "Fuel & Repair": 1414,
        "Vegtable": 1205,
        "Sis Med": 1172,
        "Festival": 950,
        "Home Expenses": 795,
        "Guest": 660,
        "Donation": 500,
        "MOM": 400,
        "Tour and Travel": 350,
        "Entertainment": 310,
        "Transportation": 301
      },
      investedByCategory: {
        Investment: 23200
      }
    },
    jan_to_sep_2026: {
      income: 779739,
      spending: 963490,
      invested: 90132,
      outflow: 1053622,
      spendingByCategory: {
        EMI: 448595,
        "Small Expense": 75634,
        Ankita: 68349,
        MOM: 55800,
        "Kitchen Item": 40365,
        Gifts: 33524,
        Tour: 27650,
        "My Personal Expense": 26385,
        Other: 25394,
        Milk: 12695,
        "My Med": 11868,
        "Health & Medicine": 11520,
        Transportation: 11400,
        "M MED": 11023,
        "Tour and Travel": 10350,
        Donation: 9206,
        "K 2": 8948,
        "Fuel & Repair": 8420,
        "One time expense House": 8268,
        K1: 8243,
        "WIFI Bill": 6890,
        Zomato: 6724,
        Hosekeeping: 6600,
        Guest: 6121,
        "Other fixed expense": 5027,
        Farming: 3985,
        Fruit: 3180,
        "Sis Med": 2862,
        Vegtable: 2513,
        "Goal Savings": 1300,
        Sis: 1125,
        "Home Expenses": 1012,
        Festival: 950,
        "Online Shopping": 485,
        "Food & Dining": 415,
        "Social media app": 354,
        Entertainment: 310
      },
      investedByCategory: {
        Investment: 90132
      }
    },
    avg3MonthsByCategory: {
      EMI: 32303,
      Ankita: 11775,
      MOM: 10000,
      "My Med": 3384,
      K1: 2748,
      "Sis Med": 954,
      "K 2": 2983,
      "My Personal Expense": 4132,
      Milk: 1618,
      "Kitchen Item": 813,
      Hosekeeping: 1200,
      "Social media app": 118,
      "M MED": 3674,
      Donation: 2507,
      "Fuel & Repair": 1139,
      "Small Expense": 1233,
      Guest: 1186,
      Gifts: 5117,
      "WIFI Bill": 2297,
      "One time expense House": 283,
      Zomato: 370,
      Vegtable: 319,
      Sis: 375,
      Entertainment: 103,
      Fruit: 23,
      "Tour and Travel": 3333,
      Transportation: 2160,
      "Health & Medicine": 435,
      "Goal Savings": 433,
      "Other fixed expense": 167,
      "Home Expenses": 72
    },
    avg3MonthsInvested: 12977
  }
};

export const buildSeedRecurringItems = (): import('../types').RecurringItem[] => [
  {
    id: 'rec_1',
    title: 'INVEST',
    amount: 10000,
    type: 'invest',
    category: 'INVEST',
    mode: 'Bank',
    frequency: 'monthly',
    day: 6,
    nextDate: '2026-11-06',
    linkedInvestmentId: 'seed_inv_1',
    autoCreate: false,
    active: true,
    note: 'AutoPay SIP, linked investment'
  },
  {
    id: 'rec_2',
    title: 'PL',
    amount: 11000,
    type: 'invest',
    category: 'PL',
    mode: 'Bank',
    frequency: 'monthly',
    day: 9,
    nextDate: '2026-11-09',
    linkedInvestmentId: 'seed_inv_2',
    autoCreate: false,
    active: true,
    note: 'Postal Life Insurance, linked investment'
  },
  {
    id: 'rec_3',
    title: 'ALL Bank EMI',
    amount: 12000,
    type: 'expense',
    category: 'EMI',
    mode: 'Bank',
    frequency: 'monthly',
    day: 13,
    nextDate: '2026-11-13',
    linkedLoanId: 'seed_loan_1',
    autoCreate: false,
    active: true,
    note: 'Personal/Home Loan EMI, linked loan'
  },
  {
    id: 'rec_4',
    title: 'LIC Policy Premium',
    amount: 37500,
    type: 'expense',
    category: 'Health & Medicine',
    mode: 'Bank',
    frequency: 'yearly',
    day: 28,
    nextDate: '2026-12-28',
    autoCreate: false,
    active: true,
    note: 'LIC Policy yearly premium due 28 Dec 2026'
  },
  {
    id: 'rec_5',
    title: 'MOM',
    amount: 10000,
    type: 'expense',
    category: 'MOM',
    mode: 'UPI',
    frequency: 'monthly',
    day: 1,
    nextDate: '2026-11-01',
    autoCreate: false,
    active: true,
    note: 'Monthly family allowance'
  },
  {
    id: 'rec_6',
    title: 'Hosekeeping',
    amount: 1200,
    type: 'expense',
    category: 'Hosekeeping',
    mode: 'Cash',
    frequency: 'monthly',
    day: 5,
    nextDate: '2026-11-05',
    autoCreate: false,
    active: true,
    note: 'Monthly housekeeping maintenance'
  },
  {
    id: 'rec_7',
    title: 'Milk',
    amount: 1650,
    isEstimate: true,
    type: 'expense',
    category: 'Milk',
    mode: 'Cash',
    frequency: 'monthly',
    day: 1,
    nextDate: '2026-11-01',
    autoCreate: false,
    active: true,
    note: 'Monthly milk supply (estimate ≈ ₹1,650)'
  },
  {
    id: 'rec_8',
    title: 'WIFI Bill',
    amount: 2297,
    type: 'expense',
    category: 'WIFI Bill',
    mode: 'UPI',
    frequency: 'monthly',
    day: 15,
    nextDate: '2026-10-15',
    autoCreate: false,
    isSubscription: true,
    cancelReminder: 'Review renewal plan 3 days prior',
    lastChargedDate: '2026-09-15',
    active: true,
    note: 'High speed fiber broadband'
  },
  {
    id: 'rec_9',
    title: 'Social media app',
    amount: 354,
    type: 'expense',
    category: 'Social media app',
    mode: 'Credit Card',
    frequency: 'monthly',
    day: 22,
    nextDate: '2026-10-22',
    autoCreate: false,
    isSubscription: true,
    cancelReminder: 'Cancel if unused before 20th',
    lastChargedDate: '2026-09-22',
    active: true,
    note: 'App monthly subscription'
  }
];

export const buildSeedAccounts = (): import('../types').Account[] => [
  {
    id: 'acc_bank_1',
    name: 'Primary Bank Account',
    kind: 'bank',
    openingBalance: 32000,
    openingDate: '2026-01-01',
    isArchived: false,
  },
  {
    id: 'acc_cash_1',
    name: 'Cash in Hand',
    kind: 'cash',
    openingBalance: 6500,
    openingDate: '2026-01-01',
    isArchived: false,
  },
  {
    id: 'acc_wallet_1',
    name: 'UPI Wallet / Payments',
    kind: 'wallet',
    openingBalance: 2000,
    openingDate: '2026-01-01',
    isArchived: false,
  },
];
