import React, { useState } from 'react';
import { useStock } from '../context/StockContext';
import {
  Boxes,
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  PackageX,
  ArrowRight,
  Layers,
  ArrowRightLeft,
  Receipt,
  Truck
} from 'lucide-react';

export const DashboardView: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const {
    currentUser,
    businessDate,
    stockItems,
    dailySales,
    purchases,
    requests,
    transfers,
    operations
  } = useStock();

  const isAdmin = currentUser?.role === 'ADMIN';

  // Total stock units
  const totalGodown = stockItems.reduce((acc, i) => acc + i.godown, 0);
  const totalNormal = stockItems.reduce((acc, i) => acc + i.normal, 0);
  const totalAC = stockItems.reduce((acc, i) => acc + i.ac, 0);
  const totalStockUnits = totalGodown + totalNormal + totalAC;
  const zeroStockProducts = stockItems.filter(i => (i.godown + i.normal + i.ac) === 0).length;

  // Sales Today (for selected businessDate)
  const approvedToday = dailySales.filter(r => r.date === businessDate && r.status === 'Approved');
  const soldUnitsToday = approvedToday.reduce((acc, r) => acc + r.totalSoldQty, 0);
  const salesValueToday = approvedToday.reduce((acc, r) => acc + r.totalSalesValue, 0);

  // Counter reports status today
  const normalReport = dailySales.find(r => r.counter === 'NORMAL' && r.date === businessDate && r.status !== 'Rejected');
  const acReport = dailySales.find(r => r.counter === 'AC' && r.date === businessDate && r.status !== 'Rejected');

  // 30-day approved reports
  const allApproved = dailySales.filter(r => r.status === 'Approved');
  const totalPeriodBottles = allApproved.reduce((acc, r) => acc + r.totalSoldQty, 0);
  const totalPeriodValue = allApproved.reduce((acc, r) => acc + r.totalSalesValue, 0);

  // Fast-moving stock calculation across approved reports
  const itemSoldMap = new Map<string, { name: string; category: string; sold: number; value: number }>();
  allApproved.forEach(r => {
    r.lines.forEach(l => {
      if (l.sold > 0) {
        const cur = itemSoldMap.get(l.productId) || { name: l.name || 'Product', category: l.category || 'Other', sold: 0, value: 0 };
        cur.sold += l.sold;
        cur.value += l.value;
        itemSoldMap.set(l.productId, cur);
      }
    });
  });

  const fastMoving = Array.from(itemSoldMap.values())
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);

  const maxSold = Math.max(1, ...(fastMoving.map(m => m.sold)));

  // Counter sales split in all approved reports
  const normalSalesTotal = allApproved.filter(r => r.counter === 'NORMAL').reduce((acc, r) => acc + r.totalSalesValue, 0);
  const acSalesTotal = allApproved.filter(r => r.counter === 'AC').reduce((acc, r) => acc + r.totalSalesValue, 0);
  const combinedCounterSales = Math.max(1, normalSalesTotal + acSalesTotal);

  // Pending items
  const pendingSalesCount = dailySales.filter(r => r.status === 'Pending').length;
  const pendingPurchasesCount = purchases.filter(p => p.status === 'Pending').length;
  const pendingRequestsCount = requests.filter(r => r.status === 'Pending').length;
  const pendingTransfersCount = transfers.filter(t => t.status === 'Pending').length;
  const pendingOpsCount = operations.filter(o => o.status === 'Pending').length;
  const totalPending = pendingSalesCount + pendingPurchasesCount + pendingRequestsCount + pendingTransfersCount + pendingOpsCount;

  // Calendar Trend Widget State
  const [calMode, setCalMode] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [selectedCalDate, setSelectedCalDate] = useState<string>(businessDate);

  const formatCurrency = (val: number) => '₹' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[11px] font-extrabold tracking-widest text-amber-600 dark:text-amber-400 uppercase">
            MM Residency · Bar & Stock Intelligence
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {isAdmin ? 'Executive Stock Dashboard' : `${currentUser?.counter || 'Counter'} Dashboard`}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Business Date: {businessDate} · Real-time ledger movements & verified counter reports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('stock')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            View Stock
          </button>
          <button
            onClick={() => onNavigate('sales')}
            className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 transition-colors"
          >
            Daily Sales
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Stock Units */}
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Stock Units</span>
            <div className="mt-1 font-mono text-2xl font-black text-slate-900 dark:text-white">
              {totalStockUnits.toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Godown ({totalGodown}) · Counters ({totalNormal + totalAC})
            </span>
          </div>
        </div>

        {/* Approved Sales Today */}
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Approved Sales Today</span>
            <div className="mt-1 font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(salesValueToday)}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {soldUnitsToday} bottles recorded on {businessDate}
            </span>
          </div>
        </div>

        {/* 30-Day Volume */}
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Period Reports</span>
            <div className="mt-1 font-mono text-2xl font-black text-slate-900 dark:text-white">
              {allApproved.length}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {totalPeriodBottles} btls · {formatCurrency(totalPeriodValue)}
            </span>
          </div>
        </div>

        {/* Pending Approvals */}
        <div
          onClick={() => onNavigate('approvals')}
          className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:border-amber-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-amber-500/50 transition-all"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pending Approvals</span>
            <div className="mt-1 font-mono text-2xl font-black text-amber-600 dark:text-amber-400">
              {totalPending}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Click to review queue items
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Stock Distribution Schematic & Counter Performance */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Stock Distribution */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Stock Distribution Schematic</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Physical units breakdown across storage nodes</p>
            </div>
            <button
              onClick={() => onNavigate('stock')}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400"
            >
              Open Inventory →
            </button>
          </div>

          {/* Progress Meters */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-medium mb-1 text-slate-600 dark:text-slate-300">
                <span>Godown Central Stock</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {totalGodown} btls ({Math.round((totalGodown / Math.max(1, totalStockUnits)) * 100)}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all"
                  style={{ width: `${Math.min(100, (totalGodown / Math.max(1, totalStockUnits)) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1 text-slate-600 dark:text-slate-300">
                <span>Normal Counter</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {totalNormal} btls ({Math.round((totalNormal / Math.max(1, totalStockUnits)) * 100)}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(100, (totalNormal / Math.max(1, totalStockUnits)) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1 text-slate-600 dark:text-slate-300">
                <span>AC Counter</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {totalAC} btls ({Math.round((totalAC / Math.max(1, totalStockUnits)) * 100)}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-purple-600 dark:bg-purple-500 transition-all"
                  style={{ width: `${Math.min(100, (totalAC / Math.max(1, totalStockUnits)) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Schematic visual nodes */}
          <div className="mt-5 flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-center dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex-1 rounded-lg bg-white p-2.5 shadow-xs dark:bg-slate-900">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Godown</span>
              <div className="font-mono text-lg font-black text-blue-600 dark:text-blue-400">{totalGodown}</div>
              <span className="text-[10px] text-slate-500">Central Storage</span>
            </div>
            <span className="text-amber-500 font-bold">⇄</span>
            <div className="flex-1 rounded-lg bg-white p-2.5 shadow-xs dark:bg-slate-900">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Normal</span>
              <div className="font-mono text-lg font-black text-emerald-600 dark:text-emerald-400">{totalNormal}</div>
              <span className="text-[10px] text-slate-500">Counter Stock</span>
            </div>
            <span className="text-amber-500 font-bold">⇄</span>
            <div className="flex-1 rounded-lg bg-white p-2.5 shadow-xs dark:bg-slate-900">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AC Bar</span>
              <div className="font-mono text-lg font-black text-purple-600 dark:text-purple-400">{totalAC}</div>
              <span className="text-[10px] text-slate-500">Lounge Stock</span>
            </div>
          </div>
        </div>

        {/* Counter Performance & Report Status */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Counter Performance & Status</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Daily sales report submission on {businessDate}</p>
            </div>
            <button
              onClick={() => onNavigate('sales')}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400"
            >
              Sales Reports →
            </button>
          </div>

          {/* Counter Status Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/30">
              <div className="flex items-center gap-2.5">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Normal Counter</span>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                normalReport?.status === 'Approved'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                  : normalReport?.status === 'Pending'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {normalReport ? normalReport.status : 'Not submitted'}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/30">
              <div className="flex items-center gap-2.5">
                <div className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">AC Counter</span>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                acReport?.status === 'Approved'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                  : acReport?.status === 'Pending'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {acReport ? acReport.status : 'Not submitted'}
              </span>
            </div>
          </div>

          {/* Revenue Split */}
          <div className="mt-5 grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Normal Revenue (All-time)</span>
              <div className="mt-0.5 font-mono text-base font-black text-slate-900 dark:text-white">
                {formatCurrency(normalSalesTotal)}
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${(normalSalesTotal / combinedCounterSales) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">AC Revenue (All-time)</span>
              <div className="mt-0.5 font-mono text-base font-black text-slate-900 dark:text-white">
                {formatCurrency(acSalesTotal)}
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-purple-500"
                  style={{ width: `${(acSalesTotal / combinedCounterSales) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Fast Moving Items & Operational Priorities */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Fast-Moving Items */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Fast-Moving Stock</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Top volume units sold in approved daily reports</p>
            </div>
          </div>

          {fastMoving.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {fastMoving.map((item, index) => (
                <div key={item.name} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 font-mono text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate dark:text-white">{item.name}</div>
                      <div className="mt-1 h-1.5 w-32 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{ width: `${(item.sold / maxSold) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs font-bold text-slate-900 dark:text-white">{item.sold} bottles</div>
                    <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{formatCurrency(item.value)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Submit and approve daily sales reports to see fast-moving product rankings.
            </div>
          )}
        </div>

        {/* Operational Priorities & Shortcuts */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Operational Priorities & Quick Actions</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Audit checkpoints and high-frequency tasks</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs mb-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-800/30">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Pending Sales</span>
              <div className="font-mono text-base font-bold text-slate-900 dark:text-white">{pendingSalesCount}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-800/30">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Pending Purchases</span>
              <div className="font-mono text-base font-bold text-slate-900 dark:text-white">{pendingPurchasesCount}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-800/30">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Pending Requests</span>
              <div className="font-mono text-base font-bold text-slate-900 dark:text-white">{pendingRequestsCount}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-800/30">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Zero Stock Products</span>
              <div className="font-mono text-base font-bold text-red-600 dark:text-red-400">{zeroStockProducts}</div>
            </div>
          </div>

          {/* Quick buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onNavigate('sales')}
              className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 text-xs font-semibold text-slate-800 hover:border-amber-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-600" />
                <span>Daily Sales</span>
              </div>
              <ArrowRight className="h-3 w-3 text-slate-400" />
            </button>

            <button
              onClick={() => onNavigate('transfers')}
              className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 text-xs font-semibold text-slate-800 hover:border-amber-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-purple-600" />
                <span>Transfer Stock</span>
              </div>
              <ArrowRight className="h-3 w-3 text-slate-400" />
            </button>

            {isAdmin && (
              <button
                onClick={() => onNavigate('purchases')}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 text-xs font-semibold text-slate-800 hover:border-amber-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-blue-600" />
                  <span>Record Purchase</span>
                </div>
                <ArrowRight className="h-3 w-3 text-slate-400" />
              </button>
            )}

            <button
              onClick={() => onNavigate('closing')}
              className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 text-xs font-semibold text-slate-800 hover:border-amber-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-600" />
                <span>Consolidated Day</span>
              </div>
              <ArrowRight className="h-3 w-3 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
