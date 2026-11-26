import React, { useEffect, useState } from 'react';
import { useStock } from '../context/StockContext';
import { ArrowRightLeft, Search, Printer, Trash2 } from 'lucide-react';
import { CounterLocation, StockLocation } from '../types';
import { bottlesPerCase_, matchesSearchQuery, sortProductsCategoryWise, stockQtyLabel } from '../data/initialData';

const formatLocationLabel = (loc: StockLocation | string): string => {
  if (loc === 'GODOWN') return 'Godown';
  if (loc === 'NORMAL') return 'Normal Counter';
  if (loc === 'AC') return 'AC Counter';
  return String(loc);
};

export const TransfersView: React.FC = () => {
  const { currentUser, stockItems, transfers, submitTransfer, adminDeleteTransfer } = useStock();
  const isAdmin = currentUser?.role === 'ADMIN';

  const fromLoc: StockLocation = isAdmin ? 'GODOWN' : (currentUser?.counter || 'NORMAL');
  const otherCounter: CounterLocation = currentUser?.counter === 'NORMAL' ? 'AC' : 'NORMAL';

  const [productSearch, setProductSearch] = useState('');
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState<'CASE' | 'BOTTLE'>('BOTTLE');
  const [targetLocation, setTargetLocation] = useState<StockLocation>(isAdmin ? 'NORMAL' : otherCounter);
  const [note, setNote] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    setTargetLocation(prev => {
      if (isAdmin) {
        return prev === 'NORMAL' || prev === 'AC' ? prev : 'NORMAL';
      }
      return prev === 'GODOWN' || prev === otherCounter ? prev : otherCounter;
    });
  }, [isAdmin, otherCounter]);

  const effectiveTarget: StockLocation = isAdmin
    ? (targetLocation === 'AC' ? 'AC' : 'NORMAL')
    : (targetLocation === 'GODOWN' ? 'GODOWN' : otherCounter);

  const fromLocation = formatLocationLabel(fromLoc);
  const toLocation = formatLocationLabel(effectiveTarget);

  // Products available at the source location
  const sourceKey = fromLoc.toLowerCase() as 'godown' | 'normal' | 'ac';
  const destKey = effectiveTarget.toLowerCase() as 'godown' | 'normal' | 'ac';
  const transferableProducts = sortProductsCategoryWise(stockItems.filter(p => p[sourceKey] > 0));
  const searchResults = productSearch.trim()
    ? transferableProducts
        .filter(p => matchesSearchQuery(productSearch, p.name, p.category, p.sizeML, p.productId))
        .slice(0, 12)
    : [];
  const selectedProduct = transferableProducts.find(p => p.productId === productId);
  const pack = selectedProduct ? bottlesPerCase_(selectedProduct) : 1;
  const numQty = Number(qty) || 0;
  const totalBottles = numQty * (unit === 'CASE' ? pack : 1);
  const currentSourceStock = selectedProduct ? selectedProduct[sourceKey] : 0;
  const currentDestStock = selectedProduct ? selectedProduct[destKey] : 0;

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingTransferId, setDeletingTransferId] = useState<string | null>(null);

  const handleDeleteTransfer = async (transferId: string) => {
    try {
      setDeletingTransferId(transferId);
      setStatusMsg(null);
      await adminDeleteTransfer(transferId);
      setConfirmDeleteId(null);
      setStatusMsg({ type: 'ok', text: `Deleted transfer ${transferId} and restored stock balances.` });
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: e?.message || 'Failed to delete transfer.' });
    } finally {
      setDeletingTransferId(null);
    }
  };

  const handleOpenPreview = () => {
    setStatusMsg(null);
    if (!selectedProduct) {
      setStatusMsg({ type: 'err', text: 'Choose a product to transfer.' });
      return;
    }
    if (numQty <= 0) {
      setStatusMsg({ type: 'err', text: 'Enter a positive quantity.' });
      return;
    }
    if (totalBottles > currentSourceStock) {
      setStatusMsg({
        type: 'err',
        text: `Quantity exceeds stock available at ${fromLocation} (${currentSourceStock} btls).`
      });
      return;
    }

    setShowPreviewModal(true);
  };

  const handleConfirmTransfer = async () => {
    try {
      setIsSubmittingTransfer(true);
      setStatusMsg(null);
      if (!selectedProduct) throw new Error('Choose a product to transfer.');
      if (numQty <= 0) throw new Error('Enter a positive quantity.');
      if (totalBottles > currentSourceStock) {
        throw new Error(`Quantity exceeds stock available at ${fromLocation} (${currentSourceStock} btls).`);
      }

      const res = await submitTransfer({
        productId,
        qty: numQty,
        unit,
        to: effectiveTarget,
        note: note.trim()
      });

      setShowPreviewModal(false);
      setStatusMsg({
        type: 'ok',
        text: res.autoApproved
          ? `Transferred ${totalBottles} bottles from ${fromLocation} to ${toLocation} immediately!`
          : `Submitted transfer request for Admin approval.`
      });

      setQty('1');
      setNote('');
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: e.message || 'Error executing transfer.' });
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  return (
    <div className="print-surface space-y-6">
      <div className="print-header text-center">
        <h1 className="text-xl font-black tracking-tight">MM RESIDENCY – INVENTORY & BAR MANAGEMENT</h1>
        <h2 className="text-sm font-bold uppercase tracking-wider mt-1">INTER-LOCATION STOCK TRANSFER LOG</h2>
        <div className="text-xs text-slate-600 mt-1">
          Printed: {new Date().toLocaleString('en-IN')} · Total Transfers: {transfers.length}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-[11px] font-extrabold tracking-widest text-amber-600 dark:text-amber-400 uppercase">
            Inter-Location Logistics
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Stock Transfers
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAdmin
              ? 'Transfer stock from Godown to Normal Counter or AC Counter.'
              : 'Transfer stock to the other counter or return stock back to Godown with immediate real-time balance deduction.'}
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="no-print flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Printer className="h-4 w-4" />
          <span>Print Transfer Log</span>
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

      {/* Transfer Action Card */}
      <div className="no-print rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center gap-2 border-b pb-3 dark:border-slate-800">
          <ArrowRightLeft className="h-5 w-5 text-amber-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {fromLocation} → {toLocation}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              {isAdmin ? 'Destination Counter' : 'Destination Location'}
            </label>
            <select
              value={effectiveTarget}
              onChange={e => setTargetLocation(e.target.value as StockLocation)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {isAdmin ? (
                <>
                  <option value="NORMAL">Normal Counter</option>
                  <option value="AC">AC Counter</option>
                </>
              ) : (
                <>
                  <option value={otherCounter}>
                    {otherCounter === 'NORMAL' ? 'Normal Counter' : 'AC Counter'}
                  </option>
                  <option value="GODOWN">Godown (Return Stock)</option>
                </>
              )}
            </select>
          </div>

          <div className="relative space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={`Search product at ${fromLocation} (case-insensitive)...`}
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
                  {searchResults.map(p => (
                    <button
                      key={p.productId}
                      type="button"
                      onClick={() => {
                        setProductId(p.productId);
                        setProductSearch('');
                      }}
                      className="w-full p-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{p.name} {p.sizeML}ml</div>
                        <span className="text-[10px] text-slate-500">{p.category} · {p.casePack}/case</span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        {p[sourceKey]} btls
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Select Product Available at {fromLocation}
              </label>
              <select
                value={productId}
                onChange={e => setProductId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Choose a product with stock...</option>
                {transferableProducts.map(p => (
                  <option key={p.productId} value={p.productId}>
                    {p.name} {p.sizeML}ml — {p.casePack}/case (Available: {p[sourceKey]} btls)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {selectedProduct && (
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 flex items-center justify-between">
            <div>
              <strong className="block text-slate-900 dark:text-white">{selectedProduct.name} {selectedProduct.sizeML}ml</strong>
              <span>
                {fromLocation} balance: <strong>{stockQtyLabel(currentSourceStock, pack)}</strong> · {toLocation} balance: <strong>{stockQtyLabel(currentDestStock, pack)}</strong>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Equivalent</span>
              <strong className="font-mono text-sm text-amber-600 dark:text-amber-400">{totalBottles} bottles</strong>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Quantity</label>
            <input
              type="number"
              min="1"
              step="1"
              value={qty}
              onChange={e => setQty(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-xs font-bold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Unit</label>
            <select
              value={unit}
              onChange={e => setUnit(e.target.value as 'CASE' | 'BOTTLE')}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="BOTTLE">Bottles</option>
              <option value="CASE">Cases</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Note (Optional)</label>
            <input
              type="text"
              placeholder={effectiveTarget === 'GODOWN' ? 'e.g. Returning excess counter stock' : 'e.g. VIP room order'}
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        <button
          disabled={!selectedProduct || numQty <= 0 || totalBottles > currentSourceStock}
          onClick={handleOpenPreview}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-40 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 transition-colors cursor-pointer"
        >
          Preview & Execute Transfer
        </button>
      </div>

      {/* TRANSFER PREVIEW MODAL */}
      {showPreviewModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-start justify-between border-b pb-3 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                  Pre-Transfer Confirmation
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Stock Transfer Preview
                </h3>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl bg-amber-50/70 p-3 text-xs text-amber-950 dark:bg-amber-950/40 dark:text-amber-200 border border-amber-200/70 dark:border-amber-900/50 flex items-center justify-between">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Route</span>
                <span className="font-bold text-sm">{fromLocation} → {toLocation}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Transfer Quantity</span>
                <span className="font-mono font-bold text-base text-amber-700 dark:text-amber-300">
                  {totalBottles} bottles ({numQty} {unit.toLowerCase()})
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-3.5 text-xs dark:border-slate-800 space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Product Name:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedProduct.name} {selectedProduct.sizeML}ml</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Category & Pack:</span>
                <span className="text-slate-800 dark:text-slate-200">{selectedProduct.category} · {pack} btls/case</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">{fromLocation} After Transfer:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {currentSourceStock} → {currentSourceStock - totalBottles} btls
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">{toLocation} After Transfer:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {currentDestStock} → {currentDestStock + totalBottles} btls
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Note:</span>
                <span className="text-slate-700 dark:text-slate-300">{note.trim() || '—'}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isSubmittingTransfer}
                onClick={() => setShowPreviewModal(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                ← Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingTransfer}
                onClick={handleConfirmTransfer}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 flex items-center gap-2 cursor-pointer"
              >
                {isSubmittingTransfer ? 'Transferring...' : 'Confirm & Execute Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer History */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Transfer Activity Log
        </h2>

        <div className="print-card rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
          <div className="print-table-wrap overflow-x-auto">
            <table className="print-table w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 font-bold uppercase text-[10px] text-slate-600 dark:text-slate-400">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">From → To</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Transferred Qty</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">By</th>
                  <th className="py-3 px-4">Note / Remark</th>
                  {isAdmin && <th className="no-print py-3 px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transfers.map(t => (
                  <tr key={t.transferId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono text-[11px]">{t.createdAt}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {formatLocationLabel(t.fromLoc)} → {formatLocationLabel(t.toLoc)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{t.productName}</td>
                    <td className="py-3 px-4 font-mono font-bold">
                      {stockQtyLabel(t.qty, t.casePack)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        t.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{t.createdBy}</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">{t.note || t.remark || '—'}</td>
                    {isAdmin && (
                      <td className="no-print py-3 px-4 text-right">
                        {confirmDeleteId === t.transferId ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={deletingTransferId === t.transferId}
                              onClick={() => handleDeleteTransfer(t.transferId)}
                              className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                            >
                              {deletingTransferId === t.transferId ? 'Deleting...' : 'Confirm'}
                            </button>
                            <button
                              type="button"
                              disabled={deletingTransferId === t.transferId}
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(t.transferId)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/50 cursor-pointer whitespace-nowrap"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Delete</span>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
