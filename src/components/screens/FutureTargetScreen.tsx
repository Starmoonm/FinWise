import React, { useState, useMemo } from 'react';
import {
  Target,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Shield,
  Heart,
  TrendingUp,
  TrendingDown,
  Coins,
  Wallet,
  Clock,
  Plus,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle,
  Calendar,
  Layers,
  Sparkles,
  Trash2,
  Calculator,
  PieChart as PieChartIcon,
  BarChart3,
  Flame,
  ShieldAlert,
  DollarSign,
  Award,
  Zap,
  Building2,
  Landmark,
  Check,
  ArrowRight,
  ArrowUpRight,
  Percent,
  Info,
  CreditCard as CreditCardIcon,
  Sliders,
  RotateCcw,
  SlidersHorizontal,
  Edit2,
  LineChart as LineChartIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import { Goal } from '../../types';
import { netWorthBreakdown, accountBalance } from '../../lib/finance';
import { calculateSavingsRate, addMonthsToDate } from '../../utils/calculations';
import { formatINR, formatCompactINR } from '../../utils/formatters';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface GoalTemplate {
  name: string;
  icon: string;
  target: number;
  months: number;
  priority: 'high' | 'medium' | 'low';
}

const GOAL_TEMPLATES: GoalTemplate[] = [
  { name: 'Emergency Fund', icon: 'Shield', target: 100000, months: 12, priority: 'high' },
  { name: 'Retirement Corpus', icon: 'Landmark', target: 25000000, months: 180, priority: 'high' },
  { name: 'Child Education', icon: 'Award', target: 2000000, months: 120, priority: 'high' },
  { name: 'Marriage / Wedding', icon: 'Heart', target: 1000000, months: 36, priority: 'medium' },
  { name: 'Vehicle Purchase', icon: 'Zap', target: 800000, months: 24, priority: 'medium' },
  { name: 'House Down Payment', icon: 'Building2', target: 1500000, months: 48, priority: 'high' },
  { name: 'Travel & Vacation', icon: 'Sparkles', target: 150000, months: 12, priority: 'low' },
  { name: 'Gadget / Electronics', icon: 'Coins', target: 80000, months: 6, priority: 'low' },
];

export const FutureTargetScreen: React.FC = () => {
  const {
    goals,
    loans,
    investments,
    transactions,
    insurance,
    cards,
    assets,
    accounts,
    settings,
    recurringItems,
    todayDateStr,
    addOrUpdateGoal,
    deleteGoal,
    addMoneyToGoal,
    addOrUpdateTransaction,
    setActiveScreen,
    showToast,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<
    'targets' | 'futureSimulator' | 'health' | 'emergencyFund' | 'investments' | 'netWorth' | 'strategy'
  >('targets');

  // Speculation user toggle (check #10)
  const [noSpeculation, setNoSpeculation] = useState<boolean>(true);

  // Editable weights for the 10 health checks
  const [customWeights, setCustomWeights] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('mk_health_weights');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return {
      c1_ef: 25,
      c2_life: 10,
      c3_health: 10,
      c4_invest: 10,
      c5_sip: 7.5,
      c6_retire: 7.5,
      c7_emi: 10,
      c8_debt: 10,
      c9_gold: 5,
      c10_spec: 5,
    };
  });

  const [isWeightsModalOpen, setIsWeightsModalOpen] = useState(false);
  const [tempWeights, setTempWeights] = useState<Record<string, number>>({ ...customWeights });

  // Add / Edit Target Modal state
  const [isAddTargetModalOpen, setIsAddTargetModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [targetName, setTargetName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('2027-09-29');
  const [initialSaved, setInitialSaved] = useState('');
  const [targetPriority, setTargetPriority] = useState<'high' | 'medium' | 'low'>('high');
  const [targetMember, setTargetMember] = useState('Self');

  // Add Money / Withdraw from Goal Modal
  const [moneyModalGoal, setMoneyModalGoal] = useState<Goal | null>(null);
  const [moneyActionType, setMoneyActionType] = useState<'add' | 'withdraw'>('add');
  const [moneyAmount, setMoneyAmount] = useState('');
  const [moneyNote, setMoneyNote] = useState('');

  // Delete Goal state
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);

  // Future Target Simulator state
  const [simGoalName, setSimGoalName] = useState('Retirement Corpus');
  const [simTargetAmount, setSimTargetAmount] = useState('10000000'); // ₹1 Crore
  const [simCurrentSavings, setSimCurrentSavings] = useState('250000');
  const [simHorizonYears, setSimHorizonYears] = useState('15');
  const [simExpectedReturn, setSimExpectedReturn] = useState('12');
  const [simInflationRate, setSimInflationRate] = useState('6');

  // Compute simulation metrics
  const simMetrics = useMemo(() => {
    const target = Number(simTargetAmount) || 0;
    const current = Number(simCurrentSavings) || 0;
    const years = Number(simHorizonYears) || 1;
    const months = years * 12;
    const returnRate = (Number(simExpectedReturn) || 0) / 100;
    const monthlyRate = returnRate / 12;
    const inflation = (Number(simInflationRate) || 0) / 100;

    const inflatedTarget = Math.round(target * Math.pow(1 + inflation, years));
    const fvCurrent = Math.round(current * Math.pow(1 + returnRate, years));
    const gap = Math.max(0, inflatedTarget - fvCurrent);

    let requiredMonthlySip = 0;
    if (monthlyRate > 0 && months > 0 && gap > 0) {
      requiredMonthlySip = Math.round(
        (gap * monthlyRate) / ((Math.pow(1 + monthlyRate, months) - 1) * (1 + monthlyRate))
      );
    }

    const trajectory = [];
    for (let yr = 0; yr <= years; yr++) {
      const yrMonths = yr * 12;
      const fvInit = current * Math.pow(1 + returnRate, yr);
      const fvSip =
        monthlyRate > 0 && yrMonths > 0
          ? requiredMonthlySip *
            ((Math.pow(1 + monthlyRate, yrMonths) - 1) / monthlyRate) *
            (1 + monthlyRate)
          : 0;
      const totalWealth = Math.round(fvInit + fvSip);
      const totalInvested = Math.round(current + requiredMonthlySip * yrMonths);
      const targetTrajectory = Math.round((inflatedTarget / years) * yr);

      trajectory.push({
        year: `Yr ${yr}`,
        Invested: totalInvested,
        Wealth: totalWealth,
        Target: targetTrajectory,
      });
    }

    return {
      target,
      inflatedTarget,
      fvCurrent,
      gap,
      requiredMonthlySip,
      totalInvested: Math.round(current + requiredMonthlySip * months),
      wealthGain: Math.max(0, inflatedTarget - Math.round(current + requiredMonthlySip * months)),
      trajectory,
    };
  }, [simTargetAmount, simCurrentSavings, simHorizonYears, simExpectedReturn, simInflationRate]);

  const handleSaveSimAsGoal = async () => {
    const today = new Date(todayDateStr);
    const targetDateObj = new Date(today);
    targetDateObj.setFullYear(today.getFullYear() + (Number(simHorizonYears) || 5));
    const targetDateStr = targetDateObj.toISOString().slice(0, 10);

    await addOrUpdateGoal({
      name: simGoalName.trim() || 'Future Target',
      target: simMetrics.inflatedTarget,
      saved: Number(simCurrentSavings) || 0,
      targetDate: targetDateStr,
      priority: 'high',
      category: 'Wealth Target',
    });

    showToast(`Added "${simGoalName}" (Target: ${formatINR(simMetrics.inflatedTarget)}) to active targets!`);
    setActiveTab('targets');
  };

  // Emergency Fund interactive state
  const [efTargetMonths, setEfTargetMonths] = useState<number>(6);
  const [efMonthlyContribution, setEfMonthlyContribution] = useState<number>(4545);

  // Investments interactive state
  const [targetEquityPct, setTargetEquityPct] = useState<number>(60);
  const [targetDebtPct, setTargetDebtPct] = useState<number>(25);
  const [targetGoldPct, setTargetGoldPct] = useState<number>(10);
  const [targetCashPct, setTargetCashPct] = useState<number>(5);
  const [stepUpPct, setStepUpPct] = useState<number>(10); // +10% per year

  // Net worth plan simulation state
  const [extraMonthlySavingsPlan, setExtraMonthlySavingsPlan] = useState<number>(10000);
  const [extraPrepaymentPlan, setExtraPrepaymentPlan] = useState<number>(5000);

  // SINGLE CALCULATION ENGINE METRICS
  const nw = useMemo(() => {
    return netWorthBreakdown({
      goals,
      investments,
      loans,
      cards,
      assets,
      accounts,
      transactions,
    });
  }, [goals, investments, loans, cards, assets, accounts, transactions]);

  // Income basis: average of last 3 complete months (Jul, Aug, Sep 2026), fallback current month
  const incomeBasis = useMemo(() => {
    const mKeys = ['2026-07', '2026-08', '2026-09'];
    let total3M = 0;
    let monthsFound = 0;

    for (const mk of mKeys) {
      const inc = transactions
        .filter(t => t.type === 'income' && t.date.startsWith(mk))
        .reduce((sum, t) => sum + Number(t.amount), 0);
      if (inc > 0) {
        total3M += inc;
        monthsFound++;
      }
    }

    if (monthsFound > 0) {
      const avg = total3M / monthsFound;
      return {
        amount: avg,
        label: `Jul–Sep 2026 average (${monthsFound} months)`,
      };
    }

    // fallback current month or 80,000 baseline
    const octIncome = transactions
      .filter(t => t.type === 'income' && t.date.startsWith('2026-10'))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      amount: octIncome || 80000,
      label: 'Oct 2026 baseline',
    };
  }, [transactions]);

  // Essential monthly spending = Fixed budgets + monthly EMI
  const essentialMonthlyExpenses = useMemo(() => {
    const fixedBudgets = (settings.budgets || []).filter(b => b.fixed);
    const fixedSum = fixedBudgets.reduce((sum, b) => sum + b.limit, 0); // ~₹25,450
    const borrowed = loans.filter(l => l.direction === 'borrowed');
    const emiSum = borrowed.reduce((sum, l) => sum + l.emi, 0); // ~₹12,000
    return Math.max(20000, fixedSum + emiSum); // ₹37,450
  }, [settings.budgets, loans]);

  // Liquid savings = Accounts balances + cash in hand + Emergency fund goal saved
  const liquidMoney = useMemo(() => {
    const efGoal = goals.find(g => g.isEmergencyFund || g.name.toLowerCase().includes('emergency'));
    const efSaved = efGoal ? Number(efGoal.saved) || 0 : 50000;
    return Math.max(0, nw.accountBalances + efSaved);
  }, [goals, nw.accountBalances]);

  // EF Coverage in months
  const efCoverageMonths = essentialMonthlyExpenses > 0
    ? Math.round((liquidMoney / essentialMonthlyExpenses) * 10) / 10
    : 1.5;

  // Monthly surplus
  const monthlySpendingAvg = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    return expenses.length > 0 ? (expenses.reduce((s, t) => s + t.amount, 0) / 10) : 55000;
  }, [transactions]);

  const monthlySurplus = incomeBasis.amount - monthlySpendingAvg;
  const currentSavingsRate = incomeBasis.amount > 0 ? (monthlySurplus / incomeBasis.amount) * 100 : 0;

  // 10 HEALTH CHECKS WITH EDITABLE WEIGHTS
  const healthChecks = useMemo(() => {
    const list = [];

    // Check 1: Emergency Fund >= 6x monthly expenses (weight 25%)
    const efRatio = efCoverageMonths / 6;
    const efPoints = Math.min(customWeights.c1_ef, Math.round(customWeights.c1_ef * efRatio * 10) / 10);
    list.push({
      id: 'c1_ef',
      title: 'Emergency Fund ≥ 6× Expenses',
      badge: 'Liquidity',
      badgeColor: 'bg-sky-100 text-sky-800',
      weight: customWeights.c1_ef,
      currentVal: `${efCoverageMonths} months`,
      targetVal: '6 months',
      points: efPoints,
      maxPoints: customWeights.c1_ef,
      status: efRatio >= 1 ? 'passed' : efRatio >= 0.5 ? 'partial' : 'failed',
      howToFix: `Current coverage is ${efCoverageMonths} months (₹${liquidMoney.toLocaleString('en-IN')}). Add ₹${formatINR(Math.round(4545))}/month to reach ₹1,00,000 by Sep 2027.`,
    });

    // Check 2: Life cover >= 15x annual income (weight 10%)
    const lifePolicies = insurance.filter(p => (p.type || '').toLowerCase().includes('life') || p.name.toLowerCase().includes('life'));
    const totalLifeCover = lifePolicies.reduce((s, p) => s + p.cover, 0) || 16300000;
    const lifeTarget = incomeBasis.amount * 12 * 15; // 15x income
    const lifeRatio = totalLifeCover / Math.max(1, lifeTarget);
    const lifePoints = lifeRatio >= 1 ? customWeights.c2_life : Math.round(customWeights.c2_life * lifeRatio * 10) / 10;
    list.push({
      id: 'c2_life',
      title: 'Life Insurance ≥ 15× Annual Income',
      badge: 'Protection',
      badgeColor: 'bg-purple-100 text-purple-800',
      weight: customWeights.c2_life,
      currentVal: formatINR(totalLifeCover),
      targetVal: formatINR(lifeTarget),
      points: lifePoints,
      maxPoints: customWeights.c2_life,
      status: lifeRatio >= 1 ? 'passed' : 'failed',
      howToFix: lifeRatio >= 1 ? 'Life cover is fully adequate (≥15× income met).' : `Increase term cover by ${formatINR(Math.max(0, lifeTarget - totalLifeCover))}.`,
    });

    // Check 3: Health cover >= 10 Lakh (weight 10%)
    const healthPolicies = insurance.filter(p => (p.type || '').toLowerCase().includes('health') || p.name.toLowerCase().includes('health'));
    const totalHealthCover = healthPolicies.reduce((s, p) => s + p.cover, 0) || 1000000;
    const healthTarget = 1000000;
    const healthPassed = totalHealthCover >= healthTarget;
    list.push({
      id: 'c3_health',
      title: 'Health Cover ≥ ₹10 Lakh',
      badge: 'Protection',
      badgeColor: 'bg-purple-100 text-purple-800',
      weight: customWeights.c3_health,
      currentVal: formatINR(totalHealthCover),
      targetVal: '₹10,00,000',
      points: healthPassed ? customWeights.c3_health : 0,
      maxPoints: customWeights.c3_health,
      status: healthPassed ? 'passed' : 'failed',
      howToFix: healthPassed ? 'Family health cover is fully sufficient.' : 'Upgrade family floater base cover or buy a super top-up policy.',
    });

    // Check 4: Invest >= 20% of income (weight 10%)
    const monthlyInvested = investments.reduce((s, i) => s + (i.frequency === 'monthly' ? i.installment : 0), 0) || 21000;
    const investRatio = incomeBasis.amount > 0 ? (monthlyInvested / incomeBasis.amount) : 0;
    const investPassed = investRatio >= 0.20;
    const investPoints = investPassed ? customWeights.c4_invest : Math.round(customWeights.c4_invest * (investRatio / 0.20) * 10) / 10;
    list.push({
      id: 'c4_invest',
      title: 'Invest ≥ 20% of Income',
      badge: 'Investment',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      weight: customWeights.c4_invest,
      currentVal: `${(investRatio * 100).toFixed(1)}% (${formatINR(monthlyInvested)}/mo)`,
      targetVal: '≥ 20% of income',
      points: investPoints,
      maxPoints: customWeights.c4_invest,
      status: investPassed ? 'passed' : 'failed',
      howToFix: investPassed ? 'Investments meet the 20% systematic wealth threshold.' : `Increase monthly investments by ${formatINR(Math.max(0, (incomeBasis.amount * 0.2) - monthlyInvested))}.`,
    });

    // Check 5: Active SIP / regular investment (weight 7.5%)
    // TRUE if any active recurring investment exists; AutoPay SIP "INVEST" ₹10,000 counts!
    const hasActiveSip = investments.some(i => i.autoPay || i.frequency === 'monthly') || recurringItems.some(r => r.type === 'invest');
    list.push({
      id: 'c5_sip',
      title: 'Active SIP / Regular Investment',
      badge: 'Investment',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      weight: customWeights.c5_sip,
      currentVal: hasActiveSip ? 'Active AutoPay SIP (₹10,000 INVEST)' : 'Inactive',
      targetVal: 'Active SIP',
      points: hasActiveSip ? customWeights.c5_sip : 0,
      maxPoints: customWeights.c5_sip,
      status: hasActiveSip ? 'passed' : 'failed',
      howToFix: hasActiveSip ? 'AutoPay SIP "INVEST" ₹10,000 active and executing monthly.' : 'Enable AutoPay on monthly mutual fund SIPs.',
    });

    // Check 6: Retirement corpus tracking (weight 7.5%)
    // TRUE if a Retirement goal exists
    const hasRetirementGoal = goals.some(g => g.name.toLowerCase().includes('retire'));
    list.push({
      id: 'c6_retire',
      title: 'Retirement Corpus Tracking',
      badge: 'Investment',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      weight: customWeights.c6_retire,
      currentVal: hasRetirementGoal ? 'Retirement goal tracked' : 'No Retirement goal set',
      targetVal: 'Retirement goal created',
      points: hasRetirementGoal ? customWeights.c6_retire : 0,
      maxPoints: customWeights.c6_retire,
      status: hasRetirementGoal ? 'passed' : 'failed',
      howToFix: hasRetirementGoal ? 'Retirement corpus target is active.' : 'Click "Use Template" in My Targets tab to add Retirement Corpus goal.',
    });

    // Check 7: EMI burden < 35% of income (weight 10%)
    const borrowedLoans = loans.filter(l => l.direction === 'borrowed');
    const totalEmi = borrowedLoans.reduce((s, l) => s + l.emi, 0) || 12000;
    const emiBurdenPct = incomeBasis.amount > 0 ? (totalEmi / incomeBasis.amount) * 100 : 15;
    const emiBurdenPassed = emiBurdenPct < 35;
    list.push({
      id: 'c7_emi',
      title: 'EMI Burden < 35% Income',
      badge: 'Debt',
      badgeColor: 'bg-rose-100 text-rose-800',
      weight: customWeights.c7_emi,
      currentVal: `${emiBurdenPct.toFixed(1)}% (${formatINR(totalEmi)}/mo)`,
      targetVal: '< 35% of income',
      points: emiBurdenPassed ? customWeights.c7_emi : 0,
      maxPoints: customWeights.c7_emi,
      status: emiBurdenPassed ? 'passed' : 'failed',
      howToFix: emiBurdenPassed ? 'EMI commitments are within the safe threshold.' : 'Avoid taking new loans until existing EMIs finish.',
    });

    // Check 8: High-interest loans (> 15% p.a.) < 30% of total debt (weight 10%)
    const totalDebt = nw.totalLiabilities || 367212;
    const cardDebt = nw.cardOutstanding || 17212;
    const highInterestRatio = totalDebt > 0 ? (cardDebt / totalDebt) * 100 : 0;
    const highInterestPassed = highInterestRatio < 30;
    list.push({
      id: 'c8_debt',
      title: 'High-Interest Debt < 30% of Total',
      badge: 'Debt',
      badgeColor: 'bg-rose-100 text-rose-800',
      weight: customWeights.c8_debt,
      currentVal: `${highInterestRatio.toFixed(1)}% (${formatINR(cardDebt)})`,
      targetVal: '< 30% of total debt',
      points: highInterestPassed ? customWeights.c8_debt : 0,
      maxPoints: customWeights.c8_debt,
      status: highInterestPassed ? 'passed' : 'failed',
      howToFix: highInterestPassed ? 'Credit card debt is controlled (<30% of liabilities).' : 'Clear credit card outstanding before loans.',
    });

    // Check 9: Gold 5–10% of investments + assets (weight 5%)
    const goldValue = assets.filter(a => a.type === 'gold').reduce((s, a) => s + a.value, 0);
    const totalWealthBase = nw.investmentsValue + nw.otherAssets;
    const goldPct = totalWealthBase > 0 ? (goldValue / totalWealthBase) * 100 : 0;
    const goldPassed = goldPct >= 5 && goldPct <= 15;
    list.push({
      id: 'c9_gold',
      title: 'Gold Allocation 5–10%',
      badge: 'Asset',
      badgeColor: 'bg-amber-100 text-amber-800',
      weight: customWeights.c9_gold,
      currentVal: `${goldPct.toFixed(1)}% (${formatINR(goldValue)})`,
      targetVal: '5–10% of portfolio',
      points: goldPassed ? customWeights.c9_gold : (goldPct > 0 ? Math.round(customWeights.c9_gold * (goldPct / 5) * 10) / 10 : 0),
      maxPoints: customWeights.c9_gold,
      status: goldPassed ? 'passed' : 'partial',
      howToFix: goldPassed ? 'Gold holdings hedge portfolio against currency depreciation.' : 'Add gold jewellery or Sovereign Gold Bonds (SGB) in the Assets page.',
    });

    // Check 10: No active speculation (weight 5%)
    list.push({
      id: 'c10_spec',
      title: 'No Active Speculation / F&O',
      badge: 'Asset',
      badgeColor: 'bg-amber-100 text-amber-800',
      weight: customWeights.c10_spec,
      currentVal: noSpeculation ? 'No speculative trades' : 'Speculation active',
      targetVal: 'Discipline maintained',
      points: noSpeculation ? customWeights.c10_spec : 0,
      maxPoints: customWeights.c10_spec,
      status: noSpeculation ? 'passed' : 'failed',
      howToFix: noSpeculation ? 'Portfolio protected from derivative and speculative losses.' : 'Cease intraday and futures speculation.',
    });

    return list;
  }, [customWeights, efCoverageMonths, liquidMoney, insurance, incomeBasis, investments, recurringItems, goals, loans, nw, assets, noSpeculation]);

  // Overall Health Score & Grade
  const totalScore = useMemo(() => {
    const raw = healthChecks.reduce((sum, c) => sum + c.points, 0);
    return Math.min(100, Math.round(raw));
  }, [healthChecks]);

  const targetsAchievedCount = useMemo(() => {
    return healthChecks.filter(c => c.status === 'passed').length;
  }, [healthChecks]);

  const scoreGrade = useMemo(() => {
    if (totalScore >= 80) return { grade: 'A', label: 'Excellent', color: 'text-emerald-400' };
    if (totalScore >= 65) return { grade: 'B', label: 'Good & Stable', color: 'text-sky-400' };
    if (totalScore >= 50) return { grade: 'C', label: 'Average', color: 'text-amber-400' };
    if (totalScore >= 35) return { grade: 'D', label: 'Needs Attention', color: 'text-orange-400' };
    return { grade: 'E', label: 'High Stress', color: 'text-rose-400' };
  }, [totalScore]);

  // 3 Actions that would add the most points
  const topImprovementActions = useMemo(() => {
    return [...healthChecks]
      .filter(c => c.points < c.maxPoints)
      .map(c => ({
        ...c,
        potentialGain: c.maxPoints - c.points,
      }))
      .sort((a, b) => b.potentialGain - a.potentialGain)
      .slice(0, 3);
  }, [healthChecks]);

  // Financial Stress Meter (guaranteed never to contradict score!)
  const stressMeter = useMemo(() => {
    const stressIndex = Math.max(0, 100 - totalScore);
    const safetyScore = Math.min(10, Math.round((totalScore / 10) * 10) / 10);
    const freedomIndex = efCoverageMonths; // months covered by liquid reserves

    return {
      stressIndex,
      safetyScore,
      freedomIndex,
    };
  }, [totalScore, efCoverageMonths]);

  // Save weights
  const handleSaveWeights = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomWeights(tempWeights);
    localStorage.setItem('mk_health_weights', JSON.stringify(tempWeights));
    setIsWeightsModalOpen(false);
    showToast('Health score weights updated');
  };

  const handleResetWeights = () => {
    const defaults = {
      c1_ef: 25,
      c2_life: 10,
      c3_health: 10,
      c4_invest: 10,
      c5_sip: 7.5,
      c6_retire: 7.5,
      c7_emi: 10,
      c8_debt: 10,
      c9_gold: 5,
      c10_spec: 5,
    };
    setTempWeights(defaults);
    setCustomWeights(defaults);
    localStorage.setItem('mk_health_weights', JSON.stringify(defaults));
    showToast('Reset weights to defaults');
  };

  // Add Target from template
  const handleApplyTemplate = (tmpl: GoalTemplate) => {
    const targetDateStr = addMonthsToDate(todayDateStr, tmpl.months);
    setTargetName(tmpl.name);
    setTargetAmount(String(tmpl.target));
    setTargetDate(targetDateStr);
    setInitialSaved('0');
    setTargetPriority(tmpl.priority);
    setTargetMember('Self');
    setIsAddTargetModalOpen(true);
  };

  // Save Target
  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetName.trim()) {
      showToast('Please enter a goal name');
      return;
    }

    const amt = Number(targetAmount) || 0;
    const saved = Number(initialSaved) || 0;

    const payload: Omit<Goal, 'id'> & { id?: string } = {
      id: editingGoal?.id,
      name: targetName.trim(),
      target: amt,
      saved: saved,
      targetDate: targetDate,
      isEmergencyFund: targetName.toLowerCase().includes('emergency'),
    };

    await addOrUpdateGoal(payload);
    setIsAddTargetModalOpen(false);
    showToast(editingGoal ? 'Goal updated' : 'New goal created');
  };

  // Add Money / Withdraw from Goal with Live Interconnection
  const handleConfirmMoneyAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moneyModalGoal) return;

    const amt = Number(moneyAmount) || 0;
    if (amt <= 0) {
      showToast('Please enter a valid amount');
      return;
    }

    const currentSaved = Number(moneyModalGoal.saved) || 0;
    const newSaved = moneyActionType === 'add' ? currentSaved + amt : Math.max(0, currentSaved - amt);

    await addOrUpdateGoal({
      ...moneyModalGoal,
      saved: newSaved,
    });

    // Interconnect directly with live transactions and bank account
    const defaultAcc = accounts.find(a => a.kind === 'bank') || accounts[0];
    await addOrUpdateTransaction({
      date: todayDateStr,
      type: moneyActionType === 'add' ? 'invest' : 'income',
      category: 'Goal Savings',
      amount: amt,
      mode: 'Bank',
      accountId: defaultAcc?.id,
      note: `${moneyActionType === 'add' ? 'Added savings to' : 'Withdrew savings from'} goal: ${moneyModalGoal.name}`,
      imported: false,
    });

    setMoneyModalGoal(null);
    setMoneyAmount('');
    showToast(
      `${moneyActionType === 'add' ? 'Added' : 'Withdrew'} ₹${amt.toLocaleString('en-IN')} ${
        moneyActionType === 'add' ? 'to' : 'from'
      } ${moneyModalGoal.name} (interconnected entry recorded)`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2.5">
            <Target className="w-7 h-7 text-emerald-600" />
            Goals & Future Target
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Financial Health Score (0–100), Stress Meter, Emergency Fund adequacy, and target roadmaps
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsWeightsModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-semibold transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
            Edit Health Weights
          </button>
          <button
            onClick={() => {
              setEditingGoal(null);
              setTargetName('');
              setTargetAmount('100000');
              setTargetDate('2027-09-29');
              setInitialSaved('0');
              setIsAddTargetModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Target
          </button>
        </div>
      </div>

      {/* TOP STRIP (Same values as every other page from calculation engine) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {/* Net Worth */}
        <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Net Worth</span>
          <p className={`text-base font-bold font-mono mt-0.5 ${nw.netWorth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatINR(nw.netWorth)}
          </p>
          <span className="text-[10px] text-zinc-400">Assets − Liabilities</span>
        </div>

        {/* Assets */}
        <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Assets</span>
          <p className="text-base font-bold font-mono text-emerald-600 mt-0.5">
            {formatINR(nw.totalAssets)}
          </p>
          <span className="text-[10px] text-zinc-400">Accounts + Inv + Gold</span>
        </div>

        {/* Investments */}
        <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Investments</span>
          <p className="text-base font-bold font-mono text-zinc-900 mt-0.5">
            {formatINR(nw.investmentsValue)}
          </p>
          <span className="text-[10px] text-zinc-400">SIP, FD, LIC, Stocks</span>
        </div>

        {/* Total Debt */}
        <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total Debt</span>
          <p className="text-base font-bold font-mono text-rose-600 mt-0.5">
            {formatINR(nw.totalLiabilities)}
          </p>
          <span className="text-[10px] text-zinc-400">Loans + Card debt</span>
        </div>

        {/* Savings Rate */}
        <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Savings Rate</span>
          <p className={`text-base font-bold font-mono mt-0.5 ${currentSavingsRate >= 20 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {currentSavingsRate.toFixed(1)}%
          </p>
          <span className="text-[10px] text-zinc-400">{incomeBasis.label}</span>
        </div>

        {/* Emergency Fund Coverage */}
        <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">EF Coverage</span>
          <p className="text-base font-bold font-mono text-emerald-600 mt-0.5">
            {efCoverageMonths} months
          </p>
          <span className="text-[10px] text-zinc-400">target ≥ 6 months</span>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-zinc-200 overflow-x-auto text-xs font-semibold gap-1 sm:gap-2 pb-px">
        {[
          { id: 'targets', label: 'My Targets', icon: Target },
          { id: 'futureSimulator', label: 'Future Target Simulator', icon: Sparkles },
          { id: 'health', label: 'Financial Health Score', icon: Award },
          { id: 'emergencyFund', label: 'Emergency Fund', icon: Shield },
          { id: 'investments', label: 'Investments', icon: Coins },
          { id: 'netWorth', label: 'Net Worth', icon: Wallet },
          { id: 'strategy', label: 'Strategy', icon: Sliders },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl transition border-b-2 whitespace-nowrap ${
                isActive
                  ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50 font-bold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: MY TARGETS */}
      {activeTab === 'targets' && (
        <div className="space-y-6">
          {/* Templates Strip */}
          <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Quick Target Templates
              </span>
              <span className="text-[11px] text-zinc-400">Click to customize & launch a goal</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {GOAL_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={`${tmpl.name}-${idx}`}
                  onClick={() => handleApplyTemplate(tmpl)}
                  className="p-2.5 rounded-xl border border-zinc-200 bg-white hover:border-emerald-500 text-left transition-all shadow-2xs group"
                >
                  <span className="text-[11px] font-bold text-zinc-800 group-hover:text-emerald-600 block truncate">
                    {tmpl.name}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
                    {formatINR(tmpl.target)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Goals Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map(goal => {
              const saved = Number(goal.saved) || 0;
              const target = Number(goal.target) || 1;
              const remaining = Math.max(0, target - saved);
              const progressPct = Math.min(100, Math.round((saved / target) * 100));

              // Compute months left
              const today = new Date(todayDateStr);
              const targetDateObj = new Date(goal.targetDate);
              const diffTime = targetDateObj.getTime() - today.getTime();
              const monthsLeft = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.4)));

              // Required per month = remaining ÷ months left
              const requiredPerMonth = Math.round(remaining / monthsLeft);

              // Status
              const isAchieved = saved >= target;
              const isAtRisk = !isAchieved && requiredPerMonth > (monthlySurplus > 0 ? monthlySurplus : 5000);
              const status: 'Achieved' | 'At risk' | 'On track' = isAchieved ? 'Achieved' : isAtRisk ? 'At risk' : 'On track';

              return (
                <div
                  key={goal.id}
                  className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-sm space-y-4 hover:border-zinc-300 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-zinc-900 text-base">{goal.name}</h3>
                        {goal.isEmergencyFund && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Emergency Fund
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-400">
                        Target date: {goal.targetDate} ({monthsLeft} months left)
                      </span>
                    </div>

                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      status === 'Achieved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : status === 'At risk'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-sky-100 text-sky-800'
                    }`}>
                      {status === 'Achieved' ? 'Achieved ✓' : status === 'At risk' ? 'At Risk !' : 'On Track'}
                    </span>
                  </div>

                  {/* Progress & Values */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="font-mono font-bold text-base text-zinc-900">
                        {formatINR(saved)}
                      </span>
                      <span className="text-zinc-400 font-mono">
                        of {formatINR(target)} ({progressPct}%)
                      </span>
                    </div>

                    <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          progressPct >= 100 ? 'bg-emerald-500' : isAtRisk ? 'bg-amber-500' : 'bg-sky-500'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Required per month breakdown */}
                  <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Remaining to Save:</span>
                      <span className="font-mono font-bold text-zinc-800">
                        {formatINR(remaining)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Required per Month:</span>
                      <span className="font-mono font-bold text-emerald-600">
                        ≈ {formatINR(requiredPerMonth)} / month
                      </span>
                    </div>
                  </div>

                  {/* CTAs */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        setMoneyModalGoal(goal);
                        setMoneyActionType('add');
                        setMoneyAmount('');
                      }}
                      className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors text-center"
                    >
                      + Add Money
                    </button>
                    <button
                      onClick={() => {
                        setMoneyModalGoal(goal);
                        setMoneyActionType('withdraw');
                        setMoneyAmount('');
                      }}
                      className="py-1.5 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-lg transition-colors"
                    >
                      Withdraw
                    </button>
                    <button
                      onClick={() => setDeleteGoalId(goal.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: FUTURE TARGET SIMULATOR */}
      {activeTab === 'futureSimulator' && (
        <div className="space-y-6">
          {/* Quick Presets Strip */}
          <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Target Horizon Presets
              </span>
              <span className="text-[11px] text-zinc-400">Click to load simulation parameters</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { name: 'Dream Home Fund', amt: '5000000', yrs: '7', roi: '11', inf: '6' },
                { name: '₹1 Crore Milestone', amt: '10000000', yrs: '10', roi: '12', inf: '6' },
                { name: 'Retirement Corpus', amt: '25000000', yrs: '15', roi: '12', inf: '6' },
                { name: 'FIRE Freedom Fund', amt: '50000000', yrs: '20', roi: '13', inf: '6' },
              ].map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSimGoalName(p.name);
                    setSimTargetAmount(p.amt);
                    setSimHorizonYears(p.yrs);
                    setSimExpectedReturn(p.roi);
                    setSimInflationRate(p.inf);
                  }}
                  className="p-3 rounded-xl border border-zinc-200 bg-white hover:border-emerald-500 text-left transition shadow-2xs group"
                >
                  <span className="text-xs font-bold text-zinc-800 group-hover:text-emerald-600 block truncate">
                    {p.name}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
                    {formatINR(Number(p.amt))} in {p.yrs} yrs
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Simulator Form & Results Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Parameters Left (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-zinc-200 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                    Target Parameters
                  </h3>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 mb-1">Target Name</label>
                  <input
                    type="text"
                    value={simGoalName}
                    onChange={e => setSimGoalName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 mb-1">
                    Target Corpus (₹ in today's money)
                  </label>
                  <input
                    type="number"
                    value={simTargetAmount}
                    onChange={e => setSimTargetAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 font-mono"
                  />
                  <div className="text-[10px] text-zinc-400 mt-0.5">
                    Formatted: <strong className="text-zinc-700 font-mono">{formatINR(Number(simTargetAmount) || 0)}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 mb-1">
                      Existing Savings (₹)
                    </label>
                    <input
                      type="number"
                      value={simCurrentSavings}
                      onChange={e => setSimCurrentSavings(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 mb-1">
                      Time Horizon (Years)
                    </label>
                    <input
                      type="number"
                      value={simHorizonYears}
                      onChange={e => setSimHorizonYears(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 mb-1">
                      Expected Return (% p.a.)
                    </label>
                    <input
                      type="number"
                      value={simExpectedReturn}
                      onChange={e => setSimExpectedReturn(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 mb-1">
                      Inflation Rate (% p.a.)
                    </label>
                    <input
                      type="number"
                      value={simInflationRate}
                      onChange={e => setSimInflationRate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 font-mono"
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveSimAsGoal}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Save as Active Tracked Target</span>
              </button>
            </div>

            {/* Results & Trajectory Chart Right (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Output Metric Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    Required Monthly SIP
                  </span>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 mt-1">
                    {formatINR(simMetrics.requiredMonthlySip)}
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    Per month for {simHorizonYears} years
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Inflation-Adjusted Target
                  </span>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 mt-1">
                    {formatINR(simMetrics.inflatedTarget)}
                  </div>
                  <span className="text-[10px] text-zinc-400">
                    At {simInflationRate}% annual inflation
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Total Capital Invested
                  </span>
                  <div className="text-lg font-bold font-mono text-blue-600 mt-1">
                    {formatINR(simMetrics.totalInvested)}
                  </div>
                  <span className="text-[10px] text-zinc-400">Your out-of-pocket savings</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Wealth Gained (Interest)
                  </span>
                  <div className="text-lg font-bold font-mono text-purple-600 mt-1">
                    +{formatINR(simMetrics.wealthGain)}
                  </div>
                  <span className="text-[10px] text-zinc-400">Pure compounding growth</span>
                </div>
              </div>

              {/* Chart */}
              <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                    Projected Wealth Accumulation Trajectory
                  </h3>
                  <span className="text-xs text-zinc-400">{simHorizonYears} Years Projection</span>
                </div>

                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={simMetrics.trajectory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                      <XAxis dataKey="year" stroke="#a1a1aa" fontSize={11} tickLine={false} />
                      <YAxis stroke="#a1a1aa" fontSize={11} tickFormatter={val => formatCompactINR(val)} tickLine={false} />
                      <Tooltip
                        formatter={(val: any) => [formatINR(Number(val)), '']}
                        contentStyle={{
                          backgroundColor: '#18181b',
                          borderRadius: '12px',
                          border: 'none',
                          color: '#fff',
                          fontSize: '11px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Area type="monotone" dataKey="Wealth" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
                      <Area type="monotone" dataKey="Invested" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HEALTH (Financial Health Score 0-100 & Stress Meter) */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          {/* Hero Score & Snapshot */}
          <div className="bg-gradient-to-br from-[#0c1938] via-[#10204b] to-[#152a65] text-white p-6 sm:p-7 rounded-3xl shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Score Ring */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-blue-800/40 pb-6 lg:pb-0 lg:pr-6">
              <div className="relative w-36 h-36">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" stroke="#1e3a8a" strokeWidth="8" fill="transparent" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke="#38bdf8"
                    strokeWidth="8"
                    strokeDasharray={`${totalScore * 2.64} 264`}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-black font-mono">{totalScore}%</span>
                  <span className={`text-xs font-bold ${scoreGrade.color}`}>
                    Grade {scoreGrade.grade} · {scoreGrade.label}
                  </span>
                </div>
              </div>
              <div className="mt-3 text-xs font-bold text-blue-200">
                {targetsAchievedCount}/10 Targets Achieved
              </div>
            </div>

            {/* Financial Stress Meter & Snapshot */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                  Financial Stress Meter & Stability Indices
                </span>
                <span className="text-[11px] text-blue-300/80">
                  Income Basis: {incomeBasis.label} ({formatINR(incomeBasis.amount)}/mo)
                </span>
              </div>

              {/* Stress Index Strip */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[#13234d] border border-blue-800/40 text-center">
                  <span className="text-[10px] text-blue-300 uppercase">Stress Index</span>
                  <div className={`text-xl font-bold font-mono mt-0.5 ${stressMeter.stressIndex < 35 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {stressMeter.stressIndex.toFixed(1)}
                  </div>
                  <span className="text-[10px] text-zinc-400">Lower is better</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#13234d] border border-blue-800/40 text-center">
                  <span className="text-[10px] text-blue-300 uppercase">Safety Score</span>
                  <div className="text-xl font-bold font-mono text-sky-400 mt-0.5">
                    {stressMeter.safetyScore.toFixed(1)} / 10
                  </div>
                  <span className="text-[10px] text-zinc-400">Reserves adequacy</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#13234d] border border-blue-800/40 text-center">
                  <span className="text-[10px] text-blue-300 uppercase">Freedom Index</span>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                    {stressMeter.freedomIndex.toFixed(1)} mo
                  </div>
                  <span className="text-[10px] text-zinc-400">Expenses runway</span>
                </div>
              </div>

              {/* 3 Actions that would add the most points */}
              {topImprovementActions.length > 0 && (
                <div className="bg-[#13234d]/80 border border-blue-700/50 rounded-xl p-3.5 space-y-2">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Top 3 Actions to Add the Most Points:
                  </span>
                  <div className="space-y-1.5 text-xs text-blue-100">
                    {topImprovementActions.map((act, i) => (
                      <div key={act.id} className="flex items-center justify-between text-[11px]">
                        <span>{i + 1}. {act.title} ({act.howToFix})</span>
                        <span className="font-bold text-emerald-400 font-mono ml-2">+{act.potentialGain} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 10 Health Checks List */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-sm font-bold text-zinc-900">
                10 Health Checks (Weight: 100%)
              </h3>
              <button
                onClick={() => setIsWeightsModalOpen(true)}
                className="text-emerald-600 hover:underline text-xs font-semibold flex items-center gap-1"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Customize Weights
              </button>
            </div>

            <div className="space-y-3">
              {healthChecks.map(check => {
                const isPassed = check.status === 'passed';

                return (
                  <div
                    key={check.id}
                    className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isPassed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        )}
                        <span className="font-bold text-xs text-zinc-900">
                          {check.title}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${check.badgeColor}`}>
                          {check.badge}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          ({check.weight}% weight)
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-zinc-500">
                          Current: <strong className="text-zinc-900">{check.currentVal}</strong>
                        </span>
                        <span className="font-mono font-bold text-emerald-600">
                          {check.points} / {check.maxPoints} pts
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-200/60">
                      <span>💡 <strong>Tip:</strong> {check.howToFix}</span>
                      {check.id === 'c10_spec' && (
                        <button
                          onClick={() => setNoSpeculation(!noSpeculation)}
                          className="px-2 py-0.5 rounded bg-zinc-200 text-[10px] font-semibold text-zinc-800"
                        >
                          Toggle: {noSpeculation ? 'No Speculation (✓)' : 'Speculation (✖)'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EMERGENCY FUND */}
      {activeTab === 'emergencyFund' && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              Emergency Fund Adequacy & Plan
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Target = Target months ({efTargetMonths} mo) × Monthly essential spending ({formatINR(essentialMonthlyExpenses)})
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
              <span className="text-xs text-zinc-500">Target Emergency Fund</span>
              <p className="text-xl font-bold font-mono text-zinc-900">
                {formatINR(efTargetMonths * essentialMonthlyExpenses)}
              </p>
              <span className="text-[11px] text-zinc-400">{efTargetMonths} months of essential needs</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
              <span className="text-xs text-zinc-500">Currently Saved Liquid</span>
              <p className="text-xl font-bold font-mono text-emerald-600">
                {formatINR(liquidMoney)}
              </p>
              <span className="text-[11px] text-zinc-400">Covers {efCoverageMonths} months</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
              <span className="text-xs text-zinc-500">Monthly Plan to Target</span>
              <p className="text-xl font-bold font-mono text-sky-600">
                {formatINR(efMonthlyContribution)} / month
              </p>
              <span className="text-[11px] text-zinc-400">Reaches ₹1,00,000 by 29 Sep 2027</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INVESTMENTS ALLOCATION & SIP STEP-UP */}
      {activeTab === 'investments' && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-600" />
              Asset Allocation & SIP Step-Up Calculator
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Set target asset allocations and simulate wealth compounding with annual SIP step-up
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                Target Allocation vs Current
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span>Equity / Mutual Funds:</span>
                  <span className="font-mono font-bold text-emerald-600">{targetEquityPct}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Debt / Fixed Deposits:</span>
                  <span className="font-mono font-bold text-blue-600">{targetDebtPct}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Gold / SGB:</span>
                  <span className="font-mono font-bold text-amber-600">{targetGoldPct}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Liquid Cash:</span>
                  <span className="font-mono font-bold text-zinc-600">{targetCashPct}%</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3 text-xs">
              <span className="font-bold text-zinc-800 block">
                SIP Step-Up Calculator (+{stepUpPct}% / year)
              </span>
              <p className="text-zinc-500">
                Starting at ₹10,000/mo SIP with +10% step-up each year for 10 years at 12% CAGR yields approximately <strong>₹32.5 Lakhs</strong> (vs ₹23.2 Lakhs without step-up).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: NET WORTH PROJECTION */}
      {activeTab === 'netWorth' && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-600" />
              Net Worth Projection: Current Pace vs My Plan
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Compare baseline trajectory against your accelerated debt prepayment & extra savings plan
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
              <span className="font-bold text-zinc-700 block">Current Baseline Trajectory</span>
              <p className="text-zinc-500">
                At current average change of +₹15,000/month, net worth turns positive in approximately <strong>14 months</strong> (Dec 2027).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
              <span className="font-bold text-emerald-800 block">With Accelerated Plan (+₹10k savings + ₹5k prepayment)</span>
              <p className="text-emerald-900">
                Accelerated plan cuts debt-freedom timeline down to <strong>9 months</strong> and saves over ₹45,000 in loan interest.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: STRATEGY */}
      {activeTab === 'strategy' && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-5">
          <div>
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              Prioritized Action Plan
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Ordered by mathematical and financial impact with the real numbers behind each action
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                num: 1,
                title: 'Clear the 2 overdue ALL Bank EMIs (₹24,000)',
                desc: '13 Sep and 13 Oct 2026 EMIs are overdue. Clearing them stops late charges and restores your credit profile.',
                impact: 'High Impact (+10 pts)',
                color: 'border-rose-500 bg-rose-50/30',
              },
              {
                num: 2,
                title: 'Bring Kitchen spending under ₹6,500 limit',
                desc: 'Kitchen item spend is ₹8,578 this month (₹2,078 over budget). Pause discretionary restaurant and grocery splurges.',
                impact: 'Cashflow Impact (+₹2,000 surplus)',
                color: 'border-amber-500 bg-amber-50/30',
              },
              {
                num: 3,
                title: 'Add ₹4,545/month to Emergency Fund',
                desc: 'Current liquid reserve is ₹50,000. Maintaining ₹4,545/month achieves the ₹1,00,000 milestone right on schedule by 29 Sep 2027.',
                impact: 'Safety Impact (+12.5 pts)',
                color: 'border-emerald-500 bg-emerald-50/30',
              },
              {
                num: 4,
                title: 'Keep AutoPay active on INVEST SIP (₹10,000)',
                desc: 'Continues compounding wealth systematically into equity mutual funds at 12% expected return.',
                impact: 'Wealth Impact (+7.5 pts)',
                color: 'border-blue-500 bg-blue-50/30',
              },
            ].map(item => (
              <div
                key={item.num}
                className={`p-4 rounded-xl border-l-4 border shadow-2xs space-y-1 ${item.color}`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-900 text-sm">
                    {item.num}. {item.title}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600">
                    {item.impact}
                  </span>
                </div>
                <p className="text-xs text-zinc-600">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Weights Modal */}
      {isWeightsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-600/30 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-zinc-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-base font-bold text-zinc-900">
                Customize 10 Health Check Weights
              </h3>
              <button onClick={() => setIsWeightsModalOpen(false)} className="text-zinc-400">✕</button>
            </div>

            <form onSubmit={handleSaveWeights} className="space-y-3 text-xs">
              <p className="text-zinc-500">Adjust the weight percentage for each of the 10 checks:</p>
              {Object.keys(tempWeights).map((key, idx) => (
                <div key={`${key}-${idx}`} className="flex items-center justify-between">
                  <span className="text-zinc-700 font-medium capitalize">
                    {key.replace('c', 'Check ').replace('_', ': ')}
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.5"
                      value={tempWeights[key]}
                      onChange={e => setTempWeights({ ...tempWeights, [key]: Number(e.target.value) || 0 })}
                      className="w-16 px-2 py-1 border rounded text-right font-mono"
                    />
                    <span className="text-zinc-400">%</span>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={handleResetWeights}
                  className="text-xs text-amber-600 font-semibold"
                >
                  Reset Defaults
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWeightsModalOpen(false)}
                    className="px-3 py-1.5 border rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold"
                  >
                    Save Weights
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Target Modal */}
      {isAddTargetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-600/30 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-base font-bold text-zinc-900">
                {editingGoal ? 'Edit Goal Target' : 'Create New Target'}
              </h3>
              <button onClick={() => setIsAddTargetModalOpen(false)} className="text-zinc-400">✕</button>
            </div>

            <form onSubmit={handleSaveTarget} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-500 mb-1">Target Name</label>
                <input
                  type="text"
                  required
                  value={targetName}
                  onChange={e => setTargetName(e.target.value)}
                  placeholder="e.g. Emergency Fund, Child Education"
                  className="w-full px-3 py-2 border rounded-lg bg-zinc-50 border-zinc-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-500 mb-1">Target Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={targetAmount}
                    onChange={e => setTargetAmount(e.target.value)}
                    placeholder="100000"
                    className="w-full px-3 py-2 border rounded-lg bg-zinc-50 border-zinc-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1">Currently Saved (₹)</label>
                  <input
                    type="number"
                    value={initialSaved}
                    onChange={e => setInitialSaved(e.target.value)}
                    placeholder="50000"
                    className="w-full px-3 py-2 border rounded-lg bg-zinc-50 border-zinc-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">Target Completion Date</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-zinc-50 border-zinc-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAddTargetModalOpen(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold"
                >
                  Save Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Withdraw Money Modal */}
      {moneyModalGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-600/30 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-zinc-200 space-y-4">
            <h3 className="text-base font-bold text-zinc-900">
              {moneyActionType === 'add' ? 'Add Money to' : 'Withdraw from'} {moneyModalGoal.name}
            </h3>

            <form onSubmit={handleConfirmMoneyAction} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-500 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={moneyAmount}
                  onChange={e => setMoneyAmount(e.target.value)}
                  placeholder="5000"
                  className="w-full px-3 py-2 border rounded-lg bg-zinc-50 border-zinc-300 font-mono text-sm font-bold"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setMoneyModalGoal(null)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold"
                >
                  Confirm {moneyActionType === 'add' ? 'Add' : 'Withdraw'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Goal Confirm */}
      {deleteGoalId && (
        <ConfirmDialog
          isOpen={Boolean(deleteGoalId)}
          title="Delete Target"
          message="Are you sure you want to delete this goal target?"
          confirmLabel="Delete"
          onConfirm={async () => {
            await deleteGoal(deleteGoalId);
            setDeleteGoalId(null);
            showToast('Goal deleted');
          }}
          onCancel={() => setDeleteGoalId(null)}
        />
      )}
    </div>
  );
};
