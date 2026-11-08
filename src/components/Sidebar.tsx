import React from 'react';
import { useStock } from '../context/StockContext';
import {
  LayoutDashboard,
  ArrowRightLeft,
  Receipt,
  Wallet,
  Home,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Boxes,
  Truck,
  Package,
  Users,
  ScrollText
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { currentUser, pendingCount } = useStock();
  const isAdmin = currentUser?.role === 'ADMIN';

  interface NavItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }

  const adminNav: NavItem[] = [
    { id: 'dashboard', label: 'Home Dashboard', icon: LayoutDashboard },
    { id: 'stock', label: 'Current Stock', icon: Boxes },
    { id: 'sales', label: 'Daily Sales', icon: Receipt },
    { id: 'transfers', label: 'Transfer to Counter', icon: ArrowRightLeft },
    { id: 'requests', label: 'Stock Requests', icon: ArrowRightLeft },
    { id: 'expenses', label: 'Expense & Wages', icon: Wallet },
    { id: 'rooms', label: 'Room Rent', icon: Home },
    { id: 'damage', label: 'Damage Stock', icon: AlertTriangle },
    { id: 'closing', label: 'Consolidated Report', icon: FileSpreadsheet },
    { id: 'approvals', label: 'Approvals Queue', icon: CheckCircle2, badge: pendingCount },
    { id: 'purchases', label: 'Purchases (Godown)', icon: Truck },
    { id: 'products', label: 'Catalogue & Prices', icon: Package },
    { id: 'users', label: 'System Users', icon: Users },
    { id: 'audit', label: 'Audit & Ledger', icon: ScrollText }
  ];

  const counterNav: NavItem[] = [
    { id: 'dashboard', label: 'Home Dashboard', icon: LayoutDashboard },
    { id: 'requests', label: 'Request from Godown', icon: ArrowRightLeft },
    { id: 'transfers', label: 'Transfer to Counter', icon: ArrowRightLeft },
    { id: 'sales', label: 'Daily Sales', icon: Receipt },
    { id: 'stock', label: 'Counter Stock', icon: Boxes },
    { id: 'expenses', label: 'Expense & Wages', icon: Wallet },
    { id: 'rooms', label: 'Room Rent', icon: Home },
    { id: 'damage', label: 'Damage Stock', icon: AlertTriangle },
    { id: 'closing', label: 'Consolidated Report', icon: FileSpreadsheet }
  ];

  const items = isAdmin ? adminNav : counterNav;

  return (
    <aside className="w-full md:w-60 md:shrink-0 border-b md:border-b-0 md:border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 transition-colors">
      <div className="flex md:flex-col overflow-x-auto md:overflow-y-auto p-2 md:p-3 gap-1 md:sticky md:top-[61px] md:h-[calc(100vh-61px)]">
        <div className="hidden md:block px-3 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          {isAdmin ? 'ADMINISTRATIVE SUITE' : `${currentUser?.counter || 'COUNTER'} WORKSPACE`}
        </div>

        {items.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 font-bold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`h-4 w-4 ${isActive ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
};
