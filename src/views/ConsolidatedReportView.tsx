import React from 'react';
import { useStock } from '../context/StockContext';
import { Printer, Calendar, FileText, CheckCircle2, User, Users, UserCheck } from 'lucide-react';

export const ConsolidatedReportView: React.FC = () => {
  const { businessDate, dailySales, operations } = useStock();

  const formatCurrency = (val: number) => '₹' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Approved sales on this date
  const normalSale = dailySales.find(r => r.counter === 'NORMAL' && r.date === businessDate && r.status === 'Approved');
  const acSale = dailySales.find(r => r.counter === 'AC' && r.date === businessDate && r.status === 'Approved');

  const normalCash = normalSale?.cashAmount || 0;
  const normalUpi = (normalSale?.upiAmount || 0) + (normalSale?.cardAmount || 0);
  const normalValue = normalSale?.totalSalesValue || 0;
  const normalDiff = normalSale?.paymentDifference || 0;

  const acCash = acSale?.cashAmount || 0;
  const acUpi = (acSale?.upiAmount || 0) + (acSale?.cardAmount || 0);
  const acValue = acSale?.totalSalesValue || 0;
  const acDiff = acSale?.paymentDifference || 0;

  const totalSalesCash = normalCash + acCash;
  const totalSalesUpi = normalUpi + acUpi;
  const totalSalesValue = normalValue + acValue;

  // Approved Room Rent on this date
  const roomOps = operations.filter(o => o.type === 'ROOM' && o.date === businessDate && o.status === 'Approved');
  const roomCash = roomOps.filter(r => r.payment === 'Cash').reduce((s, r) => s + r.amount, 0);
  const roomUpi = roomOps.filter(r => r.payment === 'UPI' || r.payment === 'Card').reduce((s, r) => s + r.amount, 0);
  const totalRoomRent = roomCash + roomUpi;

  // Approved Expenses and Wages on this date
  const expenseOps = operations.filter(o => o.type === 'EXPENSE' && o.date === businessDate && o.status === 'Approved');
  const wageOps = operations.filter(o => o.type === 'WAGE' && o.date === businessDate && o.status === 'Approved');

  const totalExpenses = expenseOps.reduce((s, o) => s + o.amount, 0);
  const totalWages = wageOps.reduce((s, o) => s + o.amount, 0);
  const totalOutflows = totalExpenses + totalWages;

  // Gross and Net Collections
  const totalInflows = totalSalesCash + totalSalesUpi + totalRoomRent;
  const netSurplus = totalInflows - totalOutflows;

  // Pending records on this date
  const pendingSales = dailySales.filter(r => r.date === businessDate && r.status === 'Pending');
  const pendingOps = operations.filter(o => o.date === businessDate && o.status === 'Pending');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print-only formal header */}
      <div className="hidden print:block text-center border-b pb-4 mb-4">
        <h1 className="text-2xl font-black tracking-tight">MM RESIDENCY</h1>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mt-1">
          CONSOLIDATED DAILY FINANCIAL STATEMENT
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Business Date: <strong>{businessDate}</strong> · Generated: {new Date().toLocaleString('en-IN')}
        </p>
        <div className="flex justify-center gap-6 mt-2 text-xs font-medium text-slate-800 border-t pt-2">
          <div>Normal Counter Staff: <strong>{normalSale?.cashierName || '—'} (Cashier)</strong> / <strong>{normalSale?.helperName || '—'} (Helper)</strong></div>
          <div>AC Counter Staff: <strong>{acSale?.cashierName || '—'} (Cashier)</strong> / <strong>{acSale?.helperName || '—'} (Helper)</strong></div>
        </div>
      </div>

      {/* Screen Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-[11px] font-extrabold tracking-widest text-amber-600 dark:text-amber-400 uppercase">
            Financial Reconciliation
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Consolidated Daily Report
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Combined day-end revenue from Normal Counter, AC Counter, and Room Rent less operating expenses
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 transition-colors"
        >
          <Printer className="h-4 w-4" />
          <span>Print Daily Closing Statement</span>
        </button>
      </div>

      {/* Staff on Duty at the top */}
      <div className="no-print rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/40 p-4 shadow-xs dark:border-amber-900/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Staff on Duty ({businessDate})
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Assigned Cashier and Helper personnel recorded on counter closures
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 max-w-xl">
          <div className="rounded-xl border border-amber-200/60 bg-white/80 p-2.5 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Normal Counter</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${normalSale ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-500'}`}>
                {normalSale ? normalSale.status : 'No Report'}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 text-xs">
              <div className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <User className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                <span>Cashier:</span>
                <strong className="text-slate-900 dark:text-white font-mono">{normalSale?.cashierName || 'Not entered'}</strong>
              </div>
              <div className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Users className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                <span>Helper:</span>
                <strong className="text-slate-900 dark:text-white font-mono">{normalSale?.helperName || 'Not entered'}</strong>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-purple-200/60 bg-white/80 p-2.5 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="text-[10px] font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>AC Counter</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${acSale ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-500'}`}>
                {acSale ? acSale.status : 'No Report'}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 text-xs">
              <div className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <User className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                <span>Cashier:</span>
                <strong className="text-slate-900 dark:text-white font-mono">{acSale?.cashierName || 'Not entered'}</strong>
              </div>
              <div className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Users className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                <span>Helper:</span>
                <strong className="text-slate-900 dark:text-white font-mono">{acSale?.helperName || 'Not entered'}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Financial Tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Bar Sales Cash</span>
          <div className="font-mono text-lg font-black text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalSalesCash)}
          </div>
          <span className="text-[10px] text-slate-400">Physical drawer cash</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Bar Sales UPI/Card</span>
          <div className="font-mono text-lg font-black text-blue-600 dark:text-blue-400 mt-1">
            {formatCurrency(totalSalesUpi)}
          </div>
          <span className="text-[10px] text-slate-400">Digital receipts</span>
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
            Net Surplus After Exp
          </span>
          <div className="font-mono text-xl font-black text-amber-950 dark:text-amber-200 mt-1">
            {formatCurrency(netSurplus)}
          </div>
          <span className="text-[10px] text-amber-800 dark:text-amber-300">Net day cashflow</span>
        </div>
      </div>

      {/* Counter Breakdown Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Counter Sales Reconciliation ({businessDate})
          </h2>
          <span className="text-xs text-slate-500">Only approved daily reports</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 font-bold uppercase text-[10px] text-slate-600 dark:text-slate-400">
                <th className="py-3 px-4">Counter Location</th>
                <th className="py-3 px-4">Calculated Value</th>
                <th className="py-3 px-4">Cash Received</th>
                <th className="py-3 px-4">UPI / Card Received</th>
                <th className="py-3 px-4">Total Received</th>
                <th className="py-3 px-4">Difference</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr>
                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">Normal Counter</td>
                <td className="py-3 px-4 font-mono font-bold">{formatCurrency(normalValue)}</td>
                <td className="py-3 px-4 font-mono">{formatCurrency(normalCash)}</td>
                <td className="py-3 px-4 font-mono">{formatCurrency(normalUpi)}</td>
                <td className="py-3 px-4 font-mono font-bold">{formatCurrency(normalCash + normalUpi)}</td>
                <td className="py-3 px-4 font-mono">
                  {Math.abs(normalDiff) > 0.009 ? (
                    <span className="text-red-600 font-bold">{formatCurrency(normalDiff)}</span>
                  ) : (
                    <span className="text-emerald-600">✓ Matches</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    normalSale ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {normalSale ? normalSale.status : 'No Approved Report'}
                  </span>
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">AC Counter</td>
                <td className="py-3 px-4 font-mono font-bold">{formatCurrency(acValue)}</td>
                <td className="py-3 px-4 font-mono">{formatCurrency(acCash)}</td>
                <td className="py-3 px-4 font-mono">{formatCurrency(acUpi)}</td>
                <td className="py-3 px-4 font-mono font-bold">{formatCurrency(acCash + acUpi)}</td>
                <td className="py-3 px-4 font-mono">
                  {Math.abs(acDiff) > 0.009 ? (
                    <span className="text-red-600 font-bold">{formatCurrency(acDiff)}</span>
                  ) : (
                    <span className="text-emerald-600">✓ Matches</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    acSale ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {acSale ? acSale.status : 'No Approved Report'}
                  </span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t font-bold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">
                <td className="py-3 px-4">COMBINED BAR TOTAL</td>
                <td className="py-3 px-4 font-mono">{formatCurrency(totalSalesValue)}</td>
                <td className="py-3 px-4 font-mono">{formatCurrency(totalSalesCash)}</td>
                <td className="py-3 px-4 font-mono">{formatCurrency(totalSalesUpi)}</td>
                <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalSalesCash + totalSalesUpi)}
                </td>
                <td className="py-3 px-4 font-mono">
                  {formatCurrency(normalDiff + acDiff)}
                </td>
                <td className="py-3 px-4 text-slate-500 text-[10px]">Verified</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Lodging and Operating Outflows Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Room Rent Detail */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex items-center justify-between border-b pb-2 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Room Lodging Collections
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
                    <span className="text-slate-500 ml-2">({r.name} · {r.payment})</span>
                  </div>
                  <span className="font-mono font-bold">{formatCurrency(r.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-3 text-center">No room rent recorded for {businessDate}.</p>
          )}
        </div>

        {/* Expenses & Wages Detail */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex items-center justify-between border-b pb-2 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Operating Deductions (Expenses & Wages)
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
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Helper & Staff Wages</span>
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
              <p className="text-xs text-slate-400 py-3 text-center">No expenses or wages recorded for {businessDate}.</p>
            )}
          </div>
        </div>
      </div>

      {/* Signature lines for printed version */}
      <div className="hidden print:flex items-center justify-between pt-12 text-xs font-bold border-t border-slate-300">
        <div>Normal Counter Cashier: ____________________</div>
        <div>AC Counter Cashier: ____________________</div>
        <div>Shop Admin / Owner: ____________________</div>
      </div>
    </div>
  );
};
