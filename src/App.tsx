/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { StockProvider, useStock } from './context/StockContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { BellRing, X } from 'lucide-react';
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
  const { currentUser, latestRequestAlert, dismissRequestAlert } = useStock();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);

  if (!currentUser) {
    return <LoginView />;
  }

  const isAdmin = currentUser?.role === 'ADMIN';
  const isAcUser = currentUser?.counter === 'AC' || currentUser?.role === 'AC';

  const renderActiveView = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardView onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'stock':
        return <StockView />;
      case 'sales':
        return isAdmin ? <DashboardView onNavigate={(tab) => setCurrentTab(tab)} /> : <DailySalesView />;
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
        return <ApprovalsView onNavigateToSales={() => setCurrentTab(isAdmin ? 'closing' : 'sales')} />;
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
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors duration-150 print:bg-white print:text-slate-900">
      {/* Top Application Header */}
      <Header onOpenPasswordModal={() => setIsPasswordModalOpen(true)} onNavigate={setCurrentTab} />

      {/* Main Body */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Navigation Sidebar */}
        <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

        {/* View Surface */}
        <main className="print-surface flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {renderActiveView()}
        </main>
      </div>

      {/* Live Incoming Request Toast Notification for Admin */}
      {currentUser?.role === 'ADMIN' && latestRequestAlert && (
        <div className="no-print fixed bottom-5 right-5 z-50 w-80 sm:w-96 rounded-2xl border border-amber-400 bg-slate-900 text-white p-4 shadow-2xl space-y-2.5 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
                <BellRing className="h-4 w-4 animate-pulse" />
              </div>
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                  New Stock Request Alert
                </div>
                <div className="text-xs font-bold text-white">
                  {latestRequestAlert.counter} · {latestRequestAlert.itemCount} item(s) ({latestRequestAlert.totalBottles} btls)
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissRequestAlert}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-xl bg-slate-800/80 px-3 py-2 text-[11px] text-slate-200 space-y-0.5">
            {latestRequestAlert.productNames.map((name, i) => (
              <div key={i} className="truncate font-semibold">• {name}</div>
            ))}
            {latestRequestAlert.itemCount > latestRequestAlert.productNames.length && (
              <div className="text-slate-400">
                +{latestRequestAlert.itemCount - latestRequestAlert.productNames.length} more item(s)
              </div>
            )}
            <div className="text-slate-400 pt-0.5 truncate">Reason: {latestRequestAlert.reason}</div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={dismissRequestAlert}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentTab('approvals');
                dismissRequestAlert();
              }}
              className="rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
            >
              Review & Approve
            </button>
          </div>
        </div>
      )}

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
    <ErrorBoundary>
      <StockProvider>
        <MainLayout />
      </StockProvider>
    </ErrorBoundary>
  );
}
