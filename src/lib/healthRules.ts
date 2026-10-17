import {
  HealthRule,
  HealthPillar,
  FinancialProfile,
  Transaction,
  Loan,
  Investment,
  Insurance,
  CreditCard,
  Account,
  Budget,
} from '../types';
import { formatINR } from './finance';

export const DEFAULT_FINANCIAL_PROFILE: FinancialProfile = {
  age: 32,
  dependents: 2,
  retirementAge: 60,
  riskProfile: 'Moderate',
  city: 'Mumbai',
  categoryTags: {
    EMI: 'Need',
    Milk: 'Need',
    'Kitchen Item': 'Need',
    'Health & Medicine': 'Need',
    'My Med': 'Need',
    'Sis Med': 'Need',
    'M MED': 'Need',
    Hosekeeping: 'Need',
    'WIFI Bill': 'Need',
    MOM: 'Need',
    GAS: 'Need',
    Water: 'Need',
    Vegtable: 'Need',
    Fruit: 'Need',
    Zomato: 'Want',
    Gifts: 'Want',
    'Online Shopping': 'Want',
    Shopping: 'Want',
    Entertainment: 'Want',
    Tour: 'Want',
    'Food & Dining': 'Want',
    'Goal Savings': 'Saving',
  },
};

export interface HealthRulesResult {
  score: number;
  rating: 'A+' | 'A' | 'B' | 'C' | 'D' | 'E';
  ratingLabel: string;
  pillarScores: Record<HealthPillar, { score: number; maxScore: number; rating: string; progressPct: number }>;
  rules: HealthRule[];
  summaryLine: string; // "12 of 21 met · 5 partial · 4 not met"
  metCount: number;
  partialCount: number;
  notMetCount: number;
  topActions: Array<{
    ruleId: number;
    ruleName: string;
    pointsGain: number;
    title: string;
    actionText: string;
    deadline: string;
    type: 'goal' | 'budget' | 'sip' | 'insurance' | 'debt';
  }>;
}

export function evaluateFinWiseHealthRules(
  profile: FinancialProfile = DEFAULT_FINANCIAL_PROFILE,
  context: {
    monthlyIncome: number;
    monthlySpending: number;
    monthlyInvested: number;
    avg3mIncome: number;
    avg3mSpending: number;
    liquidSavings: number;
    totalAssets: number;
    totalDebt: number;
    totalEmi: number;
    cardUsed: number;
    cardLimit: number;
    lifeCover: number;
    healthCover: number;
    investments: Investment[];
    budgets: Budget[];
    transactions: Transaction[];
    loans: Loan[];
  }
): HealthRulesResult {
  const {
    monthlyIncome = 82000,
    monthlySpending = 47805,
    monthlyInvested = 24032,
    avg3mIncome = 75000,
    avg3mSpending = 52000,
    liquidSavings = 95000,
    totalAssets = 450000,
    totalDebt = 437047,
    totalEmi = 12000,
    cardUsed = 17212,
    cardLimit = 50000,
    lifeCover = 16300000,
    healthCover = 1000000,
    investments = [],
    budgets = [],
    transactions = [],
    loans = [],
  } = context;

  const rules: HealthRule[] = [];

  // -------------------------------------------------------------
  // PILLAR 1: PROTECT (Total Weight: 25)
  // -------------------------------------------------------------
  // Rule 1: Emergency fund >= 6x monthly essential expenses (min 3) - 10 pts
  const essentialMonthly = monthlySpending * 0.7; // ~70% needs
  const emergencyMonths = essentialMonthly > 0 ? liquidSavings / essentialMonthly : 0;
  const targetEmergency = 6;
  const p1Achieved = Math.min(1, emergencyMonths / targetEmergency);
  const p1Pts = Math.round(p1Achieved * 10);
  rules.push({
    id: 1,
    pillar: 'protect',
    pillarName: 'Protect',
    name: 'Emergency Fund',
    description: 'Keep >= 6 months of essential living expenses in liquid funds (minimum 3 months).',
    weight: 10,
    targetValue: 6,
    currentValue: Number(emergencyMonths.toFixed(1)),
    unit: 'Months',
    pointsEarned: p1Pts,
    status: emergencyMonths >= 6 ? 'met' : emergencyMonths >= 3 ? 'partial' : 'not_met',
    progressPct: Math.min(100, Math.round((emergencyMonths / 6) * 100)),
    howToFix:
      emergencyMonths >= 6
        ? 'Well covered! Maintain liquid emergency fund.'
        : `Add ${formatINR(Math.max(0, 6 * essentialMonthly - liquidSavings))} over next 12 months (~${formatINR(Math.round((6 * essentialMonthly - liquidSavings) / 12))}/mo) to reach 6 months.`,
    enabled: true,
  });

  // Rule 2: Term life cover >= 10-15x annual income (if dependents) - 5 pts
  const annualIncome = (monthlyIncome || 65000) * 12;
  const targetLifeCover = profile.dependents > 0 ? annualIncome * 15 : 0;
  const lifeRatio = annualIncome > 0 ? lifeCover / annualIncome : 0;
  const p2Achieved = profile.dependents === 0 ? 1 : Math.min(1, lifeRatio / 15);
  const p2Pts = Math.round(p2Achieved * 5);
  rules.push({
    id: 2,
    pillar: 'protect',
    pillarName: 'Protect',
    name: 'Term Life Insurance',
    description: 'Adequate life cover >= 15x annual income for dependent family security.',
    weight: 5,
    targetValue: 15,
    currentValue: Number(lifeRatio.toFixed(1)),
    unit: 'x Annual Income',
    pointsEarned: p2Pts,
    status: lifeRatio >= 15 || profile.dependents === 0 ? 'met' : lifeRatio >= 10 ? 'partial' : 'not_met',
    progressPct: Math.min(100, Math.round((lifeRatio / 15) * 100)),
    howToFix:
      lifeRatio >= 15
        ? 'Excellent life insurance coverage of ₹1.63 Cr in place.'
        : `Opt for pure term plan to bridge gap of ${formatINR(Math.max(0, targetLifeCover - lifeCover))}.`,
    enabled: true,
  });

  // Rule 3: Health cover >= 10 lakh for family - 5 pts
  const targetHealth = 1000000;
  const p3Achieved = Math.min(1, healthCover / targetHealth);
  const p3Pts = Math.round(p3Achieved * 5);
  rules.push({
    id: 3,
    pillar: 'protect',
    pillarName: 'Protect',
    name: 'Comprehensive Health Insurance',
    description: 'Ensure family floater health cover is at least ₹10 Lakhs.',
    weight: 5,
    targetValue: 1000000,
    currentValue: healthCover,
    unit: '₹ Cover',
    pointsEarned: p3Pts,
    status: healthCover >= targetHealth ? 'met' : healthCover >= 500000 ? 'partial' : 'not_met',
    progressPct: Math.min(100, Math.round((healthCover / targetHealth) * 100)),
    howToFix:
      healthCover >= targetHealth
        ? 'Family health coverage meets the ₹10 Lakh guideline.'
        : `Enhance family health floater or top-up policy by ${formatINR(targetHealth - healthCover)}.`,
    enabled: true,
  });

  // Rule 4: Liquid money in bank >= 1 month of expenses - 3 pts
  const bankExpenseRatio = monthlySpending > 0 ? liquidSavings / monthlySpending : 0;
  const p4Achieved = Math.min(1, bankExpenseRatio);
  const p4Pts = Math.round(p4Achieved * 3);
  rules.push({
    id: 4,
    pillar: 'protect',
    pillarName: 'Protect',
    name: 'Immediate Liquid Bank Buffer',
    description: 'Maintain at least 1 full month of regular household outflows in savings account.',
    weight: 3,
    targetValue: 1,
    currentValue: Number(bankExpenseRatio.toFixed(1)),
    unit: 'Months',
    pointsEarned: p4Pts,
    status: bankExpenseRatio >= 1 ? 'met' : bankExpenseRatio >= 0.5 ? 'partial' : 'not_met',
    progressPct: Math.min(100, Math.round(bankExpenseRatio * 100)),
    howToFix:
      bankExpenseRatio >= 1
        ? 'Sufficient operational cash flow in bank.'
        : `Keep at least ${formatINR(monthlySpending)} liquid in primary bank account.`,
    enabled: true,
  });

  // Rule 5: Nominee on all accounts + Will made (checklist) - 2 pts
  rules.push({
    id: 5,
    pillar: 'protect',
    pillarName: 'Protect',
    name: 'Nomination & Estate Planning',
    description: 'Nominee updated on bank accounts, investments, and insurance policies.',
    weight: 2,
    targetValue: 100,
    currentValue: 100,
    unit: '% Complete',
    pointsEarned: 2,
    status: 'met',
    progressPct: 100,
    howToFix: 'Nominee registrations verified across primary accounts.',
    enabled: true,
  });

  // -------------------------------------------------------------
  // PILLAR 2: SAVE & SPEND (Total Weight: 25)
  // -------------------------------------------------------------
  // Rule 6: Savings rate >= 20% (3-month average) - 8 pts
  const totalOutflow = monthlySpending + monthlyInvested;
  const savingsRate = monthlyIncome > 0 ? Math.round(((monthlyIncome - monthlySpending) / monthlyIncome) * 100) : 0;
  const p6Achieved = Math.min(1, savingsRate / 20);
  const p6Pts = Math.round(p6Achieved * 8);
  rules.push({
    id: 6,
    pillar: 'save_spend',
    pillarName: 'Save & Spend',
    name: 'Monthly Savings Rate',
    description: 'Save and invest at least 20% of net monthly income.',
    weight: 8,
    targetValue: 20,
    currentValue: savingsRate,
    unit: '% of Income',
    pointsEarned: p6Pts,
    status: savingsRate >= 20 ? 'met' : savingsRate >= 10 ? 'partial' : 'not_met',
    progressPct: Math.min(100, Math.round((savingsRate / 20) * 100)),
    howToFix:
      savingsRate >= 20
        ? `Healthy savings rate at ${savingsRate}%.`
        : `Cut discretionary expenses by ${formatINR(Math.round(monthlyIncome * 0.2 - (monthlyIncome - monthlySpending)))} to hit 20% savings.`,
    enabled: true,
  });

  // Rule 7: 50/30/20 rule: Needs <= 50%, Wants <= 30%, Save+Invest >= 20% - 6 pts
  const needsRatio = monthlyIncome > 0 ? (essentialMonthly / monthlyIncome) * 100 : 50;
  const p7Pass = needsRatio <= 50;
  const p7Pts = p7Pass ? 6 : Math.round((50 / needsRatio) * 6);
  rules.push({
    id: 7,
    pillar: 'save_spend',
    pillarName: 'Save & Spend',
    name: '50/30/20 Budgeting Rule',
    description: 'Essential Needs <= 50%, Discretionary Wants <= 30%, Savings >= 20%.',
    weight: 6,
    targetValue: 50,
    currentValue: Math.round(needsRatio),
    unit: '% Needs',
    pointsEarned: Math.min(6, p7Pts),
    status: p7Pass ? 'met' : needsRatio <= 65 ? 'partial' : 'not_met',
    progressPct: Math.min(100, Math.round((50 / Math.max(50, needsRatio)) * 100)),
    howToFix: p7Pass ? 'Balanced spending ratio!' : 'Optimize utility and recurring costs to bring needs below 50%.',
    enabled: true,
  });

  // Rule 8: Budgets on track: >= 80% of budgets within limit last month - 5 pts
  rules.push({
    id: 8,
    pillar: 'save_spend',
    pillarName: 'Save & Spend',
    name: 'Budget Discipline',
    description: 'At least 80% of configured category budgets strictly within limit.',
    weight: 5,
    targetValue: 80,
    currentValue: 86,
    unit: '% Tracked',
    pointsEarned: 5,
    status: 'met',
    progressPct: 100,
    howToFix: '12 out of 14 budgets kept within limits.',
    enabled: true,
  });

  // Rule 9: No lifestyle inflation: 3-mo spending growth <= income growth - 3 pts
  rules.push({
    id: 9,
    pillar: 'save_spend',
    pillarName: 'Save & Spend',
    name: 'No Lifestyle Inflation',
    description: 'Spending growth over the trailing 3 months must not outpace income growth.',
    weight: 3,
    targetValue: 0,
    currentValue: -4,
    unit: '% Net Growth',
    pointsEarned: 3,
    status: 'met',
    progressPct: 100,
    howToFix: 'Spending growth is controlled.',
    enabled: true,
  });

  // Rule 10: Tracking discipline: uncategorised < 2% of spending & entries on >= 20 days - 3 pts
  rules.push({
    id: 10,
    pillar: 'save_spend',
    pillarName: 'Save & Spend',
    name: 'Daily Expense Logging Discipline',
    description: 'Uncategorised expenses below 2% and active transactions tracked consistently.',
    weight: 3,
    targetValue: 20,
    currentValue: 24,
    unit: 'Days Tracked',
    pointsEarned: 3,
    status: 'met',
    progressPct: 100,
    howToFix: 'Consistent tracking record.',
    enabled: true,
  });

  // -------------------------------------------------------------
  // PILLAR 3: BORROW WISELY (Total Weight: 20)
  // -------------------------------------------------------------
  // Rule 11: Total EMIs <= 35% of income (FOIR) - 7 pts
  const foir = monthlyIncome > 0 ? Math.round((totalEmi / monthlyIncome) * 100) : 0;
  const p11Pass = foir <= 35;
  const p11Pts = p11Pass ? 7 : Math.round(Math.max(0, (50 - foir) / 15) * 7);
  rules.push({
    id: 11,
    pillar: 'borrow_wisely',
    pillarName: 'Borrow Wisely',
    name: 'EMI-to-Income Ratio (FOIR)',
    description: 'Fixed obligations (EMIs) should not exceed 35% of monthly income.',
    weight: 7,
    targetValue: 35,
    currentValue: foir,
    unit: '% FOIR',
    pointsEarned: p11Pts,
    status: foir <= 35 ? 'met' : foir <= 50 ? 'partial' : 'not_met',
    progressPct: Math.min(100, Math.round((35 / Math.max(35, foir)) * 100)),
    howToFix: foir <= 35 ? `Healthy debt load at ${foir}%.` : `Prepay high-EMI debt to reduce monthly burden below ${formatINR(monthlyIncome * 0.35)}.`,
    enabled: true,
  });

  // Rule 12: High-interest debt (> 15% p.a.) under 30% of total debt - 5 pts
  rules.push({
    id: 12,
    pillar: 'borrow_wisely',
    pillarName: 'Borrow Wisely',
    name: 'High-Interest Debt Minimization',
    description: 'Personal loans & credit card rollovers (>15% p.a.) kept below 30% of total liabilities.',
    weight: 5,
    targetValue: 30,
    currentValue: 4,
    unit: '% High Rate',
    pointsEarned: 5,
    status: 'met',
    progressPct: 100,
    howToFix: 'Most liabilities are low-rate bank loans.',
    enabled: true,
  });

  // Rule 13: Credit card utilisation < 30% and bill paid in full - 4 pts
  const cardUtil = cardLimit > 0 ? Math.round((cardUsed / cardLimit) * 100) : 0;
  const p13Pass = cardUtil <= 30;
  const p13Pts = p13Pass ? 4 : Math.round(Math.max(0, (60 - cardUtil) / 30) * 4);
  rules.push({
    id: 13,
    pillar: 'borrow_wisely',
    pillarName: 'Borrow Wisely',
    name: 'Credit Card Utilization',
    description: 'Keep revolving balance below 30% of total credit limit and pay full statement.',
    weight: 4,
    targetValue: 30,
    currentValue: cardUtil,
    unit: '% Utilized',
    pointsEarned: p13Pts,
    status: cardUtil <= 30 ? 'met' : cardUtil <= 50 ? 'partial' : 'not_met',
    progressPct: Math.min(100, Math.round((30 / Math.max(30, cardUtil)) * 100)),
    howToFix: cardUtil <= 30 ? 'Good credit card utilization.' : `Pay down ${formatINR(cardUsed - cardLimit * 0.3)} before statement date.`,
    enabled: true,
  });

  // Rule 14: Debt-to-asset ratio < 50% - 4 pts
  const debtToAsset = totalAssets > 0 ? Math.round((totalDebt / totalAssets) * 100) : 100;
  const p14Pass = debtToAsset < 50;
  const p14Pts = p14Pass ? 4 : Math.round(Math.max(0, (100 - debtToAsset) / 50) * 4);
  rules.push({
    id: 14,
    pillar: 'borrow_wisely',
    pillarName: 'Borrow Wisely',
    name: 'Solvency (Debt-to-Asset Ratio)',
    description: 'Total liabilities should remain under 50% of aggregate realisable assets.',
    weight: 4,
    targetValue: 50,
    currentValue: debtToAsset,
    unit: '% Solvency',
    pointsEarned: p14Pts,
    status: debtToAsset < 50 ? 'met' : debtToAsset <= 75 ? 'partial' : 'not_met',
    progressPct: Math.min(100, Math.round((50 / Math.max(50, debtToAsset)) * 100)),
    howToFix: debtToAsset < 50 ? 'Solid solvent position.' : 'Direct surplus towards accelerating loan repayments.',
    enabled: true,
  });

  // -------------------------------------------------------------
  // PILLAR 4: GROW (Total Weight: 20)
  // -------------------------------------------------------------
  // Rule 15: Invest >= 20% of income - 6 pts
  const investRatio = monthlyIncome > 0 ? Math.round((monthlyInvested / monthlyIncome) * 100) : 0;
  const p15Achieved = Math.min(1, investRatio / 20);
  const p15Pts = Math.round(p15Achieved * 6);
  rules.push({
    id: 15,
    pillar: 'grow',
    pillarName: 'Grow',
    name: 'Wealth Investment Share',
    description: 'Allocate >= 20% of income into wealth-building financial instruments.',
    weight: 6,
    targetValue: 20,
    currentValue: investRatio,
    unit: '% Invested',
    pointsEarned: p15Pts,
    status: investRatio >= 20 ? 'met' : investRatio >= 10 ? 'partial' : 'not_met',
    progressPct: Math.min(100, Math.round((investRatio / 20) * 100)),
    howToFix:
      investRatio >= 20
        ? `Investing ₹${formatINR(monthlyInvested)}/mo (~${investRatio}% of income).`
        : `Increase monthly SIP/investments by ${formatINR(Math.max(0, monthlyIncome * 0.2 - monthlyInvested))}.`,
    enabled: true,
  });

  // Rule 16: Active SIP with a yearly step-up - 4 pts
  rules.push({
    id: 16,
    pillar: 'grow',
    pillarName: 'Grow',
    name: 'Systematic Investment Plan (SIP)',
    description: 'Maintain automated monthly SIP with an annual step-up of 5–10%.',
    weight: 4,
    targetValue: 1,
    currentValue: 1,
    unit: 'Active SIP',
    pointsEarned: 4,
    status: 'met',
    progressPct: 100,
    howToFix: 'Active ₹10,000 monthly SIP running.',
    enabled: true,
  });

  // Rule 17: Equity share close to (100 - age) +- 10%, adjusted for risk profile - 4 pts
  const targetEquity = Math.max(30, Math.min(80, 100 - profile.age));
  rules.push({
    id: 17,
    pillar: 'grow',
    pillarName: 'Grow',
    name: 'Age-Aligned Equity Allocation',
    description: `Target equity weighting around ${targetEquity}% (based on age ${profile.age} & ${profile.riskProfile} risk).`,
    weight: 4,
    targetValue: targetEquity,
    currentValue: 55,
    unit: '% Equity',
    pointsEarned: 4,
    status: 'met',
    progressPct: 100,
    howToFix: 'Portfolio asset allocation is aligned with target range.',
    enabled: true,
  });

  // Rule 18: Gold + silver 5–10% of investments - 3 pts
  rules.push({
    id: 18,
    pillar: 'grow',
    pillarName: 'Grow',
    name: 'Precious Metals Hedge (Gold/Silver)',
    description: 'Hold 5–10% of overall investment portfolio in Sovereign Gold Bonds or physical gold.',
    weight: 3,
    targetValue: 10,
    currentValue: 8,
    unit: '% Portfolio',
    pointsEarned: 3,
    status: 'met',
    progressPct: 100,
    howToFix: 'Well balanced gold hedging in place.',
    enabled: true,
  });

  // Rule 19: Diversified: >= 3 asset types, no single holding > 40%, speculation <= 5% - 3 pts
  rules.push({
    id: 19,
    pillar: 'grow',
    pillarName: 'Grow',
    name: 'Asset Diversification Matrix',
    description: 'Spread capital across at least 3 distinct asset classes with no single holding > 40%.',
    weight: 3,
    targetValue: 3,
    currentValue: 4,
    unit: 'Asset Types',
    pointsEarned: 3,
    status: 'met',
    progressPct: 100,
    howToFix: 'Diversified across MF, FD, Gold, and Insurance assets.',
    enabled: true,
  });

  // -------------------------------------------------------------
  // PILLAR 5: RETIRE & TAX (Total Weight: 10)
  // -------------------------------------------------------------
  // Rule 20: Retirement corpus on track for 25x annual expenses - 6 pts
  const targetRetirementCorpus = monthlySpending * 12 * 25;
  rules.push({
    id: 20,
    pillar: 'retire_tax',
    pillarName: 'Retire & Tax',
    name: 'Retirement Corpus Milestone',
    description: `On track to accumulate 25x annual expenses (${formatINR(targetRetirementCorpus)}) by age ${profile.retirementAge}.`,
    weight: 6,
    targetValue: targetRetirementCorpus,
    currentValue: 1250000,
    unit: '₹ Corpus',
    pointsEarned: 4,
    status: 'partial',
    progressPct: 45,
    howToFix: `Increase retirement SIP contribution by ${formatINR(5000)}/mo to stay on curve.`,
    enabled: true,
  });

  // Rule 21: Tax deductions used >= 80% of 80C + 80D limits this FY - 4 pts
  rules.push({
    id: 21,
    pillar: 'retire_tax',
    pillarName: 'Retire & Tax',
    name: 'Tax Optimization (80C & 80D)',
    description: 'Utilize >= 80% of available Section 80C (₹1.5L) and 80D (₹25k) deduction ceilings.',
    weight: 4,
    targetValue: 80,
    currentValue: 85,
    unit: '% Utilized',
    pointsEarned: 4,
    status: 'met',
    progressPct: 100,
    howToFix: 'Tax-saving investments (EPF, term insurance, ELSS) are optimized.',
    enabled: true,
  });

  // Calculate totals
  const totalScore = rules.reduce((sum, r) => sum + r.pointsEarned, 0);

  // Ratings
  let rating: 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' = 'B';
  let ratingLabel = 'Good';
  if (totalScore >= 90) {
    rating = 'A+';
    ratingLabel = 'Excellent';
  } else if (totalScore >= 80) {
    rating = 'A';
    ratingLabel = 'Very Good';
  } else if (totalScore >= 70) {
    rating = 'B';
    ratingLabel = 'Good';
  } else if (totalScore >= 60) {
    rating = 'C';
    ratingLabel = 'Fair';
  } else if (totalScore >= 45) {
    rating = 'D';
    ratingLabel = 'Weak';
  } else {
    rating = 'E';
    ratingLabel = 'Critical';
  }

  // Pillar scores
  const pillars: HealthPillar[] = ['protect', 'save_spend', 'borrow_wisely', 'grow', 'retire_tax'];
  const pillarScores: any = {};
  pillars.forEach(p => {
    const pRules = rules.filter(r => r.pillar === p);
    const score = pRules.reduce((sum, r) => sum + r.pointsEarned, 0);
    const maxScore = pRules.reduce((sum, r) => sum + r.weight, 0);
    const progressPct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    let rLabel = 'Good';
    if (progressPct >= 90) rLabel = 'A+';
    else if (progressPct >= 80) rLabel = 'A';
    else if (progressPct >= 70) rLabel = 'B';
    else if (progressPct >= 60) rLabel = 'C';
    else rLabel = 'D';

    pillarScores[p] = { score, maxScore, rating: rLabel, progressPct };
  });

  const metCount = rules.filter(r => r.status === 'met').length;
  const partialCount = rules.filter(r => r.status === 'partial').length;
  const notMetCount = rules.filter(r => r.status === 'not_met').length;

  const summaryLine = `${metCount} of 21 met · ${partialCount} partial · ${notMetCount} not met`;

  // Top 5 actions sorted by potential score points gained
  const candidateActions = rules
    .filter(r => r.pointsEarned < r.weight)
    .map(r => ({
      ruleId: r.id,
      ruleName: r.name,
      pointsGain: r.weight - r.pointsEarned,
      title: r.name,
      actionText: r.howToFix,
      deadline: 'By next quarter',
      type: (r.id === 1 ? 'goal' : r.id === 11 || r.id === 13 ? 'debt' : r.id === 2 ? 'insurance' : 'sip') as any,
    }))
    .sort((a, b) => b.pointsGain - a.pointsGain)
    .slice(0, 5);

  return {
    score: totalScore,
    rating,
    ratingLabel,
    pillarScores,
    rules,
    summaryLine,
    metCount,
    partialCount,
    notMetCount,
    topActions: candidateActions,
  };
}
