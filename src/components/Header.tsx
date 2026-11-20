import React, { useState, useRef, useEffect } from 'react';
import { useStock } from '../context/StockContext';
import {
  Moon, Sun, User as UserIcon, Calendar, LogOut, Shield, ChevronDown, RefreshCw,
  Bell, BellRing, Volume2, VolumeX, CheckCircle2
} from 'lucide-react';

export const Header: React.FC<{ onOpenPasswordModal: () => void; onNavigate?: (tab: string) => void }> = ({
  onOpenPasswordModal,
  onNavigate
}) => {
  const {
    currentUser,
    businessDate,
    setBusinessDate,
    theme,
    toggleTheme,
    logout,
    firebaseUser,
    syncStatus,
    lastSyncTime,
    triggerManualSync,
    pendingRequests,
    soundEnabled,
    toggleSoundAlerts,
    browserNotifStatus,
    requestBrowserNotifPermission
  } = useStock();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const isAdmin = currentUser?.role === 'ADMIN';

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
    <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-800 bg-[#0e2540] px-4 py-3 text-white shadow-md dark:border-slate-800 dark:bg-slate-900 md:px-6">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/40 text-amber-300 shadow-xs">
          <svg className="w-5 h-5" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 4L28 9V17C28 23.5 23.8 29.5 18 31C12.2 29.5 8 23.5 8 17V9L18 4Z" stroke="#f0c96a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="rgba(240, 201, 106, 0.2)" />
            <path d="M12 21V14L15.5 18.5L18 15L20.5 18.5L24 14V21" stroke="#f0c96a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15 24H21" stroke="#f0c96a" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-[#f0c96a]">MM Residency</span>
            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-amber-300 uppercase">
              Bar & Stock
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

        {/* Cloud Sync Status & Instant Refresh */}
        <button
          type="button"
          onClick={triggerManualSync}
          title={`Live Firebase Cloud Sync (${firebaseUser?.email || 'Connected'}): ${syncStatus === 'synced' ? 'All devices synchronized in real time' : syncStatus === 'syncing' ? 'Syncing...' : 'Offline'} · Last sync: ${lastSyncTime}. Click to refresh.`}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
            syncStatus === 'synced'
              ? 'border-emerald-600/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50'
              : syncStatus === 'syncing'
              ? 'border-amber-600/40 bg-amber-950/40 text-amber-300 animate-pulse'
              : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <RefreshCw className={`h-3 w-3 ${syncStatus === 'syncing' ? 'animate-spin text-amber-300' : 'text-emerald-400'}`} />
          <span className="hidden sm:inline font-mono text-[10px]">
            {syncStatus === 'synced' ? 'Cloud Live' : syncStatus === 'syncing' ? 'Syncing...' : 'Offline'}
          </span>
        </button>

        {/* Admin Live Request Notifications Bell */}
        {isAdmin && (
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setIsNotifOpen(prev => !prev)}
              aria-label="Admin request notifications"
              title={
                pendingRequests.length > 0
                  ? `${pendingRequests.length} pending stock request(s)`
                  : 'Admin Notification Center'
              }
              className={`relative flex h-8 w-8 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                pendingRequests.length > 0
                  ? 'border-amber-500/60 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                  : 'border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {pendingRequests.length > 0 ? (
                <BellRing className="h-4 w-4 animate-pulse" />
              ) : (
                <Bell className="h-4 w-4" />
              )}
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-xs">
                  {pendingRequests.length}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-slate-700 bg-slate-900 text-white shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-slate-950/60">
                  <div>
                    <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      Admin Request Alerts
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {pendingRequests.length > 0
                        ? `${pendingRequests.length} pending request item(s) waiting for approval`
                        : 'All counter requests are cleared'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={toggleSoundAlerts}
                      title={soundEnabled ? 'Mute sound alert' : 'Enable sound alert'}
                      className={`rounded-lg border p-1.5 text-xs transition-colors cursor-pointer ${
                        soundEnabled
                          ? 'border-emerald-600/50 bg-emerald-950/50 text-emerald-300'
                          : 'border-slate-700 bg-slate-800 text-slate-400'
                      }`}
                    >
                      {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                    </button>
                    {browserNotifStatus !== 'unsupported' && (
                      <button
                        type="button"
                        onClick={requestBrowserNotifPermission}
                        className={`rounded-lg border px-2 py-1 text-[10px] font-bold transition-colors cursor-pointer ${
                          browserNotifStatus === 'granted'
                            ? 'border-emerald-600/50 bg-emerald-950/50 text-emerald-300'
                            : browserNotifStatus === 'denied'
                            ? 'border-red-600/40 bg-red-950/40 text-red-300'
                            : 'border-amber-500/60 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
                        }`}
                      >
                        {browserNotifStatus === 'granted'
                          ? 'Desktop Alerts On'
                          : browserNotifStatus === 'denied'
                          ? 'Alerts Blocked'
                          : 'Enable Alerts'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-800">
                  {pendingRequests.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-1.5 opacity-80" />
                      No pending stock requests right now. New requests from Normal or AC Counter appear here instantly.
                    </div>
                  ) : (
                    pendingRequests.slice(0, 12).map(r => (
                      <div key={r.requestId} className="px-4 py-2.5 hover:bg-slate-800/60 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              r.counter === 'AC'
                                ? 'bg-purple-500/20 text-purple-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {r.counter === 'AC' ? 'AC Counter' : 'Normal Counter'}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">{r.createdAt}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs">
                          <span className="font-bold text-white truncate">{r.productName}</span>
                          <span className="font-mono font-bold text-amber-300 shrink-0 ml-2">
                            {r.enteredQty || r.qty} {r.unit || 'BTL'} ({r.qty} btls)
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">{r.reason}</div>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t border-slate-800 p-2.5 bg-slate-950/60 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400">Live Firebase Cloud Sync active</span>
                  {onNavigate && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsNotifOpen(false);
                        onNavigate('approvals');
                      }}
                      className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
                    >
                      Open Approvals Queue
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

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

            {/* User profile popup */}
            <div className="invisible group-hover:visible group-focus-within:visible absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-slate-700 bg-slate-800 p-3 text-xs shadow-2xl z-50">
              <div className="pb-2 mb-2 border-b border-slate-700">
                <div className="font-bold text-white text-sm">{currentUser.fullName}</div>
                <div className="text-[11px] font-mono text-slate-400">@{currentUser.username}</div>
                <div className="mt-1.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                    currentUser.role === 'ADMIN'
                      ? 'bg-amber-500/20 text-amber-300'
                      : currentUser.role === 'AC'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    <Shield className="h-2.5 w-2.5" />
                    {currentUser.role === 'ADMIN' ? 'Shop Admin' : currentUser.role === 'AC' ? 'AC Counter Staff' : 'Normal Counter Staff'}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={onOpenPasswordModal}
                  className="w-full text-left rounded-lg px-2.5 py-1.5 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                >
                  Change Password
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="w-full text-left rounded-lg px-2.5 py-1.5 text-rose-300 hover:bg-rose-950/50 hover:text-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
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
