import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Plus,
  Check,
  Calendar,
  CreditCard as CardIcon,
  Tag,
  Users,
  Camera,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Search,
  ChevronRight,
  FolderTree,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { TransactionType, PaymentMode, Transaction } from '../../types';
import { SEED_DATA } from '../../utils/seedData';
import { formatINR } from '../../utils/formatters';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  editTransaction?: Transaction | null;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, onClose, editTransaction }) => {
  const {
    todayDateStr,
    settings,
    transactions,
    groups,
    members,
    accounts,
    cards,
    quickAddInitialData,
    addOrUpdateTransaction,
    showToast,
  } = useFinance();

  const [type, setType] = useState<TransactionType>('expense');
  const [amountExpr, setAmountExpr] = useState<string>('');
  const [category, setCategory] = useState<string>('EMI');
  const [date, setDate] = useState<string>(todayDateStr);
  const [mode, setMode] = useState<string>('Cash');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [transferToAccountId, setTransferToAccountId] = useState<string>('');
  const [memberId, setMemberId] = useState<string>('Self');
  const [payee, setPayee] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [tags, setTags] = useState<string>('');
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);

  // Category Picker State
  const [catSearch, setCatSearch] = useState('');
  const [catPickerMode, setCatPickerMode] = useState<'az' | 'group'>('az');
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);

  // Duplicate Warning State
  const [duplicateWarning, setDuplicateWarning] = useState<Transaction | null>(null);
  const [bypassDuplicate, setBypassDuplicate] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Safe Calculator Evaluation (e.g. 120+45)
  const evaluatedAmount = useMemo(() => {
    if (!amountExpr.trim()) return 0;
    try {
      // Allow only numbers and + - * / .
      const cleaned = amountExpr.replace(/[^0-9+\-*/.]/g, '');
      if (!cleaned) return 0;
      // Evaluate using Function with safe syntax
      // eslint-disable-next-line no-new-func
      const result = new Function(`return (${cleaned})`)();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return Math.max(0, Math.round(result * 100) / 100);
      }
    } catch {
      return 0;
    }
    return 0;
  }, [amountExpr]);

  // Yesterday date string
  const yesterdayDateStr = useMemo(() => {
    const d = new Date(todayDateStr);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, [todayDateStr]);

  // Top 8 Most Used & 5 Recent categories
  const { mostUsedCategories, recentCategories } = useMemo(() => {
    const counts: Record<string, number> = {};
    const recents: string[] = [];

    for (const t of transactions) {
      if (t.type === type && t.category) {
        counts[t.category] = (counts[t.category] || 0) + 1;
        if (!recents.includes(t.category)) {
          recents.push(t.category);
        }
      }
    }
    const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    return {
      mostUsedCategories: sorted.slice(0, 8),
      recentCategories: recents.slice(0, 5),
    };
  }, [transactions, type]);

  // All Available categories sorted A-Z
  const allCategories = useMemo(() => {
    let list: string[] = [];
    if (type === 'income') {
      list = [...settings.incomeCategories];
    } else if (type === 'invest') {
      list = ['INVEST', 'PL', 'LIC Policy Investment', 'Mutual Fund', 'Stock SIP', 'PPF', 'EPF', 'Gold SGB'];
    } else if (type === 'transfer') {
      list = ['Account Transfer', 'Self Transfer', 'ATM Cash Withdrawal'];
    } else {
      list = [...settings.expenseCategories];
    }
    return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
  }, [type, settings]);

  // Category map to Groups
  const categoryToGroupMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [groupName, cats] of Object.entries(SEED_DATA.groups_suggested_editable)) {
      for (const c of cats) {
        map[c] = groupName;
      }
    }
    return map;
  }, []);

  // Filtered categories for A-Z contacts list
  const filteredCategories = useMemo(() => {
    if (!catSearch.trim()) return allCategories;
    const q = catSearch.toLowerCase();
    return allCategories.filter(c => {
      const g = categoryToGroupMap[c] || '';
      return c.toLowerCase().includes(q) || g.toLowerCase().includes(q);
    });
  }, [allCategories, catSearch, categoryToGroupMap]);

  // Alphabetical groupings (A, B, C...)
  const groupedAlphabetical = useMemo(() => {
    const groupsMap: Record<string, string[]> = {};
    for (const c of filteredCategories) {
      const firstLetter = c.charAt(0).toUpperCase();
      if (!groupsMap[firstLetter]) groupsMap[firstLetter] = [];
      groupsMap[firstLetter].push(c);
    }
    return groupsMap;
  }, [filteredCategories]);

  // Hierarchy Tree groupings
  const groupedByTree = useMemo(() => {
    const tree: Record<string, string[]> = {};
    for (const [grp, cats] of Object.entries(SEED_DATA.groups_suggested_editable)) {
      const matched = cats.filter(c => filteredCategories.includes(c));
      if (matched.length > 0) {
        tree[grp] = matched.sort((a, b) => a.localeCompare(b));
      }
    }
    // Categories without assigned group
    const uncategorized = filteredCategories.filter(c => !categoryToGroupMap[c]);
    if (uncategorized.length > 0) {
      tree['Other'] = (tree['Other'] || []).concat(uncategorized);
    }
    return tree;
  }, [filteredCategories, categoryToGroupMap]);

  // Budget crossing warning computation
  const budgetCrossingWarning = useMemo(() => {
    if (type !== 'expense' || evaluatedAmount <= 0) return null;
    const b = settings.budgets.find(b => b.categories.includes(category));
    if (!b) return null;

    const currentSpent = transactions
      .filter(t => t.date.startsWith('2026-10') && t.type === 'expense' && b.categories.includes(t.category))
      .reduce((sum, t) => sum + t.amount, 0);

    const projectedSpent = currentSpent + evaluatedAmount;
    if (projectedSpent > b.limit) {
      return `${b.name} will be ${formatINR(projectedSpent)} / ${formatINR(b.limit)}`;
    }
    return null;
  }, [type, evaluatedAmount, category, settings.budgets, transactions]);

  // Payee text category suggestion
  const handlePayeeChange = (val: string) => {
    setPayee(val);
    const low = val.toLowerCase();
    if (low.includes('zomato') || low.includes('swiggy') || low.includes('food')) {
      if (settings.expenseCategories.includes('Zomato')) setCategory('Zomato');
    } else if (low.includes('med') || low.includes('pharmacy') || low.includes('apollo')) {
      if (settings.expenseCategories.includes('My Med')) setCategory('My Med');
    } else if (low.includes('milk')) {
      if (settings.expenseCategories.includes('Milk')) setCategory('Milk');
    } else if (low.includes('fuel') || low.includes('petrol') || low.includes('diesel')) {
      if (settings.expenseCategories.includes('Fuel & Repair')) setCategory('Fuel & Repair');
    } else if (low.includes('salary')) {
      setType('income');
      setCategory('Salary');
    }
  };

  // Reset or initialize state
  useEffect(() => {
    if (isOpen) {
      if (editTransaction) {
        setAmountExpr(String(editTransaction.amount));
        setType(editTransaction.type);
        setCategory(editTransaction.category);
        setDate(editTransaction.date);
        setMode(editTransaction.mode);
        setMemberId(editTransaction.memberId || 'Self');
        setPayee(editTransaction.payee || '');
        setNote(editTransaction.note || '');
        setTags(editTransaction.tags?.join(', ') || '');
      } else if (quickAddInitialData) {
        setType(quickAddInitialData.type || 'expense');
        setCategory(
          quickAddInitialData.category ||
            (quickAddInitialData.type === 'income'
              ? 'Salary'
              : quickAddInitialData.type === 'invest'
              ? 'Mutual Fund SIP'
              : quickAddInitialData.type === 'cardPayment'
              ? 'Credit Card Bill'
              : quickAddInitialData.type === 'transfer'
              ? 'Account Transfer'
              : 'Grocery')
        );
        setAmountExpr(quickAddInitialData.amount ? String(quickAddInitialData.amount) : '');
        setDate(todayDateStr);
        setMode(quickAddInitialData.mode || (quickAddInitialData.type === 'cardPayment' ? 'Bank' : 'Cash'));
        setMemberId('Self');
        setPayee('');
        setNote('');
        setTags('');
      } else {
        setAmountExpr('');
        setType('expense');
        setCategory('EMI');
        setDate(todayDateStr);
        setMode('Cash');
        setMemberId('Self');
        setPayee('');
        setNote('');
        setTags('');
      }
      setDuplicateWarning(null);
      setBypassDuplicate(false);
      setIsCategorySheetOpen(false);
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, editTransaction, quickAddInitialData, todayDateStr]);

  if (!isOpen) return null;

  // Handle Photo Compression (<200KB per Section 5)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scale = Math.min(1, MAX_WIDTH / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        // Compress to JPEG 0.7 quality to keep under 200KB
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setReceiptPhoto(compressedBase64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (addAnother: boolean = false) => {
    if (evaluatedAmount <= 0) {
      amountInputRef.current?.focus();
      return;
    }

    // Check duplicate warning: same amount + category within 2 days (Section 7)
    if (!bypassDuplicate && !editTransaction) {
      const isDuplicate = transactions.find(t => {
        if (t.amount === evaluatedAmount && t.category === category) {
          const diffDays = Math.abs(
            (new Date(t.date).getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
          );
          return diffDays <= 2;
        }
        return false;
      });

      if (isDuplicate) {
        setDuplicateWarning(isDuplicate);
        return;
      }
    }

    try {
      setIsSubmitting(true);

      // Auto-resolve account based on mode if not explicitly selected
      const resolvedAccountId =
        selectedAccountId ||
        (mode === 'Cash'
          ? accounts.find(a => a.kind === 'cash')?.id || 'acc_cash_1'
          : mode === 'UPI'
          ? accounts.find(a => a.kind === 'wallet')?.id || accounts.find(a => a.kind === 'bank')?.id || 'acc_wallet_1'
          : mode === 'Bank' || mode === 'Net Banking' || mode === 'Debit Card'
          ? accounts.find(a => a.kind === 'bank')?.id || 'acc_bank_1'
          : undefined);

      const resolvedToAccountId =
        type === 'transfer'
          ? transferToAccountId || (accounts.find(a => a.id !== resolvedAccountId)?.id || 'acc_cash_1')
          : undefined;

      const newTx: Omit<Transaction, 'id'> & { id?: string } = {
        id: editTransaction?.id,
        date,
        type,
        category: category || (type === 'income' ? 'Salary' : type === 'transfer' ? 'Transfer' : 'Other'),
        amount: evaluatedAmount,
        mode,
        accountId: resolvedAccountId,
        toAccountId: resolvedToAccountId,
        cardId: mode === 'Credit Card' ? (cards[0]?.id || 'card_1') : undefined,
        memberId: memberId || 'Self',
        payee: payee.trim() || undefined,
        note: note.trim() || undefined,
        tags: tags.split(',').map(s => s.trim()).filter(Boolean),
        receiptId: receiptPhoto ? 'receipt_saved' : undefined,
      };

      await addOrUpdateTransaction(newTx);

      showToast(`Saved ${formatINR(evaluatedAmount)} in ${category}`, async () => {
        // undo handler
      });

      if (addAnother) {
        setAmountExpr('');
        setPayee('');
        setNote('');
        setDuplicateWarning(null);
        setBypassDuplicate(false);
        setTimeout(() => amountInputRef.current?.focus(), 100);
      } else {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-600/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-white border border-zinc-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Tabs: Expense | Income | Invest | Transfer */}
        <div className="flex items-center justify-between p-3 border-b border-zinc-200 bg-zinc-50/80">
          <div className="flex bg-zinc-200/70 p-1 rounded-2xl text-xs font-bold gap-1">
            {(['expense', 'income', 'invest', 'transfer'] as TransactionType[]).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setType(tab);
                  if (tab === 'expense') setCategory('EMI');
                  else if (tab === 'income') setCategory('Salary');
                  else if (tab === 'invest') setCategory('INVEST');
                  else if (tab === 'transfer') setCategory('Account Transfer');
                }}
                className={`px-3 py-1.5 rounded-xl capitalize transition ${
                  type === tab
                    ? 'bg-white shadow-xs text-zinc-900'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Duplicate Warning Prompt */}
          {duplicateWarning && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Looks like a duplicate of existing entry</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Found {formatINR(duplicateWarning.amount)} on {duplicateWarning.date} in "{duplicateWarning.category}". Save anyway?
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setBypassDuplicate(true);
                    handleSubmit(false);
                  }}
                  className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                >
                  Save Anyway
                </button>
                <button
                  type="button"
                  onClick={() => setDuplicateWarning(null)}
                  className="px-3 py-1 rounded-lg border border-amber-300 text-amber-800 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* 1. AMOUNT FIRST (Keypad & Calculator input per Section 7) */}
          <div className="space-y-1">
            <div className="flex justify-between text-zinc-500 font-semibold text-[11px]">
              <span>Amount (Calculator e.g. 120+45)</span>
              {evaluatedAmount > 0 && evaluatedAmount !== parseFloat(amountExpr) && (
                <span className="font-mono font-bold text-emerald-600">= {formatINR(evaluatedAmount)}</span>
              )}
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-zinc-400 font-extrabold text-xl">₹</span>
              <input
                ref={amountInputRef}
                type="text"
                inputMode="text"
                placeholder="0"
                value={amountExpr}
                onChange={e => setAmountExpr(e.target.value)}
                className="w-full pl-9 pr-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-200 font-mono font-black text-2xl text-zinc-900 placeholder:text-zinc-300 focus:border-emerald-500 focus:outline-hidden shadow-inner"
              />
            </div>
          </div>

          {/* Budget Crossing Alert */}
          {budgetCrossingWarning && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>Warning: {budgetCrossingWarning}</span>
            </div>
          )}

          {/* 2. CATEGORY PICKER (Section 7 A-Z & Recents) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Category
              </label>
              <button
                type="button"
                onClick={() => setIsCategorySheetOpen(prev => !prev)}
                className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
              >
                <span>{category}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Recents & Most Used Chips Strip */}
            <div className="flex flex-wrap gap-1.5">
              {mostUsedCategories.slice(0, 6).map((c, idx) => (
                <button
                  key={`${c}-${idx}`}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition ${
                    category === c
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Detailed Category Sheet Modal */}
            {isCategorySheetOpen && (
              <div className="p-3.5 rounded-2xl border border-zinc-200 bg-zinc-50/90 space-y-3">
                {/* Search & Mode Toggle */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search category or group..."
                      value={catSearch}
                      onChange={e => setCatSearch(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs"
                    />
                  </div>

                  <div className="flex bg-zinc-200 p-0.5 rounded-xl text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setCatPickerMode('az')}
                      className={`px-2 py-1 rounded-lg ${catPickerMode === 'az' ? 'bg-white shadow-xs' : 'text-zinc-500'}`}
                    >
                      A→Z
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatPickerMode('group')}
                      className={`px-2 py-1 rounded-lg ${catPickerMode === 'group' ? 'bg-white shadow-xs' : 'text-zinc-500'}`}
                    >
                      By Group
                    </button>
                  </div>
                </div>

                {/* Categories List */}
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {catPickerMode === 'az' ? (
                    Object.entries(groupedAlphabetical).map(([letter, cats], gIdx) => (
                      <div key={`${letter}-${gIdx}`} className="space-y-1">
                        <div className="text-[10px] font-black text-emerald-600 bg-zinc-200/60 px-2 py-0.5 rounded">
                          {letter}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {cats.map((c, idx) => (
                            <button
                              key={`${c}-${idx}`}
                              type="button"
                              onClick={() => {
                                setCategory(c);
                                setIsCategorySheetOpen(false);
                              }}
                              className={`p-2 rounded-xl text-left border transition text-xs font-semibold ${
                                category === c
                                  ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                                  : 'bg-white border-zinc-200 hover:border-zinc-300'
                              }`}
                            >
                              <div className="truncate">{c}</div>
                              <div className="text-[9px] text-zinc-400 truncate">
                                {categoryToGroupMap[c] || 'General'}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    Object.entries(groupedByTree).map(([grp, cats], gIdx) => (
                      <div key={`${grp}-${gIdx}`} className="space-y-1">
                        <div className="text-[10px] font-bold text-zinc-500 flex items-center gap-1">
                          <FolderTree className="w-3 h-3 text-purple-500" />
                          <span>{grp}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {cats.map((c, idx) => (
                            <button
                              key={`${c}-${idx}`}
                              type="button"
                              onClick={() => {
                                setCategory(c);
                                setIsCategorySheetOpen(false);
                              }}
                              className={`p-2 rounded-xl text-left border transition text-xs font-semibold ${
                                category === c
                                  ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                                  : 'bg-white border-zinc-200'
                              }`}
                            >
                              <div className="truncate">{c}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 3. DATE (Today / Yesterday Chips + Picker) */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Date</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDate(todayDateStr)}
                className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
                  date === todayDateStr
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-100 text-zinc-700'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDate(yesterdayDateStr)}
                className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
                  date === yesterdayDateStr
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-100 text-zinc-700'
                }`}
              >
                Yesterday
              </button>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900"
              />
            </div>
          </div>

          {/* 4. ACCOUNT / PAYMENT MODE & MEMBER (Interconnected Data) */}
          {type === 'transfer' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  From Account
                </label>
                <select
                  value={selectedAccountId || accounts[0]?.id || ''}
                  onChange={e => setSelectedAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 font-semibold text-xs"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.kind})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  To Account
                </label>
                <select
                  value={transferToAccountId || accounts[1]?.id || accounts[0]?.id || ''}
                  onChange={e => setTransferToAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 font-semibold text-xs"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.kind})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Payment Mode & Account
                </label>
                <select
                  value={mode}
                  onChange={e => {
                    const m = e.target.value;
                    setMode(m);
                    if (m === 'Cash') {
                      setSelectedAccountId(accounts.find(a => a.kind === 'cash')?.id || 'acc_cash_1');
                    } else if (m === 'UPI') {
                      setSelectedAccountId(accounts.find(a => a.kind === 'wallet')?.id || 'acc_wallet_1');
                    } else if (m === 'Bank' || m === 'Net Banking' || m === 'Debit Card') {
                      setSelectedAccountId(accounts.find(a => a.kind === 'bank')?.id || 'acc_bank_1');
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 font-semibold text-xs"
                >
                  {settings.paymentModes.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Family Member
                </label>
                <select
                  value={memberId}
                  onChange={e => setMemberId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 font-semibold text-xs"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.name}>
                      {m.name} {m.relation ? `(${m.relation})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* 5. PAYEE & NOTE */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Payee (Auto-suggests)
              </label>
              <input
                type="text"
                placeholder="e.g. Zomato, Pharmacy"
                value={payee}
                onChange={e => handlePayeeChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Note / Description
              </label>
              <input
                type="text"
                placeholder="e.g. Dinner with family"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900"
              />
            </div>
          </div>

          {/* 6. TAGS & RECEIPT PHOTO */}
          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Tags (Comma separated)
              </label>
              <input
                type="text"
                placeholder="food, travel, personal"
                value={tags}
                onChange={e => setTags(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Receipt Photo (&lt;200KB)
              </label>
              <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-zinc-300 hover:bg-zinc-50 cursor-pointer font-semibold text-zinc-600">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>{receiptPhoto ? 'Photo Attached ✓' : 'Add Photo'}</span>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-zinc-200 bg-zinc-50/80 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-zinc-300 text-zinc-700 font-semibold hover:bg-zinc-100 transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {!editTransaction && (
              <button
                type="button"
                disabled={isSubmitting || evaluatedAmount <= 0}
                onClick={() => handleSubmit(true)}
                className="px-3.5 py-2 rounded-xl border border-emerald-600 text-emerald-600 hover:bg-emerald-50 font-bold transition disabled:opacity-50"
              >
                Save & Add Another
              </button>
            )}

            <button
              type="button"
              disabled={isSubmitting || evaluatedAmount <= 0}
              onClick={() => handleSubmit(false)}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{editTransaction ? 'Update Entry' : 'Save Entry'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
