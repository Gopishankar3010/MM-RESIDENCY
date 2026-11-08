import React, { useState } from 'react';
import { useStock } from '../context/StockContext';
import { ArrowRightLeft, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { CounterLocation } from '../types';
import { bottlesPerCase_, stockQtyLabel } from '../data/initialData';

export const TransfersView: React.FC = () => {
  const { currentUser, stockItems, transfers, submitTransfer } = useStock();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState<'CASE' | 'BOTTLE'>('BOTTLE');
  const [targetCounter, setTargetCounter] = useState<CounterLocation>('NORMAL');
  const [note, setNote] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const fromLocation = isAdmin ? 'Godown' : (currentUser?.counter === 'NORMAL' ? 'Normal Counter' : 'AC Counter');
  const otherCounter: CounterLocation = currentUser?.counter === 'NORMAL' ? 'AC' : 'NORMAL';
  const toLocation = isAdmin ? (targetCounter === 'NORMAL' ? 'Normal Counter' : 'AC Counter') : (otherCounter === 'NORMAL' ? 'Normal Counter' : 'AC Counter');

  // Products available at the source location
  const sourceKey = isAdmin ? 'godown' : (currentUser?.counter?.toLowerCase() as 'normal' | 'ac' || 'normal');
  const transferableProducts = stockItems.filter(p => p[sourceKey] > 0);
  const selectedProduct = transferableProducts.find(p => p.productId === productId);
  const pack = selectedProduct ? bottlesPerCase_(selectedProduct) : 1;
  const numQty = Number(qty) || 0;
  const totalBottles = numQty * (unit === 'CASE' ? pack : 1);
  const currentSourceStock = selectedProduct ? selectedProduct[sourceKey] : 0;

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

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
        to: isAdmin ? targetCounter : otherCounter,
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
    <div className="space-y-6">
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
            : 'Counter-to-counter transfers execute immediately with real-time stock balance deduction.'}
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

      {/* Transfer Action Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center gap-2 border-b pb-3 dark:border-slate-800">
          <ArrowRightLeft className="h-5 w-5 text-amber-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {fromLocation} → {toLocation}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {isAdmin && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Destination Counter
              </label>
              <select
                value={targetCounter}
                onChange={e => setTargetCounter(e.target.value as CounterLocation)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="NORMAL">Normal Counter</option>
                <option value="AC">AC Counter</option>
              </select>
            </div>
          )}

          <div className={isAdmin ? '' : 'sm:col-span-2'}>
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

        {selectedProduct && (
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 flex items-center justify-between">
            <div>
              <strong className="block text-slate-900 dark:text-white">{selectedProduct.name} {selectedProduct.sizeML}ml</strong>
              <span>Current {fromLocation} balance: <strong>{stockQtyLabel(currentSourceStock, pack)}</strong></span>
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
              placeholder="e.g. VIP room order"
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
                <span className="text-slate-500">{fromLocation} Available:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{currentSourceStock} btls</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">{fromLocation} After Transfer:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{currentSourceStock - totalBottles} btls</span>
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

        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 font-bold uppercase text-[10px] text-slate-600 dark:text-slate-400">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">From → To</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Transferred Qty</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">By</th>
                  <th className="py-3 px-4">Note / Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transfers.map(t => (
                  <tr key={t.transferId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono text-[11px]">{t.createdAt}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {t.fromLoc} → {t.toLoc}
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
