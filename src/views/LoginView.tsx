import React, { useState } from 'react';
import { useStock } from '../context/StockContext';
import { Wine, Shield, KeyRound, ArrowRight, AlertCircle, Lock } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useStock();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
        setError(res.error || 'Invalid User ID or Password. Please check your credentials.');
        setIsLoading(false);
      }
      // If success, StockContext will update currentUser and React will render MainLayout
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify credentials.');
      setIsLoading(false);
    }
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
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Secure Staff Authentication</span>
          </h2>
          <p className="text-xs text-stone-400 mb-6">
            Enter your assigned User ID and Security Password to access your counter ledger.
          </p>

          {error && (
            <div className="mb-5 bg-rose-950/70 border border-rose-800 text-rose-300 p-3.5 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                User ID / Username
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="e.g. admin, normal, or ac"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-stone-900/90 border border-stone-700 rounded-xl px-4 py-3 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 shadow-inner"
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
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-stone-900/90 border border-stone-700 rounded-xl px-4 py-3 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? 'Verifying Credentials...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-stone-500">
          MM Residency & Bar &bull; Security & Stock Audit Protection
        </div>
      </div>
    </div>
  );
};
