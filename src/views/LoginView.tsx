import React, { useState } from 'react';
import { useStock } from '../context/StockContext';
import { Wine, Shield, Sparkles, KeyRound, ArrowRight, AlertCircle, Building2 } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useStock();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      const success = login(username.trim(), password);
      if (!success) {
        setError('Invalid username or password. Please verify your credentials or use the quick access shortcuts below.');
        setIsLoading(false);
      }
    }, 200);
  };

  const handleQuickLogin = (u: string, p: string) => {
    setError('');
    setUsername(u);
    setPassword(p);
    login(u, p);
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background ambient gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-amber-300 shadow-xl shadow-emerald-950/60 border border-emerald-500/30">
            <Wine className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-black tracking-tight text-white">MM Residency</span>
              <span className="text-xs bg-amber-400/20 text-amber-300 font-mono font-bold px-2 py-0.5 rounded-full border border-amber-400/30">
                PRO
              </span>
            </div>
            <p className="text-stone-400 text-xs mt-1 uppercase tracking-widest font-semibold">
              Liquor Stock, Multi-Counter & Lodging System
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-stone-800/90 backdrop-blur-xl border border-stone-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <h2 className="text-lg font-bold text-stone-100 mb-1 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <span>Counter Sign In</span>
          </h2>
          <p className="text-xs text-stone-400 mb-6">
            Authenticate to access your assigned counter ledger or admin controls.
          </p>

          {error && (
            <div className="mb-5 bg-rose-950/60 border border-rose-800/80 text-rose-300 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                Username / Handle
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="e.g. admin or normal"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-stone-900/90 border border-stone-700 rounded-xl px-4 py-3 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                Security Password
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-stone-900/90 border border-stone-700 rounded-xl px-4 py-3 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? 'Verifying...' : 'Access System'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Access Credentials */}
          <div className="mt-8 pt-6 border-t border-stone-700/60">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Quick Test Credentials
              </span>
              <span className="text-[10px] text-stone-400 font-mono">1-Click Login</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'gopi1234')}
                className="flex items-center justify-between p-2.5 rounded-xl bg-stone-900/60 hover:bg-stone-900 border border-stone-700/60 hover:border-amber-500/50 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-500/20">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-200 group-hover:text-amber-300">
                      Shop Admin (Full Rights)
                    </div>
                    <div className="text-[10px] text-stone-400 font-mono">
                      admin / gopi1234
                    </div>
                  </div>
                </div>
                <span className="text-xs text-stone-400 group-hover:text-white transition-colors">
                  &rarr;
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('normal', 'gopi2345')}
                className="flex items-center justify-between p-2.5 rounded-xl bg-stone-900/60 hover:bg-stone-900 border border-stone-700/60 hover:border-emerald-500/50 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/20">
                    <Wine className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-200 group-hover:text-emerald-300">
                      Normal Counter
                    </div>
                    <div className="text-[10px] text-stone-400 font-mono">
                      normal / gopi2345
                    </div>
                  </div>
                </div>
                <span className="text-xs text-stone-400 group-hover:text-white transition-colors">
                  &rarr;
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('ac', 'gopi3456')}
                className="flex items-center justify-between p-2.5 rounded-xl bg-stone-900/60 hover:bg-stone-900 border border-stone-700/60 hover:border-purple-500/50 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-xs border border-purple-500/20">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-200 group-hover:text-purple-300">
                      AC Counter
                    </div>
                    <div className="text-[10px] text-stone-400 font-mono">
                      ac / gopi3456
                    </div>
                  </div>
                </div>
                <span className="text-xs text-stone-400 group-hover:text-white transition-colors">
                  &rarr;
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-stone-400">
          MM Residency & Bar &bull; ISO Compliance &bull; Audit Sealed
        </div>
      </div>
    </div>
  );
};
