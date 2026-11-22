import React, { useState } from 'react';
import { useStock } from '../context/StockContext';
import { FIREBASE_PROJECT_ID } from '../firebase';
import {
  ArrowRight, AlertCircle, Lock, Cloud, CheckCircle2,
  RefreshCw, LogOut, Loader2, ShieldAlert, Copy, ExternalLink, Check
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const {
    login,
    firebaseUser,
    cloudAccessStatus,
    cloudError,
    signInWithGoogle,
    signOutGoogle,
    retryCloudConnection,
  } = useStock();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [unauthorizedDomainHost, setUnauthorizedDomainHost] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const authorizedDomainsConsoleUrl = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/settings`;

  const handleCopyDomain = async () => {
    if (!unauthorizedDomainHost) return;
    try {
      await navigator.clipboard.writeText(unauthorizedDomainHost);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    } catch {
      // Clipboard API unavailable; user can copy the visible text manually
    }
  };

  const handleGoogleConnect = async () => {
    setError('');
    setUnauthorizedDomainHost(null);
    setIsGoogleLoading(true);
    try {
      await signInWithPopupSafe();
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const signInWithPopupSafe = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      const code = err?.code || '';
      const msg = String(err?.message || '');
      if (code === 'auth/unauthorized-domain' || msg.includes('auth/unauthorized-domain')) {
        const host = typeof window !== 'undefined' ? window.location.hostname : '';
        setUnauthorizedDomainHost(host || 'this domain');
        setError(
          `This website domain (${host || 'current URL'}) is not yet allowlisted in Firebase Authentication Authorized Domains.`
        );
      } else if (code === 'auth/popup-closed-by-user') {
        setError('Google sign-in popup was closed before completing.');
      } else if (code === 'auth/popup-blocked') {
        setError('Sign-in popup was blocked by your browser. Please allow popups for this site and try again.');
      } else {
        setError(msg || 'Google authentication failed. Please try again.');
      }
    }
  };

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
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify credentials.');
      setIsLoading(false);
    }
  };

  const renderAuthErrorBox = () => {
    if (!error) return null;
    if (unauthorizedDomainHost) {
      return (
        <div className="bg-amber-950/60 border border-amber-600/70 text-amber-100 p-4 rounded-xl text-xs space-y-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-200">Authorize Domain in Firebase Console</div>
              <p className="text-amber-100/90 mt-1 leading-relaxed">
                Firebase blocked Google Sign-In because this domain is not in your project&apos;s Authorized Domains list yet.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-lg bg-stone-950/80 border border-stone-700 px-3 py-2">
            <code className="font-mono text-[11px] text-emerald-300 truncate">{unauthorizedDomainHost}</code>
            <button
              type="button"
              onClick={handleCopyDomain}
              className="shrink-0 inline-flex items-center gap-1 rounded bg-stone-800 hover:bg-stone-700 px-2 py-1 text-[10px] font-bold text-stone-200 cursor-pointer"
            >
              {copiedDomain ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedDomain ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <ol className="list-decimal pl-4 space-y-1 text-[11px] text-amber-100/90">
            <li>Open Firebase Authentication Settings using the button below.</li>
            <li>Go to <strong>Settings → Authorized domains → Add domain</strong>.</li>
            <li>Paste <code className="font-mono text-emerald-300">{unauthorizedDomainHost}</code> and click <strong>Add</strong>, then retry Google Sign-In.</li>
          </ol>

          <a
            href={authorizedDomainsConsoleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-2 px-3 text-xs transition-colors"
          >
            <span>Open Firebase Authorized Domains</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      );
    }

    return (
      <div className="bg-rose-950/70 border border-rose-800 text-rose-300 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
        <span className="font-medium">{error}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background ambient gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 via-[#0e2540] to-slate-900 text-amber-300 shadow-xl shadow-amber-950/40 border border-amber-500/40">
            <svg className="w-10 h-10" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 4L28 9V17C28 23.5 23.8 29.5 18 31C12.2 29.5 8 23.5 8 17V9L18 4Z" stroke="#f0c96a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="url(#crest_fill)" />
              <path d="M12 21V14L15.5 18.5L18 15L20.5 18.5L24 14V21" stroke="#f0c96a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 24H21" stroke="#f0c96a" strokeWidth="1.75" strokeLinecap="round" />
              <defs>
                <linearGradient id="crest_fill" x1="18" y1="4" x2="18" y2="31" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#f0c96a" stopOpacity="0.25" />
                  <stop offset="1" stopColor="#b45309" stopOpacity="0.05" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-black tracking-tight text-white">MM Residency</span>
            </div>
            <p className="text-stone-400 text-xs mt-1 uppercase tracking-widest font-semibold">
              Liquor Stock, Multi-Counter & Lodging System
            </p>
          </div>
        </div>

        {/* Cloud Connection & Login Card */}
        <div className="bg-stone-800/90 backdrop-blur-xl border border-stone-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          {cloudAccessStatus === 'loading' && (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
              <h2 className="text-base font-bold text-white">Connecting to MM Residency Cloud Database...</h2>
              <p className="text-xs text-stone-400">
                Synchronizing live purchases, counter stock, and sales across all devices.
              </p>
            </div>
          )}

          {cloudAccessStatus === 'signed_out' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-stone-100 mb-1 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-emerald-400" />
                  <span>Step 1: Connect Shop Cloud Sync</span>
                </h2>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Sign in with your authorized Shop Google Account so all purchases, approvals, and counter sales sync instantly across every laptop and phone.
                </p>
              </div>

              {renderAuthErrorBox()}

              <button
                type="button"
                onClick={handleGoogleConnect}
                disabled={isGoogleLoading}
                className="w-full bg-white hover:bg-stone-100 text-stone-900 font-bold py-3.5 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-60"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-stone-700" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.37 24 12 24Z" />
                    <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
                  </svg>
                )}
                <span>{isGoogleLoading ? 'Connecting Google Sync...' : 'Continue with Google'}</span>
              </button>
            </div>
          )}

          {(cloudAccessStatus === 'unauthorized' || cloudAccessStatus === 'offline') && (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 text-amber-300">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-base font-bold text-white">
                    {cloudAccessStatus === 'unauthorized' ? 'Cloud Access Approval Needed' : 'Cloud Connection Interrupted'}
                  </h2>
                  {firebaseUser?.email && (
                    <p className="text-[11px] font-mono text-stone-400 mt-0.5">
                      Signed in as: {firebaseUser.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-amber-950/50 border border-amber-700/60 text-amber-200 p-3.5 rounded-xl text-xs leading-relaxed">
                {cloudError || 'Unable to verify cloud workspace permissions.'}
              </div>

              {renderAuthErrorBox()}

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleGoogleConnect}
                  disabled={isGoogleLoading}
                  className="bg-white hover:bg-stone-100 text-stone-900 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Switch Google Account</span>
                </button>
                <button
                  type="button"
                  onClick={retryCloudConnection}
                  className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Connection</span>
                </button>
              </div>
            </div>
          )}

          {cloudAccessStatus === 'connected' && (
            <>
              <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-700/50 bg-emerald-950/40 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-[11px] font-medium text-emerald-200 truncate">
                    Cloud Synced: <span className="font-mono">{firebaseUser?.email}</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={signOutGoogle}
                  className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-stone-700 bg-stone-800 px-2 py-1 text-[10px] font-semibold text-stone-300 hover:bg-stone-700 hover:text-white cursor-pointer"
                  title="Switch connected Google account"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Switch Google</span>
                </button>
              </div>

              <div>
                <h2 className="text-lg font-bold text-stone-100 mb-1 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>Secure Staff Authentication</span>
                </h2>
                <p className="text-xs text-stone-400">
                  Enter your assigned User ID and Security Password to access your counter ledger.
                </p>
              </div>

              {error && (
                <div className="bg-rose-950/70 border border-rose-800 text-rose-300 p-3.5 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in">
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
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-stone-500">
          MM Residency & Bar &bull; Security & Stock Audit Protection
        </div>
      </div>
    </div>
  );
};
