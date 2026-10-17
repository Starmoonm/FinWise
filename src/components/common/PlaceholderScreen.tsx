import { useFinance, type ScreenType } from '../../context/FinanceContext';
import { Clock, ArrowRight, Plus, Sparkles, Layers } from 'lucide-react';

interface PlaceholderProps {
  title: string;
  stepNumber: number;
  description: string;
  category: string;
  features: string[];
}

const PAGE_STEPS: Partial<Record<ScreenType, { step: number; desc: string; category: string; features: string[] }>> = {
  calendar: {
    step: 2,
    desc: 'Interactive monthly & daily financial calendar view with recurring events and cashflow projections.',
    category: 'OVERVIEW',
    features: ['Day-by-day cashflow breakdown', 'AutoPay & recurring events marked', 'Daily spend heatmap'],
  },
  assistant: {
    step: 2,
    desc: 'AI Assistant for spending queries, budget questions, and smart natural language entry.',
    category: 'OVERVIEW',
    features: ['Natural language Q&A', 'Smart receipt interpretation', 'Spending anomaly insights'],
  },
  recurring: {
    step: 3,
    desc: 'Recurring transaction engine and AutoPay scheduler with execution logs.',
    category: 'MONEY IN & OUT',
    features: ['Daily, Weekly, Monthly, Yearly schedules', 'AutoPay tracking', 'Next due date alerts'],
  },
  family: {
    step: 3,
    desc: 'Family member tracking (Self, MOM, Ankita, Sis) with personalized contribution ledgers.',
    category: 'MONEY IN & OUT',
    features: ['Member-wise spending breakdown', 'Custom member colors', 'Family support allocations'],
  },
  accounts: {
    step: 4,
    desc: 'Bank accounts, Cash in hand, and Digital wallets with live balance calculations.',
    category: 'ACCOUNTS & DEBT',
    features: ['Opening balance tracking', 'Inter-account transfers', 'Double-entry cashflow validation'],
  },
  cards: {
    step: 4,
    desc: 'Credit card statement cycles, unbilled spends, and outstanding balance monitor.',
    category: 'ACCOUNTS & DEBT',
    features: ['Statement due dates', 'Finance charge warnings', 'Bill payment logging'],
  },
  emiManager: {
    step: 4,
    desc: 'EMI amortization schedule, interest breakdown, and prepayment acceleration simulator.',
    category: 'ACCOUNTS & DEBT',
    features: ['Amortization table', 'Implied interest rate calculator', 'Early closure savings'],
  },
  assets: {
    step: 5,
    desc: 'Physical assets, Gold, Real Estate, and Vehicle valuations with depreciation tracking.',
    category: 'WEALTH',
    features: ['Gold SGB & physical tracking', 'Property valuations', 'Asset allocation sync'],
  },
  insurance: {
    step: 5,
    desc: 'Term life, health floater, and motor insurance coverage with renewal alerts.',
    category: 'WEALTH',
    features: ['Coverage sufficiency check', 'Renewal calendar', 'Policy documents vault'],
  },
  netWorth: {
    step: 5,
    desc: 'Comprehensive double-entry Net Worth balance sheet with historical trajectory.',
    category: 'WEALTH',
    features: ['Assets vs Liabilities balance sheet', 'Milestone roadmap to ₹1 Crore', 'Deleveraging calculator'],
  },
  taxPlanner: {
    step: 6,
    desc: 'Old vs New tax regime comparison, 80C, 80D, and HRA deductions planner.',
    category: 'WEALTH',
    features: ['Regime comparison calculator', 'Deduction optimization', 'Advance tax reminders'],
  },
  monthlySummary: {
    step: 7,
    desc: 'Complete monthly closing statement with category variances and burn rate.',
    category: 'REPORTS',
    features: ['Month-over-month variances', 'Savings rate scorecard', 'Executive summary PDF'],
  },
  yearlyReport: {
    step: 7,
    desc: 'Full financial year annual report matching your old FinWise yearly totals.',
    category: 'REPORTS',
    features: ['Jan–Sep + Oct–Dec unified report', 'Top category spending trends', 'Annual savings rate'],
  },
  reportBuilder: {
    step: 7,
    desc: 'Custom report builder with multi-dimensional filters, grouping, and CSV/PDF export.',
    category: 'REPORTS',
    features: ['Custom filters & pivots', 'Chart customizations', 'Export to spreadsheet'],
  },
  dataMigration: {
    step: 8,
    desc: 'Data migration utilities, JSON backups, CSV imports, and audit log reconciliation.',
    category: 'SYSTEM',
    features: ['FinWise JSON import', 'Complete data export', 'Versioned snapshots'],
  },
  activityLog: {
    step: 8,
    desc: 'Audit trail of all entries created, edited, merged, and deleted with undo history.',
    category: 'SYSTEM',
    features: ['Audit trail timestamps', 'User action logs', 'Restore deleted items'],
  },
};

export const PlaceholderScreen: React.FC<{ screen: ScreenType; fallbackTitle?: string }> = ({
  screen,
  fallbackTitle,
}) => {
  const { setActiveScreen, setQuickAddOpen } = useFinance();
  const info = PAGE_STEPS[screen] || {
    step: 2,
    desc: 'This page is part of the full FinWise spec and will be activated in upcoming messages.',
    category: 'FINWISE',
    features: ['Full offline Firestore sync', 'Automated calculations', 'Fintech design system'],
  };

  const title = fallbackTitle || screen;

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {info.category}
            </span>
            <span className="text-xs font-semibold text-zinc-400">Step {info.step} of 9</span>
          </div>
          <h2 className="text-xl font-black text-zinc-900 capitalize mt-1">
            {title}
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5 max-w-2xl">{info.desc}</p>
        </div>

        <button
          onClick={() => setQuickAddOpen(true)}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Quick Add Entry</span>
        </button>
      </div>

      {/* KPI Strip (Section 3 rule: 3-6 tiles) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">MODULE STATUS</div>
          <div className="text-base font-bold text-amber-600 mt-1 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>Coming in Step {info.step}</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Planned in 9-message spec</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">DATA ENGINE</div>
          <div className="text-base font-bold text-emerald-600 mt-1 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            <span>Ready & Synced</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">finance.ts core operational</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">PRIMARY SHORTCUT</div>
          <button
            onClick={() => setActiveScreen('home')}
            className="text-xs font-bold text-blue-600 hover:underline mt-1 flex items-center gap-1"
          >
            <span>Return to Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <div className="text-[11px] text-zinc-400 mt-1">Live data active on Dashboard</div>
        </div>
      </div>

      {/* Helpful Module State */}
      <div className="p-8 rounded-2xl bg-white border border-zinc-200 text-center space-y-4 shadow-xs">
        <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
          <Layers className="w-7 h-7" />
        </div>

        <div className="max-w-md mx-auto space-y-1">
          <h3 className="text-base font-bold text-zinc-900">
            {title}
          </h3>
          <p className="text-xs text-zinc-500">
            {info.desc || 'Comprehensive financial overview and record management.'}
          </p>
        </div>

        <div className="max-w-md mx-auto p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-left text-xs space-y-2">
          <div className="font-bold text-zinc-700">Included Capabilities:</div>
          <ul className="space-y-1.5 text-zinc-600">
            {info.features.map((feat, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            onClick={() => setActiveScreen('home')}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => setActiveScreen('entries')}
            className="px-4 py-2 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-bold text-xs transition"
          >
            View Transactions
          </button>
        </div>
      </div>
    </div>
  );
};
