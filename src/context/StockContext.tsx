import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithPopup,
  sendEmailVerification,
  signInWithPopup,
  signOut,
  type User as FirebaseAuthUser,
} from 'firebase/auth';
import {
  User, Product, StockItem, PurchaseBatch, StockRequestItem, StockTransfer,
  DailySalesReport, DailyOperation, StockLedgerEntry, AuditLogEntry, DropdownOption,
  CounterLocation, StockLocation, Role
} from '../types';
import {
  INITIAL_USERS, INITIAL_PRODUCTS, INITIAL_STOCK, INITIAL_SUPPLIERS,
  INITIAL_DROPDOWN_OPTIONS, bottlesPerCase_, sortProductsCategoryWise
} from '../data/initialData';
import { auth, db, googleAuthProvider, testFirestoreConnection } from '../firebase';
import {
  authorizeCloudEmailInFirestore,
  type CloudMemberRecord,
  ensureWorkspaceBootstrapped,
  fetchAllCollectionsFromFirestore,
  fetchCloudMembersList,
  isBootstrappedAdminEmail,
  type KnownDocsMap,
  revokeCloudEmailInFirestore,
  subscribeWorkspaceCollections,
  syncSlicesToFirestore,
  type WorkspaceSnapshot,
} from '../utils/firestoreSync';

export interface VerificationDetails {
  email: string;
  userEmailVerified: boolean;
  tokenEmailVerified: boolean;
  providerIds: string[];
}

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

  // Firebase Cloud Auth & Multi-Device Sync Status
  firebaseUser: FirebaseAuthUser | null;
  isFirebaseAuthReady: boolean;
  cloudAccessStatus: 'loading' | 'signed_out' | 'unverified' | 'connected' | 'offline' | 'unauthorized';
  cloudError: string | null;
  verificationDetails: VerificationDetails | null;
  cloudMembers: CloudMemberRecord[];
  isCloudAdmin: boolean;
  authorizeCloudEmail: (email: string, label: string, role: 'ADMIN' | 'STAFF') => Promise<void>;
  revokeCloudEmail: (memberId: string, email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOutGoogle: () => Promise<void>;
  sendVerificationEmailToUser: () => Promise<void>;
  refreshVerificationStatus: () => Promise<boolean>;
  resetAndReverifyGoogleAccount: () => Promise<'connected' | 'reauth_cleared'>;
  retryCloudConnection: () => Promise<void>;
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
    lines: { productId: string; qty: number; enteredQty?: number; enteredPrice?: number; unit?: 'CASE' | 'BOTTLE'; rate: number; sedAmt: number; discountAmt: number; tcsPct: number }[];
  }) => Promise<string>;
  reviewPurchaseBill: (batchId: string, decision: 'APPROVE' | 'REJECT', remark?: string) => Promise<void>;
  editPurchaseRecord: (id: string, updates: { date: string; billDate: string; supplier: string; invoiceNo: string; qty: number; rate: number; sedAmt: number; discountAmt: number; tcsPct: number; reason: string }) => Promise<void>;
  deletePurchaseBatch: (batchId: string) => Promise<void>;

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
  deleteDailyOperation: (operationId: string) => Promise<void>;
  reviewDailyOperation: (id: string, decision: 'APPROVE' | 'REJECT', remark?: string) => Promise<void>;

  // Administration
  addSupplier: (name: string) => Promise<void>;
  deleteSupplier: (name: string) => Promise<void>;
  addDropdownOption: (type: 'EXPENSE' | 'WAGE', value: string) => Promise<void>;
  deleteDropdownOption: (optionId: string) => Promise<void>;
  createUser: (user: { username: string; fullName: string; role: Role; password: string }) => Promise<void>;
  resetUserPassword: (userId: string, newPw: string) => Promise<void>;
  toggleUserActive: (userId: string, active: boolean) => Promise<void>;
  reconcileStock: () => { checked: number; issues: any[] };
  syncLedger: () => Promise<number>;
  resetToSampleData: () => Promise<void>;
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

function mergeCatalogueWithDefaults(existing: Product[], preserveExisting = true): Product[] {
  if (!Array.isArray(existing) || existing.length === 0) return INITIAL_PRODUCTS;
  const existingById = new Map<string, Product>();
  const existingByKey = new Map<string, Product>();
  existing.forEach(p => {
    if (p.productId) existingById.set(p.productId, p);
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
    const byId = existingById.get(def.productId);
    const byKey = existingByKey.get(defKey);
    const match = byId || byKey;
    if (match) {
      usedExistingIds.add(match.productId);
      const keepMatchValues = preserveExisting || Boolean(match.updatedAt || match.updatedBy);
      if (keepMatchValues) {
        merged.push({
          ...def,
          ...match,
          name: match.name || def.name,
          category: match.category || def.category,
          sizeML: Number.isFinite(Number(match.sizeML)) ? Number(match.sizeML) : def.sizeML,
          casePack: Number(match.casePack) >= 1 ? Number(match.casePack) : def.casePack,
          sellingPrice:
            match.sellingPrice !== undefined && match.sellingPrice !== null && Number.isFinite(Number(match.sellingPrice))
              ? Number(match.sellingPrice)
              : def.sellingPrice,
          active: match.active !== undefined ? Boolean(match.active) : def.active,
        });
      } else {
        merged.push({
          ...match,
          name: def.name,
          category: def.category,
          sizeML: def.sizeML,
          casePack: def.casePack,
          sellingPrice: def.sellingPrice
        });
      }
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

function nextPrefixedId(prefix: string, existingIds: (string | undefined)[], pad = 6, offset = 0): string {
  const maxNum = existingIds.reduce((max, id) => {
    if (!id) return max;
    const m = String(id).match(/^[\w]+-(\d+)/);
    const num = m ? Number(m[1]) : 0;
    return num > max ? num : max;
  }, 0);
  return `${prefix}-${String(maxNum + 1 + offset).padStart(pad, '0')}`;
}

function uniqueSuffix(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
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

  // Database tables (initialized from localStorage cache, synced live with Express server)
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
      return mergeCatalogueWithDefaults(parsed, false);
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
        return parsed.map((r: any) =>
          r.status === 'Pending' ? { ...r, status: 'Approved', reviewedBy: 'Auto-Approved' } : r
        );
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

  // Firebase Auth & Firestore Cloud Sync Status
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [isFirebaseAuthReady, setIsFirebaseAuthReady] = useState<boolean>(false);
  const [cloudAccessStatus, setCloudAccessStatus] = useState<
    'loading' | 'signed_out' | 'unverified' | 'connected' | 'offline' | 'unauthorized'
  >('loading');
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [verificationDetails, setVerificationDetails] = useState<VerificationDetails | null>(null);
  const [cloudMembers, setCloudMembers] = useState<CloudMemberRecord[]>([]);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('syncing');
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString());
  const isServerHydratedRef = React.useRef(false);
  const knownDocsRef = React.useRef<KnownDocsMap>(new Map());
  const syncChainRef = React.useRef<Promise<void>>(Promise.resolve());
  const pendingDirtySlicesRef = React.useRef<Set<string>>(new Set());
  const seenPendingIdsRef = React.useRef<Set<string> | null>(null);
  const activeMemberEmailsRef = React.useRef<string[]>([]);
  const verifiedEmailRef = React.useRef<string | undefined>(undefined);
  const preservedAuthErrorRef = React.useRef<string | null>(null);
  const preservedVerificationDetailsRef = React.useRef<VerificationDetails | null>(null);
  const isResettingAccountRef = React.useRef<boolean>(false);
  const verificationInFlightRef = React.useRef<{
    uid: string;
    promise: Promise<
      | { status: 'verified'; user: FirebaseAuthUser; email: string; details: VerificationDetails }
      | { status: 'unverified'; user: FirebaseAuthUser; details: VerificationDetails }
      | { status: 'missing_email'; details: VerificationDetails }
    >;
  } | null>(null);
  const currentUserRef = React.useRef(currentUser);
  currentUserRef.current = currentUser;
  const firebaseUserRef = React.useRef<FirebaseAuthUser | null>(firebaseUser);
  firebaseUserRef.current = firebaseUser;

  const latestRef = React.useRef<WorkspaceSnapshot>({
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

  latestRef.current = {
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

  const lastSyncedSnapshotRef = React.useRef<WorkspaceSnapshot>(latestRef.current);

  const persistSliceToLocalStorage = (key: string, val: any) => {
    try {
      localStorage.setItem(STORAGE_KEY + key, JSON.stringify(val));
    } catch {
      // Ignore quota errors
    }
  };

  useEffect(() => { persistSliceToLocalStorage('_users', users); }, [users]);
  useEffect(() => { persistSliceToLocalStorage('_products', products); }, [products]);
  useEffect(() => { persistSliceToLocalStorage('_stock', stock); }, [stock]);
  useEffect(() => { persistSliceToLocalStorage('_purchases', purchases); }, [purchases]);
  useEffect(() => { persistSliceToLocalStorage('_requests', requests); }, [requests]);
  useEffect(() => { persistSliceToLocalStorage('_transfers', transfers); }, [transfers]);
  useEffect(() => { persistSliceToLocalStorage('_daily_sales', dailySales); }, [dailySales]);
  useEffect(() => { persistSliceToLocalStorage('_operations', operations); }, [operations]);
  useEffect(() => { persistSliceToLocalStorage('_ledger', ledger); }, [ledger]);
  useEffect(() => { persistSliceToLocalStorage('_audit', auditLog); }, [auditLog]);
  useEffect(() => { persistSliceToLocalStorage('_suppliers', suppliers); }, [suppliers]);
  useEffect(() => { persistSliceToLocalStorage('_dropdowns', dropdownOptions); }, [dropdownOptions]);

  const commitLocalState = (partial: Partial<typeof latestRef.current>, auditEntries?: AuditLogEntry[]) => {
    const next = { ...latestRef.current, ...partial };
    if (auditEntries && auditEntries.length > 0) {
      next.auditLog = [...auditEntries, ...next.auditLog];
    }
    latestRef.current = next;
    if (partial.users !== undefined) setUsers(next.users);
    if (partial.products !== undefined) setProducts(next.products);
    if (partial.stock !== undefined) setStock(next.stock);
    if (partial.purchases !== undefined) setPurchases(next.purchases);
    if (partial.requests !== undefined) setRequests(next.requests);
    if (partial.transfers !== undefined) setTransfers(next.transfers);
    if (partial.dailySales !== undefined) setDailySales(next.dailySales);
    if (partial.operations !== undefined) setOperations(next.operations);
    if (partial.ledger !== undefined) setLedger(next.ledger);
    if (partial.auditLog !== undefined || (auditEntries && auditEntries.length > 0)) setAuditLog(next.auditLog);
    if (partial.suppliers !== undefined) setSuppliers(next.suppliers);
    if (partial.dropdownOptions !== undefined) setDropdownOptions(next.dropdownOptions);
  };

  // Apply authoritative state fetched from Firestore
  const applyServerSnapshot = React.useCallback((s: Partial<WorkspaceSnapshot>) => {
    if (!s || typeof s !== 'object') return;

    const dirty = pendingDirtySlicesRef.current;

    const serverUsers = Array.isArray(s.users) && s.users.length > 0 ? s.users : undefined;
    const serverProducts =
      Array.isArray(s.products) && s.products.length > 0
        ? mergeCatalogueWithDefaults(s.products, true)
        : undefined;
    const serverStock =
      s.stock && typeof s.stock === 'object' && Object.keys(s.stock).length > 0
        ? { ...buildInitialStockMap(), ...s.stock }
        : undefined;
    const serverPurchases = Array.isArray(s.purchases)
      ? [...s.purchases].sort((a, b) => (b.createdAt || b.date || '').localeCompare(a.createdAt || a.date || '') || String(b.batchId).localeCompare(String(a.batchId)))
      : undefined;
    const serverRequests = Array.isArray(s.requests)
      ? [...s.requests].sort((a, b) => (b.createdAt || b.date || '').localeCompare(a.createdAt || a.date || '') || String(b.requestId).localeCompare(String(a.requestId)))
      : undefined;
    const serverTransfers = Array.isArray(s.transfers)
      ? [...s.transfers].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') || String(b.transferId).localeCompare(String(a.transferId)))
      : undefined;
    const serverDailySales = Array.isArray(s.dailySales)
      ? [...s.dailySales].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.reportId).localeCompare(String(a.reportId)))
      : undefined;
    const serverOperations = Array.isArray(s.operations)
      ? [...s.operations].sort((a, b) => (b.createdAt || b.date || '').localeCompare(a.createdAt || a.date || '') || String(b.operationId).localeCompare(String(a.operationId)))
      : undefined;
    const serverLedger = Array.isArray(s.ledger)
      ? [...s.ledger].sort((a, b) => (b.seq || 0) - (a.seq || 0) || String(b.ledgerId).localeCompare(String(a.ledgerId)))
      : undefined;
    const serverAuditLog = Array.isArray(s.auditLog)
      ? [...s.auditLog].sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '') || String(b.auditId).localeCompare(String(a.auditId)))
      : undefined;
    const serverSuppliers = Array.isArray(s.suppliers) && s.suppliers.length > 0 ? s.suppliers : undefined;
    const serverDropdowns =
      Array.isArray(s.dropdownOptions) && s.dropdownOptions.length > 0
        ? s.dropdownOptions
        : undefined;

    const nextUsers = !dirty.has('users') && serverUsers ? serverUsers : latestRef.current.users;
    const nextProducts = !dirty.has('products') && serverProducts ? serverProducts : latestRef.current.products;
    const nextStock = !dirty.has('stock') && serverStock ? serverStock : latestRef.current.stock;
    const nextPurchases = !dirty.has('purchases') && serverPurchases ? serverPurchases : latestRef.current.purchases;
    const nextRequests = !dirty.has('requests') && serverRequests ? serverRequests : latestRef.current.requests;
    const nextTransfers = !dirty.has('transfers') && serverTransfers ? serverTransfers : latestRef.current.transfers;
    const nextDailySales = !dirty.has('dailySales') && serverDailySales ? serverDailySales : latestRef.current.dailySales;
    const nextOperations = !dirty.has('operations') && serverOperations ? serverOperations : latestRef.current.operations;
    const nextLedger = !dirty.has('ledger') && serverLedger ? serverLedger : latestRef.current.ledger;
    const nextAuditLog = !dirty.has('auditLog') && serverAuditLog ? serverAuditLog : latestRef.current.auditLog;
    const nextSuppliers = !dirty.has('suppliers') && serverSuppliers ? serverSuppliers : latestRef.current.suppliers;
    const nextDropdowns = !dirty.has('dropdownOptions') && serverDropdowns ? serverDropdowns : latestRef.current.dropdownOptions;

    if (!isServerHydratedRef.current && seenPendingIdsRef.current === null) {
      seenPendingIdsRef.current = new Set(
        nextRequests.filter((r: StockRequestItem) => r.status === 'Pending').map((r: StockRequestItem) => r.requestId)
      );
    }
    isServerHydratedRef.current = true;

    lastSyncedSnapshotRef.current = {
      users: serverUsers ?? lastSyncedSnapshotRef.current.users,
      products: serverProducts ?? lastSyncedSnapshotRef.current.products,
      stock: serverStock ?? lastSyncedSnapshotRef.current.stock,
      purchases: serverPurchases ?? lastSyncedSnapshotRef.current.purchases,
      requests: serverRequests ?? lastSyncedSnapshotRef.current.requests,
      transfers: serverTransfers ?? lastSyncedSnapshotRef.current.transfers,
      dailySales: serverDailySales ?? lastSyncedSnapshotRef.current.dailySales,
      operations: serverOperations ?? lastSyncedSnapshotRef.current.operations,
      ledger: serverLedger ?? lastSyncedSnapshotRef.current.ledger,
      auditLog: serverAuditLog ?? lastSyncedSnapshotRef.current.auditLog,
      suppliers: serverSuppliers ?? lastSyncedSnapshotRef.current.suppliers,
      dropdownOptions: serverDropdowns ?? lastSyncedSnapshotRef.current.dropdownOptions
    };

    const mergedSnapshot: WorkspaceSnapshot = {
      users: nextUsers,
      products: nextProducts,
      stock: nextStock,
      purchases: nextPurchases,
      requests: nextRequests,
      transfers: nextTransfers,
      dailySales: nextDailySales,
      operations: nextOperations,
      ledger: nextLedger,
      auditLog: nextAuditLog,
      suppliers: nextSuppliers,
      dropdownOptions: nextDropdowns
    };

    commitLocalState(mergedSnapshot);
    setSyncStatus('synced');
    setLastSyncTime(new Date().toLocaleTimeString());

    // Keep current session synced if admin edited password/role/active status
    const active = currentUserRef.current;
    if (active) {
      const refreshed = nextUsers.find(
        (u: User) => u.userId === active.userId || u.username.toLowerCase() === active.username.toLowerCase()
      );
      if (refreshed) {
        if (!refreshed.active) {
          setCurrentUser(null);
          localStorage.removeItem('mm_user');
        } else if (
          refreshed.fullName !== active.fullName ||
          refreshed.password !== active.password ||
          refreshed.role !== active.role ||
          refreshed.updatedAt !== active.updatedAt
        ) {
          setCurrentUser(refreshed);
          localStorage.setItem('mm_user', JSON.stringify(refreshed));
        }
      }
    }
  }, []);

  // Serialized push to Firestore with granular rule-compliant diffs
  const syncToServer = React.useCallback(
    (dirtySlices: string[], deletedIds?: Record<string, string[]>, isReset = false): Promise<void> => {
      dirtySlices.forEach(s => pendingDirtySlicesRef.current.add(s));
      const fbUser = firebaseUserRef.current;
      if (!fbUser) {
        setSyncStatus('offline');
        return Promise.resolve();
      }
      setSyncStatus('syncing');

      const task = syncChainRef.current
        .catch(() => undefined)
        .then(async () => {
          const allDirty = Array.from(new Set([...pendingDirtySlicesRef.current, ...dirtySlices]));
          allDirty.forEach(s => pendingDirtySlicesRef.current.delete(s));
          const nextSnap = latestRef.current;
          const prevSnap = lastSyncedSnapshotRef.current;
          try {
            await syncSlicesToFirestore(
              db,
              fbUser,
              knownDocsRef.current,
              prevSnap,
              nextSnap,
              allDirty,
              deletedIds,
              isReset,
              activeMemberEmailsRef.current
            );
          } catch (err) {
            allDirty.forEach(s => pendingDirtySlicesRef.current.add(s));
            throw err;
          }
          const updatedSynced: WorkspaceSnapshot = { ...lastSyncedSnapshotRef.current };
          allDirty.forEach((slice) => {
            if (slice in nextSnap) {
              (updatedSynced as any)[slice] = (nextSnap as any)[slice];
            }
          });
          lastSyncedSnapshotRef.current = updatedSynced;
          setSyncStatus('synced');
          setLastSyncTime(new Date().toLocaleTimeString());
        })
        .catch((err: any) => {
          console.warn('Firestore sync error:', err);
          setCloudError(err?.message || 'Could not save changes to Firestore.');
          setSyncStatus('offline');
        });

      syncChainRef.current = task;
      return task;
    },
    []
  );

  // Start Firebase connection check & auth + Firestore listener lifecycle
  const [connectAttempt, setConnectAttempt] = useState(0);

  useEffect(() => {
    void testFirestoreConnection();
  }, []);

  const verifyFreshGoogleUser = React.useCallback(
    async (
      user: FirebaseAuthUser
    ): Promise<
      | { status: 'verified'; user: FirebaseAuthUser; email: string; details: VerificationDetails }
      | { status: 'unverified'; user: FirebaseAuthUser; details: VerificationDetails }
      | { status: 'missing_email'; details: VerificationDetails }
    > => {
      if (verificationInFlightRef.current?.uid === user.uid) {
        return verificationInFlightRef.current.promise;
      }

      const run = (async () => {
        try {
          await user.reload();
        } catch {
          // Proceed to forced ID token refresh if profile reload fails transiently
        }

        const freshUser = auth.currentUser || user;
        const tokenResult = await freshUser.getIdTokenResult(true);
        const userEmailVerified = Boolean(freshUser.emailVerified);
        const tokenEmailVerified = tokenResult?.claims?.email_verified === true;
        const claimEmail = (
          typeof tokenResult?.claims?.email === 'string'
            ? tokenResult.claims.email
            : freshUser.email || freshUser.providerData?.find((p) => p?.email)?.email || ''
        ).trim();
        const providerIds = freshUser.providerData
          .map((p) => p?.providerId)
          .filter((id): id is string => Boolean(id));

        const details: VerificationDetails = {
          email: claimEmail || freshUser.email || '(missing email claim)',
          userEmailVerified,
          tokenEmailVerified,
          providerIds: providerIds.length > 0 ? providerIds : ['unknown'],
        };

        if (!claimEmail) {
          preservedAuthErrorRef.current =
            'Google sign-in did not include an email address claim on your account.';
          preservedVerificationDetailsRef.current = details;
          verifiedEmailRef.current = undefined;
          setCurrentUser(null);
          localStorage.removeItem('mm_user');
          await signOut(auth);
          return { status: 'missing_email' as const, details };
        }

        if (!userEmailVerified || !tokenEmailVerified) {
          verifiedEmailRef.current = undefined;
          setCurrentUser(null);
          localStorage.removeItem('mm_user');
          return { status: 'unverified' as const, user: freshUser, details };
        }

        return { status: 'verified' as const, user: freshUser, email: claimEmail, details };
      })().finally(() => {
        if (verificationInFlightRef.current?.uid === user.uid) {
          verificationInFlightRef.current = null;
        }
      });

      verificationInFlightRef.current = { uid: user.uid, promise: run };
      return run;
    },
    []
  );

  useEffect(() => {
    let active = true;
    let unsubFirestore: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!active) return;
      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }

      setFirebaseUser(user);
      setIsFirebaseAuthReady(true);

      if (!user) {
        if (isResettingAccountRef.current) {
          return;
        }
        verifiedEmailRef.current = undefined;
        setCloudAccessStatus('signed_out');
        setCloudError(preservedAuthErrorRef.current);
        setVerificationDetails(preservedVerificationDetailsRef.current);
        setSyncStatus('offline');
        return;
      }

      setCloudAccessStatus('loading');
      setCloudError(null);
      setSyncStatus('syncing');

      try {
        const outcome = await verifyFreshGoogleUser(user);
        if (!active) return;

        if (outcome.status === 'missing_email') {
          return;
        }

        if (outcome.status === 'unverified') {
          preservedAuthErrorRef.current = null;
          preservedVerificationDetailsRef.current = null;
          setFirebaseUser(outcome.user);
          setVerificationDetails(outcome.details);
          setCloudError(
            `Email verification required for ${outcome.details.email} (account emailVerified: ${outcome.details.userEmailVerified}, token email_verified: ${outcome.details.tokenEmailVerified}).`
          );
          setCloudAccessStatus('unverified');
          setSyncStatus('offline');
          return;
        }

        preservedAuthErrorRef.current = null;
        preservedVerificationDetailsRef.current = null;
        setVerificationDetails(null);
        verifiedEmailRef.current = outcome.email;
        setFirebaseUser(outcome.user);

        const seedSnapshot: WorkspaceSnapshot = {
          users: INITIAL_USERS,
          products: INITIAL_PRODUCTS,
          stock: buildInitialStockMap(),
          purchases: [],
          requests: [],
          transfers: [],
          dailySales: [],
          operations: [],
          ledger: [],
          auditLog: [],
          suppliers: INITIAL_SUPPLIERS,
          dropdownOptions: INITIAL_DROPDOWN_OPTIONS,
        };

        const { memberEmails, cloudMembers: loadedCloudMembers } = await ensureWorkspaceBootstrapped(
          db,
          outcome.user,
          seedSnapshot,
          OPENING_EPOCH,
          CATALOG_VERSION,
          outcome.email
        );
        if (!active) return;
        activeMemberEmailsRef.current = memberEmails;
        setCloudMembers(loadedCloudMembers);

        unsubFirestore = subscribeWorkspaceCollections(
          db,
          outcome.user,
          knownDocsRef.current,
          (partial, updatedMemberEmails, updatedCloudMembers) => {
            if (!active) return;
            if (updatedMemberEmails && updatedMemberEmails.length > 0) {
              activeMemberEmailsRef.current = updatedMemberEmails;
            }
            if (updatedCloudMembers) {
              setCloudMembers(updatedCloudMembers);
            }
            applyServerSnapshot(partial);
          },
          (errMsg) => {
            if (!active) return;
            const cleanMsg = errMsg.replace(/^UNAUTHORIZED_MEMBER:\s*/i, '');
            const lower = errMsg.toLowerCase();
            setCloudError(cleanMsg);
            setCloudAccessStatus(
              lower.includes('unauthorized_member') ||
                lower.includes('permission') ||
                lower.includes('insufficient')
                ? 'unauthorized'
                : 'offline'
            );
            setSyncStatus('offline');
          },
          outcome.email
        );

        setCloudAccessStatus('connected');
        setSyncStatus('synced');
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (err: any) {
        if (!active) return;
        const rawMsg = err?.message || 'Could not connect to Firestore database.';
        const cleanMsg = rawMsg.replace(/^UNAUTHORIZED_MEMBER:\s*/i, '');
        const lower = rawMsg.toLowerCase();
        setCloudError(cleanMsg);
        setCloudAccessStatus(
          lower.includes('unauthorized_member') ||
            lower.includes('permission') ||
            lower.includes('insufficient') ||
            lower.includes('not been initialized')
            ? 'unauthorized'
            : 'offline'
        );
        setSyncStatus('offline');
      }
    });

    return () => {
      active = false;
      unsubAuth();
      if (unsubFirestore) {
        unsubFirestore();
      }
    };
  }, [applyServerSnapshot, connectAttempt, verifyFreshGoogleUser]);

  const signInWithGoogle = async () => {
    preservedAuthErrorRef.current = null;
    preservedVerificationDetailsRef.current = null;
    setVerificationDetails(null);
    setCloudError(null);
    const cred = await signInWithPopup(auth, googleAuthProvider);
    const outcome = await verifyFreshGoogleUser(cred.user);
    if (outcome.status === 'missing_email') {
      throw new Error(
        preservedAuthErrorRef.current ||
          'Google sign-in did not include a verified email address claim.'
      );
    }
    if (outcome.status === 'unverified') {
      setFirebaseUser(outcome.user);
      setVerificationDetails(outcome.details);
      setCloudError(
        `Email verification required for ${outcome.details.email} (account emailVerified: ${outcome.details.userEmailVerified}, token email_verified: ${outcome.details.tokenEmailVerified}).`
      );
      setCloudAccessStatus('unverified');
      setSyncStatus('offline');
    }
  };

  const sendVerificationEmailToUser = async () => {
    const fbUser = auth.currentUser || firebaseUserRef.current;
    if (!fbUser) {
      throw new Error('No active Google session found. Please sign in with Google again.');
    }
    await sendEmailVerification(fbUser);
  };

  const refreshVerificationStatus = async (): Promise<boolean> => {
    const fbUser = auth.currentUser || firebaseUserRef.current;
    if (!fbUser) {
      setCloudAccessStatus('signed_out');
      return false;
    }
    const outcome = await verifyFreshGoogleUser(fbUser);
    if (outcome.status === 'verified') {
      preservedAuthErrorRef.current = null;
      preservedVerificationDetailsRef.current = null;
      setVerificationDetails(null);
      setCloudError(null);
      setCloudAccessStatus('loading');
      setConnectAttempt((n) => n + 1);
      return true;
    }
    if (outcome.status === 'unverified') {
      setFirebaseUser(outcome.user);
      setVerificationDetails(outcome.details);
      setCloudError(
        `Email verification required for ${outcome.details.email} (account emailVerified: ${outcome.details.userEmailVerified}, token email_verified: ${outcome.details.tokenEmailVerified}).`
      );
      setCloudAccessStatus('unverified');
    }
    return false;
  };

  const resetAndReverifyGoogleAccount = async (): Promise<'connected' | 'reauth_cleared'> => {
    const fbUser = auth.currentUser || firebaseUserRef.current;
    if (!fbUser) {
      throw new Error('No active Google session found. Please sign in with Google again.');
    }

    preservedAuthErrorRef.current = null;
    preservedVerificationDetailsRef.current = null;
    verifiedEmailRef.current = undefined;
    setCloudError(null);
    isResettingAccountRef.current = true;

    let deletedOldUser = false;
    try {
      try {
        await deleteUser(fbUser);
        deletedOldUser = true;
      } catch (delErr: any) {
        if (String(delErr?.code || '') === 'auth/requires-recent-login') {
          const reauthCred = await reauthenticateWithPopup(fbUser, googleAuthProvider);
          await deleteUser(reauthCred.user);
          deletedOldUser = true;
        } else {
          throw delErr;
        }
      }

      try {
        const freshCred = await signInWithPopup(auth, googleAuthProvider);
        const outcome = await verifyFreshGoogleUser(freshCred.user);
        if (outcome.status === 'missing_email') {
          throw new Error(
            preservedAuthErrorRef.current ||
              'Google sign-in did not include a verified email address claim.'
          );
        }
        if (outcome.status === 'unverified') {
          setFirebaseUser(outcome.user);
          setVerificationDetails(outcome.details);
          setCloudError(
            `Email verification required for ${outcome.details.email} (account emailVerified: ${outcome.details.userEmailVerified}, token email_verified: ${outcome.details.tokenEmailVerified}).`
          );
          setCloudAccessStatus('unverified');
          setSyncStatus('offline');
          throw new Error(
            `Google sign-in recreated the session for ${outcome.details.email}, but Firebase Auth still reports emailVerified=${outcome.details.userEmailVerified} and token email_verified=${outcome.details.tokenEmailVerified}. Verify the user in Firebase Console → Authentication → Users, or enable Email/Password under Sign-in method.`
          );
        }

        preservedAuthErrorRef.current = null;
        preservedVerificationDetailsRef.current = null;
        setVerificationDetails(null);
        setCloudError(null);
        setFirebaseUser(outcome.user);
        setCloudAccessStatus('loading');
        setConnectAttempt((n) => n + 1);
        return 'connected';
      } catch (popupErr: any) {
        const code = String(popupErr?.code || '');
        if (
          deletedOldUser &&
          (code === 'auth/popup-blocked' ||
            code === 'auth/popup-closed-by-user' ||
            code === 'auth/cancelled-popup-request')
        ) {
          setFirebaseUser(null);
          setVerificationDetails(null);
          setCurrentUser(null);
          localStorage.removeItem('mm_user');
          setCloudAccessStatus('signed_out');
          setSyncStatus('offline');
          return 'reauth_cleared';
        }
        throw popupErr;
      }
    } finally {
      isResettingAccountRef.current = false;
      if (deletedOldUser && !auth.currentUser) {
        setFirebaseUser(null);
        setVerificationDetails(null);
        setCloudAccessStatus('signed_out');
        setSyncStatus('offline');
      }
    }
  };

  const signOutGoogle = async () => {
    preservedAuthErrorRef.current = null;
    preservedVerificationDetailsRef.current = null;
    verifiedEmailRef.current = undefined;
    await signOut(auth);
    setCurrentUser(null);
    localStorage.removeItem('mm_user');
    setVerificationDetails(null);
    setCloudAccessStatus('signed_out');
    setCloudError(null);
  };

  const retryCloudConnection = async () => {
    preservedAuthErrorRef.current = null;
    preservedVerificationDetailsRef.current = null;
    setCloudError(null);
    setCloudAccessStatus('loading');
    setConnectAttempt((n) => n + 1);
  };

  const triggerManualSync = async () => {
    const fbUser = firebaseUserRef.current;
    if (!fbUser) {
      setSyncStatus('offline');
      return;
    }
    setSyncStatus('syncing');
    try {
      if (pendingDirtySlicesRef.current.size > 0) {
        await syncToServer(Array.from(pendingDirtySlicesRef.current));
      }
      const fetched = await fetchAllCollectionsFromFirestore(
        db,
        fbUser,
        knownDocsRef.current,
        verifiedEmailRef.current
      );
      applyServerSnapshot(fetched);
      setCloudError(null);
      setSyncStatus('synced');
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err: any) {
      setCloudError(err?.message || 'Refresh failed.');
      setSyncStatus('offline');
    }
  };

  // Notifications state & sound alerts
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
      // Ignore audio errors
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

  useEffect(() => {
    const currentPending = requests.filter(r => r.status === 'Pending');
    const currentPendingIds = new Set(currentPending.map(r => r.requestId));

    if (!isServerHydratedRef.current) return;

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

      if (soundEnabled) playNotificationChime();

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
          // Ignore Notification errors
        }
      }
    }
  }, [requests, currentUser?.role, soundEnabled]);

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
  const buildAuditEntry = (action: string, refId: string, details: string, actorUser?: User, offset = 0): AuditLogEntry => {
    const actor = actorUser || currentUser || { userId: '-', username: 'system', role: 'SYSTEM' as Role };
    const baseId = nextPrefixedId('AUD', latestRef.current.auditLog.map(a => a.auditId), 6, offset);
    return {
      auditId: `${baseId}-${uniqueSuffix()}`,
      timestamp: getNowTimestamp(),
      userId: actor.userId,
      username: actor.username,
      role: actor.role,
      action,
      refId,
      details
    };
  };

  const writeAuditAsync = async (entry: AuditLogEntry) => {
    commitLocalState({ auditLog: [entry, ...latestRef.current.auditLog] });
    await syncToServer(['auditLog']);
  };

  // Stock Movement Engine
  const applyMovements = (
    moves: { loc: StockLocation; productId: string; delta: number }[],
    refType: StockLedgerEntry['refType'],
    refId: string,
    bDate?: string,
    actor?: User
  ): boolean => {
    const now = getNowTimestamp();
    const effectiveBDate = bDate || businessDate || now.slice(0, 10);
    const curState = latestRef.current;
    const productMap = new Map(curState.products.map(p => [p.productId, p]));
    const nextSeq = curState.ledger.reduce((m, l) => Math.max(m, l.seq || 0), 0) + 1;
    const existingLedgerIds = curState.ledger.map(l => l.ledgerId);

    const updatedStock = { ...curState.stock };
    const newLedgerEntries: StockLedgerEntry[] = [];
    const newAuditEntries: AuditLogEntry[] = [];

    moves.forEach((m) => {
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
      const offsetIdx = newLedgerEntries.length;
      const baseLedId = nextPrefixedId('LED', existingLedgerIds, 6, offsetIdx);
      const lEntry: StockLedgerEntry = {
        seq: nextSeq + offsetIdx,
        ledgerId: `${baseLedId}-${uniqueSuffix()}`,
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
      };
      newLedgerEntries.push(lEntry);

      const aEntry = buildAuditEntry(
        'STOCK_CHANGE',
        refId,
        `${lEntry.location} | ${lEntry.productName} | ${lEntry.delta > 0 ? '+' : ''}${lEntry.delta} → ${lEntry.balanceAfter} (${refType})`,
        actor,
        offsetIdx
      );
      newAuditEntries.unshift(aEntry);
    });

    if (newLedgerEntries.length > 0) {
      commitLocalState(
        {
          stock: updatedStock,
          ledger: [...newLedgerEntries.reverse(), ...curState.ledger]
        },
        newAuditEntries
      );
      return true;
    }

    return false;
  };

  // Stock items with computed available quantities
  const stockItems: StockItem[] = products.map(p => {
    const s = stock[p.productId] || { godown: 0, normal: 0, ac: 0 };
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

  const pendingCount =
    currentUser?.role === 'ADMIN'
      ? requests.filter(r => r.status === 'Pending').length
      : requests.filter(r => r.status === 'Pending' && r.counter === currentUser?.counter).length;

  // User Auth Actions
  const login = async (username: string, password: string) => {
    const cleanU = username.trim().toLowerCase();
    const curUsers = latestRef.current.users;
    const user = curUsers.find(u => u.username.toLowerCase() === cleanU && u.active);
    if (!user) {
      await writeAuditAsync(buildAuditEntry('LOGIN_FAILED', '', `Unknown user or inactive: ${cleanU}`));
      return { success: false, error: 'Wrong User ID or password.' };
    }
    if (user.password && user.password !== password) {
      await writeAuditAsync(buildAuditEntry('LOGIN_FAILED', '', `Incorrect password for ${cleanU}`, user));
      return { success: false, error: 'Wrong User ID or password.' };
    }
    setCurrentUser(user);
    localStorage.setItem('mm_user', JSON.stringify(user));
    await writeAuditAsync(buildAuditEntry('LOGIN_OK', '', `Logged in as ${user.fullName} (${user.role})`, user));
    return { success: true };
  };

  const logout = () => {
    if (currentUser) {
      void writeAuditAsync(buildAuditEntry('LOGOUT', '', 'User signed out'));
    }
    setCurrentUser(null);
    localStorage.removeItem('mm_user');
  };

  const switchUser = (username: string) => {
    const u = latestRef.current.users.find(x => x.username.toLowerCase() === username.toLowerCase());
    if (u) {
      setCurrentUser(u);
      localStorage.setItem('mm_user', JSON.stringify(u));
      void writeAuditAsync(buildAuditEntry('USER_SWITCH', '', `Switched active profile to ${u.username}`));
    }
  };

  const changePassword = async (oldPw: string, newPw: string) => {
    if (!currentUser) throw new Error('Not logged in');
    if (currentUser.password && currentUser.password !== oldPw) {
      throw new Error('Current password is incorrect.');
    }
    if (newPw.length < 4) {
      throw new Error('Password must be at least 4 characters.');
    }
    const now = getNowTimestamp();
    const nextUsers = latestRef.current.users.map(u =>
      u.userId === currentUser.userId ? { ...u, password: newPw, mustChange: false, updatedAt: now } : u
    );
    const updatedMe = { ...currentUser, password: newPw, mustChange: false, updatedAt: now };
    setCurrentUser(updatedMe);
    localStorage.setItem('mm_user', JSON.stringify(updatedMe));
    const auditEntry = buildAuditEntry('PASSWORD_CHANGED', currentUser.userId, 'User changed own password');
    commitLocalState({ users: nextUsers }, [auditEntry]);
    await syncToServer(['users', 'auditLog']);
  };

  // Product management
  const saveProduct = async (p: Partial<Product> & { name: string; category: string; sizeML: number; casePack: number; sellingPrice: number; purchaseCost?: number; reorderThreshold?: number }) => {
    if (currentUser?.role !== 'ADMIN') throw new Error('Admin permission required.');
    const pack = bottlesPerCase_({ name: p.name, sizeML: p.sizeML, casePack: p.casePack });
    const curProducts = latestRef.current.products;
    const now = getNowTimestamp();

    if (p.productId) {
      const updatedProd: Product = {
        productId: p.productId,
        name: p.name.trim(),
        category: p.category.trim(),
        sizeML: Number(p.sizeML),
        casePack: pack,
        sellingPrice: Number(p.sellingPrice),
        active: p.active !== undefined ? p.active : (curProducts.find(x => x.productId === p.productId)?.active ?? true),
        updatedAt: now,
        updatedBy: currentUser.username
      };
      const nextProducts = sortProductsCategoryWise(
        curProducts.map(prod => (prod.productId === p.productId ? updatedProd : prod))
      );
      const auditEntry = buildAuditEntry('PRODUCT_UPDATED', p.productId, `${p.name} ${p.sizeML}ml (${pack}/case) ₹${p.sellingPrice}`);
      commitLocalState({ products: nextProducts }, [auditEntry]);
      await syncToServer(['products', 'auditLog']);
      return p.productId;
    } else {
      const newId = nextPrefixedId('PRD', curProducts.map(x => x.productId), 6);
      const newProduct: Product = {
        productId: newId,
        name: p.name.trim(),
        category: p.category.trim(),
        sizeML: Number(p.sizeML),
        casePack: pack,
        sellingPrice: Number(p.sellingPrice),
        active: true,
        updatedAt: now,
        updatedBy: currentUser.username
      };
      const auditEntry = buildAuditEntry('PRODUCT_CREATED', newId, `${p.name} ${p.sizeML}ml`);
      commitLocalState(
        {
          products: sortProductsCategoryWise([...curProducts, newProduct]),
          stock: { ...latestRef.current.stock, [newId]: { godown: 0, normal: 0, ac: 0 } }
        },
        [auditEntry]
      );
      await syncToServer(['products', 'stock', 'auditLog']);
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
    const prod = latestRef.current.products.find(p => p.productId === data.productId);
    if (!prod) throw new Error('Product not found.');

    const nextGodown = Math.max(0, Math.floor(Number(data.godown) || 0));
    const nextNormal = Math.max(0, Math.floor(Number(data.normal) || 0));
    const nextAc = Math.max(0, Math.floor(Number(data.ac) || 0));

    const cur = latestRef.current.stock[data.productId] || { godown: 0, normal: 0, ac: 0 };
    const moves: { loc: StockLocation; productId: string; delta: number }[] = [];
    if (nextGodown !== (cur.godown || 0)) moves.push({ loc: 'GODOWN', productId: data.productId, delta: nextGodown - (cur.godown || 0) });
    if (nextNormal !== (cur.normal || 0)) moves.push({ loc: 'NORMAL', productId: data.productId, delta: nextNormal - (cur.normal || 0) });
    if (nextAc !== (cur.ac || 0)) moves.push({ loc: 'AC', productId: data.productId, delta: nextAc - (cur.ac || 0) });

    if (moves.length === 0) return;

    const refId = `ADJ-${Date.now().toString().slice(-6)}`;
    applyMovements(moves, 'ADJUSTMENT', refId, businessDate);
    const auditEntry = buildAuditEntry(
      'ADMIN_STOCK_EDITED',
      refId,
      `${prod.name} ${prod.sizeML}ml | Godown: ${cur.godown || 0}→${nextGodown}, Normal: ${cur.normal || 0}→${nextNormal}, AC: ${cur.ac || 0}→${nextAc}${data.reason?.trim() ? ` | Reason: ${data.reason.trim()}` : ''}`
    );
    commitLocalState({}, [auditEntry]);
    await syncToServer(['stock', 'ledger', 'auditLog']);
  };

  // Purchases
  const submitPurchaseBatch = async (data: {
    supplier: string; date: string; billDate: string; invoiceNo: string;
    permitNumber?: string; documentNumber?: string;
    lines: { productId: string; qty: number; enteredQty?: number; enteredPrice?: number; unit?: 'CASE' | 'BOTTLE'; rate: number; sedAmt: number; discountAmt: number; tcsPct: number }[];
  }) => {
    if (currentUser?.role !== 'ADMIN') throw new Error('Admin permission required.');
    if (!data.lines.length) throw new Error('Add at least one item.');
    const curProducts = latestRef.current.products;
    const curPurchases = latestRef.current.purchases;
    const productMap = new Map(curProducts.map(p => [p.productId, p]));
    const baseBatchId = nextPrefixedId('PBT', curPurchases.map(p => p.batchId), 6);
    const batchId = curPurchases.some(p => p.batchId === baseBatchId) ? `${baseBatchId}-${uniqueSuffix()}` : baseBatchId;

    let totalQty = 0;
    let grossTotal = 0;
    let sedTotal = 0;
    let discountTotal = 0;
    let tcsTotal = 0;
    let netTotal = 0;

    const parsedLines = data.lines.map((l, i) => {
      const p = productMap.get(l.productId);
      const pack = p ? bottlesPerCase_(p) : 1;
      const effectiveRate =
        l.enteredPrice !== undefined && l.enteredPrice > 0 && pack > 0
          ? l.enteredPrice / pack
          : l.rate;
      const gross =
        l.unit === 'CASE' && l.enteredPrice !== undefined && l.enteredPrice > 0
          ? Math.round((l.enteredQty || 1) * l.enteredPrice * 100) / 100
          : Math.round(l.qty * effectiveRate * 100) / 100;
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
        casePack: pack,
        qty: l.qty,
        enteredQty: l.enteredQty || l.qty,
        enteredPrice: l.enteredPrice,
        unit: l.unit || 'BOTTLE',
        rate: effectiveRate,
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
      netTotal: Math.round(netTotal),
      createdBy: currentUser.username,
      createdAt: getNowTimestamp()
    };

    const auditEntry = buildAuditEntry(
      'PURCHASE_SUBMITTED',
      batchId,
      `${data.supplier} | ${parsedLines.length} item(s), ${totalQty} btls | net ₹${newBatch.netTotal}`
    );

    commitLocalState({ purchases: [newBatch, ...curPurchases] }, [auditEntry]);
    await syncToServer(['purchases', 'auditLog']);
    return batchId;
  };

  const reviewPurchaseBill = async (batchId: string, decision: 'APPROVE' | 'REJECT', remark?: string) => {
    if (currentUser?.role !== 'ADMIN') throw new Error('Admin permission required.');
    const curPurchases = latestRef.current.purchases;
    const batch = curPurchases.find(p => p.batchId === batchId);
    if (!batch) throw new Error('Purchase entry not found.');
    if (batch.status !== 'Pending') throw new Error('This purchase entry was already reviewed.');

    const dirtySlices = ['purchases', 'auditLog'];
    if (decision === 'APPROVE') {
      const moves = batch.lines.map(l => ({
        loc: 'GODOWN' as StockLocation,
        productId: l.productId,
        delta: l.qty
      }));
      if (applyMovements(moves, 'PURCHASE', batchId, batch.date)) {
        dirtySlices.push('stock', 'ledger');
      }
    }

    const now = getNowTimestamp();
    const nextStatus = (decision === 'APPROVE' ? 'Approved' : 'Rejected') as PurchaseBatch['status'];
    const nextPurchases = latestRef.current.purchases.map(p =>
      p.batchId === batchId
        ? {
            ...p,
            status: nextStatus,
            reviewedBy: currentUser.username,
            reviewedAt: now,
            remark: remark || ''
          }
        : p
    );

    const auditEntry = buildAuditEntry(
      decision === 'APPROVE' ? 'APPROVED_PURCHASE' : 'REJECTED_PURCHASE',
      batchId,
      `${batch.supplier} | ${batch.lines.length} items | net ₹${batch.netTotal} ${remark ? `(${remark})` : ''}`
    );
    commitLocalState({ purchases: nextPurchases }, [auditEntry]);
    await syncToServer(dirtySlices);
  };

  const editPurchaseRecord = async (id: string, updates: {
    date: string; billDate: string; supplier: string; invoiceNo: string;
    qty: number; rate: number; sedAmt: number; discountAmt: number; tcsPct: number; reason: string;
  }) => {
    if (currentUser?.role !== 'ADMIN') throw new Error('Admin permission required.');
    let foundLine: any = null;
    let targetBatch: PurchaseBatch | null = null;
    const now = getNowTimestamp();

    const nextPurchases = latestRef.current.purchases.map(batch => {
      const line = batch.lines.find(l => l.id === id);
      if (line) {
        foundLine = { ...line };
        targetBatch = batch;
        const gross = updates.qty * updates.rate;
        const taxable = Math.max(0, gross + updates.sedAmt - updates.discountAmt);
        const tcs = Math.round(taxable * (updates.tcsPct / 100) * 100) / 100;
        const net = Math.round((taxable + tcs) * 100) / 100;

        const updatedLines = batch.lines.map(l =>
          l.id === id
            ? {
                ...l,
                qty: updates.qty,
                rate: updates.rate,
                sedAmt: updates.sedAmt,
                discountAmt: updates.discountAmt,
                tcsPct: updates.tcsPct,
                grossAmount: gross,
                netAmount: net
              }
            : l
        );

        return {
          ...batch,
          date: updates.date,
          billDate: updates.billDate,
          supplier: updates.supplier,
          invoiceNo: updates.invoiceNo,
          lines: updatedLines,
          totalQty: updatedLines.reduce((s, l) => s + l.qty, 0),
          netTotal: Math.round(updatedLines.reduce((s, l) => s + l.netAmount, 0)),
          reviewedAt: batch.reviewedAt || now,
          remark: `${batch.remark ? batch.remark + ' | ' : ''}Admin correction: ${updates.reason}`
        };
      }
      return batch;
    });

    const dirtySlices = ['purchases', 'auditLog'];
    if (foundLine && targetBatch && (targetBatch as PurchaseBatch).status === 'Approved') {
      const delta = updates.qty - foundLine.qty;
      if (delta !== 0) {
        if (applyMovements([{ loc: 'GODOWN', productId: foundLine.productId, delta }], 'PURCHASE_CORRECTION', id, updates.date)) {
          dirtySlices.push('stock', 'ledger');
        }
      }
    }

    const auditEntry = buildAuditEntry('ADMIN_HISTORICAL_PURCHASE_EDIT', id, `Updated purchase row | reason: ${updates.reason}`);
    commitLocalState({ purchases: nextPurchases }, [auditEntry]);
    await syncToServer(dirtySlices);
  };

  const deletePurchaseBatch = async (batchId: string) => {
    if (currentUser?.role !== 'ADMIN') throw new Error('Admin permission required.');
    const curPurchases = latestRef.current.purchases;
    const batch = curPurchases.find(p => p.batchId === batchId);
    if (!batch) throw new Error('Purchase entry not found.');

    const dirtySlices = ['purchases', 'auditLog'];
    if (batch.status === 'Approved') {
      const reverseMoves = batch.lines
        .filter(l => l.qty > 0)
        .map(l => ({
          loc: 'GODOWN' as StockLocation,
          productId: l.productId,
          delta: -l.qty
        }));
      if (reverseMoves.length > 0 && applyMovements(reverseMoves, 'PURCHASE_CORRECTION', batchId, batch.date)) {
        dirtySlices.push('stock', 'ledger');
      }
    }

    const auditEntry = buildAuditEntry('PURCHASE_DELETED', batchId, `${batch.supplier} | Invoice #${batch.invoiceNo} | ${batch.totalQty} btls | ₹${batch.netTotal}`);
    commitLocalState({ purchases: latestRef.current.purchases.filter(p => p.batchId !== batchId) }, [auditEntry]);
    await syncToServer(dirtySlices, { purchases: [batchId] });
  };

  // Requests
  const submitRequestBatch = async (data: { date: string; reason: string; items: { productId: string; qty: number; unit: 'CASE' | 'BOTTLE' }[] }) => {
    if (!currentUser || (currentUser.role !== 'NORMAL' && currentUser.role !== 'AC')) {
      throw new Error('Only counter operators can request stock.');
    }
    if (!data.items.length) throw new Error('Select at least one product.');
    const counter = currentUser.counter || (currentUser.role as CounterLocation);
    const curProducts = latestRef.current.products;
    const curRequests = latestRef.current.requests;
    const productMap = new Map(curProducts.map(p => [p.productId, p]));
    const now = getNowTimestamp();
    const existingReqIds = curRequests.map(r => r.requestId);
    const suffix = uniqueSuffix();

    const newRequests: StockRequestItem[] = data.items.map((it, idx) => {
      const p = productMap.get(it.productId);
      const pack = p ? bottlesPerCase_(p) : 1;
      const totalBottles = it.qty * (it.unit === 'CASE' ? pack : 1);
      const reqId = `${nextPrefixedId('REQ', existingReqIds, 6, idx)}-${suffix}`;

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

    const totalBottles = newRequests.reduce((s, r) => s + r.qty, 0);
    const auditEntry = buildAuditEntry('REQUEST_SUBMITTED', newRequests[0].requestId, `${counter} requested ${newRequests.length} item(s), ${totalBottles} bottles | ${data.reason}`);
    commitLocalState({ requests: [...newRequests, ...curRequests] }, [auditEntry]);
    await syncToServer(['requests', 'auditLog']);
  };

  const reviewRequestGroup = async (ids: string[], decision: 'APPROVE' | 'REJECT', remark?: string, skipShort = false) => {
    if (currentUser?.role !== 'ADMIN') throw new Error('Admin permission required.');
    const curRequests = latestRef.current.requests;
    const curStock = latestRef.current.stock;
    const targetRequests = curRequests.filter(r => ids.includes(r.requestId));
    if (!targetRequests.length) throw new Error('Requests not found.');

    const moves: { loc: StockLocation; productId: string; delta: number }[] = [];
    const approvedIds: string[] = [];
    const rejectedIds: string[] = [];

    targetRequests.forEach(r => {
      const godownStock = curStock[r.productId]?.godown || 0;
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

    const dirtySlices = ['requests', 'auditLog'];
    if (moves.length > 0 && applyMovements(moves, 'REQUEST', ids[0], targetRequests[0].date)) {
      dirtySlices.push('stock', 'ledger');
    }

    const now = getNowTimestamp();
    const nextRequests = latestRef.current.requests.map(r => {
      if (approvedIds.includes(r.requestId)) {
        return { ...r, status: 'Approved' as const, reviewedBy: currentUser.username, reviewedAt: now, remark: remark || '' };
      }
      if (rejectedIds.includes(r.requestId)) {
        return {
          ...r,
          status: 'Rejected' as const,
          reviewedBy: currentUser.username,
          reviewedAt: now,
          remark: remark || (decision === 'APPROVE' ? 'Not enough godown stock' : 'Rejected by admin')
        };
      }
      return r;
    });

    const auditEntry = buildAuditEntry(
      decision === 'APPROVE' ? 'APPROVED_REQUEST' : 'REJECTED_REQUEST',
      ids.join(','),
      `Reviewed ${ids.length} requests: ${approvedIds.length} approved, ${rejectedIds.length} rejected`
    );
    commitLocalState({ requests: nextRequests }, [auditEntry]);
    await syncToServer(dirtySlices);

    return { approved: approvedIds.length, rejected: rejectedIds.length };
  };

  // Transfers
  const submitTransfer = async (data: { productId: string; qty: number; unit?: 'CASE' | 'BOTTLE'; to?: CounterLocation; note?: string }) => {
    if (!currentUser) throw new Error('Not logged in');
    const isAdmin = currentUser.role === 'ADMIN';
    const curState = latestRef.current;
    const prod = curState.products.find(p => p.productId === data.productId);
    if (!prod) throw new Error('Product not found');

    const pack = bottlesPerCase_(prod);
    const unit = data.unit || 'BOTTLE';
    const totalBottles = data.qty * (unit === 'CASE' ? pack : 1);

    const fromLoc: StockLocation = isAdmin ? 'GODOWN' : (currentUser.counter || 'NORMAL');
    const toLoc: StockLocation = isAdmin
      ? (data.to || 'NORMAL')
      : (currentUser.counter === 'NORMAL' ? 'AC' : 'NORMAL');

    const avail = curState.stock[data.productId]?.[fromLoc.toLowerCase() as 'godown' | 'normal' | 'ac'] || 0;
    if (totalBottles > avail) {
      throw new Error(`Not enough stock. ${fromLoc} has ${avail} bottles, requested ${totalBottles}.`);
    }

    const transferId = `${nextPrefixedId('TRF', curState.transfers.map(t => t.transferId), 6)}-${uniqueSuffix()}`;
    const autoApproved = !isAdmin;
    const now = getNowTimestamp();

    const dirtySlices = ['transfers', 'auditLog'];
    if (autoApproved) {
      if (applyMovements([
        { loc: fromLoc, productId: data.productId, delta: -totalBottles },
        { loc: toLoc, productId: data.productId, delta: totalBottles }
      ], 'TRANSFER', transferId)) {
        dirtySlices.push('stock', 'ledger');
      }
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

    const auditEntry = buildAuditEntry(
      autoApproved ? 'TRANSFER_COMPLETED' : 'TRANSFER_SUBMITTED',
      transferId,
      `${fromLoc} → ${toLoc} | ${prod.name} x ${totalBottles} btls ${data.note ? `(${data.note})` : ''}`
    );
    commitLocalState({ transfers: [newTransfer, ...latestRef.current.transfers] }, [auditEntry]);
    await syncToServer(dirtySlices);

    return { autoApproved };
  };

  // Daily Sales Computations
  const getReportFormLines = (counter: CounterLocation, date: string) => {
    const existing = dailySales.find(r => r.counter === counter && r.date === date && r.status !== 'Rejected');
    if (existing) {
      return { lines: [], blockedMessage: `A report for ${date} has already been submitted (${existing.reportId}, ${existing.status}).`, pendingGodownCount: 0 };
    }

    const pendingGodown = requests.filter(r => r.counter === counter && r.date === date && r.status === 'Pending');
    if (pendingGodown.length > 0) {
      return {
        lines: [],
        blockedMessage: `Daily Sales is locked: ${pendingGodown.length} Godown receipt entr${pendingGodown.length === 1 ? 'y is' : 'ies are'} pending Admin approval. Wait until every entry is approved or rejected.`,
        pendingGodownCount: pendingGodown.length
      };
    }

    const lastApproved = dailySales
      .filter(r => r.counter === counter && r.status === 'Approved' && r.date < date)
      .sort((a, b) => b.date.localeCompare(a.date))[0];

    const openingMap = new Map<string, number>();
    if (lastApproved) {
      lastApproved.lines.forEach(l => openingMap.set(l.productId, l.closing));
    }

    const godownInMap = new Map<string, number>();
    const transferInMap = new Map<string, number>();
    const transferOutMap = new Map<string, number>();
    const damageOutMap = new Map<string, number>();

    ledger.filter(l => l.location === counter && l.businessDate === date).forEach(l => {
      if (l.delta > 0) {
        if (l.refType === 'REQUEST') godownInMap.set(l.productId, (godownInMap.get(l.productId) || 0) + l.delta);
        else if (l.refType === 'TRANSFER') transferInMap.set(l.productId, (transferInMap.get(l.productId) || 0) + l.delta);
      } else if (l.delta < 0) {
        if (l.refType === 'DAMAGE') damageOutMap.set(l.productId, (damageOutMap.get(l.productId) || 0) - l.delta);
        else if (l.refType === 'TRANSFER') transferOutMap.set(l.productId, (transferOutMap.get(l.productId) || 0) - l.delta);
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
    if (!currentUser) throw new Error('Authentication required to submit daily sales.');
    const counter: CounterLocation = (currentUser.role === 'ADMIN' ? (data.counter || 'NORMAL') : (currentUser.counter || currentUser.role)) as CounterLocation;
    const form = getReportFormLines(counter, data.date);
    if (form.blockedMessage) throw new Error(form.blockedMessage);

    const curProducts = latestRef.current.products;
    const curSales = latestRef.current.dailySales;
    const productMap = new Map(curProducts.map(p => [p.productId, p]));
    const givenMap = new Map(data.lines.map(l => [l.productId, l.closing]));

    let totalSold = 0;
    let totalVal = 0;

    const reportId = `${nextPrefixedId('RPT', curSales.map(r => r.reportId), 6)}-${uniqueSuffix()}`;

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
        lineId: `SLN-${reportId.slice(4, 10)}-${String(i + 1).padStart(3, '0')}`,
        reportId,
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

    const dirtySlices = ['dailySales', 'auditLog'];
    const moves = reportLines.filter(l => l.sold > 0).map(l => ({
      loc: counter as StockLocation,
      productId: l.productId,
      delta: -l.sold
    }));
    if (moves.length > 0 && applyMovements(moves, 'SALE', reportId, data.date)) {
      dirtySlices.push('stock', 'ledger');
    }

    const now = getNowTimestamp();
    const newReport: DailySalesReport = {
      reportId,
      date: data.date,
      counter,
      status: 'Approved',
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
      cutoffSeq: latestRef.current.ledger[0]?.seq || 0,
      submittedBy: currentUser.username,
      submittedAt: now,
      reviewedBy: 'Auto-Approved',
      reviewedAt: now,
      remark: 'Auto-approved on submission',
      lines: reportLines
    };

    const auditEntry = buildAuditEntry(
      'SALES_SUBMITTED_AND_APPROVED',
      reportId,
      `${data.date} | ${counter} | sold ${totalSold} btls | ₹${newReport.totalSalesValue}${acCharges > 0 ? ` + ₹${acCharges} AC` : ''} (Auto-Approved)`
    );
    commitLocalState({ dailySales: [newReport, ...latestRef.current.dailySales] }, [auditEntry]);
    await syncToServer(dirtySlices);
    return reportId;
  };

  const adminCreateHistoricalReport = async (data: {
    date: string; counter: CounterLocation; recordedAmount: number; reason: string;
    lines: { productId: string; sold: number }[];
  }) => {
    if (currentUser?.role !== 'ADMIN') throw new Error('Admin permission required.');
    const curState = latestRef.current;
    const productMap = new Map(curState.products.map(p => [p.productId, p]));
    const reportId = `${nextPrefixedId('RPT', curState.dailySales.map(r => r.reportId), 6)}-${uniqueSuffix()}`;

    let totalSold = 0;
    let totalVal = 0;

    const reportLines = data.lines.filter(l => l.sold > 0).map((l, i) => {
      const p = productMap.get(l.productId);
      const price = p?.sellingPrice || 0;
      const val = l.sold * price;
      totalSold += l.sold;
      totalVal += val;

      return {
        lineId: `SLN-${reportId.slice(4, 10)}-${String(i + 1).padStart(3, '0')}`,
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

    const auditEntry = buildAuditEntry('ADMIN_HISTORICAL_SALES_CREATED', reportId, `${data.date} | ${data.counter} | sold ${totalSold} | ₹${totalVal} | stock unchanged | ${data.reason}`);
    commitLocalState({ dailySales: [newReport, ...latestRef.current.dailySales] }, [auditEntry]);
    await syncToServer(['dailySales', 'auditLog']);
    return reportId;
  };

  const adminEditReport = async (reportId: string, data: { recordedAmount: number; reason: string; lines: { productId: string; closing?: number; sold?: number }[] }) => {
    const report = latestRef.current.dailySales.find(r => r.reportId === reportId);
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
        const delta = l.sold - newSold;
        if (delta !== 0) {
          stockMoves.push({ loc: report.counter, productId: l.productId, delta });
        }
      }

      return { ...l, closing: newClosing, sold: newSold, value: newVal };
    });

    const dirtySlices = ['dailySales', 'auditLog'];
    if (stockMoves.length > 0 && applyMovements(stockMoves, 'SALES_CORRECTION', reportId, report.date)) {
      dirtySlices.push('stock', 'ledger');
    }

    const now = getNowTimestamp();
    const nextSalesVal = Math.round(totalVal * 100) / 100;
    const nextRemark = `${report.remark ? report.remark + ' | ' : ''}Correction: ${data.reason}`;
    const nextSales = latestRef.current.dailySales.map(r =>
      r.reportId === reportId
        ? {
            ...r,
            totalSoldQty: totalSold,
            totalSalesValue: nextSalesVal,
            recordedAmount: data.recordedAmount,
            lines: updatedLines,
            editedBy: currentUser?.username,
            editedAt: now,
            remark: nextRemark
          }
        : r
    );

    const auditEntry = buildAuditEntry('SALES_EDITED', reportId, `Sold ${report.totalSoldQty} → ${totalSold} | ${data.reason}`);
    commitLocalState({ dailySales: nextSales }, [auditEntry]);
    await syncToServer(dirtySlices);
  };

  const reviewDailySales = async (reportId: string, decision: 'APPROVE' | 'REJECT', remark?: string) => {
    if (currentUser?.role !== 'ADMIN') throw new Error('Admin permission required.');
    const report = latestRef.current.dailySales.find(r => r.reportId === reportId);
    if (!report) throw new Error('Report not found');
    if (report.status !== 'Pending') throw new Error('Report already reviewed.');

    const dirtySlices = ['dailySales', 'auditLog'];
    if (decision === 'APPROVE') {
      const moves = report.lines.filter(l => l.sold > 0).map(l => ({
        loc: report.counter as StockLocation,
        productId: l.productId,
        delta: -l.sold
      }));
      if (applyMovements(moves, 'SALE', reportId, report.date)) {
        dirtySlices.push('stock', 'ledger');
      }
    }

    const now = getNowTimestamp();
    const nextStatus = (decision === 'APPROVE' ? 'Approved' : 'Rejected') as DailySalesReport['status'];
    const nextSales = latestRef.current.dailySales.map(r =>
      r.reportId === reportId
        ? { ...r, status: nextStatus, reviewedBy: currentUser.username, reviewedAt: now, remark: remark || '' }
        : r
    );

    const auditEntry = buildAuditEntry(
      decision === 'APPROVE' ? 'APPROVED_SALES' : 'REJECTED_SALES',
      reportId,
      `${report.counter} | ${report.date} | sold ${report.totalSoldQty} btls ${remark ? `(${remark})` : ''}`
    );
    commitLocalState({ dailySales: nextSales }, [auditEntry]);
    await syncToServer(dirtySlices);
  };

  const adminDeleteDailySales = async (reportId: string, reason?: string) => {
    if (currentUser?.role !== 'ADMIN') {
      throw new Error('Admin permission required to delete a daily sales report.');
    }
    const report = latestRef.current.dailySales.find(r => r.reportId === reportId);
    if (!report) throw new Error('Daily sales report not found.');

    const isHistoricalOnly = report.remark?.includes('ADMIN HISTORICAL SALES-ONLY ENTRY');
    const dirtySlices = ['dailySales', 'auditLog'];

    if (report.status === 'Approved' && !isHistoricalOnly) {
      const reverseMoves = report.lines
        .filter(l => l.sold > 0)
        .map(l => ({
          loc: report.counter as StockLocation,
          productId: l.productId,
          delta: l.sold
        }));

      if (reverseMoves.length > 0 && applyMovements(reverseMoves, 'SALES_CORRECTION', reportId, report.date)) {
        dirtySlices.push('stock', 'ledger');
      }
    }

    const auditEntry = buildAuditEntry(
      'ADMIN_SALES_DELETED',
      reportId,
      `${report.date} | ${report.counter} | reversed ${report.totalSoldQty} btls (₹${report.totalSalesValue})${reason?.trim() ? ` | Reason: ${reason.trim()}` : ''}`
    );
    commitLocalState({ dailySales: latestRef.current.dailySales.filter(r => r.reportId !== reportId) }, [auditEntry]);
    await syncToServer(dirtySlices, { dailySales: [reportId] });
  };

  // Daily Operations
  const saveDailyOperation = async (data: {
    type: 'EXPENSE' | 'WAGE' | 'ROOM' | 'DAMAGE'; date: string; name: string;
    amount: number; payment?: 'Cash' | 'UPI' | 'Card'; roomNo?: number;
    location?: StockLocation; productId?: string; qty?: number; note?: string;
  }) => {
    if (!currentUser) throw new Error('Not logged in');
    const curOps = latestRef.current.operations;
    const opId = `${nextPrefixedId('OPR', curOps.map(o => o.operationId), 6)}-${uniqueSuffix()}`;
    const now = getNowTimestamp();
    const status = 'Approved';
    const dirtySlices = ['operations', 'auditLog'];

    if (data.type === 'DAMAGE') {
      if (!data.productId) throw new Error('Choose a product.');
      const qty = Number(data.qty) || 1;
      const loc = data.location || (currentUser.role === 'ADMIN' ? 'GODOWN' : (currentUser.counter || 'NORMAL'));
      const avail = latestRef.current.stock[data.productId]?.[loc.toLowerCase() as 'godown' | 'normal' | 'ac'] || 0;
      if (qty > avail) {
        throw new Error(`Damaged quantity (${qty}) exceeds stock available at ${loc} (${avail}).`);
      }
      if (applyMovements([{ loc, productId: data.productId, delta: -qty }], 'DAMAGE', opId, data.date)) {
        dirtySlices.push('stock', 'ledger');
      }
    }

    const prod = data.productId ? latestRef.current.products.find(p => p.productId === data.productId) : null;
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

    const auditEntry = buildAuditEntry('DAILY_OPERATION_SAVED', opId, `${data.type} | ${data.date} | ${data.name} | ₹${data.amount || data.qty}`);
    commitLocalState({ operations: [newOp, ...latestRef.current.operations] }, [auditEntry]);
    await syncToServer(dirtySlices);
    return opId;
  };

  const saveDailyOperationsBatch = async (data: {
    type: 'EXPENSE' | 'WAGE'; date: string;
    items: { name: string; amount: number; note?: string }[];
  }) => {
    if (!currentUser) throw new Error('Not logged in');
    if (!data.items.length) throw new Error('Add at least one item.');
    const curOps = latestRef.current.operations;
    const existingOpIds = curOps.map(o => o.operationId);
    const now = getNowTimestamp();
    const suffix = uniqueSuffix();
    let total = 0;

    const newOps: DailyOperation[] = data.items.map((it, idx) => {
      total += it.amount;
      return {
        operationId: `${nextPrefixedId('OPR', existingOpIds, 6, idx)}-${suffix}`,
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

    const auditEntry = buildAuditEntry('DAILY_OPERATIONS_BATCH', newOps[0].operationId, `${data.type} batch: ${newOps.length} items | ₹${total}`);
    commitLocalState({ operations: [...newOps, ...latestRef.current.operations] }, [auditEntry]);
    await syncToServer(['operations', 'auditLog']);
    return { count: newOps.length, total: Math.round(total * 100) / 100 };
  };

  const deleteDailyOperation = async (operationId: string) => {
    if (!currentUser) throw new Error('Not logged in');
    const op = latestRef.current.operations.find(o => o.operationId === operationId);
    if (!op) throw new Error('Entry not found.');

    const dirtySlices = ['operations', 'auditLog'];
    if (op.type === 'DAMAGE' && op.status === 'Approved' && op.productId && op.qty) {
      const loc = op.location || 'GODOWN';
      if (applyMovements([{ loc, productId: op.productId, delta: op.qty }], 'ADJUSTMENT', operationId, op.date)) {
        dirtySlices.push('stock', 'ledger');
      }
    }

    const auditEntry = buildAuditEntry('DAILY_OPERATION_DELETED', operationId, `${op.type} | ${op.date} | ${op.name} | ₹${op.amount || op.qty || 0}`);
    commitLocalState({ operations: latestRef.current.operations.filter(o => o.operationId !== operationId) }, [auditEntry]);
    await syncToServer(dirtySlices, { operations: [operationId] });
  };

  const reviewDailyOperation = async (id: string, decision: 'APPROVE' | 'REJECT', remark?: string) => {
    if (currentUser?.role !== 'ADMIN') throw new Error('Admin permission required.');
    const op = latestRef.current.operations.find(o => o.operationId === id);
    if (!op) throw new Error('Operation not found.');

    const dirtySlices = ['operations', 'auditLog'];
    if (decision === 'APPROVE' && op.type === 'DAMAGE' && op.productId && op.qty) {
      const loc = op.location || 'GODOWN';
      if (applyMovements([{ loc, productId: op.productId, delta: -op.qty }], 'DAMAGE', id, op.date)) {
        dirtySlices.push('stock', 'ledger');
      }
    }

    const now = getNowTimestamp();
    const nextStatus = (decision === 'APPROVE' ? 'Approved' : 'Rejected') as DailyOperation['status'];
    const nextOps = latestRef.current.operations.map(o =>
      o.operationId === id
        ? { ...o, status: nextStatus, reviewedBy: currentUser.username, reviewedAt: now, reviewRemark: remark || '' }
        : o
    );

    const auditEntry = buildAuditEntry(`DAILY_OPERATION_${decision}`, id, `${op.type} | ${remark || ''}`);
    commitLocalState({ operations: nextOps }, [auditEntry]);
    await syncToServer(dirtySlices);
  };

  // Administration helpers
  const addSupplier = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Supplier name is required.');
    const curSuppliers = latestRef.current.suppliers;
    if (!curSuppliers.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      const nextSuppliers = [...curSuppliers, trimmed].slice(0, 100);
      const auditEntry = buildAuditEntry('SUPPLIER_ADDED', '', trimmed);
      commitLocalState({ suppliers: nextSuppliers }, [auditEntry]);
      await syncToServer(['suppliers', 'auditLog']);
    }
  };

  const deleteSupplier = async (name: string) => {
    if (currentUser?.role !== 'ADMIN') throw new Error('Admin permission required.');
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Supplier name is required.');
    const curSuppliers = latestRef.current.suppliers;
    const nextSuppliers = curSuppliers.filter(s => s.toLowerCase() !== trimmed.toLowerCase());
    if (nextSuppliers.length === curSuppliers.length) {
      throw new Error('Supplier not found.');
    }
    const auditEntry = buildAuditEntry('SUPPLIER_DELETED', '', trimmed);
    commitLocalState({ suppliers: nextSuppliers }, [auditEntry]);
    await syncToServer(['suppliers', 'auditLog']);
  };

  const addDropdownOption = async (type: 'EXPENSE' | 'WAGE', value: string) => {
    const trimmed = value.trim();
    if (!trimmed) throw new Error('Value is required.');
    const curOpts = latestRef.current.dropdownOptions;
    const existing = curOpts.find(o => o.type === type && o.value.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (existing.active) return;
      const nextOpts = curOpts.map(o =>
        o.optionId === existing.optionId ? { ...o, active: true, value: trimmed } : o
      );
      const auditEntry = buildAuditEntry('DROPDOWN_OPTION_RESTORED', existing.optionId, `${type} | ${trimmed}`);
      commitLocalState({ dropdownOptions: nextOpts }, [auditEntry]);
      await syncToServer(['dropdownOptions', 'auditLog']);
      return;
    }
    const optId = nextPrefixedId('OPT', curOpts.map(o => o.optionId), 3);
    const newOpt: DropdownOption = {
      optionId: optId,
      type,
      value: trimmed,
      active: true,
      createdAt: getTodayISO()
    };
    const auditEntry = buildAuditEntry('DROPDOWN_OPTION_ADDED', optId, `${type} | ${trimmed}`);
    commitLocalState({ dropdownOptions: [...curOpts, newOpt] }, [auditEntry]);
    await syncToServer(['dropdownOptions', 'auditLog']);
  };

  const deleteDropdownOption = async (optionId: string) => {
    const curOpts = latestRef.current.dropdownOptions;
    const target = curOpts.find(o => o.optionId === optionId);
    if (!target || !target.active) return;

    const cleanName = target.value.trim().toLowerCase();
    const inUse = latestRef.current.operations.some(
      op => op.type === target.type && op.name.trim().toLowerCase() === cleanName
    );
    if (inUse) {
      throw new Error(`"${target.value}" is already used in recorded entries and cannot be deleted.`);
    }

    const nextOpts = curOpts.map(o =>
      o.optionId === optionId ? { ...o, active: false } : o
    );
    const auditEntry = buildAuditEntry('DROPDOWN_OPTION_REMOVED', optionId, `${target.type} | ${target.value}`);
    commitLocalState({ dropdownOptions: nextOpts }, [auditEntry]);
    await syncToServer(['dropdownOptions', 'auditLog']);
  };

  const createUser = async (u: { username: string; fullName: string; role: Role; password: string }) => {
    if (currentUser?.role !== 'ADMIN') throw new Error('Admin permission required.');
    const cleanU = u.username.trim().toLowerCase();
    const curUsers = latestRef.current.users;
    if (curUsers.some(x => x.username.toLowerCase() === cleanU)) {
      throw new Error('Username already exists.');
    }
    const newId = nextPrefixedId('USR', curUsers.map(x => x.userId), 6);
    const now = getNowTimestamp();
    const newUser: User = {
      userId: newId,
      username: cleanU,
      fullName: u.fullName.trim(),
      role: u.role,
      counter: u.role === 'NORMAL' || u.role === 'AC' ? u.role : undefined,
      active: true,
      mustChange: true,
      createdAt: now,
      updatedAt: now,
      password: u.password
    };
    const auditEntry = buildAuditEntry('USER_CREATED', newId, `${cleanU} (${u.role})`);
    commitLocalState({ users: [...curUsers, newUser] }, [auditEntry]);
    await syncToServer(['users', 'auditLog']);
  };

  const resetUserPassword = async (userId: string, newPw: string) => {
    if (currentUser?.role !== 'ADMIN') throw new Error('Admin permission required.');
    const now = getNowTimestamp();
    const nextUsers = latestRef.current.users.map(u =>
      u.userId === userId ? { ...u, password: newPw, mustChange: true, updatedAt: now } : u
    );
    const auditEntry = buildAuditEntry('PASSWORD_RESET', userId, 'Admin reset user password');
    commitLocalState({ users: nextUsers }, [auditEntry]);
    await syncToServer(['users', 'auditLog']);
  };

  const toggleUserActive = async (userId: string, active: boolean) => {
    if (currentUser?.role !== 'ADMIN') throw new Error('Admin permission required.');
    if (userId === currentUser.userId && !active) {
      throw new Error('You cannot deactivate your own account.');
    }
    const now = getNowTimestamp();
    const nextUsers = latestRef.current.users.map(u =>
      u.userId === userId ? { ...u, active, updatedAt: now } : u
    );
    const auditEntry = buildAuditEntry(active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', userId, '');
    commitLocalState({ users: nextUsers }, [auditEntry]);
    await syncToServer(['users', 'auditLog']);
  };

  const reconcileStock = () => {
    const issues: any[] = [];
    latestRef.current.products.forEach(p => {
      const s = latestRef.current.stock[p.productId] || { godown: 0, normal: 0, ac: 0 };
      (['GODOWN', 'NORMAL', 'AC'] as StockLocation[]).forEach(loc => {
        const key = loc.toLowerCase() as 'godown' | 'normal' | 'ac';
        const sheetQty = s[key];
        const ledgerDeltas = latestRef.current.ledger
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
      checked: latestRef.current.products.length * 3,
      issues
    };
  };

  const syncLedger = async () => {
    const today = businessDate || getTodayISO();
    const curState = latestRef.current;
    const nextSeq = curState.ledger.reduce((m, l) => Math.max(m, l.seq || 0), 0) + 1;
    const existingLedgerIds = curState.ledger.map(l => l.ledgerId);
    const newEntries: StockLedgerEntry[] = [];

    curState.products.forEach((p, idx) => {
      const s = curState.stock[p.productId] || { godown: 0, normal: 0, ac: 0 };
      (['GODOWN', 'NORMAL', 'AC'] as StockLocation[]).forEach((loc, lIdx) => {
        const key = loc.toLowerCase() as 'godown' | 'normal' | 'ac';
        const q = s[key];
        const led = curState.ledger
          .filter(l => l.productId === p.productId && l.location === loc)
          .reduce((sum, l) => sum + l.delta, 0);
        const diff = q - led;

        if (diff !== 0) {
          const entry: StockLedgerEntry = {
            seq: nextSeq + (idx * 3) + lIdx,
            ledgerId: `${nextPrefixedId('LED', existingLedgerIds, 6, newEntries.length)}-${uniqueSuffix()}`,
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
          };
          newEntries.push(entry);
        }
      });
    });

    if (newEntries.length > 0) {
      const auditEntry = buildAuditEntry('LEDGER_SYNC', 'OPENING-SYNC', `Synced ${newEntries.length} lines from physical stock`);
      commitLocalState({ ledger: [...newEntries, ...curState.ledger] }, [auditEntry]);
      await syncToServer(['ledger', 'auditLog']);
    }

    return newEntries.length;
  };

  const resetToSampleData = async () => {
    if (currentUser?.role !== 'ADMIN') throw new Error('Admin permission required.');
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY + '_opening_epoch', OPENING_EPOCH);
    localStorage.setItem(STORAGE_KEY + '_catalog_version', CATALOG_VERSION);
    localStorage.setItem('mm_business_date', getTodayISO());
    setBusinessDateState(getTodayISO());

    const freshStock = buildInitialStockMap();
    commitLocalState({
      users: INITIAL_USERS,
      products: INITIAL_PRODUCTS,
      stock: freshStock,
      suppliers: INITIAL_SUPPLIERS,
      dropdownOptions: INITIAL_DROPDOWN_OPTIONS,
      purchases: [],
      requests: [],
      transfers: [],
      dailySales: [],
      operations: [],
      ledger: [],
      auditLog: []
    });
    setCurrentUser(INITIAL_USERS[0]);
    localStorage.setItem('mm_user', JSON.stringify(INITIAL_USERS[0]));

    await syncToServer(
      ['users', 'products', 'stock', 'suppliers', 'dropdownOptions', 'purchases', 'requests', 'transfers', 'dailySales', 'operations', 'ledger', 'auditLog'],
      undefined,
      true
    );
  };

  const activeCloudEmail = (verifiedEmailRef.current || firebaseUser?.email || '').trim().toLowerCase();
  const isCloudAdmin = Boolean(
    activeCloudEmail &&
      (isBootstrappedAdminEmail(activeCloudEmail) ||
        cloudMembers.some((m) => m.email.toLowerCase() === activeCloudEmail && m.role === 'ADMIN'))
  );

  const authorizeCloudEmail = async (rawEmail: string, label: string, role: 'ADMIN' | 'STAFF') => {
    if (currentUser?.role !== 'ADMIN') throw new Error('Shop Admin permission required.');
    const fbUser = firebaseUserRef.current;
    const callerEmail = (verifiedEmailRef.current || fbUser?.email || '').trim().toLowerCase();
    if (!fbUser || !callerEmail) throw new Error('Sign in with Google first.');
    if (!isCloudAdmin) {
      throw new Error('Only the Primary Owner or an approved Cloud Admin can authorize staff Google emails.');
    }
    const nextMembers = await authorizeCloudEmailInFirestore(
      db,
      callerEmail,
      rawEmail,
      label,
      role,
      activeMemberEmailsRef.current
    );
    activeMemberEmailsRef.current = nextMembers;
    const refreshed = await fetchCloudMembersList(db, callerEmail, nextMembers);
    setCloudMembers(refreshed);
    const cleanEmail = rawEmail.trim().toLowerCase();
    await writeAuditAsync(buildAuditEntry('CLOUD_MEMBER_ADDED', cleanEmail, `${cleanEmail} (${role})`));
  };

  const revokeCloudEmail = async (memberId: string, rawEmail: string) => {
    if (currentUser?.role !== 'ADMIN') throw new Error('Shop Admin permission required.');
    const fbUser = firebaseUserRef.current;
    const callerEmail = (verifiedEmailRef.current || fbUser?.email || '').trim().toLowerCase();
    if (!fbUser || !callerEmail) throw new Error('Sign in with Google first.');
    if (!isCloudAdmin) {
      throw new Error('Only the Primary Owner or an approved Cloud Admin can remove staff Google emails.');
    }
    const nextMembers = await revokeCloudEmailInFirestore(
      db,
      memberId,
      rawEmail,
      activeMemberEmailsRef.current
    );
    activeMemberEmailsRef.current = nextMembers;
    const refreshed = await fetchCloudMembersList(db, callerEmail, nextMembers);
    setCloudMembers(refreshed);
    const cleanEmail = rawEmail.trim().toLowerCase();
    await writeAuditAsync(buildAuditEntry('CLOUD_MEMBER_REMOVED', cleanEmail, `Removed ${cleanEmail}`));
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
        deletePurchaseBatch,

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
        deleteDailyOperation,
        reviewDailyOperation,

        addSupplier,
        deleteSupplier,
        addDropdownOption,
        deleteDropdownOption,
        createUser,
        resetUserPassword,
        toggleUserActive,
        reconcileStock,
        syncLedger,
        resetToSampleData,

        firebaseUser,
        isFirebaseAuthReady,
        cloudAccessStatus,
        cloudError,
        verificationDetails,
        cloudMembers,
        isCloudAdmin,
        authorizeCloudEmail,
        revokeCloudEmail,
        signInWithGoogle,
        signOutGoogle,
        sendVerificationEmailToUser,
        refreshVerificationStatus,
        resetAndReverifyGoogleAccount,
        retryCloudConnection,
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
