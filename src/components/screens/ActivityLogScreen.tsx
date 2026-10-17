import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Edit2,
  Plus,
  Coins,
  CreditCard,
  Wallet,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../utils/formatters';

export const ActivityLogScreen: React.FC = () => {
  const { transactions, loans, investments, recurringItems, setActiveScreen } = useFinance();

  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Generate real audit activity items from records
  const activities = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      description: string;
      date: string;
      type: 'transaction' | 'loan' | 'investment' | 'recurring';
      amount?: number;
      action: 'created' | 'paid' | 'scheduled';
    }> = [];

    // Transactions
    for (const t of transactions) {
      list.push({
        id: `act_tx_${t.id}`,
        title: `${t.type === 'income' ? 'Income Received' : t.type === 'invest' ? 'Investment Added' : 'Spend Recorded'}: ${t.category}`,
        description: `${t.mode} · ${t.note || t.payee || 'Direct transaction recorded'}`,
        date: t.date,
        type: 'transaction',
        amount: t.amount,
        action: 'created',
      });
    }

    // Loans
    for (const l of loans) {
      list.push({
        id: `act_loan_${l.id}`,
        title: `Loan Facility: ${l.name}`,
        description: `${l.direction === 'borrowed' ? 'Borrowed' : 'Lent'} · Principal: ${formatINR(l.principal)} · EMI: ${formatINR(l.emi)}`,
        date: l.firstEmiDate || '2026-10-01',
        type: 'loan',
        amount: l.outstanding,
        action: 'created',
      });
    }

    // Recurring items
    for (const r of recurringItems) {
      list.push({
        id: `act_rec_${r.id}`,
        title: `AutoPay / Recurring Rule: ${r.title}`,
        description: `Frequency: ${r.frequency} · Next scheduled: ${r.nextDate}`,
        date: r.nextDate,
        type: 'recurring',
        amount: r.amount,
        action: 'scheduled',
      });
    }

    // Sort descending by date
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, loans, recurringItems]);

  const filteredActivities = useMemo(() => {
    return activities.filter(a => {
      if (filterType !== 'all' && a.type !== filterType) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [activities, filterType, search]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3.5 sm:px-6 py-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <History className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">
              Activity & Audit Log
            </h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Complete audit trail of ledger entries, loan commitments, and recurring AutoPay events
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-zinc-100 text-zinc-600">
            {filteredActivities.length} Events Logged
          </span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="p-3 bg-white rounded-2xl border border-zinc-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search activity description or category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900"
          />
        </div>

        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
          {[
            { id: 'all', label: 'All' },
            { id: 'transaction', label: 'Transactions' },
            { id: 'loan', label: 'Loans' },
            { id: 'recurring', label: 'AutoPay' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterType === tab.id
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline List */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs divide-y divide-zinc-100">
        {filteredActivities.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-400">
            No activity matches your query.
          </div>
        ) : (
          filteredActivities.map((act, idx) => (
            <div key={`${act.id}-${idx}`} className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-50/50 transition">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    act.type === 'transaction'
                      ? 'bg-emerald-100 text-emerald-700'
                      : act.type === 'loan'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {act.type === 'transaction' ? (
                    <Wallet className="w-4 h-4" />
                  ) : act.type === 'loan' ? (
                    <CreditCard className="w-4 h-4" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-xs font-bold text-zinc-900 truncate">
                    {act.title}
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    {act.description}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                {act.amount !== undefined && (
                  <div className="text-xs font-mono font-bold text-zinc-900">
                    {formatINR(act.amount)}
                  </div>
                )}
                <div className="text-[10px] text-zinc-400 font-mono">
                  {act.date}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
