import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  WifiOff,
  CheckCircle2,
  LogIn,
  LogOut,
  User,
  Search,
  Eye,
  EyeOff,
  Calendar,
  Cloud,
  Check,
  RefreshCw,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { usePWAInstall, useOnlineStatus } from '../../hooks/usePWAInstall';
import { formatMonthKey } from '../../utils/formatters';
import { PeriodType } from '../../types';

const SCREEN_TITLES: Record<string, string> = {
  home: 'Dashboard',
  calendar: 'Calendar',
  assistant: 'AI Assistant',
  entries: 'Transactions',
  recurring: 'Recurring & AutoPay',
  budget: 'Budget',
  categories: 'Categories',
  hierarchy: 'Expense Hierarchy',
  family: 'Family',
  accounts: 'Accounts & Cash',
  cards: 'Credit Cards',
  loans: 'Loans',
  emiManager: 'EMI Manager',
  wealth: 'Wealth',
  investments: 'Investments',
  assets: 'Assets',
  insurance: 'Insurance',
  futureTarget: 'Goals & Future Target',
  netWorth: 'Net Worth',
  taxPlanner: 'Tax Planner',
  reports: 'Reports',
  analytics: 'Analytics',
  monthlySummary: 'Monthly Summary',
  yearlyReport: 'Yearly Report',
  reportBuilder: 'Report Builder',
  dataMigration: 'Data Migration',
  activityLog: 'Activity Log',
  settings: 'Settings',
};

export const Header: React.FC = () => {
  const {
    activeScreen,
    activeMonthKey,
    period,
    setPeriod,
    goToPrevMonth,
    goToNextMonth,
    hideAmounts,
    toggleHideAmounts,
    syncStatus,
    setGlobalSearchOpen,
    setTestModalOpen,
  } = useFinance();

  const { user, signInWithGoogle, signOutUser, isGuest } = useAuth();
  const { isInstallable, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);

  const currentTitle = SCREEN_TITLES[activeScreen] || 'FinWise';

  // Format current period label
  const getPeriodLabel = () => {
    if (period.type === 'month') {
      return formatMonthKey(activeMonthKey);
    }
    if (period.type === 'quarter') {
      return period.quarter || 'Q4 2026';
    }
    if (period.type === 'year') {
      return `Year ${period.year || 2026}`;
    }
    if (period.type === 'fy') {
      return `FY ${period.fyYear || 2026}–${String((period.fyYear || 2026) + 1).slice(-2)}`;
    }
    if (period.type === 'custom') {
      return 'Custom Range';
    }
    return formatMonthKey(activeMonthKey);
  };

  const handleSelectPeriodType = (type: PeriodType) => {
    if (type === 'month') {
      setPeriod({ type: 'month', monthKey: activeMonthKey });
    } else if (type === 'quarter') {
      setPeriod({ type: 'quarter', quarter: '2026-Q4' });
    } else if (type === 'year') {
      setPeriod({ type: 'year', year: 2026 });
    } else if (type === 'fy') {
      setPeriod({ type: 'fy', fyYear: 2026 });
    } else if (type === 'custom') {
      setPeriod({ type: 'custom', fromDate: '2026-10-01', toDate: '2026-10-31' });
    }
    setPeriodDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-zinc-200/90 transition-colors shadow-2xs">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-15 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Brand & Page Title */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div className="flex md:hidden items-center gap-1.5">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white font-extrabold text-xs sm:text-sm shadow-xs shrink-0">
              ₹
            </div>
            <span className="font-extrabold text-xs sm:text-sm tracking-tight text-zinc-900 truncate max-w-[80px] xs:max-w-[110px]">
              {currentTitle}
            </span>
          </div>

          <div className="hidden md:flex flex-col">
            <h2 className="font-extrabold text-base tracking-tight text-zinc-900 flex items-center gap-2">
              <span>{currentTitle}</span>
            </h2>
          </div>
        </div>

        {/* Global Period Switcher (Section 2 centerpiece) */}
        <div className="relative flex items-center bg-zinc-100/90 p-0.5 sm:p-1 rounded-2xl border border-zinc-200/80 shadow-xs">
          <button
            onClick={goToPrevMonth}
            aria-label="Previous Month"
            className="h-7 w-7 sm:min-h-[34px] sm:min-w-[34px] flex items-center justify-center rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-white transition"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            onClick={() => setPeriodDropdownOpen(prev => !prev)}
            className="px-1.5 sm:px-3 text-[11px] sm:text-sm font-bold text-zinc-800 min-w-[70px] sm:min-w-[110px] text-center select-none flex items-center justify-center gap-1 hover:text-emerald-600 transition"
          >
            <span className="truncate">{getPeriodLabel()}</span>
          </button>

          <button
            onClick={goToNextMonth}
            aria-label="Next Month"
            className="h-7 w-7 sm:min-h-[34px] sm:min-w-[34px] flex items-center justify-center rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-white transition"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Period Dropdown */}
          {periodDropdownOpen && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 w-56 max-h-80 overflow-y-auto rounded-2xl bg-white border border-zinc-200 p-2 shadow-xl z-50 text-xs space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Months (2026)
              </div>
              {[
                { key: '2026-11', label: 'Nov 2026' },
                { key: '2026-10', label: 'Oct 2026 (Current)' },
                { key: '2026-09', label: 'Sep 2026 (Imported)' },
                { key: '2026-08', label: 'Aug 2026 (Imported)' },
                { key: '2026-07', label: 'Jul 2026 (Imported)' },
                { key: '2026-06', label: 'Jun 2026 (Imported)' },
                { key: '2026-05', label: 'May 2026 (Imported)' },
                { key: '2026-04', label: 'Apr 2026 (Imported)' },
                { key: '2026-03', label: 'Mar 2026 (Combined)' },
                { key: '2026-02', label: 'Feb 2026 (Combined)' },
                { key: '2026-01', label: 'Jan 2026 (Combined)' },
              ].map(m => (
                <button
                  key={m.key}
                  onClick={() => {
                    setPeriod({ type: 'month', monthKey: m.key });
                    setPeriodDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-left transition font-medium ${
                    period.type === 'month' && activeMonthKey === m.key
                      ? 'bg-emerald-50 text-emerald-700 font-bold'
                      : 'text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <span>{m.label}</span>
                  {period.type === 'month' && activeMonthKey === m.key && (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </button>
              ))}

              <div className="pt-2 px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-t border-zinc-100">
                Periods
              </div>
              {[
                { id: 'quarter', label: 'Quarter (Oct–Dec)' },
                { id: 'year', label: 'Calendar Year 2026' },
                { id: 'fy', label: 'Financial Year (Apr–Mar)' },
                { id: 'custom', label: 'Custom Range' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleSelectPeriodType(opt.id as PeriodType)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-left transition font-medium ${
                    period.type === opt.id
                      ? 'bg-emerald-50 text-emerald-700 font-bold'
                      : 'text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <span>{opt.label}</span>
                  {period.type === opt.id && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Global Search Button */}
          <button
            onClick={() => setGlobalSearchOpen(true)}
            title="Global Search (Entries, Categories, Loans, Notes)"
            aria-label="Search"
            className="h-9 w-9 rounded-xl flex items-center justify-center text-zinc-600 hover:bg-zinc-100 transition"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Hide Amounts Eye Toggle (Privacy Mode) */}
          <button
            onClick={toggleHideAmounts}
            title={hideAmounts ? 'Show Amounts' : 'Hide Amounts (Privacy Mode)'}
            aria-label="Toggle Privacy Mode"
            className={`h-9 w-9 rounded-xl flex items-center justify-center transition ${
              hideAmounts
                ? 'bg-amber-100 text-amber-800'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            {hideAmounts ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          {/* Sync Chip (Synced / Offline / Syncing) */}
          <div
            title={
              !isOnline
                ? 'Offline - Local cache active'
                : syncStatus === 'syncing'
                ? 'Syncing with Firestore...'
                : 'Synced with Cloud Firestore'
            }
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold border ${
              !isOnline
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : syncStatus === 'syncing'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                !isOnline
                  ? 'bg-amber-500 animate-pulse'
                  : syncStatus === 'syncing'
                  ? 'bg-blue-500 animate-ping'
                  : 'bg-emerald-500'
              }`}
            />
            <span>{!isOnline ? 'Offline' : syncStatus === 'syncing' ? 'Syncing' : 'Synced'}</span>
          </div>

          {/* Acceptance Checks Button */}
          <button
            onClick={() => setTestModalOpen(true)}
            title="View Acceptance Checks"
            className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Checks</span>
          </button>

          {/* PWA Install Button */}
          {isInstallable && (
            <button
              onClick={install}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
              title="Install FinWise PWA"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
          )}

          {/* User Profile / Auth */}
          {user ? (
            <div className="flex items-center gap-2 pl-1 border-l border-zinc-200">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="h-8 w-8 rounded-full border border-emerald-500/50 object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
              )}
              <button
                onClick={signOutUser}
                title="Sign Out"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
