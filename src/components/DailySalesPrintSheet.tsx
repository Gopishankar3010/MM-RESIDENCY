import React from 'react';
import { CounterLocation, DailyOperation, DailySalesReport } from '../types';
import { getReportReconciliation, roundCurrency } from '../utils/reconciliation';

const formatCurrency = (val: number) =>
  '₹' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface PrintableDailySalesSheetProps {
  report: DailySalesReport;
  operations: DailyOperation[];
}

export const PrintableDailySalesSheet: React.FC<PrintableDailySalesSheetProps> = ({ report, operations }) => {
  const viewRec = getReportReconciliation(report, operations);
  const soldLines = report.lines.filter(l => l.sold > 0);

  return (
    <div className="hidden print:block print-only space-y-4">
      <div className="print-header text-center">
        <h1 className="text-xl font-black tracking-tight">MM RESIDENCY – DAILY SALES REPORT</h1>
        <h2 className="text-sm font-bold uppercase tracking-wider mt-1">
          {report.counter === 'NORMAL' ? 'NORMAL COUNTER' : 'AC COUNTER'} · {report.date}
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          Report ID: <strong>{report.reportId}</strong> · Status: <strong>{report.status}</strong> · Submitted by {report.submittedBy} ({report.submittedAt})
        </p>
      </div>

      <div className="print-card grid grid-cols-2 gap-3 text-xs">
        <div>
          <div><strong>Cashier:</strong> {report.cashierName || '—'}</div>
          <div><strong>Helper:</strong> {report.helperName || '—'}</div>
          {report.editedBy && (
            <div><strong>Last Edited:</strong> {report.editedBy} ({report.editedAt})</div>
          )}
          <div><strong>Printed:</strong> {new Date().toLocaleString('en-IN')}</div>
        </div>
        <div className="text-right font-mono tabular-nums">
          <div><strong>Bottles Sold:</strong> {report.totalSoldQty} btls</div>
          <div><strong>Liquor Sales:</strong> {formatCurrency(report.totalSalesValue)}</div>
          {viewRec.shopOutflowsCredited > 0 && (
            <>
              <div><strong>Less Shop Expenses &amp; Wages (Normal Cash):</strong> -{formatCurrency(viewRec.shopOutflowsCredited)}</div>
              <div><strong>Expected Drawer Total:</strong> {formatCurrency(viewRec.expectedDrawerTotal)}</div>
            </>
          )}
          {report.counter === 'AC' && (
            <div><strong>AC Charges:</strong> {formatCurrency(report.acCharges || 0)}</div>
          )}
          <div>
            <strong>Cash / UPI:</strong> {formatCurrency(report.cashAmount)} / {formatCurrency(report.upiAmount + (report.cardAmount || 0))}
          </div>
          <div><strong>Total Collected:</strong> {formatCurrency(report.recordedAmount)}</div>
          <div>
            <strong>Staff Difference:</strong>{' '}
            {Math.abs(viewRec.staffDifference) <= 0.009
              ? 'Exact Match (0.00)'
              : `${viewRec.staffDifference > 0 ? '+' : ''}${formatCurrency(viewRec.staffDifference)}`}
          </div>
        </div>
      </div>

      {report.remark && (
        <div className="print-card text-xs">
          <strong>Notes / Audit:</strong> {report.remark}
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
            {soldLines.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-4">
                  No bottles sold recorded in this shift.
                </td>
              </tr>
            ) : (
              soldLines.map((l, idx) => (
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
              <td className="font-mono font-bold">{report.totalSoldQty}</td>
              <td></td>
              <td className="font-mono font-bold text-right">{formatCurrency(report.totalSalesValue)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="print-avoid-break grid grid-cols-3 gap-8 pt-8 text-center text-xs">
        <div className="border-t border-slate-400 pt-1.5">Cashier Signature</div>
        <div className="border-t border-slate-400 pt-1.5">Helper Signature</div>
        <div className="border-t border-slate-400 pt-1.5">Manager / Admin Signature</div>
      </div>
    </div>
  );
};

interface PrintableConsolidatedShiftSheetProps {
  date: string;
  counterScope: CounterLocation | 'ALL';
  normalSale: DailySalesReport | null;
  acSale: DailySalesReport | null;
  operations: DailyOperation[];
}

export const PrintableConsolidatedShiftSheet: React.FC<PrintableConsolidatedShiftSheetProps> = ({
  date,
  counterScope,
  normalSale,
  acSale,
  operations
}) => {
  const isAcOnly = counterScope === 'AC';
  const isNormalOnly = counterScope === 'NORMAL';

  const normalRec = normalSale ? getReportReconciliation(normalSale, operations) : null;
  const normalCash = normalSale?.cashAmount || 0;
  const normalUpi = (normalSale?.upiAmount || 0) + (normalSale?.cardAmount || 0);
  const normalValue = normalSale?.totalSalesValue || 0;
  const normalTotalReceived = normalCash + normalUpi;
  const normalShopOutflowsCredited = normalRec ? normalRec.shopOutflowsCredited : 0;
  const normalDiff = normalRec ? normalRec.staffDifference : 0;

  const acRec = acSale ? getReportReconciliation(acSale, operations) : null;
  const acCash = acSale?.cashAmount || 0;
  const acUpi = (acSale?.upiAmount || 0) + (acSale?.cardAmount || 0);
  const acCharges = acSale?.acCharges || 0;
  const acValue = acSale?.totalSalesValue || 0;
  const acTotalReceived = acCash + acUpi + acCharges;
  const acDiff = acRec ? acRec.staffDifference : 0;

  const roomOps = operations.filter(o => o.type === 'ROOM' && o.date === date && o.status === 'Approved');
  const roomCash = roomOps.filter(r => r.payment === 'Cash').reduce((s, r) => s + r.amount, 0);
  const roomUpi = roomOps.filter(r => r.payment === 'UPI' || r.payment === 'Card').reduce((s, r) => s + r.amount, 0);
  const totalRoomRent = roomCash + roomUpi;

  const expenseOps = operations.filter(o => o.type === 'EXPENSE' && o.date === date && o.status === 'Approved');
  const wageOps = operations.filter(o => o.type === 'WAGE' && o.date === date && o.status === 'Approved');
  const totalExpenses = expenseOps.reduce((s, o) => s + o.amount, 0);
  const totalWages = wageOps.reduce((s, o) => s + o.amount, 0);
  const totalOutflows = roundCurrency(totalExpenses + totalWages);
  const unabsorbedOutflows = Math.max(0, roundCurrency(totalOutflows - normalShopOutflowsCredited));

  const totalSalesCash = normalCash + acCash;
  const totalSalesUpi = normalUpi + acUpi;
  const totalSalesValue = normalValue + acValue;
  const totalCombinedReceived = normalTotalReceived + acTotalReceived;
  const totalInflows = roundCurrency(totalSalesCash + totalSalesUpi + totalRoomRent + acCharges);
  const netSurplus = roundCurrency(totalInflows - unabsorbedOutflows);

  return (
    <div className="hidden print:block print-only space-y-4">
      <div className="print-header text-center">
        <h1 className="text-2xl font-black tracking-tight">MM RESIDENCY</h1>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mt-1">
          {isAcOnly
            ? 'AC COUNTER FINANCIAL STATEMENT'
            : isNormalOnly
            ? 'NORMAL COUNTER FINANCIAL STATEMENT'
            : 'CONSOLIDATED DAILY FINANCIAL STATEMENT'}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Shift Date: <strong>{date}</strong> · Generated: {new Date().toLocaleString('en-IN')}
        </p>
        <div className="flex justify-center gap-6 mt-2 text-xs font-medium text-slate-800 border-t pt-2">
          {!isAcOnly && (
            <div>
              Normal Counter Staff: <strong>{normalSale?.cashierName || '—'} (Cashier)</strong> /{' '}
              <strong>{normalSale?.helperName || '—'} (Helper)</strong>
            </div>
          )}
          {!isNormalOnly && (
            <div>
              AC Counter Staff: <strong>{acSale?.cashierName || '—'} (Cashier)</strong> /{' '}
              <strong>{acSale?.helperName || '—'} (Helper)</strong>
            </div>
          )}
        </div>
      </div>

      {isAcOnly ? (
        <div className="print-grid grid grid-cols-5 gap-2.5">
          <div className="print-card">
            <span className="text-[10px] font-semibold">AC Liquor Sales Value</span>
            <div className="font-mono text-base font-black mt-0.5">{formatCurrency(acValue)}</div>
          </div>
          <div className="print-card">
            <span className="text-[10px] font-bold uppercase">AC Charges (₹)</span>
            <div className="font-mono text-base font-black mt-0.5">{formatCurrency(acCharges)}</div>
          </div>
          <div className="print-card">
            <span className="text-[10px] font-semibold">Cash Received</span>
            <div className="font-mono text-base font-black mt-0.5">{formatCurrency(acCash)}</div>
          </div>
          <div className="print-card">
            <span className="text-[10px] font-semibold">UPI / Card Received</span>
            <div className="font-mono text-base font-black mt-0.5">{formatCurrency(acUpi)}</div>
          </div>
          <div className="print-card">
            <span className="text-[10px] font-bold uppercase">Total Received</span>
            <div className="font-mono text-base font-black mt-0.5">{formatCurrency(acTotalReceived)}</div>
            <span className="text-[10px]">
              Diff: {Math.abs(acDiff) > 0.009 ? formatCurrency(acDiff) : 'Matches'}
            </span>
          </div>
        </div>
      ) : isNormalOnly ? (
        <div className="print-grid grid grid-cols-4 gap-2.5">
          <div className="print-card">
            <span className="text-[10px] font-semibold">Normal Liquor Sales</span>
            <div className="font-mono text-base font-black mt-0.5">{formatCurrency(normalValue)}</div>
          </div>
          <div className="print-card">
            <span className="text-[10px] font-semibold">Cash Received</span>
            <div className="font-mono text-base font-black mt-0.5">{formatCurrency(normalCash)}</div>
            {normalShopOutflowsCredited > 0 && (
              <span className="text-[10px]">Net of {formatCurrency(normalShopOutflowsCredited)} exp/wages</span>
            )}
          </div>
          <div className="print-card">
            <span className="text-[10px] font-semibold">UPI / Card Received</span>
            <div className="font-mono text-base font-black mt-0.5">{formatCurrency(normalUpi)}</div>
          </div>
          <div className="print-card">
            <span className="text-[10px] font-semibold">Total Money Received</span>
            <div className="font-mono text-base font-black mt-0.5">{formatCurrency(normalTotalReceived)}</div>
            <span className="text-[10px]">
              Staff Diff: {Math.abs(normalDiff) > 0.009 ? `${normalDiff > 0 ? '+' : ''}${formatCurrency(normalDiff)}` : 'Matches'}
            </span>
          </div>
        </div>
      ) : (
        <div className="print-grid grid grid-cols-5 gap-2.5">
          <div className="print-card">
            <span className="text-[10px] font-semibold">Combined Bar Sales</span>
            <div className="font-mono text-base font-black mt-0.5">{formatCurrency(totalSalesValue)}</div>
          </div>
          <div className="print-card">
            <span className="text-[10px] font-semibold">AC Charges</span>
            <div className="font-mono text-base font-black mt-0.5">{formatCurrency(acCharges)}</div>
          </div>
          <div className="print-card">
            <span className="text-[10px] font-semibold">Room Rent Total</span>
            <div className="font-mono text-base font-black mt-0.5">{formatCurrency(totalRoomRent)}</div>
          </div>
          <div className="print-card">
            <span className="text-[10px] font-semibold">Expenses &amp; Wages</span>
            <div className="font-mono text-base font-black mt-0.5">{formatCurrency(totalOutflows)}</div>
          </div>
          <div className="print-card">
            <span className="text-[10px] font-bold uppercase">Net Surplus Day Cash</span>
            <div className="font-mono text-base font-black mt-0.5">{formatCurrency(netSurplus)}</div>
          </div>
        </div>
      )}

      <div className="print-card">
        <div className="pb-2 mb-2 border-b border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider">
            {isAcOnly
              ? `AC Counter Daily Reconciliation (${date})`
              : isNormalOnly
              ? `Normal Counter Daily Reconciliation (${date})`
              : `Counter Sales Reconciliation (${date})`}
          </h3>
        </div>
        <table className="print-table w-full text-left text-xs border-collapse">
          <thead>
            <tr>
              <th>Counter Location</th>
              <th>Liquor Value</th>
              {!isNormalOnly && <th>AC Charges</th>}
              <th>Cash</th>
              <th>UPI / Card</th>
              <th>Total Received</th>
              <th>Staff Difference</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {!isAcOnly && (
              <tr>
                <td className="font-bold">
                  <div>Normal Counter</div>
                  {normalShopOutflowsCredited > 0 && (
                    <div className="text-[10px] font-normal">
                      Exp &amp; Wages credited: -{formatCurrency(normalShopOutflowsCredited)}
                    </div>
                  )}
                </td>
                <td className="font-mono font-bold">{formatCurrency(normalValue)}</td>
                {!isNormalOnly && <td className="font-mono">—</td>}
                <td className="font-mono">{formatCurrency(normalCash)}</td>
                <td className="font-mono">{formatCurrency(normalUpi)}</td>
                <td className="font-mono font-bold">{formatCurrency(normalTotalReceived)}</td>
                <td className="font-mono">
                  {Math.abs(normalDiff) > 0.009
                    ? `${normalDiff > 0 ? '+' : ''}${formatCurrency(normalDiff)}`
                    : 'Matches'}
                </td>
                <td>{normalSale ? normalSale.status : 'No Report'}</td>
              </tr>
            )}
            {!isNormalOnly && (
              <tr>
                <td className="font-bold">AC Counter</td>
                <td className="font-mono font-bold">{formatCurrency(acValue)}</td>
                <td className="font-mono font-bold">{formatCurrency(acCharges)}</td>
                <td className="font-mono">{formatCurrency(acCash)}</td>
                <td className="font-mono">{formatCurrency(acUpi)}</td>
                <td className="font-mono font-bold">{formatCurrency(acTotalReceived)}</td>
                <td className="font-mono">
                  {Math.abs(acDiff) > 0.009
                    ? `${acDiff > 0 ? '+' : ''}${formatCurrency(acDiff)}`
                    : 'Matches'}
                </td>
                <td>{acSale ? acSale.status : 'No Report'}</td>
              </tr>
            )}
          </tbody>
          {counterScope === 'ALL' && (
            <tfoot>
              <tr>
                <td className="font-bold">COMBINED BAR TOTAL</td>
                <td className="font-mono font-bold">{formatCurrency(totalSalesValue)}</td>
                <td className="font-mono font-bold">{formatCurrency(acCharges)}</td>
                <td className="font-mono">{formatCurrency(totalSalesCash)}</td>
                <td className="font-mono">{formatCurrency(totalSalesUpi)}</td>
                <td className="font-mono font-bold">{formatCurrency(totalCombinedReceived)}</td>
                <td className="font-mono">
                  {Math.abs(normalDiff + acDiff) > 0.009
                    ? `${normalDiff + acDiff > 0 ? '+' : ''}${formatCurrency(normalDiff + acDiff)}`
                    : 'Matches'}
                </td>
                <td>Verified</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {!isAcOnly && (
        <div className="print-grid grid grid-cols-2 gap-3">
          <div className="print-card space-y-2">
            <div className="flex items-center justify-between border-b pb-1.5">
              <h3 className="text-xs font-bold uppercase">Room Lodging Collections ({date})</h3>
              <span className="font-mono text-xs font-bold">Total: {formatCurrency(totalRoomRent)}</span>
            </div>
            {roomOps.length > 0 ? (
              <div className="divide-y text-xs">
                {roomOps.map(r => (
                  <div key={r.operationId} className="py-1 flex items-center justify-between">
                    <span>
                      <strong>Room {r.roomNo}</strong> ({r.name} · {r.payment})
                    </span>
                    <span className="font-mono font-bold">{formatCurrency(r.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs py-2 text-center">No room rent recorded for {date}.</p>
            )}
          </div>

          <div className="print-card space-y-2">
            <div className="flex items-center justify-between border-b pb-1.5">
              <h3 className="text-xs font-bold uppercase">Operating Deductions ({date})</h3>
              <span className="font-mono text-xs font-bold">Total: -{formatCurrency(totalOutflows)}</span>
            </div>
            {expenseOps.length > 0 && (
              <div>
                <div className="text-[10px] font-bold uppercase">Expenses</div>
                {expenseOps.map(e => (
                  <div key={e.operationId} className="py-1 flex justify-between text-xs">
                    <span>{e.name}</span>
                    <span className="font-mono font-semibold">{formatCurrency(e.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            {wageOps.length > 0 && (
              <div>
                <div className="text-[10px] font-bold uppercase">Helper &amp; Staff Wages</div>
                {wageOps.map(w => (
                  <div key={w.operationId} className="py-1 flex justify-between text-xs">
                    <span>{w.name}</span>
                    <span className="font-mono font-semibold">{formatCurrency(w.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            {expenseOps.length === 0 && wageOps.length === 0 && (
              <p className="text-xs py-2 text-center">No expenses or wages recorded for {date}.</p>
            )}
          </div>
        </div>
      )}

      <div className="print-avoid-break flex items-center justify-between pt-10 text-xs font-bold border-t border-slate-300">
        {!isAcOnly && <div>Normal Counter Cashier: ____________________</div>}
        {!isNormalOnly && <div>AC Counter Cashier: ____________________</div>}
        <div>Shop Admin / Proprietor: ____________________</div>
      </div>
    </div>
  );
};
