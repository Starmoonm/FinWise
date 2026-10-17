import React from 'react';
import {
  Link2,
  Wallet,
  Tag,
  CreditCard as CreditCardIcon,
  Landmark,
  Coins,
  Target,
  Shield,
  Repeat,
  Users,
  PieChart,
  Calendar,
  ArrowRight,
  Database,
  ExternalLink,
} from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatINR } from '../../utils/formatters';
import { Category, Budget } from '../../types';

export type LinkedEntityType =
  | 'transaction'
  | 'category'
  | 'account'
  | 'card'
  | 'loan'
  | 'investment'
  | 'goal'
  | 'insurance'
  | 'asset'
  | 'recurring'
  | 'member'
  | 'budget';

interface LinkedItem {
  id: string;
  type: LinkedEntityType;
  title: string;
  subtitle?: string;
  amount?: number;
  badge?: string;
  badgeColor?: string;
  screenTarget: string;
}

interface LinkedPanelProps {
  entityType: LinkedEntityType;
  entityId: string;
  title?: string;
  className?: string;
}

export const LinkedPanel: React.FC<LinkedPanelProps> = ({
  entityType,
  entityId,
  title = 'Linked Records',
  className = '',
}) => {
  const {
    transactions,
    loans,
    investments,
    goals,
    cards,
    accounts,
    recurringItems,
    budgets,
    categories,
    members,
    insurance,
    setActiveScreen,
  } = useFinanceStore();

  const linkedItems: LinkedItem[] = React.useMemo(() => {
    const list: LinkedItem[] = [];

    if (entityType === 'loan') {
      const loan = loans.find(l => l.id === entityId || l.name === entityId);
      if (!loan) return list;

      // 1. Linked EMI transactions
      const loanTxs = transactions.filter(t => t.loanId === loan.id || (t.category === 'EMI' && loan.direction === 'borrowed'));
      const totalPaid = loanTxs.reduce((sum, t) => sum + t.amount, 0);
      list.push({
        id: `txs_${loan.id}`,
        type: 'transaction',
        title: `${loanTxs.length} EMI Transactions Recorded`,
        subtitle: `Total repayments: ${formatINR(totalPaid)}`,
        amount: totalPaid,
        badge: `${loanTxs.length} entries`,
        badgeColor: 'bg-emerald-100 text-emerald-800',
        screenTarget: 'entries',
      });

      // 2. Linked Recurring / AutoPay item
      const rec = recurringItems.find(r => r.linkedLoanId === loan.id || r.title.toLowerCase().includes('emi'));
      if (rec) {
        list.push({
          id: rec.id,
          type: 'recurring',
          title: `AutoPay / Recurring: ${rec.title}`,
          subtitle: `Next due: ${rec.nextDate} (${formatINR(rec.amount)})`,
          amount: rec.amount,
          badge: rec.autoCreate ? 'AutoPay Active' : 'Manual Reminder',
          badgeColor: 'bg-blue-100 text-blue-800',
          screenTarget: 'recurring',
        });
      }

      // 3. Linked Budget
      const emiBudget = budgets.find(b => b.name === 'EMI' || b.categories.includes('EMI'));
      if (emiBudget) {
        list.push({
          id: emiBudget.name,
          type: 'budget',
          title: `Budget: ${emiBudget.name}`,
          subtitle: `Limit: ${formatINR(emiBudget.limit)}`,
          amount: emiBudget.limit,
          badge: 'Budget Impact',
          badgeColor: 'bg-amber-100 text-amber-800',
          screenTarget: 'budget',
        });
      }

      // 4. Linked Schedule / EMI Manager
      list.push({
        id: `emi_sched_${loan.id}`,
        type: 'loan',
        title: `Amortisation Schedule & Prepayment`,
        subtitle: `${loan.totalEmis - (loan.paidEmis || 0)} EMIs remaining · Rate: ${loan.interestRate || 11.5}%`,
        badge: 'EMI Manager',
        badgeColor: 'bg-purple-100 text-purple-800',
        screenTarget: 'emiManager',
      });
    } else if (entityType === 'transaction') {
      const tx = transactions.find(t => t.id === entityId);
      if (!tx) return list;

      // Category
      const cat = categories.find(c => c.id === tx.categoryId || c.name === tx.category);
      if (cat) {
        list.push({
          id: cat.id,
          type: 'category',
          title: `Category: ${cat.name}`,
          subtitle: `Type: ${cat.type}`,
          badge: 'Category',
          badgeColor: 'bg-zinc-100 text-zinc-800',
          screenTarget: 'categories',
        });
      }

      // Paying Account
      const acc = accounts.find(a => a.id === tx.accountId);
      if (acc) {
        list.push({
          id: acc.id,
          type: 'account',
          title: `Account: ${acc.name}`,
          subtitle: `Kind: ${acc.kind}`,
          badge: 'Ledger Account',
          badgeColor: 'bg-blue-100 text-blue-800',
          screenTarget: 'accounts',
        });
      }

      // Member
      const mem = members.find(m => m.id === tx.memberId || m.name === tx.memberId);
      if (mem) {
        list.push({
          id: mem.id,
          type: 'member',
          title: `Family Member: ${mem.name}`,
          subtitle: mem.relation,
          badge: 'Member',
          badgeColor: 'bg-emerald-100 text-emerald-800',
          screenTarget: 'family',
        });
      }

      // Linked Loan
      if (tx.loanId) {
        const loan = loans.find(l => l.id === tx.loanId);
        if (loan) {
          list.push({
            id: loan.id,
            type: 'loan',
            title: `Loan: ${loan.name}`,
            subtitle: `Repayment entry`,
            badge: 'Loan Link',
            badgeColor: 'bg-rose-100 text-rose-800',
            screenTarget: 'loans',
          });
        }
      }

      // Linked Investment
      if (tx.investmentId) {
        const inv = investments.find(i => i.id === tx.investmentId);
        if (inv) {
          list.push({
            id: inv.id,
            type: 'investment',
            title: `Investment: ${inv.name}`,
            subtitle: inv.type,
            badge: 'Portfolio Holding',
            badgeColor: 'bg-purple-100 text-purple-800',
            screenTarget: 'investments',
          });
        }
      }

      // Linked Goal
      if (tx.goalId) {
        const goal = goals.find(g => g.id === tx.goalId);
        if (goal) {
          list.push({
            id: goal.id,
            type: 'goal',
            title: `Goal: ${goal.name}`,
            subtitle: `Target: ${formatINR(goal.target)}`,
            badge: 'Target Link',
            badgeColor: 'bg-amber-100 text-amber-800',
            screenTarget: 'futureTarget',
          });
        }
      }
    } else if (entityType === 'investment') {
      const inv = investments.find(i => i.id === entityId || i.name === entityId);
      if (!inv) return list;

      // Transactions
      const invTxs = transactions.filter(t => t.investmentId === inv.id || t.category === inv.name);
      const sumInvested = invTxs.reduce((s, t) => s + t.amount, 0);
      list.push({
        id: `inv_txs_${inv.id}`,
        type: 'transaction',
        title: `${invTxs.length} Linked Invest Entries`,
        subtitle: `Total cumulative invested: ${formatINR(sumInvested)}`,
        amount: sumInvested,
        badge: 'Transactions',
        badgeColor: 'bg-emerald-100 text-emerald-800',
        screenTarget: 'entries',
      });

      // Recurring SIP
      const rec = recurringItems.find(r => r.linkedInvestmentId === inv.id || r.title === inv.name);
      if (rec) {
        list.push({
          id: rec.id,
          type: 'recurring',
          title: `AutoPay SIP: ${rec.title}`,
          subtitle: `Next date: ${rec.nextDate}`,
          badge: 'AutoPay SIP',
          badgeColor: 'bg-blue-100 text-blue-800',
          screenTarget: 'recurring',
        });
      }

      // Tax Section 80C if LIC or ELSS
      if (inv.type.includes('LIC') || inv.name.includes('LIC') || inv.type.includes('PPF')) {
        list.push({
          id: 'tax_80c',
          type: 'investment',
          title: 'Tax Deduction Section 80C',
          subtitle: 'Eligible investment under ₹1.5L cap',
          badge: 'Tax Deduction',
          badgeColor: 'bg-purple-100 text-purple-800',
          screenTarget: 'taxPlanner',
        });
      }
    } else if (entityType === 'goal') {
      const goal = goals.find(g => g.id === entityId || g.name === entityId);
      if (!goal) return list;

      const goalTxs = transactions.filter(t => t.goalId === goal.id || t.category === 'Goal Savings');
      const sumSaved = goalTxs.reduce((s, t) => s + t.amount, 0);
      list.push({
        id: `goal_txs_${goal.id}`,
        type: 'transaction',
        title: `${goalTxs.length} Contribution Entries`,
        subtitle: `Total contributed: ${formatINR(sumSaved)}`,
        amount: sumSaved,
        badge: 'Contributions',
        badgeColor: 'bg-amber-100 text-amber-800',
        screenTarget: 'entries',
      });

      list.push({
        id: 'ft_roadmap',
        type: 'goal',
        title: 'Future Target Health Analysis',
        subtitle: 'Target roadmap & emergency reserve index',
        badge: 'Health Score',
        badgeColor: 'bg-emerald-100 text-emerald-800',
        screenTarget: 'futureTarget',
      });
    } else if (entityType === 'account') {
      const acc = accounts.find(a => a.id === entityId);
      if (!acc) return list;

      const accTxs = transactions.filter(t => t.accountId === acc.id || t.toAccountId === acc.id);
      list.push({
        id: `acc_txs_${acc.id}`,
        type: 'transaction',
        title: `${accTxs.length} Transactions Linked`,
        subtitle: 'Inflow & outflow on this ledger account',
        badge: 'Ledger',
        badgeColor: 'bg-blue-100 text-blue-800',
        screenTarget: 'entries',
      });

      const linkedCards = cards.filter(c => c.name.toLowerCase().includes(acc.kind));
      if (linkedCards.length > 0) {
        list.push({
          id: linkedCards[0].id,
          type: 'card',
          title: `Credit Card: ${linkedCards[0].name}`,
          subtitle: `Settlement account`,
          badge: 'Card Settlement',
          badgeColor: 'bg-zinc-100 text-zinc-800',
          screenTarget: 'cards',
        });
      }
    } else if (entityType === 'card') {
      const card = cards.find(c => c.id === entityId);
      if (!card) return list;

      const cardTxs = transactions.filter(t => t.cardId === card.id || t.mode === 'Credit Card');
      list.push({
        id: `card_txs_${card.id}`,
        type: 'transaction',
        title: `${cardTxs.length} Spends & Bill Payments`,
        subtitle: `Outstanding: ${formatINR(card.openingOutstanding)}`,
        badge: 'Transactions',
        badgeColor: 'bg-rose-100 text-rose-800',
        screenTarget: 'entries',
      });
    } else if (entityType === 'category') {
      const cat = categories.find(c => c.id === entityId || c.name === entityId);
      if (!cat) return list;

      const catTxs = transactions.filter(t => t.categoryId === cat.id || t.category === cat.name);
      const totalSpent = catTxs.reduce((s, t) => s + t.amount, 0);
      list.push({
        id: `cat_txs_${cat.id}`,
        type: 'transaction',
        title: `${catTxs.length} Transactions Recorded`,
        subtitle: `Total cumulative: ${formatINR(totalSpent)}`,
        amount: totalSpent,
        badge: 'Entries',
        badgeColor: 'bg-emerald-100 text-emerald-800',
        screenTarget: 'entries',
      });

      const bud = budgets.find(b => b.categories.includes(cat.name) || b.categoryIds?.includes(cat.id));
      if (bud) {
        list.push({
          id: bud.name,
          type: 'budget',
          title: `Budget: ${bud.name}`,
          subtitle: `Limit: ${formatINR(bud.limit)}`,
          badge: 'Budget Limit',
          badgeColor: 'bg-amber-100 text-amber-800',
          screenTarget: 'budget',
        });
      }
    }

    return list;
  }, [
    entityType,
    entityId,
    transactions,
    loans,
    investments,
    goals,
    cards,
    accounts,
    recurringItems,
    budgets,
    categories,
    members,
    insurance,
  ]);

  if (linkedItems.length === 0) return null;

  const getEntityIcon = (type: LinkedEntityType) => {
    switch (type) {
      case 'loan':
        return Landmark;
      case 'investment':
        return Coins;
      case 'goal':
        return Target;
      case 'account':
        return Wallet;
      case 'card':
        return CreditCardIcon;
      case 'recurring':
        return Repeat;
      case 'budget':
        return PieChart;
      case 'member':
        return Users;
      case 'category':
        return Tag;
      case 'insurance':
        return Shield;
      default:
        return Link2;
    }
  };

  return (
    <div
      className={`p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/70 space-y-2.5 ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5 text-emerald-600" />
          {title} ({linkedItems.length})
        </span>
        <span className="text-[10px] text-zinc-400">Interlinked Live Data</span>
      </div>

      <div className="space-y-1.5">
        {linkedItems.map(item => {
          const Icon = getEntityIcon(item.type);
          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.screenTarget as any)}
              className="w-full p-2 rounded-lg bg-white border border-zinc-200 hover:border-emerald-500 hover:shadow-2xs text-left flex items-center justify-between gap-2 transition group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded-md bg-zinc-100 text-zinc-600 group-hover:text-emerald-600">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-zinc-900 truncate group-hover:text-emerald-600 flex items-center gap-1.5">
                    <span>{item.title}</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600" />
                  </div>
                  {item.subtitle && (
                    <div className="text-[10px] text-zinc-400 truncate">{item.subtitle}</div>
                  )}
                </div>
              </div>

              {item.badge && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${item.badgeColor || 'bg-zinc-100 text-zinc-700'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
