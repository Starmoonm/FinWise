import React, { useState } from 'react';
import {
  Settings,
  Database,
  Check,
  LogOut,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Plus,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { ConfirmDialog } from '../common/ConfirmDialog';

export const SettingsScreen: React.FC = () => {
  const {
    settings,
    setTestModalOpen,
    renameCategory,
    addCategory,
    deleteCategory,
    importOldData,
    transactions,
  } = useFinance();

  const { user, signInWithGoogle, signOutUser, isGuest } = useAuth();

  // Tab: 'categories' | 'import' | 'preferences'
  const [activeTab, setActiveTab] = useState<'categories' | 'import' | 'preferences'>('categories');

  // Rename modal
  const [renameTarget, setRenameTarget] = useState<{ oldName: string; type: 'expense' | 'income' } | null>(null);
  const [newNameInput, setNewNameInput] = useState('');

  // Add category modal
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');

  // Import old data dialog
  const [showImportDialog, setShowImportDialog] = useState(false);

  const handleRenameConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !newNameInput.trim()) return;

    await renameCategory(renameTarget.oldName, newNameInput.trim(), renameTarget.type);
    setRenameTarget(null);
    setNewNameInput('');
  };

  const handleAddCatConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    await addCategory(newCatName.trim(), newCatType);
    setIsAddCatModalOpen(false);
    setNewCatName('');
  };

  const handleTriggerImport = () => {
    if (transactions.length > 0) {
      setShowImportDialog(true);
    } else {
      importOldData('replace');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3.5 sm:px-6 py-6 pb-24 md:pb-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-zinc-900">Settings & Categories</h2>
        <p className="text-xs text-zinc-500">
          Manage transaction categories, seed data imports, sync and appearance
        </p>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-zinc-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'categories'
              ? 'bg-white text-zinc-900 shadow-xs'
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Categories & Modes
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'import'
              ? 'bg-white text-zinc-900 shadow-xs'
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Import & Migration
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'preferences'
              ? 'bg-white text-zinc-900 shadow-xs'
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Account & Display
        </button>
      </div>

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* Expense Categories */}
          <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  Expense Categories ({settings.expenseCategories.length})
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Renaming an expense category automatically updates all past entries in the ledger
                </p>
              </div>

              <button
                onClick={() => {
                  setNewCatType('expense');
                  setIsAddCatModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Category</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {settings.expenseCategories.map((cat, idx) => (
                <div
                  key={`${cat}-${idx}`}
                  className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/60 flex items-center justify-between gap-1 text-xs"
                >
                  <span className="font-medium text-zinc-800 truncate">{cat}</span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => {
                        setRenameTarget({ oldName: cat, type: 'expense' });
                        setNewNameInput(cat);
                      }}
                      className="p-1 text-zinc-400 hover:text-zinc-700 rounded"
                      title="Rename category"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteCategory(cat, 'expense')}
                      className="p-1 text-zinc-400 hover:text-rose-600 rounded"
                      title="Delete category"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Income Categories */}
          <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  Income Categories ({settings.incomeCategories.length})
                </h3>
              </div>

              <button
                onClick={() => {
                  setNewCatType('income');
                  setIsAddCatModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Category</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {settings.incomeCategories.map((cat, idx) => (
                <div
                  key={`${cat}-${idx}`}
                  className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/60 flex items-center justify-between gap-1 text-xs"
                >
                  <span className="font-medium text-zinc-800 truncate">{cat}</span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => {
                        setRenameTarget({ oldName: cat, type: 'income' });
                        setNewNameInput(cat);
                      }}
                      className="p-1 text-zinc-400 hover:text-zinc-700 rounded"
                      title="Rename category"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteCategory(cat, 'income')}
                      className="p-1 text-zinc-400 hover:text-rose-600 rounded"
                      title="Delete category"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Modes */}
          <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-zinc-900">Active Payment Modes</h3>
            <div className="flex flex-wrap gap-2">
              {settings.paymentModes.map((m, idx) => (
                <span
                  key={`${m}-${idx}`}
                  className="px-3 py-1.5 rounded-xl bg-zinc-100 text-xs font-semibold text-zinc-800"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Import & Migration Tab */}
      {activeTab === 'import' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  Import My Old Data (Seed Data)
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Loads the exact historical balances, loans, investments, insurance, and 1–14 Oct seed entries.
                </p>
              </div>

              <button
                onClick={handleTriggerImport}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Import My Old Data</span>
              </button>
            </div>

            {/* Explanatory migration notes */}
            <div className="space-y-3 pt-2 border-t border-zinc-100 text-xs text-zinc-600">
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1.5">
                <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-emerald-600" />
                  <span>Purane app se yeh numbers alag dikhenge:</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 leading-relaxed">
                  <li>
                    <strong>Net worth ab −₹2,06,133 dikhega</strong> (purana −₹2,75,968 dikhata tha). Naye formula mein aapka udhaar diya hua paisa (₹87,047) asset ki tarah judta hai, aur credit card ka baaki (₹17,212) liability ki tarah ghatta hai.
                  </li>
                  <li>
                    Purane app mein <strong>Entertainment (₹200)</strong> aur <strong>Transportation (₹400)</strong> ke budget do baar bane hue the. Inke duplicate hata diye gaye hain.
                  </li>
                  <li>
                    1–14 October ki jo entries purane app mein alag-alag nahi dikh rahi thi, woh category-wise total ki tarah <strong>1 Oct 2026</strong> ki date par "Imported" tag ke saath aayi hain.
                  </li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1 text-amber-900">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Kuch details aapke data se clear nahi thi:</span>
                </div>
                <ul className="list-disc pl-5 space-y-0.5 leading-relaxed">
                  <li>ALL Bank loan ka asli interest rate (note says: 48 × 12,000 = 5,76,000 vs principal 4,00,000).</li>
                  <li>Udhaar diye gaye 2 loans ki alag-alag amounts (abhi combined ₹87,047 hain).</li>
                  <li>LIC policy ki installment amount aur tenure frequency.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Acceptance test runner trigger */}
          <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-zinc-900">
                Verify Acceptance Test Suite
              </h4>
              <p className="text-xs text-zinc-500">
                Run the 8 automated checks to ensure all balances and ratios match the specifications.
              </p>
            </div>
            <button
              onClick={() => setTestModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:opacity-90 transition"
            >
              Run Acceptance Checks
            </button>
          </div>
        </div>
      )}

      {/* Account & Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-[#E6EAF0] shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-[#0F172A]">App Appearance</h3>
            <div className="flex items-center justify-between py-2 border-t border-zinc-100">
              <div>
                <div className="text-xs font-semibold text-[#0F172A]">Theme</div>
                <div className="text-[11px] text-[#475569]">Pure Light Theme (System dark mode override active)</div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                <Check className="w-3.5 h-3.5" />
                <span>Light ✓</span>
              </span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-zinc-900">Account & Cloud Sync</h3>
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {user.photoURL && (
                    <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full" />
                  )}
                  <div>
                    <div className="font-bold text-sm text-zinc-900">
                      {user.displayName || 'Google Account'}
                    </div>
                    <div className="text-xs text-zinc-500">{user.email}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-100">
                  <button
                    onClick={signOutUser}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 text-rose-700 font-semibold text-xs hover:bg-rose-100 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-zinc-500">
                  Currently running in local offline-persistent mode. Sign in with Google to sync across your Android phone and laptop in real-time.
                </p>
                <button
                  onClick={signInWithGoogle}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-zinc-800 text-white font-semibold text-xs shadow-xs transition"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In with Google</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rename Category Modal */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-600/30 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-zinc-200 p-5 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-bold text-zinc-900">
              Rename Category "{renameTarget.oldName}"
            </h3>
            <p className="text-zinc-500">
              This will update "{renameTarget.oldName}" to the new name in all existing ledger transactions and budgets.
            </p>

            <form onSubmit={handleRenameConfirm} className="space-y-3">
              <div>
                <label className="block text-zinc-600 mb-1 font-medium">New Category Name</label>
                <input
                  type="text"
                  value={newNameInput}
                  onChange={e => setNewNameInput(e.target.value)}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 font-bold"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRenameTarget(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                >
                  Update Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isAddCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-600/30 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-zinc-200 p-5 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-bold text-zinc-900">
              Add New {newCatType === 'expense' ? 'Expense' : 'Income'} Category
            </h3>

            <form onSubmit={handleAddCatConfirm} className="space-y-3">
              <div>
                <label className="block text-zinc-600 mb-1 font-medium">Category Name</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="e.g. Electricity, Gym, Freelance"
                  className="w-full min-h-[40px] px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 font-bold"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCatModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                >
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Dialog: Skip / Replace All for Seed Data Import */}
      {showImportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-600/30 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-zinc-200 p-5 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-bold text-zinc-900">
              Data Already Exists
            </h3>
            <p className="text-zinc-600 leading-relaxed">
              You already have active transactions recorded in FinWise. How would you like to proceed with importing the old app data?
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  importOldData('replace');
                  setShowImportDialog(false);
                }}
                className="w-full min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition"
              >
                Replace All (Fresh Import)
              </button>
              <button
                type="button"
                onClick={() => {
                  importOldData('skip');
                  setShowImportDialog(false);
                }}
                className="w-full min-h-[44px] rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-xs transition"
              >
                Skip (Keep Current Data)
              </button>
              <button
                type="button"
                onClick={() => setShowImportDialog(false)}
                className="text-zinc-400 hover:text-zinc-600 py-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
