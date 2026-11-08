import React, { useState } from 'react';
import { useStock } from '../context/StockContext';
import { AlertTriangle, Search, CheckCircle } from 'lucide-react';
import { StockLocation } from '../types';
import { bottlesPerCase_, stockQtyLabel } from '../data/initialData';

export const DamageView: React.FC = () => {
  const { currentUser, businessDate, stockItems, operations, saveDailyOperation } = useStock();
  const isAdmin = currentUser?.role === 'ADMIN';

  const defaultLoc: StockLocation = isAdmin ? 'GODOWN' : (currentUser?.counter || 'NORMAL');
  const [location, setLocation] = useState<StockLocation>(defaultLoc);
  const [search, setSearch] = useState('');
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const locKey = location.toLowerCase() as 'godown' | 'normal' | 'ac';
  const availableProducts = stockItems.filter(p => p[locKey] > 0);
  const selectedProduct = stockItems.find(p => p.productId === productId);
  const pack = selectedProduct ? bottlesPerCase_(selectedProduct) : 1;
  const currentAvailable = selectedProduct ? selectedProduct[locKey] : 0;

  // Search filter
  const searchResults = search.trim()
    ? availableProducts.filter(p => (p.name + ' ' + p.category).toLowerCase().includes(search.trim().toLowerCase())).slice(0, 8)
    : [];

  const handleRecordDamage = async () => {
    try {
      setStatusMsg(null);
      if (!selectedProduct) throw new Error('Please choose a damaged product.');
      const numQty = Number(qty);
      if (!numQty || numQty <= 0 || !Number.isInteger(numQty)) {
        throw new Error('Damaged quantity must be a positive whole number.');
      }
      if (numQty > currentAvailable) {
        throw new Error(`Damaged quantity (${numQty}) exceeds available stock at ${location} (${currentAvailable} btls).`);
      }
      if (!reason.trim()) {
        throw new Error('Enter a damage reason (e.g. broken in transit, leakage, seal damaged).');
      }

      await saveDailyOperation({
        type: 'DAMAGE',
        date: businessDate,
        name: reason.trim(),
        amount: 0,
        location,
        productId,
        qty: numQty
      });

      setStatusMsg({
        type: 'ok',
        text: `Deducted ${numQty} damaged bottle(s) of ${selectedProduct.name} from ${location} stock.`
      });

      setQty('');
      setReason('');
      setProductId('');
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: e.message });
    }
  };

  const damageEntries = operations.filter(o => o.type === 'DAMAGE');

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[11px] font-extrabold tracking-widest text-red-600 dark:text-red-400 uppercase">
          Loss & Breakage Control
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Damage Stock
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Record broken or leaking bottles. Stock is automatically deducted from {location} and registered in the audit ledger.
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

      {/* Damage Input Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <span>Record Damaged Bottles</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {isAdmin ? (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Stock Location
              </label>
              <select
                value={location}
                onChange={e => {
                  setLocation(e.target.value as StockLocation);
                  setProductId('');
                }}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="GODOWN">Central Godown</option>
                <option value="NORMAL">Normal Counter</option>
                <option value="AC">AC Counter</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Stock Location
              </label>
              <div className="rounded-lg border border-slate-200 bg-slate-100 p-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {currentUser?.counter === 'NORMAL' ? 'Normal Counter' : 'AC Counter'}
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Search Damaged Product
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search brand name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {searchResults.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-48 w-80 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
                {searchResults.map(p => (
                  <button
                    key={p.productId}
                    type="button"
                    onClick={() => {
                      setProductId(p.productId);
                      setSearch('');
                    }}
                    className="w-full p-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{p.name} {p.sizeML}ml</div>
                      <span className="text-[10px] text-slate-500">{p.category}</span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      {p[locKey]} btls
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Product selector dropdown */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
            Product Dropdown ({availableProducts.length} Available at {location})
          </label>
          <select
            value={productId}
            onChange={e => setProductId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">Choose product...</option>
            {availableProducts.map(p => (
              <option key={p.productId} value={p.productId}>
                {p.name} {p.sizeML}ml (In Stock: {p[locKey]} btls)
              </option>
            ))}
          </select>
        </div>

        {selectedProduct && (
          <div className="rounded-lg bg-red-50 p-3 text-xs text-red-900 dark:bg-red-950/40 dark:text-red-200 flex items-center justify-between">
            <div>
              <strong className="block text-red-950 dark:text-red-100">{selectedProduct.name} {selectedProduct.sizeML}ml</strong>
              <span>Stock at {location}: <strong>{stockQtyLabel(currentAvailable, pack)}</strong></span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-red-700 dark:text-red-300">
              {selectedProduct.category}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Damaged Quantity (Bottles) *
            </label>
            <input
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 1"
              value={qty}
              onChange={e => setQty(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-xs font-bold text-slate-800 outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Reason for Damage *
            </label>
            <input
              type="text"
              placeholder="e.g. Neck cracked during shelf handling"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-800 outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        <button
          disabled={!selectedProduct || !qty || Number(qty) <= 0 || !reason.trim()}
          onClick={handleRecordDamage}
          className="rounded-lg bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-red-700 disabled:opacity-40 transition-colors"
        >
          Deduct Damaged Stock
        </button>
      </div>

      {/* Damage Log */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Damage History Log
        </h2>

        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 font-bold uppercase text-[10px] text-slate-600 dark:text-slate-400">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Qty</th>
                  <th className="py-3 px-4">Damage Reason</th>
                  <th className="py-3 px-4">Recorded By</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {damageEntries.length > 0 ? (
                  damageEntries.map(d => (
                    <tr key={d.operationId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono">{d.date}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{d.location}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{d.productName || d.productId}</td>
                      <td className="py-3 px-4 font-mono font-bold text-red-600">{d.qty} btls</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{d.name}</td>
                      <td className="py-3 px-4 text-slate-500">{d.createdBy}</td>
                      <td className="py-3 px-4">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                      No damage recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
