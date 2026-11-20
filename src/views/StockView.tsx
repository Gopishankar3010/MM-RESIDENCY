import React, { useState } from 'react';
import { useStock } from '../context/StockContext';
import { StockItem } from '../types';
import { Search, Printer, X, Filter, Edit3, CheckCircle2, AlertCircle } from 'lucide-react';
import { CATEGORY_ORDER, sortProductsCategoryWise } from '../data/initialData';

export const StockView: React.FC = () => {
  const { stockItems, currentUser, adminAdjustStock } = useStock();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [showAllStocks, setShowAllStocks] = useState(false);

  // Admin Edit Stock Modal state
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [editGodown, setEditGodown] = useState('0');
  const [editNormal, setEditNormal] = useState('0');
  const [editAc, setEditAc] = useState('0');
  const [editReason, setEditReason] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const visibleBaseItems = showAllStocks
    ? stockItems
    : stockItems.filter(i => i.godown + i.normal + i.ac > 0);

  const categories = Array.from(new Set(visibleBaseItems.map(i => i.category || 'Others'))).sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a);
    const ib = CATEGORY_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    return a.localeCompare(b);
  });

  const filtered = sortProductsCategoryWise(
    visibleBaseItems.filter(item => {
      const matchesCat = !selectedCat || item.category === selectedCat;
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || (item.name + ' ' + item.category + ' ' + item.sizeML).toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    })
  );

  const groupedStock = categories
    .map(cat => ({
      category: cat,
      items: filtered.filter(i => (i.category || 'Others') === cat)
    }))
    .filter(g => g.items.length > 0);

  const totals = filtered.reduce(
    (acc, i) => {
      acc.godown += i.godown;
      acc.normal += i.normal;
      acc.ac += i.ac;
      return acc;
    },
    { godown: 0, normal: 0, ac: 0 }
  );

  const formatQty = (totalQty: number, casePack: number) => {
    const pack = Math.max(1, casePack || 1);
    const cases = Math.floor(totalQty / pack);
    const bottles = totalQty % pack;
    return (
      <div>
        <span className="font-mono font-bold text-slate-900 dark:text-white">
          {cases} {cases === 1 ? 'case' : 'cases'}
        </span>
        <small className="block text-[11px] text-slate-500 dark:text-slate-400">
          {bottles} btls · {totalQty} total
        </small>
      </div>
    );
  };

  const formatBreakdown = (valStr: string, casePack: number) => {
    const qty = Math.max(0, Math.floor(Number(valStr) || 0));
    const pack = Math.max(1, casePack || 1);
    const cases = Math.floor(qty / pack);
    const btls = qty % pack;
    return `${cases} ${cases === 1 ? 'case' : 'cases'} + ${btls} btls`;
  };

  const openEditModal = (item: StockItem) => {
    setEditingItem(item);
    setEditGodown(String(item.godown));
    setEditNormal(String(item.normal));
    setEditAc(String(item.ac));
    setEditReason('');
    setStatusMsg(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const g = Math.floor(Number(editGodown));
    const n = Math.floor(Number(editNormal));
    const a = Math.floor(Number(editAc));

    if (Number.isNaN(g) || Number.isNaN(n) || Number.isNaN(a) || g < 0 || n < 0 || a < 0) {
      setStatusMsg({ type: 'err', text: 'Stock quantities must be 0 or positive whole bottle counts.' });
      return;
    }

    try {
      setSavingEdit(true);
      await adminAdjustStock({
        productId: editingItem.productId,
        godown: g,
        normal: n,
        ac: a,
        reason: editReason
      });
      setStatusMsg({
        type: 'ok',
        text: `Updated stock for ${editingItem.name} ${editingItem.sizeML}ml (Godown: ${g}, Normal: ${n}, AC: ${a}).`
      });
      setEditingItem(null);
    } catch (err: any) {
      setStatusMsg({ type: 'err', text: err?.message || 'Failed to update stock.' });
    } finally {
      setSavingEdit(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => '₹' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const tableColSpan = isAdmin ? 9 : 8;

  return (
    <div className="print-surface space-y-5">
      {/* Printable Area Header (shown only in print mode) */}
      <div className="print-header text-center">
        <h1 className="text-xl font-black tracking-tight">MM RESIDENCY – INVENTORY & BAR MANAGEMENT</h1>
        <h2 className="text-sm font-bold uppercase tracking-wider mt-1">CURRENT PHYSICAL STOCK REPORT</h2>
        <div className="text-xs text-slate-600 mt-1">
          Printed: {new Date().toLocaleString('en-IN')} · Filter: {selectedCat || 'All Categories'} · View: {showAllStocks ? 'All Stocks' : 'Available Stock Only'} {search ? `· Query: "${search}"` : ''}
        </div>
      </div>

      {/* Screen Header */}
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[11px] font-extrabold tracking-widest text-amber-600 dark:text-amber-400 uppercase">
            Inventory Central
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Current Stock Position
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time balance breakdown across Central Godown, Normal Counter, and AC Counter
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 transition-colors cursor-pointer"
        >
          <Printer className="h-4 w-4" />
          <span>Print Stock Report</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {statusMsg && !editingItem && (
        <div
          className={`no-print flex items-center justify-between gap-3 rounded-xl border p-3 text-xs font-medium ${
            statusMsg.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800/60 dark:bg-red-950/30 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'ok' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="no-print rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by brand name, category, or bottle size (ml)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={selectedCat}
                onChange={e => setSelectedCat(e.target.value)}
                className="bg-transparent font-medium text-xs outline-none cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors">
              <input
                type="checkbox"
                checked={showAllStocks}
                onChange={e => setShowAllStocks(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <span>Show All Stocks</span>
            </label>

            {(search || selectedCat || showAllStocks) && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedCat('');
                  setShowAllStocks(false);
                }}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
          Showing {filtered.length} of {visibleBaseItems.length} {showAllStocks ? 'total' : 'available'} products{!showAllStocks ? ` (${stockItems.length} total in catalogue)` : ''}
        </div>
      </div>

      {/* Stock Table */}
      <div className="print-card rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="print-table-wrap overflow-x-auto">
          <table className="print-table w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Product Name & Size</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Pack Ratio</th>
                <th className="py-3 px-4 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300">
                  Godown Central
                </th>
                <th className="py-3 px-4 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300">
                  Normal Counter
                </th>
                <th className="py-3 px-4 bg-purple-50/50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-300">
                  AC Counter
                </th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                {isAdmin && <th className="no-print py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {groupedStock.length === 0 ? (
                <tr>
                  <td colSpan={tableColSpan} className="py-10 px-4 text-center text-xs text-slate-500 dark:text-slate-400">
                    {showAllStocks
                      ? 'No products match your current filter.'
                      : 'No products currently in stock match your filter. Tick "Show All Stocks" to view 0-stock items.'}
                  </td>
                </tr>
              ) : (() => {
                let runningIdx = 0;
                return groupedStock.map(group => (
                  <React.Fragment key={group.category}>
                    <tr className="bg-slate-100/90 dark:bg-slate-800/80 border-y border-slate-200 dark:border-slate-700">
                      <td colSpan={tableColSpan} className="py-2 px-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-amber-400">
                            {group.category}
                          </span>
                          <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                            {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {group.items.map(item => {
                      runningIdx += 1;
                      const isOutOfStock = item.godown + item.normal + item.ac === 0;

                      return (
                        <tr
                          key={item.productId}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                            isOutOfStock ? 'opacity-60 bg-red-50/30 dark:bg-red-950/10' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{runningIdx}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                            <span className="text-[11px] text-slate-500 font-mono">{item.sizeML} ml</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                            {item.casePack}/case
                          </td>
                          <td className="py-3 px-4 bg-blue-50/30 dark:bg-blue-950/10">
                            {formatQty(item.godown, item.casePack)}
                          </td>
                          <td className="py-3 px-4 bg-emerald-50/30 dark:bg-emerald-950/10">
                            {formatQty(item.normal, item.casePack)}
                          </td>
                          <td className="py-3 px-4 bg-purple-50/30 dark:bg-purple-950/10">
                            {formatQty(item.ac, item.casePack)}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 text-right dark:text-white">
                            {formatCurrency(item.price)}
                          </td>
                          {isAdmin && (
                            <td className="no-print py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/60 transition-colors cursor-pointer"
                              >
                                <Edit3 className="h-3 w-3" />
                                <span>Edit Stock</span>
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ));
              })()}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 font-bold text-slate-900 dark:text-white">
                <td colSpan={4} className="py-3 px-4 text-right uppercase text-[11px] tracking-wider">
                  Total Bottles Across {filtered.length} Products:
                </td>
                <td className="py-3 px-4 font-mono text-blue-700 dark:text-blue-400">
                  {totals.godown} bottles
                </td>
                <td className="py-3 px-4 font-mono text-emerald-700 dark:text-emerald-400">
                  {totals.normal} bottles
                </td>
                <td className="py-3 px-4 font-mono text-purple-700 dark:text-purple-400">
                  {totals.ac} bottles
                </td>
                <td className="py-3 px-4 text-right font-mono text-amber-700 dark:text-amber-400">
                  Total: {totals.godown + totals.normal + totals.ac} btls
                </td>
                {isAdmin && <td className="no-print py-3 px-4" />}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Admin Edit Stock Modal */}
      {isAdmin && editingItem && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                  Admin Stock Override
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingItem.name} ({editingItem.sizeML} ml)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {editingItem.category} · {editingItem.casePack} btls/case · Selling Price: {formatCurrency(editingItem.price)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {statusMsg && (
              <div
                className={`mt-3 flex items-center gap-2 rounded-lg border p-2.5 text-xs ${
                  statusMsg.type === 'err'
                    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{statusMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3.5">
              <div>
                <label className="mb-1 flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-300">
                  <span>Godown Central (Total Bottles)</span>
                  <span className="font-mono text-[11px] font-normal text-slate-500 dark:text-slate-400">
                    {formatBreakdown(editGodown, editingItem.casePack)}
                  </span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={editGodown}
                  onChange={e => setEditGodown(e.target.value)}
                  className="w-full rounded-lg border border-blue-200 bg-blue-50/30 px-3 py-2 font-mono text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="mb-1 flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  <span>Normal Counter (Total Bottles)</span>
                  <span className="font-mono text-[11px] font-normal text-slate-500 dark:text-slate-400">
                    {formatBreakdown(editNormal, editingItem.casePack)}
                  </span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={editNormal}
                  onChange={e => setEditNormal(e.target.value)}
                  className="w-full rounded-lg border border-emerald-200 bg-emerald-50/30 px-3 py-2 font-mono text-sm font-bold text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="mb-1 flex items-center justify-between text-xs font-bold text-purple-900 dark:text-purple-300">
                  <span>AC Counter (Total Bottles)</span>
                  <span className="font-mono text-[11px] font-normal text-slate-500 dark:text-slate-400">
                    {formatBreakdown(editAc, editingItem.casePack)}
                  </span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={editAc}
                  onChange={e => setEditAc(e.target.value)}
                  className="w-full rounded-lg border border-purple-200 bg-purple-50/30 px-3 py-2 font-mono text-sm font-bold text-slate-900 focus:border-purple-500 focus:outline-none dark:border-purple-900/60 dark:bg-purple-950/20 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Adjustment Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Opening physical count verification"
                  value={editReason}
                  onChange={e => setEditReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-xs hover:bg-amber-400 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {savingEdit ? 'Saving...' : 'Save Stock Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
