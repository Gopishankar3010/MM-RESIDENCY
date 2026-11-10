import React, { useState, useEffect, useMemo } from 'react';
import { useStock } from '../context/StockContext';
import {
  Printer,
  Calendar,
  User,
  Users,
  UserCheck,
  Download,
  Filter,
  ArrowDownToLine,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { CounterLocation } from '../types';

export const ConsolidatedReportView: React.FC = () => {
  const { currentUser, businessDate, dailySales, operations, purchases } = useStock();

  const isAdmin = currentUser?.role === 'ADMIN';
  const isAcUser = currentUser?.counter === 'AC' || currentUser?.role === 'AC';
  const isNormalUser = currentUser?.counter === 'NORMAL' || currentUser?.role === 'NORMAL';

  // Active Main Sub-tab: 'daily' (Daily Financial Closing) vs 'reports' (Date-Range Reports & Downloads Hub)
  const [activeViewTab, setActiveViewTab] = useState<'daily' | 'reports'>('daily');

  // Selected date for Daily Financial Closing (defaults to businessDate, user can change to any day)
  const [selectedDate, setSelectedDate] = useState<string>(businessDate);

  useEffect(() => {
    setSelectedDate(businessDate);
  }, [businessDate]);

  // Admin counter filter for Consolidated view
  const [adminCounterFilter, setAdminCounterFilter] = useState<'ALL' | 'NORMAL' | 'AC'>('ALL');

  const formatCurrency = (val: number) =>
    '₹' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Helper to find the active sales report for a counter and date (prefers Approved, falls back to latest submitted)
  const getReportForCounter = (counter: CounterLocation, date: string) => {
    const matches = dailySales.filter(r => r.counter === counter && r.date === date && r.status !== 'Rejected');
    const approved = matches.find(r => r.status === 'Approved');
    if (approved) return approved;
    return matches[0] || null;
  };

  // Sales on selectedDate
  const normalSale = getReportForCounter('NORMAL', selectedDate);
  const acSale = getReportForCounter('AC', selectedDate);

  // Normal Counter Metrics
  const normalCash = normalSale?.cashAmount || 0;
  const normalUpi = (normalSale?.upiAmount || 0) + (normalSale?.cardAmount || 0);
  const normalValue = normalSale?.totalSalesValue || 0;
  const normalTotalReceived = normalCash + normalUpi;
  const normalDiff = normalSale?.paymentDifference || 0;

  // AC Counter Metrics (clean structure matching normal counter + shift AC charges)
  const acCash = acSale?.cashAmount || 0;
  const acUpi = (acSale?.upiAmount || 0) + (acSale?.cardAmount || 0);
  const acCharges = acSale?.acCharges || 0;
  const acValue = acSale?.totalSalesValue || 0;
  const acTotalReceived = acCash + acUpi + acCharges;
  const acDiff = acSale?.paymentDifference || 0;

  // Combined Bar totals
  const totalSalesCash = normalCash + acCash;
  const totalSalesUpi = normalUpi + acUpi;
  const totalSalesValue = normalValue + acValue;
  const totalAcCharges = acCharges;
  const totalCombinedReceived = normalTotalReceived + acTotalReceived;

  // Approved Room Rent on selected date (only visible to Admin and Normal Counter)
  const roomOps = operations.filter(o => o.type === 'ROOM' && o.date === selectedDate && o.status === 'Approved');
  const roomCash = roomOps.filter(r => r.payment === 'Cash').reduce((s, r) => s + r.amount, 0);
  const roomUpi = roomOps.filter(r => r.payment === 'UPI' || r.payment === 'Card').reduce((s, r) => s + r.amount, 0);
  const totalRoomRent = roomCash + roomUpi;

  // Approved Expenses and Wages on selected date (only visible to Admin and Normal Counter)
  const expenseOps = operations.filter(o => o.type === 'EXPENSE' && o.date === selectedDate && o.status === 'Approved');
  const wageOps = operations.filter(o => o.type === 'WAGE' && o.date === selectedDate && o.status === 'Approved');

  const totalExpenses = expenseOps.reduce((s, o) => s + o.amount, 0);
  const totalWages = wageOps.reduce((s, o) => s + o.amount, 0);
  const totalOutflows = totalExpenses + totalWages;

  // Gross and Net Collections for Admin / Non-AC view
  const totalInflows = totalSalesCash + totalSalesUpi + totalRoomRent + totalAcCharges;
  const netSurplus = totalInflows - totalOutflows;

  // ==========================================
  // DATE-RANGE REPORTS & EXPORTS HUB STATE
  // ==========================================
  const [reportType, setReportType] = useState<'sales' | 'purchases' | 'consolidated'>('sales');
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date(businessDate);
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState<string>(businessDate);
  const [hubCounterFilter, setHubCounterFilter] = useState<'ALL' | 'NORMAL' | 'AC'>(
    isAcUser ? 'AC' : isNormalUser ? 'NORMAL' : 'ALL'
  );

  // Quick Date Range Presets
  const applyDatePreset = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'last30') => {
    const base = new Date(businessDate);
    if (preset === 'today') {
      setFromDate(businessDate);
      setToDate(businessDate);
    } else if (preset === 'yesterday') {
      const y = new Date(base);
      y.setDate(y.getDate() - 1);
      const str = y.toISOString().slice(0, 10);
      setFromDate(str);
      setToDate(str);
    } else if (preset === 'week') {
      const w = new Date(base);
      w.setDate(w.getDate() - 6);
      setFromDate(w.toISOString().slice(0, 10));
      setToDate(businessDate);
    } else if (preset === 'month') {
      const firstOfMonth = businessDate.slice(0, 7) + '-01';
      setFromDate(firstOfMonth);
      setToDate(businessDate);
    } else if (preset === 'last30') {
      const m = new Date(base);
      m.setDate(m.getDate() - 29);
      setFromDate(m.toISOString().slice(0, 10));
      setToDate(businessDate);
    }
  };

  // Filtered Liquor Sales Rows
  const filteredSalesData = useMemo(() => {
    const effectiveCounter = isAcUser ? 'AC' : isNormalUser ? 'NORMAL' : hubCounterFilter;
    const reports = dailySales.filter(r => {
      const matchesDate = r.date >= fromDate && r.date <= toDate;
      const matchesCounter = effectiveCounter === 'ALL' || r.counter === effectiveCounter;
      return matchesDate && matchesCounter;
    });

    const rows: {
      date: string;
      counter: CounterLocation;
      cashier: string;
      helper: string;
      productName: string;
      category: string;
      sizeML: number;
      sold: number;
      price: number;
      value: number;
      status: string;
      reportId: string;
    }[] = [];

    reports.forEach(r => {
      r.lines.forEach(l => {
        if (l.sold > 0) {
          rows.push({
            date: r.date,
            counter: r.counter,
            cashier: r.cashierName || '—',
            helper: r.helperName || '—',
            productName: l.name || 'Product',
            category: l.category || 'Liquor',
            sizeML: l.sizeML || 750,
            sold: l.sold,
            price: l.price,
            value: l.value,
            status: r.status,
            reportId: r.reportId
          });
        }
      });
    });

    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [dailySales, fromDate, toDate, hubCounterFilter, isAcUser, isNormalUser]);

  // Filtered Purchases Rows (Admin only)
  const filteredPurchasesData = useMemo(() => {
    if (!isAdmin) return [];
    return purchases
      .filter(p => p.billDate >= fromDate && p.billDate <= toDate)
      .sort((a, b) => b.billDate.localeCompare(a.billDate));
  }, [purchases, fromDate, toDate, isAdmin]);

  // Filtered Consolidated Daily Statement Rows
  const filteredConsolidatedData = useMemo(() => {
    const dateSet = new Set<string>();
    dailySales.forEach(r => {
      if (r.date >= fromDate && r.date <= toDate) dateSet.add(r.date);
    });
    operations.forEach(o => {
      if (o.date >= fromDate && o.date <= toDate) dateSet.add(o.date);
    });

    dateSet.add(fromDate);
    dateSet.add(toDate);

    const sortedDates = Array.from(dateSet).sort().reverse();

    return sortedDates.map(date => {
      const nSale = getReportForCounter('NORMAL', date);
      const aSale = getReportForCounter('AC', date);

      const nVal = nSale?.totalSalesValue || 0;
      const nCash = nSale?.cashAmount || 0;
      const nUpi = (nSale?.upiAmount || 0) + (nSale?.cardAmount || 0);
      const nTotal = nCash + nUpi;
      const nDiff = nSale?.paymentDifference || 0;

      const aVal = aSale?.totalSalesValue || 0;
      const aCash = aSale?.cashAmount || 0;
      const aUpi = (aSale?.upiAmount || 0) + (aSale?.cardAmount || 0);
      const aCharges = aSale?.acCharges || 0;
      const aTotal = aCash + aUpi + aCharges;
      const aDiff = aSale?.paymentDifference || 0;

      const rOps = operations.filter(o => o.type === 'ROOM' && o.date === date && o.status === 'Approved');
      const rTotal = rOps.reduce((s, r) => s + r.amount, 0);

      const expOps = operations.filter(o => o.type === 'EXPENSE' && o.date === date && o.status === 'Approved');
      const expTotal = expOps.reduce((s, e) => s + e.amount, 0);

      const wOps = operations.filter(o => o.type === 'WAGE' && o.date === date && o.status === 'Approved');
      const wTotal = wOps.reduce((s, w) => s + w.amount, 0);

      const barTotal = nVal + aVal;
      const totalIn = nCash + nUpi + aCash + aUpi + aCharges + rTotal;
      const totalOut = expTotal + wTotal;
      const surplus = totalIn - totalOut;

      return {
        date,
        nSale,
        aSale,
        normalValue: nVal,
        normalCash: nCash,
        normalUpi: nUpi,
        normalTotal: nTotal,
        normalDiff: nDiff,
        acValue: aVal,
        acCash: aCash,
        acUpi: aUpi,
        acCharges: aCharges,
        acTotalReceived: aTotal,
        acDiff: aDiff,
        barTotal,
        roomRent: rTotal,
        expenses: expTotal,
        wages: wTotal,
        netSurplus: surplus
      };
    });
  }, [dailySales, operations, fromDate, toDate]);

  // CSV Generator Function
  const exportCsv = (filename: string, rows: (string | number)[][]) => {
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

    const csvContent = rows.map(processRow).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadReport = () => {
    if (reportType === 'sales') {
      const headers = [
        'Date',
        'Counter',
        'Cashier',
        'Helper',
        'Product Name',
        'Category',
        'Size (ml)',
        'Bottles Sold',
        'Price / MRP (Rs)',
        'Total Sales Value (Rs)',
        'Report Status'
      ];
      const dataRows = filteredSalesData.map(r => [
        r.date,
        r.counter === 'NORMAL' ? 'Normal Counter' : 'AC Counter',
        r.cashier,
        r.helper,
        r.productName,
        r.category,
        r.sizeML,
        r.sold,
        r.price,
        r.value,
        r.status
      ]);
      exportCsv(`MM_Residency_Liquor_Sales_${fromDate}_to_${toDate}.csv`, [headers, ...dataRows]);
    } else if (reportType === 'purchases') {
      const headers = [
        'Bill Date',
        'Purchase Date',
        'Invoice No',
        'Supplier',
        'Permit No',
        'Document No',
        'Total Bottles',
        'Gross Amount (Rs)',
        'SED Total (Rs)',
        'Discount (Rs)',
        'TCS (Rs)',
        'Net Payable (Rs)',
        'Status'
      ];
      const dataRows = filteredPurchasesData.map(p => [
        p.billDate,
        p.date,
        p.invoiceNo,
        p.supplier,
        p.permitNumber || '',
        p.documentNumber || '',
        p.totalQty,
        p.grossTotal,
        p.sedTotal,
        p.discountTotal,
        p.tcsTotal,
        p.netTotal,
        p.status
      ]);
      exportCsv(`MM_Residency_Purchases_${fromDate}_to_${toDate}.csv`, [headers, ...dataRows]);
    } else if (reportType === 'consolidated') {
      if (isAcUser) {
        const headers = [
          'Date',
          'Counter',
          'Cashier',
          'Helper',
          'Liquor Sales Value (Rs)',
          'AC Charges (Rs)',
          'Cash Received (Rs)',
          'UPI/Card Received (Rs)',
          'Total Received (Rs)',
          'Difference (Rs)',
          'Status'
        ];
        const dataRows = filteredConsolidatedData.map(d => [
          d.date,
          'AC Counter',
          d.aSale?.cashierName || '—',
          d.aSale?.helperName || '—',
          d.acValue,
          d.acCharges,
          d.acCash,
          d.acUpi,
          d.acTotalReceived,
          d.acDiff,
          d.aSale?.status || 'No Report'
        ]);
        exportCsv(`MM_Residency_AC_Consolidated_${fromDate}_to_${toDate}.csv`, [headers, ...dataRows]);
      } else if (isNormalUser) {
        const headers = [
          'Date',
          'Counter',
          'Cashier',
          'Helper',
          'Liquor Sales Value (Rs)',
          'Cash Received (Rs)',
          'UPI/Card Received (Rs)',
          'Total Received (Rs)',
          'Difference (Rs)',
          'Status'
        ];
        const dataRows = filteredConsolidatedData.map(d => [
          d.date,
          'Normal Counter',
          d.nSale?.cashierName || '—',
          d.nSale?.helperName || '—',
          d.normalValue,
          d.normalCash,
          d.normalUpi,
          d.normalTotal,
          d.normalDiff,
          d.nSale?.status || 'No Report'
        ]);
        exportCsv(`MM_Residency_Normal_Consolidated_${fromDate}_to_${toDate}.csv`, [headers, ...dataRows]);
      } else {
        const headers = [
          'Date',
          'Normal Liquor (Rs)',
          'AC Liquor (Rs)',
          'Combined Bar Sales (Rs)',
          'AC Charges (Rs)',
          'Room Rent (Rs)',
          'Expenses (Rs)',
          'Wages (Rs)',
          'Net Surplus (Rs)'
        ];
        const dataRows = filteredConsolidatedData.map(d => [
          d.date,
          d.normalValue,
          d.acValue,
          d.barTotal,
          d.acCharges,
          d.roomRent,
          d.expenses,
          d.wages,
          d.netSurplus
        ]);
        exportCsv(`MM_Residency_Consolidated_Financials_${fromDate}_to_${toDate}.csv`, [headers, ...dataRows]);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const activeCounterView: 'ALL' | 'NORMAL' | 'AC' = isAcUser
    ? 'AC'
    : isNormalUser
    ? 'NORMAL'
    : adminCounterFilter;

  return (
    <div className="space-y-6">
      {/* Print-only formal header */}
      <div className="hidden print:block text-center border-b pb-4 mb-4">
        <h1 className="text-2xl font-black tracking-tight">MM RESIDENCY</h1>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mt-1">
          {isAcUser
            ? 'AC COUNTER FINANCIAL STATEMENT'
            : isNormalUser
            ? 'NORMAL COUNTER FINANCIAL STATEMENT'
            : 'CONSOLIDATED DAILY FINANCIAL STATEMENT'}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Shift Date: <strong>{selectedDate}</strong> · Generated: {new Date().toLocaleString('en-IN')}
        </p>
        <div className="flex justify-center gap-6 mt-2 text-xs font-medium text-slate-800 border-t pt-2">
          {!isAcUser && (
            <div>
              Normal Counter Staff: <strong>{normalSale?.cashierName || '—'} (Cashier)</strong> /{' '}
              <strong>{normalSale?.helperName || '—'} (Helper)</strong>
            </div>
          )}
          {!isNormalUser && (
            <div>
              AC Counter Staff: <strong>{acSale?.cashierName || '—'} (Cashier)</strong> /{' '}
              <strong>{acSale?.helperName || '—'} (Helper)</strong>
            </div>
          )}
        </div>
      </div>

      {/* Screen Header & Mode Switcher */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-[11px] font-extrabold tracking-widest text-amber-600 dark:text-amber-400 uppercase">
            Financial Reconciliation & Intelligence
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {isAcUser
              ? 'AC Counter Financial Report'
              : isNormalUser
              ? 'Normal Counter Financial Report'
              : 'Consolidated Financial Statement'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAcUser
              ? `Day-end liquor turnover, shift AC charges & drawer collections for ${selectedDate}`
              : isNormalUser
              ? `Day-end sales reconciliation and cash drawer balances for ${selectedDate}`
              : `Day-end revenue from Normal Counter, AC Counter, and Room Rent less operating expenses`}
          </p>
        </div>

        {/* Tab switch: Daily Closing vs Date-Range Reports Hub */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => setActiveViewTab('daily')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeViewTab === 'daily'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Daily Closing
            </button>
            <button
              onClick={() => setActiveViewTab('reports')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeViewTab === 'reports'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Date-Range Reports Hub</span>
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* VIEW MODE 1: DAILY CLOSING TAB                           */}
      {/* ======================================================== */}
      {activeViewTab === 'daily' && (
        <div className="space-y-5">
          {/* DATE SELECTOR TOOLBAR FOR DAILY CLOSING */}
          <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Viewing Shift Date:
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => e.target.value && setSelectedDate(e.target.value)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1 font-mono text-xs font-bold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">Quick Dates:</span>
              <button
                type="button"
                onClick={() => setSelectedDate(businessDate)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  selectedDate === businessDate
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Today ({businessDate})
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(businessDate);
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().slice(0, 10));
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  selectedDate !== businessDate
                    ? 'bg-amber-500/20 text-amber-900 dark:text-amber-300 font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Yesterday
              </button>
            </div>
          </div>

          {/* Admin Counter Filter Toggle */}
          {isAdmin && (
            <div className="no-print flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Filter className="h-4 w-4 text-amber-500" />
                <span>Viewing Counter Report:</span>
              </span>
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
                <button
                  onClick={() => setAdminCounterFilter('ALL')}
                  className={`rounded-md px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                    adminCounterFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  All Counters (Consolidated)
                </button>
                <button
                  onClick={() => setAdminCounterFilter('NORMAL')}
                  className={`rounded-md px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                    adminCounterFilter === 'NORMAL'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Normal Counter Only
                </button>
                <button
                  onClick={() => setAdminCounterFilter('AC')}
                  className={`rounded-md px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                    adminCounterFilter === 'AC'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  AC Counter Only
                </button>
              </div>
            </div>
          )}

          {/* STAFF ON DUTY CARD */}
          <div className="no-print rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/40 p-4 shadow-xs dark:border-amber-900/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Staff on Duty ({selectedDate})
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Cashier and Helper personnel recorded on shift submission
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 max-w-xl">
              {activeCounterView !== 'AC' && (
                <div className="rounded-xl border border-amber-200/60 bg-white/80 p-2.5 dark:border-slate-800 dark:bg-slate-800/60">
                  <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Normal Counter</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-semibold flex items-center gap-1 ${
                        normalSale
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {normalSale ? (
                        <>
                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                          <span>{normalSale.status}</span>
                        </>
                      ) : (
                        'No Report'
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 text-xs">
                    <div className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <User className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      <span>Cashier:</span>
                      <strong className="text-slate-900 dark:text-white font-mono">
                        {normalSale?.cashierName || 'Not entered'}
                      </strong>
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Users className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      <span>Helper:</span>
                      <strong className="text-slate-900 dark:text-white font-mono">
                        {normalSale?.helperName || 'Not entered'}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {activeCounterView !== 'NORMAL' && (
                <div className="rounded-xl border border-purple-200/60 bg-white/80 p-2.5 dark:border-slate-800 dark:bg-slate-800/60">
                  <div className="text-[10px] font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>AC Counter</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-semibold flex items-center gap-1 ${
                        acSale
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {acSale ? (
                        <>
                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                          <span>{acSale.status}</span>
                        </>
                      ) : (
                        'No Report'
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 text-xs">
                    <div className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <User className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                      <span>Cashier:</span>
                      <strong className="text-slate-900 dark:text-white font-mono">
                        {acSale?.cashierName || 'Not entered'}
                      </strong>
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Users className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                      <span>Helper:</span>
                      <strong className="text-slate-900 dark:text-white font-mono">
                        {acSale?.helperName || 'Not entered'}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* KEY FINANCIAL TILES (Customized per counter role) */}
          {isAcUser || activeCounterView === 'AC' ? (
            /* AC COUNTER TILES - ROOM RENT AND EXPENSES/WAGES ARE COMPLETELY REMOVED */
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">AC Liquor Sales Value</span>
                <div className="font-mono text-lg font-black text-slate-900 dark:text-white mt-1">
                  {formatCurrency(acValue)}
                </div>
                <span className="text-[10px] text-slate-400">Calculated shift stock sold</span>
              </div>

              <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-4 shadow-xs dark:border-purple-800 dark:bg-purple-950/30">
                <span className="text-[11px] font-bold text-purple-900 dark:text-purple-300 uppercase">AC Charges (₹)</span>
                <div className="font-mono text-lg font-black text-purple-950 dark:text-purple-200 mt-1">
                  {formatCurrency(acCharges)}
                </div>
                <span className="text-[10px] text-purple-700 dark:text-purple-300">Shift AC charges entered</span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Cash Received</span>
                <div className="font-mono text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatCurrency(acCash)}
                </div>
                <span className="text-[10px] text-slate-400">Drawer physical cash</span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">UPI / Card Received</span>
                <div className="font-mono text-lg font-black text-blue-600 dark:text-blue-400 mt-1">
                  {formatCurrency(acUpi)}
                </div>
                <span className="text-[10px] text-slate-400">Digital collections</span>
              </div>

              <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-4 shadow-xs dark:border-emerald-800 dark:bg-emerald-950/30 col-span-2 sm:col-span-1">
                <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 uppercase">Total Received</span>
                <div className="font-mono text-xl font-black text-emerald-950 dark:text-emerald-200 mt-1">
                  {formatCurrency(acTotalReceived)}
                </div>
                <span className="text-[10px] text-emerald-800 dark:text-emerald-300">
                  Diff: {Math.abs(acDiff) > 0.009 ? formatCurrency(acDiff) : '✓ Matches'}
                </span>
              </div>
            </div>
          ) : isNormalUser || activeCounterView === 'NORMAL' ? (
            /* NORMAL COUNTER TILES */
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Normal Liquor Sales</span>
                <div className="font-mono text-lg font-black text-slate-900 dark:text-white mt-1">
                  {formatCurrency(normalValue)}
                </div>
                <span className="text-[10px] text-slate-400">Calculated stock sold</span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Cash Received</span>
                <div className="font-mono text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatCurrency(normalCash)}
                </div>
                <span className="text-[10px] text-slate-400">Drawer physical cash</span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">UPI / Card Received</span>
                <div className="font-mono text-lg font-black text-blue-600 dark:text-blue-400 mt-1">
                  {formatCurrency(normalUpi)}
                </div>
                <span className="text-[10px] text-slate-400">Digital collections</span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Money Received</span>
                <div className="font-mono text-xl font-black text-slate-900 dark:text-white mt-1">
                  {formatCurrency(normalTotalReceived)}
                </div>
                <span className="text-[10px] text-slate-400">
                  Diff: {Math.abs(normalDiff) > 0.009 ? formatCurrency(normalDiff) : '✓ Matches'}
                </span>
              </div>
            </div>
          ) : (
            /* ADMIN ALL COUNTERS COMBINED TILES */
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Combined Bar Sales</span>
                <div className="font-mono text-lg font-black text-slate-900 dark:text-white mt-1">
                  {formatCurrency(totalSalesValue)}
                </div>
                <span className="text-[10px] text-slate-400">Norm: {formatCurrency(normalValue)} · AC: {formatCurrency(acValue)}</span>
              </div>

              <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 shadow-xs dark:border-purple-800 dark:bg-purple-950/20">
                <span className="text-[11px] font-semibold text-purple-900 dark:text-purple-300">AC Charges</span>
                <div className="font-mono text-lg font-black text-purple-950 dark:text-purple-200 mt-1">
                  {formatCurrency(totalAcCharges)}
                </div>
                <span className="text-[10px] text-purple-600">Shift AC service charges</span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Room Rent Total</span>
                <div className="font-mono text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatCurrency(totalRoomRent)}
                </div>
                <span className="text-[10px] text-slate-400">{roomOps.length} rooms rented</span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Expenses & Wages</span>
                <div className="font-mono text-lg font-black text-red-600 dark:text-red-400 mt-1">
                  {formatCurrency(totalOutflows)}
                </div>
                <span className="text-[10px] text-slate-400">Exp: {formatCurrency(totalExpenses)} · Wage: {formatCurrency(totalWages)}</span>
              </div>

              <div className="col-span-2 sm:col-span-1 rounded-xl border border-amber-300 bg-amber-50/70 p-4 shadow-xs dark:border-amber-700/60 dark:bg-amber-950/30">
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                  Net Surplus Day Cash
                </span>
                <div className="font-mono text-xl font-black text-amber-950 dark:text-amber-200 mt-1">
                  {formatCurrency(netSurplus)}
                </div>
                <span className="text-[10px] text-amber-800 dark:text-amber-300">All inflows minus outflows</span>
              </div>
            </div>
          )}

          {/* COUNTER SALES RECONCILIATION TABLE */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isAcUser
                    ? `AC Counter Daily Reconciliation (${selectedDate})`
                    : isNormalUser
                    ? `Normal Counter Daily Reconciliation (${selectedDate})`
                    : `Counter Sales Reconciliation (${selectedDate})`}
                </h2>
                <span className="text-[11px] text-slate-500">Live reflection of submitted counter shifts</span>
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                Auto-Approved Live Feed
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 font-bold uppercase text-[10px] text-slate-600 dark:text-slate-400">
                    <th className="py-3 px-4">Counter Location</th>
                    <th className="py-3 px-4">Liquor Calculated Value</th>
                    {(isAcUser || activeCounterView === 'AC' || activeCounterView === 'ALL') && (
                      <th className="py-3 px-4 bg-purple-50/50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-200">
                        AC Charges (₹)
                      </th>
                    )}
                    <th className="py-3 px-4">Cash Received</th>
                    <th className="py-3 px-4">UPI / Card Received</th>
                    <th className="py-3 px-4 bg-emerald-50/40 dark:bg-emerald-950/20 font-bold">Total Received</th>
                    <th className="py-3 px-4">Difference</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {/* Normal Counter Row (Hidden for AC user) */}
                  {activeCounterView !== 'AC' && (
                    <tr>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">Normal Counter</td>
                      <td className="py-3 px-4 font-mono font-bold">{formatCurrency(normalValue)}</td>
                      {activeCounterView === 'ALL' && (
                        <td className="py-3 px-4 text-slate-400 font-mono">—</td>
                      )}
                      <td className="py-3 px-4 font-mono">{formatCurrency(normalCash)}</td>
                      <td className="py-3 px-4 font-mono">{formatCurrency(normalUpi)}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10">
                        {formatCurrency(normalTotalReceived)}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {Math.abs(normalDiff) > 0.009 ? (
                          <span className="text-red-600 font-bold">{formatCurrency(normalDiff)}</span>
                        ) : (
                          <span className="text-emerald-600">✓ Matches</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            normalSale
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {normalSale ? normalSale.status : 'No Report'}
                        </span>
                      </td>
                    </tr>
                  )}

                  {/* AC Counter Row (Hidden for Normal user) */}
                  {activeCounterView !== 'NORMAL' && (
                    <tr className="bg-purple-50/20 dark:bg-purple-950/10">
                      <td className="py-3 px-4 font-bold text-purple-900 dark:text-purple-300">
                        AC Counter
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">{formatCurrency(acValue)}</td>
                      <td className="py-3 px-4 font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50/40 dark:bg-purple-950/30">
                        {formatCurrency(acCharges)}
                      </td>
                      <td className="py-3 px-4 font-mono">{formatCurrency(acCash)}</td>
                      <td className="py-3 px-4 font-mono">{formatCurrency(acUpi)}</td>
                      <td className="py-3 px-4 font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20">
                        {formatCurrency(acTotalReceived)}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {Math.abs(acDiff) > 0.009 ? (
                          <span className="text-red-600 font-bold">{formatCurrency(acDiff)}</span>
                        ) : (
                          <span className="text-emerald-600">✓ Matches</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            acSale
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {acSale ? acSale.status : 'No Report'}
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* Combined Footer only shown when viewing All Counters */}
                {activeCounterView === 'ALL' && (
                  <tfoot>
                    <tr className="border-t font-bold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">
                      <td className="py-3 px-4">COMBINED BAR TOTAL</td>
                      <td className="py-3 px-4 font-mono">{formatCurrency(totalSalesValue)}</td>
                      <td className="py-3 px-4 font-mono text-purple-700 dark:text-purple-300">{formatCurrency(totalAcCharges)}</td>
                      <td className="py-3 px-4 font-mono">{formatCurrency(totalSalesCash)}</td>
                      <td className="py-3 px-4 font-mono">{formatCurrency(totalSalesUpi)}</td>
                      <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(totalCombinedReceived)}
                      </td>
                      <td className="py-3 px-4 font-mono">{formatCurrency(normalDiff + acDiff)}</td>
                      <td className="py-3 px-4 text-slate-500 text-[10px]">Verified</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* LODGING AND OPERATING OUTFLOWS (REMOVED FROM AC COUNTER AS REQUESTED) */}
          {!isAcUser && activeCounterView !== 'AC' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Room Rent Detail */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                <div className="flex items-center justify-between border-b pb-2 dark:border-slate-800">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Room Lodging Collections ({selectedDate})
                  </h3>
                  <span className="font-mono text-xs font-bold text-emerald-600">
                    Total: {formatCurrency(totalRoomRent)}
                  </span>
                </div>

                {roomOps.length > 0 ? (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {roomOps.map(r => (
                      <div key={r.operationId} className="py-2 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">Room {r.roomNo}</span>
                          <span className="text-slate-500 ml-2">
                            ({r.name} · {r.payment})
                          </span>
                        </div>
                        <span className="font-mono font-bold">{formatCurrency(r.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-3 text-center">No room rent recorded for {selectedDate}.</p>
                )}
              </div>

              {/* Expenses & Wages Detail */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                <div className="flex items-center justify-between border-b pb-2 dark:border-slate-800">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Operating Deductions ({selectedDate})
                  </h3>
                  <span className="font-mono text-xs font-bold text-red-600">
                    Total: -{formatCurrency(totalOutflows)}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  {expenseOps.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expenses</span>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-1">
                        {expenseOps.map(e => (
                          <div key={e.operationId} className="py-1.5 flex justify-between">
                            <span className="text-slate-700 dark:text-slate-300">{e.name}</span>
                            <span className="font-mono text-red-600 font-semibold">{formatCurrency(e.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {wageOps.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Helper & Staff Wages
                      </span>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-1">
                        {wageOps.map(w => (
                          <div key={w.operationId} className="py-1.5 flex justify-between">
                            <span className="text-slate-700 dark:text-slate-300">{w.name}</span>
                            <span className="font-mono text-red-600 font-semibold">{formatCurrency(w.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {expenseOps.length === 0 && wageOps.length === 0 && (
                    <p className="text-xs text-slate-400 py-3 text-center">
                      No expenses or wages recorded for {selectedDate}.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Signature lines for printed version */}
          <div className="hidden print:flex items-center justify-between pt-12 text-xs font-bold border-t border-slate-300">
            {!isAcUser && <div>Normal Counter Cashier: ____________________</div>}
            {!isNormalUser && <div>AC Counter Cashier: ____________________</div>}
            <div>Shop Admin / Proprietor: ____________________</div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW MODE 2: DATE-RANGE REPORTS & DOWNLOADS HUB          */}
      {/* ======================================================== */}
      {activeViewTab === 'reports' && (
        <div className="space-y-6">
          {/* Filter & Calendar Selection Controls Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Report Configuration & Period Filter
                </h3>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">Presets:</span>
                <button
                  type="button"
                  onClick={() => applyDatePreset('today')}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Daily (Today)
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('yesterday')}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('week')}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Weekly (7 Days)
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('month')}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Monthly (This Month)
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('last30')}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Last 30 Days
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Report Type */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Report Type
                </label>
                <select
                  value={reportType}
                  onChange={e => setReportType(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="sales">Liquor Sales Report (Itemized)</option>
                  {isAdmin && <option value="purchases">Purchases Report (Godown Stock-In)</option>}
                  <option value="consolidated">Consolidated Financial Statement</option>
                </select>
              </div>

              {/* From Date Calendar */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => e.target.value && setFromDate(e.target.value)}
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
                  value={toDate}
                  onChange={e => e.target.value && setToDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2 font-mono text-xs font-bold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
                />
              </div>

              {/* Counter Filter (Admin only, locked for counter staff) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Counter Scope
                </label>
                {isAdmin ? (
                  <select
                    value={hubCounterFilter}
                    onChange={e => setHubCounterFilter(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="ALL">All Counters</option>
                    <option value="NORMAL">Normal Counter Only</option>
                    <option value="AC">AC Counter Only</option>
                  </select>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-100 p-2 font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {isAcUser ? 'AC Counter Only' : 'Normal Counter Only'}
                  </div>
                )}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Period: <strong className="text-slate-900 dark:text-white font-mono">{fromDate}</strong> to{' '}
                <strong className="text-slate-900 dark:text-white font-mono">{toDate}</strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadReport}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  <ArrowDownToLine className="h-4 w-4" />
                  <span>Download CSV Report</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Period</span>
                </button>
              </div>
            </div>
          </div>

          {/* ======================================= */}
          {/* PREVIEW 1: LIQUOR SALES REPORT          */}
          {/* ======================================= */}
          {reportType === 'sales' && (
            <div className="space-y-4">
              {/* Quick Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total Bottles Sold</span>
                  <div className="font-mono text-xl font-black text-slate-900 dark:text-white mt-0.5">
                    {filteredSalesData.reduce((s, r) => s + r.sold, 0)} btls
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Liquor Sales Revenue</span>
                  <div className="font-mono text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatCurrency(filteredSalesData.reduce((s, r) => s + r.value, 0))}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Distinct Shifts / Reports</span>
                  <div className="font-mono text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
                    {new Set(filteredSalesData.map(r => r.reportId)).size} reports
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Report Lines Sold</span>
                  <div className="font-mono text-xl font-black text-slate-900 dark:text-white mt-0.5">
                    {filteredSalesData.length} records
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Liquor Sales Report Data Preview ({filteredSalesData.length} records)
                  </h4>
                  <span className="text-[11px] text-slate-400">Click Download CSV above to export</span>
                </div>
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 font-bold uppercase text-[10px] text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Counter</th>
                        <th className="py-2.5 px-3">Staff On Duty</th>
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 text-right">Sold Qty</th>
                        <th className="py-2.5 px-3 text-right">MRP</th>
                        <th className="py-2.5 px-3 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredSalesData.length > 0 ? (
                        filteredSalesData.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-mono font-semibold">{r.date}</td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  r.counter === 'NORMAL'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                }`}
                              >
                                {r.counter}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                              {r.cashier} / {r.helper}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                              {r.productName} <span className="text-[10px] text-slate-400 font-normal">({r.sizeML}ml)</span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">{r.category}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-blue-600 dark:text-blue-400">
                              {r.sold}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(r.price)}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                              {formatCurrency(r.value)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                            No sales records found for the selected period ({fromDate} to {toDate}).
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* PREVIEW 2: PURCHASES REPORT             */}
          {/* ======================================= */}
          {reportType === 'purchases' && isAdmin && (
            <div className="space-y-4">
              {/* Quick Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total Invoices</span>
                  <div className="font-mono text-xl font-black text-slate-900 dark:text-white mt-0.5">
                    {filteredPurchasesData.length} bills
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Bottles Purchased</span>
                  <div className="font-mono text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
                    {filteredPurchasesData.reduce((s, p) => s + p.totalQty, 0)} btls
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Gross Purchase Value</span>
                  <div className="font-mono text-xl font-black text-slate-900 dark:text-white mt-0.5">
                    {formatCurrency(filteredPurchasesData.reduce((s, p) => s + p.grossTotal, 0))}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Net Payable Spend</span>
                  <div className="font-mono text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatCurrency(filteredPurchasesData.reduce((s, p) => s + p.netTotal, 0))}
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Purchase Invoices Preview ({filteredPurchasesData.length} invoices)
                  </h4>
                  <span className="text-[11px] text-slate-400">Click Download CSV above to export</span>
                </div>
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 font-bold uppercase text-[10px] text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Bill Date</th>
                        <th className="py-2.5 px-3">Supplier</th>
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Permit No</th>
                        <th className="py-2.5 px-3 text-right">Bottles</th>
                        <th className="py-2.5 px-3 text-right">Gross (₹)</th>
                        <th className="py-2.5 px-3 text-right">SED (₹)</th>
                        <th className="py-2.5 px-3 text-right">Net Payable (₹)</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredPurchasesData.length > 0 ? (
                        filteredPurchasesData.map((p, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-mono font-semibold">{p.billDate}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{p.supplier}</td>
                            <td className="py-2.5 px-3 font-mono font-semibold">{p.invoiceNo}</td>
                            <td className="py-2.5 px-3 text-slate-500">{p.permitNumber || '—'}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                              {p.totalQty} btls
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(p.grossTotal)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                              {formatCurrency(p.sedTotal)}
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
                          <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                            No purchases recorded between {fromDate} and {toDate}.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* PREVIEW 3: CONSOLIDATED STATEMENT       */}
          {/* ======================================= */}
          {reportType === 'consolidated' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    {isAcUser
                      ? 'AC Counter Daily Consolidated Statement'
                      : isNormalUser
                      ? 'Normal Counter Daily Consolidated Statement'
                      : 'All Counters Consolidated Financial Statement'}
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Showing {filteredConsolidatedData.length} date entries
                  </span>
                </div>
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 font-bold uppercase text-[10px] text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        {isAcUser ? (
                          <>
                            <th className="py-2.5 px-3">Liquor Sales</th>
                            <th className="py-2.5 px-3 text-purple-900 dark:text-purple-300">AC Charges (₹)</th>
                            <th className="py-2.5 px-3">Cash</th>
                            <th className="py-2.5 px-3">UPI</th>
                            <th className="py-2.5 px-3 text-right bg-emerald-50 dark:bg-emerald-950 font-bold">
                              Total Received
                            </th>
                            <th className="py-2.5 px-3">Diff</th>
                            <th className="py-2.5 px-3">Status</th>
                          </>
                        ) : isNormalUser ? (
                          <>
                            <th className="py-2.5 px-3">Liquor Sales</th>
                            <th className="py-2.5 px-3">Cash</th>
                            <th className="py-2.5 px-3">UPI</th>
                            <th className="py-2.5 px-3 text-right font-bold">Total Received</th>
                            <th className="py-2.5 px-3">Diff</th>
                            <th className="py-2.5 px-3">Status</th>
                          </>
                        ) : (
                          <>
                            <th className="py-2.5 px-3">Normal Liquor</th>
                            <th className="py-2.5 px-3">AC Liquor</th>
                            <th className="py-2.5 px-3 text-purple-900 dark:text-purple-300">AC Charges</th>
                            <th className="py-2.5 px-3">Bar Turnover</th>
                            <th className="py-2.5 px-3">Room Rent</th>
                            <th className="py-2.5 px-3 text-red-600">Expenses</th>
                            <th className="py-2.5 px-3 text-red-600">Wages</th>
                            <th className="py-2.5 px-3 text-right bg-amber-50 dark:bg-amber-950 font-bold">
                              Net Surplus
                            </th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredConsolidatedData.map((d, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-mono font-semibold">{d.date}</td>
                          {isAcUser ? (
                            <>
                              <td className="py-2.5 px-3 font-mono font-bold">{formatCurrency(d.acValue)}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-purple-700 dark:text-purple-300">
                                {formatCurrency(d.acCharges)}
                              </td>
                              <td className="py-2.5 px-3 font-mono">{formatCurrency(d.acCash)}</td>
                              <td className="py-2.5 px-3 font-mono">{formatCurrency(d.acUpi)}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/20">
                                {formatCurrency(d.acTotalReceived)}
                              </td>
                              <td className="py-2.5 px-3 font-mono">
                                {Math.abs(d.acDiff) > 0.009 ? (
                                  <span className="text-red-600 font-bold">{formatCurrency(d.acDiff)}</span>
                                ) : (
                                  <span className="text-emerald-600">✓</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="text-[10px] font-bold text-emerald-600">
                                  {d.aSale ? d.aSale.status : 'No Report'}
                                </span>
                              </td>
                            </>
                          ) : isNormalUser ? (
                            <>
                              <td className="py-2.5 px-3 font-mono font-bold">{formatCurrency(d.normalValue)}</td>
                              <td className="py-2.5 px-3 font-mono">{formatCurrency(d.normalCash)}</td>
                              <td className="py-2.5 px-3 font-mono">{formatCurrency(d.normalUpi)}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                                {formatCurrency(d.normalTotal)}
                              </td>
                              <td className="py-2.5 px-3 font-mono">
                                {Math.abs(d.normalDiff) > 0.009 ? (
                                  <span className="text-red-600 font-bold">{formatCurrency(d.normalDiff)}</span>
                                ) : (
                                  <span className="text-emerald-600">✓</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="text-[10px] font-bold text-emerald-600">
                                  {d.nSale ? d.nSale.status : 'No Report'}
                                </span>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-2.5 px-3 font-mono">{formatCurrency(d.normalValue)}</td>
                              <td className="py-2.5 px-3 font-mono">{formatCurrency(d.acValue)}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-purple-700 dark:text-purple-300">
                                {formatCurrency(d.acCharges)}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold">{formatCurrency(d.barTotal)}</td>
                              <td className="py-2.5 px-3 font-mono text-emerald-600">{formatCurrency(d.roomRent)}</td>
                              <td className="py-2.5 px-3 font-mono text-red-600">{formatCurrency(d.expenses)}</td>
                              <td className="py-2.5 px-3 font-mono text-red-600">{formatCurrency(d.wages)}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-black text-amber-950 dark:text-amber-200 bg-amber-50/20 dark:bg-amber-950/20">
                                {formatCurrency(d.netSurplus)}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
