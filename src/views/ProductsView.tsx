import React, { useState } from 'react';
import { useStock } from '../context/StockContext';
import { Package, Search, Plus, Edit2, Check, X, Filter } from 'lucide-react';
import { Product } from '../types';
import { bottlesPerCase_ } from '../data/initialData';

export const ProductsView: React.FC = () => {
  const { currentUser, products, saveProduct } = useStock();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Edit / Add modal
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const categories = Array.from(new Set(products.map(p => p.category || 'Other'))).sort();

  const filtered = products.filter(p => {
    const matchesCat = !categoryFilter || p.category === categoryFilter;
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? p.active
        : !p.active;
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || (p.name + ' ' + p.category + ' ' + p.sizeML).toLowerCase().includes(q);
    return matchesCat && matchesStatus && matchesSearch;
  });

  const formatCurrency = (val: number) => '₹' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      setStatusMsg(null);
      if (!editingProduct.name?.trim()) throw new Error('Product name is required.');
      if (!editingProduct.category?.trim()) throw new Error('Category is required.');
      if (!editingProduct.sizeML || editingProduct.sizeML <= 0) throw new Error('Size (ml) must be greater than 0.');
      if (!editingProduct.sellingPrice || editingProduct.sellingPrice < 0) throw new Error('Selling price must be valid.');

      const pid = await saveProduct({
        productId: editingProduct.productId,
        name: editingProduct.name.trim(),
        category: editingProduct.category.trim(),
        sizeML: Number(editingProduct.sizeML),
        casePack: Number(editingProduct.casePack) || 12,
        sellingPrice: Number(editingProduct.sellingPrice),
        active: editingProduct.active ?? true
      });

      setStatusMsg({ type: 'ok', text: `Product ${editingProduct.name} saved successfully!` });
      setEditingProduct(null);
    } catch (err: any) {
      setStatusMsg({ type: 'err', text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-[11px] font-extrabold tracking-widest text-amber-600 dark:text-amber-400 uppercase">
            Catalogue Management
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Products & Bottle Pricing
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define beverage master specifications, bottle pack ratios, selling prices (MRP), and active flags
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setEditingProduct({ name: '', category: 'Beer', sizeML: 650, casePack: 12, sellingPrice: 200, active: true })}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Product</span>
          </button>
        )}
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

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search product name, category, or bottle size..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 font-bold uppercase text-[10px] text-slate-600 dark:text-slate-400">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Bottle Size</th>
                <th className="py-3 px-4">Bottles / Case</th>
                <th className="py-3 px-4 text-right">Selling MRP</th>
                <th className="py-3 px-4">Status</th>
                {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((p, idx) => (
                <tr key={p.productId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                    <span className="text-[10px] font-mono text-slate-400">{p.productId}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {p.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                    {p.sizeML} ml
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                    {bottlesPerCase_(p)} / case
                  </td>
                  <td className="py-3 px-4 font-mono font-black text-right text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(p.sellingPrice)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      p.active
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                    }`}>
                      {p.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setEditingProduct({ ...p })}
                        className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT / CREATE PRODUCT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {editingProduct.productId ? 'Edit Product Details' : 'Add New Beverage'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kingfisher Ultra Max"
                  value={editingProduct.name || ''}
                  onChange={e => setEditingProduct(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 p-2 font-bold dark:bg-slate-800 dark:text-white dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    placeholder="Beer, Brandy, Whisky..."
                    value={editingProduct.category || ''}
                    onChange={e => setEditingProduct(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 p-2 dark:bg-slate-800 dark:text-white dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Size (ml) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 650"
                    value={editingProduct.sizeML || ''}
                    onChange={e => setEditingProduct(prev => ({ ...prev, sizeML: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-slate-300 p-2 font-mono dark:bg-slate-800 dark:text-white dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Bottles / Case *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="12"
                    value={editingProduct.casePack || ''}
                    onChange={e => setEditingProduct(prev => ({ ...prev, casePack: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-slate-300 p-2 font-mono dark:bg-slate-800 dark:text-white dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Selling MRP (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="e.g. 210.00"
                    value={editingProduct.sellingPrice || ''}
                    onChange={e => setEditingProduct(prev => ({ ...prev, sellingPrice: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-slate-300 p-2 font-mono font-bold dark:bg-slate-800 dark:text-white dark:border-slate-700"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={editingProduct.active ?? true}
                  onChange={e => setEditingProduct(prev => ({ ...prev, active: e.target.checked }))}
                  className="rounded border-slate-300"
                />
                <span className="font-semibold">Active in counter sales and Godown indents</span>
              </label>

              <div className="flex justify-end gap-2 pt-4 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
