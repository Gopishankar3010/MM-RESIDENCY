import React, { useEffect, useState } from 'react';
import { useStock } from '../context/StockContext';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  ShieldAlert,
  User as UserIcon,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const {
    users,
    login,
    firebaseUser,
    cloudAccessStatus,
    cloudError,
    verificationDetails,
    signInWithGoogle,
    signOutGoogle,
    sendVerificationEmailToUser,
    refreshVerificationStatus,
    resetAndReverifyGoogleAccount,
    retryCloudConnection,
  } = useStock();

  const activeUsers = (users || []).filter((u) => u.active);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [isResettingAccount, setIsResettingAccount] = useState(false);
  const [verificationSentMsg, setVerificationSentMsg] = useState('');

  const fbEmail = (
    firebaseUser?.email ||
    firebaseUser?.providerData?.find((p) => p?.email)?.email ||
    ''
  ).trim();

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

  const formatErrText = (raw?: string | null): string => {
    if (!raw) return '';
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.operationType && parsed.error) {
        if (String(parsed.error).toLowerCase().includes('permission')) {
          return 'This Google account does not have access to the shop database yet.';
        }
        return `${parsed.error}`;
      }
    } catch {
      // Plain error text
    }
    return raw;
  };

  const handleGoogleConnect = async () => {
    setError('');
    setVerificationSentMsg('');
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      const code = String(err?.code || '');
      const msg = String(err?.message || '');
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setError('Google sign-in was cancelled. Please try again.');
      } else if (code === 'auth/popup-blocked') {
        setError('Sign-in popup was blocked by your browser. Please allow popups and try again.');
      } else if (code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized for Google Sign-In.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error while signing in. Check your connection and try again.');
      } else {
        setError(formatErrText(msg) || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSendVerification = async () => {
    setError('');
    setVerificationSentMsg('');
    setIsSendingVerification(true);
    try {
      await sendVerificationEmailToUser();
      const targetEmail = verificationDetails?.email || fbEmail || 'your Google email';
      setVerificationSentMsg(
        `Verification email sent to ${targetEmail}. Open the link in your inbox, then click Refresh Status.`
      );
    } catch (err: any) {
      const code = String(err?.code || '');
      const rawMsg = String(err?.message || '');
      if (code === 'auth/operation-not-allowed' || rawMsg.includes('operation-not-allowed')) {
        setError(
          'Firebase blocked sending a verification email because Email/Password Sign-In is disabled on this project (only Google Sign-In is enabled). Click "Reset & Re-Verify via Google" below to recreate a verified Google session, or enable Email/Password in Firebase Console.'
        );
      } else if (code === 'auth/too-many-requests' || rawMsg.includes('too-many-requests')) {
        setError(
          'Too many verification emails were sent recently. Wait a few minutes and check your inbox/spam folder, or click "Reset & Re-Verify via Google" below.'
        );
      } else if (
        code === 'auth/unauthorized-continue-uri' ||
        code === 'auth/invalid-continue-uri' ||
        rawMsg.includes('continue-uri')
      ) {
        setError(
          'Firebase rejected the verification redirect URL for this domain. Use "Reset & Re-Verify via Google" below instead.'
        );
      } else if (code === 'auth/requires-recent-login') {
        setError(
          'Your Google sign-in session is too old for this request. Click "Reset & Re-Verify via Google" or "Sign Out & Switch" below.'
        );
      } else {
        setError(
          `${code ? `[${code}] ` : ''}${formatErrText(rawMsg) || 'Could not send verification email.'} Try "Reset & Re-Verify via Google" below.`
        );
      }
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleResetAndReverify = async () => {
    setError('');
    setVerificationSentMsg('');
    setIsResettingAccount(true);
    try {
      const result = await resetAndReverifyGoogleAccount();
      if (result === 'reauth_cleared') {
        setVerificationSentMsg(
          'Previous unverified session cleared. Click "Continue with Google" below to finish signing in.'
        );
      }
    } catch (err: any) {
      const code = String(err?.code || '');
      const rawMsg = String(err?.message || '');
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setError('Google confirmation popup was closed. Please try again.');
      } else if (code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Allow popups for this site and try again.');
      } else {
        setError(formatErrText(rawMsg) || 'Could not reset and re-verify Google session.');
      }
    } finally {
      setIsResettingAccount(false);
    }
  };

  const handleRefreshVerification = async () => {
    setError('');
    setIsRefreshingStatus(true);
    try {
      const ok = await refreshVerificationStatus();
      if (!ok) {
        setVerificationSentMsg('');
        setError(
          'This account still reports as unverified. Click the verification link in your inbox or use "Reset & Re-Verify via Google".'
        );
      }
    } catch (err: any) {
      setError(formatErrText(err?.message) || 'Failed to refresh verification status.');
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  const handleSwitchGoogle = async () => {
    setError('');
    setVerificationSentMsg('');
    setPassword('');
    await signOutGoogle();
  };

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
      setError(formatErrText(err?.message) || 'Sign-in failed. Please try again.');
      setIsLoading(false);
    }
  };

  const signedOutError = error || formatErrText(cloudError);

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
          {/* Loading */}
          {cloudAccessStatus === 'loading' && (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
              <h2 className="text-base font-bold text-white">Signing You In...</h2>
              <p className="text-xs text-stone-400">Verifying your Google account and connecting to shop data.</p>
            </div>
          )}

          {/* Step 1: Standard Google Sign-In */}
          {cloudAccessStatus === 'signed_out' && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-bold text-white">Sign In</h2>
                <p className="text-xs text-stone-400">
                  Continue with your verified Google account to access MM Residency.
                </p>
              </div>

              {verificationSentMsg && !signedOutError && (
                <div className="bg-emerald-950/70 border border-emerald-700/70 text-emerald-200 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="font-medium break-words">{verificationSentMsg}</span>
                </div>
              )}

              {signedOutError && (
                <div className="bg-rose-950/70 border border-rose-800 text-rose-200 p-3.5 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span className="font-medium break-words">{signedOutError}</span>
                  </div>
                  {verificationDetails && (
                    <div className="pl-6 text-[11px] font-mono tabular-nums text-rose-300/90 space-y-0.5">
                      <div>Email: {verificationDetails.email}</div>
                      <div>
                        emailVerified: {String(verificationDetails.userEmailVerified)} &middot; token
                        email_verified: {String(verificationDetails.tokenEmailVerified)}
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.37 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                    />
                  </svg>
                )}
                <span>{isGoogleLoading ? 'Signing in...' : 'Continue with Google'}</span>
              </button>
            </div>
          )}

          {/* Unverified Google / Firebase Auth Email Gate */}
          {cloudAccessStatus === 'unverified' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 text-amber-300">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-white">Verify Your Google Email</h2>
                  <p className="text-xs font-mono tabular-nums text-stone-300 mt-0.5 truncate">
                    {verificationDetails?.email || fbEmail || 'Unknown account'}
                  </p>
                </div>
              </div>

              <div className="bg-amber-950/50 border border-amber-700/60 text-amber-100 p-3.5 rounded-xl text-xs space-y-2 leading-relaxed">
                <p>
                  Firebase requires a verified email claim before connecting to the shop database.
                </p>
                <div className="rounded-lg bg-stone-950/60 border border-amber-800/50 p-2.5 font-mono tabular-nums text-[11px] text-amber-200 space-y-1">
                  <div>
                    Signed-in Email: <span className="text-white">{verificationDetails?.email || fbEmail || 'missing'}</span>
                  </div>
                  <div>
                    Account emailVerified:{' '}
                    <span className={verificationDetails?.userEmailVerified ? 'text-emerald-300' : 'text-rose-300'}>
                      {String(verificationDetails?.userEmailVerified ?? false)}
                    </span>
                  </div>
                  <div>
                    Token email_verified:{' '}
                    <span className={verificationDetails?.tokenEmailVerified ? 'text-emerald-300' : 'text-rose-300'}>
                      {String(verificationDetails?.tokenEmailVerified ?? false)}
                    </span>
                  </div>
                  <div>
                    Providers: <span className="text-stone-300">{(verificationDetails?.providerIds || ['unknown']).join(', ')}</span>
                  </div>
                </div>
              </div>

              {verificationSentMsg && (
                <div className="bg-emerald-950/70 border border-emerald-700/70 text-emerald-200 p-3 rounded-xl text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="font-medium break-words">{verificationSentMsg}</span>
                </div>
              )}

              {error && (
                <div className="bg-rose-950/70 border border-rose-800 text-rose-200 p-3 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="font-medium break-words">{error}</span>
                </div>
              )}

              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleResetAndReverify}
                  disabled={isResettingAccount || isSendingVerification || isRefreshingStatus}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isResettingAccount ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span>{isResettingAccount ? 'Resetting & Signing In...' : 'Reset & Re-Verify via Google'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendVerification}
                  disabled={isResettingAccount || isSendingVerification || isRefreshingStatus}
                  className="w-full bg-white hover:bg-stone-100 text-stone-900 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSendingVerification ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  <span>{isSendingVerification ? 'Sending Verification Email...' : 'Send Verification Email'}</span>
                </button>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleRefreshVerification}
                    disabled={isResettingAccount || isRefreshingStatus || isSendingVerification}
                    className="bg-stone-900 hover:bg-stone-700 border border-stone-700 text-stone-200 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isRefreshingStatus ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>{isRefreshingStatus ? 'Checking...' : 'Refresh Status'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSwitchGoogle}
                    disabled={isResettingAccount || isRefreshingStatus || isSendingVerification}
                    className="bg-stone-900 hover:bg-stone-700 border border-stone-700 text-stone-200 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out &amp; Switch</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Access / Connection Issue */}
          {(cloudAccessStatus === 'offline' || cloudAccessStatus === 'unauthorized') && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2.5 text-amber-300">
                <div className="flex items-start gap-2.5 min-w-0">
                  <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-white">
                      {cloudAccessStatus === 'unauthorized' ? 'Account Not Authorized' : 'Connection Interrupted'}
                    </h2>
                    {fbEmail && (
                      <p className="text-[11px] font-mono text-stone-400 mt-0.5 truncate">{fbEmail}</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSwitchGoogle}
                  className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-stone-700 bg-stone-900 px-2 py-1 text-[10px] font-semibold text-stone-300 hover:bg-stone-700 hover:text-white cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Sign Out</span>
                </button>
              </div>

              <div className="bg-amber-950/50 border border-amber-700/60 text-amber-200 p-3.5 rounded-xl text-xs leading-relaxed break-words">
                {formatErrText(cloudError) ||
                  (cloudAccessStatus === 'unauthorized'
                    ? 'This Google account is not authorized to access the shop database yet.'
                    : 'Could not reach the shop database. Please try again.')}
              </div>

              {error && (
                <div className="bg-rose-950/70 border border-rose-800 text-rose-200 p-3 rounded-xl text-xs">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleGoogleConnect}
                  disabled={isGoogleLoading}
                  className="bg-white hover:bg-stone-100 text-stone-900 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Switch Account</span>
                </button>
                <button
                  type="button"
                  onClick={retryCloudConnection}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Staff & Admin Sign In */}
          {cloudAccessStatus === 'connected' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-700/50 bg-emerald-950/40 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-[11px] font-medium text-emerald-200 truncate font-mono">
                    {fbEmail || 'Google Connected'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSwitchGoogle}
                  className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-stone-700 bg-stone-800 px-2 py-1 text-[10px] font-semibold text-stone-300 hover:bg-stone-700 hover:text-white cursor-pointer"
                  title="Switch Google account"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Switch</span>
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
          )}
        </div>

        <div className="text-center text-xs text-stone-500">
          MM Residency &amp; Bar &bull; Multi-Device Live Sync
        </div>
      </div>
    </div>
  );
};
