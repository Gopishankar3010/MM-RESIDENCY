import React, { useState } from 'react';
import { useStock } from '../context/StockContext';
import { User, Role } from '../types';
import { 
  Users, UserPlus, KeyRound, Shield, CheckCircle2, 
  XCircle, Search, Power, Printer, Cloud, Trash2, MailPlus
} from 'lucide-react';
import { matchesSearchQuery } from '../data/initialData';
import { BOOTSTRAPPED_ADMIN_EMAIL, getGoogleAccountEmail } from '../firebase';

export const UsersView: React.FC = () => {
  const {
    users,
    currentUser,
    createUser,
    resetUserPassword,
    toggleUserActive,
    firebaseUser,
    cloudMembers,
    authorizeCloudEmail,
    revokeCloudEmail,
  } = useStock();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  
  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('NORMAL');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password Reset State
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Cloud Sync Member Authorization State
  const [cloudEmailInput, setCloudEmailInput] = useState('');
  const [cloudLabelInput, setCloudLabelInput] = useState('');
  const [cloudRoleInput, setCloudRoleInput] = useState<'ADMIN' | 'STAFF'>('ADMIN');
  const [isSavingCloudMember, setIsSavingCloudMember] = useState(false);

  const isCloudOwner =
    getGoogleAccountEmail(firebaseUser) === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-6 rounded-2xl text-center">
        <Shield className="w-12 h-12 text-red-500 mx-auto mb-2" />
        <h2 className="text-xl font-bold text-red-800 dark:text-red-300">Access Restricted</h2>
        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
          Only Shop Administrators have permission to manage system accounts and credentials.
        </p>
      </div>
    );
  }

  const filteredUsers = (users || []).filter((u: User) =>
    matchesSearchQuery(searchTerm, u.username, u.fullName, u.role, u.userId)
  );

  const handleOpenAdd = () => {
    setUsername('');
    setPassword('');
    setFullName('');
    setRole('NORMAL');
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !fullName.trim()) {
      setError('Username and Display Name are required.');
      return;
    }

    if (!password.trim()) {
      setError('Password is required for new users.');
      return;
    }
    const existing = users.find((u: User) => u.username.toLowerCase() === username.trim().toLowerCase());
    if (existing) {
      setError('A user with this username already exists.');
      return;
    }

    try {
      setIsCreatingUser(true);
      await createUser({
        username: username.trim(),
        fullName: fullName.trim(),
        role,
        password: password.trim(),
      });
      setSuccess(`User ${username.trim()} created and saved successfully!`);
      setIsModalOpen(false);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed to create user account.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    if (user.userId === currentUser?.userId) {
      setError('You cannot deactivate your own active admin session.');
      setTimeout(() => setError(''), 3000);
      return;
    }
    await toggleUserActive(user.userId, !user.active);
  };

  const handleQuickResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserId || !newPassword.trim()) return;

    try {
      await resetUserPassword(resetUserId, newPassword.trim());
      setSuccess('Password updated successfully!');
      setResetUserId(null);
      setNewPassword('');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password.');
    }
  };

  const handleAuthorizeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!cloudEmailInput.trim()) {
      setError('Enter a Google email address to authorize.');
      return;
    }
    try {
      setIsSavingCloudMember(true);
      await authorizeCloudEmail(cloudEmailInput.trim(), cloudLabelInput.trim(), cloudRoleInput);
      setSuccess(`Authorized ${cloudEmailInput.trim().toLowerCase()} for live Multi-Device Cloud Sync.`);
      setCloudEmailInput('');
      setCloudLabelInput('');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err?.message || 'Failed to authorize cloud email.');
    } finally {
      setIsSavingCloudMember(false);
    }
  };

  const handleRevokeEmail = async (memberId: string, email: string) => {
    setError('');
    try {
      setIsSavingCloudMember(true);
      await revokeCloudEmail(memberId, email);
      setSuccess(`Removed cloud sync access for ${email}.`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed to remove cloud email.');
    } finally {
      setIsSavingCloudMember(false);
    }
  };

  return (
    <div className="print-surface space-y-6">
      <div className="print-header text-center">
        <h1 className="text-xl font-black tracking-tight">MM RESIDENCY – INVENTORY & BAR MANAGEMENT</h1>
        <h2 className="text-sm font-bold uppercase tracking-wider mt-1">STAFF & COUNTER USER DIRECTORY</h2>
        <div className="text-xs text-slate-600 mt-1">
          Printed: {new Date().toLocaleString('en-IN')} · Total Accounts: {filteredUsers.length}
        </div>
      </div>

      {/* Header & Controls */}
      <div className="print-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">Staff & Counter User Management</h1>
          </div>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            Configure system authentication, counter assignments, and administrative security roles.
          </p>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-white hover:bg-stone-50 dark:bg-stone-800 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Staff List</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-5 h-5" />
            <span>Add New Account</span>
          </button>
        </div>
      </div>

      {success && (
        <div className="no-print bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 p-4 rounded-xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="font-semibold text-sm">{success}</span>
        </div>
      )}

      {error && (
        <div className="no-print bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 p-4 rounded-xl flex items-center gap-3 text-red-800 dark:text-red-300">
          <XCircle className="w-5 h-5 shrink-0" />
          <span className="font-semibold text-sm">{error}</span>
        </div>
      )}

      {/* Search & Filter */}
      <div className="no-print relative">
        <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          placeholder="Filter staff by name, username, or role..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white dark:bg-stone-900 pl-11 pr-4 py-3 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
        />
      </div>

      {/* Users Table */}
      <div className="print-card bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="print-table-wrap overflow-x-auto">
          <table className="print-table w-full text-left text-sm">
            <thead className="bg-stone-50 dark:bg-stone-950/50 text-stone-500 dark:text-stone-400 font-bold border-b border-stone-200 dark:border-stone-800">
              <tr>
                <th className="py-4 px-6">User / Staff Name</th>
                <th className="py-4 px-6">Username</th>
                <th className="py-4 px-6">Role & Assignment</th>
                <th className="py-4 px-6">Status</th>
                <th className="no-print py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-stone-400">
                    No users matching "{searchTerm}".
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user: User) => (
                  <tr key={user.userId} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                          user.role === 'ADMIN' 
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400' 
                            : user.role === 'AC'
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400'
                            : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                        }`}>
                          {user.fullName.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-stone-900 dark:text-stone-100">
                            {user.fullName}
                            {user.userId === currentUser?.userId && (
                              <span className="ml-2 text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-500 px-1.5 py-0.5 rounded font-mono">YOU</span>
                            )}
                          </div>
                          <div className="text-xs text-stone-400 font-mono">ID: {user.userId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-stone-700 dark:text-stone-300">
                      @{user.username}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        user.role === 'ADMIN'
                          ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                          : user.role === 'AC'
                          ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300'
                          : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                      }`}>
                        <Shield className="w-3 h-3" />
                        {user.role === 'ADMIN' ? 'Shop Admin' : user.role === 'AC' ? 'AC Counter Staff' : 'Normal Counter Staff'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        user.active 
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' 
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                      }`}>
                        {user.active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="no-print py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setResetUserId(user.userId); setNewPassword(''); }}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer font-semibold"
                          title="Reset Password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Reset Pwd</span>
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={user.userId === currentUser?.userId}
                          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                            user.active
                              ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                              : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          } disabled:opacity-30 disabled:cursor-not-allowed`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{user.active ? 'Disable' : 'Enable'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Authorized Multi-Device Cloud Emails (Google Sync) */}
      <div className="no-print bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-lg font-black text-stone-900 dark:text-stone-100">
                Authorized Multi-Device Cloud Emails (Google Sync)
              </h2>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Anyone signing in on another computer or phone with an authorized Google email shares the live Firebase cloud database in real time.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 px-3 py-1 text-xs font-mono text-emerald-700 dark:text-emerald-300 shrink-0">
            Connected: {getGoogleAccountEmail(firebaseUser) || 'Email unavailable'}
          </span>
        </div>

        {isCloudOwner ? (
          <form onSubmit={handleAuthorizeEmail} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-stone-50 dark:bg-stone-950/60 p-4 rounded-xl border border-stone-200 dark:border-stone-800">
            <div className="md:col-span-5">
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                Friend / Staff Google Email
              </label>
              <input
                type="email"
                required
                placeholder="e.g. friendname@gmail.com"
                value={cloudEmailInput}
                onChange={(e) => setCloudEmailInput(e.target.value)}
                className="w-full bg-white dark:bg-stone-900 px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                Device / Person Label
              </label>
              <input
                type="text"
                placeholder="e.g. Partner Laptop"
                value={cloudLabelInput}
                onChange={(e) => setCloudLabelInput(e.target.value)}
                className="w-full bg-white dark:bg-stone-900 px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                Access Level
              </label>
              <select
                value={cloudRoleInput}
                onChange={(e) => setCloudRoleInput(e.target.value as 'ADMIN' | 'STAFF')}
                className="w-full bg-white dark:bg-stone-900 px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="ADMIN">Admin</option>
                <option value="STAFF">Counter Staff</option>
              </select>
            </div>
            <div className="md:col-span-2 flex items-end">
              <button
                type="submit"
                disabled={isSavingCloudMember}
                className="w-full flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <MailPlus className="w-4 h-4" />
                <span>{isSavingCloudMember ? 'Saving...' : 'Authorize'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-300">
            Only the Primary Owner Google account (<span className="font-mono font-bold">{BOOTSTRAPPED_ADMIN_EMAIL}</span>) can authorize or remove multi-device Google emails.
          </div>
        )}

        <div className="overflow-x-auto border border-stone-200 dark:border-stone-800 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 dark:bg-stone-950/50 text-stone-500 dark:text-stone-400 font-bold border-b border-stone-200 dark:border-stone-800">
              <tr>
                <th className="py-2.5 px-4">Google Email</th>
                <th className="py-2.5 px-4">Device / Label</th>
                <th className="py-2.5 px-4">Cloud Role</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {cloudMembers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 px-4 text-center text-stone-400">
                    Primary owner ({BOOTSTRAPPED_ADMIN_EMAIL}) is synced. Add additional Google accounts above if your friend uses a separate Gmail.
                  </td>
                </tr>
              ) : (
                cloudMembers.map((m) => {
                  const isOwnerRow = m.email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();
                  return (
                    <tr key={m.memberId} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40">
                      <td className="py-2.5 px-4 font-mono font-semibold text-stone-900 dark:text-stone-100">
                        {m.email}
                      </td>
                      <td className="py-2.5 px-4 text-stone-600 dark:text-stone-300">{m.label}</td>
                      <td className="py-2.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.role === 'ADMIN'
                            ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                            : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                        }`}>
                          {isOwnerRow ? 'OWNER ADMIN' : m.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {isOwnerRow ? (
                          <span className="text-[11px] font-semibold text-stone-400">Primary Owner</span>
                        ) : (
                          <button
                            type="button"
                            disabled={!isCloudOwner || isSavingCloudMember}
                            onClick={() => handleRevokeEmail(m.memberId, m.email)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-40 cursor-pointer font-semibold"
                            title="Revoke cloud sync access"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95">
            <h2 className="text-xl font-black text-stone-900 dark:text-stone-100 mb-4">
              Create New System Account
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suresh Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-950 px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">
                  Username (Login Handle)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. suresh_counter"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-950 px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">
                  Initial Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter login password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-950 px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">
                  System Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['NORMAL', 'AC', 'ADMIN'] as Role[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        role === r
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {r === 'ADMIN' ? 'Admin' : r === 'AC' ? 'AC Counter' : 'Normal Counter'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {isCreatingUser ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Password Reset Modal */}
      {resetUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-sm w-full p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <KeyRound className="w-6 h-6" />
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-lg">Reset Password</h3>
            </div>
            <p className="text-xs text-stone-500 mb-4">
              Enter a new credential password for user <span className="font-mono font-bold text-stone-800 dark:text-stone-200">@{users.find((u: User) => u.userId === resetUserId)?.username}</span>.
            </p>

            <form onSubmit={handleQuickResetPassword} className="space-y-4">
              <input
                type="password"
                required
                autoFocus
                placeholder="New password (min 4 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-950 px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetUserId(null)}
                  className="px-3.5 py-1.5 rounded-xl text-sm font-semibold text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-xs cursor-pointer"
                >
                  Confirm Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
