import React, { useState, useMemo } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  Calculator,
  TrendingUp,
  AlertTriangle,
  Shield,
  Coins,
  CheckCircle2,
  HelpCircle,
  PieChart,
  ArrowRight,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR, formatCompactINR } from '../../utils/formatters';

interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  metrics?: Array<{ label: string; value: string; color?: string }>;
  action?: { label: string; screen: string };
}

export const AssistantScreen: React.FC = () => {
  const {
    transactions,
    activeMonthKey,
    loans,
    investments,
    cards,
    accounts,
    settings,
    todayDateStr,
    setActiveScreen,
  } = useFinance();

  const [inputQuery, setInputQuery] = useState('');

  // Active month calculation
  const monthTxs = useMemo(
    () => transactions.filter(t => t.date.startsWith(activeMonthKey)),
    [transactions, activeMonthKey]
  );

  const curIncome = useMemo(
    () => monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [monthTxs]
  );
  const curSpending = useMemo(
    () => monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [monthTxs]
  );
  const curInvested = useMemo(
    () => monthTxs.filter(t => t.type === 'invest').reduce((s, t) => s + t.amount, 0),
    [monthTxs]
  );
  const curLeft = curIncome - curSpending - curInvested;
  const curOutflow = curSpending + curInvested;
  const savingsRate = curIncome > 0 ? ((curInvested / curIncome) * 100).toFixed(1) : '0';

  // Calculator states
  const [calcTab, setCalcTab] = useState<'sip' | 'prepay'>('sip');
  const [sipMonthly, setSipMonthly] = useState('10000');
  const [sipYears, setSipYears] = useState('10');
  const [sipRate, setSipRate] = useState('12');

  const sipResult = useMemo(() => {
    const P = Number(sipMonthly) || 0;
    const n = (Number(sipYears) || 0) * 12;
    const i = (Number(sipRate) || 0) / 12 / 100;
    if (i <= 0 || n <= 0) return { invested: 0, maturity: 0, returns: 0 };
    const maturity = P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
    const invested = P * n;
    return {
      invested: Math.round(invested),
      maturity: Math.round(maturity),
      returns: Math.round(maturity - invested),
    };
  }, [sipMonthly, sipYears, sipRate]);

  // Initial messages
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: `Hello! I am your personal FinWise AI financial assistant. For **${activeMonthKey}**, your recorded income is **${formatINR(curIncome)}**, spends are **${formatINR(curSpending)}**, and you invested **${formatINR(curInvested)}**. How can I assist you with your money today?`,
      timestamp: 'Just now',
      metrics: [
        { label: 'Income', value: formatINR(curIncome), color: 'text-emerald-600' },
        { label: 'Spending', value: formatINR(curSpending), color: 'text-rose-600' },
        { label: 'Invested', value: formatINR(curInvested), color: 'text-blue-600' },
        { label: 'Savings Rate', value: `${savingsRate}%`, color: 'text-purple-600' },
      ],
    },
  ]);

  const handleQuery = (queryText: string) => {
    const q = queryText.toLowerCase().trim();
    if (!q) return;

    const userMsg: AssistantMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: queryText,
      timestamp: 'Just now',
    };

    let replyText = '';
    let replyMetrics: AssistantMessage['metrics'] = undefined;
    let replyAction: AssistantMessage['action'] = undefined;

    if (q.includes('budget') || q.includes('over')) {
      // Find over budget categories
      const overCats: string[] = [];
      const spends: Record<string, number> = {};
      for (const t of monthTxs) {
        if (t.type === 'expense') spends[t.category] = (spends[t.category] || 0) + t.amount;
      }
      for (const b of settings.budgets) {
        const spent = b.categories.reduce((sum, c) => sum + (spends[c] || 0), 0);
        if (spent > b.limit) {
          overCats.push(`${b.name} (Spent ${formatINR(spent)} vs limit ${formatINR(b.limit)})`);
        }
      }
      if (overCats.length > 0) {
        replyText = `You currently have ${overCats.length} category budgets exceeding their limit in ${activeMonthKey}:\n` +
          overCats.map(c => `• ${c}`).join('\n') +
          `\nConsider curbing discretionary spends in these buckets.`;
        replyAction = { label: 'Open Budget Screen', screen: 'budget' };
      } else {
        replyText = `Great news! All your tracked categories are currently within their assigned budget limits for ${activeMonthKey}.`;
      }
    } else if (q.includes('emi') || q.includes('loan') || q.includes('debt')) {
      const totalOutstanding = loans.reduce((s, l) => s + (l.direction === 'borrowed' ? l.outstanding : 0), 0);
      const monthlyEmi = loans.reduce((s, l) => s + (l.direction === 'borrowed' ? l.emi : 0), 0);
      replyText = `You have ${loans.filter(l => l.direction === 'borrowed').length} active borrowed loans with a total outstanding principal of ${formatINR(totalOutstanding)}. Your cumulative monthly EMI commitment is ${formatINR(monthlyEmi)}.`;
      replyMetrics = [
        { label: 'Total Loan Principal', value: formatINR(totalOutstanding), color: 'text-rose-600' },
        { label: 'Monthly EMI Outflow', value: formatINR(monthlyEmi), color: 'text-amber-600' },
      ];
      replyAction = { label: 'View EMI Manager', screen: 'emiManager' };
    } else if (q.includes('save') || q.includes('savings') || q.includes('invest')) {
      replyText = `In ${activeMonthKey}, your investment savings rate stands at ${savingsRate}% (${formatINR(curInvested)} invested from ${formatINR(curIncome)} income). To reach financial freedom earlier, aim for a savings rate of 30% to 50%.`;
      replyMetrics = [
        { label: 'Current Savings Rate', value: `${savingsRate}%`, color: 'text-emerald-600' },
        { label: 'Total Invested', value: formatINR(curInvested), color: 'text-blue-600' },
      ];
      replyAction = { label: 'Open Future Target', screen: 'futureTarget' };
    } else if (q.includes('account') || q.includes('cash') || q.includes('bank')) {
      const totalBalance = accounts.reduce((s, a) => s + a.openingBalance, 0);
      replyText = `You have ${accounts.length} linked accounts across bank, cash, and digital wallets with an aggregate opening balance of ${formatINR(totalBalance)}.`;
      replyAction = { label: 'View Accounts & Cash', screen: 'accounts' };
    } else {
      replyText = `Based on your records for ${activeMonthKey}:\n• Total Inflow: ${formatINR(curIncome)}\n• Total Outflow: ${formatINR(curOutflow)}\n• Net Balance: ${formatINR(curLeft)}\n• Active Investments: ${investments.length} portfolios\n• Active Loans: ${loans.length} facilities.\nLet me know if you would like me to analyze any specific area!`;
      replyAction = { label: 'Explore Future Targets', screen: 'futureTarget' };
    }

    const assistantMsg: AssistantMessage = {
      id: String(Date.now() + 1),
      sender: 'assistant',
      text: replyText,
      timestamp: 'Just now',
      metrics: replyMetrics,
      action: replyAction,
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInputQuery('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3.5 sm:px-6 py-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <Bot className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">
              AI Financial Assistant
            </h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Real-time analytics, instant answers, budget anomaly checks, and wealth calculators
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleQuery('Monthly Financial Health & Scorecard')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 text-xs font-bold text-zinc-700 hover:bg-zinc-200 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Health Check</span>
          </button>
        </div>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: 'Budget Check', query: 'Which categories exceeded budget this month?' },
          { label: 'Loans & EMI', query: 'What is my current total loan debt and EMI obligation?' },
          { label: 'Savings Rate', query: 'How can I optimize my savings rate and investments?' },
          { label: 'Cash & Accounts', query: 'What is my overall bank and cash position?' },
        ].map((btn, idx) => (
          <button
            key={idx}
            onClick={() => handleQuery(btn.query)}
            className="p-3 rounded-2xl bg-white border border-zinc-200 hover:border-emerald-500 text-left transition shadow-2xs group"
          >
            <span className="text-xs font-bold text-zinc-800 group-hover:text-emerald-600 block">
              {btn.label}
            </span>
            <span className="text-[10px] text-zinc-400 block truncate mt-0.5">
              {btn.query}
            </span>
          </button>
        ))}
      </div>

      {/* Main Grid: Chat Left + Calculators Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-xs flex flex-col h-[520px]">
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs space-y-2 ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-none'
                      : 'bg-zinc-50 border border-zinc-200/80 text-zinc-800 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

                  {/* Metrics preview */}
                  {msg.metrics && (
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-200">
                      {msg.metrics.map((m, i) => (
                        <div key={i} className="p-2 rounded-xl bg-white border border-zinc-200">
                          <span className="text-[10px] text-zinc-400 block">{m.label}</span>
                          <span className={`text-xs font-mono font-bold block ${m.color || ''}`}>
                            {m.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action link */}
                  {msg.action && (
                    <button
                      onClick={() => setActiveScreen(msg.action!.screen as any)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 hover:underline pt-1"
                    >
                      <span>{msg.action.label}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Chat input */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleQuery(inputQuery);
            }}
            className="p-3 border-t border-zinc-200 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask anything about your income, spending, EMIs, or targets..."
              value={inputQuery}
              onChange={e => setInputQuery(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim()}
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-xs transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Financial Calculators Card (1 col) */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                SIP Compounding Calculator
              </h3>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 mb-1">Monthly Investment (₹)</label>
              <input
                type="number"
                value={sipMonthly}
                onChange={e => setSipMonthly(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 mb-1">Time Horizon (Years)</label>
              <input
                type="number"
                value={sipYears}
                onChange={e => setSipYears(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 mb-1">Expected Return (% p.a.)</label>
              <input
                type="number"
                value={sipRate}
                onChange={e => setSipRate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 font-mono"
              />
            </div>
          </div>

          {/* Calculator Output */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Total Invested:</span>
              <span className="font-mono font-bold text-zinc-800">
                {formatINR(sipResult.invested)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Wealth Gained:</span>
              <span className="font-mono font-bold text-emerald-600">
                +{formatINR(sipResult.returns)}
              </span>
            </div>
            <div className="border-t border-emerald-200 pt-2 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900">Maturity Corpus:</span>
              <span className="text-base font-bold font-mono text-emerald-600">
                {formatINR(sipResult.maturity)}
              </span>
            </div>
          </div>

          <button
            onClick={() => setActiveScreen('futureTarget')}
            className="w-full py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-zinc-800 text-white text-xs font-bold transition shadow-xs"
          >
            Save as Future Target Goal
          </button>
        </div>
      </div>
    </div>
  );
};
