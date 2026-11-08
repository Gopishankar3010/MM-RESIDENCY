import React, { useState } from 'react';
import { useStock } from '../context/StockContext';
import { Search, ShoppingBag, Plus, Trash2, CheckCircle2, Clock, XCircle, ArrowRight } from 'lucide-react';
import { bottlesPerCase_, stockQtyLabel } from '../data/initialData';

export const RequestsView: React.FC = () => {
  const { currentUser, businessDate, stockItems, requests, submitRequestBatch } = useStock();
  const isAdmin = currentUser?.role === 'ADMIN';

  // Request form state (Counter users)
  const [search, setSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [enteredQty, setEnteredQty] = useState('1');
  const [unit, setUnit] = useState<'CASE' | 'BOTTLE'>('CASE');
  const [reason, setReason] = useState('');
  const [basket, setBasket] = useState<{ productId: string; name: string; sizeML: number; casePack: number; qty: number; unit: 'CASE' | 'BOTTLE'; bottles: number }[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const selectedProduct = stockItems.find(p => p.productId === selectedProductId);
  const pack = selectedProduct ? bottlesPerCase_(selectedProduct) : 1;
  const numQty = Number(enteredQty) || 0;
  const equivalentBottles = numQty * (unit === 'CASE' ? pack : 1);

  // Filter products for search
  const availableProducts = stockItems.filter(p => p.active && p.godownAvailable > 0);
  const searchResults = search.trim()
    ? availableProducts.filter(p => (p.name + ' ' + p.category + ' ' + p.sizeML).toLowerCase().includes(search.trim().toLowerCase())).slice(0, 8)
    : [];

  const handleAddToBasket = () => {
    if (!selectedProduct) return;
    if (numQty <= 0) return;
    if (equivalentBottles > selectedProduct.godownAvailable) {
      setStatusMessage({
        type: 'err',
        text: `Requested quantity (${equivalentBottles} btls) exceeds Godown available stock (${selectedProduct.godownAvailable} btls).`
      });
      return;
    }

    setBasket(prev => {
      const existing = prev.find(b => b.productId === selectedProduct.productId && b.unit === unit);
      if (existing) {
        return prev.map(b => b === existing ? {
          ...b,
          qty: b.qty + numQty,
          bottles: b.bottles + equivalentBottles
        } : b);
      }
      return [
        ...prev,
        {
          productId: selectedProduct.productId,
          name: selectedProduct.name,
          sizeML: selectedProduct.sizeML,
          casePack: pack,
          qty: numQty,
          unit,
          bottles: equivalentBottles
        }
      ];
    });

    setEnteredQty('1');
    setStatusMessage(null);
  };

  const handleOpenPreview = () => {
    if (!basket.length) {
      setStatusMessage({ type: 'err', text: 'Please add at least one product to the basket.' });
      return;
    }
    setShowPreviewModal(true);
  };

  const handleConfirmSubmitRequest = async () => {
    try {
      setIsSubmitting(true);
      if (!basket.length) throw new Error('Please add at least one product to the basket.');

      const finalReason = reason.trim() || 'Counter replenishment';

      await submitRequestBatch({
        date: businessDate,
        reason: finalReason,
        items: basket.map(b => ({
          productId: b.productId,
          qty: b.qty,
          unit: b.unit
        }))
      });

      setShowPreviewModal(false);
      setStatusMessage({ type: 'ok', text: `${basket.length} item(s) requested successfully. Waiting for Admin approval.` });
      setBasket([]);
      setReason('');
    } catch (e: any) {
      setStatusMessage({ type: 'err', text: e.message || 'Error submitting request.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickReasons = ['Counter replenishment', 'Stock finished', 'Running low', 'Weekend rush peak', 'Customer demand'];

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[11px] font-extrabold tracking-widest text-amber-600 dark:text-amber-400 uppercase">
          Indent & Fulfillment
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {isAdmin ? 'Counter Stock Requests' : 'Request Stock from Central Godown'}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Request case lots or loose bottles from Godown storage into {currentUser?.counter || 'Counter'}
        </p>
      </div>

      {statusMessage && (
        <div
          className={`rounded-xl border p-4 text-xs font-semibold ${
            statusMessage.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* COUNTER WORKSPACE: Request Builder */}
      {!isAdmin && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Item Selector Form */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Select Product & Quantity
            </h2>

            {/* Live Search */}
            <div className="relative">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Fast Product Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Type brand name to search..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
                  {searchResults.map(p => (
                    <button
                      key={p.productId}
                      type="button"
                      onClick={() => {
                        setSelectedProductId(p.productId);
                        setSearch('');
                      }}
                      className="w-full p-2.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{p.name} {p.sizeML}ml</div>
                        <span className="text-[10px] text-slate-500">{p.category} · {p.casePack}/case</span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400">
                        Godown: {stockQtyLabel(p.godownAvailable, p.casePack)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Dropdown */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Select from Catalogue
              </label>
              <select
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Choose a product...</option>
                {availableProducts.map(p => (
                  <option key={p.productId} value={p.productId}>
                    {p.name} {p.sizeML}ml — {p.casePack}/case (Godown Avail: {p.godownAvailable} btls)
                  </option>
                ))}
              </select>
            </div>

            {/* Product stock availability info note */}
            {selectedProduct && (
              <div className="rounded-lg bg-blue-50/70 p-3 text-xs text-blue-900 dark:bg-blue-950/40 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                <div className="font-bold">{selectedProduct.name} {selectedProduct.sizeML}ml</div>
                <div className="mt-1 flex items-center gap-4 text-[11px]">
                  <span>Godown Available: <strong>{stockQtyLabel(selectedProduct.godownAvailable, pack)}</strong></span>
                  <span>My Counter Stock: <strong>{stockQtyLabel(selectedProduct[currentUser?.counter?.toLowerCase() as 'normal' | 'ac'] || 0, pack)}</strong></span>
                </div>
              </div>
            )}

            {/* Quantity and Unit */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={enteredQty}
                  onChange={e => setEnteredQty(e.target.value)}
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
                  <option value="CASE">Cases</option>
                  <option value="BOTTLE">Bottles</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Equivalent</label>
                <div className="rounded-lg border border-slate-200 bg-slate-100/60 p-2 font-mono text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {equivalentBottles} bottles
                </div>
              </div>
            </div>

            <button
              disabled={!selectedProduct || numQty <= 0}
              onClick={handleAddToBasket}
              className="w-full rounded-lg bg-slate-900 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-40 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 transition-colors"
            >
              + Add to Request Basket
            </button>
          </div>

          {/* Basket & Submit */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-amber-500" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Request Basket</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {basket.length} {basket.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {basket.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
                  {basket.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                        <span className="text-[11px] text-slate-500">
                          {item.qty} {item.unit.toLowerCase()}s ({item.bottles} btls)
                        </span>
                      </div>
                      <button
                        onClick={() => setBasket(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  Basket is empty. Select products on the left.
                </div>
              )}
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Reason for Request <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Counter replenishment, Running low..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Quick reason chips */}
              <div className="flex flex-wrap gap-1.5">
                {quickReasons.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {r}
                  </button>
                ))}
              </div>

              <button
                disabled={!basket.length}
                onClick={handleOpenPreview}
                className="w-full rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-40 transition-colors cursor-pointer"
              >
                Preview & Submit Request ({basket.reduce((s, b) => s + b.bottles, 0)} btls)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBMISSION PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-start justify-between border-b pb-3 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                  Step 2 of 2: Confirm Indent
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Stock Request Preview
                </h3>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Destination</span>
                <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                  {currentUser?.counter === 'AC' ? 'AC Counter' : 'Normal Counter'}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Shift Date</span>
                <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5 font-mono">
                  {businessDate}
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-amber-50/70 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 border border-amber-200/70 dark:border-amber-900/50">
              <span className="font-bold">Reason:</span> {reason.trim() || 'Counter replenishment (default)'}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-800/80 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 flex justify-between">
                <span>Requested Items ({basket.length})</span>
                <span>Quantity</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                {basket.map((item, idx) => (
                  <div key={idx} className="p-3 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{item.name} {item.sizeML}ml</div>
                      <span className="text-[11px] text-slate-500">{item.qty} {item.unit.toLowerCase()}(s) · {item.casePack}/case</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                        {item.bottles} btls
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/80 px-3 py-2.5 text-xs font-bold flex justify-between items-center border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300">TOTAL STOCK TO INDENT:</span>
                <span className="font-mono text-base font-black text-slate-900 dark:text-white">
                  {basket.reduce((s, b) => s + b.bottles, 0)} bottles
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowPreviewModal(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                ← Back / Edit Items
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmSubmitRequest}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Submitting...</span>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirm & Submit to Godown</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Requests History List */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          {isAdmin ? 'All Counter Requests' : 'My Requests History'}
        </h2>

        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 font-bold uppercase text-[10px] text-slate-600 dark:text-slate-400">
                  <th className="py-3 px-4">Date</th>
                  {isAdmin && <th className="py-3 px-4">Counter</th>}
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Requested Qty</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {requests.map(r => (
                  <tr key={r.requestId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-semibold">{r.date}</td>
                    {isAdmin && (
                      <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        {r.counter === 'NORMAL' ? 'Normal Counter' : 'AC Counter'}
                      </td>
                    )}
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{r.productName}</td>
                    <td className="py-3 px-4 font-mono font-bold">
                      {r.enteredQty} {r.unit.toLowerCase()} ({r.qty} btls)
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{r.reason}</td>
                    <td className="py-3 px-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        r.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : r.status === 'Pending'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">{r.remark || '—'}</td>
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
