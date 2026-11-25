import React, { useState, useMemo, useEffect } from 'react';
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
  Trash2,
  Save,
  User,
  Users,
  UserCheck,
  Calendar,
  Search
} from 'lucide-react';
import { DailySalesReport, CounterLocation } from '../types';
import { CATEGORY_ORDER, matchesSearchQuery, sortProductsCategoryWise } from '../data/initialData';

export const DailySalesView: React.FC = () => {
  const {
    currentUser,
    businessDate,
    dailySales,
    getReportFormLines,
    submitDailySales,
    adminCreateHistoricalReport,
    adminEditReport,
    adminDeleteDailySales,
    reviewDailySales,
    products
  } = useStock();

  const isAdmin = currentUser?.role === 'ADMIN';
  const counter: CounterLocation = currentUser?.counter || 'NORMAL';

  const todayISO = new Date().toISOString().slice(0, 10);
  const [reportDate, setReportDate] = useState<string>(businessDate);

  useEffect(() => {
    setReportDate(businessDate);
  }, [businessDate]);

  // Recent past dates (last 5 days prior to today) for entering or updating previous days' sales
  const recentPastDates = useMemo(() => {
    const dates: { date: string; normalDone: boolean; acDone: boolean }[] = [];
    const today = new Date();
    const pad = (n: number) => ('0' + n).slice(-2);
    for (let i = 1; i <= 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const normalDone = dailySales.some(r => r.counter === 'NORMAL' && r.date === dateStr && r.status !== 'Rejected');
      const acDone = dailySales.some(r => r.counter === 'AC' && r.date === dateStr && r.status !== 'Rejected');
      dates.push({ date: dateStr, normalDone, acDone });
    }
    return dates;
  }, [dailySales]);

  // Identify past dates with missing daily sales reports for this counter (last 5 days)
  const missingPastDates = useMemo(() => {
    if (isAdmin) return [];
    return recentPastDates
      .filter(d => (counter === 'NORMAL' ? !d.normalDone : !d.acDone))
      .map(d => d.date);
  }, [recentPastDates, counter, isAdmin]);

  // State for counter submission form
  const [closingInputs, setClosingInputs] = useState<Record<string, string>>({});
  const [cashierName, setCashierName] = useState('');
  const [helperName, setHelperName] = useState('');
  const [cashAmount, setCashAmount] = useState('0');
  const [upiAmount, setUpiAmount] = useState('0');
  const [acChargesAmount, setAcChargesAmount] = useState('0');
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
  const [editCashAmount, setEditCashAmount] = useState('0');
  const [editUpiAmount, setEditUpiAmount] = useState('0');
  const [editAcCharges, setEditAcCharges] = useState('0');
  const [editCashierName, setEditCashierName] = useState('');
  const [editHelperName, setEditHelperName] = useState('');
  const [editPaymentExplanation, setEditPaymentExplanation] = useState('');
  const [editSearchFilter, setEditSearchFilter] = useState('');
  const [editShowAllLines, setEditShowAllLines] = useState(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [savingReportEdit, setSavingReportEdit] = useState(false);
  const [confirmingDeleteReport, setConfirmingDeleteReport] = useState(false);
  const [deleteReportReason, setDeleteReportReason] = useState('');
  const [deletingReport, setDeletingReport] = useState(false);

  // Admin historical entry modal
  const [showHistoricalModal, setShowHistoricalModal] = useState(false);
  const [histDate, setHistDate] = useState(businessDate);
  const [histCounter, setHistCounter] = useState<CounterLocation>('NORMAL');
  const [histReason, setHistReason] = useState('');
  const [histReceived, setHistReceived] = useState('0');
  const [histSoldMap, setHistSoldMap] = useState<Record<string, number>>({});
  const [histSearch, setHistSearch] = useState('');
  const [histError, setHistError] = useState<string | null>(null);

  // Share text modal
  const [shareText, setShareText] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  // Admin filters
  const [adminCounterFilter, setAdminCounterFilter] = useState('');
  const [adminStatusFilter, setAdminStatusFilter] = useState('');

  // Counter form lines based on selected reportDate
  const formState = getReportFormLines(counter, reportDate);
  const formLines = formState.lines;

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

  // Show only products with available stock (> 0) on the sales sheet
  const availableLineCalculations = lineCalculations.filter(l => l.available > 0);

  const categories = Array.from(new Set(availableLineCalculations.map(l => l.category || 'Others'))).sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a);
    const ib = CATEGORY_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    return a.localeCompare(b);
  });

  const parsedCash = Number(cashAmount) || 0;
  const parsedUpi = Number(upiAmount) || 0;
  const parsedAcCharges = counter === 'AC' ? (Number(acChargesAmount) || 0) : 0;
  const totalPaymentReceived = parsedCash + parsedUpi + parsedAcCharges;
  const expectedTotal = formCalculatedTotalValue + parsedAcCharges;
  const paymentDiff = Math.round((totalPaymentReceived - expectedTotal) * 100) / 100;

  const filteredLines = sortProductsCategoryWise(
    availableLineCalculations.filter(l => {
      const matchesCat = !categoryFilter || l.category === categoryFilter;
      const matchesSearch = matchesSearchQuery(searchFilter, l.name, l.category, l.sizeML, l.productId);
      const matchesOnlySelected = !onlySelected || l.sold > 0;
      return matchesCat && matchesSearch && matchesOnlySelected;
    })
  );

  const groupedFilteredLines = categories
    .map(cat => ({
      category: cat,
      items: filteredLines.filter(l => (l.category || 'Others') === cat)
    }))
    .filter(g => g.items.length > 0);

  const formatCurrency = (val: number) => '₹' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Submission Preview State
  const [showSubmitPreview, setShowSubmitPreview] = useState(false);
  const [isSubmittingDailyReport, setIsSubmittingDailyReport] = useState(false);

  // Validate and Open Preview
  const handleOpenSubmitPreview = () => {
    setStatusMessage(null);
    if (formInvalidEntries > 0) {
      setStatusMessage({
        type: 'err',
        text: 'Some closing counts are invalid. A closing stock cannot exceed total available stock.'
      });
      return;
    }
    if (!cashierName.trim() || !helperName.trim()) {
      setStatusMessage({
        type: 'err',
        text: 'Please enter both Cashier and Helper names at the top before submitting.'
      });
      return;
    }

    // Difference is permitted - show preview to review difference before confirming
    setShowSubmitPreview(true);
  };

  // Execute confirmed submission
  const handleConfirmSubmitReport = async () => {
    try {
      setIsSubmittingDailyReport(true);
      setStatusMessage(null);

      const submissionLines = formLines.map(l => {
        const raw = closingInputs[l.productId];
        const closing = raw !== undefined && raw !== '' ? Number(raw) : l.available;
        return {
          productId: l.productId,
          closing
        };
      });

      const reportId = await submitDailySales({
        date: reportDate,
        cashAmount: parsedCash,
        upiAmount: parsedUpi,
        cardAmount: 0,
        acCharges: parsedAcCharges,
        recordedAmount: totalPaymentReceived,
        cashierName: cashierName.trim(),
        helperName: helperName.trim(),
        paymentExplanation: paymentExplanation.trim(),
        lines: submissionLines
      });

      setShowSubmitPreview(false);
      setStatusMessage({ type: 'ok', text: `Shift report ${reportId} auto-approved and recorded! Stock decremented and immediately reflected in Consolidated Report.` });
      setClosingInputs({});
      setCashAmount('0');
      setUpiAmount('0');
      setAcChargesAmount('0');
      setPaymentExplanation('');
    } catch (e: any) {
      setStatusMessage({ type: 'err', text: e.message || 'Error submitting report.' });
    } finally {
      setIsSubmittingDailyReport(false);
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

  // Keep inspected report reactive to live edits
  const activeViewingReport = useMemo(() => {
    if (!viewingReport) return null;
    return dailySales.find(r => r.reportId === viewingReport.reportId) || viewingReport;
  }, [viewingReport, dailySales]);

  // Allow Admin to modify any report, and Counter Staff to edit/delete their own counter's same-day/latest report
  const canModifyReport = (report: DailySalesReport): boolean => {
    if (isAdmin) return true;
    if (!currentUser || report.counter !== counter) return false;
    const isForDay =
      report.date === businessDate ||
      report.date === todayISO ||
      (report.submittedAt || '').slice(0, 10) === todayISO;
    if (!isForDay) return false;
    const hasLaterReport = dailySales.some(
      other =>
        other.reportId !== report.reportId &&
        other.counter === report.counter &&
        other.status !== 'Rejected' &&
        other.date > report.date
    );
    return !hasLaterReport;
  };

  const openInspectReport = (report: DailySalesReport) => {
    setViewingReport(report);
    setIsEditingReport(false);
    setConfirmingDeleteReport(false);
    setDeleteReportReason('');
    setModalError(null);
  };

  const startEditingReport = (report: DailySalesReport) => {
    const isHistorical = Boolean(report.remark?.includes('ADMIN HISTORICAL SALES-ONLY ENTRY'));
    const nextClosing: Record<string, number> = {};
    const nextSold: Record<string, number> = {};
    report.lines.forEach(l => {
      nextClosing[l.productId] = l.closing;
      nextSold[l.productId] = l.sold;
    });
    setEditClosingMap(nextClosing);
    setEditSoldMap(nextSold);
    setEditCashAmount(String(report.cashAmount ?? 0));
    setEditUpiAmount(String(report.upiAmount ?? 0));
    setEditAcCharges(String(report.acCharges ?? 0));
    setEditCashierName(report.cashierName || '');
    setEditHelperName(report.helperName || '');
    setEditPaymentExplanation(report.paymentExplanation || '');
    setEditReason('');
    setEditSearchFilter('');
    setEditShowAllLines(!isHistorical);
    setModalError(null);
    setConfirmingDeleteReport(false);
    setIsEditingReport(true);
  };

  const isEditingHistorical = Boolean(activeViewingReport?.remark?.includes('ADMIN HISTORICAL SALES-ONLY ENTRY'));

  const editPreview = useMemo(() => {
    if (!activeViewingReport) {
      return {
        lines: [] as {
          productId: string;
          name: string;
          opening: number;
          inQty: number;
          outQty: number;
          available: number;
          closing: number;
          sold: number;
          price: number;
          value: number;
          isInvalid: boolean;
        }[],
        totalSold: 0,
        totalSalesValue: 0,
        cash: 0,
        upi: 0,
        acCharges: 0,
        recordedAmount: 0,
        diff: 0,
        invalidCount: 0,
      };
    }

    let totalSold = 0;
    let totalSalesValue = 0;
    let invalidCount = 0;

    const lines = activeViewingReport.lines.map(l => {
      let closing = l.closing;
      let sold = l.sold;
      let isInvalid = false;

      if (isEditingHistorical) {
        const rawSold = editSoldMap[l.productId];
        sold = rawSold !== undefined ? Number(rawSold) : l.sold;
        if (!Number.isInteger(sold) || sold < 0) {
          isInvalid = true;
          invalidCount += 1;
          sold = Math.max(0, sold || 0);
        }
      } else {
        const rawClosing = editClosingMap[l.productId];
        closing = rawClosing !== undefined ? Number(rawClosing) : l.closing;
        if (!Number.isInteger(closing) || closing < 0 || closing > l.available) {
          isInvalid = true;
          invalidCount += 1;
        }
        sold = Math.max(0, l.available - (Number.isFinite(closing) ? closing : l.available));
      }

      const value = sold * l.price;
      totalSold += sold;
      totalSalesValue += value;

      return {
        productId: l.productId,
        name: l.name || l.productId,
        opening: l.opening,
        inQty: l.inQty,
        outQty: l.outQty,
        available: l.available,
        closing,
        sold,
        price: l.price,
        value,
        isInvalid,
      };
    });

    const cash = Math.max(0, Number(editCashAmount) || 0);
    const upi = Math.max(0, Number(editUpiAmount) || 0);
    const acCharges = activeViewingReport.counter === 'AC' ? Math.max(0, Number(editAcCharges) || 0) : 0;
    const recordedAmount = Math.round((cash + upi + (activeViewingReport.cardAmount || 0) + acCharges) * 100) / 100;
    const roundedSalesValue = Math.round(totalSalesValue * 100) / 100;
    const diff = Math.round((recordedAmount - (roundedSalesValue + acCharges)) * 100) / 100;

    return {
      lines,
      totalSold,
      totalSalesValue: roundedSalesValue,
      cash,
      upi,
      acCharges,
      recordedAmount,
      diff,
      invalidCount,
    };
  }, [
    activeViewingReport,
    isEditingHistorical,
    editClosingMap,
    editSoldMap,
    editCashAmount,
    editUpiAmount,
    editAcCharges,
  ]);

  const handleSaveEditedReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeViewingReport) return;

    try {
      setModalError(null);
      if (editPreview.invalidCount > 0) {
        throw new Error('One or more closing/sold counts are invalid. Closing stock cannot be negative or exceed available stock.');
      }
      if (!editReason.trim()) {
        throw new Error('Please enter a short reason for editing this sales report.');
      }
      if (!isEditingHistorical && (!editCashierName.trim() || !editHelperName.trim())) {
        throw new Error('Cashier and Helper names cannot be empty.');
      }

      setSavingReportEdit(true);
      await adminEditReport(activeViewingReport.reportId, {
        recordedAmount: editPreview.recordedAmount,
        cashAmount: editPreview.cash,
        upiAmount: editPreview.upi,
        acCharges: editPreview.acCharges,
        cashierName: editCashierName.trim() || activeViewingReport.cashierName,
        helperName: editHelperName.trim() || activeViewingReport.helperName,
        paymentExplanation: editPaymentExplanation.trim(),
        reason: editReason.trim(),
        lines: editPreview.lines.map(l =>
          isEditingHistorical
            ? { productId: l.productId, sold: l.sold }
            : { productId: l.productId, closing: l.closing }
        ),
      });

      setIsEditingReport(false);
      setStatusMessage({
        type: 'ok',
        text: `Updated sales report ${activeViewingReport.reportId} for ${activeViewingReport.date} (${editPreview.totalSold} btls · ${formatCurrency(editPreview.totalSalesValue)}). Counter stock and ledger adjusted automatically.`
      });
    } catch (err: any) {
      setModalError(err?.message || 'Failed to save edited daily sales.');
    } finally {
      setSavingReportEdit(false);
    }
  };

  const handleConfirmDeleteReport = async () => {
    if (!activeViewingReport) return;
    try {
      setModalError(null);
      setDeletingReport(true);
      const deletedInfo = `${activeViewingReport.reportId} (${activeViewingReport.date} · ${activeViewingReport.counter === 'NORMAL' ? 'Normal Counter' : 'AC Counter'})`;
      await adminDeleteDailySales(
        activeViewingReport.reportId,
        deleteReportReason.trim() || 'Deleted from Inspect Report for re-entry'
      );
      setConfirmingDeleteReport(false);
      setViewingReport(null);
      setStatusMessage({
        type: 'ok',
        text: `Deleted report ${deletedInfo}. Sold bottles were restored to counter stock and you can now re-submit daily sales for that date.`
      });
    } catch (err: any) {
      setModalError(err?.message || 'Failed to delete daily sales report.');
    } finally {
      setDeletingReport(false);
    }
  };

  // Admin filter reports
  const displayedReports = dailySales.filter(r => {
    const matchesCounter = !adminCounterFilter || r.counter === adminCounterFilter;
    const matchesStatus = !adminStatusFilter || r.status === adminStatusFilter;
    return matchesCounter && matchesStatus;
  });

  return (
    <div className="print-surface space-y-6">
      <div className={activeViewingReport ? 'no-print space-y-6' : 'space-y-6'}>
      {/* Print-only formal header */}
      <div className="print-header text-center">
        <h1 className="text-xl font-black tracking-tight">MM RESIDENCY – DAILY SALES & RECONCILIATION</h1>
        <h2 className="text-sm font-bold uppercase tracking-wider mt-1">
          {isAdmin ? 'DAILY SALES REPORT LEDGER' : `${counter === 'NORMAL' ? 'NORMAL COUNTER' : 'AC COUNTER'} DAILY SALES SHEET`}
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          Shift Date: <strong>{isAdmin ? businessDate : reportDate}</strong> · Printed: {new Date().toLocaleString('en-IN')}
        </p>
      </div>

      {/* Top Banner */}
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Print View</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                setHistDate(recentPastDates[0]?.date || businessDate);
                setHistSoldMap({});
                setHistReason('');
                setHistReceived('0');
                setHistSearch('');
                setHistError(null);
                setShowHistoricalModal(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create Historical Sales Entry</span>
            </button>
          )}
        </div>
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

      {/* ADMIN WORKSPACE: Recent Past Dates Quick-Entry Strip */}
      {isAdmin && recentPastDates.length > 0 && (
        <div className="no-print rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50 via-white to-amber-50 p-4 text-xs text-amber-950 dark:border-amber-700/60 dark:from-amber-950/40 dark:via-slate-900 dark:to-amber-950/20 dark:text-amber-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <History className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-sm font-bold text-amber-900 dark:text-amber-300">
                  Update Previous Days' Sales (Last 5 Days)
                </strong>
                <span className="text-slate-600 dark:text-slate-400">
                  Pick any recent past date below to enter missing Normal Counter or AC Counter sales without altering today's opening stock:
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {recentPastDates.map(({ date, normalDone, acDone }) => (
              <div
                key={date}
                className="rounded-xl border border-amber-200/80 bg-white/90 p-2.5 dark:border-slate-700 dark:bg-slate-800/80 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">{date}</span>
                  <span className="text-[10px] font-semibold text-slate-500">
                    {normalDone && acDone ? '✓ Both' : 'Missing'}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setHistDate(date);
                      setHistCounter('NORMAL');
                      setHistSoldMap({});
                      setHistReason('');
                      setHistReceived('0');
                      setHistSearch('');
                      setHistError(null);
                      setShowHistoricalModal(true);
                    }}
                    className={`flex-1 rounded-lg px-2 py-1 text-[10px] font-bold transition-colors cursor-pointer ${
                      normalDone
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                    }`}
                  >
                    {normalDone ? '✓ Normal' : '+ Normal'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHistDate(date);
                      setHistCounter('AC');
                      setHistSoldMap({});
                      setHistReason('');
                      setHistReceived('0');
                      setHistSearch('');
                      setHistError(null);
                      setShowHistoricalModal(true);
                    }}
                    className={`flex-1 rounded-lg px-2 py-1 text-[10px] font-bold transition-colors cursor-pointer ${
                      acDone
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-purple-600 text-white hover:bg-purple-500'
                    }`}
                  >
                    {acDone ? '✓ AC' : '+ AC'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COUNTER WORKSPACE: Daily Sales Entry */}
      {!isAdmin && (
        <div className="space-y-4">
          {/* Missing Past Dates Reminder Banner */}
          {missingPastDates.length > 0 && (
            <div className="no-print rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50 via-white to-amber-50 p-4 text-xs text-amber-950 dark:border-amber-700/60 dark:from-amber-950/40 dark:via-slate-900 dark:to-amber-950/20 dark:text-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-sm font-bold text-amber-900 dark:text-amber-300">
                    Unentered Previous Shift(s) Detected
                  </strong>
                  <span className="text-slate-600 dark:text-slate-400">
                    Forgot to submit sales for an earlier day? Select any missing shift date below to record it:
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {missingPastDates.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setReportDate(d)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                      reportDate === d
                        ? 'bg-amber-600 text-white shadow-amber-950/30'
                        : 'bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-slate-700 hover:bg-amber-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    Enter for {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {formState.blockedMessage ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-sm font-bold mb-1">Shift Report Status for {reportDate}</strong>
                  <p>{formState.blockedMessage}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-amber-200/60 dark:border-amber-900/40">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Select another date:</span>
                <input
                  type="date"
                  max={todayISO}
                  value={reportDate}
                  onChange={e => e.target.value && setReportDate(e.target.value)}
                  className="rounded-lg border border-amber-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setReportDate(todayISO)}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 cursor-pointer"
                >
                  Go to Today
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* STAFF ON DUTY - CASHIER & HELPER AT THE TOP */}
              <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/50 p-4 sm:p-5 shadow-xs dark:border-amber-900/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-amber-200/50 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Staff on Duty & Shift Date
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Recording sales closure for <strong className="text-slate-900 dark:text-white">{reportDate}</strong> ({counter === 'NORMAL' ? 'Normal Counter' : 'AC Counter'})
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-amber-500" />
                      <span>Shift Date:</span>
                    </span>
                    <input
                      type="date"
                      max={todayISO}
                      value={reportDate}
                      onChange={e => e.target.value && setReportDate(e.target.value)}
                      className="rounded-xl border border-amber-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-xs cursor-pointer"
                      title="Select date you are recording closing stock for"
                    />
                    {reportDate !== todayISO && (
                      <button
                        type="button"
                        onClick={() => setReportDate(todayISO)}
                        className="rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 cursor-pointer"
                      >
                        Back to Today ({todayISO})
                      </button>
                    )}
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                      {counter === 'NORMAL' ? 'Normal Counter' : 'AC Counter'}
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
              <div className="no-print rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search product..."
                      value={searchFilter}
                      onChange={e => setSearchFilter(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

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
                  Available Items: {filteredLines.length} of {availableLineCalculations.length} in stock · Leave blank for 0 sold
                </div>
              </div>

              {/* Grid of Lines */}
              <div className="print-card rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                <div className="print-table-wrap overflow-x-auto max-h-[500px]">
                  <table className="print-table w-full text-left text-xs border-collapse">
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
                      {groupedFilteredLines.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-10 px-4 text-center text-xs text-slate-500 dark:text-slate-400">
                            {availableLineCalculations.length === 0
                              ? 'No products with available stock (> 0) at this counter for the selected shift date.'
                              : 'No available products match your current search/filter.'}
                          </td>
                        </tr>
                      ) : (
                        groupedFilteredLines.map(group => (
                          <React.Fragment key={group.category}>
                            <tr className="bg-slate-100/90 dark:bg-slate-800/80 border-y border-slate-200 dark:border-slate-700">
                              <td colSpan={11} className="py-1.5 px-3">
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
                            {group.items.map(l => (
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
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Collection Details */}
              <div className="print-grid grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="print-card rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Payment Collection Breakdown
                  </h3>
                  <div className={`grid ${counter === 'AC' ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
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
                    {counter === 'AC' && (
                      <div>
                        <label className="block text-[11px] font-bold text-purple-700 dark:text-purple-300 mb-1">
                          AC Charges Total (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={acChargesAmount}
                          onChange={e => setAcChargesAmount(e.target.value)}
                          className="w-full rounded-lg border border-purple-300 bg-purple-50/50 px-3 py-1.5 font-mono text-xs font-bold text-purple-900 outline-none focus:border-purple-500 dark:border-purple-700 dark:bg-slate-800 dark:text-purple-200"
                        />
                      </div>
                    )}
                  </div>

                  {Math.abs(paymentDiff) > 0.009 && (
                    <div>
                      <div className="mb-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>
                          Difference: {paymentDiff > 0 ? `+${formatCurrency(paymentDiff)} (Excess)` : `${formatCurrency(paymentDiff)} (Short)`} (Submission Allowed)
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder="Optional explanation for difference (e.g. coin rounding, tip, etc.)..."
                        value={paymentExplanation}
                        onChange={e => setPaymentExplanation(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  )}
                </div>

                <div className="print-card rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3 flex flex-col justify-between">
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
                      {counter === 'AC' && (
                        <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                          <span className="text-purple-700 dark:text-purple-300 font-semibold">Total AC Charges:</span>
                          <span className="font-mono font-bold text-purple-700 dark:text-purple-300">+{formatCurrency(parsedAcCharges)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">Total Money Received:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(totalPaymentReceived)}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-slate-500">Reconciliation:</span>
                        <span className={`font-mono font-bold ${Math.abs(paymentDiff) <= 0.009 ? 'text-emerald-600' : paymentDiff > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {Math.abs(paymentDiff) <= 0.009 ? '✓ Exact Match' : `${paymentDiff > 0 ? '+' : ''}${formatCurrency(paymentDiff)}`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Verify all physical closing bottle counts and cash drawer tallies before submitting this shift report.
                  </div>
                </div>
              </div>

              {/* Bottom Sticky Submission Bar */}
              <div className="no-print sticky bottom-3 rounded-xl border border-slate-300 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4 z-20">
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
                    onClick={handleOpenSubmitPreview}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    <span>Preview & Submit Report</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reports History List (Visible to all, editable by Admin or pending author) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {isAdmin ? 'All Submitted Sales Reports' : 'My Counter Reports History'}
          </h2>

          {isAdmin && (
            <div className="no-print flex items-center gap-2">
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

        <div className="print-card rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
          <div className="print-table-wrap overflow-x-auto">
            <table className="print-table w-full text-left text-xs border-collapse">
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
                  <th className="no-print py-3 px-4 text-right">Actions</th>
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
                    <td className="no-print py-3 px-4 text-right">
                      <button
                        onClick={() => openInspectReport(report)}
                        className="rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
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
      </div>

      {/* DEDICATED A4 PRINT VIEW FOR INSPECTED DAILY SALES REPORT */}
      {activeViewingReport && (
        <div className="hidden print:block print-only space-y-4">
          <div className="print-header text-center">
            <h1 className="text-xl font-black tracking-tight">MM RESIDENCY – DAILY SALES REPORT</h1>
            <h2 className="text-sm font-bold uppercase tracking-wider mt-1">
              {activeViewingReport.counter === 'NORMAL' ? 'NORMAL COUNTER' : 'AC COUNTER'} · {activeViewingReport.date}
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Report ID: <strong>{activeViewingReport.reportId}</strong> · Status: <strong>{activeViewingReport.status}</strong> · Submitted by {activeViewingReport.submittedBy} ({activeViewingReport.submittedAt})
            </p>
          </div>

          <div className="print-card grid grid-cols-2 gap-3 text-xs">
            <div>
              <div><strong>Cashier:</strong> {activeViewingReport.cashierName || '—'}</div>
              <div><strong>Helper:</strong> {activeViewingReport.helperName || '—'}</div>
              {activeViewingReport.editedBy && (
                <div><strong>Last Edited:</strong> {activeViewingReport.editedBy} ({activeViewingReport.editedAt})</div>
              )}
            </div>
            <div className="text-right font-mono">
              <div><strong>Bottles Sold:</strong> {activeViewingReport.totalSoldQty} btls</div>
              <div><strong>Liquor Sales:</strong> {formatCurrency(activeViewingReport.totalSalesValue)}</div>
              {activeViewingReport.counter === 'AC' && (
                <div><strong>AC Charges:</strong> {formatCurrency(activeViewingReport.acCharges || 0)}</div>
              )}
              <div>
                <strong>Cash / UPI:</strong> {formatCurrency(activeViewingReport.cashAmount)} / {formatCurrency(activeViewingReport.upiAmount)}
              </div>
              <div><strong>Total Collected:</strong> {formatCurrency(activeViewingReport.recordedAmount)}</div>
              <div>
                <strong>Difference:</strong>{' '}
                {Math.abs(activeViewingReport.paymentDifference) <= 0.009
                  ? 'Exact Match (0.00)'
                  : `${activeViewingReport.paymentDifference > 0 ? '+' : ''}${formatCurrency(activeViewingReport.paymentDifference)}`}
              </div>
            </div>
          </div>

          {activeViewingReport.remark && (
            <div className="print-card text-xs">
              <strong>Notes / Audit:</strong> {activeViewingReport.remark}
            </div>
          )}

          <div className="print-card">
            <table className="print-table w-full text-left text-xs">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Open</th>
                  <th>In</th>
                  <th>Out</th>
                  <th>Closing</th>
                  <th>Sold</th>
                  <th className="text-right">Rate</th>
                  <th className="text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {activeViewingReport.lines.filter(l => l.sold > 0).length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-4">
                      No bottles sold recorded in this shift.
                    </td>
                  </tr>
                ) : (
                  activeViewingReport.lines
                    .filter(l => l.sold > 0)
                    .map((l, idx) => (
                      <tr key={l.productId}>
                        <td className="font-mono">{idx + 1}</td>
                        <td className="font-bold">{l.name}</td>
                        <td className="font-mono">{l.opening}</td>
                        <td className="font-mono">{l.inQty}</td>
                        <td className="font-mono">{l.outQty}</td>
                        <td className="font-mono">{l.closing}</td>
                        <td className="font-mono font-bold">{l.sold}</td>
                        <td className="font-mono text-right">{formatCurrency(l.price)}</td>
                        <td className="font-mono font-bold text-right">{formatCurrency(l.value)}</td>
                      </tr>
                    ))
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} className="text-right font-bold uppercase">Total Sold:</td>
                  <td className="font-mono font-bold">{activeViewingReport.totalSoldQty}</td>
                  <td></td>
                  <td className="font-mono font-bold text-right">{formatCurrency(activeViewingReport.totalSalesValue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="grid grid-cols-3 gap-8 pt-8 text-center text-xs">
            <div className="border-t border-slate-400 pt-1.5">Cashier Signature</div>
            <div className="border-t border-slate-400 pt-1.5">Helper Signature</div>
            <div className="border-t border-slate-400 pt-1.5">Manager / Admin Signature</div>
          </div>
        </div>
      )}

      {/* REPORT INSPECTION / EDIT / DELETE / PRINT MODAL */}
      {activeViewingReport && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 max-h-[92vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between border-b pb-4 dark:border-slate-800 gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {isEditingReport ? 'Edit Daily Sales · ' : 'Report Details · '}
                    {activeViewingReport.reportId}
                  </h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    activeViewingReport.status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : activeViewingReport.status === 'Pending'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                  }`}>
                    {activeViewingReport.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Counter: {activeViewingReport.counter === 'NORMAL' ? 'Normal Counter' : 'AC Counter'} · Date: <strong>{activeViewingReport.date}</strong> · Submitted by {activeViewingReport.submittedBy} at {activeViewingReport.submittedAt}
                  {activeViewingReport.editedBy && (
                    <span> · Edited by {activeViewingReport.editedBy} ({activeViewingReport.editedAt})</span>
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setViewingReport(null);
                  setIsEditingReport(false);
                  setConfirmingDeleteReport(false);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                {modalError}
              </div>
            )}

            {/* Delete Confirmation Banner */}
            {confirmingDeleteReport && (
              <div className="rounded-xl border border-red-300 bg-red-50/90 p-4 text-xs text-red-950 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-sm font-bold">Delete Daily Sales Report ({activeViewingReport.date})?</strong>
                    <p className="mt-0.5">
                      {activeViewingReport.status === 'Approved' && !isEditingHistorical
                        ? `This will restore all ${activeViewingReport.totalSoldQty} sold bottles back to ${activeViewingReport.counter === 'NORMAL' ? 'Normal Counter' : 'AC Counter'} stock, log a reversal in the stock ledger, and allow re-entering daily sales for ${activeViewingReport.date}.`
                        : `This will permanently remove report ${activeViewingReport.reportId} for ${activeViewingReport.date}.`}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1">Reason for deleting (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Wrong closing counts entered, re-entering today's report"
                    value={deleteReportReason}
                    onChange={e => setDeleteReportReason(e.target.value)}
                    className="w-full rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-red-500 dark:border-red-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={deletingReport}
                    onClick={() => setConfirmingDeleteReport(false)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deletingReport}
                    onClick={handleConfirmDeleteReport}
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{deletingReport ? 'Deleting...' : 'Confirm Delete Report'}</span>
                  </button>
                </div>
              </div>
            )}

            {isEditingReport ? (
              <form onSubmit={handleSaveEditedReport} className="space-y-4">
                {/* Staff & Payment Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs dark:border-amber-900/40 dark:bg-amber-950/20">
                  {!isEditingHistorical && (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Cashier Name *</label>
                        <input
                          type="text"
                          required
                          value={editCashierName}
                          onChange={e => setEditCashierName(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Helper Name *</label>
                        <input
                          type="text"
                          required
                          value={editHelperName}
                          onChange={e => setEditHelperName(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Cash Received (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editCashAmount}
                      onChange={e => setEditCashAmount(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">UPI / Card Received (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editUpiAmount}
                      onChange={e => setEditUpiAmount(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  {activeViewingReport.counter === 'AC' && (
                    <div>
                      <label className="block text-[11px] font-bold text-purple-700 dark:text-purple-300 mb-1">AC Charges (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editAcCharges}
                        onChange={e => setEditAcCharges(e.target.value)}
                        className="w-full rounded-lg border border-purple-300 bg-white px-2.5 py-1.5 font-mono text-xs font-bold dark:border-purple-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Reason for Correction *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Fixed wrong closing bottle count"
                      value={editReason}
                      onChange={e => setEditReason(e.target.value)}
                      className="w-full rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs dark:border-amber-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                {/* Live Recalculated Totals */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                    <span className="text-slate-500">Updated Sold Qty</span>
                    <div className="font-mono text-base font-bold text-slate-900 dark:text-white">{editPreview.totalSold} btls</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                    <span className="text-slate-500">Updated Sales Value</span>
                    <div className="font-mono text-base font-bold text-emerald-600">{formatCurrency(editPreview.totalSalesValue)}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                    <span className="text-slate-500">Total Collected</span>
                    <div className="font-mono text-base font-bold text-slate-900 dark:text-white">{formatCurrency(editPreview.recordedAmount)}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                    <span className="text-slate-500">Updated Difference</span>
                    <div className={`font-mono text-base font-bold ${Math.abs(editPreview.diff) <= 0.009 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {Math.abs(editPreview.diff) <= 0.009 ? '0.00' : formatCurrency(editPreview.diff)}
                    </div>
                  </div>
                </div>

                {Math.abs(editPreview.diff) > 0.009 && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Payment Difference Explanation (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Explain cash/UPI difference if any..."
                      value={editPaymentExplanation}
                      onChange={e => setEditPaymentExplanation(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                )}

                {/* Edit Search & Toggle */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search product to adjust closing count..."
                      value={editSearchFilter}
                      onChange={e => setEditSearchFilter(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editShowAllLines}
                      onChange={e => setEditShowAllLines(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span>Show all items (including 0 sold)</span>
                  </label>
                </div>

                {/* Editable Lines Table */}
                <div className="rounded-xl border border-slate-200 overflow-hidden dark:border-slate-800">
                  <div className="overflow-x-auto max-h-[290px]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400 sticky top-0">
                        <tr>
                          <th className="p-2.5">Product</th>
                          <th className="p-2.5">Open</th>
                          <th className="p-2.5">Avail</th>
                          <th className="p-2.5 bg-amber-500/10">{isEditingHistorical ? 'Sold Qty' : 'Closing Count'}</th>
                          <th className="p-2.5">Sold</th>
                          <th className="p-2.5 text-right">Rate</th>
                          <th className="p-2.5 text-right">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {editPreview.lines
                          .filter(l => {
                            if (!editShowAllLines && l.sold <= 0) return false;
                            if (!isEditingHistorical && !editShowAllLines && l.available <= 0) return false;
                            return matchesSearchQuery(editSearchFilter, l.name, l.productId);
                          })
                          .map(l => (
                            <tr key={l.productId} className={l.sold > 0 ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}>
                              <td className="p-2.5 font-bold text-slate-900 dark:text-white">{l.name}</td>
                              <td className="p-2.5 font-mono">{l.opening}</td>
                              <td className="p-2.5 font-mono font-semibold">{l.available}</td>
                              <td className="p-2.5 bg-amber-500/5">
                                {isEditingHistorical ? (
                                  <input
                                    type="number"
                                    min="0"
                                    value={editSoldMap[l.productId] ?? l.sold}
                                    onChange={e => {
                                      const val = Math.max(0, Math.floor(Number(e.target.value) || 0));
                                      setEditSoldMap(prev => ({ ...prev, [l.productId]: val }));
                                    }}
                                    className="w-20 rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                  />
                                ) : (
                                  <input
                                    type="number"
                                    min="0"
                                    max={l.available}
                                    value={editClosingMap[l.productId] ?? l.closing}
                                    onChange={e => {
                                      const raw = e.target.value;
                                      const val = raw === '' ? 0 : Math.floor(Number(raw));
                                      setEditClosingMap(prev => ({ ...prev, [l.productId]: val }));
                                    }}
                                    className={`w-20 rounded border px-2 py-1 font-mono text-xs font-bold outline-none ${
                                      l.isInvalid
                                        ? 'border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200'
                                        : 'border-slate-300 bg-white text-slate-900 focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white'
                                    }`}
                                  />
                                )}
                              </td>
                              <td className="p-2.5 font-mono font-bold text-blue-600">{l.sold}</td>
                              <td className="p-2.5 font-mono text-right">{formatCurrency(l.price)}</td>
                              <td className="p-2.5 font-mono font-bold text-right">{formatCurrency(l.value)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Edit Action Bar */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t dark:border-slate-800">
                  <button
                    type="button"
                    disabled={savingReportEdit}
                    onClick={() => {
                      setIsEditingReport(false);
                      setModalError(null);
                    }}
                    className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                  <button
                    type="submit"
                    disabled={savingReportEdit || editPreview.invalidCount > 0}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{savingReportEdit ? 'Saving...' : 'Save Edited Sales'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* Staff on Duty at top of Report Details */}
                <div className="flex flex-wrap items-center gap-4 rounded-xl border border-amber-200/90 bg-amber-50/80 p-3 text-xs dark:border-amber-900/40 dark:bg-amber-950/40">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Cashier:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">{activeViewingReport.cashierName || '—'}</span>
                  </div>
                  <span className="text-amber-300 dark:text-amber-800">|</span>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Helper:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">{activeViewingReport.helperName || '—'}</span>
                  </div>
                </div>

                {activeViewingReport.remark && (
                  <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
                    <strong>Notes / Audit:</strong> {activeViewingReport.remark}
                  </div>
                )}

                {/* Quick Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                    <span className="text-slate-500">Sold Quantity</span>
                    <div className="font-mono text-base font-bold text-slate-900 dark:text-white">{activeViewingReport.totalSoldQty} btls</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                    <span className="text-slate-500">Sales Value</span>
                    <div className="font-mono text-base font-bold text-emerald-600">{formatCurrency(activeViewingReport.totalSalesValue)}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                    <span className="text-slate-500">Cash / UPI</span>
                    <div className="font-mono text-base font-bold text-slate-900 dark:text-white">
                      {formatCurrency(activeViewingReport.cashAmount)} / {formatCurrency(activeViewingReport.upiAmount)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
                    <span className="text-slate-500">Difference</span>
                    <div className={`font-mono text-base font-bold ${Math.abs(activeViewingReport.paymentDifference) <= 0.009 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {Math.abs(activeViewingReport.paymentDifference) <= 0.009 ? '0.00' : formatCurrency(activeViewingReport.paymentDifference)}
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
                        {activeViewingReport.lines.filter(l => l.sold > 0).length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-4 text-center text-slate-400">
                              No sold items recorded in this report.
                            </td>
                          </tr>
                        ) : (
                          activeViewingReport.lines.filter(l => l.sold > 0).map(l => (
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
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 cursor-pointer"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Print Daily Sales</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCopiedShare(false);
                        setShareText(generateReportSummaryText(activeViewingReport));
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span>Share / Copy</span>
                    </button>

                    {canModifyReport(activeViewingReport) && (
                      <>
                        <button
                          type="button"
                          onClick={() => startEditingReport(activeViewingReport)}
                          className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/60 cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          <span>Edit Sales</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setModalError(null);
                            setConfirmingDeleteReport(true);
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/60 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete Sales</span>
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isAdmin && activeViewingReport.status === 'Pending' && (
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            await reviewDailySales(activeViewingReport.reportId, 'REJECT', 'Rejected by admin');
                            setViewingReport(null);
                          }}
                          className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-700 cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await reviewDailySales(activeViewingReport.reportId, 'APPROVE');
                            setViewingReport(null);
                          }}
                          className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer"
                        >
                          Approve Report
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setViewingReport(null);
                        setIsEditingReport(false);
                        setConfirmingDeleteReport(false);
                      }}
                      className="rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </>
            )}
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
              <button onClick={() => setShowHistoricalModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            {histError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                {histError}
              </div>
            )}

            {/* Quick Recent Dates Picker inside Modal */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1">Last 5 Days:</span>
              {recentPastDates.map(({ date }) => (
                <button
                  key={date}
                  type="button"
                  onClick={() => setHistDate(date)}
                  className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold transition-colors cursor-pointer ${
                    histDate === date
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {date}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Date</label>
                <input
                  type="date"
                  max={todayISO}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            </div>

            <div className="border rounded-xl p-3 dark:border-slate-800 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Enter Sold Quantities for Each Product
                </span>
                <input
                  type="text"
                  placeholder="Search product name or size..."
                  value={histSearch}
                  onChange={e => setHistSearch(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-900 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {sortProductsCategoryWise(
                  products.filter(p => {
                    if (!p.active) return false;
                    return matchesSearchQuery(histSearch, p.name, p.category, p.sizeML, p.productId);
                  })
                ).map(p => (
                  <div key={p.productId} className="py-2 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{p.name} {p.sizeML}ml</div>
                      <span className="text-slate-500">{p.category} · {formatCurrency(p.sellingPrice)}</span>
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
              <div className="flex items-center justify-between border-t pt-2 text-xs dark:border-slate-800">
                <span className="text-slate-500">
                  Calculated Total:{' '}
                  <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(
                      products.reduce((sum, p) => sum + (histSoldMap[p.productId] || 0) * (p.sellingPrice || 0), 0)
                    )}
                  </strong>
                </span>
                <span className="font-mono text-slate-600 dark:text-slate-300">
                  {Object.values(histSoldMap).reduce((s, v) => s + (v || 0), 0)} btls
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t dark:border-slate-800">
              <button
                onClick={() => setShowHistoricalModal(false)}
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold dark:border-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    setHistError(null);
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

                    setStatusMessage({
                      type: 'ok',
                      text: `Historical sales entry created for ${histDate} (${histCounter === 'NORMAL' ? 'Normal Counter' : 'AC Counter'}).`
                    });
                    setShowHistoricalModal(false);
                  } catch (e: any) {
                    setHistError(e.message || 'Failed to create historical sales entry.');
                  }
                }}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer"
              >
                Create Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBMISSION PREVIEW MODAL */}
      {showSubmitPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b pb-3 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                  Pre-Submission Review
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Daily Sales Shift Report Preview
                </h3>
                <p className="text-xs text-slate-500">
                  Please verify shift personnel, bottles sold, and drawer cash before final submission.
                </p>
              </div>
              <button
                onClick={() => setShowSubmitPreview(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Shift & Staff info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Shift Date</span>
                <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5 font-mono">
                  {reportDate}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Counter</span>
                <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                  {counter === 'NORMAL' ? 'Normal Counter' : 'AC Counter'}
                </div>
              </div>
              <div className="col-span-2 sm:col-span-1 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Staff On Duty</span>
                <div className="font-bold text-slate-900 dark:text-white text-xs mt-0.5 truncate">
                  {cashierName} (Cashier) / {helperName} (Helper)
                </div>
              </div>
            </div>

            {/* Financial Summary Tiles */}
            <div className={`grid grid-cols-2 ${counter === 'AC' ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-2.5 text-xs`}>
              <div className="rounded-xl bg-amber-50/70 p-3 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40">
                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase">Bottles Sold</span>
                <div className="font-mono text-base font-black text-amber-950 dark:text-amber-200 mt-0.5">
                  {formCalculatedSoldBottles} btls
                </div>
              </div>
              <div className="rounded-xl bg-emerald-50/70 p-3 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40">
                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Liquor Sales</span>
                <div className="font-mono text-base font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                  {formatCurrency(formCalculatedTotalValue)}
                </div>
              </div>
              {counter === 'AC' && (
                <div className="rounded-xl bg-purple-50/70 p-3 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40">
                  <span className="text-[10px] font-bold text-purple-800 dark:text-purple-300 uppercase">AC Charges</span>
                  <div className="font-mono text-base font-black text-purple-700 dark:text-purple-300 mt-0.5">
                    {formatCurrency(parsedAcCharges)}
                  </div>
                </div>
              )}
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Total Received</span>
                <div className="font-mono text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {formatCurrency(totalPaymentReceived)}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Difference</span>
                <div className={`font-mono text-xs font-bold mt-1 ${Math.abs(paymentDiff) > 0.009 ? (paymentDiff > 0 ? 'text-blue-600' : 'text-red-600') : 'text-emerald-600'}`}>
                  {Math.abs(paymentDiff) <= 0.009 ? '✓ Exact Match' : `${paymentDiff > 0 ? '+' : ''}${formatCurrency(paymentDiff)}`}
                </div>
              </div>
            </div>

            {Math.abs(paymentDiff) > 0.009 && (
              <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900/50">
                <strong>Variance Status:</strong> {paymentDiff > 0 ? `+${formatCurrency(paymentDiff)} (Excess Money - Allowed)` : `${formatCurrency(paymentDiff)} (Short Money - Allowed)`}
                {paymentExplanation && <span className="block mt-0.5 text-slate-700 dark:text-slate-300">Explanation: {paymentExplanation}</span>}
              </div>
            )}

            {/* Itemized Sold Products */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-800/80 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 flex justify-between">
                <span>Sold Items Breakdown</span>
                <span>Qty · Rate · Total</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                {lineCalculations.filter(l => l.sold > 0).length > 0 ? (
                  lineCalculations.filter(l => l.sold > 0).map(l => (
                    <div key={l.productId} className="p-3 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{l.name} {l.sizeML}ml</div>
                        <span className="text-[11px] text-slate-500">
                          {l.category} · Available: {l.available} → Closing: {l.closing}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          {l.sold} × {formatCurrency(l.price)} = {formatCurrency(l.value)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400 italic">
                    No items marked as sold (all closing counts match available stock).
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isSubmittingDailyReport}
                onClick={() => setShowSubmitPreview(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                ← Edit Shift Counts
              </button>
              <button
                type="button"
                disabled={isSubmittingDailyReport}
                onClick={handleConfirmSubmitReport}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSubmittingDailyReport ? (
                  <span>Submitting...</span>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirm & Final Submit to Admin</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE MODAL */}
      {shareText && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
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
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareText);
                    setCopiedShare(true);
                  } catch {
                    setCopiedShare(false);
                  }
                }}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold dark:border-slate-700 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{copiedShare ? 'Copied!' : 'Copy'}</span>
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Open WhatsApp
              </a>
              <button
                type="button"
                onClick={() => {
                  setShareText(null);
                  setCopiedShare(false);
                }}
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold dark:border-slate-700 cursor-pointer"
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
