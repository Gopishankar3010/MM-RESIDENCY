/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { StockProvider, useStock } from './context/StockContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { PasswordModal } from './components/PasswordModal';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { StockView } from './views/StockView';
import { DailySalesView } from './views/DailySalesView';
import { RequestsView } from './views/RequestsView';
import { TransfersView } from './views/TransfersView';
import { ExpensesWagesView } from './views/ExpensesWagesView';
import { RoomsView } from './views/RoomsView';
import { DamageView } from './views/DamageView';
import { ConsolidatedReportView } from './views/ConsolidatedReportView';
import { ApprovalsView } from './views/ApprovalsView';
import { PurchasesView } from './views/PurchasesView';
import { ProductsView } from './views/ProductsView';
import { UsersView } from './views/UsersView';
import { AuditView } from './views/AuditView';

const MainLayout: React.FC = () => {
  const { currentUser } = useStock();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);

  if (!currentUser) {
    return <LoginView />;
  }

  const isAcUser = currentUser?.counter === 'AC' || currentUser?.role === 'AC';

  const renderActiveView = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardView onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'stock':
        return <StockView />;
      case 'sales':
        return <DailySalesView />;
      case 'transfers':
        return <TransfersView />;
      case 'requests':
        return <RequestsView />;
      case 'expenses':
        return isAcUser ? <DashboardView onNavigate={(tab) => setCurrentTab(tab)} /> : <ExpensesWagesView />;
      case 'rooms':
        return isAcUser ? <DashboardView onNavigate={(tab) => setCurrentTab(tab)} /> : <RoomsView />;
      case 'damage':
        return <DamageView />;
      case 'closing':
        return <ConsolidatedReportView />;
      case 'approvals':
        return <ApprovalsView onNavigateToSales={() => setCurrentTab('sales')} />;
      case 'purchases':
        return <PurchasesView />;
      case 'products':
        return <ProductsView />;
      case 'users':
        return <UsersView />;
      case 'audit':
        return <AuditView />;
      default:
        return <DashboardView onNavigate={(tab) => setCurrentTab(tab)} />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors duration-150">
      {/* Top Application Header */}
      <Header onOpenPasswordModal={() => setIsPasswordModalOpen(true)} />

      {/* Main Body */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Navigation Sidebar */}
        <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

        {/* View Surface */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {renderActiveView()}
        </main>
      </div>

      {/* Self-service Password Change Modal */}
      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <StockProvider>
      <MainLayout />
    </StockProvider>
  );
}
