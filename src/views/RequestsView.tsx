import React, { useEffect, useRef, useState } from 'react';
import { useStock } from '../context/StockContext';
import {
  Search,
  ShoppingBag,
  Trash2,
  CheckCircle2,
  Printer,
  Copy,
  Share2,
  Save,
  RotateCcw,
  Check
} from 'lucide-react';
import { bottlesPerCase_, matchesSearchQuery, sortProductsCategoryWise, stockQtyLabel } from '../data/initialData';
import { CounterLocation } from '../types';

interface RequestBasketItem {
  productId: string;
  name: string;
  sizeML: number;
  casePack: number;
  qty: number;
  unit: 'CASE' | 'BOTTLE';
  bottles: number;
}

interface RequestDraft {
  basket: RequestBasketItem[];
  reason: string;
  selectedProductId: string;
  enteredQty: string;
  unit: 'CASE' | 'BOTTLE';
  savedAt: string;
}

const requestDraftStorageKey = (counter: CounterLocation, date: string) =>
  `mm_godown_request_draft_${counter}_${date}`;

const activeRequestDraftDateKey = (counter: CounterLocation) =>
  `mm_godown_request_active_date_${counter}`;

const formatDraftTime = (date: Date): string => {
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const readRequestDraft = (counter: CounterLocation, date: string): RequestDraft | null => {
  try {
    const raw = window.localStorage.getItem(requestDraftStorageKey(counter, date));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const basket = Array.isArray(parsed.basket)
      ? parsed.basket.filter(
          (item: any) =>
            item &&
            typeof item.productId === 'string' &&
            typeof item.name === 'string' &&
            Number(item.qty) > 0 &&
            Number(item.bottles) > 0
        )
      : [];
    return {
      basket,
      reason: typeof parsed.reason === 'string' ? parsed.reason : '',
      selectedProductId: typeof parsed.selectedProductId === 'string' ? parsed.selectedProductId : '',
      enteredQty: typeof parsed.enteredQty === 'string' && parsed.enteredQty !== '' ? parsed.enteredQty : '1',
      unit: parsed.unit === 'BOTTLE' ? 'BOTTLE' : 'CASE',
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : ''
    };
  } catch {
    return null;
  }
};

const writeRequestDraft = (counter: CounterLocation, date: string, draft: RequestDraft): boolean => {
  try {
    window.localStorage.setItem(requestDraftStorageKey(counter, date), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
};

const removeRequestDraft = (counter: CounterLocation, date: string): void => {
  try {
    window.localStorage.removeItem(requestDraftStorageKey(counter, date));
  } catch {
    // Ignore storage errors
  }
};

const readActiveRequestDraftDate = (counter: CounterLocation): string | null => {
  try {
    return window.localStorage.getItem(activeRequestDraftDateKey(counter));
  } catch {
    return null;
  }
};

const writeActiveRequestDraftDate = (counter: CounterLocation, date: string): void => {
  try {
    window.localStorage.setItem(activeRequestDraftDateKey(counter), date);
  } catch {
    // Ignore storage errors
  }
};

const clearActiveRequestDraftDate = (counter: CounterLocation): void => {
  try {
    window.localStorage.removeItem(activeRequestDraftDateKey(counter));
  } catch {
    // Ignore storage errors
  }
};

const hasRequestDraftContent = (
  basket: RequestBasketItem[],
  reason: string,
  selectedProductId: string,
  enteredQty: string
): boolean => {
  if (basket.length > 0) return true;
  if (reason.trim() !== '') return true;
  if (selectedProductId !== '') return true;
  if (enteredQty !== '' && enteredQty !== '1') return true;
  return false;
};

export const RequestsView: React.FC = () => {
  const { currentUser, businessDate, stockItems, requests, submitRequestBatch } = useStock();
  const isAdmin = currentUser?.role === 'ADMIN';
  const counter: CounterLocation = currentUser?.counter || 'NORMAL';

  const initialDraftRef = useRef<{ date: string; draft: RequestDraft | null } | null>(null);
  if (initialDraftRef.current === null && !isAdmin) {
    const directDraft = readRequestDraft(counter, businessDate);
    if (directDraft) {
      initialDraftRef.current = { date: businessDate, draft: directDraft };
    } else {
      const activeDate = readActiveRequestDraftDate(counter);
      const fallbackDraft = activeDate ? readRequestDraft(counter, activeDate) : null;
      initialDraftRef.current = {
        date: activeDate && fallbackDraft ? activeDate : businessDate,
        draft: fallbackDraft
      };
    }
  }

  const draftDate = initialDraftRef.current?.date || businessDate;
  const loadedDraftKeyRef = useRef<string>(`${counter}::${draftDate}`);

  // Request form state (Counter users, hydrated from saved local draft if present)
  const [search, setSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>(
    () => initialDraftRef.current?.draft?.selectedProductId || ''
  );
  const [enteredQty, setEnteredQty] = useState<string>(
    () => initialDraftRef.current?.draft?.enteredQty || '1'
  );
  const [unit, setUnit] = useState<'CASE' | 'BOTTLE'>(
    () => initialDraftRef.current?.draft?.unit || 'CASE'
  );
  const [reason, setReason] = useState<string>(
    () => initialDraftRef.current?.draft?.reason || ''
  );
  const [basket, setBasket] = useState<RequestBasketItem[]>(
    () => initialDraftRef.current?.draft?.basket || []
  );
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(() => {
    const raw = initialDraftRef.current?.draft?.savedAt;
    if (!raw) return null;
    const formatted = formatDraftTime(new Date(raw));
    return formatted || raw;
  });
  const [justSavedDraft, setJustSavedDraft] = useState(false);
  const [confirmingClearDraft, setConfirmingClearDraft] = useState(false);
  const justSavedTimerRef = useRef<number | null>(null);

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [lastSubmittedAlertText, setLastSubmittedAlertText] = useState<string>('');
  const [copiedAlert, setCopiedAlert] = useState(false);

  const selectedProduct = stockItems.find(p => p.productId === selectedProductId);
  const pack = selectedProduct ? bottlesPerCase_(selectedProduct) : 1;
  const numQty = Number(enteredQty) || 0;
  const equivalentBottles = numQty * (unit === 'CASE' ? pack : 1);

  // Filter products for search
  const availableProducts = stockItems.filter(p => p.active && p.godownAvailable > 0);
  const searchResults = search.trim()
    ? sortProductsCategoryWise(
        availableProducts.filter(p => matchesSearchQuery(search, p.name, p.category, p.sizeML, p.productId))
      ).slice(0, 12)
    : [];

  const handleAddToBasket = () => {
    if (!selectedProduct) return;
    if (numQty <= 0) return;
    if (equivalentBottles > selectedProduct.godownAvailable) {
      setStatusMessage({
        type: 'err',
        text: `Requested quantity (${equivalentBottles} btls) exceeds Godown available stock (${selectedProduct.godownAvailable} btls).`
      });
      return;
    }

    setBasket(prev => {
      const existing = prev.find(b => b.productId === selectedProduct.productId && b.unit === unit);
      if (existing) {
        return prev.map(b => b === existing ? {
          ...b,
          qty: b.qty + numQty,
          bottles: b.bottles + equivalentBottles
        } : b);
      }
      return [
        ...prev,
        {
          productId: selectedProduct.productId,
          name: selectedProduct.name,
          sizeML: selectedProduct.sizeML,
          casePack: pack,
          qty: numQty,
          unit,
          bottles: equivalentBottles
        }
      ];
    });

    setEnteredQty('1');
    setStatusMessage(null);
  };

  const handleOpenPreview = () => {
    if (!basket.length) {
      setStatusMessage({ type: 'err', text: 'Please add at least one product to the basket.' });
      return;
    }
    setShowPreviewModal(true);
  };

  const hasCurrentDraftContent = hasRequestDraftContent(basket, reason, selectedProductId, enteredQty);

  const latestDraftSnapshotRef = useRef({
    isAdmin,
    counter,
    date: draftDate,
    basket,
    reason,
    selectedProductId,
    enteredQty,
    unit
  });
  latestDraftSnapshotRef.current = {
    isAdmin,
    counter,
    date: draftDate,
    basket,
    reason,
    selectedProductId,
    enteredQty,
    unit
  };

  // Hydrate draft if counter changes while mounted
  useEffect(() => {
    const expectedKey = `${counter}::${draftDate}`;
    if (loadedDraftKeyRef.current !== expectedKey) {
      const nextDraft = !isAdmin ? readRequestDraft(counter, draftDate) : null;
      loadedDraftKeyRef.current = expectedKey;
      setBasket(nextDraft?.basket || []);
      setReason(nextDraft?.reason || '');
      setSelectedProductId(nextDraft?.selectedProductId || '');
      setEnteredQty(nextDraft?.enteredQty || '1');
      setUnit(nextDraft?.unit || 'CASE');
      setDraftSavedAt(
        nextDraft?.savedAt ? formatDraftTime(new Date(nextDraft.savedAt)) || nextDraft.savedAt : null
      );
      setConfirmingClearDraft(false);
      setJustSavedDraft(false);
    }
  }, [counter, draftDate, isAdmin]);

  // Auto-save draft locally whenever basket or form fields change
  useEffect(() => {
    if (isAdmin) return;
    if (loadedDraftKeyRef.current !== `${counter}::${draftDate}`) return;

    if (hasCurrentDraftContent) {
      const now = new Date();
      writeRequestDraft(counter, draftDate, {
        basket,
        reason,
        selectedProductId,
        enteredQty,
        unit,
        savedAt: now.toISOString()
      });
      writeActiveRequestDraftDate(counter, draftDate);
      setDraftSavedAt(formatDraftTime(now));
    } else {
      removeRequestDraft(counter, draftDate);
      if (readActiveRequestDraftDate(counter) === draftDate) {
        clearActiveRequestDraftDate(counter);
      }
      setDraftSavedAt(null);
    }
  }, [isAdmin, counter, draftDate, hasCurrentDraftContent, basket, reason, selectedProductId, enteredQty, unit]);

  // Synchronous flush on unmount (e.g., switching tabs) and timer cleanup
  useEffect(() => {
    return () => {
      if (justSavedTimerRef.current !== null) {
        window.clearTimeout(justSavedTimerRef.current);
      }
      const snap = latestDraftSnapshotRef.current;
      if (snap.isAdmin) return;
      if (hasRequestDraftContent(snap.basket, snap.reason, snap.selectedProductId, snap.enteredQty)) {
        writeRequestDraft(snap.counter, snap.date, {
          basket: snap.basket,
          reason: snap.reason,
          selectedProductId: snap.selectedProductId,
          enteredQty: snap.enteredQty,
          unit: snap.unit,
          savedAt: new Date().toISOString()
        });
        writeActiveRequestDraftDate(snap.counter, snap.date);
      }
    };
  }, []);

  const handleSaveDraft = () => {
    if (!hasCurrentDraftContent) {
      setStatusMessage({
        type: 'err',
        text: 'Nothing to save yet. Select a product or add items to the request basket first.'
      });
      return;
    }

    const now = new Date();
    const ok = writeRequestDraft(counter, draftDate, {
      basket,
      reason,
      selectedProductId,
      enteredQty,
      unit,
      savedAt: now.toISOString()
    });

    if (ok) {
      writeActiveRequestDraftDate(counter, draftDate);
      setDraftSavedAt(formatDraftTime(now));
      setConfirmingClearDraft(false);
      setJustSavedDraft(true);
      setStatusMessage(null);
      if (justSavedTimerRef.current !== null) {
        window.clearTimeout(justSavedTimerRef.current);
      }
      justSavedTimerRef.current = window.setTimeout(() => {
        setJustSavedDraft(false);
      }, 2500);
    } else {
      setStatusMessage({
        type: 'err',
        text: 'Unable to save draft in browser storage. Please check browser storage permissions.'
      });
    }
  };

  const handleConfirmClearDraft = () => {
    removeRequestDraft(counter, draftDate);
    removeRequestDraft(counter, businessDate);
    clearActiveRequestDraftDate(counter);
    setBasket([]);
    setReason('');
    setSelectedProductId('');
    setEnteredQty('1');
    setUnit('CASE');
    setSearch('');
    setDraftSavedAt(null);
    setConfirmingClearDraft(false);
    setJustSavedDraft(false);
    setStatusMessage({
      type: 'ok',
      text: 'Cleared saved Godown request draft.'
    });
  };

  const handleConfirmSubmitRequest = async () => {
    try {
      setIsSubmitting(true);
      if (!basket.length) throw new Error('Please add at least one product to the basket.');

      const finalReason = reason.trim() || 'Counter replenishment';

      await submitRequestBatch({
        date: businessDate,
        reason: finalReason,
        items: basket.map(b => ({
          productId: b.productId,
          qty: b.qty,
          unit: b.unit
        }))
      });

      const totalBottles = basket.reduce((s, b) => s + b.bottles, 0);
      const counterLabel = currentUser?.counter === 'AC' ? 'AC Counter' : 'Normal Counter';
      const itemLines = basket.map(b => `• ${b.name} ${b.sizeML}ml × ${b.qty} ${b.unit} (${b.bottles} btls)`).join('\n');
      const alertTxt = `*MM Residency – New Stock Request*\nCounter: ${counterLabel}\nDate: ${businessDate}\nTotal: ${basket.length} item(s), ${totalBottles} bottles\nReason: ${finalReason}\n\n${itemLines}\n\nPlease approve in Admin Approvals Queue.`;

      removeRequestDraft(counter, draftDate);
      removeRequestDraft(counter, businessDate);
      clearActiveRequestDraftDate(counter);

      setLastSubmittedAlertText(alertTxt);
      setCopiedAlert(false);
      setShowPreviewModal(false);
      setStatusMessage({ type: 'ok', text: `${basket.length} item(s) requested successfully. Admin has been notified live for approval.` });
      setBasket([]);
      setReason('');
      setSelectedProductId('');
      setEnteredQty('1');
      setUnit('CASE');
      setDraftSavedAt(null);
      setConfirmingClearDraft(false);
      setJustSavedDraft(false);
    } catch (e: any) {
      setStatusMessage({ type: 'err', text: e.message || 'Error submitting request.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickReasons = ['Counter replenishment', 'Stock finished', 'Running low', 'Weekend rush peak', 'Customer demand'];

  return (
    <div className="print-surface space-y-6">
      <div className="print-header text-center">
        <h1 className="text-xl font-black tracking-tight">MM RESIDENCY – INVENTORY & BAR MANAGEMENT</h1>
        <h2 className="text-sm font-bold uppercase tracking-wider mt-1">
          {isAdmin ? 'ALL COUNTER GODOWN STOCK REQUESTS' : `${currentUser?.counter || 'COUNTER'} STOCK INDENT HISTORY`}
        </h2>
        <div className="text-xs text-slate-600 mt-1">
          Business Date: {businessDate} · Printed: {new Date().toLocaleString('en-IN')} · Total Records: {requests.length}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-[11px] font-extrabold tracking-widest text-amber-600 dark:text-amber-400 uppercase">
            Indent & Fulfillment
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {isAdmin ? 'Counter Stock Requests' : 'Request Stock from Central Godown'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Request case lots or loose bottles from Godown storage into {currentUser?.counter || 'Counter'}
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="no-print flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Printer className="h-4 w-4" />
          <span>Print Requests Log</span>
        </button>
      </div>

      {statusMessage && (
        <div
          className={`no-print rounded-xl border p-4 text-xs font-semibold space-y-2.5 ${
            statusMessage.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300'
          }`}
        >
          <div>{statusMessage.text}</div>
          {statusMessage.type === 'ok' && lastSubmittedAlertText && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(lastSubmittedAlertText);
                  setCopiedAlert(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-slate-900 dark:text-emerald-300 cursor-pointer"
              >
                <Copy className="h-3 w-3" />
                <span>{copiedAlert ? 'Copied!' : 'Copy Request Message'}</span>
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(lastSubmittedAlertText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition-colors"
              >
                <Share2 className="h-3 w-3" />
                <span>Send WhatsApp Alert to Admin</span>
              </a>
            </div>
          )}
        </div>
      )}

      {/* COUNTER WORKSPACE: Request Builder */}
      {!isAdmin && (
        <div className="no-print grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Item Selector Form */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Select Product & Quantity
            </h2>

            {/* Live Search */}
            <div className="relative">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Fast Product Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Type brand name to search..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
                  {searchResults.map(p => (
                    <button
                      key={p.productId}
                      type="button"
                      onClick={() => {
                        setSelectedProductId(p.productId);
                        setSearch('');
                      }}
                      className="w-full p-2.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{p.name} {p.sizeML}ml</div>
                        <span className="text-[10px] text-slate-500">{p.category} · {p.casePack}/case</span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400">
                        Godown: {stockQtyLabel(p.godownAvailable, p.casePack)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Dropdown */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Select from Catalogue
              </label>
              <select
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Choose a product...</option>
                {availableProducts.map(p => (
                  <option key={p.productId} value={p.productId}>
                    {p.name} {p.sizeML}ml — {p.casePack}/case (Godown Avail: {p.godownAvailable} btls)
                  </option>
                ))}
              </select>
            </div>

            {/* Product stock availability info note */}
            {selectedProduct && (
              <div className="rounded-lg bg-blue-50/70 p-3 text-xs text-blue-900 dark:bg-blue-950/40 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                <div className="font-bold">{selectedProduct.name} {selectedProduct.sizeML}ml</div>
                <div className="mt-1 flex items-center gap-4 text-[11px]">
                  <span>Godown Available: <strong>{stockQtyLabel(selectedProduct.godownAvailable, pack)}</strong></span>
                  <span>My Counter Stock: <strong>{stockQtyLabel(selectedProduct[currentUser?.counter?.toLowerCase() as 'normal' | 'ac'] || 0, pack)}</strong></span>
                </div>
              </div>
            )}

            {/* Quantity and Unit */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={enteredQty}
                  onChange={e => setEnteredQty(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-xs font-bold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Unit</label>
                <select
                  value={unit}
                  onChange={e => setUnit(e.target.value as 'CASE' | 'BOTTLE')}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="CASE">Cases</option>
                  <option value="BOTTLE">Bottles</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Equivalent</label>
                <div className="rounded-lg border border-slate-200 bg-slate-100/60 p-2 font-mono text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {equivalentBottles} bottles
                </div>
              </div>
            </div>

            <button
              disabled={!selectedProduct || numQty <= 0}
              onClick={handleAddToBasket}
              className="w-full rounded-lg bg-slate-900 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-40 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 transition-colors"
            >
              + Add to Request Basket
            </button>
          </div>

          {/* Basket & Submit */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-amber-500" />
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">Request Basket</h2>
                  </div>
                  {draftSavedAt && (
                    <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Draft auto-saved at {draftSavedAt}
                    </div>
                  )}
                </div>
                <span className="text-xs font-mono tabular-nums font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0">
                  {basket.length} {basket.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {basket.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
                  {basket.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                        <span className="text-[11px] text-slate-500">
                          {item.qty} {item.unit.toLowerCase()}s ({item.bottles} btls)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBasket(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  Basket is empty. Select products on the left.
                </div>
              )}
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Reason for Request <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Counter replenishment, Running low..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Quick reason chips */}
              <div className="flex flex-wrap gap-1.5">
                {quickReasons.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Draft Save & Clear Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    justSavedDraft
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : 'border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50'
                  }`}
                >
                  {justSavedDraft ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                  <span>{justSavedDraft ? 'Draft Saved' : 'Save Draft'}</span>
                </button>

                {confirmingClearDraft ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleConfirmClearDraft}
                      className="flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Confirm Clear</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingClearDraft(false)}
                      className="rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Keep
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!hasCurrentDraftContent && !draftSavedAt}
                    onClick={() => setConfirmingClearDraft(true)}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Clear Draft</span>
                  </button>
                )}
              </div>

              <button
                disabled={!basket.length}
                onClick={handleOpenPreview}
                className="w-full rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
              >
                Preview & Submit Request ({basket.reduce((s, b) => s + b.bottles, 0)} btls)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBMISSION PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-start justify-between border-b pb-3 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                  Step 2 of 2: Confirm Indent
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Stock Request Preview
                </h3>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Destination</span>
                <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                  {currentUser?.counter === 'AC' ? 'AC Counter' : 'Normal Counter'}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Shift Date</span>
                <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5 font-mono">
                  {businessDate}
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-amber-50/70 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 border border-amber-200/70 dark:border-amber-900/50">
              <span className="font-bold">Reason:</span> {reason.trim() || 'Counter replenishment (default)'}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-800/80 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 flex justify-between">
                <span>Requested Items ({basket.length})</span>
                <span>Quantity</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                {basket.map((item, idx) => (
                  <div key={idx} className="p-3 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{item.name} {item.sizeML}ml</div>
                      <span className="text-[11px] text-slate-500">{item.qty} {item.unit.toLowerCase()}(s) · {item.casePack}/case</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                        {item.bottles} btls
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/80 px-3 py-2.5 text-xs font-bold flex justify-between items-center border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300">TOTAL STOCK TO INDENT:</span>
                <span className="font-mono text-base font-black text-slate-900 dark:text-white">
                  {basket.reduce((s, b) => s + b.bottles, 0)} bottles
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowPreviewModal(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                ← Back / Edit Items
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmSubmitRequest}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Submitting...</span>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirm & Submit to Godown</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Requests History List */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          {isAdmin ? 'All Counter Requests' : 'My Requests History'}
        </h2>

        <div className="print-card rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
          <div className="print-table-wrap overflow-x-auto">
            <table className="print-table w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 font-bold uppercase text-[10px] text-slate-600 dark:text-slate-400">
                  <th className="py-3 px-4">Date</th>
                  {isAdmin && <th className="py-3 px-4">Counter</th>}
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Requested Qty</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {requests.map(r => (
                  <tr key={r.requestId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-semibold">{r.date}</td>
                    {isAdmin && (
                      <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        {r.counter === 'NORMAL' ? 'Normal Counter' : 'AC Counter'}
                      </td>
                    )}
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{r.productName}</td>
                    <td className="py-3 px-4 font-mono font-bold">
                      {r.enteredQty} {r.unit.toLowerCase()} ({r.qty} btls)
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{r.reason}</td>
                    <td className="py-3 px-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        r.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : r.status === 'Pending'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : r.status === 'Reversed'
                          ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">{r.remark || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
