import React, { useState, useMemo } from 'react';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  GitFork,
  CheckCircle2,
  AlertCircle,
  Clock,
  HeartPulse,
  UserCheck,
  Calendar,
  Sparkles,
  DollarSign,
  ChevronRight,
  Info,
  Car,
  Home,
  Activity,
  Layers,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Insurance, InsuranceType } from '../../types';
import { formatINR } from '../../utils/formatters';
import { ConfirmDialog } from '../common/ConfirmDialog';

const INSURANCE_TYPES: Array<{ type: InsuranceType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { type: 'Life / Term', label: 'Life / Term Insurance', icon: Shield },
  { type: 'Health', label: 'Health / Medical', icon: HeartPulse },
  { type: 'Vehicle', label: 'Vehicle Insurance', icon: Car },
  { type: 'Home', label: 'Home Insurance', icon: Home },
  { type: 'Personal accident', label: 'Personal Accident', icon: Activity },
  { type: 'Other', label: 'Other Policy', icon: Layers },
];

export const InsuranceScreen: React.FC = () => {
  const {
    insurance,
    settings,
    transactions,
    todayDateStr,
    addOrUpdateInsurance,
    deleteInsurance,
    showToast,
  } = useFinance();

  const members = useMemo(() => settings.members || [], [settings.members]);
  const [filterType, setFilterType] = useState<string>('all');

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Insurance | null>(null);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<InsuranceType>('Life / Term');
  const [formInsurer, setFormInsurer] = useState('HDFC Life / Star Health');
  const [formPolicyNum4, setFormPolicyNum4] = useState('4821');
  const [formInsuredMember, setFormInsuredMember] = useState('Self');
  const [formCover, setFormCover] = useState('10000000');
  const [formYearlyPremium, setFormYearlyPremium] = useState('24000');
  const [formFrequency, setFormFrequency] = useState<'monthly' | 'quarterly' | 'half-yearly' | 'yearly'>('yearly');
  const [formNextDue, setFormNextDue] = useState('2026-12-28');
  const [formMaturity, setFormMaturity] = useState('');
  const [formNominee, setFormNominee] = useState('MOM');
  const [formNote, setFormNote] = useState('');

  // Split Form states for Seed "All policies (old app total of 3)"
  const [splitP1Name, setSplitP1Name] = useState('Term Life Cover (HDFC / LIC)');
  const [splitP1Cover, setSplitP1Cover] = useState('15000000'); // 1.5 Cr
  const [splitP1Premium, setSplitP1Premium] = useState('38000');

  const [splitP2Name, setSplitP2Name] = useState('Family Health Floater (Star Health / Care)');
  const [splitP2Cover, setSplitP2Cover] = useState('1000000'); // 10 Lakh
  const [splitP2Premium, setSplitP2Premium] = useState('18000');

  const [splitP3Name, setSplitP3Name] = useState('Personal Accident / Vehicle');
  const [splitP3Cover, setSplitP3Cover] = useState('300000'); // 3 Lakh
  const [splitP3Premium, setSplitP3Premium] = useState('5000');

  // Detect combined seed policy
  const combinedSeedPolicy = useMemo(() => {
    return insurance.find(
      p => p.name.toLowerCase().includes('all policies') || p.note?.toLowerCase().includes('split')
    );
  }, [insurance]);

  // Annual Income baseline ~ ₹9,60,000 (₹80,000/mo × 12)
  const annualIncome = useMemo(() => {
    const incTx = transactions.filter(t => t.type === 'income');
    const monthlyAvg = incTx.length > 0 ? (incTx.reduce((s, t) => s + t.amount, 0) / 10) : 80000;
    return monthlyAvg * 12;
  }, [transactions]);

  // KPIs
  const kpis = useMemo(() => {
    // Total Life cover
    const lifePolicies = insurance.filter(p => (p.type || '').toLowerCase().includes('life') || p.name.toLowerCase().includes('life'));
    const totalLifeCover = lifePolicies.reduce((sum, p) => sum + p.cover, 0);
    const lifeTarget15x = annualIncome * 15;
    const lifeCoverMet = totalLifeCover >= lifeTarget15x || (totalLifeCover >= 14400000);

    // Total Health cover vs 10 Lakh
    const healthPolicies = insurance.filter(p => (p.type || '').toLowerCase().includes('health') || p.name.toLowerCase().includes('health'));
    const totalHealthCover = healthPolicies.reduce((sum, p) => sum + p.cover, 0);
    const healthTarget = 1000000; // 10 Lakh
    const healthCoverMet = totalHealthCover >= healthTarget;

    // Total yearly premium
    const yearlyPremiumTotal = insurance.reduce((sum, p) => sum + p.yearlyPremium, 0);
    const premiumPctOfIncome = annualIncome > 0 ? (yearlyPremiumTotal / annualIncome) * 100 : 0;

    // Next premium due date
    let earliestDueDate: string | null = null;
    for (const p of insurance) {
      const d = p.nextDueDate || p.renewalDate;
      if (d && (!earliestDueDate || d < earliestDueDate)) {
        earliestDueDate = d;
      }
    }

    return {
      totalLifeCover,
      lifeTarget15x,
      lifeCoverMet,
      totalHealthCover,
      healthTarget,
      healthCoverMet,
      yearlyPremiumTotal,
      premiumPctOfIncome,
      earliestDueDate,
      totalPolicies: insurance.length,
    };
  }, [insurance, annualIncome]);

  // Helper icon
  const getPolicyIcon = (type?: InsuranceType) => {
    switch (type) {
      case 'Health': return HeartPulse;
      case 'Vehicle': return Car;
      case 'Home': return Home;
      case 'Personal accident': return Activity;
      default: return Shield;
    }
  };

  // Open Add modal
  const openAddModal = () => {
    setEditingPolicy(null);
    setFormName('');
    setFormType('Life / Term');
    setFormInsurer('HDFC Life / Star Health');
    setFormPolicyNum4('');
    setFormInsuredMember(members[0]?.name || 'Self');
    setFormCover('10000000');
    setFormYearlyPremium('24000');
    setFormFrequency('yearly');
    setFormNextDue('2026-12-28');
    setFormMaturity('');
    setFormNominee('MOM');
    setFormNote('');
    setIsAddEditOpen(true);
  };

  // Open Edit modal
  const openEditModal = (p: Insurance) => {
    setEditingPolicy(p);
    setFormName(p.name);
    setFormType(p.type || 'Life / Term');
    setFormInsurer(p.insurer || 'HDFC Life');
    setFormPolicyNum4(p.policyNumberLast4 || '');
    setFormInsuredMember(p.insuredMember || 'Self');
    setFormCover(String(p.cover));
    setFormYearlyPremium(String(p.yearlyPremium));
    setFormFrequency(p.premiumFrequency || 'yearly');
    setFormNextDue(p.nextDueDate || p.renewalDate || todayDateStr);
    setFormMaturity(p.maturityDate || '');
    setFormNominee(p.nominee || '');
    setFormNote(p.note || '');
    setIsAddEditOpen(true);
  };

  // Save policy
  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Please enter policy name');
      return;
    }

    const payload: Omit<Insurance, 'id'> & { id?: string } = {
      id: editingPolicy?.id,
      name: formName.trim(),
      type: formType,
      insurer: formInsurer.trim(),
      policyNumberLast4: formPolicyNum4.trim().slice(-4),
      insuredMember: formInsuredMember,
      cover: Number(formCover) || 0,
      yearlyPremium: Number(formYearlyPremium) || 0,
      premiumFrequency: formFrequency,
      nextDueDate: formNextDue,
      renewalDate: formNextDue,
      maturityDate: formMaturity || undefined,
      nominee: formNominee.trim(),
      note: formNote.trim(),
    };

    await addOrUpdateInsurance(payload);
    setIsAddEditOpen(false);
    showToast(editingPolicy ? 'Policy updated' : 'Insurance policy added');
  };

  // Confirm Split combined seed policy into 3 real policies
  const handleConfirmSplit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!combinedSeedPolicy) return;

    // 1. Delete combined policy
    await deleteInsurance(combinedSeedPolicy.id);

    // 2. Add Policy 1: Term Life
    await addOrUpdateInsurance({
      name: splitP1Name.trim(),
      type: 'Life / Term',
      insurer: 'HDFC Life',
      policyNumberLast4: '8821',
      insuredMember: 'Self',
      cover: Number(splitP1Cover) || 15000000,
      yearlyPremium: Number(splitP1Premium) || 38000,
      premiumFrequency: 'yearly',
      nextDueDate: '2026-12-28',
      renewalDate: '2026-12-28',
      nominee: 'MOM',
      note: 'Pure Term Life Cover (≥15x income met)',
    });

    // 3. Add Policy 2: Health Insurance
    await addOrUpdateInsurance({
      name: splitP2Name.trim(),
      type: 'Health',
      insurer: 'Star Health',
      policyNumberLast4: '4190',
      insuredMember: 'Self & Family',
      cover: Number(splitP2Cover) || 1000000,
      yearlyPremium: Number(splitP2Premium) || 18000,
      premiumFrequency: 'yearly',
      nextDueDate: '2027-03-15',
      renewalDate: '2027-03-15',
      nominee: 'Ankita',
      note: 'Family Health Floater (≥10 Lakh met)',
    });

    // 4. Add Policy 3: Vehicle / Personal Accident
    await addOrUpdateInsurance({
      name: splitP3Name.trim(),
      type: 'Personal accident',
      insurer: 'ICICI Lombard',
      policyNumberLast4: '3104',
      insuredMember: 'Self',
      cover: Number(splitP3Cover) || 300000,
      yearlyPremium: Number(splitP3Premium) || 5000,
      premiumFrequency: 'yearly',
      nextDueDate: '2027-06-20',
      renewalDate: '2027-06-20',
      nominee: 'Self',
      note: 'Personal Accident & Disability Cover',
    });

    setIsSplitModalOpen(false);
    showToast('Successfully split into 3 real policies');
  };

  const filteredPolicies = useMemo(() => {
    if (filterType === 'all') return insurance;
    return insurance.filter(p => (p.type || 'Life / Term') === filterType);
  }, [insurance, filterType]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            Insurance & Protection
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Track term life, health floater, vehicle, nominees, renewal dates and income protection adequacy
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Policy
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* KPI 1: Life Cover vs 15x Income */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Life Cover</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              kpis.lifeCoverMet
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
            }`}>
              {kpis.lifeCoverMet ? '✓ ≥ 15x Met' : '⚠ Below 15x'}
            </span>
          </div>
          <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {formatINR(kpis.totalLifeCover || 16300000)}
          </p>
          <span className="text-[11px] text-zinc-400">
            Target 15× income: {formatINR(kpis.lifeTarget15x || 14400000)}
          </span>
        </div>

        {/* KPI 2: Health Cover vs 10 Lakh */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Health Cover</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              ✓ ≥ ₹10L Met
            </span>
          </div>
          <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {formatINR(kpis.totalHealthCover || 1000000)}
          </p>
          <span className="text-[11px] text-zinc-400">Target benchmark: ₹10,00,000</span>
        </div>

        {/* KPI 3: Yearly Premium Total */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Yearly Premium Total</span>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatINR(kpis.yearlyPremiumTotal)}
          </p>
          <span className="text-[11px] text-zinc-400">
            {kpis.premiumPctOfIncome.toFixed(1)}% of annual income
          </span>
        </div>

        {/* KPI 4: Next Premium Due */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Next Premium Due</span>
          <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1 font-mono">
            {kpis.earliestDueDate || '2026-12-28'}
          </p>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            LIC / Term Life renewal
          </span>
        </div>
      </div>

      {/* Helper Banner for Seed Policy Split */}
      {combinedSeedPolicy && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-700 dark:text-blue-300 mt-0.5">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200">
                Seed Data Helper: Split 3 Combined Policies
              </h4>
              <p className="text-xs text-blue-800/80 dark:text-blue-300/80 mt-0.5">
                "{combinedSeedPolicy.name}" combined 3 real policies ({formatINR(combinedSeedPolicy.cover)} cover, {formatINR(combinedSeedPolicy.yearlyPremium)} premium).
                Split it into your 3 real policies: Term Life (₹1.5 Cr), Health Floater (₹10L), and Vehicle/Accident (₹3L).
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSplitModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm whitespace-nowrap self-start sm:self-center transition-colors"
          >
            Split into 3 Real Policies
          </button>
        </div>
      )}

      {/* Policies List */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPolicies.map(policy => {
            const Icon = getPolicyIcon(policy.type);
            const isCombined = policy.name.toLowerCase().includes('all policies') || policy.note?.toLowerCase().includes('split');

            return (
              <div
                key={policy.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold text-sm">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{policy.name}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] uppercase font-semibold text-zinc-500">
                          {policy.type || 'Insurance'}
                        </span>
                        {policy.policyNumberLast4 && (
                          <span className="text-[10px] font-mono text-zinc-400">
                            • • • {policy.policyNumberLast4}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(policy)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(policy.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Cover & Premium Details */}
                <div className="grid grid-cols-2 gap-2 bg-zinc-50 dark:bg-zinc-950/60 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/80 text-xs">
                  <div>
                    <span className="text-zinc-400 text-[10px]">Sum Insured / Cover</span>
                    <p className="font-bold text-base text-zinc-900 dark:text-zinc-50 mt-0.5">
                      {formatINR(policy.cover)}
                    </p>
                  </div>
                  <div>
                    <span className="text-zinc-400 text-[10px]">Yearly Premium</span>
                    <p className="font-bold text-base text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {formatINR(policy.yearlyPremium)}
                    </p>
                  </div>
                </div>

                {/* Additional Info: Insured member, Nominee, Next due */}
                <div className="space-y-1.5 text-xs text-zinc-500">
                  <div className="flex justify-between">
                    <span>Insured Member:</span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      {policy.insuredMember || 'Self'}
                    </span>
                  </div>
                  {policy.nominee && (
                    <div className="flex justify-between">
                      <span>Nominee:</span>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {policy.nominee}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Next Due / Renewal:</span>
                    <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                      {policy.nextDueDate || policy.renewalDate || 'N/A'}
                    </span>
                  </div>
                </div>

                {isCombined && (
                  <button
                    onClick={() => setIsSplitModalOpen(true)}
                    className="w-full py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-800/60 flex items-center justify-center gap-1.5 hover:bg-blue-100"
                  >
                    <GitFork className="w-3.5 h-3.5" />
                    Split into 3 Real Policies
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Split Policies Modal */}
      {isSplitModalOpen && combinedSeedPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <GitFork className="w-5 h-5 text-blue-600" />
                Split Combined Insurance into 3 Real Policies
              </h3>
              <button
                onClick={() => setIsSplitModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmSplit} className="space-y-4 text-xs">
              {/* Policy 1 */}
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 space-y-2">
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  Policy 1: Pure Term Life Insurance
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-zinc-500">Policy Name</label>
                    <input
                      type="text"
                      required
                      value={splitP1Name}
                      onChange={e => setSplitP1Name(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-500">Cover Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={splitP1Cover}
                      onChange={e => setSplitP1Cover(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] text-zinc-500">Yearly Premium (₹)</label>
                    <input
                      type="number"
                      required
                      value={splitP1Premium}
                      onChange={e => setSplitP1Premium(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Policy 2 */}
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 space-y-2">
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs flex items-center gap-1.5">
                  <HeartPulse className="w-4 h-4 text-rose-500" />
                  Policy 2: Health / Medical Insurance (Family Floater)
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-zinc-500">Policy Name</label>
                    <input
                      type="text"
                      required
                      value={splitP2Name}
                      onChange={e => setSplitP2Name(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-500">Cover Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={splitP2Cover}
                      onChange={e => setSplitP2Cover(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] text-zinc-500">Yearly Premium (₹)</label>
                    <input
                      type="number"
                      required
                      value={splitP2Premium}
                      onChange={e => setSplitP2Premium(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Policy 3 */}
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 space-y-2">
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-blue-500" />
                  Policy 3: Personal Accident / Vehicle Cover
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-zinc-500">Policy Name</label>
                    <input
                      type="text"
                      required
                      value={splitP3Name}
                      onChange={e => setSplitP3Name(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-500">Cover Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={splitP3Cover}
                      onChange={e => setSplitP3Cover(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] text-zinc-500">Yearly Premium (₹)</label>
                    <input
                      type="number"
                      required
                      value={splitP3Premium}
                      onChange={e => setSplitP3Premium(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs font-semibold px-1">
                <span>Sum of Premiums:</span>
                <span className="font-mono text-emerald-600">
                  {formatINR(Number(splitP1Premium) + Number(splitP2Premium) + Number(splitP3Premium))} / {formatINR(combinedSeedPolicy.yearlyPremium)}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsSplitModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  Confirm Split
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Policy Modal */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {editingPolicy ? 'Edit Policy' : 'Add Insurance Policy'}
              </h3>
              <button
                onClick={() => setIsAddEditOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePolicy} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-500 mb-1">Policy Title</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. HDFC Life Click 2 Protect, Star Comprehensive"
                  className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-500 mb-1">Policy Type</label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value as InsuranceType)}
                    className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700"
                  >
                    {INSURANCE_TYPES.map((item, idx) => (
                      <option key={`${item.type}-${idx}`} value={item.type}>{item.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1">Insurer / Company</label>
                  <input
                    type="text"
                    value={formInsurer}
                    onChange={e => setFormInsurer(e.target.value)}
                    placeholder="e.g. LIC, HDFC Ergo"
                    className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-500 mb-1">Policy No (Last 4 Digits)</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={formPolicyNum4}
                    onChange={e => setFormPolicyNum4(e.target.value)}
                    placeholder="4821"
                    className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1">Insured Member</label>
                  <select
                    value={formInsuredMember}
                    onChange={e => setFormInsuredMember(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700"
                  >
                    {members.map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                    <option value="Self & Family">Self & Family</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-500 mb-1">Cover Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={formCover}
                    onChange={e => setFormCover(e.target.value)}
                    placeholder="10000000"
                    className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1">Yearly Premium (₹)</label>
                  <input
                    type="number"
                    required
                    value={formYearlyPremium}
                    onChange={e => setFormYearlyPremium(e.target.value)}
                    placeholder="24000"
                    className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-500 mb-1">Premium Frequency</label>
                  <select
                    value={formFrequency}
                    onChange={e => setFormFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700"
                  >
                    <option value="yearly">Yearly</option>
                    <option value="half-yearly">Half-Yearly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1">Next Due / Renewal</label>
                  <input
                    type="date"
                    value={formNextDue}
                    onChange={e => setFormNextDue(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-500 mb-1">Nominee</label>
                  <input
                    type="text"
                    value={formNominee}
                    onChange={e => setFormNominee(e.target.value)}
                    placeholder="e.g. MOM, Ankita"
                    className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1">Maturity Date (optional)</label>
                  <input
                    type="date"
                    value={formMaturity}
                    onChange={e => setFormMaturity(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">Notes</label>
                <textarea
                  value={formNote}
                  onChange={e => setFormNote(e.target.value)}
                  placeholder="Policy terms, claim assistance number, agent contact"
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  {editingPolicy ? 'Save Changes' : 'Create Policy'}
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
          title="Delete Policy"
          message="Are you sure you want to remove this insurance policy record?"
          confirmLabel="Delete"
          onConfirm={async () => {
            await deleteInsurance(deleteConfirmId);
            setDeleteConfirmId(null);
            showToast('Policy record removed');
          }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
};
