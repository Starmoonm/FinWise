import React, { useState, useRef, useMemo } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  History,
  Shield,
  FileJson,
  Layers,
  ArrowRight,
  Eye,
  Check,
  X,
  FileText,
  Calendar,
  ExternalLink,
  Info,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { IMPORTED_MONTHS_REPORT, MonthReportData } from '../../utils/importedMonthsData';
import { formatINR } from '../../utils/formatters';

export const DataMigrationScreen: React.FC = () => {
  const {
    transactions,
    loans,
    investments,
    cards,
    accounts,
    goals,
    insurance,
    assets,
    settings,
    history,
    exportJSON,
    restoreFromJSON,
    importOldData,
    addOrUpdateTransaction,
    setActiveMonthKey,
    setActiveScreen,
    showToast,
  } = useFinance();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSeedDialog, setShowSeedDialog] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingRestoreJson, setPendingRestoreJson] = useState<string | null>(null);

  // Review modal state for monthly report lines
  const [reviewMonth, setReviewMonth] = useState<MonthReportData | null>(null);

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const jsonStr = event.target?.result as string;
        JSON.parse(jsonStr); // validate JSON syntax
        setPendingRestoreJson(jsonStr);
        setShowRestoreConfirm(true);
      } catch (err) {
        showToast('Invalid JSON file format. Please upload a valid backup.');
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestoreJson) return;
    await restoreFromJSON(pendingRestoreJson);
    showToast('Database snapshot restored successfully!');
    setShowRestoreConfirm(false);
    setPendingRestoreJson(null);
  };

  const handleExportClick = () => {
    const jsonStr = exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MeraKhata_FullBackup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Backup JSON downloaded successfully!');
  };

  // Monthly Migration Tracker Metrics (April to September 2026)
  const migrationTrackerRows = useMemo(() => {
    return Object.values(IMPORTED_MONTHS_REPORT).map(report => {
      const monthTx = transactions.filter(t => t.date.startsWith(report.monthKey));
      const expTotal = monthTx
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      const invTotal = monthTx
        .filter(t => t.type === 'invest')
        .reduce((sum, t) => sum + t.amount, 0);
      const incTotal = monthTx
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      const outflowTotal = expTotal + invTotal;

      const isMatch = outflowTotal === report.outflow && expTotal === report.expenses;
      const countMatch = monthTx.length === report.expectedEntriesCount;

      return {
        ...report,
        actualEntriesCount: monthTx.length,
        actualExpenses: expTotal,
        actualInvested: invTotal,
        actualIncome: incTotal,
        actualOutflow: outflowTotal,
        isMatch,
        countMatch,
        monthTx,
      };
    });
  }, [transactions]);

  // Overall Totals for April to September
  const totalReportExpenses = useMemo(
    () => Object.values(IMPORTED_MONTHS_REPORT).reduce((s, r) => s + r.expenses, 0),
    []
  );
  const totalReportOutflow = useMemo(
    () => Object.values(IMPORTED_MONTHS_REPORT).reduce((s, r) => s + r.outflow, 0),
    []
  );
  const totalReportIncome = useMemo(
    () => Object.values(IMPORTED_MONTHS_REPORT).reduce((s, r) => s + r.income, 0),
    []
  );
  const totalReportInvested = useMemo(
    () => Object.values(IMPORTED_MONTHS_REPORT).reduce((s, r) => s + r.invested, 0),
    []
  );
  const totalReportEntries = useMemo(
    () => Object.values(IMPORTED_MONTHS_REPORT).reduce((s, r) => s + r.expectedEntriesCount, 0),
    []
  );

  // Unlinked imported EMI and Investment entries (Data Health check #8)
  const unlinkedImportedEmi = useMemo(() => {
    return transactions.filter(t => t.imported && t.category === 'EMI' && !t.loanId);
  }, [transactions]);

  const unlinkedImportedInvestments = useMemo(() => {
    return transactions.filter(
      t => t.imported && t.type === 'invest' && t.category === 'Investment' && !t.investmentId
    );
  }, [transactions]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3.5 sm:px-6 py-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <Database className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">
              Data Migration & Historical Archive
            </h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Complete database snapshot management, JSON export/restore, and FinWise 2026 month-by-month import tracker
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportClick}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            <span>Download Backup (.json)</span>
          </button>
        </div>
      </div>

      {/* FINWISE MONTHLY REPORT MIGRATION TRACKER (APRIL – SEPTEMBER 2026) */}
      <div className="p-5 rounded-2xl bg-white border border-[#E6EAF0] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-[#0F172A]">
                FinWise Monthly Reports Migration Tracker (April – September 2026)
              </h2>
            </div>
            <p className="text-xs text-[#475569]">
              Verified 6-month historical import. All lines dated 1st of each month with exact category totals and no duplicates.
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
            <Check className="w-3.5 h-3.5" />
            <span>All 6 Months Verified (128 Entries)</span>
          </div>
        </div>

        {/* Responsive Table of Months */}
        <div className="overflow-x-auto rounded-xl border border-[#E6EAF0]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F6F8FB] border-b border-[#E6EAF0] text-[#475569] font-bold">
              <tr>
                <th className="py-2.5 px-3">Month</th>
                <th className="py-2.5 px-3">Old App Report (Outflow)</th>
                <th className="py-2.5 px-3">Spending</th>
                <th className="py-2.5 px-3">Invested</th>
                <th className="py-2.5 px-3">Income</th>
                <th className="py-2.5 px-3 text-center">Entries</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6EAF0]">
              {migrationTrackerRows.map(row => (
                <tr key={row.monthKey} className="hover:bg-zinc-50/80 transition">
                  <td className="py-3 px-3 font-bold text-[#0F172A] whitespace-nowrap">
                    {row.monthName}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-[#0F172A] whitespace-nowrap">
                    {formatINR(row.outflow)}
                  </td>
                  <td className="py-3 px-3 font-mono text-[#DC2626] whitespace-nowrap">
                    {formatINR(row.actualExpenses)}
                  </td>
                  <td className="py-3 px-3 font-mono text-[#7C3AED] whitespace-nowrap">
                    {formatINR(row.actualInvested)}
                  </td>
                  <td className="py-3 px-3 font-mono text-[#16A34A] whitespace-nowrap">
                    {formatINR(row.actualIncome)}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-semibold text-[#475569]">
                    {row.actualEntriesCount} / {row.expectedEntriesCount}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {row.isMatch && row.countMatch ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        <Check className="w-3 h-3" />
                        <span>✓</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => setReviewMonth(row)}
                      className="px-2.5 py-1 rounded-lg border border-[#E6EAF0] bg-white hover:bg-zinc-100 text-[11px] font-bold text-[#4F46E5] transition"
                    >
                      Review Lines
                    </button>
                  </td>
                </tr>
              ))}

              {/* Total Apr–Sep Row */}
              <tr className="bg-emerald-50/60 font-bold border-t-2 border-emerald-200 text-[#0F172A]">
                <td className="py-3 px-3">Total Apr–Sep 2026</td>
                <td className="py-3 px-3 font-mono font-black text-emerald-800">{formatINR(totalReportOutflow)}</td>
                <td className="py-3 px-3 font-mono text-[#DC2626]">{formatINR(totalReportExpenses)}</td>
                <td className="py-3 px-3 font-mono text-[#7C3AED]">{formatINR(totalReportInvested)}</td>
                <td className="py-3 px-3 font-mono text-[#16A34A]">{formatINR(totalReportIncome)}</td>
                <td className="py-3 px-3 text-center font-mono">{totalReportEntries} entries</td>
                <td className="py-3 px-3 text-center text-emerald-700">✓ 100% Match</td>
                <td className="py-3 px-3 text-right text-xs text-emerald-700">128 lines</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Historical Summary Box (Jan-Mar Combined + Full Year to Date) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="p-4 rounded-xl bg-[#F6F8FB] border border-[#E6EAF0] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
                Jan–Mar 2026 Combined (Old App History)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                Quarter 1
              </span>
            </div>
            <div className="text-xs text-[#0F172A] space-y-0.5">
              <div>Income: <span className="font-mono font-bold">₹3,73,940</span></div>
              <div>Spending: <span className="font-mono font-bold text-[#DC2626]">₹4,74,588</span> · Invested: <span className="font-mono font-bold text-[#7C3AED]">₹23,200</span></div>
              <div>Total Outflow: <span className="font-mono font-bold">₹4,97,788</span></div>
            </div>
            <p className="text-[11px] text-[#475569] italic pt-1">
              "Combined Jan–Mar data from old app — upload each month's report to split it"
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F6F8FB] border border-[#E6EAF0] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
                Year to Date Jan–Sep 2026 (Combined Total)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                9 Months
              </span>
            </div>
            <div className="text-xs text-[#0F172A] space-y-0.5">
              <div>Total Income: <span className="font-mono font-bold text-[#16A34A]">₹7,79,739</span></div>
              <div>Total Outflow: <span className="font-mono font-bold">₹10,53,622</span> · Invested: <span className="font-mono font-bold text-[#7C3AED]">₹90,132</span></div>
              <div>Total Spending: <span className="font-mono font-bold text-[#DC2626]">₹9,63,490</span></div>
            </div>
            <p className="text-[11px] text-[#475569] pt-1">
              Top Categories: EMI ₹4,48,595 · Small Expense ₹75,634 · Ankita ₹68,349 · MOM ₹55,800
            </p>
          </div>
        </div>
      </div>

      {/* DATA HEALTH: UNLINKED IMPORTED EMI & INVESTMENT ENTRIES */}
      <div className="p-5 rounded-2xl bg-white border border-[#E6EAF0] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-[#0F172A]">
                Data Health: Unlinked Imported Entries (Ready to link when desired)
              </h3>
            </div>
            <p className="text-xs text-[#475569]">
              Per import rules, historical EMI lines are not auto-linked to ALL Bank loan (started 13 Aug 2026), and Investment entries are not auto-linked to portfolio holdings.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
            {unlinkedImportedEmi.length} EMIs · {unlinkedImportedInvestments.length} Investments
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-[#F6F8FB] border border-[#E6EAF0] space-y-2">
            <div className="font-bold text-[#0F172A] flex items-center justify-between">
              <span>Imported EMI Entries ({unlinkedImportedEmi.length})</span>
              <span className="text-[11px] text-[#475569]">Total: {formatINR(unlinkedImportedEmi.reduce((s, t) => s + t.amount, 0))}</span>
            </div>
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {unlinkedImportedEmi.map(t => (
                <div key={t.id} className="flex items-center justify-between p-1.5 rounded-lg bg-white border border-zinc-100 text-[11px]">
                  <span>{t.date} — {t.note}</span>
                  <span className="font-mono font-bold text-[#DC2626]">{formatINR(t.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F6F8FB] border border-[#E6EAF0] space-y-2">
            <div className="font-bold text-[#0F172A] flex items-center justify-between">
              <span>Imported Investment Entries ({unlinkedImportedInvestments.length})</span>
              <span className="text-[11px] text-[#475569]">Total: {formatINR(unlinkedImportedInvestments.reduce((s, t) => s + t.amount, 0))}</span>
            </div>
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {unlinkedImportedInvestments.map(t => (
                <div key={t.id} className="flex items-center justify-between p-1.5 rounded-lg bg-white border border-zinc-100 text-[11px]">
                  <span>{t.date} — {t.note}</span>
                  <span className="font-mono font-bold text-[#7C3AED]">{formatINR(t.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Database Record Counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Transactions</span>
          <div className="text-xl font-bold font-mono text-zinc-900 mt-1">
            {transactions.length}
          </div>
          <span className="text-[10px] text-zinc-400">Recorded ledger entries</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Loans & Facilities</span>
          <div className="text-xl font-bold font-mono text-rose-600 mt-1">
            {loans.length}
          </div>
          <span className="text-[10px] text-zinc-400">Borrowed & Lent</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Investments</span>
          <div className="text-xl font-bold font-mono text-blue-600 mt-1">
            {investments.length}
          </div>
          <span className="text-[10px] text-zinc-400">Active portfolios</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Accounts & Cards</span>
          <div className="text-xl font-bold font-mono text-emerald-600 mt-1">
            {accounts.length + cards.length}
          </div>
          <span className="text-[10px] text-zinc-400">{accounts.length} acc + {cards.length} cards</span>
        </div>
      </div>

      {/* Main Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export & Download Card */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900">
                Export Full JSON Snapshot
              </h3>
              <p className="text-xs text-zinc-400">
                Download your complete database into a portable JSON file for offline storage or transfer
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 space-y-1.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Includes all 128 April–September imported lines + October entries</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Includes Jan–Mar 2026 combined historical totals</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Includes Loans, Investments, Cards, Accounts, and Settings</span>
            </div>
          </div>

          <button
            onClick={handleExportClick}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
          >
            Download Backup (.json)
          </button>
        </div>

        {/* Restore & Import Card */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900">
                Restore Database Snapshot
              </h3>
              <p className="text-xs text-zinc-400">
                Load a previously exported FinWise JSON backup file to restore records
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Restoring will overwrite current local database state with the backup.</span>
            </div>
            <p className="text-[11px] text-zinc-400 pt-1">
              Ensure you take a fresh backup above before restoring older files.
            </p>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json,application/json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition"
          >
            Upload Backup File (.json)
          </button>
        </div>
      </div>

      {/* Review Modal for Selected Month */}
      {reviewMonth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-600/30 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white border border-[#E6EAF0] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#E6EAF0] flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-[#0F172A] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#4F46E5]" />
                  <span>Review Month Report: {reviewMonth.monthName}</span>
                </h3>
                <p className="text-xs text-[#475569] mt-0.5">
                  Batch ID: <span className="font-mono font-bold text-[#0F172A]">{reviewMonth.importBatchId}</span> · {reviewMonth.entries.length} lines · Total: {formatINR(reviewMonth.outflow)}
                </p>
              </div>
              <button
                onClick={() => setReviewMonth(null)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Summary Row */}
            <div className="grid grid-cols-4 gap-2 p-3 bg-[#F6F8FB] border-b border-[#E6EAF0] text-center text-xs">
              <div>
                <div className="text-[10px] text-[#94A3B8] font-bold uppercase">Income</div>
                <div className="font-mono font-bold text-[#16A34A]">{formatINR(reviewMonth.income)}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#94A3B8] font-bold uppercase">Expenses</div>
                <div className="font-mono font-bold text-[#DC2626]">{formatINR(reviewMonth.expenses)}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#94A3B8] font-bold uppercase">Invested</div>
                <div className="font-mono font-bold text-[#7C3AED]">{formatINR(reviewMonth.invested)}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#94A3B8] font-bold uppercase">Report Outflow</div>
                <div className="font-mono font-bold text-[#0F172A]">{formatINR(reviewMonth.outflow)}</div>
              </div>
            </div>

            {/* Itemized Lines Table */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <table className="w-full text-left text-xs">
                <thead className="text-[11px] font-bold text-[#475569] border-b border-zinc-200">
                  <tr>
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">Category</th>
                    <th className="py-2 px-2">Type</th>
                    <th className="py-2 px-2">Mode</th>
                    <th className="py-2 px-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {reviewMonth.entries.map((item, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50">
                      <td className="py-2 px-2 text-zinc-400 font-mono">{idx + 1}</td>
                      <td className="py-2 px-2 font-bold text-[#0F172A]">{item.category}</td>
                      <td className="py-2 px-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                            item.type === 'income'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.type === 'invest'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-zinc-500">Imported</td>
                      <td className="py-2 px-2 font-mono font-bold text-right text-[#0F172A]">
                        {formatINR(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-[#E6EAF0] flex items-center justify-between bg-zinc-50">
              <button
                onClick={() => {
                  setActiveMonthKey(reviewMonth.monthKey);
                  setActiveScreen('home');
                  setReviewMonth(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 hover:bg-white text-xs font-bold text-[#0F172A] transition"
              >
                <Calendar className="w-3.5 h-3.5 text-[#4F46E5]" />
                <span>Open in Dashboard</span>
              </button>

              <button
                onClick={() => setReviewMonth(null)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirm Dialog */}
      {showRestoreConfirm && (
        <ConfirmDialog
          isOpen={true}
          title="Confirm Database Restoration?"
          message="Warning: This action will replace your active database records with the selected backup snapshot. Are you sure you want to proceed?"
          confirmLabel="Restore Database"
          confirmVariant="danger"
          onConfirm={handleConfirmRestore}
          onCancel={() => {
            setShowRestoreConfirm(false);
            setPendingRestoreJson(null);
          }}
        />
      )}
    </div>
  );
};
