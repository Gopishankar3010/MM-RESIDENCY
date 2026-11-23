import React, { useMemo, useState } from 'react';
import {
  Search,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  Truck,
  ArrowRightLeft,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3
} from 'lucide-react';
import { DailySalesReport, PurchaseBatch, StockItem } from '../types';
import {
  bottlesPerCase_,
  matchesSearchQuery,
  sortProductsCategoryWise,
  stockQtyLabel
} from '../data/initialData';

interface AdminProductInsightsCardProps {
  businessDate: string;
  stockItems: StockItem[];
  dailySales: DailySalesReport[];
  purchases: PurchaseBatch[];
  onNavigate: (tab: string) => void;
}

interface ProductSalesSnapshot {
  todaySold: number;
  todayValue: number;
  last7Sold: number;
  last7Value: number;
  last7Normal: number;
  last7Ac: number;
  last30Sold: number;
  last30Value: number;
  last30Normal: number;
  last30Ac: number;
  avg7PerDay: number;
  avg30PerDay: number;
}

interface LastPurchaseSnapshot {
  supplier: string;
  invoiceNo: string;
  billDate: string;
  status: PurchaseBatch['status'];
  enteredQtyLabel: string;
  qtyBottles: number;
  costPerBottle: number;
  costPerCase: number;
}

function shiftIsoDate(isoDate: string, deltaDays: number): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return isoDate;
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + deltaDays));
  return d.toISOString().slice(0, 10);
}

const formatCurrency = (val: number) =>
  '₹' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const AdminProductInsightsCard: React.FC<AdminProductInsightsCardProps> = ({
  businessDate,
  stockItems,
  dailySales,
  purchases,
  onNavigate
}) => {
  const [query, setQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [coverTargetDays, setCoverTargetDays] = useState<14 | 21 | 30>(14);
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);

  const activeItems = useMemo(
    () => sortProductsCategoryWise(stockItems.filter(i => i.active)),
    [stockItems]
  );

  const date7Start = useMemo(() => shiftIsoDate(businessDate, -6), [businessDate]);
  const date30Start = useMemo(() => shiftIsoDate(businessDate, -29), [businessDate]);

  // Aggregate 30-day, 7-day, and today's approved sales per productId
  const salesByProduct = useMemo(() => {
    const map = new Map<string, ProductSalesSnapshot>();

    const ensure = (productId: string): ProductSalesSnapshot => {
      let cur = map.get(productId);
      if (!cur) {
        cur = {
          todaySold: 0,
          todayValue: 0,
          last7Sold: 0,
          last7Value: 0,
          last7Normal: 0,
          last7Ac: 0,
          last30Sold: 0,
          last30Value: 0,
          last30Normal: 0,
          last30Ac: 0,
          avg7PerDay: 0,
          avg30PerDay: 0
        };
        map.set(productId, cur);
      }
      return cur;
    };

    dailySales.forEach(rep => {
      if (rep.status !== 'Approved') return;
      if (rep.date < date30Start || rep.date > businessDate) return;

      const in7Days = rep.date >= date7Start && rep.date <= businessDate;
      const isToday = rep.date === businessDate;

      rep.lines.forEach(line => {
        if (!line.sold || line.sold <= 0) return;
        const snap = ensure(line.productId);
        const lineVal = Number(line.value || 0);

        snap.last30Sold += line.sold;
        snap.last30Value += lineVal;
        if (rep.counter === 'NORMAL') snap.last30Normal += line.sold;
        else snap.last30Ac += line.sold;

        if (in7Days) {
          snap.last7Sold += line.sold;
          snap.last7Value += lineVal;
          if (rep.counter === 'NORMAL') snap.last7Normal += line.sold;
          else snap.last7Ac += line.sold;
        }

        if (isToday) {
          snap.todaySold += line.sold;
          snap.todayValue += lineVal;
        }
      });
    });

    map.forEach(snap => {
      snap.avg7PerDay = snap.last7Sold / 7;
      snap.avg30PerDay = snap.last30Sold / 30;
    });

    return map;
  }, [dailySales, businessDate, date7Start, date30Start]);

  // Extract latest non-rejected purchase line + pending incoming bottles per productId
  const purchaseInfoByProduct = useMemo(() => {
    const latestMap = new Map<string, LastPurchaseSnapshot>();
    const pendingQtyMap = new Map<string, number>();

    const sortedBatches = [...purchases].sort(
      (a, b) =>
        (b.billDate || b.date || '').localeCompare(a.billDate || a.date || '') ||
        (b.createdAt || '').localeCompare(a.createdAt || '')
    );

    sortedBatches.forEach(batch => {
      if (batch.status === 'Rejected') return;
      batch.lines.forEach(line => {
        if (batch.status === 'Pending') {
          pendingQtyMap.set(line.productId, (pendingQtyMap.get(line.productId) || 0) + (line.qty || 0));
        }

        if (!latestMap.has(line.productId)) {
          const item = stockItems.find(s => s.productId === line.productId);
          const pack = line.casePack || (item ? bottlesPerCase_(item) : 1);
          const qtyBtls = Math.max(1, line.qty || 1);
          const costPerBottle =
            line.rate && line.rate > 0
              ? line.rate
              : line.grossAmount && qtyBtls > 0
              ? line.grossAmount / qtyBtls
              : 0;
          const enteredQtyLabel =
            line.enteredQty && line.unit
              ? `${line.enteredQty} ${
                  line.unit === 'CASE'
                    ? line.enteredQty === 1
                      ? 'case'
                      : 'cases'
                    : line.enteredQty === 1
                    ? 'bottle'
                    : 'bottles'
                }`
              : `${qtyBtls} btls`;

          latestMap.set(line.productId, {
            supplier: batch.supplier,
            invoiceNo: batch.invoiceNo,
            billDate: batch.billDate || batch.date,
            status: batch.status,
            enteredQtyLabel,
            qtyBottles: line.qty || 0,
            costPerBottle,
            costPerCase: costPerBottle * pack
          });
        }
      });
    });

    return { latestMap, pendingQtyMap };
  }, [purchases, stockItems]);

  const searchResults = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];
    return activeItems
      .filter(i => matchesSearchQuery(trimmed, i.name, i.category, i.sizeML, i.productId))
      .slice(0, 15);
  }, [activeItems, query]);

  const selectedItem = useMemo(() => {
    if (!selectedProductId) return null;
    return activeItems.find(i => i.productId === selectedProductId) || null;
  }, [activeItems, selectedProductId]);

  // Build 30-day chronological sales series for selected product chart
  const daily30Series = useMemo(() => {
    if (!selectedItem) return [];
    const byDate = new Map<string, { normal: number; ac: number; value: number }>();

    dailySales.forEach(rep => {
      if (rep.status !== 'Approved') return;
      if (rep.date < date30Start || rep.date > businessDate) return;
      const line = rep.lines.find(l => l.productId === selectedItem.productId);
      if (!line || !line.sold || line.sold <= 0) return;

      const cur = byDate.get(rep.date) || { normal: 0, ac: 0, value: 0 };
      if (rep.counter === 'NORMAL') cur.normal += line.sold;
      else cur.ac += line.sold;
      cur.value += Number(line.value || 0);
      byDate.set(rep.date, cur);
    });

    const days: {
      date: string;
      shortLabel: string;
      normal: number;
      ac: number;
      total: number;
      value: number;
      isRecent7: boolean;
    }[] = [];

    for (let offset = -29; offset <= 0; offset++) {
      const date = shiftIsoDate(businessDate, offset);
      const hit = byDate.get(date);
      const normal = hit?.normal || 0;
      const ac = hit?.ac || 0;
      const [, mm, dd] = date.split('-');
      days.push({
        date,
        shortLabel: `${dd}/${mm}`,
        normal,
        ac,
        total: normal + ac,
        value: hit?.value || 0,
        isRecent7: offset >= -6
      });
    }
    return days;
  }, [selectedItem, dailySales, businessDate, date30Start]);

  // Detailed purchase-planning calculations for selected product
  const insight = useMemo(() => {
    if (!selectedItem) return null;

    const pack = bottlesPerCase_(selectedItem);
    const totalStock = selectedItem.godown + selectedItem.normal + selectedItem.ac;
    const counterStock = selectedItem.normal + selectedItem.ac;
    const totalMrpValue = totalStock * selectedItem.price;

    const sales: ProductSalesSnapshot = salesByProduct.get(selectedItem.productId) || {
      todaySold: 0,
      todayValue: 0,
      last7Sold: 0,
      last7Value: 0,
      last7Normal: 0,
      last7Ac: 0,
      last30Sold: 0,
      last30Value: 0,
      last30Normal: 0,
      last30Ac: 0,
      avg7PerDay: 0,
      avg30PerDay: 0
    };

    const pendingIncomingBottles = purchaseInfoByProduct.pendingQtyMap.get(selectedItem.productId) || 0;
    const lastPurchase = purchaseInfoByProduct.latestMap.get(selectedItem.productId) || null;

    // Effective daily rate uses 7-day pace when demand is surging >15% over 30-day average
    const effectivePace =
      sales.avg7PerDay > sales.avg30PerDay * 1.15 && sales.last7Sold > 0
        ? sales.avg7PerDay
        : sales.avg30PerDay;

    const daysCoverTotal = effectivePace > 0 ? totalStock / effectivePace : null;

    // Trend comparison (7d daily vs 30d daily)
    let trendType: 'up' | 'down' | 'flat' | 'none' = 'none';
    let trendPct = 0;
    let trendLabel = 'No sales in 30d';
    if (sales.last30Sold > 0) {
      if (sales.avg30PerDay > 0) {
        trendPct = Math.round(((sales.avg7PerDay - sales.avg30PerDay) / sales.avg30PerDay) * 100);
      }
      if (trendPct >= 15) {
        trendType = 'up';
        trendLabel = `Accelerating (+${trendPct}% vs 30d pace)`;
      } else if (trendPct <= -15) {
        trendType = 'down';
        trendLabel = `Slowing (${trendPct}% vs 30d pace)`;
      } else {
        trendType = 'flat';
        trendLabel = `Steady (${trendPct >= 0 ? '+' : ''}${trendPct}% vs 30d pace)`;
      }
    }

    // Reorder calculation
    const targetBottles = Math.ceil(effectivePace * coverTargetDays);
    const shortfallBottles = Math.max(0, targetBottles - totalStock - pendingIncomingBottles);
    const suggestedCases = shortfallBottles > 0 ? Math.ceil(shortfallBottles / pack) : 0;
    const suggestedOrderBottles = suggestedCases * pack;
    const estimatedOrderCost =
      lastPurchase && lastPurchase.costPerBottle > 0
        ? suggestedOrderBottles * lastPurchase.costPerBottle
        : null;

    // Margin estimate against selling price
    const unitMargin =
      lastPurchase && lastPurchase.costPerBottle > 0
        ? selectedItem.price - lastPurchase.costPerBottle
        : null;
    const marginPct =
      unitMargin !== null && selectedItem.price > 0
        ? Math.round((unitMargin / selectedItem.price) * 1000) / 10
        : null;

    // Status classification (always paired with explicit text)
    let statusLabel = 'Healthy Stock';
    let statusTone: 'red' | 'amber' | 'emerald' | 'slate' = 'emerald';

    if (totalStock === 0) {
      statusLabel = sales.last30Sold > 0 ? 'Out of Stock — Order Now' : 'Out of Stock';
      statusTone = 'red';
    } else if (sales.last30Sold === 0) {
      statusLabel = 'Slow / No 30d Sales';
      statusTone = 'slate';
    } else if (daysCoverTotal !== null && daysCoverTotal < 5) {
      statusLabel = `Critical (~${daysCoverTotal.toFixed(1)}d left)`;
      statusTone = 'red';
    } else if (daysCoverTotal !== null && daysCoverTotal <= 10) {
      statusLabel = `Reorder Soon (~${daysCoverTotal.toFixed(1)}d left)`;
      statusTone = 'amber';
    } else if (daysCoverTotal !== null) {
      statusLabel = `Healthy (~${Math.round(daysCoverTotal)}d left)`;
      statusTone = 'emerald';
    }

    // Plain-English Purchase & Transfer Ideas
    const ideas: string[] = [];

    if (selectedItem.godown > 0 && effectivePace > 0 && counterStock < effectivePace * 4) {
      ideas.push(
        `Counters hold only ${counterStock} btls (~${(counterStock / effectivePace).toFixed(
          1
        )}d cover), while Godown has ${stockQtyLabel(selectedItem.godown, pack)}. Transfer from Godown before buying more.`
      );
    }

    if (pendingIncomingBottles > 0) {
      ideas.push(
        `${pendingIncomingBottles} btls are already in a Pending purchase batch awaiting approval — subtracted from reorder suggestion.`
      );
    }

    if (shortfallBottles > 0) {
      ideas.push(
        `To keep a ${coverTargetDays}-day buffer (~${targetBottles} btls), order ${suggestedCases} ${
          suggestedCases === 1 ? 'case' : 'cases'
        } (${suggestedOrderBottles} btls)${
          lastPurchase ? ` — last supplied by ${lastPurchase.supplier}` : ''
        }.`
      );
    } else if (sales.last30Sold > 0 && daysCoverTotal !== null) {
      ideas.push(
        `Current stock covers ~${Math.round(daysCoverTotal)} days at current pace — no immediate purchase needed for a ${coverTargetDays}-day buffer.`
      );
    }

    if (sales.last30Sold === 0 && totalStock > 0) {
      ideas.push(
        `0 bottles sold in the last 30 days with ${formatCurrency(totalMrpValue)} stocked. Hold off reordering until existing bottles move.`
      );
    } else if (sales.last30Sold > 0) {
      const normalShare = Math.round((sales.last30Normal / sales.last30Sold) * 100);
      const acShare = 100 - normalShare;
      if (trendType === 'up') {
        ideas.push(
          `Demand surged +${trendPct}% in the last 7 days (${sales.avg7PerDay.toFixed(1)}/day vs ${sales.avg30PerDay.toFixed(
            1
          )}/day 30d avg). Consider adding 1 extra safety case.`
        );
      } else {
        ideas.push(
          `30-day channel mix: ${normalShare}% Normal Counter (${sales.last30Normal} btls) · ${acShare}% AC Counter (${sales.last30Ac} btls).`
        );
      }
    }

    return {
      pack,
      totalStock,
      counterStock,
      totalMrpValue,
      sales,
      pendingIncomingBottles,
      lastPurchase,
      effectivePace,
      daysCoverTotal,
      trendType,
      trendLabel,
      targetBottles,
      shortfallBottles,
      suggestedCases,
      suggestedOrderBottles,
      estimatedOrderCost,
      unitMargin,
      marginPct,
      statusLabel,
      statusTone,
      ideas
    };
  }, [selectedItem, salesByProduct, purchaseInfoByProduct, coverTargetDays]);

  const maxDailySold = useMemo(
    () => Math.max(1, ...daily30Series.map(d => d.total)),
    [daily30Series]
  );

  const peakDay = useMemo(() => {
    if (!daily30Series.length) return null;
    return daily30Series.reduce((best, cur) => (cur.total > best.total ? cur : best), daily30Series[0]);
  }, [daily30Series]);

  const hoveredDay = hoveredDayIdx !== null ? daily30Series[hoveredDayIdx] || null : null;

  return (
    <div className="print-card rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between gap-4">
      <div className="space-y-4">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Product Search &amp; Purchase Insights
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Search a specific product for graphical stock levels, 30-day sales trends, and purchase advice
            </p>
          </div>
          {selectedItem && (
            <button
              type="button"
              onClick={() => {
                setSelectedProductId(null);
                setQuery('');
                setHoveredDayIdx(null);
              }}
              className="no-print self-start sm:self-auto text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer whitespace-nowrap shrink-0"
            >
              Clear Product
            </button>
          )}
        </div>

        {/* Search Input with Search Icon */}
        <div className="no-print relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                setQuery('');
              } else if (e.key === 'Enter' && searchResults.length > 0) {
                setSelectedProductId(searchResults[0].productId);
                setQuery('');
                setHoveredDayIdx(null);
              }
            }}
            placeholder="Search product name, category, or size (e.g. Kingfisher 650, Mansion)..."
            aria-label="Search product for stock and sales graph"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 py-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900 transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search text"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Picker (only shown while typing a query) */}
        {query.trim() ? (
          <div className="no-print rounded-xl border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40 max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {searchResults.length > 0 ? (
              searchResults.map(item => {
                const total = item.godown + item.normal + item.ac;
                const sales30 = salesByProduct.get(item.productId)?.last30Sold || 0;
                const isSelected = selectedProductId === item.productId;
                return (
                  <button
                    key={item.productId}
                    type="button"
                    onClick={() => {
                      setSelectedProductId(item.productId);
                      setQuery('');
                      setHoveredDayIdx(null);
                    }}
                    className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50/90 dark:bg-amber-950/30'
                        : 'hover:bg-white dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.name} {item.sizeML}ml
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {item.category} · {bottlesPerCase_(item)}/case · MRP {formatCurrency(item.price)}
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-mono tabular-nums">
                      <div
                        className={`text-xs font-bold ${
                          total === 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {total} btls
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {sales30} sold / 30d
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No active products match &ldquo;{query}&rdquo;.
              </div>
            )}
          </div>
        ) : null}

        {/* Primary Content Container (Selected Product Graphical View OR Focused Empty Search Prompt) */}
        {selectedItem && insight ? (
          <div className="space-y-4 pt-1 border-t border-slate-100 dark:border-slate-800">
            {/* Identity & Status */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 pt-2">
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedItem.name} {selectedItem.sizeML}ml
                </h4>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedItem.category} · {insight.pack} bottles/case · MRP{' '}
                  <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-200">
                    {formatCurrency(selectedItem.price)}
                  </span>
                </div>
              </div>

              <div
                className={`inline-flex items-center gap-1.5 text-xs font-bold whitespace-nowrap shrink-0 ${
                  insight.statusTone === 'red'
                    ? 'text-red-600 dark:text-red-400'
                    : insight.statusTone === 'amber'
                    ? 'text-amber-600 dark:text-amber-400'
                    : insight.statusTone === 'emerald'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {insight.statusTone === 'red' || insight.statusTone === 'amber' ? (
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                ) : insight.statusTone === 'emerald' ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>{insight.statusLabel}</span>
              </div>
            </div>

            {/* Graphical Chart 1: Stock Availability & Buffer Coverage */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Stock Available vs. {coverTargetDays}-Day Target</span>
                </span>
                <span className="text-xs font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                  {insight.totalStock} btls ({stockQtyLabel(insight.totalStock, insight.pack)}) ·{' '}
                  {formatCurrency(insight.totalMrpValue)}
                </span>
              </div>

              {/* Stacked Proportional Location Bar */}
              {(() => {
                const denom = Math.max(1, insight.totalStock, insight.targetBottles);
                const gPct = (selectedItem.godown / denom) * 100;
                const nPct = (selectedItem.normal / denom) * 100;
                const aPct = (selectedItem.ac / denom) * 100;
                const targetMarkerPct =
                  insight.targetBottles > 0 ? Math.min(100, (insight.targetBottles / denom) * 100) : null;

                return (
                  <div className="space-y-2">
                    <div className="relative h-5 w-full rounded-lg bg-slate-200/80 dark:bg-slate-700/70 overflow-hidden flex">
                      {gPct > 0 && (
                        <div
                          className="h-full bg-blue-600 dark:bg-blue-500 transition-all"
                          style={{ width: `${gPct}%` }}
                          title={`Godown: ${selectedItem.godown} btls`}
                        />
                      )}
                      {nPct > 0 && (
                        <div
                          className="h-full bg-emerald-600 dark:bg-emerald-500 transition-all"
                          style={{ width: `${nPct}%` }}
                          title={`Normal Counter: ${selectedItem.normal} btls`}
                        />
                      )}
                      {aPct > 0 && (
                        <div
                          className="h-full bg-purple-600 dark:bg-purple-500 transition-all"
                          style={{ width: `${aPct}%` }}
                          title={`AC Counter: ${selectedItem.ac} btls`}
                        />
                      )}
                      {targetMarkerPct !== null && (
                        <div
                          className="absolute inset-y-0 w-0.5 bg-amber-500 dark:bg-amber-400 z-10"
                          style={{ left: `${targetMarkerPct}%` }}
                          title={`${coverTargetDays}-day target: ${insight.targetBottles} btls`}
                        />
                      )}
                    </div>

                    {/* Visual Legend & Individual Horizontal Bars */}
                    <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                          <span className="font-medium text-blue-700 dark:text-blue-400">Godown</span>
                          <span className="font-mono tabular-nums font-bold">{selectedItem.godown}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-600 dark:bg-blue-500"
                            style={{
                              width: `${
                                insight.totalStock > 0 ? (selectedItem.godown / insight.totalStock) * 100 : 0
                              }%`
                            }}
                          />
                        </div>
                        <div className="mt-0.5 text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          {stockQtyLabel(selectedItem.godown, insight.pack)}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                          <span className="font-medium text-emerald-700 dark:text-emerald-400">Normal</span>
                          <span className="font-mono tabular-nums font-bold">{selectedItem.normal}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500"
                            style={{
                              width: `${
                                insight.totalStock > 0 ? (selectedItem.normal / insight.totalStock) * 100 : 0
                              }%`
                            }}
                          />
                        </div>
                        <div className="mt-0.5 text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          {stockQtyLabel(selectedItem.normal, insight.pack)}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                          <span className="font-medium text-purple-700 dark:text-purple-400">AC Bar</span>
                          <span className="font-mono tabular-nums font-bold">{selectedItem.ac}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-purple-600 dark:bg-purple-500"
                            style={{
                              width: `${
                                insight.totalStock > 0 ? (selectedItem.ac / insight.totalStock) * 100 : 0
                              }%`
                            }}
                          />
                        </div>
                        <div className="mt-0.5 text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          {stockQtyLabel(selectedItem.ac, insight.pack)}
                        </div>
                      </div>
                    </div>

                    {insight.targetBottles > 0 && (
                      <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 flex items-center justify-between pt-0.5">
                        <span>Amber marker: {coverTargetDays}d buffer ({insight.targetBottles} btls)</span>
                        {insight.pendingIncomingBottles > 0 && (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">
                            +{insight.pendingIncomingBottles} pending
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Graphical Chart 2: 30-Day Daily Sales Bar Chart (Stacked Normal + AC Counter) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/30 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>30-Day Daily Sales Trend</span>
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                    insight.trendType === 'up'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : insight.trendType === 'down'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {insight.trendType === 'up' ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : insight.trendType === 'down' ? (
                    <TrendingDown className="h-3.5 w-3.5" />
                  ) : (
                    <Minus className="h-3.5 w-3.5" />
                  )}
                  <span>{insight.trendLabel}</span>
                </span>
              </div>

              {/* Interactive Bar Readout Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300">
                {hoveredDay ? (
                  <span>
                    <strong className="text-slate-900 dark:text-white">{hoveredDay.date}</strong> · Normal:{' '}
                    {hoveredDay.normal} · AC: {hoveredDay.ac} · Total:{' '}
                    <strong className="text-slate-900 dark:text-white">{hoveredDay.total} btls</strong> (
                    {formatCurrency(hoveredDay.value)})
                  </span>
                ) : (
                  <span>
                    30d Total: <strong className="text-slate-900 dark:text-white">{insight.sales.last30Sold} btls</strong>{' '}
                    ({insight.sales.avg30PerDay.toFixed(1)}/d) · 7d:{' '}
                    <strong className="text-slate-900 dark:text-white">{insight.sales.last7Sold} btls</strong> (
                    {insight.sales.avg7PerDay.toFixed(1)}/d)
                  </span>
                )}
                {peakDay && peakDay.total > 0 && !hoveredDay && (
                  <span className="text-slate-500 dark:text-slate-400">
                    Peak: {peakDay.total} ({peakDay.shortLabel})
                  </span>
                )}
              </div>

              {/* Bespoke Responsive SVG 30-Day Column Chart */}
              {insight.sales.last30Sold > 0 ? (
                <div className="space-y-1.5">
                  <svg
                    viewBox="0 0 600 136"
                    className="w-full h-32 overflow-visible select-none"
                    role="img"
                    aria-label={`30-day sales chart for ${selectedItem.name}`}
                    onMouseLeave={() => setHoveredDayIdx(null)}
                  >
                    {/* Last 7 days subtle window band */}
                    <rect
                      x={23 * 20}
                      y={6}
                      width={7 * 20}
                      height={104}
                      rx={4}
                      className="fill-amber-500/10 dark:fill-amber-400/10"
                    />

                    {/* Baseline & Mid Reference Gridlines */}
                    <line
                      x1={0}
                      y1={110}
                      x2={600}
                      y2={110}
                      className="stroke-slate-300 dark:stroke-slate-700"
                      strokeWidth={1}
                    />
                    <line
                      x1={0}
                      y1={58}
                      x2={600}
                      y2={58}
                      className="stroke-slate-200 dark:stroke-slate-800"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />

                    {/* 30-day daily average line */}
                    {insight.sales.avg30PerDay > 0 && (
                      <line
                        x1={0}
                        y1={110 - (insight.sales.avg30PerDay / maxDailySold) * 98}
                        x2={600}
                        y2={110 - (insight.sales.avg30PerDay / maxDailySold) * 98}
                        className="stroke-amber-600 dark:stroke-amber-400"
                        strokeWidth={1.25}
                        strokeDasharray="4 3"
                      />
                    )}

                    {/* Stacked Normal + AC Daily Bars */}
                    {daily30Series.map((day, idx) => {
                      const barX = idx * 20 + 3;
                      const barW = 14;
                      const totalH = (day.total / maxDailySold) * 98;
                      const normalH = (day.normal / maxDailySold) * 98;
                      const acH = (day.ac / maxDailySold) * 98;
                      const isHovered = hoveredDayIdx === idx;

                      return (
                        <g
                          key={day.date}
                          onMouseEnter={() => setHoveredDayIdx(idx)}
                          className="cursor-pointer"
                        >
                          <title>
                            {day.date}: {day.total} btls (Normal {day.normal}, AC {day.ac}) — {formatCurrency(day.value)}
                          </title>
                          {/* Invisible full-column hit target */}
                          <rect x={idx * 20} y={6} width={20} height={110} fill="transparent" />

                          {day.total > 0 ? (
                            <>
                              {normalH > 0 && (
                                <rect
                                  x={barX}
                                  y={110 - normalH}
                                  width={barW}
                                  height={normalH}
                                  rx={acH > 0 ? 0 : 2}
                                  className={
                                    isHovered
                                      ? 'fill-emerald-500 dark:fill-emerald-400'
                                      : 'fill-emerald-600 dark:fill-emerald-500'
                                  }
                                />
                              )}
                              {acH > 0 && (
                                <rect
                                  x={barX}
                                  y={110 - totalH}
                                  width={barW}
                                  height={acH}
                                  rx={2}
                                  className={
                                    isHovered
                                      ? 'fill-purple-500 dark:fill-purple-400'
                                      : 'fill-purple-600 dark:fill-purple-500'
                                  }
                                />
                              )}
                            </>
                          ) : (
                            <rect
                              x={barX}
                              y={108}
                              width={barW}
                              height={2}
                              rx={1}
                              className={
                                isHovered
                                  ? 'fill-slate-400 dark:fill-slate-500'
                                  : 'fill-slate-200 dark:fill-slate-700'
                              }
                            />
                          )}
                        </g>
                      );
                    })}

                    {/* Axis Date Markers */}
                    <text
                      x={2}
                      y={128}
                      fontSize={10}
                      className="fill-slate-400 dark:fill-slate-500 font-mono"
                    >
                      {daily30Series[0]?.shortLabel}
                    </text>
                    <text
                      x={290}
                      y={128}
                      textAnchor="middle"
                      fontSize={10}
                      className="fill-slate-400 dark:fill-slate-500 font-mono"
                    >
                      {daily30Series[14]?.shortLabel}
                    </text>
                    <text
                      x={530}
                      y={128}
                      textAnchor="middle"
                      fontSize={10}
                      className="fill-amber-600 dark:fill-amber-400 font-mono font-bold"
                    >
                      Last 7d
                    </text>
                    <text
                      x={598}
                      y={128}
                      textAnchor="end"
                      fontSize={10}
                      className="fill-slate-500 dark:fill-slate-400 font-mono"
                    >
                      {daily30Series[29]?.shortLabel}
                    </text>
                  </svg>

                  {/* Chart Key & Quick Totals */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-xs bg-emerald-600 dark:bg-emerald-500" />
                        Normal ({insight.sales.last30Normal})
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-xs bg-purple-600 dark:bg-purple-500" />
                        AC ({insight.sales.last30Ac})
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-0.5 w-3 bg-amber-600 dark:bg-amber-400" />
                        30d avg ({insight.sales.avg30PerDay.toFixed(1)}/d)
                      </span>
                    </div>
                    <span className="font-mono tabular-nums">
                      Today: <strong className="text-slate-900 dark:text-white">{insight.sales.todaySold} btls</strong> (
                      {formatCurrency(insight.sales.todayValue)})
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 py-5 text-center text-xs text-slate-500 dark:text-slate-400">
                  No approved sales recorded for this product in the last 30 days ({date30Start} to {businessDate}).
                </div>
              )}
            </div>

            {/* Section 3: Reorder Calculator & Last Supplier Cost */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Purchase Planning &amp; Supplier History
                </span>

                {/* Target Buffer Days Control */}
                <div className="no-print inline-flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
                  {([14, 21, 30] as const).map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setCoverTargetDays(days)}
                      className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        coverTargetDays === days
                          ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      {days}d buffer
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {/* Suggested Order Box */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Suggested Reorder ({coverTargetDays}-Day Target)
                  </div>
                  {insight.suggestedCases > 0 ? (
                    <>
                      <div className="font-mono tabular-nums text-base font-black text-amber-600 dark:text-amber-400">
                        {insight.suggestedCases} {insight.suggestedCases === 1 ? 'case' : 'cases'}{' '}
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          ({insight.suggestedOrderBottles} btls)
                        </span>
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        Shortfall: {insight.shortfallBottles} btls
                        {insight.estimatedOrderCost !== null
                          ? ` · Est. cost ${formatCurrency(insight.estimatedOrderCost)}`
                          : ''}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-mono tabular-nums text-base font-black text-emerald-600 dark:text-emerald-400">
                        0 cases needed
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {insight.sales.last30Sold === 0
                          ? 'No 30-day sales velocity recorded'
                          : `Stock${insight.pendingIncomingBottles > 0 ? ' + pending order' : ''} meets ${coverTargetDays}d buffer`}
                      </div>
                    </>
                  )}
                </div>

                {/* Last Purchase & Margin Box */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Last Purchase &amp; Margin
                  </div>
                  {insight.lastPurchase ? (
                    <>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {insight.lastPurchase.supplier}
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {insight.lastPurchase.billDate} · {insight.lastPurchase.enteredQtyLabel} ·{' '}
                        {formatCurrency(insight.lastPurchase.costPerBottle)}/btl
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        Case cost: {formatCurrency(insight.lastPurchase.costPerCase)}
                        {insight.unitMargin !== null && insight.marginPct !== null && (
                          <span
                            className={`ml-2 font-bold ${
                              insight.unitMargin >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            · Margin {formatCurrency(insight.unitMargin)}/btl ({insight.marginPct}%)
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                      No recorded purchase batch found for this SKU yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Actionable Insights List */}
              {insight.ideas.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-slate-800/30 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span>Purchase &amp; Stock Ideas</span>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300 list-disc pl-4">
                    {insight.ideas.map((idea, idx) => (
                      <li key={idx}>{idea}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Focused Empty State — Shows nothing until admin searches & picks a product */
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center dark:border-slate-800 dark:bg-slate-800/20 space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Search a product to view its stock &amp; sales graph
            </div>
            <p className="mx-auto max-w-sm text-[11px] text-slate-500 dark:text-slate-400">
              Type a brand name, category, or bottle size above to inspect live Godown and counter stock, a 30-day sales chart, and reorder recommendations for that product.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="no-print pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {selectedItem
            ? `Showing graphical stock & 30d insights for ${selectedItem.name}`
            : `Search across ${activeItems.length} active SKUs`}
        </span>

        <div className="flex items-center gap-2">
          {selectedItem && selectedItem.godown > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('transfers')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowRightLeft className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              <span>Transfer</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('purchases')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Truck className="h-3.5 w-3.5" />
            <span>Go to Purchases</span>
          </button>
        </div>
      </div>
    </div>
  );
};
