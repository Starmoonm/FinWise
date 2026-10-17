import React, { useState, useMemo } from 'react';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Search,
  Layers,
  FolderPlus,
  TrendingDown,
  TrendingUp,
  Coins,
  ArrowRightLeft,
  Check,
  AlertCircle,
  HelpCircle,
  ShoppingBag,
  HeartPulse,
  Home,
  CreditCard,
  Coffee,
  Car,
  Gift,
  Users,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../utils/formatters';
import { ConfirmDialog } from '../common/ConfirmDialog';

const GROUP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Family Support': Users,
  'Kitchen & Grocery': ShoppingBag,
  'Health': HeartPulse,
  'Home & Bills': Home,
  'Loans & EMI': CreditCard,
  'Personal & Shopping': Coffee,
  'Food Outside': Coffee,
  'Travel & Transport': Car,
  'Social & Giving': Gift,
  'Other': HelpCircle,
};

export const CategoriesScreen: React.FC = () => {
  const {
    settings,
    transactions,
    activeMonthKey,
    groups,
    addCategory,
    renameCategory,
    deleteCategory,
    mergeCategories,
    addOrUpdateBudget,
    showToast,
  } = useFinance();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addCatName, setAddCatName] = useState('');
  const [addCatType, setAddCatType] = useState<'expense' | 'income'>('expense');
  const [addCatGroup, setAddCatGroup] = useState('');
  const [addCatBudget, setAddCatBudget] = useState('');

  const [renameTarget, setRenameTarget] = useState<{ oldName: string; type: 'expense' | 'income' } | null>(null);
  const [renameInput, setRenameInput] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<{ name: string; type: 'expense' | 'income' } | null>(null);

  const [mergeTarget, setMergeTarget] = useState<string | null>(null);
  const [mergeDestination, setMergeDestination] = useState<string>('');

  // Active month spends per category
  const categorySpends = useMemo(() => {
    const spends: Record<string, { total: number; count: number }> = {};
    for (const t of transactions) {
      if (t.date.startsWith(activeMonthKey)) {
        if (!spends[t.category]) {
          spends[t.category] = { total: 0, count: 0 };
        }
        spends[t.category].total += t.amount;
        spends[t.category].count += 1;
      }
    }
    return spends;
  }, [transactions, activeMonthKey]);

  // Available groups
  const groupNames = useMemo(() => {
    if (groups && groups.length > 0) return groups.map(g => g.name);
    return [
      'Family Support',
      'Kitchen & Grocery',
      'Health',
      'Home & Bills',
      'Loans & EMI',
      'Personal & Shopping',
      'Food Outside',
      'Travel & Transport',
      'Social & Giving',
      'Other',
    ];
  }, [groups]);

  // All combined categories with metadata
  const categoryItems = useMemo(() => {
    const list: Array<{
      name: string;
      type: 'expense' | 'income';
      group: string;
      budgetLimit?: number;
      spent: number;
      txCount: number;
    }> = [];

    // Expenses
    for (const cat of settings.expenseCategories) {
      const budget = settings.budgets.find(b => b.categories.includes(cat) || b.name === cat);
      // Group finding
      let grp = 'Other';
      if (groups) {
        const found = groups.find(g => g.categories?.includes(cat));
        if (found) grp = found.name;
      }
      const spend = categorySpends[cat] || { total: 0, count: 0 };
      list.push({
        name: cat,
        type: 'expense',
        group: grp,
        budgetLimit: budget?.limit,
        spent: spend.total,
        txCount: spend.count,
      });
    }

    // Incomes
    for (const cat of settings.incomeCategories) {
      const spend = categorySpends[cat] || { total: 0, count: 0 };
      list.push({
        name: cat,
        type: 'income',
        group: 'Income Sources',
        spent: spend.total,
        txCount: spend.count,
      });
    }

    return list;
  }, [settings, groups, categorySpends]);

  // Filtered
  const filteredCategories = useMemo(() => {
    return categoryItems.filter(item => {
      if (filterType !== 'all' && item.type !== filterType) return false;
      if (selectedGroup !== 'all' && item.group !== selectedGroup) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.group.toLowerCase().includes(q);
      }
      return true;
    });
  }, [categoryItems, filterType, selectedGroup, search]);

  // Grouped by Group Name
  const groupedCategories = useMemo(() => {
    const map = new Map<string, typeof filteredCategories>();
    for (const item of filteredCategories) {
      if (!map.has(item.group)) {
        map.set(item.group, []);
      }
      map.get(item.group)!.push(item);
    }
    return map;
  }, [filteredCategories]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCatName.trim()) return;

    await addCategory(addCatName.trim(), addCatType, addCatGroup);

    if (addCatBudget && Number(addCatBudget) > 0 && addCatType === 'expense') {
      await addOrUpdateBudget({
        name: addCatName.trim(),
        limit: Number(addCatBudget),
        categories: [addCatName.trim()],
        fixed: false,
      });
    }

    showToast(`Added category "${addCatName.trim()}"`);
    setIsAddModalOpen(false);
    setAddCatName('');
    setAddCatBudget('');
    setAddCatGroup('');
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameInput.trim()) return;
    await renameCategory(renameTarget.oldName, renameInput.trim(), renameTarget.type);
    showToast(`Renamed to "${renameInput.trim()}"`);
    setRenameTarget(null);
    setRenameInput('');
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteCategory(deleteTarget.name, deleteTarget.type);
    showToast(`Deleted category "${deleteTarget.name}"`);
    setDeleteTarget(null);
  };

  const handleMergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mergeTarget || !mergeDestination || mergeTarget === mergeDestination) return;
    await mergeCategories(mergeTarget, mergeDestination);
    showToast(`Merged "${mergeTarget}" into "${mergeDestination}"`);
    setMergeTarget(null);
    setMergeDestination('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3.5 sm:px-6 py-6 pb-24 md:pb-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <Tag className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">
              Categories & Groups
            </h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Organize expenses and income across groups, assign budgets, and maintain clean categorization
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setAddCatType('expense');
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Expense Categories</span>
          <div className="text-xl font-bold font-mono text-zinc-900 mt-1">
            {settings.expenseCategories.length}
          </div>
          <span className="text-[10px] text-zinc-400">Across {groupNames.length} groups</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Income Sources</span>
          <div className="text-xl font-bold font-mono text-emerald-600 mt-1">
            {settings.incomeCategories.length}
          </div>
          <span className="text-[10px] text-zinc-400">Salary, Business, Freelance...</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Active Budgets</span>
          <div className="text-xl font-bold font-mono text-blue-600 mt-1">
            {settings.budgets.length}
          </div>
          <span className="text-[10px] text-zinc-400">Fixed & flexible limits</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Month Entries</span>
          <div className="text-xl font-bold font-mono text-purple-600 mt-1">
            {transactions.filter(t => t.date.startsWith(activeMonthKey)).length}
          </div>
          <span className="text-[10px] text-zinc-400">{activeMonthKey} entries</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 p-3 bg-white rounded-2xl border border-zinc-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search category or group..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Type filters */}
          <div className="flex bg-zinc-100 p-1 rounded-xl shrink-0">
            {(['all', 'expense', 'income'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition ${
                  filterType === type
                    ? 'bg-white text-zinc-900 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Group dropdown */}
          <select
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 shrink-0"
          >
            <option value="all">All Groups</option>
            {groupNames.map(g => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
            <option value="Income Sources">Income Sources</option>
          </select>
        </div>
      </div>

      {/* Grouped Category Listing */}
      <div className="space-y-6">
        {Array.from(groupedCategories.entries()).map(([groupName, items]) => {
          const Icon = GROUP_ICONS[groupName] || Layers;
          const totalGroupSpent = items.reduce((sum, it) => sum + it.spent, 0);

          return (
            <div
              key={groupName}
              className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden"
            >
              {/* Group Header */}
              <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900">{groupName}</h3>
                    <span className="text-[10px] text-zinc-400">
                      {items.length} {items.length === 1 ? 'category' : 'categories'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 block">{activeMonthKey} spend</span>
                  <span className="text-xs font-mono font-bold text-zinc-900">
                    {formatINR(totalGroupSpent)}
                  </span>
                </div>
              </div>

              {/* Category rows */}
              <div className="divide-y divide-zinc-100">
                {items.map((cat, idx) => {
                  const hasBudget = cat.budgetLimit && cat.budgetLimit > 0;
                  const isOverBudget = hasBudget && cat.spent > (cat.budgetLimit || 0);

                  return (
                    <div
                      key={`${cat.name}-${idx}`}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50/50 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            cat.type === 'expense' ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-900 truncate">
                              {cat.name}
                            </span>
                            <span
                              className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                cat.type === 'expense'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              {cat.type}
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-400 flex items-center gap-2 mt-0.5">
                            <span>{cat.txCount} entries this month</span>
                            {hasBudget && (
                              <span>
                                · Budget: <strong className="font-mono text-zinc-600">{formatINR(cat.budgetLimit!)}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Spend & Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <div className="text-right">
                          <div className={`text-xs font-mono font-bold ${isOverBudget ? 'text-rose-600' : 'text-zinc-800'}`}>
                            {formatINR(cat.spent)}
                          </div>
                          {isOverBudget && (
                            <span className="text-[9px] font-bold text-rose-500 flex items-center gap-0.5">
                              <AlertCircle className="w-2.5 h-2.5" />
                              Over budget
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 border-l border-zinc-200 pl-2">
                          <button
                            title="Rename Category"
                            onClick={() => {
                              setRenameTarget({ oldName: cat.name, type: cat.type });
                              setRenameInput(cat.name);
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-zinc-100 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            title="Merge into another category"
                            onClick={() => {
                              setMergeTarget(cat.name);
                              const others = (cat.type === 'expense' ? settings.expenseCategories : settings.incomeCategories).filter(
                                c => c !== cat.name
                              );
                              setMergeDestination(others[0] || '');
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-purple-600 hover:bg-zinc-100 transition"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>

                          <button
                            title="Delete Category"
                            onClick={() => setDeleteTarget({ name: cat.name, type: cat.type })}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD CATEGORY MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-600/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-zinc-900">Add New Category</h3>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Category Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAddCatType('expense')}
                    className={`p-2 rounded-xl text-xs font-bold border transition ${
                      addCatType === 'expense'
                        ? 'bg-rose-50 border-rose-400 text-rose-700'
                        : 'border-zinc-200 text-zinc-500'
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddCatType('income')}
                    className={`p-2 rounded-xl text-xs font-bold border transition ${
                      addCatType === 'income'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                        : 'border-zinc-200 text-zinc-500'
                    }`}
                  >
                    Income
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Groceries, Gym, OTT Subscriptions"
                  value={addCatName}
                  onChange={e => setAddCatName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900"
                />
              </div>

              {addCatType === 'expense' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Category Group</label>
                    <select
                      value={addCatGroup}
                      onChange={e => setAddCatGroup(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900"
                    >
                      <option value="">Select a Group</option>
                      {groupNames.map(g => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Monthly Budget Limit (₹ Optional)</label>
                    <input
                      type="number"
                      placeholder="e.g. 5000"
                      value={addCatBudget}
                      onChange={e => setAddCatBudget(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-zinc-200 text-zinc-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENAME MODAL */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 bg-slate-600/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-zinc-900">
              Rename "{renameTarget.oldName}"
            </h3>
            <p className="text-xs text-zinc-500">
              Renaming will automatically update all existing historical transactions under this category.
            </p>

            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <input
                type="text"
                required
                value={renameInput}
                onChange={e => setRenameInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameTarget(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Save Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MERGE MODAL */}
      {mergeTarget && (
        <div className="fixed inset-0 z-50 bg-slate-600/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-zinc-900">
              Merge "{mergeTarget}"
            </h3>
            <p className="text-xs text-zinc-500">
              All transactions currently assigned to <strong>{mergeTarget}</strong> will be moved into the destination category, and "{mergeTarget}" will be retired.
            </p>

            <form onSubmit={handleMergeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Merge Into</label>
                <select
                  value={mergeDestination}
                  onChange={e => setMergeDestination(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900"
                >
                  {settings.expenseCategories
                    .filter(c => c !== mergeTarget)
                    .map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMergeTarget(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Execute Merge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM DIALOG */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={true}
          title={`Delete Category "${deleteTarget.name}"?`}
          message="Are you sure? Existing transactions in this category will be preserved but the category will be removed from your active category list."
          confirmLabel="Delete Category"
          confirmVariant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
