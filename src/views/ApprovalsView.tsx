import React, { useEffect, useRef, useState } from 'react';
import { useStock } from '../context/StockContext';
import { CheckCircle2, ArrowRightLeft, Truck, Check, X, ShieldCheck, Printer, Trash2, AlertTriangle, Receipt, RotateCcw, Lock, Eye, EyeOff, ChevronDown, ChevronRight, User, Users, FileSpreadsheet } from 'lucide-react';
import { RequestGroup, DailySalesReport, DeletedDailySalesReport, StockRequestItem } from '../types';
import { AdminPasswordDeleteModal } from '../components/AdminPasswordDeleteModal';
import { PrintableDailySalesSheet, PrintableConsolidatedShiftSheet } from '../components/DailySalesPrintSheet';
import { getReportReconciliation } from '../utils/reconciliation';

export const ApprovalsView: React.FC<{ onNavigateToSales: () => void }> = ({ onNavigateToSales }) => {
  const {
    currentUser,
    verifyCurrentAdminPassword,
    requests,
    stockItems,
    reviewRequestGroup,
    reverseRequestItems,
    purchases,
    reviewPurchaseBill,
    dailySales,
    operations,
    deletedDailySales,
    adminDeleteDailySales,
    adminRestoreDailySales,
    adminDismissDeletedSales
  } = useStock();

  const [remarkModal, setRemarkModal] = useState<{
    type: 'REQUEST_GROUP' | 'PURCHASE';
    id: string;
    decision: 'APPROVE' | 'REJECT';
    skipShort?: boolean;
    title: string;
  } | null>(null);

  const [remarkText, setRemarkText] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [deleteSalesTarget, setDeleteSalesTarget] = useState<DailySalesReport | null>(null);
  const [deleteSalesReason, setDeleteSalesReason] = useState('');
  const [deleteSalesPassword, setDeleteSalesPassword] = useState('');
  const [showDeleteSalesPassword, setShowDeleteSalesPassword] = useState(false);
  const [deleteSalesError, setDeleteSalesError] = useState<string | null>(null);
  const [deletingSales, setDeletingSales] = useState(false);
  const [restoringSalesId, setRestoringSalesId] = useState<string | null>(null);
  const [dismissBinTarget, setDismissBinTarget] = useState<DeletedDailySalesReport | null>(null);
  const [inspectingSalesReport, setInspectingSalesReport] = useState<DailySalesReport | null>(null);
  const [inspectShowAllLines, setInspectShowAllLines] = useState(false);
  const [inspectPrintMode, setInspectPrintMode] = useState<'NONE' | 'DAILY_SALES' | 'CONSOLIDATED'>('NONE');
  const inspectPrintTimerRef = useRef<number | null>(null);
  const [reverseRequestModal, setReverseRequestModal] = useState<{
    ids: string[];
    counter: 'NORMAL' | 'AC';
    date: string;
    totalBottles: number;
    title: string;
    summary: string;
  } | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [reversePassword, setReversePassword] = useState('');
  const [showReversePassword, setShowReversePassword] = useState(false);
  const [reverseError, setReverseError] = useState<string | null>(null);
  const [reversingRequests, setReversingRequests] = useState(false);
  const [expandedApprovedBatches, setExpandedApprovedBatches] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const resetPrint = () => {
      setInspectPrintMode('NONE');
      if (inspectPrintTimerRef.current !== null) {
        window.clearTimeout(inspectPrintTimerRef.current);
        inspectPrintTimerRef.current = null;
      }
    };
    window.addEventListener('afterprint', resetPrint);
    return () => {
      window.removeEventListener('afterprint', resetPrint);
      if (inspectPrintTimerRef.current !== null) {
        window.clearTimeout(inspectPrintTimerRef.current);
      }
    };
  }, []);

  const triggerInspectPrint = (mode: 'DAILY_SALES' | 'CONSOLIDATED') => {
    if (!inspectingSalesReport) return;
    if (inspectPrintTimerRef.current !== null) {
      window.clearTimeout(inspectPrintTimerRef.current);
    }
    setInspectPrintMode(mode);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.print();
      });
    });
    inspectPrintTimerRef.current = window.setTimeout(() => {
      setInspectPrintMode('NONE');
      inspectPrintTimerRef.current = null;
    }, 60000);
  };

  const toggleApprovedBatch = (groupKey: string) => {
    setExpandedApprovedBatches(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const formatCurrency = (val: number) =>
    '₹' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm font-bold text-red-900">
        Administrative access required for the Approvals Queue.
      </div>
    );
  }

  // 1. Pending Stock Requests from Godown (THE ONLY ITEM REQUIRING ADMIN APPROVAL)
  const pendingRequests = requests.filter(r => r.status === 'Pending');
  const requestGroupsMap = new Map<string, RequestGroup>();

  pendingRequests.forEach(r => {
    const key = `${r.counter}|${r.date}|${r.reason}|${r.createdBy}`;
    const pStock = stockItems.find(p => p.productId === r.productId);
    const godownQty = pStock?.godown || 0;
    const isShort = godownQty < r.qty;

    const enrichedItem = { ...r, godownQty, short: isShort };

    if (!requestGroupsMap.has(key)) {
      requestGroupsMap.set(key, {
        groupKey: key,
        counter: r.counter,
        date: r.date,
        reason: r.reason,
        by: r.createdBy,
        at: r.createdAt,
        items: [enrichedItem],
        totalBottles: r.qty,
        shortCount: isShort ? 1 : 0
      });
    } else {
      const g = requestGroupsMap.get(key)!;
      g.items.push(enrichedItem);
      g.totalBottles += r.qty;
      if (isShort) g.shortCount++;
    }
  });

  const requestGroups = Array.from(requestGroupsMap.values());

  // 1b. Approved Godown Requests (Admin reversal back to Godown)
  const approvedRequests = requests.filter(r => r.status === 'Approved');
  const approvedGroupsMap = new Map<string, RequestGroup>();

  approvedRequests.forEach(r => {
    const key = `${r.counter}|${r.date}|${r.reason}|${r.createdBy}`;
    if (!approvedGroupsMap.has(key)) {
      approvedGroupsMap.set(key, {
        groupKey: key,
        counter: r.counter,
        date: r.date,
        reason: r.reason,
        by: r.createdBy,
        at: r.reviewedAt || r.createdAt,
        items: [r],
        totalBottles: r.qty,
        shortCount: 0,
      });
    } else {
      const g = approvedGroupsMap.get(key)!;
      g.items.push(r);
      g.totalBottles += r.qty;
      if ((r.reviewedAt || r.createdAt) > g.at) {
        g.at = r.reviewedAt || r.createdAt;
      }
    }
  });

  const approvedRequestGroups = Array.from(approvedGroupsMap.values()).sort(
    (a, b) => String(b.at || '').localeCompare(String(a.at || '')) || String(b.date || '').localeCompare(String(a.date || ''))
  );

  // 2. Pending Purchases (Godown Stock Intake)
  const pendingPurchases = purchases.filter(p => p.status === 'Pending');

  const executeDecision = async () => {
    if (!remarkModal) return;
    try {
      setStatusMsg(null);
      if (remarkModal.type === 'REQUEST_GROUP') {
        const ids = remarkModal.id.split(',');
        const res = await reviewRequestGroup(ids, remarkModal.decision, remarkText, remarkModal.skipShort);
        setStatusMsg({
          type: 'ok',
          text: `Processed ${ids.length} requests: ${res.approved} approved into counter stock, ${res.rejected} rejected.`
        });
      } else if (remarkModal.type === 'PURCHASE') {
        await reviewPurchaseBill(remarkModal.id, remarkModal.decision, remarkText);
        setStatusMsg({
          type: 'ok',
          text: `Purchase batch ${remarkModal.id} ${remarkModal.decision === 'APPROVE' ? 'approved' : 'rejected'}.`
        });
      }
      setRemarkModal(null);
      setRemarkText('');
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: e.message });
    }
  };

  const executeDeleteDailySales = async () => {
    if (!deleteSalesTarget) return;
    try {
      setDeletingSales(true);
      setDeleteSalesError(null);
      setStatusMsg(null);
      verifyCurrentAdminPassword(deleteSalesPassword);
      const target = deleteSalesTarget;
      await adminDeleteDailySales(target.reportId, deleteSalesReason);
      const isHistorical = target.remark?.includes('ADMIN HISTORICAL SALES-ONLY ENTRY');
      setStatusMsg({
        type: 'ok',
        text: `Deleted ${target.counter === 'NORMAL' ? 'Normal Counter' : 'AC Counter'} daily sales report (${target.reportId}) for ${target.date}.${!isHistorical && target.totalSoldQty > 0 ? ` Restored ${target.totalSoldQty} sold bottles back to ${target.counter} stock.` : ''} Staff can now re-enter ${target.date} sales.`
      });
      setDeleteSalesTarget(null);
      setDeleteSalesReason('');
      setDeleteSalesPassword('');
      setShowDeleteSalesPassword(false);
      setDeleteSalesError(null);
      if (inspectingSalesReport?.reportId === target.reportId) {
        setInspectingSalesReport(null);
      }
    } catch (e: any) {
      setDeleteSalesError(e?.message || 'Failed to delete daily sales report.');
    } finally {
      setDeletingSales(false);
    }
  };

  const executeRestoreDailySales = async (rep: DeletedDailySalesReport) => {
    try {
      setRestoringSalesId(rep.reportId);
      setStatusMsg(null);
      await adminRestoreDailySales(rep.reportId);
      setStatusMsg({
        type: 'ok',
        text: `Restored ${rep.counter === 'NORMAL' ? 'Normal Counter' : 'AC Counter'} daily sales report (${rep.reportId}) for ${rep.date}.${rep.stockReversed && rep.totalSoldQty > 0 ? ` Re-applied ${rep.totalSoldQty} sold bottles to ${rep.counter} stock.` : ''}`
      });
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: e?.message || 'Failed to restore daily sales report.' });
    } finally {
      setRestoringSalesId(null);
    }
  };

  const executeDismissDeletedSales = async () => {
    if (!dismissBinTarget) return;
    const rep = dismissBinTarget;
    setStatusMsg(null);
    await adminDismissDeletedSales(rep.reportId);
    setDismissBinTarget(null);
    setStatusMsg({
      type: 'ok',
      text: `Removed superseded entry (${rep.reportId}) for ${rep.date} from the deleted reports bin.`
    });
  };

  const openReverseModal = (opts: {
    ids: string[];
    counter: 'NORMAL' | 'AC';
    date: string;
    totalBottles: number;
    title: string;
    summary: string;
  }) => {
    setReverseReason('');
    setReversePassword('');
    setShowReversePassword(false);
    setReverseError(null);
    setReverseRequestModal(opts);
  };

  const executeReverseRequests = async () => {
    if (!reverseRequestModal) return;
    try {
      setReversingRequests(true);
      setReverseError(null);
      setStatusMsg(null);
      verifyCurrentAdminPassword(reversePassword);
      const res = await reverseRequestItems(reverseRequestModal.ids, reverseReason);
      const counterLabel = reverseRequestModal.counter === 'NORMAL' ? 'Normal Counter' : 'AC Counter';
      setStatusMsg({
        type: 'ok',
        text: `Reversed and deleted ${res.reversed} Godown request item(s) (${res.totalBottles} btls) from ${counterLabel}, returned stock to Central Godown, and removed Daily Sales entries.`
      });
      setReverseRequestModal(null);
      setReverseReason('');
      setReversePassword('');
      setShowReversePassword(false);
      setReverseError(null);
    } catch (e: any) {
      setReverseError(e?.message || 'Failed to reverse approved stock request.');
    } finally {
      setReversingRequests(false);
    }
  };

  return (
    <div className="print-surface space-y-6">
      <div className={inspectPrintMode !== 'NONE' && inspectingSalesReport ? 'no-print space-y-6' : 'space-y-6'}>
      <div className="print-header text-center">
        <h1 className="text-xl font-black tracking-tight">MM RESIDENCY – INVENTORY & BAR MANAGEMENT</h1>
        <h2 className="text-sm font-bold uppercase tracking-wider mt-1">ADMIN APPROVALS QUEUE SUMMARY</h2>
        <div className="text-xs text-slate-600 mt-1">
          Printed: {new Date().toLocaleString('en-IN')} · Stock Requests: {requestGroups.length} · Pending Purchases: {pendingPurchases.length}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-[11px] font-extrabold tracking-widest text-amber-600 dark:text-amber-400 uppercase">
            Review & Compliance
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Admin Approvals Queue
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Only stock requests from Central Godown require Admin approval. Daily Sales, Transfers, and Operations are auto-approved.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="no-print flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Printer className="h-4 w-4" />
          <span>Print Approvals Queue</span>
        </button>
      </div>

      {statusMsg && (
        <div
          className={`no-print rounded-xl border p-4 text-xs font-semibold ${
            statusMsg.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Policy Banner */}
      <div className="no-print rounded-2xl border border-emerald-300/80 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 p-4 text-xs text-emerald-950 dark:border-emerald-800/60 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 dark:text-emerald-300 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <strong className="block text-sm font-bold text-slate-900 dark:text-white">
              Daily Sales Auto-Approval Active
            </strong>
            <span className="text-slate-600 dark:text-slate-400">
              Counter daily sales reports are automatically approved on submission. If a staff member made an error, you can delete that day&apos;s report below so they can enter it again.
            </span>
          </div>
        </div>
        <button
          onClick={onNavigateToSales}
          className="rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-50 dark:border-emerald-700 dark:bg-slate-800 dark:text-emerald-300 cursor-pointer whitespace-nowrap"
        >
          Consolidated Reports →
        </button>
      </div>

      {/* 1. PRIMARY: Counter Stock Requests Approvals (From Godown) */}
      <div className="print-card rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-purple-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Central Godown Stock Requests ({requestGroups.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Requires Admin verification to transfer stock from Central Godown into Counter stock
          </span>
        </div>

        {requestGroups.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 space-y-3">
            {requestGroups.map(g => {
              const allIds = g.items.map(i => i.requestId).join(',');
              const availableCount = g.items.length - g.shortCount;

              return (
                <div key={g.groupKey} className="print-avoid-break py-3 space-y-3 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {g.counter === 'NORMAL' ? 'Normal Counter' : 'AC Counter'} · {g.items.length} item(s) · {g.totalBottles} bottles
                      </div>
                      <div className="text-slate-500">
                        Date: {g.date} · Reason: <strong>{g.reason}</strong> · By {g.by}
                      </div>
                    </div>

                    <div className="no-print flex items-center gap-2">
                      <button
                        onClick={() => {
                          setRemarkModal({
                            type: 'REQUEST_GROUP',
                            id: allIds,
                            decision: 'REJECT',
                            title: `Reject Request Batch (${g.counter})`
                          });
                        }}
                        className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-800 hover:bg-red-200 dark:bg-red-950 dark:text-red-300 cursor-pointer"
                      >
                        Reject All
                      </button>

                      {g.shortCount > 0 ? (
                        <>
                          <button
                            onClick={() => {
                              setRemarkModal({
                                type: 'REQUEST_GROUP',
                                id: allIds,
                                decision: 'APPROVE',
                                skipShort: true,
                                title: `Approve Available Items Only (${availableCount} items)`
                              });
                            }}
                            className="rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700 cursor-pointer"
                          >
                            Approve Available ({availableCount})
                          </button>
                          <button
                            disabled
                            className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-400 cursor-not-allowed"
                            title="Godown stock is short for some items"
                          >
                            Approve All (Short)
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setRemarkModal({
                              type: 'REQUEST_GROUP',
                              id: allIds,
                              decision: 'APPROVE',
                              title: `Approve Request Batch (${g.counter})`
                            });
                          }}
                          className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer"
                        >
                          Approve All ({g.totalBottles} btls)
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2 overflow-x-auto dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                      {g.items.map(i => (
                        <span key={i.requestId} className={i.short ? 'text-red-600 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                          {i.productName}: <strong>{i.qty} btls</strong>
                          {i.short && ` (SHORT: Godown has ${i.godownQty})`}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-3 text-center">
            No pending stock requests from Godown. All counters are adequately stocked.
          </p>
        )}
      </div>

      {/* 1b. Approved Godown Requests (Collapsible Batches + Admin Reversal/Deletion) */}
      <div className="print-card rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Approved Godown Requests ({approvedRequestGroups.length} {approvedRequestGroups.length === 1 ? 'batch' : 'batches'} · {approvedRequests.length} items)
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Click any batch dropdown to view items · Reversing deletes the request and returns stock to Godown
          </span>
        </div>

        {approvedRequestGroups.length > 0 ? (
          <div className="space-y-2">
            {approvedRequestGroups.map(g => {
              const allIds = g.items.map(i => i.requestId);
              const counterLabel = g.counter === 'NORMAL' ? 'Normal Counter' : 'AC Counter';
              const approver = g.items[0]?.reviewedBy || 'admin';
              const isExpanded = Boolean(expandedApprovedBatches[g.groupKey]);

              return (
                <div
                  key={g.groupKey}
                  className="print-avoid-break rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onClick={() => toggleApprovedBatch(g.groupKey)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleApprovedBatch(g.groupKey);
                      }
                    }}
                    className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 bg-slate-50/70 hover:bg-slate-100/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 px-3.5 py-2.5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white border border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </span>
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-1.5">
                          <span>{counterLabel}</span>
                          <span className="text-slate-400" aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{g.items.length} item(s)</span>
                          <span className="text-slate-400" aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums text-amber-700 dark:text-amber-300">{g.totalBottles} btls</span>
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 truncate">
                          Date: <span className="font-mono tabular-nums">{g.date}</span> · Reason:{' '}
                          <strong className="text-slate-700 dark:text-slate-300">{g.reason}</strong> · By {g.by} · Approved by {approver}
                        </div>
                      </div>
                    </div>

                    <div
                      className="no-print flex items-center gap-2 shrink-0 pl-7 sm:pl-0"
                      onClick={e => e.stopPropagation()}
                    >
                      {g.items.length > 1 ? (
                        <button
                          type="button"
                          onClick={() =>
                            openReverseModal({
                              ids: allIds,
                              counter: g.counter,
                              date: g.date,
                              totalBottles: g.totalBottles,
                              title: `Reverse & Delete Entire Batch (${counterLabel})`,
                              summary: `${g.items.length} items · ${g.totalBottles} bottles (${g.date})`
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Reverse Batch ({g.totalBottles} btls)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            openReverseModal({
                              ids: allIds,
                              counter: g.counter,
                              date: g.date,
                              totalBottles: g.totalBottles,
                              title: `Reverse & Delete Request (${counterLabel})`,
                              summary: `${g.items[0].productName} · ${g.totalBottles} bottles (${g.date})`
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200 dark:hover:bg-amber-900/60 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Reverse ({g.totalBottles} btls)</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleApprovedBatch(g.groupKey)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <span>{isExpanded ? 'Hide' : 'Items'}</span>
                        {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5">
                      {g.items.map((item: StockRequestItem) => (
                        <div
                          key={item.requestId}
                          className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                        >
                          <div className="text-[11px] text-slate-700 dark:text-slate-300">
                            <span className="font-bold text-slate-900 dark:text-white">{item.productName}</span>{' '}
                            <span className="text-slate-400" aria-hidden="true">·</span>{' '}
                            <span className="font-mono tabular-nums font-bold">{item.qty} btls</span>{' '}
                            <span className="text-slate-500 dark:text-slate-400">
                              ({item.enteredQty} {item.unit.toLowerCase()})
                            </span>
                            {item.remark ? (
                              <span className="text-slate-500 dark:text-slate-400"> · Note: {item.remark}</span>
                            ) : null}
                          </div>

                          <div className="no-print shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                openReverseModal({
                                  ids: [item.requestId],
                                  counter: item.counter,
                                  date: item.date,
                                  totalBottles: item.qty,
                                  title: `Reverse & Delete Item (${counterLabel})`,
                                  summary: `${item.productName} · ${item.qty} bottles (${item.date})`
                                })
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200 dark:hover:bg-amber-900/60 cursor-pointer whitespace-nowrap shrink-0"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Reverse Item</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 dark:text-slate-500 py-3 text-center">
            No approved Godown requests available to reverse.
          </p>
        )}
      </div>

      {/* 2. Stock Purchases Approvals */}
      <div className="print-card rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Stock Purchases into Godown ({pendingPurchases.length})
            </h2>
          </div>
        </div>

        {pendingPurchases.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {pendingPurchases.map(p => (
              <div key={p.batchId} className="print-avoid-break py-3 space-y-2 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {p.supplier} · {p.lines.length} item(s) · {p.totalQty} bottles ({p.batchId})
                    </div>
                    <div className="text-slate-500">
                      Invoice: <strong>{p.invoiceNo}</strong> · Bill Date: {p.billDate} · Net Payable: <strong className="text-emerald-600">{formatCurrency(p.netTotal)}</strong>
                    </div>
                  </div>

                  <div className="no-print flex items-center gap-2">
                    <button
                      onClick={() => {
                        setRemarkModal({
                          type: 'PURCHASE',
                          id: p.batchId,
                          decision: 'REJECT',
                          title: `Reject Purchase Batch (${p.batchId})`
                        });
                      }}
                      className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-800 hover:bg-red-200 dark:bg-red-950 dark:text-red-300 cursor-pointer"
                    >
                      Reject All
                    </button>
                    <button
                      onClick={() => {
                        setRemarkModal({
                          type: 'PURCHASE',
                          id: p.batchId,
                          decision: 'APPROVE',
                          title: `Approve Purchase Batch (${p.batchId})`
                        });
                      }}
                      className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer"
                    >
                      Approve & Add Stock
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2 overflow-x-auto dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                    {p.lines.map((l, i) => (
                      <span key={i}>
                        {l.productName}: <strong>{l.qty} btls</strong> @ {formatCurrency(l.rate)} (Net: {formatCurrency(l.netAmount)})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-3 text-center">No purchase bills awaiting approval.</p>
        )}
      </div>

      {/* 3. Auto-Approved Daily Sales Reports (Admin Error Deletion) */}
      <div className="print-card rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Submitted Daily Sales Reports ({dailySales.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Delete an erroneous report to restore counter stock and let staff re-enter that day
          </span>
        </div>

        {dailySales.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[...dailySales]
              .sort((a, b) => b.date.localeCompare(a.date) || b.submittedAt.localeCompare(a.submittedAt))
              .map(rep => (
                <div key={rep.reportId} className="print-avoid-break py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {rep.counter === 'NORMAL' ? 'Normal Counter' : 'AC Counter'} · {rep.date} ({rep.reportId})
                    </div>
                    <div className="text-slate-500">
                      Sold: <strong>{rep.totalSoldQty} btls</strong> · Value: <strong className="text-emerald-600">{formatCurrency(rep.totalSalesValue)}</strong> · Cashier: {rep.cashierName || '—'} / Helper: {rep.helperName || '—'}
                    </div>
                  </div>

                  <div className="no-print flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {rep.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setInspectShowAllLines(false);
                        setInspectingSalesReport(rep);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Inspect Sales</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteSalesReason('');
                        setDeleteSalesPassword('');
                        setShowDeleteSalesPassword(false);
                        setDeleteSalesError(null);
                        setDeleteSalesTarget(rep);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-800 hover:bg-red-200 dark:bg-red-950 dark:text-red-300 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete &amp; Re-open Date</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-3 text-center">No daily sales reports submitted yet.</p>
        )}
      </div>

      {/* 4. Deleted Daily Sales Reports (Admin 1-Click Recovery Bin) */}
      <div className="print-card rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Deleted Daily Sales Reports ({deletedDailySales.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Restore mistakenly deleted reports in 1 click unless a replacement report already exists
          </span>
        </div>

        {deletedDailySales.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[...deletedDailySales]
              .sort(
                (a, b) =>
                  String(b.deletedAt || '').localeCompare(String(a.deletedAt || '')) ||
                  String(b.date || '').localeCompare(String(a.date || '')) ||
                  String(b.reportId).localeCompare(String(a.reportId))
              )
              .map(rep => {
                const replacement = dailySales.find(
                  r => r.date === rep.date && r.counter === rep.counter && r.status !== 'Rejected'
                );
                const isRestoring = restoringSalesId === rep.reportId;

                return (
                  <div
                    key={rep.reportId}
                    className="print-avoid-break py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {rep.counter === 'NORMAL' ? 'Normal Counter' : 'AC Counter'} ·{' '}
                        <span className="font-mono tabular-nums">{rep.date}</span> ({rep.reportId})
                      </div>
                      <div className="text-slate-500 dark:text-slate-400">
                        Sold: <strong className="font-mono tabular-nums text-slate-700 dark:text-slate-200">{rep.totalSoldQty} btls</strong> · Value:{' '}
                        <strong className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(rep.totalSalesValue)}</strong> · Cashier: {rep.cashierName || '—'} / Helper: {rep.helperName || '—'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Deleted by <strong className="text-slate-700 dark:text-slate-300">{rep.deletedBy}</strong> ·{' '}
                        <span className="font-mono tabular-nums">{rep.deletedAt}</span>
                        {rep.deleteReason ? ` · Reason: ${rep.deleteReason}` : ''}
                        {rep.stockReversed ? ' · Stock restored on delete' : ''}
                      </div>
                    </div>

                    <div className="no-print flex flex-wrap items-center gap-2 shrink-0">
                      {replacement ? (
                        <>
                          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 whitespace-nowrap">
                            Replacement active ({replacement.reportId}) · Kept
                          </span>
                          <button
                            type="button"
                            onClick={() => setDismissBinTarget(rep)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/70 cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Remove from Bin</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => executeRestoreDailySales(rep)}
                          disabled={restoringSalesId !== null}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>{isRestoring ? 'Restoring...' : 'Restore Report'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 dark:text-slate-500 py-3 text-center">
            No deleted daily sales reports in the recovery bin.
          </p>
        )}
      </div>

      {/* Decision / Remark Modal */}
      {remarkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {remarkModal.title}
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Remark / Audit Note (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Verified physically against supplier challan or approved for evening peak"
                value={remarkText}
                onChange={e => setRemarkText(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-amber-500 dark:bg-slate-800 dark:text-white dark:border-slate-700"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRemarkModal(null)}
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold dark:border-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeDecision}
                className={`rounded-lg px-4 py-1.5 text-xs font-bold text-white cursor-pointer ${
                  remarkModal.decision === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Confirm {remarkModal.decision}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Daily Sales Confirmation Modal */}
      {deleteSalesTarget && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs">
          <form
            onSubmit={e => {
              e.preventDefault();
              void executeDeleteDailySales();
            }}
            className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-2xl dark:border-red-900/60 dark:bg-slate-900 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Daily Sales Report?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <strong>{deleteSalesTarget.counter === 'NORMAL' ? 'Normal Counter' : 'AC Counter'}</strong> · Date: <strong className="font-mono">{deleteSalesTarget.date}</strong> ({deleteSalesTarget.reportId})
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              Restores <strong>{deleteSalesTarget.totalSoldQty} sold bottles</strong> ({formatCurrency(deleteSalesTarget.totalSalesValue)}) back to {deleteSalesTarget.counter} stock and lets counter staff submit {deleteSalesTarget.date} sales again.
            </div>

            {deleteSalesError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                {deleteSalesError}
              </div>
            )}

            <div>
              <label
                htmlFor="delete-sales-reason"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
              >
                Reason for Deletion (Optional)
              </label>
              <input
                id="delete-sales-reason"
                type="text"
                placeholder="e.g. Incorrect closing count entered"
                value={deleteSalesReason}
                onChange={e => setDeleteSalesReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="delete-sales-admin-password"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                <Lock className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                <span>Admin Password (Required)</span>
              </label>
              <div className="relative">
                <input
                  id="delete-sales-admin-password"
                  type={showDeleteSalesPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder={`Enter password for ${currentUser.username}`}
                  value={deleteSalesPassword}
                  onChange={e => {
                    setDeleteSalesPassword(e.target.value);
                    if (deleteSalesError) setDeleteSalesError(null);
                  }}
                  className="w-full rounded-lg border border-slate-300 p-2 pr-9 text-xs outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowDeleteSalesPassword(prev => !prev)}
                  aria-label={showDeleteSalesPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showDeleteSalesPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Verification required every time to prevent accidental deletion.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteSalesTarget(null);
                  setDeleteSalesReason('');
                  setDeleteSalesPassword('');
                  setShowDeleteSalesPassword(false);
                  setDeleteSalesError(null);
                }}
                disabled={deletingSales}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={deletingSales || !deleteSalesPassword}
                className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0"
              >
                {deletingSales ? 'Deleting...' : 'Confirm Delete & Restore Stock'}
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Reverse Approved Godown Request Modal */}
      {reverseRequestModal && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs">
          <form
            onSubmit={e => {
              e.preventDefault();
              void executeReverseRequests();
            }}
            className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl dark:border-amber-900/60 dark:bg-slate-900 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {reverseRequestModal.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {reverseRequestModal.summary}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              Returns <strong className="font-mono tabular-nums">{reverseRequestModal.totalBottles} bottles</strong> from{' '}
              <strong>{reverseRequestModal.counter === 'NORMAL' ? 'Normal Counter' : 'AC Counter'}</strong> back to{' '}
              <strong>Central Godown</strong>, deletes the request from Godown, and removes its{' '}
              <strong>Godown In</strong> and <strong>Trans Out</strong> impact from Daily Sales.
            </div>

            {reverseError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                {reverseError}
              </div>
            )}

            <div>
              <label
                htmlFor="reverse-request-reason"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
              >
                Reason for Reversal (Optional)
              </label>
              <input
                id="reverse-request-reason"
                type="text"
                placeholder="e.g. Approved wrong counter or incorrect quantity"
                value={reverseReason}
                onChange={e => setReverseReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="reverse-request-admin-password"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>Admin Password (Required)</span>
              </label>
              <div className="relative">
                <input
                  id="reverse-request-admin-password"
                  type={showReversePassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder={`Enter password for ${currentUser.username}`}
                  value={reversePassword}
                  onChange={e => {
                    setReversePassword(e.target.value);
                    if (reverseError) setReverseError(null);
                  }}
                  className="w-full rounded-lg border border-slate-300 p-2 pr-9 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowReversePassword(prev => !prev)}
                  aria-label={showReversePassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showReversePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Verification required every time to prevent accidental reversal.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setReverseRequestModal(null);
                  setReverseReason('');
                  setReversePassword('');
                  setShowReversePassword(false);
                  setReverseError(null);
                }}
                disabled={reversingRequests}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reversingRequests || !reversePassword}
                className="rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0"
              >
                {reversingRequests ? 'Deleting & Returning...' : 'Confirm Delete & Return Stock'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inspect Sales Modal */}
      {inspectingSalesReport && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 max-h-[92vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between border-b pb-4 dark:border-slate-800 gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Inspect Sales · {inspectingSalesReport.reportId}
                  </h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    inspectingSalesReport.status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : inspectingSalesReport.status === 'Pending'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                  }`}>
                    {inspectingSalesReport.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Counter: {inspectingSalesReport.counter === 'NORMAL' ? 'Normal Counter' : 'AC Counter'} · Date: <strong>{inspectingSalesReport.date}</strong> · Submitted by {inspectingSalesReport.submittedBy} ({inspectingSalesReport.submittedAt})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingSalesReport(null)}
                aria-label="Close modal"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-amber-200/90 bg-amber-50/80 p-3 text-xs dark:border-amber-900/40 dark:bg-amber-950/40">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-slate-600 dark:text-slate-400 font-medium">Cashier:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">{inspectingSalesReport.cashierName || '—'}</span>
              </div>
              <span className="text-amber-300 dark:text-amber-800">|</span>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-slate-600 dark:text-slate-400 font-medium">Helper:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">{inspectingSalesReport.helperName || '—'}</span>
              </div>
            </div>

            {inspectingSalesReport.remark && (
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
                <strong>Notes / Audit:</strong> {inspectingSalesReport.remark}
              </div>
            )}

            {(() => {
              const viewRec = getReportReconciliation(inspectingSalesReport, operations);
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                    <span className="text-slate-500">Sold Quantity</span>
                    <div className="font-mono tabular-nums text-base font-bold text-slate-900 dark:text-white">
                      {inspectingSalesReport.totalSoldQty} btls
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                    <span className="text-slate-500">Sales Value</span>
                    <div className="font-mono tabular-nums text-base font-bold text-emerald-600">
                      {formatCurrency(inspectingSalesReport.totalSalesValue)}
                    </div>
                    {viewRec.shopOutflowsCredited > 0 && (
                      <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                        Less Exp/Wages: -{formatCurrency(viewRec.shopOutflowsCredited)}
                      </div>
                    )}
                    {inspectingSalesReport.counter === 'AC' && (
                      <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5 font-mono">
                        AC Charges: {formatCurrency(inspectingSalesReport.acCharges || 0)}
                      </div>
                    )}
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                    <span className="text-slate-500">Cash / UPI</span>
                    <div className="font-mono tabular-nums text-base font-bold text-slate-900 dark:text-white">
                      {formatCurrency(inspectingSalesReport.cashAmount)} / {formatCurrency(inspectingSalesReport.upiAmount + (inspectingSalesReport.cardAmount || 0))}
                    </div>
                    {viewRec.shopOutflowsCredited > 0 && (
                      <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                        Expected Drawer: {formatCurrency(viewRec.expectedDrawerTotal)}
                      </div>
                    )}
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                    <span className="text-slate-500">Staff Difference</span>
                    <div className={`font-mono tabular-nums text-base font-bold ${
                      Math.abs(viewRec.staffDifference) <= 0.009
                        ? 'text-emerald-600'
                        : viewRec.staffDifference > 0
                        ? 'text-blue-600'
                        : 'text-red-600'
                    }`}>
                      {Math.abs(viewRec.staffDifference) <= 0.009
                        ? '✓ Matches'
                        : `${viewRec.staffDifference > 0 ? '+' : ''}${formatCurrency(viewRec.staffDifference)}`}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-400">
                {inspectShowAllLines
                  ? `Showing all ${inspectingSalesReport.lines.length} product rows`
                  : `Showing ${inspectingSalesReport.lines.filter(l => l.sold > 0).length} sold item(s)`}
              </span>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inspectShowAllLines}
                  onChange={e => setInspectShowAllLines(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>Show all items (including 0 sold)</span>
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden dark:border-slate-800">
              <div className="overflow-x-auto max-h-[320px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400 sticky top-0">
                    <tr>
                      <th className="p-2.5">Product</th>
                      <th className="p-2.5">Open</th>
                      <th className="p-2.5">In</th>
                      <th className="p-2.5">Out</th>
                      <th className="p-2.5">Closing</th>
                      <th className="p-2.5">Sold</th>
                      <th className="p-2.5 text-right">Rate</th>
                      <th className="p-2.5 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(() => {
                      const visibleLines = inspectShowAllLines
                        ? inspectingSalesReport.lines
                        : inspectingSalesReport.lines.filter(l => l.sold > 0);
                      if (visibleLines.length === 0) {
                        return (
                          <tr>
                            <td colSpan={8} className="p-4 text-center text-slate-400">
                              No sold items recorded in this report.
                            </td>
                          </tr>
                        );
                      }
                      return visibleLines.map(l => (
                        <tr key={l.productId}>
                          <td className="p-2.5 font-bold text-slate-900 dark:text-white">{l.name}</td>
                          <td className="p-2.5 font-mono tabular-nums">{l.opening}</td>
                          <td className="p-2.5 font-mono tabular-nums text-emerald-600">{l.inQty}</td>
                          <td className="p-2.5 font-mono tabular-nums text-red-600">{l.outQty}</td>
                          <td className="p-2.5 font-mono tabular-nums">{l.closing}</td>
                          <td className="p-2.5 font-mono tabular-nums font-bold text-blue-600">{l.sold}</td>
                          <td className="p-2.5 font-mono tabular-nums text-right">{formatCurrency(l.price)}</td>
                          <td className="p-2.5 font-mono tabular-nums font-bold text-right">{formatCurrency(l.value)}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => triggerInspectPrint('DAILY_SALES')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Daily Sales</span>
                </button>
                <button
                  type="button"
                  onClick={() => triggerInspectPrint('CONSOLIDATED')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Print Consolidated</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteSalesReason('');
                    setDeleteSalesPassword('');
                    setShowDeleteSalesPassword(false);
                    setDeleteSalesError(null);
                    setDeleteSalesTarget(inspectingSalesReport);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-800 hover:bg-red-200 dark:bg-red-950 dark:text-red-300 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete &amp; Re-open Date</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setInspectingSalesReport(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Password Protection for Removing Superseded Entry from Bin */}
      <AdminPasswordDeleteModal
        isOpen={Boolean(dismissBinTarget)}
        title="Remove Deleted Report from Recovery Bin?"
        subtitle={
          dismissBinTarget
            ? `${dismissBinTarget.counter === 'NORMAL' ? 'Normal Counter' : 'AC Counter'} · ${dismissBinTarget.date} (${dismissBinTarget.reportId})`
            : undefined
        }
        warningNote="Permanently clears this superseded entry from the deleted reports recovery bin."
        confirmLabel="Confirm Remove from Bin"
        onClose={() => setDismissBinTarget(null)}
        onConfirm={executeDismissDeletedSales}
      />
      </div>

      {inspectPrintMode === 'DAILY_SALES' && inspectingSalesReport && (
        <PrintableDailySalesSheet report={inspectingSalesReport} operations={operations} />
      )}
      {inspectPrintMode === 'CONSOLIDATED' && inspectingSalesReport && (
        <PrintableConsolidatedShiftSheet
          date={inspectingSalesReport.date}
          counterScope="ALL"
          normalSale={
            dailySales.find(r => r.counter === 'NORMAL' && r.date === inspectingSalesReport.date && r.status === 'Approved') ||
            dailySales.find(r => r.counter === 'NORMAL' && r.date === inspectingSalesReport.date && r.status !== 'Rejected') ||
            null
          }
          acSale={
            dailySales.find(r => r.counter === 'AC' && r.date === inspectingSalesReport.date && r.status === 'Approved') ||
            dailySales.find(r => r.counter === 'AC' && r.date === inspectingSalesReport.date && r.status !== 'Rejected') ||
            null
          }
          operations={operations}
        />
      )}
    </div>
  );
};
