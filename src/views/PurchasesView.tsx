import React, { useState, useMemo } from 'react';
import { useStock } from '../context/StockContext';
import {
  Truck,
  Plus,
  Trash2,
  Check,
  Download,
  Calendar,
  Printer,
  ArrowDownToLine,
  Filter,
  FileSpreadsheet
} from 'lucide-react';
import { bottlesPerCase_ } from '../data/initialData';

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
    addSupplier
  } = useStock();

  const isAdmin = currentUser?.role === 'ADMIN';

  // Sub-tabs: 'entry' (New Invoices & History) vs 'download' (Period Download Hub)
  const [activeSubTab, setActiveSubTab] = useState<'entry' | 'download'>('entry');

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

  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const formatCurrency = (val: number) =>
    '₹' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ==========================================
  // DOWNLOAD PURCHASES PERIOD STATE & HELPERS
  // ==========================================
  const [downloadFromDate, setDownloadFromDate] = useState<string>(() => {
    const d = new Date(businessDate);
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [downloadToDate, setDownloadToDate] = useState<string>(businessDate);
  const [downloadSupplierFilter, setDownloadSupplierFilter] = useState<string>('ALL');
  const [downloadStatusFilter, setDownloadStatusFilter] = useState<'ALL' | 'Approved' | 'Pending'>('ALL');

  const applyDownloadDatePreset = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'last30') => {
    const base = new Date(businessDate);
    if (preset === 'today') {
      setDownloadFromDate(businessDate);
      setDownloadToDate(businessDate);
    } else if (preset === 'yesterday') {
      const y = new Date(base);
      y.setDate(y.getDate() - 1);
      const str = y.toISOString().slice(0, 10);
      setDownloadFromDate(str);
      setDownloadToDate(str);
    } else if (preset === 'week') {
      const w = new Date(base);
      w.setDate(w.getDate() - 6);
      setDownloadFromDate(w.toISOString().slice(0, 10));
      setDownloadToDate(businessDate);
    } else if (preset === 'month') {
      const firstOfMonth = businessDate.slice(0, 7) + '-01';
      setDownloadFromDate(firstOfMonth);
      setDownloadToDate(businessDate);
    } else if (preset === 'last30') {
      const m = new Date(base);
      m.setDate(m.getDate() - 29);
      setDownloadFromDate(m.toISOString().slice(0, 10));
      setDownloadToDate(businessDate);
    }
  };

  const filteredPurchases = useMemo(() => {
    return purchases
      .filter(p => {
        const matchesDate = p.billDate >= downloadFromDate && p.billDate <= downloadToDate;
        const matchesSupplier = downloadSupplierFilter === 'ALL' || p.supplier === downloadSupplierFilter;
        const matchesStatus = downloadStatusFilter === 'ALL' || p.status === downloadStatusFilter;
        return matchesDate && matchesSupplier && matchesStatus;
      })
      .sort((a, b) => b.billDate.localeCompare(a.billDate));
  }, [purchases, downloadFromDate, downloadToDate, downloadSupplierFilter, downloadStatusFilter]);

  const handleDownloadPurchasesCsv = () => {
    const headers = [
      'Bill Date',
      'Purchase Date',
      'Invoice No',
      'Supplier',
      'Permit No',
      'Document No',
      'Total Items',
      'Total Bottles',
      'Gross Amount (Rs)',
      'SED Total (Rs)',
      'Discount (Rs)',
      'TCS (Rs)',
      'Net Payable (Rs)',
      'Status'
    ];

    const dataRows = filteredPurchases.map(p => [
      p.billDate,
      p.date,
      p.invoiceNo,
      p.supplier,
      p.permitNumber || '',
      p.documentNumber || '',
      p.lines.length,
      p.totalQty,
      p.grossTotal,
      p.sedTotal,
      p.discountTotal,
      p.tcsTotal,
      p.netTotal,
      p.status
    ]);

    const processRow = (row: (string | number)[]) =>
      row
        .map(val => {
          const text = String(val ?? '');
          if (text.search(/("|,|\n)/g) >= 0) {
            return `"${text.replace(/"/g, '""')}"`;
          }
          return text;
        })
        .join(',');

    const csvContent = [headers, ...dataRows].map(processRow).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `MM_Residency_Purchases_${downloadFromDate}_to_${downloadToDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm font-bold text-red-900">
        Administrative permission required to manage stock purchases.
      </div>
    );
  }

  // Row calculations for invoice entry
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
    } finally {
      setIsSubmittingPurchase(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-[11px] font-extrabold tracking-widest text-amber-600 dark:text-amber-400 uppercase">
            Supply Chain & Procurement
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Stock Purchases
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Record supplier invoices, case lots, SED duty, discounts, and download purchases reports
          </p>
        </div>

        {/* Tab Controls */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            onClick={() => setActiveSubTab('entry')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'entry'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Truck className="h-3.5 w-3.5" />
            <span>Invoice Entry & Logs</span>
          </button>
          <button
            onClick={() => setActiveSubTab('download')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'download'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Purchases (Period)</span>
          </button>
        </div>
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

      {/* ======================================================== */}
      {/* TAB 1: NEW INVOICE ENTRY & HISTORICAL LOGS               */}
      {/* ======================================================== */}
      {activeSubTab === 'entry' && (
        <div className="space-y-6">
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
                    className="text-[10px] text-amber-600 font-bold hover:underline cursor-pointer"
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
                            className="text-red-500 hover:text-red-700 cursor-pointer"
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
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
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
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold cursor-pointer"
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
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Purchase History Records
              </h2>
              <button
                onClick={() => setActiveSubTab('download')}
                className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export by Date Range →</span>
              </button>
            </div>

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
                      <th className="py-3 px-4 text-right">Batch ID</th>
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
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: DOWNLOAD PURCHASES BY DATE RANGE (REQ 5)          */}
      {/* ======================================================== */}
      {activeSubTab === 'download' && (
        <div className="space-y-6">
          {/* Filter Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Select Period for Purchases Download
                </h3>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">Presets:</span>
                <button
                  type="button"
                  onClick={() => applyDownloadDatePreset('today')}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => applyDownloadDatePreset('yesterday')}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => applyDownloadDatePreset('week')}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Weekly (7 Days)
                </button>
                <button
                  type="button"
                  onClick={() => applyDownloadDatePreset('month')}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => applyDownloadDatePreset('last30')}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Last 30 Days
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* From Date Calendar */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={downloadFromDate}
                  onChange={e => e.target.value && setDownloadFromDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2 font-mono text-xs font-bold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
                />
              </div>

              {/* To Date Calendar */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={downloadToDate}
                  onChange={e => e.target.value && setDownloadToDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2 font-mono text-xs font-bold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
                />
              </div>

              {/* Supplier Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Supplier Filter
                </label>
                <select
                  value={downloadSupplierFilter}
                  onChange={e => setDownloadSupplierFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="ALL">All Suppliers</option>
                  {suppliers.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status Filter
                </label>
                <select
                  value={downloadStatusFilter}
                  onChange={e => setDownloadStatusFilter(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Approved">Approved Only</option>
                  <option value="Pending">Pending Only</option>
                </select>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Period: <strong className="text-slate-900 dark:text-white font-mono">{downloadFromDate}</strong> to{' '}
                <strong className="text-slate-900 dark:text-white font-mono">{downloadToDate}</strong> · ({filteredPurchases.length} invoices matching)
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPurchasesCsv}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  <ArrowDownToLine className="h-4 w-4" />
                  <span>Download Purchases CSV</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Period</span>
                </button>
              </div>
            </div>
          </div>

          {/* Period Summary KPI Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Invoices</span>
              <div className="font-mono text-xl font-black text-slate-900 dark:text-white mt-0.5">
                {filteredPurchases.length} bills
              </div>
              <span className="text-[10px] text-slate-400">Matching period criteria</span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Bottles Purchased</span>
              <div className="font-mono text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
                {filteredPurchases.reduce((s, p) => s + p.totalQty, 0)} btls
              </div>
              <span className="text-[10px] text-slate-400">Total units received</span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Gross Purchase Value</span>
              <div className="font-mono text-xl font-black text-slate-900 dark:text-white mt-0.5">
                {formatCurrency(filteredPurchases.reduce((s, p) => s + p.grossTotal, 0))}
              </div>
              <span className="text-[10px] text-slate-400">Base goods amount</span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Net Payable Spend</span>
              <div className="font-mono text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatCurrency(filteredPurchases.reduce((s, p) => s + p.netTotal, 0))}
              </div>
              <span className="text-[10px] text-slate-400">Gross + SED - Disc + TCS</span>
            </div>
          </div>

          {/* Interactive Table Preview */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>Purchases Period Table Preview ({filteredPurchases.length} invoices)</span>
              </h4>
              <span className="text-[11px] text-slate-400">Click Download Purchases CSV above to export</span>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 font-bold uppercase text-[10px] text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">Bill Date</th>
                    <th className="py-2.5 px-3">Supplier</th>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Permit No</th>
                    <th className="py-2.5 px-3">Document No</th>
                    <th className="py-2.5 px-3 text-right">Bottles</th>
                    <th className="py-2.5 px-3 text-right">Gross (₹)</th>
                    <th className="py-2.5 px-3 text-right">SED (₹)</th>
                    <th className="py-2.5 px-3 text-right">Discount (₹)</th>
                    <th className="py-2.5 px-3 text-right">TCS (₹)</th>
                    <th className="py-2.5 px-3 text-right font-black">Net Payable (₹)</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPurchases.length > 0 ? (
                    filteredPurchases.map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono font-semibold">{p.billDate}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{p.supplier}</td>
                        <td className="py-2.5 px-3 font-mono font-semibold">{p.invoiceNo}</td>
                        <td className="py-2.5 px-3 text-slate-500">{p.permitNumber || '—'}</td>
                        <td className="py-2.5 px-3 text-slate-500">{p.documentNumber || '—'}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                          {p.totalQty} btls
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(p.grossTotal)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                          {formatCurrency(p.sedTotal)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                          {formatCurrency(p.discountTotal)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                          {formatCurrency(p.tcsTotal)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(p.netTotal)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              p.status === 'Approved'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={12} className="py-8 text-center text-slate-400 text-xs">
                        No purchases found for the selected period ({downloadFromDate} to {downloadToDate}).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold dark:border-slate-700 cursor-pointer"
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
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40 cursor-pointer"
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
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
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
