import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Header } from './components/layout/Header';
import { Navigation } from './components/layout/Navigation';
import { HomeScreen } from './components/screens/HomeScreen';
import { EntriesScreen } from './components/screens/EntriesScreen';
import { BudgetScreen } from './components/screens/BudgetScreen';
import { LoansScreen } from './components/screens/LoansScreen';
import { WealthScreen } from './components/screens/WealthScreen';
import { FutureTargetScreen } from './components/screens/FutureTargetScreen';
import { ReportsScreen } from './components/screens/ReportsScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { RecurringScreen } from './components/screens/RecurringScreen';
import { CalendarScreen } from './components/screens/CalendarScreen';
import { FamilyScreen } from './components/screens/FamilyScreen';
import { AccountsScreen } from './components/screens/AccountsScreen';
import { CreditCardsScreen } from './components/screens/CreditCardsScreen';
import { EmiManagerScreen } from './components/screens/EmiManagerScreen';
import { InvestmentsScreen } from './components/screens/InvestmentsScreen';
import { AssetsScreen } from './components/screens/AssetsScreen';
import { InsuranceScreen } from './components/screens/InsuranceScreen';
import { NetWorthScreen } from './components/screens/NetWorthScreen';
import { TaxPlannerScreen } from './components/screens/TaxPlannerScreen';
import { AssistantScreen } from './components/screens/AssistantScreen';
import { CategoriesScreen } from './components/screens/CategoriesScreen';
import { HierarchyScreen } from './components/screens/HierarchyScreen';
import { MonthlySummaryScreen } from './components/screens/MonthlySummaryScreen';
import { YearlyReportScreen } from './components/screens/YearlyReportScreen';
import { ReportBuilderScreen } from './components/screens/ReportBuilderScreen';
import { DataMigrationScreen } from './components/screens/DataMigrationScreen';
import { ActivityLogScreen } from './components/screens/ActivityLogScreen';
import { AuditorScreen } from './components/screens/AuditorScreen';
import { FinWiseAiScreen } from './components/screens/FinWiseAiScreen';
import { QuickAddModal } from './components/common/QuickAddModal';
import { AcceptanceTestModal } from './components/common/AcceptanceTestModal';
import { ToastContainer } from './components/common/ToastContainer';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { PlaceholderScreen } from './components/common/PlaceholderScreen';

const AppContent: React.FC = () => {
  const {
    activeScreen,
    quickAddOpen,
    setQuickAddOpen,
    testModalOpen,
    setTestModalOpen,
  } = useFinance();

  // Helper to render the active screen
  const renderScreen = () => {
    switch (activeScreen) {
      case 'home':
        return <HomeScreen />;
      case 'finwiseAi':
        return <FinWiseAiScreen />;
      case 'calendar':
        return <CalendarScreen />;
      case 'assistant':
        return <AssistantScreen />;
      case 'entries':
        return <EntriesScreen />;
      case 'recurring':
        return <RecurringScreen />;
      case 'budget':
        return <BudgetScreen />;
      case 'categories':
        return <CategoriesScreen />;
      case 'hierarchy':
        return <HierarchyScreen />;
      case 'family':
        return <FamilyScreen />;
      case 'accounts':
        return <AccountsScreen />;
      case 'cards':
        return <CreditCardsScreen />;
      case 'loans':
        return <LoansScreen />;
      case 'emiManager':
        return <EmiManagerScreen />;
      case 'wealth':
        return <WealthScreen />;
      case 'investments':
        return <InvestmentsScreen />;
      case 'assets':
        return <AssetsScreen />;
      case 'insurance':
        return <InsuranceScreen />;
      case 'futureTarget':
        return <FutureTargetScreen />;
      case 'netWorth':
        return <NetWorthScreen />;
      case 'taxPlanner':
        return <TaxPlannerScreen />;
      case 'reports':
      case 'analytics':
        return <ReportsScreen />;
      case 'monthlySummary':
        return <MonthlySummaryScreen />;
      case 'yearlyReport':
        return <YearlyReportScreen />;
      case 'reportBuilder':
        return <ReportBuilderScreen />;
      case 'auditor':
        return <AuditorScreen />;
      case 'dataMigration':
      case 'dataHealth':
        return <DataMigrationScreen />;
      case 'activityLog':
        return <ActivityLogScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <PlaceholderScreen screen={activeScreen} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FB] text-[#0F172A] font-sans antialiased flex flex-col">
      {/* Header with Month Switcher, PWA Install, Cloud Sync */}
      <Header />

      {/* Main Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Navigation (Desktop Left Sidebar + Mobile Bottom Tab Bar) */}
        <Navigation />

        {/* Dynamic Screen Content */}
        <main className="flex-1 w-full min-w-0 overflow-x-hidden p-3 sm:p-6 pb-28 md:pb-8">
          {renderScreen()}
        </main>
      </div>

      {/* Global Quick Add Modal */}
      <QuickAddModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
      />

      {/* Live Acceptance Checks Modal */}
      <AcceptanceTestModal
        isOpen={testModalOpen}
        onClose={() => setTestModalOpen(false)}
      />

      {/* Global Search Modal */}
      <GlobalSearchModal />

      {/* Floating Toast Container */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <FinanceProvider>
        <AppContent />
      </FinanceProvider>
    </AuthProvider>
  );
}
