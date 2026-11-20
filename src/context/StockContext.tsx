import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User, Product, StockItem, PurchaseBatch, StockRequestItem, StockTransfer,
  DailySalesReport, DailyOperation, StockLedgerEntry, AuditLogEntry, DropdownOption,
  CounterLocation, StockLocation, Role, RequestGroup
} from '../types';
import {
  INITIAL_USERS, INITIAL_PRODUCTS, INITIAL_STOCK, INITIAL_SUPPLIERS,
  INITIAL_DROPDOWN_OPTIONS, bottlesPerCase_, sortProductsCategoryWise
} from '../data/initialData';

interface StockContextType {
  currentUser: User | null;
  businessDate: string;
  theme: 'light' | 'dark';
  users: User[];
  products: Product[];
  stockItems: StockItem[];
  purchases: PurchaseBatch[];
  requests: StockRequestItem[];
  transfers: StockTransfer[];
  dailySales: DailySalesReport[];
  operations: DailyOperation[];
  ledger: StockLedgerEntry[];
  auditLog: AuditLogEntry[];
  suppliers: string[];
  dropdownOptions: DropdownOption[];
  pendingCount: number;

  // Cloud & Multi-Device Sync & Admin Request Notifications
  syncStatus: 'synced' | 'syncing' | 'offline';
  lastSyncTime: string;
  triggerManualSync: () => Promise<void>;
  pendingRequests: StockRequestItem[];
  latestRequestAlert: {
    id: string;
    counter: string;
    itemCount: number;
    totalBottles: number;
    reason: string;
    createdAt: string;
    productNames: string[];
  } | null;
  dismissRequestAlert: () => void;
  soundEnabled: boolean;
  toggleSoundAlerts: () => void;
  browserNotifStatus: 'default' | 'granted' | 'denied' | 'unsupported';
  requestBrowserNotifPermission: () => Promise<'default' | 'granted' | 'denied' | 'unsupported'>;

  // Actions
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchUser: (username: string) => void;
  setBusinessDate: (date: string) => void;
  toggleTheme: () => void;
  changePassword: (oldPw: string, newPw: string) => Promise<void>;

  // Products & Stock Adjustments
  saveProduct: (p: Partial<Product> & { name: string; category: string; sizeML: number; casePack: number; sellingPrice: number }) => Promise<string>;
  adminAdjustStock: (data: { productId: string; godown: number; normal: number; ac: number; reason?: string }) => Promise<void>;

  // Purchases
  submitPurchaseBatch: (batch: {
    supplier: string; date: string; billDate: string; invoiceNo: string;
    permitNumber?: string; documentNumber?: string;
    lines: { productId: string; qty: number; enteredQty?: number; unit?: 'CASE' | 'BOTTLE'; rate: number; sedAmt: number; discountAmt: number; tcsPct: number }[];
  }) => Promise<string>;
  reviewPurchaseBill: (batchId: string, decision: 'APPROVE' | 'REJECT', remark?: string) => Promise<void>;
  editPurchaseRecord: (id: string, updates: { date: string; billDate: string; supplier: string; invoiceNo: string; qty: number; rate: number; sedAmt: number; discountAmt: number; tcsPct: number; reason: string }) => Promise<void>;

  // Requests
  submitRequestBatch: (data: { date: string; reason: string; items: { productId: string; qty: number; unit: 'CASE' | 'BOTTLE' }[] }) => Promise<void>;
  reviewRequestGroup: (ids: string[], decision: 'APPROVE' | 'REJECT', remark?: string, skipShort?: boolean) => Promise<{ approved: number; rejected: number }>;

  // Transfers
  submitTransfer: (data: { productId: string; qty: number; unit?: 'CASE' | 'BOTTLE'; to?: CounterLocation; note?: string }) => Promise<{ autoApproved: boolean }>;

  // Daily Sales
  getReportFormLines: (counter: CounterLocation, date: string) => { lines: any[]; blockedMessage?: string; pendingGodownCount: number };
  submitDailySales: (data: {
    date: string; cashAmount: number; upiAmount: number; cardAmount: number;
    acCharges?: number;
    recordedAmount: number; cashierName: string; helperName: string;
    paymentExplanation?: string; lines: { productId: string; closing: number }[];
    counter?: CounterLocation;
  }) => Promise<string>;
  adminCreateHistoricalReport: (data: {
    date: string; counter: CounterLocation; recordedAmount: number; reason: string;
    lines: { productId: string; sold: number }[];
  }) => Promise<string>;
  adminEditReport: (reportId: string, data: { recordedAmount: number; reason: string; lines: { productId: string; closing?: number; sold?: number }[] }) => Promise<void>;
  reviewDailySales: (reportId: string, decision: 'APPROVE' | 'REJECT', remark?: string) => Promise<void>;
  adminDeleteDailySales: (reportId: string, reason?: string) => Promise<void>;

  // Daily Operations
  saveDailyOperation: (data: {
    type: 'EXPENSE' | 'WAGE' | 'ROOM' | 'DAMAGE'; date: string; name: string;
    amount: number; payment?: 'Cash' | 'UPI' | 'Card'; roomNo?: number;
    location?: StockLocation; productId?: string; qty?: number; note?: string;
  }) => Promise<string>;
  saveDailyOperationsBatch: (data: {
    type: 'EXPENSE' | 'WAGE'; date: string;
    items: { name: string; amount: number; note?: string }[];
  }) => Promise<{ count: number; total: number }>;
  reviewDailyOperation: (id: string, decision: 'APPROVE' | 'REJECT', remark?: string) => Promise<void>;

  // Administration
  addSupplier: (name: string) => Promise<void>;
  addDropdownOption: (type: 'EXPENSE' | 'WAGE', value: string) => Promise<void>;
  createUser: (user: { username: string; fullName: string; role: Role; password: string }) => Promise<void>;
  resetUserPassword: (userId: string, newPw: string) => Promise<void>;
  toggleUserActive: (userId: string, active: boolean) => Promise<void>;
  reconcileStock: () => { checked: number; issues: any[] };
  syncLedger: () => number;
  resetToSampleData: () => void;
}

const STORAGE_KEY = 'mm_residency_stock_v2_store';
const CATALOG_VERSION = '2026-11-20-opening-v1';
const OPENING_EPOCH = '2026-11-20-opening-v1';

function buildInitialStockMap(): Record<string, { godown: number; normal: number; ac: number }> {
  const base: Record<string, { godown: number; normal: number; ac: number }> = {};
  INITIAL_PRODUCTS.forEach(p => {
    const s = INITIAL_STOCK[p.productId];
    base[p.productId] = s ? { ...s } : { godown: 0, normal: 0, ac: 0 };
  });
  return base;
}

function ensureOpeningEpochReset(): void {
  try {
    const curEpoch = localStorage.getItem(STORAGE_KEY + '_opening_epoch');
    if (curEpoch !== OPENING_EPOCH) {
      [
        '_products',
        '_stock',
        '_purchases',
        '_requests',
        '_transfers',
        '_daily_sales',
        '_operations',
        '_ledger',
        '_audit'
      ].forEach(suffix => localStorage.removeItem(STORAGE_KEY + suffix));
      localStorage.setItem(STORAGE_KEY + '_opening_epoch', OPENING_EPOCH);
      localStorage.setItem(STORAGE_KEY + '_catalog_version', CATALOG_VERSION);
      localStorage.setItem('mm_business_date', getTodayISO());
    }
  } catch {
    // Ignore storage access issues
  }
}

const LEGACY_NAME_ALIASES: Record<string, string> = {
  'MORPHEUSXOBRANDY|750': 'MORPHEUSXOBDY|750',
  'MORPHEUSXOBRANDY|60': 'MORPHEUSXOBDY|60',
  '100PIPERSEXQUISITEWHY|750': '100PIPERSEXQUISTEWHY|750',
  'SULASHIRAZCABERNETRED|750': 'SULASHRIAZCABERNETRED|750'
};

function normCatalogKey(name: string, sizeML: number): string {
  const raw = String(name || '').toUpperCase().replace(/[^A-Z0-9]/g, '') + '|' + Number(sizeML || 0);
  return LEGACY_NAME_ALIASES[raw] || raw;
}

function mergeCatalogueWithDefaults(existing: Product[]): Product[] {
  if (!Array.isArray(existing) || existing.length === 0) return INITIAL_PRODUCTS;
  const existingByKey = new Map<string, Product>();
  existing.forEach(p => {
    existingByKey.set(normCatalogKey(p.name, p.sizeML), p);
  });
  const usedExistingIds = new Set<string>();
  const merged: Product[] = [];
  const takenIds = new Set<string>(existing.map(p => p.productId));
  let maxNum = existing.reduce(
    (m, p) => Math.max(m, Number(String(p.productId).replace(/\D/g, '')) || 0),
    INITIAL_PRODUCTS.length
  );

  INITIAL_PRODUCTS.forEach(def => {
    const defKey = normCatalogKey(def.name, def.sizeML);
    const byKey = existingByKey.get(defKey);
    const byId =
      Number(String(def.productId).replace(/\D/g, '')) <= 33
        ? existing.find(p => p.productId === def.productId)
        : undefined;
    const match = byKey || byId;
    if (match) {
      usedExistingIds.add(match.productId);
      merged.push({
        ...match,
        name: def.name,
        category: def.category,
        sizeML: def.sizeML,
        casePack: def.casePack,
        sellingPrice: def.sellingPrice
      });
    } else {
      let pid = def.productId;
      if (takenIds.has(pid)) {
        maxNum += 1;
        pid = `PRD-${String(maxNum).padStart(6, '0')}`;
      }
      takenIds.add(pid);
      merged.push({ ...def, productId: pid });
    }
  });

  existing.forEach(p => {
    if (!usedExistingIds.has(p.productId)) {
      merged.push(p);
    }
  });
  return sortProductsCategoryWise(merged);
}

function getTodayISO(): string {
  const d = new Date();
  const pad = (n: number) => ('0' + n).slice(-2);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getNowTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => ('0' + n).slice(-2);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

export const StockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  ensureOpeningEpochReset();

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('mm_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [businessDate, setBusinessDateState] = useState<string>(() => {
    try {
      return localStorage.getItem('mm_business_date') || getTodayISO();
    } catch {
      return getTodayISO();
    }
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('mm_theme') as 'light' | 'dark') || 'light';
    } catch {
      return 'light';
    }
  });

  // Database tables
  const [users, setUsers] = useState<User[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY + '_users');
    return raw ? JSON.parse(raw) : INITIAL_USERS;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY + '_products');
    const storedVer = localStorage.getItem(STORAGE_KEY + '_catalog_version');
    if (!raw) {
      localStorage.setItem(STORAGE_KEY + '_catalog_version', CATALOG_VERSION);
      return INITIAL_PRODUCTS;
    }
    const parsed = JSON.parse(raw) as Product[];
    if (storedVer !== CATALOG_VERSION) {
      localStorage.setItem(STORAGE_KEY + '_catalog_version', CATALOG_VERSION);
      return mergeCatalogueWithDefaults(parsed);
    }
    return sortProductsCategoryWise(parsed);
  });

  const [stock, setStock] = useState<Record<string, { godown: number; normal: number; ac: number }>>(() => {
    const raw = localStorage.getItem(STORAGE_KEY + '_stock');
    const base = raw ? JSON.parse(raw) : buildInitialStockMap();
    INITIAL_PRODUCTS.forEach(p => {
      if (!base[p.productId]) {
        base[p.productId] = { godown: 0, normal: 0, ac: 0 };
      }
    });
    return base;
  });

  const [purchases, setPurchases] = useState<PurchaseBatch[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY + '_purchases');
    return raw ? JSON.parse(raw) : [];
  });

  const [requests, setRequests] = useState<StockRequestItem[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY + '_requests');
    return raw ? JSON.parse(raw) : [];
  });

  const [transfers, setTransfers] = useState<StockTransfer[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY + '_transfers');
    return raw ? JSON.parse(raw) : [];
  });

  const [dailySales, setDailySales] = useState<DailySalesReport[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY + '_daily_sales');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return parsed.map((r: any) => r.status === 'Pending' ? { ...r, status: 'Approved', reviewedBy: 'Auto-Approved' } : r);
      } catch {
        // Fallback
      }
    }
    return [];
  });

  const [operations, setOperations] = useState<DailyOperation[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY + '_operations');
    return raw ? JSON.parse(raw) : [];
  });

  const [ledger, setLedger] = useState<StockLedgerEntry[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY + '_ledger');
    return raw ? JSON.parse(raw) : [];
  });

  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY + '_audit');
    return raw ? JSON.parse(raw) : [];
  });

  const [suppliers, setSuppliers] = useState<string[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY + '_suppliers');
    return raw ? JSON.parse(raw) : INITIAL_SUPPLIERS;
  });

  const [dropdownOptions, setDropdownOptions] = useState<DropdownOption[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY + '_dropdowns');
    return raw ? JSON.parse(raw) : INITIAL_DROPDOWN_OPTIONS;
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_users', JSON.stringify(users));
  }, [users]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_products', JSON.stringify(products));
  }, [products]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_stock', JSON.stringify(stock));
  }, [stock]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_purchases', JSON.stringify(purchases));
  }, [purchases]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_requests', JSON.stringify(requests));
  }, [requests]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_transfers', JSON.stringify(transfers));
  }, [transfers]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_daily_sales', JSON.stringify(dailySales));
  }, [dailySales]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_operations', JSON.stringify(operations));
  }, [operations]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_ledger', JSON.stringify(ledger));
  }, [ledger]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_audit', JSON.stringify(auditLog));
  }, [auditLog]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_dropdowns', JSON.stringify(dropdownOptions));
  }, [dropdownOptions]);

  // Cloud Multi-Device Sync Engine + Real-Time Admin Notifications
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString());
  const isServerHydrated = React.useRef(false);
  const isSyncingRef = React.useRef(false);
  const isApplyingRemoteRef = React.useRef(false);
  const serverVersionRef = React.useRef(0);
  const seenPendingIdsRef = React.useRef<Set<string> | null>(null);

  const [latestRequestAlert, setLatestRequestAlert] = useState<StockContextType['latestRequestAlert']>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('mm_notif_sound');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [browserNotifStatus, setBrowserNotifStatus] = useState<'default' | 'granted' | 'denied' | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission as 'default' | 'granted' | 'denied';
  });

  const playNotificationChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      [660, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.14);
        gain.gain.setValueAtTime(0.001, now + i * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.14, now + i * 0.14 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.14 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.14);
        osc.stop(now + i * 0.14 + 0.24);
      });
    } catch {
      // Ignore audio errors if blocked by browser autoplay policy
    }
  };

  const toggleSoundAlerts = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      localStorage.setItem('mm_notif_sound', String(next));
      if (next) playNotificationChime();
      return next;
    });
  };

  const requestBrowserNotifPermission = async (): Promise<'default' | 'granted' | 'denied' | 'unsupported'> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setBrowserNotifStatus('unsupported');
      return 'unsupported';
    }
    try {
      const perm = await Notification.requestPermission();
      setBrowserNotifStatus(perm);
      return perm;
    } catch {
      return browserNotifStatus;
    }
  };

  const dismissRequestAlert = () => setLatestRequestAlert(null);

  // Detect newly arrived pending requests and alert Admin immediately
  useEffect(() => {
    const currentPending = requests.filter(r => r.status === 'Pending');
    const currentPendingIds = new Set(currentPending.map(r => r.requestId));

    if (!isServerHydrated.current) return;

    if (seenPendingIdsRef.current === null) {
      seenPendingIdsRef.current = currentPendingIds;
      return;
    }

    const newlyArrived = currentPending.filter(r => !seenPendingIdsRef.current!.has(r.requestId));
    seenPendingIdsRef.current = currentPendingIds;

    if (newlyArrived.length > 0 && currentUser?.role === 'ADMIN') {
      const totalBottles = newlyArrived.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
      const first = newlyArrived[0];
      const counterLabel = first.counter === 'AC' ? 'AC Counter' : 'Normal Counter';
      const productNames = newlyArrived.slice(0, 3).map(r => `${r.productName} (${r.enteredQty || r.qty} ${r.unit || 'BTL'})`);

      setLatestRequestAlert({
        id: first.requestId,
        counter: counterLabel,
        itemCount: newlyArrived.length,
        totalBottles,
        reason: first.reason || 'Counter replenishment',
        createdAt: first.createdAt || getNowTimestamp(),
        productNames
      });

      if (soundEnabled) {
        playNotificationChime();
      }

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const n = new Notification(`New Stock Request · ${counterLabel}`, {
            body: `${newlyArrived.length} item(s) · ${totalBottles} bottles (${productNames.join(', ')})`,
            tag: `req-${first.requestId}`
          });
          n.onclick = () => {
            window.focus();
            n.close();
          };
        } catch {
          // Notification constructor may be restricted in some embedded WebViews
        }
      }
    }
  }, [requests, currentUser?.role, soundEnabled]);

  // Pull state from /api/state
  const pullServerState = async (isInitial = false) => {
    if (isSyncingRef.current) return;
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      if (json.success && json.data) {
        const s = json.data;
        if (s._openingEpoch !== OPENING_EPOCH) {
          // Stale pre-opening server state detected: keep clean 2026-11-20 opening dataset and overwrite server store
          const cleanStock = buildInitialStockMap();
          await pushServerState({
            _catalogVersion: CATALOG_VERSION,
            _openingEpoch: OPENING_EPOCH,
            users: INITIAL_USERS,
            products: INITIAL_PRODUCTS,
            stock: cleanStock,
            purchases: [],
            requests: [],
            transfers: [],
            dailySales: [],
            operations: [],
            ledger: [],
            auditLog: [],
            suppliers,
            dropdownOptions
          });
        } else if (isInitial || (json.version && json.version > serverVersionRef.current)) {
          isApplyingRemoteRef.current = true;
          serverVersionRef.current = json.version || 1;
          if (Array.isArray(s.users)) setUsers(s.users);
          if (Array.isArray(s.products)) {
            const mergedProds =
              s._catalogVersion === CATALOG_VERSION
                ? sortProductsCategoryWise(s.products as Product[])
                : mergeCatalogueWithDefaults(s.products as Product[]);
            setProducts(mergedProds);
            localStorage.setItem(STORAGE_KEY + '_catalog_version', CATALOG_VERSION);
          }
          if (s.stock && typeof s.stock === 'object' && !Array.isArray(s.stock)) {
            setStock(s.stock);
          }
          if (Array.isArray(s.purchases)) setPurchases(s.purchases);
          if (Array.isArray(s.requests)) {
            if (isInitial && seenPendingIdsRef.current === null) {
              seenPendingIdsRef.current = new Set(
                s.requests.filter((r: any) => r.status === 'Pending').map((r: any) => r.requestId)
              );
            }
            setRequests(s.requests);
          }
          if (Array.isArray(s.transfers)) setTransfers(s.transfers);
          if (Array.isArray(s.dailySales)) {
            setDailySales(s.dailySales.map((r: any) => r.status === 'Pending' ? { ...r, status: 'Approved', reviewedBy: 'Auto-Approved' } : r));
          }
          if (Array.isArray(s.operations)) setOperations(s.operations);
          if (Array.isArray(s.ledger)) setLedger(s.ledger);
          if (Array.isArray(s.auditLog)) setAuditLog(s.auditLog);
          if (Array.isArray(s.suppliers)) setSuppliers(s.suppliers);
          if (Array.isArray(s.dropdownOptions)) setDropdownOptions(s.dropdownOptions);
        }
      } else {
        // Server store empty: push fresh 2026-11-20 opening dataset immediately so all devices sync cleanly
        await pushServerState({
          _catalogVersion: CATALOG_VERSION,
          _openingEpoch: OPENING_EPOCH,
          users,
          products,
          stock,
          purchases,
          requests,
          transfers,
          dailySales,
          operations,
          ledger,
          auditLog,
          suppliers,
          dropdownOptions
        });
      }
      setSyncStatus('synced');
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch {
      setSyncStatus('offline');
    } finally {
      isServerHydrated.current = true;
    }
  };

  // Push state to /api/state
  const pushServerState = async (payload: any) => {
    try {
      setSyncStatus('syncing');
      isSyncingRef.current = true;
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.version) {
          serverVersionRef.current = json.version;
        }
        setSyncStatus('synced');
        setLastSyncTime(new Date().toLocaleTimeString());
      } else {
        setSyncStatus('offline');
      }
    } catch {
      setSyncStatus('offline');
    } finally {
      isSyncingRef.current = false;
    }
  };

  const triggerManualSync = async () => {
    await pullServerState(true);
  };

  // Hydrate from server on mount, subscribe to live SSE events, plus 5s polling fallback
  useEffect(() => {
    pullServerState(true);
    const interval = setInterval(() => {
      pullServerState(false);
    }, 5000);

    let es: EventSource | null = null;
    if (typeof EventSource !== 'undefined') {
      try {
        es = new EventSource('/api/events');
        es.addEventListener('state_updated', (ev: MessageEvent) => {
          try {
            const data = JSON.parse(ev.data);
            if (data?.version && data.version > serverVersionRef.current) {
              pullServerState(false);
            }
          } catch {
            pullServerState(false);
          }
        });
        es.addEventListener('new_request', () => {
          pullServerState(false);
        });
      } catch {
        // Fallback to interval polling if EventSource fails
      }
    }

    const handleFocus = () => pullServerState(false);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      if (es) es.close();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  // Debounced push to server whenever local state is modified
  useEffect(() => {
    if (!isServerHydrated.current) return;
    if (isApplyingRemoteRef.current) {
      isApplyingRemoteRef.current = false;
      return;
    }
    const payload = {
      _catalogVersion: CATALOG_VERSION,
      _openingEpoch: OPENING_EPOCH,
      users,
      products,
      stock,
      purchases,
      requests,
      transfers,
      dailySales,
      operations,
      ledger,
      auditLog,
      suppliers,
      dropdownOptions
    };
    const handler = setTimeout(() => {
      pushServerState(payload);
    }, 200);

    return () => clearTimeout(handler);
  }, [users, products, stock, purchases, requests, transfers, dailySales, operations, ledger, auditLog, suppliers, dropdownOptions]);

  // Sync theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('mm_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setBusinessDate = (date: string) => {
    setBusinessDateState(date);
    localStorage.setItem('mm_business_date', date);
  };

  // Audit helper
  const addAudit = (action: string, refId: string, details: string, actorUser?: User) => {
    const actor = actorUser || currentUser || { userId: '-', username: 'system', role: 'SYSTEM' as Role };
    const entry: AuditLogEntry = {
      auditId: `AUD-${String(auditLog.length + 1).padStart(6, '0')}`,
      timestamp: getNowTimestamp(),
      userId: actor.userId,
      username: actor.username,
      role: actor.role,
      action,
      refId,
      details
    };
    setAuditLog(prev => [entry, ...prev]);
  };

  // Stock Movement Engine - THE ONLY pathway to change stock levels
  const applyMovements = (
    moves: { loc: StockLocation; productId: string; delta: number }[],
    refType: StockLedgerEntry['refType'],
    refId: string,
    bDate?: string,
    actor?: User
  ) => {
    const now = getNowTimestamp();
    const effectiveBDate = bDate || businessDate || now.slice(0, 10);
    const productMap = new Map(products.map(p => [p.productId, p]));
    const nextSeq = (ledger[0]?.seq || 0) + 1;

    setStock(prevStock => {
      const updatedStock = { ...prevStock };
      const newLedgerEntries: StockLedgerEntry[] = [];

      moves.forEach((m, idx) => {
        if (!m.delta) return;
        const currentLocStock = updatedStock[m.productId] || { godown: 0, normal: 0, ac: 0 };
        const key = m.loc.toLowerCase() as 'godown' | 'normal' | 'ac';
        const before = currentLocStock[key] || 0;
        const after = before + m.delta;

        if (after < 0) {
          const p = productMap.get(m.productId);
          const pName = p ? `${p.name} ${p.sizeML}ml` : m.productId;
          throw new Error(`Not enough stock of ${pName} at ${m.loc}: it has ${before} but ${-m.delta} is needed.`);
        }

        updatedStock[m.productId] = {
          ...currentLocStock,
          [key]: after
        };

        const prod = productMap.get(m.productId);
        newLedgerEntries.push({
          seq: nextSeq + idx,
          ledgerId: `LED-${String(ledger.length + idx + 1).padStart(6, '0')}`,
          timestamp: now,
          location: m.loc,
          productId: m.productId,
          productName: prod ? `${prod.name} ${prod.sizeML}ml` : m.productId,
          delta: m.delta,
          balanceAfter: after,
          refType,
          refId,
          approvedBy: (actor || currentUser)?.username || 'system',
          businessDate: effectiveBDate
        });
      });

      if (newLedgerEntries.length > 0) {
        setLedger(prev => [...newLedgerEntries, ...prev]);
        newLedgerEntries.forEach(l => {
          addAudit(
            'STOCK_CHANGE',
            refId,
            `${l.location} | ${l.productName} | ${l.delta > 0 ? '+' : ''}${l.delta} → ${l.balanceAfter} (${refType})`,
            actor
          );
        });
      }

      return updatedStock;
    });
  };

  // Stock items with computed available quantities
  const stockItems: StockItem[] = products.map(p => {
    const s = stock[p.productId] || { godown: 0, normal: 0, ac: 0 };
    // Pending godown requests reduce available godown stock
    const pendingGodownQty = requests
      .filter(r => r.status === 'Pending' && r.productId === p.productId)
      .reduce((sum, r) => sum + (r.qty || 0), 0);

    return {
      productId: p.productId,
      name: p.name,
      category: p.category,
      sizeML: p.sizeML,
      casePack: bottlesPerCase_(p),
      price: p.sellingPrice,
      godown: s.godown,
      godownAvailable: Math.max(0, s.godown - pendingGodownQty),
      normal: s.normal,
      ac: s.ac,
      active: p.active
    };
  });

  // Pending items count for admin badge (Only stock requests from Central Godown require Admin approval)
  const pendingCount =
    currentUser?.role === 'ADMIN'
      ? requests.filter(r => r.status === 'Pending').length
      : requests.filter(r => r.status === 'Pending' && r.counter === currentUser?.counter).length;

  // User Auth Actions
  const login = async (username: string, password: string) => {
    const cleanU = username.trim().toLowerCase();
    const user = users.find(u => u.username.toLowerCase() === cleanU && u.active);
    if (!user) {
      addAudit('LOGIN_FAILED', '', `Unknown user or inactive: ${cleanU}`);
      return { success: false, error: 'Wrong username or password.' };
    }
    if (user.password && user.password !== password) {
      addAudit('LOGIN_FAILED', '', `Incorrect password for ${cleanU}`, user);
      return { success: false, error: 'Wrong username or password.' };
    }
    setCurrentUser(user);
    localStorage.setItem('mm_user', JSON.stringify(user));
    addAudit('LOGIN_OK', '', `Logged in as ${user.fullName} (${user.role})`, user);
    return { success: true };
  };

  const logout = () => {
    if (currentUser) {
      addAudit('LOGOUT', '', 'User signed out');
    }
    setCurrentUser(null);
    localStorage.removeItem('mm_user');
  };

  const switchUser = (username: string) => {
    const u = users.find(x => x.username.toLowerCase() === username.toLowerCase());
    if (u) {
      setCurrentUser(u);
      localStorage.setItem('mm_user', JSON.stringify(u));
      addAudit('USER_SWITCH', '', `Switched active profile to ${u.username}`);
    }
  };

  const changePassword = async (oldPw: string, newPw: string) => {
    if (!currentUser) throw new Error('Not logged in');
    if (currentUser.password && currentUser.password !== oldPw) {
      throw new Error('Current password is incorrect.');
    }
    if (newPw.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }
    setUsers(prev => prev.map(u => u.userId === currentUser.userId ? { ...u, password: newPw, mustChange: false } : u));
    setCurrentUser(prev => prev ? { ...prev, password: newPw, mustChange: false } : null);
    addAudit('PASSWORD_CHANGED', currentUser.userId, 'User changed own password');
  };

  // Product management
  const saveProduct = async (p: Partial<Product> & { name: string; category: string; sizeML: number; casePack: number; sellingPrice: number; purchaseCost?: number; reorderThreshold?: number }) => {
    if (currentUser?.role !== 'ADMIN') throw new Error('Admin permission required.');
    const pack = bottlesPerCase_({ name: p.name, sizeML: p.sizeML, casePack: p.casePack });

    if (p.productId) {
      setProducts(prev => sortProductsCategoryWise(prev.map(prod => prod.productId === p.productId ? {
        ...prod,
        name: p.name.trim(),
        category: p.category.trim(),
        sizeML: Number(p.sizeML),
        casePack: pack,
        sellingPrice: Number(p.sellingPrice),
        active: p.active !== undefined ? p.active : prod.active,
        updatedAt: getNowTimestamp(),
        updatedBy: currentUser.username
      } : prod)));
      addAudit('PRODUCT_UPDATED', p.productId, `${p.name} ${p.sizeML}ml (${pack}/case) ₹${p.sellingPrice}`);
      return p.productId;
    } else {
      const nextNum = products.reduce((m, x) => Math.max(m, Number(String(x.productId).replace(/\D/g, '')) || 0), 0) + 1;
      const newId = `PRD-${String(nextNum).padStart(6, '0')}`;
      const newProduct: Product = {
        productId: newId,
        name: p.name.trim(),
        category: p.category.trim(),
        sizeML: Number(p.sizeML),
        casePack: pack,
        sellingPrice: Number(p.sellingPrice),
        active: true,
        updatedAt: getNowTimestamp(),
        updatedBy: currentUser.username
      };
      setProducts(prev => sortProductsCategoryWise([...prev, newProduct]));
      setStock(prev => ({ ...prev, [newId]: { godown: 0, normal: 0, ac: 0 } }));
      addAudit('PRODUCT_CREATED', newId, `${p.name} ${p.sizeML}ml`);
      return newId;
    }
  };

  // Admin direct stock adjustment
  const adminAdjustStock = async (data: {
    productId: string;
    godown: number;
    normal: number;
    ac: number;
    reason?: string;
  }) => {
    if (currentUser?.role !== 'ADMIN') {
      throw new Error('Admin permission required to edit stock.');
    }
    const prod = products.find(p => p.productId === data.productId);
    if (!prod) throw new Error('Product not found.');

    const nextGodown = Math.max(0, Math.floor(Number(data.godown) || 0));
    const nextNormal = Math.max(0, Math.floor(Number(data.normal) || 0));
    const nextAc = Math.max(0, Math.floor(Number(data.ac) || 0));

    const cur = stock[data.productId] || { godown: 0, normal: 0, ac: 0 };
    const moves: { loc: StockLocation; productId: string; delta: number }[] = [];
    if (nextGodown !== (cur.godown || 0)) {
      moves.push({ loc: 'GODOWN', productId: data.productId, delta: nextGodown - (cur.godown || 0) });
    }
    if (nextNormal !== (cur.normal || 0)) {
      moves.push({ loc: 'NORMAL', productId: data.productId, delta: nextNormal - (cur.normal || 0) });
    }
    if (nextAc !== (cur.ac || 0)) {
      moves.push({ loc: 'AC', productId: data.productId, delta: nextAc - (cur.ac || 0) });
    }

    if (moves.length === 0) return;

    const refId = `ADJ-${Date.now().toString().slice(-6)}`;
    applyMovements(moves, 'ADJUSTMENT', refId, businessDate);
    addAudit(
      'ADMIN_STOCK_EDITED',
      refId,
      `${prod.name} ${prod.sizeML}ml | Godown: ${cur.godown || 0}→${nextGodown}, Normal: ${cur.normal || 0}→${nextNormal}, AC: ${cur.ac || 0}→${nextAc}${data.reason?.trim() ? ` | Reason: ${data.reason.trim()}` : ''}`
    );
  };

  // Purchases
  const submitPurchaseBatch = async (data: {
    supplier: string; date: string; billDate: string; invoiceNo: string;
    permitNumber?: string; documentNumber?: string;
    lines: { productId: string; qty: number; enteredQty?: number; unit?: 'CASE' | 'BOTTLE'; rate: number; sedAmt: number; discountAmt: number; tcsPct: number }[];
  }) => {
    if (currentUser?.role !== 'ADMIN') throw new Error('Admin permission required.');
    if (!data.lines.length) throw new Error('Add at least one item.');
    const productMap = new Map(products.map(p => [p.productId, p]));
    const batchId = `PBT-${String(purchases.length + 1).padStart(6, '0')}`;

    let totalQty = 0;
    let grossTotal = 0;
    let sedTotal = 0;
    let discountTotal = 0;
    let tcsTotal = 0;
    let netTotal = 0;

    const parsedLines = data.lines.map((l, i) => {
      const p = productMap.get(l.productId);
      const gross = Math.round(l.qty * l.rate * 100) / 100;
      const taxable = Math.max(0, gross + l.sedAmt - l.discountAmt);
      const tcs = Math.round(taxable * (l.tcsPct / 100) * 100) / 100;
      const net = Math.round((taxable + tcs) * 100) / 100;

      totalQty += l.qty;
      grossTotal += gross;
      sedTotal += l.sedAmt;
      discountTotal += l.discountAmt;
      tcsTotal += tcs;
      netTotal += net;

      return {
        id: `PUR-${batchId.slice(4)}-${String(i + 1).padStart(3, '0')}`,
        productId: l.productId,
        productName: p ? `${p.name} ${p.sizeML}ml` : l.productId,
        casePack: p ? bottlesPerCase_(p) : 1,
        qty: l.qty,
        enteredQty: l.enteredQty || l.qty,
        unit: l.unit || 'BOTTLE',
        rate: l.rate,
        sedAmt: l.sedAmt,
        discountAmt: l.discountAmt,
        tcsPct: l.tcsPct,
        grossAmount: gross,
        netAmount: net
      };
    });

    const newBatch: PurchaseBatch = {
      batchId,
      supplier: data.supplier,
      date: data.date,
      billDate: data.billDate || data.date,
      invoiceNo: data.invoiceNo,
      permitNumber: data.permitNumber || 'N/A',
      documentNumber: data.documentNumber || 'N/A',
      status: 'Pending',
      lines: parsedLines,
      totalQty,
      grossTotal: Math.round(grossTotal * 100) / 100,
      sedTotal: Math.round(sedTotal * 100) / 100,
      discountTotal: Math.round(discountTotal * 100) / 100,
      tcsTotal: Math.round(tcsTotal * 100) / 100,
      netTotal: Math.round(netTotal * 100) / 100,
      createdBy: currentUser.username,
      createdAt: getNowTimestamp()
    };

    setPurchases(prev => [newBatch, ...prev]);
    addAudit('PURCHASE_SUBMITTED', batchId, `${data.supplier} | ${parsedLines.length} item(s), ${totalQty} btls | net ₹${newBatch.netTotal}`);
    return batchId;
  };

  const reviewPurchaseBill = async (batchId: string, decision: 'APPROVE' | 'REJECT', remark?: string) => {
    if (currentUser?.role !== 'ADMIN') throw new Error('Admin permission required.');
    const batch = purchases.find(p => p.batchId === batchId);
    if (!batch) throw new Error('Purchase entry not found.');
    if (batch.status !== 'Pending') throw new Error('This purchase entry was already reviewed.');

    if (decision === 'APPROVE') {
      const moves = batch.lines.map(l => ({
        loc: 'GODOWN' as StockLocation,
        productId: l.productId,
        delta: l.qty
      }));
      applyMovements(moves, 'PURCHASE', batchId, batch.date);
    }

    setPurchases(prev => prev.map(p => p.batchId === batchId ? {
      ...p,
      status: decision === 'APPROVE' ? 'Approved' : 'Rejected',
      reviewedBy: currentUser.username,
      reviewedAt: getNowTimestamp(),
      remark: remark || ''
    } : p));

    addAudit(
      decision === 'APPROVE' ? 'APPROVED_PURCHASE' : 'REJECTED_PURCHASE',
      batchId,
      `${batch.supplier} | ${batch.lines.length} items | net ₹${batch.netTotal} ${remark ? `(${remark})` : ''}`
    );
  };

  const editPurchaseRecord = async (id: string, updates: {
    date: string; billDate: string; supplier: string; invoiceNo: string;
    qty: number; rate: number; sedAmt: number; discountAmt: number; tcsPct: number; reason: string;
  }) => {
    if (currentUser?.role !== 'ADMIN') throw new Error('Admin permission required.');
    let foundLine: any = null;
    let targetBatch: PurchaseBatch | null = null;

    setPurchases(prev => prev.map(batch => {
      const line = batch.lines.find(l => l.id === id);
      if (line) {
        foundLine = { ...line };
        targetBatch = batch;
        const gross = updates.qty * updates.rate;
        const taxable = Math.max(0, gross + updates.sedAmt - updates.discountAmt);
        const tcs = Math.round(taxable * (updates.tcsPct / 100) * 100) / 100;
        const net = Math.round((taxable + tcs) * 100) / 100;

        const updatedLines = batch.lines.map(l => l.id === id ? {
          ...l,
          qty: updates.qty,
          rate: updates.rate,
          sedAmt: updates.sedAmt,
          discountAmt: updates.discountAmt,
          tcsPct: updates.tcsPct,
          grossAmount: gross,
          netAmount: net
        } : l);

        return {
          ...batch,
          date: updates.date,
          billDate: updates.billDate,
          supplier: updates.supplier,
          invoiceNo: updates.invoiceNo,
          lines: updatedLines,
          totalQty: updatedLines.reduce((s, l) => s + l.qty, 0),
          netTotal: updatedLines.reduce((s, l) => s + l.netAmount, 0),
          remark: `${batch.remark ? batch.remark + ' | ' : ''}Admin correction: ${updates.reason}`
        };
      }
      return batch;
    }));

    if (foundLine && targetBatch && (targetBatch as PurchaseBatch).status === 'Approved') {
      const delta = updates.qty - foundLine.qty;
      if (delta !== 0) {
        applyMovements(
          [{ loc: 'GODOWN', productId: foundLine.productId, delta }],
          'PURCHASE_CORRECTION',
          id,
          updates.date
        );
      }
    }

    addAudit('ADMIN_HISTORICAL_PURCHASE_EDIT', id, `Updated purchase row | reason: ${updates.reason}`);
  };

  // Requests
  const submitRequestBatch = async (data: { date: string; reason: string; items: { productId: string; qty: number; unit: 'CASE' | 'BOTTLE' }[] }) => {
    if (!currentUser || (currentUser.role !== 'NORMAL' && currentUser.role !== 'AC')) {
      throw new Error('Only counter operators can request stock.');
    }
    if (!data.items.length) throw new Error('Select at least one product.');
    const counter = currentUser.counter || (currentUser.role as CounterLocation);
    const productMap = new Map(products.map(p => [p.productId, p]));
    const now = getNowTimestamp();

    const newRequests: StockRequestItem[] = data.items.map((it, idx) => {
      const p = productMap.get(it.productId);
      const pack = p ? bottlesPerCase_(p) : 1;
      const totalBottles = it.qty * (it.unit === 'CASE' ? pack : 1);
      const reqId = `REQ-${String(requests.length + idx + 1).padStart(6, '0')}`;

      return {
        requestId: reqId,
        counter,
        productId: it.productId,
        productName: p ? `${p.name} ${p.sizeML}ml` : it.productId,
        category: p?.category || 'Other',
        sizeML: p?.sizeML || 750,
        casePack: pack,
        qty: totalBottles,
        enteredQty: it.qty,
        unit: it.unit,
        reason: data.reason,
        status: 'Pending',
        date: data.date,
        createdBy: currentUser.username,
        createdAt: now
      };
    });

    setRequests(prev => [...newRequests, ...prev]);
    const totalBottles = newRequests.reduce((s, r) => s + r.qty, 0);
    addAudit(
      'REQUEST_SUBMITTED',
      newRequests[0].requestId,
      `${counter} requested ${newRequests.length} item(s), ${totalBottles} bottles | ${data.reason}`
    );
  };

  const reviewRequestGroup = async (ids: string[], decision: 'APPROVE' | 'REJECT', remark?: string, skipShort = false) => {
    if (currentUser?.role !== 'ADMIN') throw new Error('Admin permission required.');
    const targetRequests = requests.filter(r => ids.includes(r.requestId));
    if (!targetRequests.length) throw new Error('Requests not found.');

    const moves: { loc: StockLocation; productId: string; delta: number }[] = [];
    const approvedIds: string[] = [];
    const rejectedIds: string[] = [];

    targetRequests.forEach(r => {
      const godownStock = stock[r.productId]?.godown || 0;
      const isShort = godownStock < r.qty;

      if (decision === 'APPROVE') {
        if (!isShort) {
          approvedIds.push(r.requestId);
          moves.push({ loc: 'GODOWN', productId: r.productId, delta: -r.qty });
          moves.push({ loc: r.counter, productId: r.productId, delta: r.qty });
        } else if (skipShort) {
          rejectedIds.push(r.requestId);
        } else {
          throw new Error(`Not enough godown stock for ${r.productName}. Godown has ${godownStock}, requested ${r.qty}.`);
        }
      } else {
        rejectedIds.push(r.requestId);
      }
    });

    if (moves.length > 0) {
      applyMovements(moves, 'REQUEST', ids[0], targetRequests[0].date);
    }

    const now = getNowTimestamp();
    setRequests(prev => prev.map(r => {
      if (approvedIds.includes(r.requestId)) {
        return { ...r, status: 'Approved', reviewedBy: currentUser.username, reviewedAt: now, remark: remark || '' };
      }
      if (rejectedIds.includes(r.requestId)) {
        return {
          ...r,
          status: 'Rejected',
          reviewedBy: currentUser.username,
          reviewedAt: now,
          remark: remark || (decision === 'APPROVE' ? 'Not enough godown stock' : 'Rejected by admin')
        };
      }
      return r;
    }));

    addAudit(
      decision === 'APPROVE' ? 'APPROVED_REQUEST' : 'REJECTED_REQUEST',
      ids.join(','),
      `Reviewed ${ids.length} requests: ${approvedIds.length} approved, ${rejectedIds.length} rejected`
    );

    return { approved: approvedIds.length, rejected: rejectedIds.length };
  };

  // Transfers
  const submitTransfer = async (data: { productId: string; qty: number; unit?: 'CASE' | 'BOTTLE'; to?: CounterLocation; note?: string }) => {
    if (!currentUser) throw new Error('Not logged in');
    const isAdmin = currentUser.role === 'ADMIN';
    const prod = products.find(p => p.productId === data.productId);
    if (!prod) throw new Error('Product not found');

    const pack = bottlesPerCase_(prod);
    const unit = data.unit || 'BOTTLE';
    const totalBottles = data.qty * (unit === 'CASE' ? pack : 1);

    const fromLoc: StockLocation = isAdmin ? 'GODOWN' : (currentUser.counter || 'NORMAL');
    const toLoc: StockLocation = isAdmin
      ? (data.to || 'NORMAL')
      : (currentUser.counter === 'NORMAL' ? 'AC' : 'NORMAL');

    const avail = stock[data.productId]?.[fromLoc.toLowerCase() as 'godown' | 'normal' | 'ac'] || 0;
    if (totalBottles > avail) {
      throw new Error(`Not enough stock. ${fromLoc} has ${avail} bottles, requested ${totalBottles}.`);
    }

    const transferId = `TRF-${String(transfers.length + 1).padStart(6, '0')}`;
    const autoApproved = !isAdmin; // Counter-to-counter transfers auto-approve immediately
    const now = getNowTimestamp();

    if (autoApproved) {
      applyMovements([
        { loc: fromLoc, productId: data.productId, delta: -totalBottles },
        { loc: toLoc, productId: data.productId, delta: totalBottles }
      ], 'TRANSFER', transferId);
    }

    const newTransfer: StockTransfer = {
      transferId,
      type: isAdmin ? 'GODOWN_TO_COUNTER' : 'COUNTER_TO_COUNTER',
      fromLoc,
      toLoc,
      productId: data.productId,
      productName: `${prod.name} ${prod.sizeML}ml`,
      casePack: pack,
      qty: totalBottles,
      enteredQty: data.qty,
      unit,
      note: data.note || '',
      status: autoApproved ? 'Approved' : 'Pending',
      createdBy: currentUser.username,
      createdAt: now,
      reviewedBy: autoApproved ? 'AUTO' : undefined,
      reviewedAt: autoApproved ? now : undefined,
      remark: autoApproved ? 'Auto-approved (counter to counter)' : undefined
    };

    setTransfers(prev => [newTransfer, ...prev]);
    addAudit(
      autoApproved ? 'TRANSFER_COMPLETED' : 'TRANSFER_SUBMITTED',
      transferId,
      `${fromLoc} → ${toLoc} | ${prod.name} x ${totalBottles} btls ${data.note ? `(${data.note})` : ''}`
    );

    return { autoApproved };
  };

  // Daily Sales Computations
  const getReportFormLines = (counter: CounterLocation, date: string) => {
    // Check if duplicate or blocked
    const existing = dailySales.find(r => r.counter === counter && r.date === date && r.status !== 'Rejected');
    if (existing) {
      return { lines: [], blockedMessage: `A report for ${date} has already been submitted (${existing.reportId}, ${existing.status}).`, pendingGodownCount: 0 };
    }

    // Check pending godown requests for this counter and date
    const pendingGodown = requests.filter(r => r.counter === counter && r.date === date && r.status === 'Pending');
    if (pendingGodown.length > 0) {
      return {
        lines: [],
        blockedMessage: `Daily Sales is locked: ${pendingGodown.length} Godown receipt entr${pendingGodown.length === 1 ? 'y is' : 'ies are'} pending Admin approval. Wait until every entry is approved or rejected.`,
        pendingGodownCount: pendingGodown.length
      };
    }

    // Opening stock comes from last approved report strictly prior to this date
    const lastApproved = dailySales
      .filter(r => r.counter === counter && r.status === 'Approved' && r.date < date)
      .sort((a, b) => b.date.localeCompare(a.date))[0];

    const openingMap = new Map<string, number>();
    if (lastApproved) {
      lastApproved.lines.forEach(l => openingMap.set(l.productId, l.closing));
    }

    // Movements for this date (only physical stock movements: REQUEST, TRANSFER, DAMAGE)
    const godownInMap = new Map<string, number>();
    const transferInMap = new Map<string, number>();
    const transferOutMap = new Map<string, number>();
    const damageOutMap = new Map<string, number>();

    ledger.filter(l => l.location === counter && l.businessDate === date).forEach(l => {
      if (l.delta > 0) {
        if (l.refType === 'REQUEST') {
          godownInMap.set(l.productId, (godownInMap.get(l.productId) || 0) + l.delta);
        } else if (l.refType === 'TRANSFER') {
          transferInMap.set(l.productId, (transferInMap.get(l.productId) || 0) + l.delta);
        }
      } else if (l.delta < 0) {
        if (l.refType === 'DAMAGE') {
          damageOutMap.set(l.productId, (damageOutMap.get(l.productId) || 0) - l.delta);
        } else if (l.refType === 'TRANSFER') {
          transferOutMap.set(l.productId, (transferOutMap.get(l.productId) || 0) - l.delta);
        }
      }
    });

    const counterKey = counter.toLowerCase() as 'normal' | 'ac';

    const lines = products.filter(p => p.active).map(p => {
      const liveQty = stock[p.productId]?.[counterKey] || 0;
      const gIn = godownInMap.get(p.productId) || 0;
      const tIn = transferInMap.get(p.productId) || 0;
      const tOut = transferOutMap.get(p.productId) || 0;
      const dOut = damageOutMap.get(p.productId) || 0;

      const hasPriorClosing = openingMap.has(p.productId);
      const avail = hasPriorClosing
        ? Math.max(0, openingMap.get(p.productId)! + gIn + tIn - tOut - dOut)
        : liveQty;
      const open = hasPriorClosing
        ? openingMap.get(p.productId)!
        : Math.max(0, liveQty - gIn - tIn + tOut + dOut);

      return {
        productId: p.productId,
        name: p.name,
        category: p.category,
        sizeML: p.sizeML,
        casePack: bottlesPerCase_(p),
        price: p.sellingPrice,
        opening: open,
        godownIn: gIn,
        transferIn: tIn,
        transferOut: tOut,
        damageOut: dOut,
        inQty: gIn + tIn,
        outQty: tOut + dOut,
        available: avail,
        closing: avail,
        sold: 0,
        value: 0
      };
    });

    return { lines, pendingGodownCount: 0 };
  };

  const submitDailySales = async (data: {
    date: string; cashAmount: number; upiAmount: number; cardAmount: number;
    acCharges?: number;
    recordedAmount: number; cashierName: string; helperName: string;
    paymentExplanation?: string; lines: { productId: string; closing: number }[];
    counter?: CounterLocation;
  }) => {
    if (!currentUser) {
      throw new Error('Authentication required to submit daily sales.');
    }
    const counter: CounterLocation = (currentUser.role === 'ADMIN' ? (data.counter || 'NORMAL') : (currentUser.counter || currentUser.role)) as CounterLocation;
    const form = getReportFormLines(counter, data.date);
    if (form.blockedMessage) throw new Error(form.blockedMessage);

    const productMap = new Map(products.map(p => [p.productId, p]));
    const givenMap = new Map(data.lines.map(l => [l.productId, l.closing]));

    let totalSold = 0;
    let totalVal = 0;

    const reportLines = form.lines.map((l, i) => {
      const p = productMap.get(l.productId);
      const closing = givenMap.has(l.productId) ? Number(givenMap.get(l.productId)) : l.available;
      if (closing > l.available) {
        throw new Error(`Closing count for ${l.name} (${closing}) is higher than available stock (${l.available}).`);
      }
      const sold = l.available - closing;
      const val = sold * l.price;
      totalSold += sold;
      totalVal += val;

      return {
        lineId: `SLN-${String(dailySales.length + 1).padStart(4, '0')}-${String(i + 1).padStart(3, '0')}`,
        reportId: '',
        productId: l.productId,
        name: `${l.name} ${l.sizeML}ml`,
        category: p?.category || 'Other',
        sizeML: p?.sizeML || 750,
        casePack: l.casePack,
        opening: l.opening,
        godownIn: l.godownIn,
        transferIn: l.transferIn,
        transferOut: l.transferOut,
        damageOut: l.damageOut,
        inQty: l.inQty,
        outQty: l.outQty,
        available: l.available,
        closing,
        sold,
        price: l.price,
        value: val
      };
    });

    const acCharges = counter === 'AC' ? (Number(data.acCharges) || 0) : 0;
    const totalCollected = data.cashAmount + data.upiAmount + data.cardAmount + acCharges;
    const expected = totalVal + acCharges;
    const diff = Math.round((totalCollected - expected) * 100) / 100;
    // Payment mismatch explanation is optional; allow submitting with difference

    const reportId = `RPT-${String(dailySales.length + 1).padStart(6, '0')}`;
    reportLines.forEach(l => { l.reportId = reportId; });

    // Apply stock deduction movements immediately since Daily Sales is auto-approved
    const moves = reportLines.filter(l => l.sold > 0).map(l => ({
      loc: counter as StockLocation,
      productId: l.productId,
      delta: -l.sold
    }));
    if (moves.length > 0) {
      applyMovements(moves, 'SALE', reportId, data.date);
    }

    const now = getNowTimestamp();
    const newReport: DailySalesReport = {
      reportId,
      date: data.date,
      counter,
      status: 'Approved', // Auto-approved per requirement
      totalSoldQty: totalSold,
      totalSalesValue: Math.round(totalVal * 100) / 100,
      recordedAmount: data.recordedAmount,
      cashAmount: data.cashAmount,
      upiAmount: data.upiAmount,
      cardAmount: data.cardAmount,
      acCharges: counter === 'AC' ? acCharges : undefined,
      cashierName: data.cashierName,
      helperName: data.helperName,
      paymentDifference: diff,
      paymentExplanation: data.paymentExplanation || '',
      cutoffSeq: (ledger[0]?.seq || 0),
      submittedBy: currentUser.username,
      submittedAt: now,
      reviewedBy: 'Auto-Approved',
      reviewedAt: now,
      remark: 'Auto-approved on submission',
      lines: reportLines
    };

    setDailySales(prev => [newReport, ...prev]);
    addAudit('SALES_SUBMITTED_AND_APPROVED', reportId, `${data.date} | ${counter} | sold ${totalSold} btls | ₹${newReport.totalSalesValue}${acCharges > 0 ? ` + ₹${acCharges} AC` : ''} (Auto-Approved)`);
    return reportId;
  };

  const adminCreateHistoricalReport = async (data: {
    date: string; counter: CounterLocation; recordedAmount: number; reason: string;
    lines: { productId: string; sold: number }[];
  }) => {
    if (currentUser?.role !== 'ADMIN') throw new Error('Admin permission required.');
    const productMap = new Map(products.map(p => [p.productId, p]));
    const reportId = `RPT-${String(dailySales.length + 1).padStart(6, '0')}`;

    let totalSold = 0;
    let totalVal = 0;

    const reportLines = data.lines.filter(l => l.sold > 0).map((l, i) => {
      const p = productMap.get(l.productId);
      const price = p?.sellingPrice || 0;
      const val = l.sold * price;
      totalSold += l.sold;
      totalVal += val;

      return {
        lineId: `SLN-${reportId.slice(4)}-${String(i + 1).padStart(3, '0')}`,
        reportId,
        productId: l.productId,
        name: p ? `${p.name} ${p.sizeML}ml` : l.productId,
        category: p?.category || 'Other',
        sizeML: p?.sizeML || 750,
        casePack: p ? bottlesPerCase_(p) : 1,
        opening: 0,
        godownIn: 0,
        transferIn: 0,
        transferOut: 0,
        damageOut: 0,
        inQty: 0,
        outQty: 0,
        available: 0,
        closing: 0,
        sold: l.sold,
        price,
        value: val
      };
    });

    const now = getNowTimestamp();
    const newReport: DailySalesReport = {
      reportId,
      date: data.date,
      counter: data.counter,
      status: 'Approved',
      totalSoldQty: totalSold,
      totalSalesValue: Math.round(totalVal * 100) / 100,
      recordedAmount: data.recordedAmount,
      cashAmount: data.recordedAmount,
      upiAmount: 0,
      cardAmount: 0,
      cashierName: 'Historical Entry',
      helperName: 'Admin Recorded',
      paymentDifference: Math.round((data.recordedAmount - totalVal) * 100) / 100,
      paymentExplanation: data.reason,
      cutoffSeq: 0,
      submittedBy: currentUser.username,
      submittedAt: now,
      reviewedBy: currentUser.username,
      reviewedAt: now,
      remark: `ADMIN HISTORICAL SALES-ONLY ENTRY — CURRENT STOCK NOT CHANGED. Reason: ${data.reason}`,
      lines: reportLines
    };

    setDailySales(prev => [newReport, ...prev]);
    addAudit(
      'ADMIN_HISTORICAL_SALES_CREATED',
      reportId,
      `${data.date} | ${data.counter} | sold ${totalSold} | ₹${totalVal} | stock unchanged | ${data.reason}`
    );

    return reportId;
  };

  const adminEditReport = async (reportId: string, data: { recordedAmount: number; reason: string; lines: { productId: string; closing?: number; sold?: number }[] }) => {
    const report = dailySales.find(r => r.reportId === reportId);
    if (!report) throw new Error('Report not found');
    const isAdmin = currentUser?.role === 'ADMIN';
    if (!isAdmin && report.status !== 'Pending') {
      throw new Error('This report was already reviewed by Admin.');
    }

    const isHistorical = report.remark?.includes('ADMIN HISTORICAL SALES-ONLY ENTRY');
    const givenMap = new Map(data.lines.map(l => [l.productId, l]));

    let totalSold = 0;
    let totalVal = 0;
    const stockMoves: { loc: StockLocation; productId: string; delta: number }[] = [];

    const updatedLines = report.lines.map(l => {
      const update = givenMap.get(l.productId);
      let newSold = l.sold;
      let newClosing = l.closing;

      if (update) {
        if (isHistorical && update.sold !== undefined) {
          newSold = Number(update.sold);
        } else if (update.closing !== undefined) {
          newClosing = Number(update.closing);
          newSold = Math.max(0, l.available - newClosing);
        }
      }

      const newVal = newSold * l.price;
      totalSold += newSold;
      totalVal += newVal;

      if (isAdmin && report.status === 'Approved' && !isHistorical) {
        const delta = l.sold - newSold; // If old sold was 5 and new sold is 3, delta is +2 back to stock
        if (delta !== 0) {
          stockMoves.push({ loc: report.counter, productId: l.productId, delta });
        }
      }

      return {
        ...l,
        closing: newClosing,
        sold: newSold,
        value: newVal
      };
    });

    if (stockMoves.length > 0) {
      applyMovements(stockMoves, 'SALES_CORRECTION', reportId, report.date);
    }

    setDailySales(prev => prev.map(r => r.reportId === reportId ? {
      ...r,
      totalSoldQty: totalSold,
      totalSalesValue: Math.round(totalVal * 100) / 100,
      recordedAmount: data.recordedAmount,
      lines: updatedLines,
      editedBy: currentUser?.username,
      editedAt: getNowTimestamp(),
      remark: `${r.remark ? r.remark + ' | ' : ''}Correction: ${data.reason}`
    } : r));

    addAudit('SALES_EDITED', reportId, `Sold ${report.totalSoldQty} → ${totalSold} | ${data.reason}`);
  };

  const reviewDailySales = async (reportId: string, decision: 'APPROVE' | 'REJECT', remark?: string) => {
    if (currentUser?.role !== 'ADMIN') throw new Error('Admin permission required.');
    const report = dailySales.find(r => r.reportId === reportId);
    if (!report) throw new Error('Report not found');
    if (report.status !== 'Pending') throw new Error('Report already reviewed.');

    if (decision === 'APPROVE') {
      const moves = report.lines.filter(l => l.sold > 0).map(l => ({
        loc: report.counter as StockLocation,
        productId: l.productId,
        delta: -l.sold
      }));
      applyMovements(moves, 'SALE', reportId, report.date);
    }

    setDailySales(prev => prev.map(r => r.reportId === reportId ? {
      ...r,
      status: decision === 'APPROVE' ? 'Approved' : 'Rejected',
      reviewedBy: currentUser.username,
      reviewedAt: getNowTimestamp(),
      remark: remark || ''
    } : r));

    addAudit(
      decision === 'APPROVE' ? 'APPROVED_SALES' : 'REJECTED_SALES',
      reportId,
      `${report.counter} | ${report.date} | sold ${report.totalSoldQty} btls ${remark ? `(${remark})` : ''}`
    );
  };

  const adminDeleteDailySales = async (reportId: string, reason?: string) => {
    if (currentUser?.role !== 'ADMIN') {
      throw new Error('Admin permission required to delete a daily sales report.');
    }
    const report = dailySales.find(r => r.reportId === reportId);
    if (!report) {
      throw new Error('Daily sales report not found.');
    }

    const isHistoricalOnly = report.remark?.includes('ADMIN HISTORICAL SALES-ONLY ENTRY');

    if (report.status === 'Approved' && !isHistoricalOnly) {
      const reverseMoves = report.lines
        .filter(l => l.sold > 0)
        .map(l => ({
          loc: report.counter as StockLocation,
          productId: l.productId,
          delta: l.sold
        }));

      if (reverseMoves.length > 0) {
        applyMovements(reverseMoves, 'SALES_CORRECTION', reportId, report.date);
      }
    }

    setDailySales(prev => prev.filter(r => r.reportId !== reportId));

    addAudit(
      'ADMIN_SALES_DELETED',
      reportId,
      `${report.date} | ${report.counter} | reversed ${report.totalSoldQty} btls (₹${report.totalSalesValue})${reason?.trim() ? ` | Reason: ${reason.trim()}` : ''}`
    );
  };

  // Daily Operations
  const saveDailyOperation = async (data: {
    type: 'EXPENSE' | 'WAGE' | 'ROOM' | 'DAMAGE'; date: string; name: string;
    amount: number; payment?: 'Cash' | 'UPI' | 'Card'; roomNo?: number;
    location?: StockLocation; productId?: string; qty?: number; note?: string;
  }) => {
    if (!currentUser) throw new Error('Not logged in');
    const opId = `OPR-${String(operations.length + 1).padStart(6, '0')}`;
    const now = getNowTimestamp();
    const status = 'Approved'; // Operations are auto-approved per latest MM Residency guidelines

    if (data.type === 'DAMAGE') {
      if (!data.productId) throw new Error('Choose a product.');
      const qty = Number(data.qty) || 1;
      const loc = data.location || (currentUser.role === 'ADMIN' ? 'GODOWN' : (currentUser.counter || 'NORMAL'));
      const avail = stock[data.productId]?.[loc.toLowerCase() as 'godown' | 'normal' | 'ac'] || 0;
      if (qty > avail) {
        throw new Error(`Damaged quantity (${qty}) exceeds stock available at ${loc} (${avail}).`);
      }
      applyMovements([{ loc, productId: data.productId, delta: -qty }], 'DAMAGE', opId, data.date);
    }

    const prod = data.productId ? products.find(p => p.productId === data.productId) : null;
    const newOp: DailyOperation = {
      operationId: opId,
      type: data.type,
      date: data.date,
      name: data.name,
      amount: data.amount,
      payment: data.payment,
      roomNo: data.roomNo,
      location: data.location,
      productId: data.productId,
      productName: prod ? `${prod.name} ${prod.sizeML}ml` : undefined,
      qty: data.qty,
      reason: data.note || data.name,
      status,
      createdBy: currentUser.username,
      createdAt: now,
      reviewedBy: 'SELF',
      reviewedAt: now
    };

    setOperations(prev => [newOp, ...prev]);
    addAudit('DAILY_OPERATION_SAVED', opId, `${data.type} | ${data.date} | ${data.name} | ₹${data.amount || data.qty}`);
    return opId;
  };

  const saveDailyOperationsBatch = async (data: {
    type: 'EXPENSE' | 'WAGE'; date: string;
    items: { name: string; amount: number; note?: string }[];
  }) => {
    if (!currentUser) throw new Error('Not logged in');
    if (!data.items.length) throw new Error('Add at least one item.');
    const now = getNowTimestamp();
    let total = 0;

    const newOps: DailyOperation[] = data.items.map((it, idx) => {
      total += it.amount;
      return {
        operationId: `OPR-${String(operations.length + idx + 1).padStart(6, '0')}`,
        type: data.type,
        date: data.date,
        name: it.name,
        amount: it.amount,
        reason: it.note || '',
        status: 'Approved',
        createdBy: currentUser.username,
        createdAt: now,
        reviewedBy: 'SELF',
        reviewedAt: now
      };
    });

    setOperations(prev => [...newOps, ...prev]);
    addAudit('DAILY_OPERATIONS_BATCH', newOps[0].operationId, `${data.type} batch: ${newOps.length} items | ₹${total}`);
    return { count: newOps.length, total: Math.round(total * 100) / 100 };
  };

  const reviewDailyOperation = async (id: string, decision: 'APPROVE' | 'REJECT', remark?: string) => {
    if (currentUser?.role !== 'ADMIN') throw new Error('Admin permission required.');
    const op = operations.find(o => o.operationId === id);
    if (!op) throw new Error('Operation not found.');

    if (decision === 'APPROVE' && op.type === 'DAMAGE' && op.productId && op.qty) {
      const loc = op.location || 'GODOWN';
      applyMovements([{ loc, productId: op.productId, delta: -op.qty }], 'DAMAGE', id, op.date);
    }

    setOperations(prev => prev.map(o => o.operationId === id ? {
      ...o,
      status: decision === 'APPROVE' ? 'Approved' : 'Rejected',
      reviewedBy: currentUser.username,
      reviewedAt: getNowTimestamp(),
      reviewRemark: remark || ''
    } : o));

    addAudit(`DAILY_OPERATION_${decision}`, id, `${op.type} | ${remark || ''}`);
  };

  // Administration helpers
  const addSupplier = async (name: string) => {
    if (!name.trim()) throw new Error('Supplier name is required.');
    if (!suppliers.includes(name.trim())) {
      setSuppliers(prev => [...prev, name.trim()]);
      addAudit('SUPPLIER_ADDED', '', name.trim());
    }
  };

  const addDropdownOption = async (type: 'EXPENSE' | 'WAGE', value: string) => {
    if (!value.trim()) throw new Error('Value is required.');
    const optId = `OPT-${String(dropdownOptions.length + 1).padStart(3, '0')}`;
    const newOpt: DropdownOption = {
      optionId: optId,
      type,
      value: value.trim(),
      active: true,
      createdAt: getTodayISO()
    };
    setDropdownOptions(prev => [...prev, newOpt]);
    addAudit('DROPDOWN_OPTION_ADDED', optId, `${type} | ${value.trim()}`);
  };

  const createUser = async (u: { username: string; fullName: string; role: Role; password: string }) => {
    if (currentUser?.role !== 'ADMIN') throw new Error('Admin permission required.');
    const cleanU = u.username.trim().toLowerCase();
    if (users.some(x => x.username.toLowerCase() === cleanU)) {
      throw new Error('Username already exists.');
    }
    const newId = `USR-${String(users.length + 1).padStart(6, '0')}`;
    const newUser: User = {
      userId: newId,
      username: cleanU,
      fullName: u.fullName.trim(),
      role: u.role,
      counter: u.role === 'NORMAL' || u.role === 'AC' ? u.role : undefined,
      active: true,
      mustChange: true,
      createdAt: getNowTimestamp(),
      password: u.password
    };
    setUsers(prev => [...prev, newUser]);
    addAudit('USER_CREATED', newId, `${cleanU} (${u.role})`);
  };

  const resetUserPassword = async (userId: string, newPw: string) => {
    if (currentUser?.role !== 'ADMIN') throw new Error('Admin permission required.');
    setUsers(prev => prev.map(u => u.userId === userId ? { ...u, password: newPw, mustChange: true } : u));
    addAudit('PASSWORD_RESET', userId, 'Admin reset user password');
  };

  const toggleUserActive = async (userId: string, active: boolean) => {
    if (currentUser?.role !== 'ADMIN') throw new Error('Admin permission required.');
    if (userId === currentUser.userId && !active) {
      throw new Error('You cannot deactivate your own account.');
    }
    setUsers(prev => prev.map(u => u.userId === userId ? { ...u, active } : u));
    addAudit(active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', userId, '');
  };

  const reconcileStock = () => {
    const issues: any[] = [];
    products.forEach(p => {
      const s = stock[p.productId] || { godown: 0, normal: 0, ac: 0 };
      (['GODOWN', 'NORMAL', 'AC'] as StockLocation[]).forEach(loc => {
        const key = loc.toLowerCase() as 'godown' | 'normal' | 'ac';
        const sheetQty = s[key];
        const ledgerDeltas = ledger
          .filter(l => l.productId === p.productId && l.location === loc)
          .reduce((sum, l) => sum + l.delta, 0);

        if (sheetQty < 0) {
          issues.push({
            location: loc,
            product: `${p.name} ${p.sizeML}ml`,
            ledger: ledgerDeltas,
            sheet: sheetQty,
            problem: 'Negative stock balance'
          });
        } else if (sheetQty !== ledgerDeltas && ledgerDeltas !== 0) {
          issues.push({
            location: loc,
            product: `${p.name} ${p.sizeML}ml`,
            ledger: ledgerDeltas,
            sheet: sheetQty,
            problem: 'Ledger cumulative delta differs from current stock count'
          });
        }
      });
    });

    return {
      checked: products.length * 3,
      issues
    };
  };

  const syncLedger = () => {
    const today = businessDate || getTodayISO();
    const nextSeq = (ledger[0]?.seq || 0) + 1;
    const newEntries: StockLedgerEntry[] = [];

    products.forEach((p, idx) => {
      const s = stock[p.productId] || { godown: 0, normal: 0, ac: 0 };
      (['GODOWN', 'NORMAL', 'AC'] as StockLocation[]).forEach((loc, lIdx) => {
        const key = loc.toLowerCase() as 'godown' | 'normal' | 'ac';
        const q = s[key];
        const led = ledger
          .filter(l => l.productId === p.productId && l.location === loc)
          .reduce((sum, l) => sum + l.delta, 0);
        const diff = q - led;

        if (diff !== 0) {
          newEntries.push({
            seq: nextSeq + (idx * 3) + lIdx,
            ledgerId: `LED-${String(ledger.length + newEntries.length + 1).padStart(6, '0')}`,
            timestamp: getNowTimestamp(),
            location: loc,
            productId: p.productId,
            productName: `${p.name} ${p.sizeML}ml`,
            delta: diff,
            balanceAfter: q,
            refType: 'OPENING',
            refId: 'OPENING-SYNC',
            approvedBy: currentUser?.username || 'admin',
            businessDate: today
          });
        }
      });
    });

    if (newEntries.length > 0) {
      setLedger(prev => [...newEntries, ...prev]);
      addAudit('LEDGER_SYNC', 'OPENING-SYNC', `Synced ${newEntries.length} lines from physical stock`);
    }

    return newEntries.length;
  };

  const resetToSampleData = () => {
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY + '_opening_epoch', OPENING_EPOCH);
    localStorage.setItem(STORAGE_KEY + '_catalog_version', CATALOG_VERSION);
    localStorage.setItem('mm_business_date', getTodayISO());
    setBusinessDateState(getTodayISO());
    setUsers(INITIAL_USERS);
    setProducts(INITIAL_PRODUCTS);
    setStock(buildInitialStockMap());
    setSuppliers(INITIAL_SUPPLIERS);
    setDropdownOptions(INITIAL_DROPDOWN_OPTIONS);
    setPurchases([]);
    setRequests([]);
    setTransfers([]);
    setDailySales([]);
    setOperations([]);
    setLedger([]);
    setAuditLog([]);
    setCurrentUser(INITIAL_USERS[0]);
    localStorage.setItem('mm_user', JSON.stringify(INITIAL_USERS[0]));
  };

  return (
    <StockContext.Provider
      value={{
        currentUser,
        businessDate,
        theme,
        users,
        products,
        stockItems,
        purchases,
        requests,
        transfers,
        dailySales,
        operations,
        ledger,
        auditLog,
        suppliers,
        dropdownOptions,
        pendingCount,

        login,
        logout,
        switchUser,
        setBusinessDate,
        toggleTheme,
        changePassword,

        saveProduct,
        adminAdjustStock,
        submitPurchaseBatch,
        reviewPurchaseBill,
        editPurchaseRecord,

        submitRequestBatch,
        reviewRequestGroup,

        submitTransfer,

        getReportFormLines,
        submitDailySales,
        adminCreateHistoricalReport,
        adminEditReport,
        reviewDailySales,
        adminDeleteDailySales,

        saveDailyOperation,
        saveDailyOperationsBatch,
        reviewDailyOperation,

        addSupplier,
        addDropdownOption,
        createUser,
        resetUserPassword,
        toggleUserActive,
        reconcileStock,
        syncLedger,
        resetToSampleData,

        syncStatus,
        lastSyncTime,
        triggerManualSync,
        pendingRequests: requests.filter(r => r.status === 'Pending'),
        latestRequestAlert,
        dismissRequestAlert,
        soundEnabled,
        toggleSoundAlerts,
        browserNotifStatus,
        requestBrowserNotifPermission
      }}
    >
      {children}
    </StockContext.Provider>
  );
};

export const useStock = () => {
  const context = useContext(StockContext);
  if (!context) throw new Error('useStock must be used within a StockProvider');
  return context;
};
