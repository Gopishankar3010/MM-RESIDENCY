import React, { useState, useMemo } from 'react';
import { useStock } from '../context/StockContext';
import { Product, AuditLogEntry, StockLedgerEntry } from '../types';
import { 
  FileCheck, History, Search, RefreshCw, CheckCircle2, 
  AlertTriangle, Filter, ArrowDownUp, ShieldCheck, DatabaseZap
} from 'lucide-react';

export const AuditView: React.FC = () => {
  const { auditLog, ledger, products, reconcileStock, syncLedger } = useStock();
  const [activeTab, setActiveTab] = useState<'audit' | 'ledger'>('audit');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [reconcileResult, setReconcileResult] = useState<{ checked: number; issues: any[] } | null>(null);
  const [syncCount, setSyncCount] = useState<number | null>(null);

  // Filtered Audit Logs
  const filteredAudit = useMemo(() => {
    return (auditLog || []).filter((log: AuditLogEntry) => {
      const matchSearch = 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.refId && log.refId.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchAction = actionFilter === 'ALL' || log.action === actionFilter;
      return matchSearch && matchAction;
    });
  }, [auditLog, searchTerm, actionFilter]);

  // Filtered Stock Ledger
  const filteredLedger = useMemo(() => {
    return (ledger || []).filter((entry: StockLedgerEntry) => {
      const prod = products.find((p: Product) => p.productId === entry.productId);
      const prodName = prod ? prod.name.toLowerCase() : (entry.productName || '').toLowerCase();
      const matchSearch = 
        prodName.includes(searchTerm.toLowerCase()) ||
        entry.refType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.refId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchLoc = locationFilter === 'ALL' || entry.location === locationFilter;
      return matchSearch && matchLoc;
    });
  }, [ledger, products, searchTerm, locationFilter]);

  // Unique actions for filter
  const uniqueActions = useMemo(() => {
    const actions = (auditLog || []).map((l: AuditLogEntry) => l.action);
    return Array.from(new Set(actions));
  }, [auditLog]);

  const handleRunReconcile = () => {
    const res = reconcileStock();
    setReconcileResult(res);
  };

  const handleSyncLedger = () => {
    const cnt = syncLedger();
    setSyncCount(cnt);
    setTimeout(() => setSyncCount(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
              Audit & Ledger Compliance
            </h1>
          </div>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            Tamper-evident system activity audit trails, immutable stock ledger sequence, and automated reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncLedger}
            className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
            title="Recalculate running balances"
          >
            <DatabaseZap className="w-4 h-4 text-amber-500" />
            <span>Sync Ledger</span>
          </button>

          <button
            onClick={handleRunReconcile}
            className="flex items-center gap-2 bg-stone-900 hover:bg-black dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Run Integrity Check</span>
          </button>
        </div>
      </div>

      {syncCount !== null && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 p-3.5 rounded-xl flex items-center gap-3 text-amber-900 dark:text-amber-200 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Stock ledger synchronized: {syncCount} transaction records validated.</span>
        </div>
      )}

      {/* Integrity Check Result Banner */}
      {reconcileResult && (
        <div className={`p-5 rounded-2xl border flex items-start gap-3.5 transition-all ${
          reconcileResult.issues.length === 0
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200'
            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200'
        }`}>
          {reconcileResult.issues.length === 0 ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <div className="font-bold text-base">
              {reconcileResult.issues.length === 0 
                ? `Stock Ledger Integrity Verified 100% (${reconcileResult.checked} Items)` 
                : 'Ledger Audit Flags Detected'}
            </div>
            <p className="text-sm opacity-90">
              {reconcileResult.issues.length === 0
                ? 'All physical stocks match mathematical summation across sequential ledger transactions with zero sequence gaps.'
                : 'Discrepancies found during verification check:'}
            </p>
            {reconcileResult.issues.length > 0 && (
              <ul className="list-disc pl-5 text-xs font-mono mt-2 space-y-1">
                {reconcileResult.issues.map((err: any, idx: number) => (
                  <li key={idx}>{typeof err === 'string' ? err : JSON.stringify(err)}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-stone-200 dark:border-stone-800 gap-6">
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 pb-3.5 px-1 font-bold text-sm border-b-2 transition-colors cursor-pointer ${
            activeTab === 'audit'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
          }`}
        >
          <History className="w-4 h-4" />
          <span>System Activity Audit Log ({filteredAudit.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 pb-3.5 px-1 font-bold text-sm border-b-2 transition-colors cursor-pointer ${
            activeTab === 'ledger'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Stock Movement Ledger ({filteredLedger.length})</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder={activeTab === 'audit' ? "Search by action, user, or details..." : "Search by product name, ref type, ref ID..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-stone-900 pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
          />
        </div>

        {activeTab === 'audit' ? (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-stone-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-white dark:bg-stone-900 px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 focus:outline-none shadow-xs"
            >
              <option value="ALL">All Actions</option>
              {uniqueActions.map((act: string) => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <ArrowDownUp className="w-4 h-4 text-stone-400" />
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="bg-white dark:bg-stone-900 px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 focus:outline-none shadow-xs"
            >
              <option value="ALL">All Locations</option>
              <option value="GODOWN">Central Godown</option>
              <option value="NORMAL">Normal Counter</option>
              <option value="AC">AC Counter</option>
            </select>
          </div>
        )}
      </div>

      {/* Content Tables */}
      {activeTab === 'audit' ? (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 dark:bg-stone-950/50 text-stone-500 dark:text-stone-400 font-bold border-b border-stone-200 dark:border-stone-800 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Ref ID</th>
                  <th className="py-3 px-4">Details / Parameters</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {filteredAudit.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-stone-400">
                      No audit trail records found.
                    </td>
                  </tr>
                ) : (
                  filteredAudit.map((log: AuditLogEntry) => (
                    <tr key={log.auditId} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40">
                      <td className="py-3 px-4 font-mono text-stone-500 whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-stone-900 dark:text-stone-100 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded text-[11px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-stone-800 dark:text-stone-200">
                        {log.username} <span className="text-[10px] text-stone-400 font-normal">({log.role})</span>
                      </td>
                      <td className="py-3 px-4 text-stone-600 dark:text-stone-400 font-mono text-[11px]">
                        {log.refId || '—'}
                      </td>
                      <td className="py-3 px-4 text-stone-700 dark:text-stone-300 max-w-md truncate">
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 dark:bg-stone-950/50 text-stone-500 dark:text-stone-400 font-bold border-b border-stone-200 dark:border-stone-800 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Seq #</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Product Item</th>
                  <th className="py-3 px-4 text-right">Delta (Btls)</th>
                  <th className="py-3 px-4 text-right">Balance After</th>
                  <th className="py-3 px-4">Ref Type</th>
                  <th className="py-3 px-4">Ref ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-stone-400">
                      No stock ledger entries found.
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map((entry: StockLedgerEntry) => {
                    const prod = products.find((p: Product) => p.productId === entry.productId);
                    return (
                      <tr key={entry.ledgerId} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40">
                        <td className="py-3 px-4 font-mono font-bold text-stone-400">
                          #{entry.seq}
                        </td>
                        <td className="py-3 px-4 font-mono text-stone-500 whitespace-nowrap">
                          {entry.timestamp}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            entry.location === 'GODOWN'
                              ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                              : entry.location === 'AC'
                              ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300'
                              : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                          }`}>
                            {entry.location}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-stone-900 dark:text-stone-100">
                          {prod ? prod.name : entry.productName || entry.productId}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black">
                          <span className={entry.delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-stone-800 dark:text-stone-200">
                          {entry.balanceAfter}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-stone-600 dark:text-stone-400">
                          {entry.refType}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-stone-500">
                          {entry.refId}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
