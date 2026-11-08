import React from 'react';
import { useStock } from '../context/StockContext';
import { Moon, Sun, User as UserIcon, Calendar, LogOut, Shield, ChevronDown } from 'lucide-react';

export const Header: React.FC<{ onOpenPasswordModal: () => void }> = ({ onOpenPasswordModal }) => {
  const { currentUser, businessDate, setBusinessDate, theme, toggleTheme, logout, switchUser } = useStock();

  const formattedDate = () => {
    try {
      const d = new Date(businessDate + 'T12:00:00');
      return d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return businessDate;
    }
  };

  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-800 bg-[#0e2540] px-4 py-3 text-white shadow-md dark:border-slate-800 dark:bg-slate-900 md:px-6">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-[#f0c96a]">MM Residency</span>
            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-amber-300 uppercase">
              Bar & Stock v2
            </span>
          </div>
          <small className="text-[11px] font-medium text-slate-300 tracking-wide">
            Inventory Ledger & Counter Sales Control
          </small>
        </div>
      </div>

      {/* Center/Right Controls */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Business Date Picker */}
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-white">
          <Calendar className="h-3.5 w-3.5 text-amber-400" />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold tracking-wider text-amber-400/90 uppercase">DATE:</span>
              <input
                type="date"
                max={todayISO}
                value={businessDate}
                onChange={e => e.target.value && setBusinessDate(e.target.value)}
                className="bg-transparent font-medium text-white outline-none cursor-pointer text-xs"
                title="Select business working date"
              />
            </div>
            <span className="text-[10px] text-slate-300">{formattedDate()}</span>
          </div>
        </div>

        {/* User profile & quick role switch */}
        {currentUser && (
          <div className="relative group flex items-center">
            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs">
              <UserIcon className="h-3.5 w-3.5 text-amber-300" />
              <div className="flex flex-col text-left">
                <span className="font-semibold text-white leading-none">{currentUser.fullName}</span>
                <span className="text-[10px] text-slate-300 leading-none mt-0.5">
                  {currentUser.role === 'ADMIN' ? 'Admin' : currentUser.role === 'NORMAL' ? 'Normal Counter' : 'AC Counter'}
                </span>
              </div>
              <ChevronDown className="h-3 w-3 text-slate-300 opacity-60" />
            </div>

            {/* Quick user switcher popup */}
            <div className="invisible group-hover:visible group-focus-within:visible absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-slate-700 bg-slate-800 p-2 text-xs shadow-2xl z-50">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Switch Role / Profile
              </div>
              <button
                onClick={() => switchUser('admin')}
                className={`w-full text-left rounded-md px-2.5 py-1.5 transition-colors flex items-center justify-between ${
                  currentUser.username === 'admin' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-200 hover:bg-slate-700'
                }`}
              >
                <span>Shop Admin (Full Access)</span>
                {currentUser.username === 'admin' && <Shield className="h-3 w-3" />}
              </button>
              <button
                onClick={() => switchUser('normal')}
                className={`w-full text-left rounded-md px-2.5 py-1.5 transition-colors flex items-center justify-between ${
                  currentUser.username === 'normal' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-200 hover:bg-slate-700'
                }`}
              >
                <span>Normal Counter</span>
              </button>
              <button
                onClick={() => switchUser('ac')}
                className={`w-full text-left rounded-md px-2.5 py-1.5 transition-colors flex items-center justify-between ${
                  currentUser.username === 'ac' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-200 hover:bg-slate-700'
                }`}
              >
                <span>AC Counter</span>
              </button>
              <div className="my-1 border-t border-slate-700" />
              <button
                onClick={onOpenPasswordModal}
                className="w-full text-left rounded-md px-2.5 py-1.5 text-slate-300 hover:bg-slate-700"
              >
                Change Password
              </button>
            </div>
          </div>
        )}

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 transition-colors"
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4 text-slate-200" />}
        </button>

        {/* Logout */}
        <button
          type="button"
          onClick={logout}
          aria-label="Sign out"
          className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-950/40 px-2.5 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-900/50 transition-colors"
          title="Sign out of current account"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
};
