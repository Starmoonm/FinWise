import React, { useState, useMemo } from 'react';
import {
  Coins,
  TrendingUp,
  Target,
  Shield,
  CreditCard as CardIcon,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Investment, Goal, CreditCard, Asset, Insurance } from '../../types';
import {
  calculateCreditCardOutstanding,
  calculateInvested,
  getTransactionsForMonth,
} from '../../utils/calculations';
import { formatINR, formatShortINR, formatDateKolkata } from '../../utils/formatters';
import { ConfirmDialog } from '../common/ConfirmDialog';

export const WealthScreen: React.FC = () => {
  const {
    investments,
    goals,
    insurance,
    cards,
    assets,
    transactions,
    history,
    todayDateStr,
    payInvestmentInstallment,
    updateInvestmentValue,
    addOrUpdateInvestment,
    deleteInvestment,
    addOrUpdateGoal,
    deleteGoal,
    addMoneyToGoal,
    payCardBill,
    addOrUpdateAsset,
    deleteAsset,
  } = useFinance();

  // Tab: 'investments' | 'goals' | 'cards' | 'assets' | 'insurance'
  const [activeTab, setActiveTab] = useState<'investments' | 'goals' | 'cards' | 'assets'>('investments');

  // Modals state
  const [editingInv, setEditingInv] = useState<Investment | null>(null);
  const [isInvModalOpen, setIsInvModalOpen] = useState(false);
  const [updateValInv, setUpdateValInv] = useState<Investment | null>(null);
  const [newValInput, setNewValInput] = useState('');

  // Future Value Projection tool state
  const [showProjectionTool, setShowProjectionTool] = useState(false);
  const [projectGrowthRate, setProjectGrowthRate] = useState<number>(12); // 12% CAGR default
  const [projectYears, setProjectYears] = useState<number>(5);

  // Goal modal
  const [addGoalMoneyModal, setAddGoalMoneyModal] = useState<Goal | null>(null);
  const [addGoalAmount, setAddGoalAmount] = useState('');

  // Card pay bill modal
  const [payCardModal, setPayCardModal] = useState<CreditCard | null>(null);
  const [payCardAmount, setPayCardAmount] = useState('');

  // Asset modal
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [assetName, setAssetName] = useState('');
  const [assetValue, setAssetValue] = useState('');

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'inv' | 'goal' | 'asset'; id: string } | null>(null);

  // Total current portfolio value
  const totalPortfolioValue = useMemo(
    () => investments.reduce((sum, i) => sum + (Number(i.currentValue) || 0), 0),
    [investments]
  );

  // Total cost basis across all investments
  const totalCostBasis = useMemo(() => {
    return investments.reduce((sum, i) => {
      const basis = i.costBasis ?? (i.purchasePrice && i.quantity ? i.purchasePrice * i.quantity : i.currentValue);
      return sum + basis;
    }, 0);
  }, [investments]);

  const totalUnrealizedGain = totalPortfolioValue - totalCostBasis;
  const totalGainPct = totalCostBasis > 0 ? (totalUnrealizedGain / totalCostBasis) * 100 : 0;

  // Invested this year calculation (Must match acceptance test: ₹1,11,132)
  const investedThisYear = useMemo(() => {
    // Invested entries from transactions this year (2026)
    const thisYearTxInvested = transactions
      .filter(t => t.type === 'invest' && t.date.startsWith('2026'))
      .reduce((sum, t) => sum + t.amount, 0);

    const historyJanToSep = history.jan_to_sep_2026?.topCategories?.Investment || 0;
    return thisYearTxInvested + historyJanToSep;
  }, [transactions, history]);

  // Allocation by type
  const allocation = useMemo(() => {
    const map: Record<string, number> = {};
    for (const inv of investments) {
      map[inv.type] = (map[inv.type] || 0) + inv.currentValue;
    }
    return Object.entries(map).map(([type, value]) => ({
      type,
      value,
      pct: totalPortfolioValue > 0 ? (value / totalPortfolioValue) * 100 : 0,
    }));
  }, [investments, totalPortfolioValue]);

  // Future value calculation
  const projectedFutureValue = useMemo(() => {
    // Compound interest: FV = PV * (1 + r)^n
    const r = projectGrowthRate / 100;
    const n = projectYears;
    return Math.round(totalPortfolioValue * Math.pow(1 + r, n));
  }, [totalPortfolioValue, projectGrowthRate, projectYears]);

  // Detailed investment tracking save handler
  const handleSaveInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInv) return;

    addOrUpdateInvestment(editingInv);
    setIsInvModalOpen(false);
    setEditingInv(null);
  };

  const handleConfirmUpdateValue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateValInv) return;
    const val = parseFloat(newValInput);
    if (isNaN(val) || val < 0) return;

    updateInvestmentValue(updateValInv.id, val);
    setUpdateValInv(null);
    setNewValInput('');
  };

  const handleAddGoalMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addGoalMoneyModal) return;
    const amt = parseFloat(addGoalAmount);
    if (!amt || amt <= 0) return;

    await addMoneyToGoal(addGoalMoneyModal.id, amt);
    setAddGoalMoneyModal(null);
    setAddGoalAmount('');
  };

  const handlePayCardBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payCardModal) return;
    const amt = parseFloat(payCardAmount);
    if (!amt || amt <= 0) return;

    await payCardBill(payCardModal.id, amt, 'Bank');
    setPayCardModal(null);
    setPayCardAmount('');
  };

  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(assetValue);
    if (!val || val <= 0 || !assetName.trim()) return;

    addOrUpdateAsset({
      name: assetName.trim(),
      value: val,
    });

    setIsAssetModalOpen(false);
    setAssetName('');
    setAssetValue('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3.5 sm:px-6 py-6 pb-24 md:pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Wealth & Assets</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Portfolio tracking, cost basis, unrealized P&L, goals and growth projections
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
          <button
            onClick={() => setActiveTab('investments')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'investments'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Investments
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'goals'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Goals
          </button>
          <button
            onClick={() => setActiveTab('cards')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'cards'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Cards
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'assets'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Assets
          </button>
        </div>
      </div>

      {activeTab === 'investments' && (
        <>
          {/* Key Portfolio Summary Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <div className="text-[11px] font-semibold text-zinc-500">Current Portfolio Value</div>
              <div className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
                {formatINR(totalPortfolioValue)}
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">3 active investments</div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <div className="text-[11px] font-semibold text-zinc-500">Invested This Year (2026)</div>
              <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {formatINR(investedThisYear)}
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Jan–Sep (90,132) + Oct (21,000)</div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <div className="text-[11px] font-semibold text-zinc-500">Total Cost Basis</div>
              <div className="text-xl sm:text-2xl font-black text-zinc-800 dark:text-zinc-200 mt-1">
                {formatINR(totalCostBasis)}
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Purchase capital deployed</div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <div className="text-[11px] font-semibold text-zinc-500">Unrealized Gain / Loss</div>
              <div
                className={`text-xl sm:text-2xl font-black mt-1 flex items-center gap-1 ${
                  totalUnrealizedGain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                }`}
              >
                <span>{formatINR(totalUnrealizedGain)}</span>
                <span className="text-xs font-semibold">({totalGainPct >= 0 ? `+${totalGainPct.toFixed(1)}%` : `${totalGainPct.toFixed(1)}%`})</span>
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Market value vs cost</div>
            </div>
          </div>

          {/* Asset Allocation Bar by Type */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-zinc-900 dark:text-zinc-100">Asset Allocation by Type</span>
              <span className="text-zinc-500">Total: {formatINR(totalPortfolioValue)}</span>
            </div>

            {/* Stacked bar */}
            <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full flex overflow-hidden">
              {allocation.map((a, i) => (
                <div
                  key={`${a.type}-${i}`}
                  title={`${a.type}: ${a.pct.toFixed(1)}%`}
                  className={`h-full transition-all duration-300 ${
                    i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-indigo-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${a.pct}%` }}
                />
              ))}
            </div>

            <div className="flex items-center gap-4 flex-wrap text-xs pt-1">
              {allocation.map((a, i) => (
                <div key={`${a.type}-${i}`} className="flex items-center gap-1.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-indigo-500' : 'bg-amber-500'
                    }`}
                  />
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{a.type}</span>
                  <span className="text-zinc-400">({a.pct.toFixed(0)}% · {formatShortINR(a.value)})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Future Value Projection Panel (CLEARLY DISTINGUISHED from Current Market Values) */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-zinc-900 border border-indigo-500/30 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    Hypothetical Growth Projection Simulator
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Projection Only (Not Current Value)
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Compound interest forecast calculated on current capital ({formatINR(totalPortfolioValue)})
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                  Projected Value in {projectYears} Years
                </span>
                <span className="text-2xl font-black text-indigo-300 font-mono">
                  {formatINR(projectedFutureValue)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-indigo-500/20 text-xs">
              <div>
                <div className="flex justify-between text-zinc-300 font-medium mb-1">
                  <span>Assumed Annual CAGR:</span>
                  <span className="font-bold text-indigo-400">{projectGrowthRate}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="25"
                  step="1"
                  value={projectGrowthRate}
                  onChange={e => setProjectGrowthRate(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 font-medium mb-1">
                  <span>Investment Horizon:</span>
                  <span className="font-bold text-indigo-400">{projectYears} Years</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={projectYears}
                  onChange={e => setProjectYears(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Investments List with Detailed Tracking */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Active Investment Holdings ({investments.length})
              </h3>
              <button
                onClick={() => {
                  setEditingInv({
                    id: `inv_${Date.now()}`,
                    name: '',
                    type: 'SIP / Mutual Fund',
                    currentValue: 0,
                    installment: 5000,
                    frequency: 'monthly',
                    nextDueDate: todayDateStr,
                    autoPay: false,
                  });
                  setIsInvModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Investment</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {investments.map(inv => {
                const cost = inv.costBasis ?? (inv.purchasePrice && inv.quantity ? inv.purchasePrice * inv.quantity : inv.currentValue);
                const gain = inv.currentValue - cost;
                const gainPct = cost > 0 ? (gain / cost) * 100 : 0;

                return (
                  <div
                    key={inv.id}
                    className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                            {inv.name}
                          </h4>
                          {inv.autoPay && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              AutoPay
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {inv.type} · Installment: {formatINR(inv.installment)} ({inv.frequency})
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] text-zinc-400">Current Value</div>
                        <div className="font-mono font-black text-lg text-zinc-900 dark:text-zinc-100">
                          {formatINR(inv.currentValue)}
                        </div>
                      </div>
                    </div>

                    {/* Detailed Purchase & Cost Basis Breakdown */}
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 text-xs text-center border border-zinc-200/60 dark:border-zinc-700/60">
                      <div>
                        <div className="text-[10px] text-zinc-400">Cost Basis</div>
                        <div className="font-bold text-zinc-800 dark:text-zinc-200">{formatINR(cost)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-400">Qty / Price</div>
                        <div className="font-bold text-zinc-800 dark:text-zinc-200">
                          {inv.quantity ? `${inv.quantity} units` : '1 unit'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-400">Unrealized P&L</div>
                        <div
                          className={`font-bold ${
                            gain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                          }`}
                        >
                          {gain >= 0 ? `+${formatINR(gain)}` : formatINR(gain)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
                      <div>Next Due: <strong>{formatDateKolkata(inv.nextDueDate)}</strong></div>
                      {inv.note && <div className="italic text-[11px] text-zinc-400">{inv.note}</div>}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setUpdateValInv(inv);
                            setNewValInput(String(inv.currentValue));
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          Update Value
                        </button>
                        <button
                          onClick={() => {
                            setEditingInv({ ...inv });
                            setIsInvModalOpen(true);
                          }}
                          className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          title="Edit investment details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => payInvestmentInstallment(inv.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition"
                      >
                        Paid Installment
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Financial & Emergency Goals
            </h3>
            <button
              onClick={() => {
                addOrUpdateGoal({
                  name: 'Vacation Fund',
                  target: 50000,
                  saved: 10000,
                  targetDate: '2027-06-30',
                });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Goal</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map(goal => {
              const progress = goal.target > 0 ? (goal.saved / goal.target) * 100 : 0;
              const remaining = Math.max(0, goal.target - goal.saved);

              // Calculate months left to target date
              let monthsLeft = 1;
              if (goal.targetDate) {
                const [ty, tm] = goal.targetDate.split('-').map(Number);
                const [cy, cm] = todayDateStr.split('-').map(Number);
                monthsLeft = Math.max(1, (ty - cy) * 12 + (tm - cm));
              }
              const requiredPerMonth = remaining / monthsLeft;

              return (
                <div
                  key={goal.id}
                  className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-100">{goal.name}</h4>
                        {goal.isEmergencyFund && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Emergency Fund
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        Target Date: {formatDateKolkata(goal.targetDate)} ({monthsLeft} months left)
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-zinc-400">Saved</div>
                      <div className="font-mono font-black text-lg text-emerald-600 dark:text-emerald-400">
                        {formatINR(goal.saved)}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>Progress: {progress.toFixed(0)}%</span>
                      <span>Target: {formatINR(goal.target)}</span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="text-zinc-500">Remaining to target: </span>
                      <strong className="text-zinc-900 dark:text-zinc-100">{formatINR(remaining)}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500">Required: </span>
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        ≈ {formatINR(Math.round(requiredPerMonth))}/month
                      </strong>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => setAddGoalMoneyModal(goal)}
                      className="min-h-[38px] px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
                    >
                      Add Money
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Credit Cards Tab */}
      {activeTab === 'cards' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Credit Cards & Outstanding Dues
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Formula: openingOutstanding + Credit Card mode expenses after asOf − cardPayment entries
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cards.map(card => {
                const outstanding = calculateCreditCardOutstanding(card, transactions);
                return (
                  <div
                    key={card.id}
                    className="p-5 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-800 text-white shadow-md space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardIcon className="w-5 h-5 text-emerald-400" />
                        <span className="font-bold text-base">{card.name}</span>
                      </div>
                      <span className="text-xs text-zinc-400">As of {card.asOf.slice(0, 10)}</span>
                    </div>

                    <div>
                      <div className="text-[11px] text-zinc-400 uppercase tracking-wider">
                        Current Outstanding Balance
                      </div>
                      <div className="text-2xl font-black font-mono text-rose-400 mt-1">
                        {formatINR(outstanding)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-700">
                      <span className="text-xs text-zinc-400">
                        Opening: {formatINR(card.openingOutstanding)}
                      </span>
                      <button
                        onClick={() => {
                          setPayCardModal(card);
                          setPayCardAmount(String(outstanding));
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs transition"
                      >
                        Pay Bill
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Other Assets Tab */}
      {activeTab === 'assets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Other Real Assets (Bank Balance, Gold, Property)
            </h3>
            <button
              onClick={() => setIsAssetModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Asset</span>
            </button>
          </div>

          {assets.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <p className="text-xs text-zinc-500">No other assets recorded yet. Tap "Add Asset" to record savings accounts, physical gold, or property.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {assets.map(a => (
                <div
                  key={a.id}
                  className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{a.name}</h4>
                    <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-base mt-0.5">
                      {formatINR(a.value)}
                    </div>
                  </div>

                  <button
                    onClick={() => deleteAsset(a.id)}
                    className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Insurance Summary Section */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Insurance Cover & Protection
            </h3>
          </div>
          <span className="text-xs text-zinc-500">{insurance.length} policy total</span>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {insurance.map(ins => (
            <div key={ins.id} className="py-2.5 flex items-center justify-between text-xs">
              <div>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">{ins.name}</div>
                <div className="text-[11px] text-zinc-500">
                  Yearly Premium: <strong>{formatINR(ins.yearlyPremium)}</strong>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-zinc-400">Total Cover</div>
                <div className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                  {formatShortINR(ins.cover)} ({formatINR(ins.cover)})
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Detailed Investment Modal */}
      {isInvModalOpen && editingInv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Detailed Investment Tracking
            </h3>

            <form onSubmit={handleSaveInvestment} className="space-y-3">
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">Investment Name</label>
                <input
                  type="text"
                  value={editingInv.name}
                  onChange={e => setEditingInv({ ...editingInv, name: e.target.value })}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">Current Market Value (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingInv.currentValue}
                    onChange={e => setEditingInv({ ...editingInv, currentValue: parseFloat(e.target.value) || 0 })}
                    className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">Purchase / Cost Price (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingInv.purchasePrice || ''}
                    placeholder="Unit purchase price"
                    onChange={e => setEditingInv({ ...editingInv, purchasePrice: parseFloat(e.target.value) || undefined })}
                    className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">Quantity (Units)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingInv.quantity || ''}
                    placeholder="e.g. 100"
                    onChange={e => setEditingInv({ ...editingInv, quantity: parseFloat(e.target.value) || undefined })}
                    className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">Purchase Date</label>
                  <input
                    type="date"
                    value={editingInv.purchaseDate || ''}
                    onChange={e => setEditingInv({ ...editingInv, purchaseDate: e.target.value })}
                    className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">
                  Direct Cost Basis Total (Optional override)
                </label>
                <input
                  type="number"
                  step="any"
                  value={editingInv.costBasis || ''}
                  placeholder="Total invested capital"
                  onChange={e => setEditingInv({ ...editingInv, costBasis: parseFloat(e.target.value) || undefined })}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsInvModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                >
                  Save Investment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Update Value Modal */}
      {updateValInv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Update Market Value — {updateValInv.name}
            </h3>

            <form onSubmit={handleConfirmUpdateValue} className="space-y-3">
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">New Current Value (₹)</label>
                <input
                  type="number"
                  step="any"
                  value={newValInput}
                  onChange={e => setNewValInput(e.target.value)}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-black text-base"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUpdateValInv(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                >
                  Save Value
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Money to Goal Modal */}
      {addGoalMoneyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Add Money to {addGoalMoneyModal.name}
            </h3>

            <form onSubmit={handleAddGoalMoney} className="space-y-3">
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">Amount to Add (₹)</label>
                <input
                  type="number"
                  step="any"
                  value={addGoalAmount}
                  onChange={e => setAddGoalAmount(e.target.value)}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold"
                  placeholder="e.g. 5000"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddGoalMoneyModal(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                >
                  Add to Savings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Card Bill Modal */}
      {payCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Pay Credit Card Bill — {payCardModal.name}
            </h3>
            <p className="text-zinc-500">
              Per rule, paying your credit card creates a "cardPayment" entry which does NOT count as spending or income.
            </p>

            <form onSubmit={handlePayCardBill} className="space-y-3">
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">Bill Payment Amount (₹)</label>
                <input
                  type="number"
                  step="any"
                  value={payCardAmount}
                  onChange={e => setPayCardAmount(e.target.value)}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayCardModal(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                >
                  Confirm Bill Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Asset Modal */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Add Asset</h3>
            <form onSubmit={handleSaveAsset} className="space-y-3">
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">Asset Name</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Savings, 24K Gold, Flat in Pune"
                  value={assetName}
                  onChange={e => setAssetName(e.target.value)}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  required
                />
              </div>
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">Estimated Value (₹)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={assetValue}
                  onChange={e => setAssetValue(e.target.value)}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAssetModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                >
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
