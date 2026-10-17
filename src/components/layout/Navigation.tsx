import React, { useState, useMemo } from 'react';
import {
  Home,
  Calendar,
  Bot,
  ListOrdered,
  Repeat,
  PieChart,
  Tag,
  GitFork,
  Users,
  Wallet,
  CreditCard,
  Landmark,
  Calculator,
  Coins,
  Shield,
  Target,
  LineChart,
  FileText,
  BarChart3,
  FileBarChart2,
  CalendarDays,
  FileSpreadsheet,
  Database,
  History,
  Settings,
  Plus,
  CheckCircle,
  Menu,
  X,
  Search,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useFinance, type ScreenType } from '../../context/FinanceContext';
import { formatShortINR } from '../../utils/formatters';
import { netWorth } from '../../lib/finance';

interface NavSection {
  title: string;
  items: Array<{
    id: ScreenType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { id: 'home', label: 'Dashboard', icon: Home },
      { id: 'finwiseAi', label: 'FinWise AI', icon: Sparkles },
      { id: 'calendar', label: 'Calendar', icon: Calendar },
      { id: 'assistant', label: 'AI Assistant', icon: Bot },
    ],
  },
  {
    title: 'MONEY IN & OUT',
    items: [
      { id: 'entries', label: 'Transactions', icon: ListOrdered },
      { id: 'recurring', label: 'Recurring & AutoPay', icon: Repeat },
      { id: 'budget', label: 'Budget', icon: PieChart },
      { id: 'categories', label: 'Categories', icon: Tag },
      { id: 'hierarchy', label: 'Expense Hierarchy', icon: GitFork },
      { id: 'family', label: 'Family', icon: Users },
    ],
  },
  {
    title: 'ACCOUNTS & DEBT',
    items: [
      { id: 'accounts', label: 'Accounts & Cash', icon: Wallet },
      { id: 'cards', label: 'Credit Cards', icon: CreditCard },
      { id: 'loans', label: 'Loans', icon: Landmark },
      { id: 'emiManager', label: 'EMI Manager', icon: Calculator },
    ],
  },
  {
    title: 'WEALTH',
    items: [
      { id: 'wealth', label: 'Investments', icon: Coins },
      { id: 'assets', label: 'Assets', icon: Database },
      { id: 'insurance', label: 'Insurance', icon: Shield },
      { id: 'futureTarget', label: 'Future Target', icon: Target },
      { id: 'netWorth', label: 'Net Worth', icon: LineChart },
      { id: 'taxPlanner', label: 'Tax Planner', icon: FileText },
    ],
  },
  {
    title: 'REPORTS',
    items: [
      { id: 'reports', label: 'Analytics', icon: BarChart3 },
      { id: 'monthlySummary', label: 'Monthly Summary', icon: FileBarChart2 },
      { id: 'yearlyReport', label: 'Yearly Report', icon: CalendarDays },
      { id: 'reportBuilder', label: 'Report Builder', icon: FileSpreadsheet },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { id: 'auditor', label: 'FinWise Auditor', icon: ShieldCheck },
      { id: 'dataMigration', label: 'Data Migration', icon: Database },
      { id: 'activityLog', label: 'Activity Log', icon: History },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

export const Navigation: React.FC = () => {
  const {
    activeScreen,
    setActiveScreen,
    setQuickAddOpen,
    setTestModalOpen,
    moreMenuOpen,
    setMoreMenuOpen,
    goals,
    investments,
    assets,
    loans,
    cards,
    transactions,
    hideAmounts,
  } = useFinance();

  // Collapsible sections state (default all open)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [moreSearch, setMoreSearch] = useState('');

  const toggleSection = (title: string) => {
    setCollapsedSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const currentNetWorth = useMemo(() => {
    return netWorth({ goals, investments, loans, cards, assets, transactions });
  }, [goals, investments, loans, cards, assets, transactions]);

  // Filtered pages for mobile "More" grid
  const allNavItems = useMemo(() => {
    const list: Array<{ id: ScreenType; label: string; section: string; icon: React.ComponentType<{ className?: string }> }> = [];
    for (const sec of NAV_SECTIONS) {
      for (const item of sec.items) {
        list.push({ ...item, section: sec.title });
      }
    }
    return list;
  }, []);

  const filteredMoreItems = useMemo(() => {
    if (!moreSearch.trim()) return allNavItems;
    const q = moreSearch.toLowerCase();
    return allNavItems.filter(item => item.label.toLowerCase().includes(q) || item.section.toLowerCase().includes(q));
  }, [allNavItems, moreSearch]);

  return (
    <>
      {/* Desktop Left Sidebar (Grouped, Collapsible per Section 2, Smooth Scrollable) */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-white border-r border-zinc-200 p-3.5 h-[calc(100vh-4rem)] sticky top-16 select-none overflow-hidden">
        {/* Top: Logo & Quick Add */}
        <div className="space-y-3 shrink-0 pb-3 border-b border-zinc-100">
          <div className="px-2 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white font-extrabold text-base shadow-xs">
              ₹
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-tight text-zinc-900">
                FinWise
              </h1>
              <p className="text-[10px] text-zinc-400">Personal & Family Finance</p>
            </div>
          </div>

          <button
            onClick={() => setQuickAddOpen(true)}
            className="w-full min-h-[42px] flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>＋ Add Entry</span>
          </button>
        </div>

        {/* Scrollable Navigation Sections */}
        <div className="flex-1 overflow-y-auto py-3 pr-1 space-y-3 overscroll-contain">
          <nav className="space-y-3">
            {NAV_SECTIONS.map(section => {
              const isCollapsed = !!collapsedSections[section.title];
              return (
                <div key={section.title} className="space-y-1">
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-600 transition"
                  >
                    <span>{section.title}</span>
                    {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {!isCollapsed && (
                    <div className="space-y-0.5">
                      {section.items.map(item => {
                        const active = activeScreen === item.id;
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setActiveScreen(item.id)}
                            className={`w-full min-h-[38px] flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                              active
                                ? 'bg-emerald-50 text-emerald-700 font-bold'
                                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                            }`}
                          >
                            <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-emerald-600' : 'text-zinc-400'}`} />
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Net Worth Tile & Acceptance Check Trigger */}
        <div className="space-y-2.5 pt-3 border-t border-zinc-200 mt-2 shrink-0">
          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80">
            <div className="text-[10px] font-medium text-zinc-400">Current Net Worth</div>
            <div className="text-sm font-black font-mono text-zinc-900 mt-0.5">
              {hideAmounts ? '••••••' : formatShortINR(currentNetWorth)}
            </div>
          </div>

          <button
            onClick={() => setTestModalOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 hover:bg-emerald-100 transition"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Verify Checks</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar [Home, Entries, ＋ Add (raised centre button), Reports, More] */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200/90 pb-[env(safe-area-inset-bottom)] shadow-lg"
      >
        <div className="flex items-center justify-around h-16 px-2 relative">
          {/* Home / Dashboard */}
          <button
            onClick={() => {
              setActiveScreen('home');
              setMoreMenuOpen(false);
            }}
            className={`flex flex-col items-center justify-center w-14 py-1 text-[10px] font-bold transition ${
              activeScreen === 'home' && !moreMenuOpen
                ? 'text-emerald-600'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span>Home</span>
          </button>

          {/* Entries / Transactions */}
          <button
            onClick={() => {
              setActiveScreen('entries');
              setMoreMenuOpen(false);
            }}
            className={`flex flex-col items-center justify-center w-14 py-1 text-[10px] font-bold transition ${
              activeScreen === 'entries' && !moreMenuOpen
                ? 'text-emerald-600'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <ListOrdered className="w-5 h-5 mb-0.5" />
            <span>Entries</span>
          </button>

          {/* ＋ Add (Raised Centre Button per Section 2) */}
          <div className="relative -top-5 flex flex-col items-center">
            <button
              onClick={() => setQuickAddOpen(true)}
              aria-label="Add Entry"
              className="h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl flex items-center justify-center active:scale-95 transition border-4 border-white"
            >
              <Plus className="w-6 h-6" />
            </button>
            <span className="text-[10px] font-bold text-zinc-600 mt-0.5">Add</span>
          </div>

          {/* Reports */}
          <button
            onClick={() => {
              setActiveScreen('reports');
              setMoreMenuOpen(false);
            }}
            className={`flex flex-col items-center justify-center w-14 py-1 text-[10px] font-bold transition ${
              activeScreen === 'reports' && !moreMenuOpen
                ? 'text-emerald-600'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <FileBarChart2 className="w-5 h-5 mb-0.5" />
            <span>Reports</span>
          </button>

          {/* More (Opens Full Screen Grid per Section 2) */}
          <button
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            className={`flex flex-col items-center justify-center w-14 py-1 text-[10px] font-bold transition ${
              moreMenuOpen
                ? 'text-emerald-600'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* Mobile "More" Full Screen Grid Modal (Section 2) */}
      {moreMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-white flex flex-col overflow-y-auto p-4 pb-24">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
            <div>
              <h3 className="font-extrabold text-base text-zinc-900">All Features & Pages</h3>
              <p className="text-xs text-zinc-400">Tap any page to open</p>
            </div>
            <button
              onClick={() => setMoreMenuOpen(false)}
              className="p-2 rounded-xl text-zinc-500 hover:bg-zinc-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Box */}
          <div className="my-3 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
            <input
              type="text"
              placeholder="Search all pages..."
              value={moreSearch}
              onChange={e => setMoreSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900"
            />
          </div>

          {/* Grid of Pages */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {filteredMoreItems.map(item => {
              const Icon = item.icon;
              const active = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveScreen(item.id);
                    setMoreMenuOpen(false);
                  }}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition active:scale-[0.98] ${
                    active
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-zinc-50 border-zinc-200/80'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${active ? 'bg-emerald-600 text-white' : 'bg-white text-zinc-700 shadow-xs'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-zinc-900 truncate">{item.label}</div>
                    <div className="text-[10px] text-zinc-400 truncate">{item.section}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
