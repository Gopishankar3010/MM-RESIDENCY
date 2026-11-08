import React, { useState } from 'react';
import { useStock } from '../context/StockContext';
import { Search, Printer, X, Filter } from 'lucide-react';

export const StockView: React.FC = () => {
  const { stockItems } = useStock();
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');

  const categories = Array.from(new Set(stockItems.map(i => i.category || 'Other'))).sort();

  const filtered = stockItems.filter(item => {
    const matchesCat = !selectedCat || item.category === selectedCat;
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || (item.name + ' ' + item.category + ' ' + item.sizeML).toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

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

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => '₹' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-5">
      {/* Printable Area Header (shown only in print mode) */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold">MM RESIDENCY – INVENTORY & BAR MANAGEMENT</h1>
        <h2 className="text-sm font-semibold">CURRENT PHYSICAL STOCK REPORT</h2>
        <div className="text-xs text-slate-600 mt-1">
          Printed: {new Date().toLocaleString('en-IN')} · Filter: {selectedCat || 'All Categories'} {search ? `· Query: "${search}"` : ''}
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
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 transition-colors"
        >
          <Printer className="h-4 w-4" />
          <span>Print Stock Report</span>
        </button>
      </div>

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

          <div className="flex items-center gap-2">
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

            {(search || selectedCat) && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedCat('');
                }}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
          Showing {filtered.length} of {stockItems.length} products
        </div>
      </div>

      {/* Stock Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filtered.map((item, idx) => {
                const isOutOfStock = item.godown + item.normal + item.ac === 0;

                return (
                  <tr
                    key={item.productId}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      isOutOfStock ? 'opacity-60 bg-red-50/30 dark:bg-red-950/10' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
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
                  </tr>
                );
              })}
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
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
