import React, { useEffect, useState } from 'react';
import { useStock } from '../context/StockContext';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  RefreshCw,
  Server,
  User as UserIcon,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { users, login, syncStatus, triggerManualSync } = useStock();

  const activeUsers = (users || []).filter((u) => u.active);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Default User ID to first available account once synced (still editable to any User ID)
  useEffect(() => {
    if (!username && activeUsers.length > 0) {
      const preferred =
        activeUsers.find((u) => u.role === 'NORMAL') ||
        activeUsers.find((u) => u.role === 'AC') ||
        activeUsers[0];
      if (preferred) setUsername(preferred.username);
    }
  }, [activeUsers.length, username]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Please enter both User ID and Password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(username.trim(), password);
      if (!res.success) {
        setError(res.error || 'Invalid User ID or Password.');
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Sign-in failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[360px] h-[360px] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 via-[#0e2540] to-slate-900 text-amber-300 shadow-xl shadow-amber-950/40 border border-amber-500/40">
            <svg className="w-10 h-10" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M18 4L28 9V17C28 23.5 23.8 29.5 18 31C12.2 29.5 8 23.5 8 17V9L18 4Z"
                stroke="#f0c96a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="url(#crest_fill_new)"
              />
              <path
                d="M12 21V14L15.5 18.5L18 15L20.5 18.5L24 14V21"
                stroke="#f0c96a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M15 24H21" stroke="#f0c96a" strokeWidth="1.75" strokeLinecap="round" />
              <defs>
                <linearGradient id="crest_fill_new" x1="18" y1="4" x2="18" y2="31" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#f0c96a" stopOpacity="0.25" />
                  <stop offset="1" stopColor="#b45309" stopOpacity="0.05" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">MM Residency</h1>
            <p className="text-stone-400 text-xs mt-1 uppercase tracking-widest font-semibold">
              Stock &amp; Counter Ledger
            </p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-stone-800/90 backdrop-blur-xl border border-stone-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          {/* Server Sync Status Bar */}
          <div className="flex items-center justify-between gap-2 rounded-xl border border-stone-700/80 bg-stone-900/70 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <Server
                className={`w-4 h-4 shrink-0 ${
                  syncStatus === 'synced'
                    ? 'text-emerald-400'
                    : syncStatus === 'syncing'
                    ? 'text-amber-400 animate-pulse'
                    : 'text-stone-400'
                }`}
              />
              <span className="text-[11px] font-medium text-stone-300 truncate">
                {syncStatus === 'synced'
                  ? 'Live Server Connected'
                  : syncStatus === 'syncing'
                  ? 'Syncing Staff Directory...'
                  : 'Offline Mode (Local Cache)'}
              </span>
            </div>
            <button
              type="button"
              onClick={triggerManualSync}
              className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-stone-700 bg-stone-800 px-2 py-1 text-[10px] font-semibold text-stone-300 hover:bg-stone-700 hover:text-white cursor-pointer"
              title="Refresh data from server"
            >
              <RefreshCw className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">Staff &amp; Admin Sign In</h2>
            <p className="text-xs text-stone-400">
              Enter your shop User ID and Password to enter the site.
            </p>
          </div>

          {activeUsers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {activeUsers.map((u) => {
                const selected = username.trim().toLowerCase() === u.username.toLowerCase();
                const label =
                  u.role === 'ADMIN'
                    ? u.fullName || 'Shop Admin'
                    : u.role === 'AC'
                    ? 'AC Counter'
                    : u.role === 'NORMAL'
                    ? 'Normal Counter'
                    : u.fullName;
                return (
                  <button
                    key={u.userId}
                    type="button"
                    onClick={() => {
                      setUsername(u.username);
                      setError('');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      selected
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs'
                        : 'bg-stone-900/80 border-stone-700 text-stone-300 hover:bg-stone-700/70'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {error && (
            <div className="bg-rose-950/70 border border-rose-800 text-rose-300 p-3 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="font-medium break-words">{error}</span>
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                User ID
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="Enter User ID (e.g. admin, normal, ac)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-stone-900/90 border border-stone-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-stone-900/90 border border-stone-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 p-1 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <div className="text-center text-xs text-stone-500">
          MM Residency &amp; Bar &bull; Multi-Device Live Sync
        </div>
      </div>
    </div>
  );
};
