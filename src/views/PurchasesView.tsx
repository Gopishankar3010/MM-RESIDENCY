import React, { useState } from 'react';
import { useStock } from '../context/StockContext';
import { Truck, Plus, Trash2, Edit2, PlusCircle, Check } from 'lucide-react';
import { bottlesPerCase_, stockQtyLabel } from '../data/initialData';

interface PurchaseInputRow {
  productId: string;
  unit: 'CASE' | 'BOTTLE';
  enteredQty: string;
  enteredPrice: string;
  sedAmt: string;
}

export const PurchasesView: React.FC = () => {
  const {
    currentUser,
    businessDate,
    products,
    purchases,
    suppliers,
    submitPurchaseBatch,
    addSupplier,
    editPurchaseRecord
  } = useStock();

  const isAdmin = currentUser?.role === 'ADMIN';

  // Form State
  const [supplier, setSupplier] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(businessDate);
  const [billDate, setBillDate] = useState(businessDate);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [permitNumber, setPermitNumber] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [discountTotal, setDiscountTotal] = useState('0');
  const [tcsPct, setTcsPct] = useState('2'); // default 2% TCS
  const [rows, setRows] = useState<PurchaseInputRow[]>([
    { productId: '', unit: 'CASE', enteredQty: '', enteredPrice: '', sedAmt: '0' },
    { productId: '', unit: 'CASE', enteredQty: '', enteredPrice: '', sedAmt: '0' }
  ]);

  // Supplier modal
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');

  // Edit modal
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const formatCurrency = (val: number) => '₹' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm font-bold text-red-900">
        Administrative permission required to manage stock purchases.
      </div>
    );
  }

  // Row calculations
  const productMap = new Map(products.map(p => [p.productId, p]));
  let grossSum = 0;
  let totalBottles = 0;

  const rowCalcs = rows.map(r => {
    const prod = productMap.get(r.productId);
    const pack = prod ? bottlesPerCase_(prod) : 1;
    const qty = Number(r.enteredQty) || 0;
    const price = Number(r.enteredPrice) || 0;
    const itemGross = qty * price;
    const btls = r.unit === 'CASE' ? qty * pack : qty;
    grossSum += itemGross;
    totalBottles += btls;

    return {
      ...r,
      pack,
      itemGross,
      bottles: btls,
      ratePerBottle: r.unit === 'CASE' ? (pack > 0 ? price / pack : price) : price
    };
  });

  const parsedDisc = Number(discountTotal) || 0;
  const parsedTcsPct = Number(tcsPct) || 0;
  let totalSed = 0;
  let netSum = 0;

  const finalRows = rowCalcs.map(r => {
    const sed = Number(r.sedAmt) || 0;
    totalSed += sed;
    const share = grossSum > 0 ? r.itemGross / grossSum : 0;
    const itemDisc = Math.round(parsedDisc * share * 100) / 100;
    const taxable = Math.max(0, r.itemGross + sed - itemDisc);
    const tcs = Math.round(taxable * (parsedTcsPct / 100) * 100) / 100;
    const net = Math.round((taxable + tcs) * 100) / 100;
    netSum += net;

    return {
      ...r,
      sed,
      itemDisc,
      tcs,
      net
    };
  });

  const [showPurchasePreview, setShowPurchasePreview] = useState(false);
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);

  const handleOpenPurchasePreview = () => {
    setStatusMsg(null);
    if (!supplier) {
      setStatusMsg({ type: 'err', text: 'Please select a supplier.' });
      return;
    }
    if (!invoiceNo.trim()) {
      setStatusMsg({ type: 'err', text: 'Please enter the invoice number.' });
      return;
    }
    if (!permitNumber.trim()) {
      setStatusMsg({ type: 'err', text: 'Please enter the permit number.' });
      return;
    }
    if (!documentNumber.trim()) {
      setStatusMsg({ type: 'err', text: 'Please enter the document number.' });
      return;
    }

    const validLines = rows.filter(r => r.productId && Number(r.enteredQty) > 0 && Number(r.enteredPrice) > 0);
    if (!validLines.length) {
      setStatusMsg({ type: 'err', text: 'Add at least one item with valid quantity and price.' });
      return;
    }

    setShowPurchasePreview(true);
  };

  const handleConfirmSubmitBatch = async () => {
    try {
      setIsSubmittingPurchase(true);
      setStatusMsg(null);
      if (!supplier) throw new Error('Please select a supplier.');
      if (!invoiceNo.trim()) throw new Error('Please enter the invoice number.');
      if (!permitNumber.trim()) throw new Error('Please enter the permit number.');
      if (!documentNumber.trim()) throw new Error('Please enter the document number.');

      const validLines = rows.filter(r => r.productId && Number(r.enteredQty) > 0 && Number(r.enteredPrice) > 0);
      if (!validLines.length) throw new Error('Add at least one item with valid quantity and price.');

      const linesToSubmit = finalRows
        .filter(r => r.productId && Number(r.enteredQty) > 0 && Number(r.enteredPrice) > 0)
        .map(r => ({
          productId: r.productId,
          qty: r.bottles,
          enteredQty: Number(r.enteredQty),
          unit: r.unit,
          rate: r.ratePerBottle,
          sedAmt: r.sed,
          discountAmt: r.itemDisc,
          tcsPct: parsedTcsPct
        }));

      const batchId = await submitPurchaseBatch({
        supplier,
        date: purchaseDate,
        billDate,
        invoiceNo: invoiceNo.trim(),
        permitNumber: permitNumber.trim(),
        documentNumber: documentNumber.trim(),
        lines: linesToSubmit
      });

      setShowPurchasePreview(false);
      setStatusMsg({
        type: 'ok',
        text: `Purchase batch ${batchId} submitted successfully for ₹${netSum.toLocaleString('en-IN')}. Awaiting approval to credit Godown stock.`
      });

      setRows([
        { productId: '', unit: 'CASE', enteredQty: '', enteredPrice: '', sedAmt: '0' },
        { productId: '', unit: 'CASE', enteredQty: '', enteredPrice: '', sedAmt: '0' }
      ]);
      setInvoiceNo('');
      setDiscountTotal('0');
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: e.message });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[11px] font-extrabold tracking-widest text-amber-600 dark:text-amber-400 uppercase">
          Supply Chain & Procurement
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Stock Purchases
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Record supplier invoices, case lots, SED duty, discounts, and TCS into Central Godown
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

      {/* Purchase Entry Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Truck className="h-4 w-4 text-blue-600" />
          <span>New Supplier Purchase Invoice</span>
        </h2>

        {/* Bill Metadata Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Purchase Date *</label>
            <input
              type="date"
              value={purchaseDate}
              onChange={e => setPurchaseDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono dark:bg-slate-800 dark:text-white dark:border-slate-700"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Bill / Invoice Date *</label>
            <input
              type="date"
              value={billDate}
              onChange={e => setBillDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono dark:bg-slate-800 dark:text-white dark:border-slate-700"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Invoice Number *</label>
            <input
              type="text"
              placeholder="e.g. INV/2026/0991"
              value={invoiceNo}
              onChange={e => setInvoiceNo(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 dark:bg-slate-800 dark:text-white dark:border-slate-700 font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Permit Number *</label>
            <input
              type="text"
              placeholder="e.g. PRM-TN-8821"
              value={permitNumber}
              onChange={e => setPermitNumber(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 dark:bg-slate-800 dark:text-white dark:border-slate-700"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Document Number *</label>
            <input
              type="text"
              placeholder="e.g. DOC-4412"
              value={documentNumber}
              onChange={e => setDocumentNumber(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 dark:bg-slate-800 dark:text-white dark:border-slate-700"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-500">Supplier *</label>
              <button
                type="button"
                onClick={() => setShowAddSupplierModal(true)}
                className="text-[10px] text-amber-600 font-bold hover:underline"
              >
                + New
              </button>
            </div>
            <select
              value={supplier}
              onChange={e => setSupplier(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 font-semibold dark:bg-slate-800 dark:text-white dark:border-slate-700"
            >
              <option value="">Select supplier...</option>
              {suppliers.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Taxes & Bill Adjustments */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-200 dark:bg-slate-800/40 dark:border-slate-700">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Bill Discount Amount (₹) (Distributed proportionally across rows)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={discountTotal}
              onChange={e => setDiscountTotal(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-2 font-mono font-bold dark:bg-slate-900 dark:text-white dark:border-slate-700"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              TCS % (Added to Payable Net Amount)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={tcsPct}
              onChange={e => setTcsPct(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-2 font-mono font-bold dark:bg-slate-900 dark:text-white dark:border-slate-700"
            />
          </div>
        </div>

        {/* Lines Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">Product Name</th>
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-3 w-24">Qty</th>
                <th className="py-2.5 px-3">Pack</th>
                <th className="py-2.5 px-3 w-28">Price / Unit (₹)</th>
                <th className="py-2.5 px-3 w-24">SED Duty (₹)</th>
                <th className="py-2.5 px-3 text-right">Gross (₹)</th>
                <th className="py-2.5 px-3 text-right">Net Payable (₹)</th>
                <th className="py-2.5 px-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {finalRows.map((r, idx) => (
                <tr key={idx}>
                  <td className="py-2 px-3">
                    <select
                      value={r.productId}
                      onChange={e => {
                        const val = e.target.value;
                        setRows(prev => prev.map((row, i) => i === idx ? { ...row, productId: val } : row));
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-semibold dark:bg-slate-800 dark:text-white dark:border-slate-700"
                    >
                      <option value="">Choose product...</option>
                      {products.filter(p => p.active).map(p => (
                        <option key={p.productId} value={p.productId}>
                          {p.name} {p.sizeML}ml ({bottlesPerCase_(p)}/case)
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="py-2 px-3">
                    <select
                      value={r.unit}
                      onChange={e => {
                        const val = e.target.value as 'CASE' | 'BOTTLE';
                        setRows(prev => prev.map((row, i) => i === idx ? { ...row, unit: val } : row));
                      }}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-semibold dark:bg-slate-800 dark:text-white dark:border-slate-700"
                    >
                      <option value="CASE">Case</option>
                      <option value="BOTTLE">Bottle</option>
                    </select>
                  </td>

                  <td className="py-2 px-3">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="0"
                      value={r.enteredQty}
                      onChange={e => {
                        const val = e.target.value;
                        setRows(prev => prev.map((row, i) => i === idx ? { ...row, enteredQty: val } : row));
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono font-bold dark:bg-slate-800 dark:text-white dark:border-slate-700"
                    />
                  </td>

                  <td className="py-2 px-3 font-mono text-slate-500">
                    {r.pack}/case
                  </td>

                  <td className="py-2 px-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Price"
                      value={r.enteredPrice}
                      onChange={e => {
                        const val = e.target.value;
                        setRows(prev => prev.map((row, i) => i === idx ? { ...row, enteredPrice: val } : row));
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono font-bold dark:bg-slate-800 dark:text-white dark:border-slate-700"
                    />
                  </td>

                  <td className="py-2 px-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={r.sedAmt}
                      onChange={e => {
                        const val = e.target.value;
                        setRows(prev => prev.map((row, i) => i === idx ? { ...row, sedAmt: val } : row));
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono dark:bg-slate-800 dark:text-white dark:border-slate-700"
                    />
                  </td>

                  <td className="py-2 px-3 text-right font-mono font-bold">
                    {formatCurrency(r.itemGross)}
                  </td>

                  <td className="py-2 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(r.net)}
                  </td>

                  <td className="py-2 px-3 text-center">
                    {rows.length > 1 && (
                      <button
                        onClick={() => setRows(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setRows(prev => [...prev, { productId: '', unit: 'CASE', enteredQty: '', enteredPrice: '', sedAmt: '0' }])}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Add Row</span>
          </button>

          <button
            onClick={() => {
              for (let i = 0; i < 5; i++) {
                setRows(prev => [...prev, { productId: '', unit: 'CASE', enteredQty: '', enteredPrice: '', sedAmt: '0' }]);
              }
            }}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold"
          >
            + Add 5 Rows
          </button>
        </div>

        {/* Summary Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="text-xs space-y-1">
            <span className="font-semibold text-slate-600 dark:text-slate-400">
              Total: <strong>{totalBottles} bottles</strong> across {rows.filter(r => r.productId).length} items
            </span>
            <div className="text-[11px] text-slate-500">
              Gross: {formatCurrency(grossSum)} · SED: +{formatCurrency(totalSed)} · Disc: -{formatCurrency(parsedDisc)} · TCS: +{formatCurrency(finalRows.reduce((s, r) => s + r.tcs, 0))}
            </div>
          </div>

          <button
            disabled={!supplier || !invoiceNo.trim() || netSum <= 0}
            onClick={handleOpenPurchasePreview}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <Check className="h-4 w-4" />
            <span>Preview & Submit Batch ({formatCurrency(netSum)})</span>
          </button>
        </div>
      </div>

      {/* Historical Purchases Log */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Purchase History Records
        </h2>

        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 font-bold uppercase text-[10px] text-slate-600 dark:text-slate-400">
                  <th className="py-3 px-4">Purchase Date</th>
                  <th className="py-3 px-4">Bill Date</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Items / Total Qty</th>
                  <th className="py-3 px-4 text-right">Net Payable</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {purchases.map(p => (
                  <tr key={p.batchId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-semibold">{p.date}</td>
                    <td className="py-3 px-4 font-mono">{p.billDate}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{p.supplier}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">{p.invoiceNo}</td>
                    <td className="py-3 px-4 font-mono">
                      {p.lines.length} items · {p.totalQty} btls
                    </td>
                    <td className="py-3 px-4 font-mono font-black text-right text-emerald-600">
                      {formatCurrency(p.netTotal)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        p.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : p.status === 'Pending'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-[11px] text-slate-500 font-mono">
                        {p.batchId}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* POPUP: Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Add New Supplier / Distributor
            </h3>
            <p className="text-xs text-slate-500">
              Enter the corporate or agency name of the beverage manufacturer or distributor.
            </p>

            <input
              type="text"
              placeholder="e.g. Som Distilleries & Breweries Ltd"
              value={newSupplierName}
              onChange={e => setNewSupplierName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-amber-500 dark:bg-slate-800 dark:text-white dark:border-slate-700"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddSupplierModal(false)}
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                disabled={!newSupplierName.trim()}
                onClick={async () => {
                  await addSupplier(newSupplierName.trim());
                  setSupplier(newSupplierName.trim());
                  setNewSupplierName('');
                  setShowAddSupplierModal(false);
                }}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                Add Supplier
              </button>
            </div>
          </div>
        </div>
      )}
      {/* PURCHASE INVOICE PREVIEW MODAL */}
      {showPurchasePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b pb-3 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                  Step 2 of 2: Purchase Invoice Verification
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Purchase Batch Preview
                </h3>
                <p className="text-xs text-slate-500">
                  Verify vendor, invoice metadata, taxes, and item rates before recording into Central Godown.
                </p>
              </div>
              <button
                onClick={() => setShowPurchasePreview(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Supplier</span>
                <div className="font-bold text-slate-900 dark:text-white truncate mt-0.5">{supplier}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Invoice & Date</span>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">#{invoiceNo} · {billDate}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Permit No</span>
                <div className="font-bold text-slate-900 dark:text-white truncate mt-0.5">{permitNumber}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Document No</span>
                <div className="font-bold text-slate-900 dark:text-white truncate mt-0.5">{documentNumber}</div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-800/80 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 flex justify-between">
                <span>Products to Credit Godown</span>
                <span>Qty · Rate · Net</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                {finalRows.filter(r => r.productId && Number(r.enteredQty) > 0 && Number(r.enteredPrice) > 0).map((r, i) => {
                  const prod = productMap.get(r.productId);
                  return (
                    <div key={i} className="p-3 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{prod?.name || 'Product'} {prod?.sizeML}ml</div>
                        <span className="text-[11px] text-slate-500">
                          {r.enteredQty} {r.unit.toLowerCase()}(s) = {r.bottles} bottles @ {formatCurrency(r.ratePerBottle)}/btl
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(r.net)}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Gross: {formatCurrency(r.itemGross)} {r.sed > 0 ? `· SED: +${formatCurrency(r.sed)}` : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl bg-emerald-50/70 p-3.5 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-600 dark:text-slate-400">Total Purchase Volume:</span>
                <strong className="ml-1 font-mono text-slate-900 dark:text-white">{totalBottles} bottles</strong>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-600 dark:text-slate-400">Total Net Payable:</span>
                <span className="font-mono text-lg font-black text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(netSum)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isSubmittingPurchase}
                onClick={() => setShowPurchasePreview(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                ← Back / Edit Invoice
              </button>
              <button
                type="button"
                disabled={isSubmittingPurchase}
                onClick={handleConfirmSubmitBatch}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSubmittingPurchase ? 'Submitting...' : 'Confirm & Submit to Godown'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
