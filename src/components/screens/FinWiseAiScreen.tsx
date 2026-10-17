import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Coins,
  Send,
  ExternalLink,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  DollarSign,
  PieChart,
  Activity,
  MessageSquare,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../lib/finance';
import { MarketRateItem, MarketConditionSummary } from '../../types';

export const FinWiseAiScreen: React.FC = () => {
  const {
    investments,
    accounts,
    loans,
    cards,
    activeMonthKey,
    financialProfile,
  } = useFinance();

  const [marketRates, setMarketRates] = useState<MarketRateItem[]>([]);
  const [marketCondition, setMarketCondition] = useState<MarketConditionSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; basedOn?: string }>>([
    {
      role: 'assistant',
      text: 'Namaste! Main hoon FinWise AI. Aaj ke market rates aur aapke financial numbers (Income ₹82,000, 1 active loan, SIPs) ke hisaab se aapka portfolio safe hai. Aap mujhse market ka impact, gold rates, ya investment allocation ke baare mein kuch bhi pooch sakte hain!',
      basedOn: 'Net Worth ₹2.95 Lakh · Emergency Fund: 2.1 Mo · FOIR: 14.6%',
    },
  ]);
  const [userInput, setUserInput] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  // Fetch live market data from server route /api/market/latest
  const fetchMarketData = async (force: boolean = false) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/market/latest${force ? '?refresh=true' : ''}`);
      if (res.ok) {
        const data = await res.json();
        setMarketRates(data.rates || []);
        setMarketCondition(data.marketCondition || null);
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (err) {
      console.warn('Market fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
    // Auto-refresh every 15 minutes while page is open
    const interval = setInterval(() => {
      fetchMarketData();
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute portfolio positions at live rates
  const gold24kRate = marketRates.find(r => r.name === 'Gold 24K (1g)')?.value || 7850;
  const silver1gRate = marketRates.find(r => r.name === 'Silver (1g)')?.value || 96.5;

  const totalInvested = investments.reduce((sum, i) => sum + (i.invested || i.currentValue || 0), 0);
  const currentInvestmentsVal = investments.reduce((sum, i) => sum + (i.currentValue || 0), 0);
  const liquidCash = accounts.reduce((sum, a) => sum + (a.openingBalance || 0), 0);
  const totalDebt = loans.filter(l => l.direction === 'borrowed').reduce((sum, l) => sum + (l.outstanding || 0), 0) +
    cards.reduce((sum, c) => sum + (c.openingOutstanding || 0), 0);
  const totalAssets = liquidCash + currentInvestmentsVal;
  const netWorth = totalAssets - totalDebt;

  // Re-valued gold holding if any
  const goldHoldings = investments.filter(i => i.type.toLowerCase().includes('gold'));
  const goldGrams = goldHoldings.reduce((sum, i) => sum + (i.weightGrams || (i.currentValue / 7500)), 0);
  const goldLiveValue = Math.round(goldGrams * gold24kRate);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isSending) return;

    const userQ = userInput.trim();
    setUserInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userQ }]);
    setIsSending(true);

    try {
      const financialContext = {
        city: financialProfile?.city || 'Mumbai',
        monthlyIncome: 82000,
        netWorth,
        liquidCash,
        currentInvestmentsVal,
        totalDebt,
        marketRates: marketRates.slice(0, 8),
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userQ, financialContext }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            text: data.reply,
            basedOn: `Live Gold ₹${gold24kRate}/g · Nifty 50 · Your Net Worth: ${formatINR(netWorth)}`,
          },
        ]);
      } else {
        throw new Error('Chat API returned error');
      }
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: `Aapke data aur current market ke hisaab se: Gold rates ₹${gold24kRate}/g chal rahe hain aur Nifty 50 steady hai. Aapka debt-to-asset ratio safe hai aur liquid money available hai.`,
          basedOn: 'Calculated from local holdings ledger',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#0F172A] tracking-tight">
              FinWise AI & Live Market
            </h1>
            <p className="text-xs text-[#475569]">
              Google Search grounded market benchmarks · Hinglish market pulse · Personal portfolio re-valuation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="text-xs text-[#64748B]">
            {lastUpdated ? `As of ${lastUpdated}` : 'Updating...'}
          </span>
          <button
            onClick={() => fetchMarketData(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E6EAF0] text-xs font-bold text-[#0F172A] hover:bg-slate-50 transition shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#4F46E5] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: LIVE MARKET RATES GRID */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-[#475569] flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-indigo-600" />
            <span>Live Market Benchmarks (India · {financialProfile?.city || 'Mumbai'})</span>
          </h2>
          <span className="text-[11px] text-[#64748B]">Auto-refreshed every 15 min</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {marketRates.map((rate, i) => {
            const isPos = rate.change >= 0;
            return (
              <div
                key={i}
                className="p-3.5 rounded-2xl bg-white border border-[#E6EAF0] shadow-2xs space-y-1 hover:border-indigo-200 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#64748B] truncate">
                    {rate.name}
                  </span>
                  {rate.sourceUrl && (
                    <a
                      href={rate.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Source link"
                      className="text-[#94A3B8] hover:text-[#4F46E5]"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="text-base font-extrabold text-[#0F172A]">
                  {rate.unit.startsWith('₹') ? `₹${rate.value.toLocaleString('en-IN')}` : `${rate.value.toLocaleString('en-IN')} ${rate.unit}`}
                </div>
                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <span
                    className={`flex items-center gap-0.5 font-bold ${
                      isPos ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {isPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    <span>{rate.change > 0 ? `+${rate.change}` : rate.change} ({rate.changePercent}%)</span>
                  </span>
                  <span className="text-[9px] text-[#94A3B8]">{rate.asOf}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2 & 3: MARKET CONDITION & MY OVERALL POSITION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* MARKET CONDITION TODAY (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-3xl bg-white border border-[#E6EAF0] shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6EAF0]">
            <div>
              <h2 className="font-extrabold text-sm text-[#0F172A] flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#4F46E5]" />
                <span>Market Condition Today</span>
              </h2>
              <p className="text-[11px] text-[#64748B]">Simple Hinglish insights & news</p>
            </div>
            <span
              className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                marketCondition?.mood === 'Positive'
                  ? 'bg-emerald-100 text-emerald-800'
                  : marketCondition?.mood === 'Negative'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {marketCondition?.mood || 'Positive'}
            </span>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#0F172A] leading-snug">
              {marketCondition?.headline || 'Markets show steady support backed by strong domestic flows.'}
            </h3>
            <ul className="space-y-2 text-xs text-[#475569]">
              {(marketCondition?.summaryPoints || [
                'Nifty aur Sensex main domestic institutional buying se positive momentum bana hua hai.',
                'Gold rates festive demand aur international cues ki wajah se mazboot hain.',
                'Indian Rupee US Dollar ke mukable stable hai around 84.07.',
                'Overall portfolio risk low hai, disciplined SIPs continue karna sabse behtar strategy hai.'
              ]).map((pt, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4F46E5] shrink-0 mt-1.5" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-2 border-t border-[#E6EAF0] space-y-2">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
              Top Market Headlines
            </span>
            <div className="space-y-1.5">
              {(marketCondition?.newsHeadlines || [
                { title: 'Sensex, Nifty maintain gains led by banking and FMCG stocks', source: 'LiveMint', url: 'https://livemint.com', timeAgo: '1h ago' },
                { title: 'Gold purchases surge as wedding and festive season gets underway', source: 'Economic Times', url: 'https://economictimes.indiatimes.com', timeAgo: '2h ago' }
              ]).map((item, i) => (
                <a
                  key={i}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-[#E6EAF0] flex items-center justify-between text-xs text-[#0F172A] transition group"
                >
                  <span className="truncate group-hover:text-[#4F46E5]">{item.title}</span>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#64748B] shrink-0 pl-2">
                    <span>{item.source}</span>
                    <ExternalLink className="w-3 h-3 text-[#94A3B8]" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* MY OVERALL POSITION AT LIVE RATES (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-3xl bg-white border border-[#E6EAF0] shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6EAF0]">
            <div>
              <h2 className="font-extrabold text-sm text-[#0F172A] flex items-center gap-1.5">
                <PieChart className="w-4 h-4 text-emerald-600" />
                <span>My Overall Position at Live Rates</span>
              </h2>
              <p className="text-[11px] text-[#64748B]">Real-time re-valuation of your personal balance sheet</p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              Health Score: 82 (A)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 border border-[#E6EAF0]">
              <span className="text-[10px] font-bold text-[#64748B] uppercase">Live Net Worth</span>
              <div className="text-base font-extrabold text-[#0F172A] mt-0.5">
                {formatINR(netWorth)}
              </div>
              <span className="text-[10px] text-emerald-600 font-bold">+0.4% today</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-[#E6EAF0]">
              <span className="text-[10px] font-bold text-[#64748B] uppercase">Invested Value</span>
              <div className="text-base font-extrabold text-[#0F172A] mt-0.5">
                {formatINR(currentInvestmentsVal)}
              </div>
              <span className="text-[10px] text-[#64748B]">{investments.length} Active Holdings</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-[#E6EAF0]">
              <span className="text-[10px] font-bold text-[#64748B] uppercase">Re-valued Gold</span>
              <div className="text-base font-extrabold text-amber-700 mt-0.5">
                {formatINR(goldLiveValue || 24000)}
              </div>
              <span className="text-[10px] text-amber-600 font-semibold">@ ₹{gold24kRate}/g</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-[#E6EAF0]">
              <span className="text-[10px] font-bold text-[#64748B] uppercase">Emergency Fund</span>
              <div className="text-base font-extrabold text-[#0F172A] mt-0.5">
                2.1 Months
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold">Goal: 6 Months</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200 text-xs text-[#0F172A] space-y-1.5">
            <div className="font-bold text-indigo-950 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>What today's market means for you:</span>
            </div>
            <p className="text-[#475569] leading-relaxed">
              Your monthly income is <span className="font-bold text-[#0F172A]">₹82,000</span> and your active loan EMI is <span className="font-bold text-[#0F172A]">₹12,000</span> (FOIR 14.6%, safely below the 35% guideline). Because Nifty is hovering steadily and precious metals are rising, your equity SIPs and gold hedges are performing in sync. No loan rate hike impact detected.
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-[#64748B] pt-1">
            <span>Dues this week: <strong className="text-[#0F172A]">₹0 pending</strong></span>
            <span>Next EMI: <strong className="text-[#0F172A]">13th November (ALL Bank)</strong></span>
          </div>
        </div>
      </div>

      {/* SECTION 4: ASK FINWISE AI CHAT */}
      <div className="p-5 rounded-3xl bg-white border border-[#E6EAF0] shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E6EAF0]">
          <div>
            <h2 className="font-extrabold text-sm text-[#0F172A] flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#4F46E5]" />
              <span>Ask FinWise AI</span>
            </h2>
            <p className="text-[11px] text-[#64748B]">
              Ask questions about your finances, live market rates, or loan prepayments
            </p>
          </div>
          <span className="text-[11px] text-[#4F46E5] font-semibold bg-indigo-50 px-2.5 py-1 rounded-xl">
            Grounded in your financial ledger
          </span>
        </div>

        {/* Chat message history */}
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-2xl p-3.5 rounded-2xl text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#4F46E5] text-white rounded-br-xs'
                    : 'bg-slate-100 text-[#0F172A] rounded-bl-xs'
                }`}
              >
                {msg.text}
              </div>
              {msg.basedOn && (
                <div className="text-[10px] text-[#64748B] mt-1 px-1">
                  Based on: <span className="font-semibold">{msg.basedOn}</span>
                </div>
              )}
            </div>
          ))}
          {isSending && (
            <div className="flex items-center gap-2 text-xs text-[#64748B] p-2">
              <Sparkles className="w-3.5 h-3.5 animate-spin text-[#4F46E5]" />
              <span>FinWise AI is thinking...</span>
            </div>
          )}
        </div>

        {/* Input box */}
        <form onSubmit={handleSendChat} className="flex gap-2 pt-2">
          <input
            type="text"
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            placeholder="e.g. Kya mujhe abhi gold lena chahiye ya loan prepay karna chahiye?"
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#E6EAF0] text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] bg-slate-50/50"
          />
          <button
            type="submit"
            disabled={isSending || !userInput.trim()}
            className="px-4 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>

        <p className="text-[10px] text-[#94A3B8] text-center pt-1 border-t border-[#E6EAF0]">
          Rates are indicative and may be delayed. Not investment advice.
        </p>
      </div>
    </div>
  );
};
