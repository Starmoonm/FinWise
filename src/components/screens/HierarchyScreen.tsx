import React, { useState, useMemo } from 'react';
import {
  GitFork,
  ChevronDown,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Layers,
  PieChart as PieChartIcon,
  ShoppingBag,
  HeartPulse,
  Home,
  CreditCard,
  Coffee,
  Car,
  Gift,
  Users,
  Coins,
  Shield,
  HelpCircle,
  ExternalLink,
  Sliders,
  DollarSign,
  Sparkles,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../utils/formatters';

const PILLAR_DEFINITIONS: Record<
  string,
  {
    title: string;
    description: string;
    color: string;
    targetPercent: number;
    groups: string[];
  }
> = {
  needs: {
    title: 'Needs & Essentials (50% Target)',
    description: 'Obligatory living costs: Groceries, Utility bills, Healthcare, and Family support',
    color: '#3b82f6',
    targetPercent: 50,
    groups: ['Family Support', 'Kitchen & Grocery', 'Health', 'Home & Bills'],
  },
  debt: {
    title: 'Debt Servicing & EMIs (≤ 30% Ceiling)',
    description: 'Home loan, Car loan, Personal loan EMIs, and Credit card dues',
    color: '#f59e0b',
    targetPercent: 20,
    groups: ['Loans & EMI'],
  },
  wants: {
    title: 'Wants & Lifestyle (≤ 30% Limit)',
    description: 'Discretionary spends: Dining out, Shopping, Travel, Entertainment, and Gifting',
    color: '#ec4899',
    targetPercent: 30,
    groups: ['Personal & Shopping', 'Food Outside', 'Travel & Transport', 'Social & Giving'],
  },
  savings: {
    title: 'Savings & Investments (≥ 20% Goal)',
    description: 'SIPs, Mutual funds, PPF, NPS, Gold, and Long-term capital building',
    color: '#10b981',
    targetPercent: 20,
    groups: ['Investments', 'Wealth Building'],
  },
  other: {
    title: 'Other & Unclassified',
    description: 'Miscellaneous expenses, cash withdrawals, and general unmapped entries',
    color: '#71717a',
    targetPercent: 0,
    groups: ['Other'],
  },
};

export const HierarchyScreen: React.FC = () => {
  const { transactions, activeMonthKey, groups, settings, setActiveScreen } = useFinance();

  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'pillar-needs': true,
    'pillar-debt': true,
    'pillar-wants': true,
    'pillar-savings': true,
  });

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Active month transactions
  const monthTxs = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(activeMonthKey));
  }, [transactions, activeMonthKey]);

  // Total month spending & investments
  const totalOutflow = useMemo(() => {
    return monthTxs.reduce((sum, t) => sum + (t.type === 'expense' || t.type === 'invest' ? t.amount : 0), 0);
  }, [monthTxs]);

  // Aggregate spends by category
  const categorySpends = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const t of monthTxs) {
      if (t.type === 'expense' || t.type === 'invest') {
        const cur = map.get(t.category) || { total: 0, count: 0 };
        cur.total += t.amount;
        cur.count += 1;
        map.set(t.category, cur);
      }
    }
    return map;
  }, [monthTxs]);

  // Build the hierarchical structure
  const hierarchyTree = useMemo(() => {
    return Object.entries(PILLAR_DEFINITIONS).map(([pillarKey, pillar]) => {
      let pillarTotal = 0;
      let pillarCount = 0;

      // Map each group under this pillar
      const groupNodes = pillar.groups.map(groupName => {
        let groupTotal = 0;
        let groupCount = 0;

        // Categories belonging to this group
        let memberCats: string[] = [];
        if (groupName === 'Investments' || groupName === 'Wealth Building') {
          memberCats = ['SIP', 'Mutual Funds', 'PPF', 'NPS', 'Stocks', 'Gold / SGB', 'LIC', 'FD', 'RD'];
        } else if (groups) {
          const foundGroup = groups.find(g => g.name === groupName);
          if (foundGroup?.categories) {
            memberCats = foundGroup.categories;
          }
        }

        // If no group match found, fallback to heuristic
        if (memberCats.length === 0) {
          if (groupName === 'Family Support') memberCats = ['Family Support', 'MOM Support', 'Ankita Expense', 'Sis Expense'];
          else if (groupName === 'Kitchen & Grocery') memberCats = ['Kitchen Item', 'Grocery', 'Vegetables', 'Milk & Daily'];
          else if (groupName === 'Health') memberCats = ['Health', 'Medicines', 'Doctor Consult', 'Hospital'];
          else if (groupName === 'Home & Bills') memberCats = ['Home & Bills', 'Electricity', 'Water', 'Internet', 'House Rent'];
          else if (groupName === 'Loans & EMI') memberCats = ['EMI', 'Personal Loan EMI', 'Home Loan EMI', 'Vehicle Loan EMI'];
          else if (groupName === 'Personal & Shopping') memberCats = ['Personal Expense', 'Clothing', 'Electronics', 'Personal Care'];
          else if (groupName === 'Food Outside') memberCats = ['Food Outside', 'Dining Out', 'Zomato / Swiggy', 'Coffee'];
          else if (groupName === 'Travel & Transport') memberCats = ['Petrol', 'Fuel', 'Cab & Auto', 'Bus / Train', 'Vehicle Service'];
          else if (groupName === 'Social & Giving') memberCats = ['Gift', 'Donation', 'Religious', 'Celebration'];
          else memberCats = ['Other', 'General', 'Miscellaneous'];
        }

        // Category breakdown
        const categoryNodes = memberCats.map(catName => {
          const stat = categorySpends.get(catName) || { total: 0, count: 0 };
          groupTotal += stat.total;
          groupCount += stat.count;

          return {
            id: `cat-${catName}`,
            name: catName,
            total: stat.total,
            count: stat.count,
            percent: totalOutflow > 0 ? (stat.total / totalOutflow) * 100 : 0,
          };
        });

        pillarTotal += groupTotal;
        pillarCount += groupCount;

        return {
          id: `grp-${groupName}`,
          name: groupName,
          total: groupTotal,
          count: groupCount,
          percent: totalOutflow > 0 ? (groupTotal / totalOutflow) * 100 : 0,
          categories: categoryNodes,
        };
      });

      return {
        id: `pillar-${pillarKey}`,
        key: pillarKey,
        ...pillar,
        total: pillarTotal,
        count: pillarCount,
        percent: totalOutflow > 0 ? (pillarTotal / totalOutflow) * 100 : 0,
        groups: groupNodes,
      };
    });
  }, [PILLAR_DEFINITIONS, groups, categorySpends, totalOutflow]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3.5 sm:px-6 py-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400">
              <GitFork className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Expense Hierarchy & Tree
            </h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Visual 3-level financial tree: Financial Pillars (50/30/20) → Master Groups → Individual Categories
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveScreen('budget')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 shadow-2xs"
          >
            <PieChartIcon className="w-4 h-4 text-emerald-600" />
            <span>Manage Budgets</span>
          </button>
          <button
            onClick={() => setActiveScreen('categories')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
          >
            <Sliders className="w-4 h-4" />
            <span>Configure Categories</span>
          </button>
        </div>
      </div>

      {/* 50/30/20 Rule Benchmark Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {hierarchyTree.slice(0, 4).map(pillar => {
          const isOver = pillar.targetPercent > 0 && pillar.percent > pillar.targetPercent;
          return (
            <div
              key={pillar.id}
              className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs relative overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: pillar.color }}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200 truncate">
                  {pillar.title.split('(')[0]}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold">
                  Target {pillar.targetPercent}%
                </span>
              </div>

              <div className="mt-2 flex items-baseline justify-between">
                <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {formatINR(pillar.total)}
                </div>
                <div className={`text-xs font-bold font-mono ${isOver ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {pillar.percent.toFixed(1)}%
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-2 h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, pillar.percent)}%`,
                    backgroundColor: pillar.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* The Hierarchical Interactive Tree */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <GitFork className="w-4 h-4 text-purple-600" />
            <span>Outflow Allocation Tree ({activeMonthKey})</span>
          </div>
          <span className="text-xs font-mono font-bold text-zinc-600 dark:text-zinc-300">
            Total Outflow: {formatINR(totalOutflow)}
          </span>
        </div>

        <div className="space-y-4">
          {hierarchyTree.map(pillar => {
            const isPillarOpen = expandedNodes[pillar.id] ?? true;

            return (
              <div
                key={pillar.id}
                className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-zinc-50/50 dark:bg-zinc-900/50"
              >
                {/* Pillar Header */}
                <div
                  onClick={() => toggleNode(pillar.id)}
                  className="p-3.5 bg-zinc-100/70 dark:bg-zinc-800/60 cursor-pointer flex items-center justify-between hover:bg-zinc-100 transition select-none"
                >
                  <div className="flex items-center gap-3">
                    <button className="text-zinc-500">
                      {isPillarOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: pillar.color }}
                    />
                    <div>
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {pillar.title}
                      </h3>
                      <p className="text-[10px] text-zinc-400 hidden sm:block">
                        {pillar.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 block">
                      {formatINR(pillar.total)}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {pillar.percent.toFixed(1)}% of total
                    </span>
                  </div>
                </div>

                {/* Groups list */}
                {isPillarOpen && (
                  <div className="p-3 space-y-2.5">
                    {pillar.groups.map(group => {
                      const isGroupOpen = expandedNodes[group.id] ?? false;

                      return (
                        <div
                          key={group.id}
                          className="border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl bg-white dark:bg-zinc-900 overflow-hidden ml-2 sm:ml-5"
                        >
                          {/* Group Row */}
                          <div
                            onClick={() => toggleNode(group.id)}
                            className="p-3 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition select-none"
                          >
                            <div className="flex items-center gap-2.5">
                              <button className="text-zinc-400">
                                {isGroupOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </button>
                              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                {group.name}
                              </span>
                              <span className="text-[10px] text-zinc-400">
                                ({group.categories.length} categories)
                              </span>
                            </div>

                            <div className="text-right flex items-center gap-3">
                              <div>
                                <span className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 block">
                                  {formatINR(group.total)}
                                </span>
                                <span className="text-[10px] text-zinc-400">
                                  {group.percent.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Categories Sub-tree */}
                          {isGroupOpen && (
                            <div className="border-t border-zinc-100 dark:divide-zinc-800 divide-y divide-zinc-100 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-950/30 pl-6 sm:pl-8">
                              {group.categories.map((cat, catIdx) => (
                                <div
                                  key={`${cat.name}-${catIdx}`}
                                  className="p-2.5 flex items-center justify-between hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition pr-4"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                                    <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                                      {cat.name}
                                    </span>
                                    <span className="text-[10px] text-zinc-400">
                                      ({cat.count} tx)
                                    </span>
                                  </div>

                                  <div className="text-right flex items-center gap-3">
                                    <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100">
                                      {formatINR(cat.total)}
                                    </span>
                                    <span className="text-[10px] text-zinc-400 w-12 text-right">
                                      {cat.percent.toFixed(1)}%
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
