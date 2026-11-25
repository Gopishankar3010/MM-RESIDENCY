import React, { useState } from 'react';
import { useStock } from '../context/StockContext';
import { CheckCircle2, ArrowRightLeft, Truck, Check, X, ShieldCheck, Printer, Trash2, AlertTriangle, Receipt, RotateCcw, Lock, Eye, EyeOff } from 'lucide-react';
import { RequestGroup, DailySalesReport, DeletedDailySalesReport, StockRequestItem } from '../types';

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
  const [confirmingDismissId, setConfirmingDismissId] = useState<string | null>(null);
  const [dismissingSalesId, setDismissingSalesId] = useState<string | null>(null);
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

  const executeDismissDeletedSales = async (rep: DeletedDailySalesReport) => {
    try {
      setDismissingSalesId(rep.reportId);
      setStatusMsg(null);
      await adminDismissDeletedSales(rep.reportId);
      setConfirmingDismissId(null);
      setStatusMsg({
        type: 'ok',
        text: `Removed superseded entry (${rep.reportId}) for ${rep.date} from the deleted reports bin.`
      });
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: e?.message || 'Failed to remove entry from bin.' });
    } finally {
      setDismissingSalesId(null);
    }
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
        text: `Reversed ${res.reversed} approved request item(s) (${res.totalBottles} btls) from ${counterLabel} back to Central Godown and marked as Reversed.`
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

      {/* 1b. Approved Godown Requests (Admin Single-Item or Batch Reversal) */}
      <div className="print-card rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Approved Godown Requests ({approvedRequests.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Reverse a single item or entire batch to return bottles from Counter back to Central Godown
          </span>
        </div>

        {approvedRequestGroups.length > 0 ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {approvedRequestGroups.map(g => {
              const allIds = g.items.map(i => i.requestId);
              const counterLabel = g.counter === 'NORMAL' ? 'Normal Counter' : 'AC Counter';
              const approver = g.items[0]?.reviewedBy || 'admin';

              return (
                <div key={g.groupKey} className="print-avoid-break py-3.5 first:pt-0 last:pb-0 space-y-2.5 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {counterLabel} · <span className="font-mono tabular-nums">{g.items.length}</span> item(s) ·{' '}
                        <span className="font-mono tabular-nums">{g.totalBottles}</span> btls
                      </div>
                      <div className="text-slate-500 dark:text-slate-400">
                        Date: <span className="font-mono tabular-nums">{g.date}</span> · Reason: <strong className="text-slate-700 dark:text-slate-300">{g.reason}</strong> · Requested by {g.by} · Approved by {approver}
                      </div>
                    </div>

                    {g.items.length > 1 && (
                      <div className="no-print flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            openReverseModal({
                              ids: allIds,
                              counter: g.counter,
                              date: g.date,
                              totalBottles: g.totalBottles,
                              title: `Reverse Entire Batch (${counterLabel})`,
                              summary: `${g.items.length} items · ${g.totalBottles} bottles (${g.date})`
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Reverse Batch ({g.totalBottles} btls)</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border-t border-slate-100 dark:border-slate-800/80 pl-3">
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
                                title: `Reverse Approved Item (${counterLabel})`,
                                summary: `${item.productName} · ${item.qty} bottles (${item.date})`
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200 dark:hover:bg-amber-900/60 cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>{g.items.length === 1 ? `Reverse (${item.qty} btls)` : 'Reverse Item'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
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

                  <div className="no-print flex items-center gap-2">
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {rep.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteSalesReason('');
                        setDeleteSalesPassword('');
                        setShowDeleteSalesPassword(false);
                        setDeleteSalesError(null);
                        setDeleteSalesTarget(rep);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-800 hover:bg-red-200 dark:bg-red-950 dark:text-red-300 cursor-pointer"
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
                const isConfirmingDismiss = confirmingDismissId === rep.reportId;
                const isDismissing = dismissingSalesId === rep.reportId;

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
                          {isConfirmingDismiss ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => executeDismissDeletedSales(rep)}
                                disabled={isDismissing}
                                className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                              >
                                {isDismissing ? 'Removing...' : 'Confirm Remove'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmingDismissId(null)}
                                disabled={isDismissing}
                                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap shrink-0"
                              >
                                Keep
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmingDismissId(rep.reportId)}
                              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer whitespace-nowrap shrink-0"
                            >
                              Remove from Bin
                            </button>
                          )}
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
              <strong>Central Godown</strong> and marks the request as <strong>Reversed</strong>.
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
                {reversingRequests ? 'Reversing...' : 'Confirm Reverse & Return Stock'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
