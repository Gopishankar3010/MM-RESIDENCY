import React, { useEffect, useState } from 'react';
import { AlertTriangle, Eye, EyeOff, Lock, RotateCcw, Trash2 } from 'lucide-react';
import { useStock } from '../context/StockContext';

interface AdminPasswordDeleteModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  description?: React.ReactNode;
  warningNote?: React.ReactNode;
  confirmLabel?: string;
  tone?: 'red' | 'amber';
  showReasonField?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
}

export const AdminPasswordDeleteModal: React.FC<AdminPasswordDeleteModalProps> = ({
  isOpen,
  title,
  subtitle,
  description,
  warningNote,
  confirmLabel = 'Confirm Delete',
  tone = 'red',
  showReasonField = false,
  reasonLabel = 'Reason for Deletion (Optional)',
  reasonPlaceholder = 'Enter reason...',
  onClose,
  onConfirm
}) => {
  const { currentUser, verifyCurrentAdminPassword } = useStock();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setShowPassword(false);
      setReason('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isAmber = tone === 'amber';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      verifyCurrentAdminPassword(password);
      await onConfirm(reason.trim());
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please check your Admin password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs">
      <form
        onSubmit={handleSubmit}
        className={`w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl dark:bg-slate-900 space-y-4 ${
          isAmber
            ? 'border-amber-200 dark:border-amber-900/60'
            : 'border-red-200 dark:border-red-900/60'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              isAmber
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                : 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400'
            }`}
          >
            {isAmber ? <RotateCcw className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {description && (
          <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {description}
          </div>
        )}

        {warningNote && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            {warningNote}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {showReasonField && (
          <div>
            <label
              htmlFor="admin-delete-reason"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
            >
              {reasonLabel}
            </label>
            <input
              id="admin-delete-reason"
              type="text"
              placeholder={reasonPlaceholder}
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        )}

        <div>
          <label
            htmlFor="admin-delete-password"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
          >
            <Lock
              className={`h-3.5 w-3.5 ${
                isAmber ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
              }`}
            />
            <span>Admin Password (Required)</span>
          </label>
          <div className="relative">
            <input
              id="admin-delete-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              autoFocus
              required
              placeholder={`Enter password for ${currentUser?.username || 'admin'}`}
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              className={`w-full rounded-lg border border-slate-300 p-2 pr-9 text-xs outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white ${
                isAmber
                  ? 'focus:border-amber-500 focus:ring-amber-500/20'
                  : 'focus:border-red-500 focus:ring-red-500/20'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Admin verification required to prevent accidental deletion.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap shrink-0"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !password}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0 ${
              isAmber ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {!isAmber && <Trash2 className="h-3.5 w-3.5" />}
            <span>{isSubmitting ? 'Processing...' : confirmLabel}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
