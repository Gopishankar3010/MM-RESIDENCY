import React, { useState } from 'react';
import { useStock } from '../context/StockContext';
import {
  Printer,
  Share2,
  Check,
  AlertTriangle,
  History,
  CheckCircle2,
  XCircle,
  Copy,
  PlusCircle,
  Eye,
  Edit2,
  User,
  Users,
  UserCheck
} from 'lucide-react';
import { DailySalesReport, CounterLocation } from '../types';

export const DailySalesView: React.FC = () => {
  const {
    currentUser,
    businessDate,
    dailySales,
    getReportFormLines,
    submitDailySales,
    adminCreateHistoricalReport,
    adminEditReport,
    reviewDailySales,
    products
  } = useStock();

  const isAdmin = currentUser?.role === 'ADMIN';
  const counter: CounterLocation = currentUser?.counter || 'NORMAL';

  // State for counter submission form
  const [closingInputs, setClosingInputs] = useState<Record<string, string>>({});
  const [cashierName, setCashierName] = useState('');
  const [helperName, setHelperName] = useState('');
  const [cashAmount, setCashAmount] = useState('0');
  const [upiAmount, setUpiAmount] = useState('0');
  const [paymentExplanation, setPaymentExplanation] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [onlySelected, setOnlySelected] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Modal states
  const [viewingReport, setViewingReport] = useState<DailySalesReport | null>(null);
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [editReason, setEditReason] = useState('');
  const [editClosingMap, setEditClosingMap] = useState<Record<string, number>>({});
  const [editSoldMap, setEditSoldMap] = useState<Record<string, number>>({});
  const [editReceivedAmount, setEditReceivedAmount] = useState('0');

  // Admin historical entry modal
  const [showHistoricalModal, setShowHistoricalModal] = useState(false);
  const [histDate, setHistDate] = useState(businessDate);
  const [histCounter, setHistCounter] = useState<CounterLocation>('NORMAL');
  const [histReason, setHistReason] = useState('');
  const [histReceived, setHistReceived] = useState('0');
  const [histSoldMap, setHistSoldMap] = useState<Record<string, number>>({});

  // Share text modal
  const [shareText, setShareText] = useState<string | null>(null);

  // Admin filters
  const [adminCounterFilter, setAdminCounterFilter] = useState('');
  const [adminStatusFilter, setAdminStatusFilter] = useState('');

  // Counter form lines
  const formState = getReportFormLines(counter, businessDate);
  const formLines = formState.lines;

  const categories = Array.from(new Set(formLines.map(l => l.category || 'Other'))).sort();

  // Compute calculated sales in counter form
  let formCalculatedSoldBottles = 0;
  let formCalculatedTotalValue = 0;
  let formInvalidEntries = 0;

  const lineCalculations = formLines.map(l => {
    const rawVal = closingInputs[l.productId];
    const closing = rawVal !== undefined && rawVal !== '' ? Number(rawVal) : l.available;
    const isInvalid = !Number.isInteger(closing) || closing < 0 || closing > l.available;
    if (isInvalid) formInvalidEntries++;

    const sold = Math.max(0, l.available - closing);
    const value = sold * l.price;

    if (!isInvalid) {
      formCalculatedSoldBottles += sold;
      formCalculatedTotalValue += value;
    }

    return {
      ...l,
      enteredClosing: rawVal !== undefined ? rawVal : '',
      closing,
      sold,
      value,
      isInvalid
    };
  });

  const parsedCash = Number(cashAmount) || 0;
  const parsedUpi = Number(upiAmount) || 0;
  const totalPaymentReceived = parsedCash + parsedUpi;
  const paymentDiff = Math.round((totalPaymentReceived - formCalculatedTotalValue) * 100) / 100;

  const filteredLines = lineCalculations.filter(l => {
    const matchesCat = !categoryFilter || l.category === categoryFilter;
    const q = searchFilter.trim().toLowerCase();
    const matchesSearch = !q || (l.name + ' ' + l.category).toLowerCase().includes(q);
    const matchesOnlySelected = !onlySelected || l.sold > 0;
    return matchesCat && matchesSearch && matchesOnlySelected;
  });

  const formatCurrency = (val: number) => '₹' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Handle Submit Report
  const handleSubmitCounterReport = async () => {
    try {
      setStatusMessage(null);
      if (formInvalidEntries > 0) {
        throw new Error('Some closing counts are invalid. A closing stock cannot exceed total available stock.');
      }
      if (!cashierName.trim() || !helperName.trim()) {
        throw new Error('Please enter both Cashier and Helper names.');
      }
      if (Math.abs(paymentDiff) > 0.009 && !paymentExplanation.trim()) {
        throw new Error('Payment received differs from calculated sales. An explanation is required.');
      }

      const submissionLines = formLines.map(l => {
        const raw = closingInputs[l.productId];
        const closing = raw !== undefined && raw !== '' ? Number(raw) : l.available;
        return {
          productId: l.productId,
          closing
        };
      });

      const reportId = await submitDailySales({
        date: businessDate,
        cashAmount: parsedCash,
        upiAmount: parsedUpi,
        cardAmount: 0,
        recordedAmount: totalPaymentReceived,
        cashierName: cashierName.trim(),
        helperName: helperName.trim(),
        paymentExplanation: paymentExplanation.trim(),
        lines: submissionLines
      });

      setStatusMessage({ type: 'ok', text: `Report submitted successfully as ${reportId}. Waiting for Admin review.` });
      setClosingInputs({});
      setCashAmount('0');
      setUpiAmount('0');
      setPaymentExplanation('');
    } catch (e: any) {
      setStatusMessage({ type: 'err', text: e.message || 'Error submitting report.' });
    }
  };

  // Build WhatsApp / Clipboard Text
  const generateReportSummaryText = (report: DailySalesReport) => {
    const soldLines = report.lines.filter(l => l.sold > 0);
    let txt = `*MM Residency – Daily Sales Report*\n`;
    txt += `Counter: ${report.counter === 'NORMAL' ? 'Normal Counter' : 'AC Counter'} | Date: ${report.date}\n`;
    txt += `Report ID: ${report.reportId} | Status: ${report.status}\n\n`;
    txt += `*ITEMS SOLD:*\n`;
    soldLines.forEach(l => {
      txt += `• ${l.name} × ${l.sold} = ${formatCurrency(l.value)}\n`;
    });
    txt += `\n*TOTALS:*\n`;
    txt += `Bottles Sold: ${report.totalSoldQty}\n`;
    txt += `Calculated Sales: ${formatCurrency(report.totalSalesValue)}\n`;
    txt += `Cash Received: ${formatCurrency(report.cashAmount)}\n`;
    txt += `UPI/Card Received: ${formatCurrency(report.upiAmount + report.cardAmount)}\n`;
    txt += `Total Received: ${formatCurrency(report.recordedAmount)}\n`;
    if (Math.abs(report.paymentDifference) > 0.009) {
      txt += `Difference: ${report.paymentDifference > 0 ? '+' : ''}${formatCurrency(report.paymentDifference)} (${report.paymentExplanation || 'N/A'})\n`;
    }
    txt += `Cashier: ${report.cashierName} | Helper: ${report.helperName}\n`;
    return txt;
  };

  // Admin filter reports
  const displayedReports = dailySales.filter(r => {
    const matchesCounter = !adminCounterFilter || r.counter === adminCounterFilter;
    const matchesStatus = !adminStatusFilter || r.status === adminStatusFilter;
    return matchesCounter && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[11px] font-extrabold tracking-widest text-amber-600 dark:text-amber-400 uppercase">
            Sales & Revenue Engine
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {isAdmin ? 'Daily Sales Management' : `Daily Sales · ${counter === 'NORMAL' ? 'Normal Counter' : 'AC Counter'}`}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Selected Business Date: {businessDate} · Exact closing inventory reconciliation
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setHistSoldMap({});
              setHistReason('');
              setHistReceived('0');
              setShowHistoricalModal(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create Historical Sales Entry</span>
          </button>
        )}
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

      {/* COUNTER WORKSPACE: Daily Sales Entry */}
      {!isAdmin && (
        <>
          {formState.blockedMessage ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-sm font-bold mb-1">Daily Report Notice</strong>
                {formState.blockedMessage}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* STAFF ON DUTY - CASHIER & HELPER AT THE TOP */}
              <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/50 p-4 sm:p-5 shadow-xs dark:border-amber-900/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-amber-200/50 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Staff on Duty (Cashier & Helper)
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Enter shift cashier and helper responsible for this day-end stock reconciliation before entering closing counts.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                      <span>{counter === 'NORMAL' ? 'Normal Counter' : 'AC Counter'}</span>
                      <span>•</span>
                      <span>{businessDate}</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <User className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        Cashier Name <span className="text-red-500">*</span>
                      </span>
                      {cashierName.trim() ? (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                          ✓ Filled
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-600 font-semibold">Required</span>
                      )}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Murugan"
                      value={cashierName}
                      onChange={e => setCashierName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        Helper Name <span className="text-red-500">*</span>
                      </span>
                      {helperName.trim() ? (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                          ✓ Filled
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-600 font-semibold">Required</span>
                      )}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Senthil"
                      value={helperName}
                      onChange={e => setHelperName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Filter tools */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <input
                    type="text"
                    placeholder="Search product..."
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />

                  <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">All Categories</option>
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onlySelected}
                      onChange={e => setOnlySelected(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span>Show Sold Only</span>
                  </label>
                </div>

                <div className="text-xs text-slate-500">
                  Total Items: {filteredLines.length} · Leave blank for 0 sold
                </div>
              </div>

              {/* Grid of Lines */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 font-bold uppercase text-[10px] text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 z-10">
                      <tr>
                        <th className="py-2.5 px-3">Product</th>
                        <th className="py-2.5 px-3">Open</th>
                        <th className="py-2.5 px-3">Godown In</th>
                        <th className="py-2.5 px-3">Trans In</th>
                        <th className="py-2.5 px-3 text-red-500">Trans Out</th>
                        <th className="py-2.5 px-3 text-red-500">Damage</th>
                        <th className="py-2.5 px-3 bg-slate-200/50 dark:bg-slate-700/50 font-bold">Total Avail</th>
                        <th className="py-2.5 px-3 w-32 bg-amber-500/10 dark:bg-amber-500/20">Closing Count</th>
                        <th className="py-2.5 px-3 text-center bg-blue-50/50 dark:bg-blue-950/30">Sold</th>
                        <th className="py-2.5 px-3 text-right">MRP</th>
                        <th className="py-2.5 px-3 text-right">Value (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredLines.map(l => (
                        <tr
                          key={l.productId}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                            l.sold > 0 ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900 dark:text-white">{l.name}</div>
                            <span className="text-[10px] text-slate-500">{l.sizeML}ml · {l.casePack}/case</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono">{l.opening}</td>
                          <td className="py-2.5 px-3 font-mono text-emerald-600 font-semibold">{l.godownIn || '—'}</td>
                          <td className="py-2.5 px-3 font-mono text-emerald-600">{l.transferIn || '—'}</td>
                          <td className="py-2.5 px-3 font-mono text-red-600">{l.transferOut || '—'}</td>
                          <td className="py-2.5 px-3 font-mono text-red-600">{l.damageOut || '—'}</td>
                          <td className="py-2.5 px-3 font-mono font-bold bg-slate-100/50 dark:bg-slate-800/40">
                            {l.available}
                          </td>
                          <td className="py-2.5 px-3 bg-amber-500/5">
                            <input
                              type="number"
                              min="0"
                              max={l.available}
                              value={l.enteredClosing}
                              placeholder={String(l.available)}
                              onChange={e => {
                                const val = e.target.value;
                                setClosingInputs(prev => ({ ...prev, [l.productId]: val }));
                              }}
                              className={`w-24 rounded border px-2 py-1 font-mono text-xs font-bold outline-none ${
                                l.isInvalid
                                  ? 'border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200'
                                  : 'border-slate-300 bg-white text-slate-900 focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white'
                              }`}
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-black text-blue-700 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/10">
                            {l.sold}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {formatCurrency(l.price)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {l.sold > 0 ? formatCurrency(l.value) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Collection Details */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Payment Collection Breakdown
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        Cash Received (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={cashAmount}
                        onChange={e => setCashAmount(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs font-bold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        UPI / Card Received (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={upiAmount}
                        onChange={e => setUpiAmount(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs font-bold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  {Math.abs(paymentDiff) > 0.009 && (
                    <div>
                      <div className="mb-1 text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>
                          Payment differs from calculated sales by {paymentDiff > 0 ? `+${formatCurrency(paymentDiff)} (Excess)` : `${formatCurrency(paymentDiff)} (Short)`}
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder="Mandatory explanation for cash/sales mismatch..."
                        value={paymentExplanation}
                        onChange={e => setPaymentExplanation(e.target.value)}
                        className="w-full rounded-lg border border-red-300 bg-red-50/40 px-3 py-1.5 text-xs text-red-900 outline-none focus:border-red-500 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
                      />
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                      Shift Reconciliation Summary
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">Staff on Duty (from top):</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {cashierName.trim() ? cashierName : 'Cashier Unset'} · {helperName.trim() ? helperName : 'Helper Unset'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">Calculated Stock Value:</span>
                        <span className="font-mono font-bold text-emerald-600">{formatCurrency(formCalculatedTotalValue)}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-slate-500">Total Money Received:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(totalPaymentReceived)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Verify all physical closing bottle counts and cash drawer tallies before submitting this shift report.
                  </div>
                </div>
              </div>

              {/* Bottom Sticky Submission Bar */}
              <div className="sticky bottom-3 rounded-xl border border-slate-300 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4 z-20">
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">Bottles Sold:</span>
                    <span className="ml-1 font-mono font-black text-slate-900 dark:text-white">
                      {formCalculatedSoldBottles} btls
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Calculated Sales:</span>
                    <span className="ml-1 font-mono font-black text-emerald-600">
                      {formatCurrency(formCalculatedTotalValue)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Total Collected:</span>
                    <span className="ml-1 font-mono font-black text-slate-900 dark:text-white">
                      {formatCurrency(totalPaymentReceived)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const txt = `*MM Residency - Draft Report*\nDate: ${businessDate}\nSold Bottles: ${formCalculatedSoldBottles}\nCalculated Value: ${formatCurrency(formCalculatedTotalValue)}\nPayment: ${formatCurrency(totalPaymentReceived)}`;
                      setShareText(txt);
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>WhatsApp Draft</span>
                  </button>

                  <button
                    disabled={formInvalidEntries > 0}
                    onClick={handleSubmitCounterReport}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    <Check className="h-4 w-4" />
                    <span>Submit Daily Report</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Reports History List (Visible to all, editable by Admin or pending author) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {isAdmin ? 'All Submitted Sales Reports' : 'My Counter Reports History'}
          </h2>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <select
                value={adminCounterFilter}
                onChange={e => setAdminCounterFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Both Counters</option>
                <option value="NORMAL">Normal Counter</option>
                <option value="AC">AC Counter</option>
              </select>

              <select
                value={adminStatusFilter}
                onChange={e => setAdminStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 font-bold uppercase text-[10px] text-slate-600 dark:text-slate-400">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Counter</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Bottles Sold</th>
                  <th className="py-3 px-4">Calculated Value</th>
                  <th className="py-3 px-4">Recorded Amount</th>
                  <th className="py-3 px-4">Difference</th>
                  <th className="py-3 px-4">Submitted By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayedReports.map(report => (
                  <tr key={report.reportId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                      {report.date}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      <div className="font-semibold">{report.counter === 'NORMAL' ? 'Normal Counter' : 'AC Counter'}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        Cashier: <strong className="font-medium text-slate-800 dark:text-slate-200">{report.cashierName}</strong> · Helper: <strong className="font-medium text-slate-800 dark:text-slate-200">{report.helperName}</strong>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        report.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : report.status === 'Pending'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                      }`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">{report.totalSoldQty} btls</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-600">
                      {formatCurrency(report.totalSalesValue)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(report.recordedAmount)}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {Math.abs(report.paymentDifference) > 0.009 ? (
                        <span className={report.paymentDifference < 0 ? 'text-red-600 font-bold' : 'text-blue-600 font-bold'}>
                          {report.paymentDifference > 0 ? '+' : ''}{formatCurrency(report.paymentDifference)}
                        </span>
                      ) : (
                        <span className="text-emerald-600">✓ Matches</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{report.submittedBy}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setViewingReport(report);
                          setIsEditingReport(false);
                        }}
                        className="rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                      >
                        Inspect Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* REPORT INSPECTION / APPROVAL / EDIT MODAL */}
      {viewingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between border-b pb-4 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Report Details · {viewingReport.reportId}
                  </h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    viewingReport.status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : viewingReport.status === 'Pending'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {viewingReport.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Counter: {viewingReport.counter} · Date: {viewingReport.date} · Submitted by {viewingReport.submittedBy} at {viewingReport.submittedAt}
                </p>
              </div>

              <button
                onClick={() => setViewingReport(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Staff on Duty at top of Report Details */}
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-amber-200/90 bg-amber-50/80 p-3 text-xs dark:border-amber-900/40 dark:bg-amber-950/40">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-slate-600 dark:text-slate-400 font-medium">Cashier:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">{viewingReport.cashierName || '—'}</span>
              </div>
              <span className="text-amber-300 dark:text-amber-800">|</span>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-slate-600 dark:text-slate-400 font-medium">Helper:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">{viewingReport.helperName || '—'}</span>
              </div>
            </div>

            {viewingReport.remark && (
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
                <strong>Notes / Audit:</strong> {viewingReport.remark}
              </div>
            )}

            {/* Quick Metrics */}
            <div className="grid grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                <span className="text-slate-500">Sold Quantity</span>
                <div className="font-mono text-base font-bold text-slate-900 dark:text-white">{viewingReport.totalSoldQty} btls</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                <span className="text-slate-500">Sales Value</span>
                <div className="font-mono text-base font-bold text-emerald-600">{formatCurrency(viewingReport.totalSalesValue)}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                <span className="text-slate-500">Cash / UPI</span>
                <div className="font-mono text-base font-bold text-slate-900 dark:text-white">
                  {formatCurrency(viewingReport.cashAmount)} / {formatCurrency(viewingReport.upiAmount)}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                <span className="text-slate-500">Difference</span>
                <div className={`font-mono text-base font-bold ${viewingReport.paymentDifference === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {viewingReport.paymentDifference === 0 ? '0.00' : formatCurrency(viewingReport.paymentDifference)}
                </div>
              </div>
            </div>

            {/* Lines List */}
            <div className="rounded-xl border border-slate-200 overflow-hidden dark:border-slate-800">
              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400 sticky top-0">
                    <tr>
                      <th className="p-2.5">Product</th>
                      <th className="p-2.5">Open</th>
                      <th className="p-2.5">In</th>
                      <th className="p-2.5">Out</th>
                      <th className="p-2.5">Closing</th>
                      <th className="p-2.5">Sold</th>
                      <th className="p-2.5 text-right">Rate</th>
                      <th className="p-2.5 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {viewingReport.lines.filter(l => l.sold > 0).map(l => (
                      <tr key={l.productId}>
                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">{l.name}</td>
                        <td className="p-2.5 font-mono">{l.opening}</td>
                        <td className="p-2.5 font-mono text-emerald-600">{l.inQty}</td>
                        <td className="p-2.5 font-mono text-red-600">{l.outQty}</td>
                        <td className="p-2.5 font-mono">{l.closing}</td>
                        <td className="p-2.5 font-mono font-bold text-blue-600">{l.sold}</td>
                        <td className="p-2.5 font-mono text-right">{formatCurrency(l.price)}</td>
                        <td className="p-2.5 font-mono font-bold text-right">{formatCurrency(l.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShareText(generateReportSummaryText(viewingReport));
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Share / Copy</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {isAdmin && viewingReport.status === 'Pending' && (
                  <>
                    <button
                      onClick={async () => {
                        await reviewDailySales(viewingReport.reportId, 'REJECT', 'Rejected by admin');
                        setViewingReport(null);
                      }}
                      className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-700"
                    >
                      Reject
                    </button>
                    <button
                      onClick={async () => {
                        await reviewDailySales(viewingReport.reportId, 'APPROVE');
                        setViewingReport(null);
                      }}
                      className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      Approve Report
                    </button>
                  </>
                )}
                <button
                  onClick={() => setViewingReport(null)}
                  className="rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN HISTORICAL SALES-ONLY CREATION MODAL */}
      {showHistoricalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between border-b pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Create Historical Sales-Only Entry
                </h3>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Adds missing historical revenue data without mutating current physical stock balances.
                </p>
              </div>
              <button onClick={() => setShowHistoricalModal(false)} className="text-slate-400">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Date</label>
                <input
                  type="date"
                  value={histDate}
                  onChange={e => setHistDate(e.target.value)}
                  className="w-full rounded-lg border p-2 text-xs dark:bg-slate-800 dark:text-white dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Counter</label>
                <select
                  value={histCounter}
                  onChange={e => setHistCounter(e.target.value as CounterLocation)}
                  className="w-full rounded-lg border p-2 text-xs dark:bg-slate-800 dark:text-white dark:border-slate-700"
                >
                  <option value="NORMAL">Normal Counter</option>
                  <option value="AC">AC Counter</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Amount Received (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={histReceived}
                onChange={e => setHistReceived(e.target.value)}
                className="w-full rounded-lg border p-2 text-xs dark:bg-slate-800 dark:text-white dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason / Reference *
              </label>
              <input
                type="text"
                placeholder="e.g. Backdated register entry from manual sales log"
                value={histReason}
                onChange={e => setHistReason(e.target.value)}
                className="w-full rounded-lg border p-2 text-xs dark:bg-slate-800 dark:text-white dark:border-slate-700"
              />
            </div>

            <div className="border rounded-xl p-3 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 block">
                Enter Sold Quantities for Each Product:
              </span>
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {products.filter(p => p.active).map(p => (
                  <div key={p.productId} className="py-2 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{p.name} {p.sizeML}ml</div>
                      <span className="text-slate-500">{formatCurrency(p.sellingPrice)}</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={histSoldMap[p.productId] || ''}
                      onChange={e => {
                        const val = Number(e.target.value) || 0;
                        setHistSoldMap(prev => ({ ...prev, [p.productId]: val }));
                      }}
                      className="w-20 rounded border p-1 font-mono text-center dark:bg-slate-800 dark:text-white dark:border-slate-700"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t dark:border-slate-800">
              <button
                onClick={() => setShowHistoricalModal(false)}
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    if (!histReason.trim()) throw new Error('Enter a reason for the historical entry.');
                    const lines = Object.entries(histSoldMap)
                      .filter(([_, sold]) => sold > 0)
                      .map(([productId, sold]) => ({ productId, sold }));

                    if (!lines.length) throw new Error('Enter sold quantity for at least one product.');

                    await adminCreateHistoricalReport({
                      date: histDate,
                      counter: histCounter,
                      recordedAmount: Number(histReceived) || 0,
                      reason: histReason.trim(),
                      lines
                    });

                    setShowHistoricalModal(false);
                  } catch (e: any) {
                    alert(e.message);
                  }
                }}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Create Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE MODAL */}
      {shareText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Share Report Summary
            </h3>
            <textarea
              readOnly
              rows={12}
              value={shareText}
              className="w-full font-mono text-xs rounded-xl border p-3 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareText);
                  alert('Copied to clipboard!');
                }}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold dark:border-slate-700"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </button>
              <button
                onClick={() => {
                  window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
                }}
                className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Open WhatsApp
              </button>
              <button
                onClick={() => setShareText(null)}
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold dark:border-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
