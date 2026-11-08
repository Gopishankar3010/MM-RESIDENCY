import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User, Product, StockItem, PurchaseBatch, StockRequestItem, StockTransfer,
  DailySalesReport, DailyOperation, StockLedgerEntry, AuditLogEntry, DropdownOption,
  CounterLocation, StockLocation, Role, RequestGroup
} from '../types';
import {
  INITIAL_USERS, INITIAL_PRODUCTS, INITIAL_STOCK, INITIAL_SUPPLIERS,
  INITIAL_DROPDOWN_OPTIONS, bottlesPerCase_
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

  // Actions
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchUser: (username: string) => void;
  setBusinessDate: (date: string) => void;
  toggleTheme: () => void;
  changePassword: (oldPw: string, newPw: string) => Promise<void>;

  // Products
  saveProduct: (p: Partial<Product> & { name: string; category: string; sizeML: number; casePack: number; sellingPrice: number }) => Promise<string>;

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
    recordedAmount: number; cashierName: string; helperName: string;
    paymentExplanation?: string; lines: { productId: string; closing: number }[];
  }) => Promise<string>;
  adminCreateHistoricalReport: (data: {
    date: string; counter: CounterLocation; recordedAmount: number; reason: string;
    lines: { productId: string; sold: number }[];
  }) => Promise<string>;
  adminEditReport: (reportId: string, data: { recordedAmount: number; reason: string; lines: { productId: string; closing?: number; sold?: number }[] }) => Promise<void>;
  reviewDailySales: (reportId: string, decision: 'APPROVE' | 'REJECT', remark?: string) => Promise<void>;

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
    return raw ? JSON.parse(raw) : INITIAL_PRODUCTS;
  });

  const [stock, setStock] = useState<Record<string, { godown: number; normal: number; ac: number }>>(() => {
    const raw = localStorage.getItem(STORAGE_KEY + '_stock');
    return raw ? JSON.parse(raw) : INITIAL_STOCK;
  });

  const [purchases, setPurchases] = useState<PurchaseBatch[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY + '_purchases');
    if (raw) return JSON.parse(raw);
    // Seed initial historical purchase
    const today = getTodayISO();
    return [
      {
        batchId: 'PBT-000001',
        supplier: 'United Spirits Ltd (Diageo)',
        date: today,
        billDate: today,
        invoiceNo: 'INV/2026/USL-4481',
        permitNumber: 'PRM-TN-2026-9921',
        documentNumber: 'DOC-90112',
        status: 'Approved',
        lines: [
          {
            id: 'PUR-000001',
            productId: 'PRD-000010',
            productName: 'Mansion House French Bdy 750ml',
            casePack: 12,
            qty: 24,
            enteredQty: 2,
            unit: 'CASE',
            rate: 680,
            sedAmt: 240,
            discountAmt: 200,
            tcsPct: 2,
            grossAmount: 16560,
            netAmount: 16687.2
          },
          {
            id: 'PRD-000002',
            productId: 'PRD-000018',
            productName: 'Blenders Pride Whisky 750ml',
            casePack: 12,
            qty: 24,
            enteredQty: 2,
            unit: 'CASE',
            rate: 820,
            sedAmt: 300,
            discountAmt: 300,
            tcsPct: 2,
            grossAmount: 19980,
            netAmount: 20073.6
          }
        ],
        totalQty: 48,
        grossTotal: 36540,
        sedTotal: 540,
        discountTotal: 500,
        tcsTotal: 720.8,
        netTotal: 36760.8,
        createdBy: 'admin',
        createdAt: today + ' 10:15:00',
        reviewedBy: 'admin',
        reviewedAt: today + ' 10:20:00',
        remark: 'Initial godown intake approved'
      }
    ];
  });

  const [requests, setRequests] = useState<StockRequestItem[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY + '_requests');
    if (raw) return JSON.parse(raw);
    const today = getTodayISO();
    return [
      {
        requestId: 'REQ-000001',
        counter: 'NORMAL',
        productId: 'PRD-000001',
        productName: 'Kingfisher Strong Beer 650ml',
        category: 'Beer',
        sizeML: 650,
        casePack: 12,
        qty: 12,
        enteredQty: 1,
        unit: 'CASE',
        reason: 'Restock for evening counter peak',
        status: 'Approved',
        date: today,
        createdBy: 'normal',
        createdAt: today + ' 11:30:00',
        reviewedBy: 'admin',
        reviewedAt: today + ' 11:45:00',
        remark: 'Approved by admin'
      }
    ];
  });

  const [transfers, setTransfers] = useState<StockTransfer[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY + '_transfers');
    if (raw) return JSON.parse(raw);
    const today = getTodayISO();
    return [
      {
        transferId: 'TRF-000001',
        type: 'COUNTER_TO_COUNTER',
        fromLoc: 'NORMAL',
        toLoc: 'AC',
        productId: 'PRD-000004',
        productName: 'Budweiser Magnum Beer 650ml',
        casePack: 12,
        qty: 6,
        enteredQty: 6,
        unit: 'BOTTLE',
        note: 'AC counter guest request',
        status: 'Approved',
        createdBy: 'normal',
        createdAt: today + ' 12:00:00',
        reviewedBy: 'AUTO',
        reviewedAt: today + ' 12:00:00',
        remark: 'Auto-approved (counter to counter)'
      }
    ];
  });

  const [dailySales, setDailySales] = useState<DailySalesReport[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY + '_daily_sales');
    if (raw) return JSON.parse(raw);
    const today = getTodayISO();
    // Seed approved report for demonstration
    return [
      {
        reportId: 'RPT-000001',
        date: today,
        counter: 'NORMAL',
        status: 'Approved',
        totalSoldQty: 28,
        totalSalesValue: 12640,
        recordedAmount: 12640,
        cashAmount: 8200,
        upiAmount: 4440,
        cardAmount: 0,
        cashierName: 'Murugan',
        helperName: 'Senthil',
        paymentDifference: 0,
        cutoffSeq: 2,
        submittedBy: 'normal',
        submittedAt: today + ' 23:10:00',
        reviewedBy: 'admin',
        reviewedAt: today + ' 23:25:00',
        remark: 'Verified and approved',
        lines: [
          {
            lineId: 'SLN-000001',
            reportId: 'RPT-000001',
            productId: 'PRD-000001',
            name: 'Kingfisher Strong Beer 650ml',
            opening: 36,
            godownIn: 12,
            transferIn: 0,
            transferOut: 0,
            damageOut: 0,
            inQty: 12,
            outQty: 0,
            available: 48,
            closing: 34,
            sold: 14,
            price: 190,
            value: 2660
          },
          {
            lineId: 'SLN-000002',
            reportId: 'RPT-000001',
            productId: 'PRD-000010',
            name: 'Mansion House French Bdy 750ml',
            opening: 22,
            godownIn: 0,
            transferIn: 0,
            transferOut: 0,
            damageOut: 0,
            inQty: 0,
            outQty: 0,
            available: 22,
            closing: 16,
            sold: 6,
            price: 940,
            value: 5640
          },
          {
            lineId: 'SLN-000003',
            reportId: 'RPT-000001',
            productId: 'PRD-000011',
            name: 'Mansion House French Bdy 90ml',
            opening: 96,
            godownIn: 0,
            transferIn: 0,
            transferOut: 0,
            damageOut: 0,
            inQty: 0,
            outQty: 0,
            available: 96,
            closing: 88,
            sold: 8,
            price: 130,
            value: 1040
          },
          {
            lineId: 'SLN-000004',
            reportId: 'RPT-000001',
            productId: 'PRD-000017',
            name: 'Royal Stag Double Dark 750ml',
            opening: 18,
            godownIn: 0,
            transferIn: 0,
            transferOut: 0,
            damageOut: 0,
            inQty: 0,
            outQty: 0,
            available: 18,
            closing: 14,
            sold: 4,
            price: 860,
            value: 3440
          }
        ]
      }
    ];
  });

  const [operations, setOperations] = useState<DailyOperation[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY + '_operations');
    if (raw) return JSON.parse(raw);
    const today = getTodayISO();
    return [
      {
        operationId: 'OPR-000001',
        type: 'ROOM',
        date: today,
        name: 'Room 3 - Mr. Anand',
        amount: 1800,
        payment: 'UPI',
        roomNo: 3,
        status: 'Approved',
        createdBy: 'admin',
        createdAt: today + ' 14:00:00',
        reviewedBy: 'SELF',
        reviewedAt: today + ' 14:00:00'
      },
      {
        operationId: 'OPR-000002',
        type: 'EXPENSE',
        date: today,
        name: 'Ice Blocks & Cubes',
        amount: 350,
        status: 'Approved',
        createdBy: 'normal',
        createdAt: today + ' 15:30:00',
        reviewedBy: 'SELF',
        reviewedAt: today + ' 15:30:00',
        reason: '2 ice blocks for bar coolers'
      },
      {
        operationId: 'OPR-000003',
        type: 'WAGE',
        date: today,
        name: 'Sundar (Night Security)',
        amount: 600,
        status: 'Approved',
        createdBy: 'admin',
        createdAt: today + ' 18:00:00',
        reviewedBy: 'SELF',
        reviewedAt: today + ' 18:00:00',
        reason: 'Daily night shift wage'
      }
    ];
  });

  const [ledger, setLedger] = useState<StockLedgerEntry[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY + '_ledger');
    if (raw) return JSON.parse(raw);
    const today = getTodayISO();
    return [
      {
        seq: 1,
        ledgerId: 'LED-000001',
        timestamp: today + ' 08:00:00',
        location: 'GODOWN',
        productId: 'PRD-000001',
        productName: 'Kingfisher Strong Beer 650ml',
        delta: 144,
        balanceAfter: 144,
        refType: 'OPENING',
        refId: 'OPENING-SYNC',
        approvedBy: 'setup',
        businessDate: today
      }
    ];
  });

  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY + '_audit');
    if (raw) return JSON.parse(raw);
    const today = getTodayISO();
    return [
      {
        auditId: 'AUD-000001',
        timestamp: today + ' 08:00:00',
        userId: 'SETUP',
        username: 'setup',
        role: 'SYSTEM',
        action: 'SYSTEM_INITIALIZED',
        refId: 'INIT',
        details: 'MM Residency Stock Management system loaded'
      }
    ];
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
      .reduce((sum, r) => sum + r.qty, 0);

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

  // Pending items count for admin badge
  const pendingCount =
    (currentUser?.role === 'ADMIN'
      ? (purchases.filter(p => p.status === 'Pending').length +
         requests.filter(r => r.status === 'Pending').length +
         transfers.filter(t => t.status === 'Pending').length +
         dailySales.filter(s => s.status === 'Pending').length +
         operations.filter(o => o.status === 'Pending').length)
      : (requests.filter(r => r.status === 'Pending' && r.counter === currentUser?.counter).length +
         transfers.filter(t => t.status === 'Pending' && (t.fromLoc === currentUser?.counter || t.toLoc === currentUser?.counter)).length +
         dailySales.filter(s => s.status === 'Pending' && s.counter === currentUser?.counter).length));

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
  const saveProduct = async (p: Partial<Product> & { name: string; category: string; sizeML: number; casePack: number; sellingPrice: number }) => {
    if (currentUser?.role !== 'ADMIN') throw new Error('Admin permission required.');
    const pack = bottlesPerCase_({ name: p.name, sizeML: p.sizeML, casePack: p.casePack });

    if (p.productId) {
      setProducts(prev => prev.map(prod => prod.productId === p.productId ? {
        ...prod,
        name: p.name.trim(),
        category: p.category.trim(),
        sizeML: Number(p.sizeML),
        casePack: pack,
        sellingPrice: Number(p.sellingPrice),
        active: p.active !== undefined ? p.active : prod.active,
        updatedAt: getNowTimestamp(),
        updatedBy: currentUser.username
      } : prod));
      addAudit('PRODUCT_UPDATED', p.productId, `${p.name} ${p.sizeML}ml (${pack}/case) ₹${p.sellingPrice}`);
      return p.productId;
    } else {
      const newId = `PRD-${String(products.length + 1).padStart(6, '0')}`;
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
      setProducts(prev => [...prev, newProduct]);
      setStock(prev => ({ ...prev, [newId]: { godown: 0, normal: 0, ac: 0 } }));
      addAudit('PRODUCT_CREATED', newId, `${p.name} ${p.sizeML}ml`);
      return newId;
    }
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

    // Opening stock comes from last approved report closing
    const lastApproved = dailySales
      .filter(r => r.counter === counter && r.status === 'Approved')
      .sort((a, b) => b.date.localeCompare(a.date))[0];

    const openingMap = new Map<string, number>();
    if (lastApproved) {
      lastApproved.lines.forEach(l => openingMap.set(l.productId, l.closing));
    }

    // Movements since last approved cutoff
    const godownInMap = new Map<string, number>();
    const transferInMap = new Map<string, number>();
    const transferOutMap = new Map<string, number>();
    const damageOutMap = new Map<string, number>();

    // Calculate approved movements for today
    ledger.filter(l => l.location === counter && l.businessDate === date).forEach(l => {
      if (l.delta > 0) {
        if (l.refType === 'REQUEST') {
          godownInMap.set(l.productId, (godownInMap.get(l.productId) || 0) + l.delta);
        } else {
          transferInMap.set(l.productId, (transferInMap.get(l.productId) || 0) + l.delta);
        }
      } else if (l.delta < 0) {
        if (l.refType === 'DAMAGE') {
          damageOutMap.set(l.productId, (damageOutMap.get(l.productId) || 0) - l.delta);
        } else if (l.refType !== 'SALE') {
          transferOutMap.set(l.productId, (transferOutMap.get(l.productId) || 0) - l.delta);
        }
      }
    });

    const lines = products.filter(p => p.active).map(p => {
      const open = openingMap.get(p.productId) || (stock[p.productId]?.[counter.toLowerCase() as 'normal' | 'ac'] || 0);
      const gIn = godownInMap.get(p.productId) || 0;
      const tIn = transferInMap.get(p.productId) || 0;
      const tOut = transferOutMap.get(p.productId) || 0;
      const dOut = damageOutMap.get(p.productId) || 0;
      const avail = Math.max(0, open + gIn + tIn - tOut - dOut);

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
    recordedAmount: number; cashierName: string; helperName: string;
    paymentExplanation?: string; lines: { productId: string; closing: number }[];
  }) => {
    if (!currentUser || (currentUser.role !== 'NORMAL' && currentUser.role !== 'AC')) {
      throw new Error('Only counter operators can submit daily sales.');
    }
    const counter = currentUser.counter || (currentUser.role as CounterLocation);
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

    const diff = Math.round((data.cashAmount + data.upiAmount + data.cardAmount - totalVal) * 100) / 100;
    if (Math.abs(diff) > 0.009 && !data.paymentExplanation?.trim()) {
      throw new Error('Payment differs from calculated sales value. An explanation is required.');
    }

    const reportId = `RPT-${String(dailySales.length + 1).padStart(6, '0')}`;
    reportLines.forEach(l => { l.reportId = reportId; });

    const newReport: DailySalesReport = {
      reportId,
      date: data.date,
      counter,
      status: 'Pending',
      totalSoldQty: totalSold,
      totalSalesValue: Math.round(totalVal * 100) / 100,
      recordedAmount: data.recordedAmount,
      cashAmount: data.cashAmount,
      upiAmount: data.upiAmount,
      cardAmount: data.cardAmount,
      cashierName: data.cashierName,
      helperName: data.helperName,
      paymentDifference: diff,
      paymentExplanation: data.paymentExplanation || '',
      cutoffSeq: (ledger[0]?.seq || 0),
      submittedBy: currentUser.username,
      submittedAt: getNowTimestamp(),
      lines: reportLines
    };

    setDailySales(prev => [newReport, ...prev]);
    addAudit('SALES_SUBMITTED', reportId, `${data.date} | ${counter} | sold ${totalSold} btls | ₹${newReport.totalSalesValue}`);
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
    setUsers(INITIAL_USERS);
    setProducts(INITIAL_PRODUCTS);
    setStock(INITIAL_STOCK);
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
    addAudit('DATABASE_RESET', 'RESET', 'Restored pristine initial dataset');
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
        resetToSampleData
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
