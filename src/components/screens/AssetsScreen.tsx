import React, { useState, useMemo } from 'react';
import {
  Database,
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  TrendingUp,
  Sparkles,
  Calculator,
  Coins,
  Home,
  Car,
  Landmark,
  Banknote,
  Layers,
  ChevronRight,
  LineChart as LineChartIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import { Asset, AssetType } from '../../types';
import { formatINR, formatCompactINR } from '../../utils/formatters';
import { ConfirmDialog } from '../common/ConfirmDialog';

const PALETTE = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#64748b'];

const ASSET_TYPES: Array<{ type: AssetType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { type: 'gold', label: 'Gold Jewellery', icon: Coins },
  { type: 'property', label: 'Property / Real Estate', icon: Home },
  { type: 'land', label: 'Land / Farm', icon: Layers },
  { type: 'vehicle', label: 'Vehicle', icon: Car },
  { type: 'cash', label: 'Cash at Home', icon: Banknote },
  { type: 'other', label: 'Other Asset', icon: Database },
];

export const AssetsScreen: React.FC = () => {
  const {
    assets,
    todayDateStr,
    addOrUpdateAsset,
    deleteAsset,
    showToast,
  } = useFinance();

  const [filterType, setFilterType] = useState<string>('all');
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Global Gold Rate quick helper (₹ / gram, e.g. ₹7,650/g for 24K / 22K)
  const [todayGoldRate, setTodayGoldRate] = useState<number>(7650);

  // Form states
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<AssetType>('gold');
  const [formValue, setFormValue] = useState('');
  const [formGoldGrams, setFormGoldGrams] = useState('');
  const [formGoldRate, setFormGoldRate] = useState(String(todayGoldRate));
  const [formVehicleDepreciation, setFormVehicleDepreciation] = useState('10'); // 10% per year
  const [formPurchasePrice, setFormPurchasePrice] = useState('');
  const [formPurchaseDate, setFormPurchaseDate] = useState('2024-01-01');
  const [formNote, setFormNote] = useState('');

  // Asset type icon helper
  const getAssetIcon = (type?: AssetType) => {
    switch (type) {
      case 'gold': return Coins;
      case 'property': return Home;
      case 'land': return Layers;
      case 'vehicle': return Car;
      case 'cash': return Banknote;
      default: return Database;
    }
  };

  // KPIs
  const kpis = useMemo(() => {
    const totalAssets = assets.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
    const goldValue = assets.filter(a => a.type === 'gold').reduce((sum, a) => sum + (Number(a.value) || 0), 0);
    const realEstate = assets.filter(a => a.type === 'property' || a.type === 'land').reduce((sum, a) => sum + (Number(a.value) || 0), 0);
    const vehicleValue = assets.filter(a => a.type === 'vehicle').reduce((sum, a) => sum + (Number(a.value) || 0), 0);
    const cashAtHome = assets.filter(a => a.type === 'cash').reduce((sum, a) => sum + (Number(a.value) || 0), 0);

    return {
      totalAssets,
      goldValue,
      realEstate,
      vehicleValue,
      cashAtHome,
      count: assets.length,
    };
  }, [assets]);

  // Allocation Donut
  const allocationByType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of assets) {
      const typeLabel = ASSET_TYPES.find(t => t.type === a.type)?.label || 'Other';
      map[typeLabel] = (map[typeLabel] || 0) + (Number(a.value) || 0);
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [assets]);

  // Total Assets Trend Chart
  const assetTrendChart = useMemo(() => {
    const months = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
    const curTotal = kpis.totalAssets;

    return months.map((mKey, idx) => {
      const d = new Date(`${mKey}-01`);
      // slight gradual trend backwards for visualization
      const estimatedVal = Math.round(curTotal * (1 - (5 - idx) * 0.012));
      return {
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        value: idx === 5 ? curTotal : Math.max(0, estimatedVal),
      };
    });
  }, [kpis.totalAssets]);

  // Open Add modal
  const openAddModal = (type: AssetType = 'gold') => {
    setEditingAsset(null);
    setFormType(type);
    if (type === 'gold') {
      setFormName('Gold Jewellery');
      setFormGoldGrams('20');
      setFormGoldRate(String(todayGoldRate));
      setFormValue(String(20 * todayGoldRate));
    } else if (type === 'vehicle') {
      setFormName('Car / Bike');
      setFormPurchasePrice('800000');
      setFormVehicleDepreciation('10');
      setFormValue('640000');
    } else {
      setFormName('');
      setFormValue('50000');
    }
    setFormPurchaseDate('2024-01-01');
    setFormNote('');
    setIsAddEditOpen(true);
  };

  // Open Edit modal
  const openEditModal = (a: Asset) => {
    setEditingAsset(a);
    setFormName(a.name);
    setFormType(a.type || 'other');
    setFormValue(String(a.value));
    setFormGoldGrams(a.goldGrams ? String(a.goldGrams) : '');
    setFormGoldRate(a.goldRatePerGram ? String(a.goldRatePerGram) : String(todayGoldRate));
    setFormVehicleDepreciation(a.vehicleDepreciationPct ? String(a.vehicleDepreciationPct) : '10');
    setFormPurchasePrice(a.purchasePrice ? String(a.purchasePrice) : '');
    setFormPurchaseDate(a.purchaseDate || '2024-01-01');
    setFormNote(a.note || '');
    setIsAddEditOpen(true);
  };

  // Handle Save Asset
  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Please enter an asset name');
      return;
    }

    let finalVal = Number(formValue) || 0;
    if (formType === 'gold' && Number(formGoldGrams) > 0 && Number(formGoldRate) > 0) {
      finalVal = Math.round(Number(formGoldGrams) * Number(formGoldRate));
    } else if (formType === 'vehicle' && Number(formPurchasePrice) > 0) {
      // Calculate depreciated value: purchasePrice * (1 - depreciation)^years
      const pYear = new Date(formPurchaseDate).getFullYear() || 2024;
      const curYear = new Date(todayDateStr).getFullYear() || 2026;
      const yearsElapsed = Math.max(0, curYear - pYear);
      const depRate = (Number(formVehicleDepreciation) || 10) / 100;
      finalVal = Math.round(Number(formPurchasePrice) * Math.pow(1 - depRate, yearsElapsed));
    }

    const payload: Omit<Asset, 'id'> & { id?: string } = {
      id: editingAsset?.id,
      name: formName.trim(),
      type: formType,
      value: finalVal,
      goldGrams: formType === 'gold' ? Number(formGoldGrams) || undefined : undefined,
      goldRatePerGram: formType === 'gold' ? Number(formGoldRate) || undefined : undefined,
      vehicleDepreciationPct: formType === 'vehicle' ? Number(formVehicleDepreciation) || undefined : undefined,
      purchasePrice: Number(formPurchasePrice) || undefined,
      purchaseDate: formPurchaseDate || undefined,
      note: formNote.trim(),
      valueHistory: editingAsset?.valueHistory || [{ date: todayDateStr, value: finalVal }],
    };

    await addOrUpdateAsset(payload);
    setIsAddEditOpen(false);
    showToast(editingAsset ? 'Asset updated' : 'Asset added');
  };

  // Recalculate all gold assets when global gold rate changes
  const handleUpdateGlobalGoldRate = async () => {
    let updatedCount = 0;
    for (const a of assets) {
      if (a.type === 'gold' && a.goldGrams) {
        const newVal = Math.round(a.goldGrams * todayGoldRate);
        await addOrUpdateAsset({
          ...a,
          value: newVal,
          goldRatePerGram: todayGoldRate,
        });
        updatedCount++;
      }
    }
    showToast(`Updated ${updatedCount} gold holdings with rate ₹${todayGoldRate}/g`);
  };

  const filteredAssets = useMemo(() => {
    if (filterType === 'all') return assets;
    return assets.filter(a => a.type === filterType);
  }, [assets, filterType]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2.5">
            <Database className="w-7 h-7 text-emerald-600" />
            Physical & Fixed Assets
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Track gold jewellery (grams × rate), real estate, land, vehicles with depreciation, and cash at home
          </p>
        </div>

        <button
          onClick={() => openAddModal('gold')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Asset
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-sm">
          <span className="text-[11px] font-medium text-zinc-500">Total Physical Assets</span>
          <p className="text-lg font-bold text-emerald-600 mt-0.5">
            {formatINR(kpis.totalAssets)}
          </p>
          <span className="text-[10px] text-zinc-400">{assets.length} item{assets.length !== 1 ? 's' : ''} tracked</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-sm">
          <span className="text-[11px] font-medium text-zinc-500">Gold Holdings</span>
          <p className="text-lg font-bold text-amber-500 mt-0.5">
            {formatINR(kpis.goldValue)}
          </p>
          <span className="text-[10px] text-zinc-400">jewellery & coins</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-sm">
          <span className="text-[11px] font-medium text-zinc-500">Real Estate / Land</span>
          <p className="text-lg font-bold text-zinc-900 mt-0.5">
            {formatINR(kpis.realEstate)}
          </p>
          <span className="text-[10px] text-zinc-400">property & farmland</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-sm">
          <span className="text-[11px] font-medium text-zinc-500">Vehicles (Depreciated)</span>
          <p className="text-lg font-bold text-zinc-900 mt-0.5">
            {formatINR(kpis.vehicleValue)}
          </p>
          <span className="text-[10px] text-zinc-400">annual depreciation</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-sm">
          <span className="text-[11px] font-medium text-zinc-500">Cash at Home</span>
          <p className="text-lg font-bold text-zinc-900 mt-0.5">
            {formatINR(kpis.cashAtHome)}
          </p>
          <span className="text-[10px] text-zinc-400">physical reserves</span>
        </div>
      </div>

      {/* Gold Rate Bar */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-700">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-900">
              Gold Valuation Rate: ₹{todayGoldRate.toLocaleString('en-IN')} / gram
            </h4>
            <p className="text-xs text-amber-800/80">
              Update today's market rate to instantly revalue all gold jewellery holdings (grams × today's rate).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <input
            type="number"
            value={todayGoldRate}
            onChange={e => setTodayGoldRate(Number(e.target.value) || 0)}
            step="50"
            className="w-28 px-3 py-1.5 border border-amber-300 rounded-lg text-xs font-mono font-bold bg-white"
          />
          <button
            onClick={handleUpdateGlobalGoldRate}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            Apply to All Gold
          </button>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Allocation Donut */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-600" />
            Assets Breakdown by Type
          </h3>
          {allocationByType.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-zinc-400">
              No physical assets logged yet
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-1/2 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocationByType}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={64}
                      paddingAngle={3}
                    >
                      {allocationByType.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => [formatINR(Number(val) || 0), 'Value']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-full sm:w-1/2 space-y-1.5">
                {allocationByType.map((item, idx) => (
                  <div key={`${item.name}-${idx}`} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
                      <span className="truncate text-zinc-600">{item.name}</span>
                    </div>
                    <span className="font-semibold text-zinc-900">{formatINR(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Total Assets Trend */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Total Assets Trend
          </h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={assetTrendChart} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="assetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${formatCompactINR(v)}`} />
                <Tooltip formatter={(val: any) => [formatINR(Number(val) || 0), 'Total Assets']} />
                <Area type="monotone" dataKey="value" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#assetGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Add Type Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-500 mr-1">Quick Add:</span>
        {ASSET_TYPES.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={`${item.type}-${idx}`}
              onClick={() => openAddModal(item.type)}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:border-emerald-500 text-zinc-700 text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Icon className="w-3.5 h-3.5 text-emerald-600" />
              + {item.label}
            </button>
          );
        })}
      </div>

      {/* Assets List */}
      <div className="space-y-3">
        {filteredAssets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
            <Database className="w-10 h-10 text-zinc-400 mx-auto mb-2" />
            <h3 className="font-bold text-zinc-800 text-sm">No Assets Added</h3>
            <p className="text-xs text-zinc-500 mt-1">Click the buttons above to log gold jewellery, property, or vehicles.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssets.map(asset => {
              const Icon = getAssetIcon(asset.type);

              return (
                <div
                  key={asset.id}
                  className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-sm space-y-3 hover:border-zinc-300 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-zinc-900 text-sm">{asset.name}</h4>
                        <span className="text-[10px] uppercase font-semibold text-zinc-500">
                          {asset.type || 'other'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(asset)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(asset.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 text-xs space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-zinc-400 text-[11px]">Estimated Value:</span>
                      <span className="font-bold text-base text-zinc-900 font-mono">
                        {formatINR(asset.value)}
                      </span>
                    </div>

                    {asset.type === 'gold' && asset.goldGrams && (
                      <div className="flex justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-200/60">
                        <span>Gold Weight:</span>
                        <span className="font-medium text-amber-600 font-mono">
                          {asset.goldGrams}g @ ₹{asset.goldRatePerGram || todayGoldRate}/g
                        </span>
                      </div>
                    )}

                    {asset.type === 'vehicle' && asset.purchasePrice && (
                      <div className="flex justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-200/60">
                        <span>Depreciation:</span>
                        <span className="font-medium text-zinc-700">
                          {asset.vehicleDepreciationPct || 10}% / yr from {formatINR(asset.purchasePrice)}
                        </span>
                      </div>
                    )}
                  </div>

                  {asset.note && (
                    <p className="text-xs text-zinc-400 italic">"{asset.note}"</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Asset Modal */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-600/30 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-base font-bold text-zinc-900">
                {editingAsset ? 'Edit Asset' : 'Add Asset'}
              </h3>
              <button
                onClick={() => setIsAddEditOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-500 mb-1">Asset Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Gold Necklace, 2BHK Flat, Honda City"
                  className="w-full px-3 py-2 border rounded-lg bg-zinc-50 border-zinc-300"
                />
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">Asset Type</label>
                <select
                  value={formType}
                  onChange={e => setFormType(e.target.value as AssetType)}
                  className="w-full px-3 py-2 border rounded-lg bg-zinc-50 border-zinc-300"
                >
                  {ASSET_TYPES.map((item, idx) => (
                    <option key={`${item.type}-${idx}`} value={item.type}>{item.label}</option>
                  ))}
                </select>
              </div>

              {formType === 'gold' ? (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-amber-50/50 border border-amber-200">
                  <div>
                    <label className="block text-amber-800 font-medium mb-1">Gold Weight (grams)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={formGoldGrams}
                      onChange={e => {
                        setFormGoldGrams(e.target.value);
                        const g = Number(e.target.value) || 0;
                        const r = Number(formGoldRate) || todayGoldRate;
                        setFormValue(String(Math.round(g * r)));
                      }}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-amber-800 font-medium mb-1">Gold Rate (₹/g)</label>
                    <input
                      type="number"
                      value={formGoldRate}
                      onChange={e => {
                        setFormGoldRate(e.target.value);
                        const r = Number(e.target.value) || 0;
                        const g = Number(formGoldGrams) || 0;
                        setFormValue(String(Math.round(g * r)));
                      }}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-white font-mono"
                    />
                  </div>
                  <div className="col-span-2 text-[11px] font-semibold text-amber-700">
                    Calculated Gold Value: {formatINR(Number(formValue) || 0)}
                  </div>
                </div>
              ) : formType === 'vehicle' ? (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                  <div>
                    <label className="block text-zinc-500 mb-1">Purchase Price (₹)</label>
                    <input
                      type="number"
                      value={formPurchasePrice}
                      onChange={e => {
                        setFormPurchasePrice(e.target.value);
                        const p = Number(e.target.value) || 0;
                        setFormValue(String(p));
                      }}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">Yearly Depreciation %</label>
                    <input
                      type="number"
                      value={formVehicleDepreciation}
                      onChange={e => setFormVehicleDepreciation(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-white font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-zinc-500 mb-1">Purchase Date</label>
                    <input
                      type="date"
                      value={formPurchaseDate}
                      onChange={e => setFormPurchaseDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-zinc-500 mb-1">Estimated Asset Value (₹)</label>
                  <input
                    type="number"
                    required
                    value={formValue}
                    onChange={e => setFormValue(e.target.value)}
                    placeholder="50000"
                    className="w-full px-3 py-2 border rounded-lg bg-zinc-50 border-zinc-300 font-mono text-sm font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block text-zinc-500 mb-1">Notes / Description</label>
                <textarea
                  value={formNote}
                  onChange={e => setFormNote(e.target.value)}
                  placeholder="Optional details, location, purchase receipt info"
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg bg-zinc-50 border-zinc-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  {editingAsset ? 'Save Changes' : 'Create Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <ConfirmDialog
          isOpen={Boolean(deleteConfirmId)}
          title="Delete Asset"
          message="Are you sure you want to remove this asset? Net worth calculations will adjust accordingly."
          confirmLabel="Delete"
          onConfirm={async () => {
            await deleteAsset(deleteConfirmId);
            setDeleteConfirmId(null);
            showToast('Asset removed');
          }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
};
