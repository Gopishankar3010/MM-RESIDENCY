import React, { useState } from 'react';
import { useStock } from '../context/StockContext';
import { CheckCircle2, ArrowRightLeft, Truck, Check, X, ShieldCheck } from 'lucide-react';
import { RequestGroup } from '../types';

export const ApprovalsView: React.FC<{ onNavigateToSales: () => void }> = ({ onNavigateToSales }) => {
  const {
    currentUser,
    requests,
    stockItems,
    reviewRequestGroup,
    purchases,
    reviewPurchaseBill
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

  return (
    <div className="space-y-6">
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

      {statusMsg && (
        <div
          className={`rounded-xl border p-4 text-xs font-semibold ${
            statusMsg.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Policy Banner */}
      <div className="rounded-2xl border border-emerald-300/80 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 p-4 text-xs text-emerald-950 dark:border-emerald-800/60 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 dark:text-emerald-300 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <strong className="block text-sm font-bold text-slate-900 dark:text-white">
              Daily Sales Auto-Approval Active
            </strong>
            <span className="text-slate-600 dark:text-slate-400">
              Counter daily sales and physical closing entries are automatically approved on submission and immediately reflect in financial reports.
            </span>
          </div>
        </div>
        <button
          onClick={onNavigateToSales}
          className="rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-50 dark:border-emerald-700 dark:bg-slate-800 dark:text-emerald-300 cursor-pointer whitespace-nowrap"
        >
          View Sales →
        </button>
      </div>

      {/* 1. PRIMARY: Counter Stock Requests Approvals (From Godown) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
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
                <div key={g.groupKey} className="py-3 space-y-3 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {g.counter === 'NORMAL' ? 'Normal Counter' : 'AC Counter'} · {g.items.length} item(s) · {g.totalBottles} bottles
                      </div>
                      <div className="text-slate-500">
                        Date: {g.date} · Reason: <strong>{g.reason}</strong> · By {g.by}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
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

      {/* 2. Stock Purchases Approvals */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
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
              <div key={p.batchId} className="py-3 space-y-2 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {p.supplier} · {p.lines.length} item(s) · {p.totalQty} bottles ({p.batchId})
                    </div>
                    <div className="text-slate-500">
                      Invoice: <strong>{p.invoiceNo}</strong> · Bill Date: {p.billDate} · Net Payable: <strong className="text-emerald-600">{formatCurrency(p.netTotal)}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
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
    </div>
  );
};
