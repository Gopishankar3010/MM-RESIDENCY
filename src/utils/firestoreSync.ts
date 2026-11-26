import {
  collection,
  deleteDoc,
  doc,
  Firestore,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Unsubscribe,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import type { User as FirebaseAuthUser } from 'firebase/auth';
import { auth } from '../firebase';
import {
  AuditLogEntry,
  DailyOperation,
  DailySalesReport,
  DeletedDailySalesReport,
  DropdownOption,
  Product,
  PurchaseBatch,
  StockLedgerEntry,
  StockRequestItem,
  StockTransfer,
  User,
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface WorkspaceSnapshot {
  users: User[];
  products: Product[];
  stock: Record<string, { godown: number; normal: number; ac: number }>;
  purchases: PurchaseBatch[];
  requests: StockRequestItem[];
  transfers: StockTransfer[];
  dailySales: DailySalesReport[];
  deletedDailySales?: DeletedDailySalesReport[];
  operations: DailyOperation[];
  ledger: StockLedgerEntry[];
  auditLog: AuditLogEntry[];
  suppliers: string[];
  dropdownOptions: DropdownOption[];
  deletedProductIds?: string[];
}

export type KnownDocsMap = Map<string, Set<string>>;

export interface CloudMemberRecord {
  memberId: string;
  email: string;
  label: string;
  role: 'ADMIN' | 'STAFF';
  addedBy: string;
  createdAt?: any;
  updatedAt?: any;
}

export const BOOTSTRAPPED_OWNER_EMAIL = 'gopishankarsegar@ptuniv.edu.in';

export const DEFAULT_ADMIN_EMAILS = [
  BOOTSTRAPPED_OWNER_EMAIL,
  'madhumithame1008@gmail.com',
];

export function isBootstrappedAdminEmail(email: string): boolean {
  return DEFAULT_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export function makeSafeMemberId(email: string): string {
  const clean = email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return (`mbr_${clean}`).slice(0, 120);
}

export function sanitizeEmailList(emails: string[]): string[] {
  const set = new Set<string>(DEFAULT_ADMIN_EMAILS.map((e) => e.toLowerCase()));
  for (const e of emails) {
    const clean = String(e || '').trim().toLowerCase();
    if (clean && clean.length >= 5 && clean.length <= 160 && clean.includes('@')) {
      set.add(clean);
    }
    if (set.size >= 25) break;
  }
  return Array.from(set);
}

function sanitizeStr(val: unknown, maxLen: number, fallback = ''): string {
  const s = typeof val === 'string' ? val : val == null ? fallback : String(val);
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function nonEmptyStr(val: unknown, maxLen: number, fallback: string): string {
  const s = sanitizeStr(val, maxLen, fallback).trim();
  return s.length > 0 ? s : fallback;
}

function nonNegNum(val: unknown, fallback = 0): number {
  const n = Number(val);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function anyNum(val: unknown, fallback = 0): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeStoredMemberEmails(raw: unknown): string[] {
  const arr = Array.isArray(raw)
    ? raw
        .filter((e): e is string => typeof e === 'string')
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length >= 5 && e.length <= 160 && e.includes('@'))
    : [];
  const merged = Array.from(new Set([...DEFAULT_ADMIN_EMAILS.map((e) => e.toLowerCase()), ...arr])).slice(0, 25);
  return merged;
}

function normalizeMemberEmails(raw: unknown, fallbackEmail: string): string[] {
  const email = (fallbackEmail || BOOTSTRAPPED_OWNER_EMAIL).trim().toLowerCase();
  const arr = Array.isArray(raw)
    ? raw
        .filter((e): e is string => typeof e === 'string')
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length >= 5 && e.length <= 160 && e.includes('@'))
    : [];
  const merged = Array.from(new Set([...DEFAULT_ADMIN_EMAILS, email, ...arr])).slice(0, 25);
  return merged.length > 0 ? merged : [email];
}

function getCallerEmail(fbUser: FirebaseAuthUser | null): string {
  const email =
    fbUser?.email ||
    fbUser?.providerData?.find((p) => p?.email)?.email ||
    BOOTSTRAPPED_OWNER_EMAIL;
  return email.trim();
}

function isOwnerAccount(email: string): boolean {
  return isBootstrappedAdminEmail(email);
}

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

// =========================================================
// SERIALIZERS (Strict conformity to firestore.rules & blueprint)
// =========================================================

function toStaffUserDoc(u: User, memberEmails: string[], existingCreatedAt?: any) {
  const docData: Record<string, any> = {
    userId: nonEmptyStr(u.userId, 64, 'USR-000001'),
    username: nonEmptyStr(u.username, 64, 'user'),
    fullName: nonEmptyStr(u.fullName, 120, 'Staff User'),
    role: u.role === 'ADMIN' || u.role === 'AC' ? u.role : 'NORMAL',
    active: Boolean(u.active),
    mustChange: Boolean(u.mustChange),
    password: nonEmptyStr(u.password, 128, '1234'),
    createdAtStr: sanitizeStr(u.createdAt, 40, '2026-01-01 09:00:00'),
    memberEmails,
    createdAt: existingCreatedAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (u.counter === 'NORMAL' || u.counter === 'AC' || u.counter === '') {
    docData.counter = u.counter;
  }
  if (u.updatedAt) {
    docData.updatedAtStr = sanitizeStr(u.updatedAt, 40);
  }
  return docData;
}

function fromStaffUserDoc(d: Record<string, any>): User {
  return stripUndefined({
    userId: d.userId,
    username: d.username,
    fullName: d.fullName,
    role: d.role,
    counter: d.counter || undefined,
    active: Boolean(d.active),
    mustChange: Boolean(d.mustChange),
    password: d.password,
    createdAt: d.createdAtStr || '2026-01-01 09:00:00',
    updatedAt: d.updatedAtStr || undefined,
  });
}

function toProductDoc(p: Product, memberEmails: string[], existingCreatedAt?: any) {
  const docData: Record<string, any> = {
    productId: nonEmptyStr(p.productId, 64, 'PRD-000001'),
    name: nonEmptyStr(p.name, 140, 'Unnamed Product'),
    category: nonEmptyStr(p.category, 80, 'Others'),
    sizeML: nonNegNum(p.sizeML, 750),
    casePack: Math.max(1, nonNegNum(p.casePack, 12)),
    sellingPrice: nonNegNum(p.sellingPrice, 0),
    active: Boolean(p.active),
    memberEmails,
    createdAt: existingCreatedAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (p.updatedAt) docData.updatedAtStr = sanitizeStr(p.updatedAt, 40);
  if (p.updatedBy) docData.updatedBy = sanitizeStr(p.updatedBy, 80);
  return docData;
}

function fromProductDoc(d: Record<string, any>): Product {
  return stripUndefined({
    productId: d.productId,
    name: d.name,
    category: d.category,
    sizeML: Number(d.sizeML || 0),
    casePack: Number(d.casePack || 12),
    sellingPrice: Number(d.sellingPrice || 0),
    active: Boolean(d.active),
    updatedAt: d.updatedAtStr || undefined,
    updatedBy: d.updatedBy || undefined,
  });
}

function toStockDoc(
  productId: string,
  level: { godown: number; normal: number; ac: number },
  memberEmails: string[],
  existingCreatedAt?: any
) {
  return {
    productId: nonEmptyStr(productId, 64, 'PRD-000001'),
    godown: nonNegNum(level.godown, 0),
    normal: nonNegNum(level.normal, 0),
    ac: nonNegNum(level.ac, 0),
    memberEmails,
    createdAt: existingCreatedAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function toPurchaseDoc(b: PurchaseBatch, memberEmails: string[], existingCreatedAt?: any) {
  const docData: Record<string, any> = {
    batchId: nonEmptyStr(b.batchId, 64, 'PUR-000001'),
    supplier: nonEmptyStr(b.supplier, 160, 'Supplier'),
    date: nonEmptyStr(b.date, 20, '2026-01-01'),
    billDate: nonEmptyStr(b.billDate, 20, '2026-01-01'),
    invoiceNo: nonEmptyStr(b.invoiceNo, 80, 'INV'),
    status: b.status || 'Pending',
    lines: Array.isArray(b.lines) ? b.lines.slice(0, 200) : [],
    totalQty: nonNegNum(b.totalQty, 0),
    grossTotal: nonNegNum(b.grossTotal, 0),
    sedTotal: nonNegNum(b.sedTotal, 0),
    discountTotal: nonNegNum(b.discountTotal, 0),
    tcsTotal: nonNegNum(b.tcsTotal, 0),
    netTotal: nonNegNum(b.netTotal, 0),
    createdBy: nonEmptyStr(b.createdBy, 80, 'staff'),
    createdAtStr: nonEmptyStr(b.createdAt, 40, '2026-01-01 00:00:00'),
    memberEmails,
    createdAt: existingCreatedAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (b.permitNumber !== undefined) docData.permitNumber = sanitizeStr(b.permitNumber, 80);
  if (b.documentNumber !== undefined) docData.documentNumber = sanitizeStr(b.documentNumber, 80);
  if (b.reviewedBy !== undefined) docData.reviewedBy = sanitizeStr(b.reviewedBy, 80);
  if (b.reviewedAt !== undefined) docData.reviewedAtStr = sanitizeStr(b.reviewedAt, 40);
  if (b.remark !== undefined) docData.remark = sanitizeStr(b.remark, 300);
  return docData;
}

function fromPurchaseDoc(d: Record<string, any>): PurchaseBatch {
  return stripUndefined({
    batchId: d.batchId,
    supplier: d.supplier,
    date: d.date,
    billDate: d.billDate,
    invoiceNo: d.invoiceNo,
    permitNumber: d.permitNumber,
    documentNumber: d.documentNumber,
    status: d.status,
    lines: Array.isArray(d.lines) ? d.lines : [],
    totalQty: Number(d.totalQty || 0),
    grossTotal: Number(d.grossTotal || 0),
    sedTotal: Number(d.sedTotal || 0),
    discountTotal: Number(d.discountTotal || 0),
    tcsTotal: Number(d.tcsTotal || 0),
    netTotal: Number(d.netTotal || 0),
    createdBy: d.createdBy,
    createdAt: d.createdAtStr || '',
    reviewedBy: d.reviewedBy,
    reviewedAt: d.reviewedAtStr,
    remark: d.remark,
  });
}

function toRequestDoc(r: StockRequestItem, memberEmails: string[], existingCreatedAt?: any) {
  const docData: Record<string, any> = {
    requestId: nonEmptyStr(r.requestId, 64, 'REQ-000001'),
    counter: r.counter === 'AC' ? 'AC' : 'NORMAL',
    productId: nonEmptyStr(r.productId, 64, 'PRD-000001'),
    productName: nonEmptyStr(r.productName, 160, 'Product'),
    category: nonEmptyStr(r.category, 80, 'Others'),
    sizeML: nonNegNum(r.sizeML, 750),
    casePack: Math.max(1, nonNegNum(r.casePack, 12)),
    qty: nonNegNum(r.qty, 0),
    enteredQty: nonNegNum(r.enteredQty, 0),
    unit: r.unit === 'CASE' || r.unit === 'MIXED' ? r.unit : 'BOTTLE',
    reason: sanitizeStr(r.reason, 240, ''),
    status: r.status || 'Pending',
    date: nonEmptyStr(r.date, 20, '2026-01-01'),
    createdBy: nonEmptyStr(r.createdBy, 80, 'staff'),
    createdAtStr: nonEmptyStr(r.createdAt, 40, '2026-01-01 00:00:00'),
    memberEmails,
    createdAt: existingCreatedAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (r.reviewedBy !== undefined) docData.reviewedBy = sanitizeStr(r.reviewedBy, 80);
  if (r.reviewedAt !== undefined) docData.reviewedAtStr = sanitizeStr(r.reviewedAt, 40);
  if (r.remark !== undefined) docData.remark = sanitizeStr(r.remark, 300);
  if (r.reversedBy !== undefined) docData.reversedBy = sanitizeStr(r.reversedBy, 80);
  if (r.reversedAt !== undefined) docData.reversedAtStr = sanitizeStr(r.reversedAt, 40);
  return docData;
}

function fromRequestDoc(d: Record<string, any>): StockRequestItem {
  return stripUndefined({
    requestId: d.requestId,
    counter: d.counter,
    productId: d.productId,
    productName: d.productName,
    category: d.category,
    sizeML: Number(d.sizeML || 0),
    casePack: Number(d.casePack || 12),
    qty: Number(d.qty || 0),
    enteredQty: Number(d.enteredQty || 0),
    unit: d.unit,
    reason: d.reason || '',
    status: d.status,
    date: d.date,
    createdBy: d.createdBy,
    createdAt: d.createdAtStr || '',
    reviewedBy: d.reviewedBy,
    reviewedAt: d.reviewedAtStr,
    remark: d.remark,
    reversedBy: d.reversedBy,
    reversedAt: d.reversedAtStr,
  });
}

function toTransferDoc(t: StockTransfer, memberEmails: string[], existingCreatedAt?: any) {
  const docData: Record<string, any> = {
    transferId: nonEmptyStr(t.transferId, 64, 'TRF-000001'),
    type:
      t.type === 'COUNTER_TO_COUNTER' || t.type === 'COUNTER_TO_GODOWN'
        ? t.type
        : 'GODOWN_TO_COUNTER',
    fromLoc: t.fromLoc,
    toLoc: t.toLoc,
    productId: nonEmptyStr(t.productId, 64, 'PRD-000001'),
    productName: nonEmptyStr(t.productName, 160, 'Product'),
    casePack: Math.max(1, nonNegNum(t.casePack, 12)),
    qty: nonNegNum(t.qty, 0),
    status: t.status || 'Pending',
    createdBy: nonEmptyStr(t.createdBy, 80, 'staff'),
    createdAtStr: nonEmptyStr(t.createdAt, 40, '2026-01-01 00:00:00'),
    memberEmails,
    createdAt: existingCreatedAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (t.enteredQty !== undefined) docData.enteredQty = nonNegNum(t.enteredQty, 0);
  if (t.unit === 'CASE' || t.unit === 'BOTTLE') docData.unit = t.unit;
  if (t.note !== undefined) docData.note = sanitizeStr(t.note, 240);
  if (t.reviewedBy !== undefined) docData.reviewedBy = sanitizeStr(t.reviewedBy, 80);
  if (t.reviewedAt !== undefined) docData.reviewedAtStr = sanitizeStr(t.reviewedAt, 40);
  if (t.remark !== undefined) docData.remark = sanitizeStr(t.remark, 300);
  return docData;
}

function fromTransferDoc(d: Record<string, any>): StockTransfer {
  return stripUndefined({
    transferId: d.transferId,
    type: d.type,
    fromLoc: d.fromLoc,
    toLoc: d.toLoc,
    productId: d.productId,
    productName: d.productName,
    casePack: Number(d.casePack || 12),
    qty: Number(d.qty || 0),
    enteredQty: d.enteredQty !== undefined ? Number(d.enteredQty) : undefined,
    unit: d.unit,
    note: d.note,
    status: d.status,
    createdBy: d.createdBy,
    createdAt: d.createdAtStr || '',
    reviewedBy: d.reviewedBy,
    reviewedAt: d.reviewedAtStr,
    remark: d.remark,
  });
}

function toDailySalesDoc(r: DailySalesReport, memberEmails: string[], existingCreatedAt?: any) {
  const docData: Record<string, any> = {
    reportId: nonEmptyStr(r.reportId, 64, 'RPT-000001'),
    date: nonEmptyStr(r.date, 20, '2026-01-01'),
    counter: r.counter === 'AC' ? 'AC' : 'NORMAL',
    status: r.status || 'Approved',
    totalSoldQty: nonNegNum(r.totalSoldQty, 0),
    totalSalesValue: nonNegNum(r.totalSalesValue, 0),
    recordedAmount: anyNum(r.recordedAmount, 0),
    cashAmount: nonNegNum(r.cashAmount, 0),
    upiAmount: nonNegNum(r.upiAmount, 0),
    cardAmount: nonNegNum(r.cardAmount, 0),
    cashierName: sanitizeStr(r.cashierName, 100, ''),
    helperName: sanitizeStr(r.helperName, 100, ''),
    paymentDifference: anyNum(r.paymentDifference, 0),
    cutoffSeq: anyNum(r.cutoffSeq, 0),
    submittedBy: nonEmptyStr(r.submittedBy, 80, 'staff'),
    submittedAtStr: nonEmptyStr(r.submittedAt, 40, '2026-01-01 00:00:00'),
    lines: Array.isArray(r.lines) ? r.lines.slice(0, 300) : [],
    memberEmails,
    createdAt: existingCreatedAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (r.acCharges !== undefined) docData.acCharges = anyNum(r.acCharges, 0);
  if (r.paymentExplanation !== undefined) docData.paymentExplanation = sanitizeStr(r.paymentExplanation, 300);
  if (r.reviewedBy !== undefined) docData.reviewedBy = sanitizeStr(r.reviewedBy, 80);
  if (r.reviewedAt !== undefined) docData.reviewedAtStr = sanitizeStr(r.reviewedAt, 40);
  if (r.remark !== undefined) docData.remark = sanitizeStr(r.remark, 300);
  if (r.editedBy !== undefined) docData.editedBy = sanitizeStr(r.editedBy, 80);
  if (r.editedAt !== undefined) docData.editedAtStr = sanitizeStr(r.editedAt, 40);
  return docData;
}

function fromDailySalesDoc(d: Record<string, any>): DailySalesReport {
  return stripUndefined({
    reportId: d.reportId,
    date: d.date,
    counter: d.counter,
    status: d.status,
    totalSoldQty: Number(d.totalSoldQty || 0),
    totalSalesValue: Number(d.totalSalesValue || 0),
    recordedAmount: Number(d.recordedAmount || 0),
    cashAmount: Number(d.cashAmount || 0),
    upiAmount: Number(d.upiAmount || 0),
    cardAmount: Number(d.cardAmount || 0),
    acCharges: d.acCharges !== undefined ? Number(d.acCharges) : undefined,
    cashierName: d.cashierName || '',
    helperName: d.helperName || '',
    paymentDifference: Number(d.paymentDifference || 0),
    paymentExplanation: d.paymentExplanation,
    cutoffSeq: Number(d.cutoffSeq || 0),
    submittedBy: d.submittedBy,
    submittedAt: d.submittedAtStr || '',
    reviewedBy: d.reviewedBy,
    reviewedAt: d.reviewedAtStr,
    remark: d.remark,
    editedBy: d.editedBy,
    editedAt: d.editedAtStr,
    lines: Array.isArray(d.lines) ? d.lines : [],
  });
}

function toDeletedDailySalesDoc(r: DeletedDailySalesReport, memberEmails: string[], existingCreatedAt?: any) {
  const docData = toDailySalesDoc(r, memberEmails, existingCreatedAt);
  docData.deletedBy = nonEmptyStr(r.deletedBy, 80, 'admin');
  docData.deletedAtStr = nonEmptyStr(r.deletedAt, 40, '2026-01-01 00:00:00');
  docData.stockReversed = Boolean(r.stockReversed);
  if (r.deleteReason !== undefined && r.deleteReason !== '') {
    docData.deleteReason = sanitizeStr(r.deleteReason, 300);
  }
  return docData;
}

function fromDeletedDailySalesDoc(d: Record<string, any>): DeletedDailySalesReport {
  return stripUndefined({
    ...fromDailySalesDoc(d),
    deletedBy: d.deletedBy || 'admin',
    deletedAt: d.deletedAtStr || '',
    deleteReason: d.deleteReason,
    stockReversed: Boolean(d.stockReversed),
  });
}

function toOperationDoc(op: DailyOperation, memberEmails: string[], existingCreatedAt?: any) {
  const docData: Record<string, any> = {
    operationId: nonEmptyStr(op.operationId, 64, 'OPR-000001'),
    type: op.type,
    date: nonEmptyStr(op.date, 20, '2026-01-01'),
    name: nonEmptyStr(op.name, 160, 'Entry'),
    amount: anyNum(op.amount, 0),
    status: op.status || 'Pending',
    createdBy: nonEmptyStr(op.createdBy, 80, 'staff'),
    createdAtStr: nonEmptyStr(op.createdAt, 40, '2026-01-01 00:00:00'),
    memberEmails,
    createdAt: existingCreatedAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (op.payment === 'Cash' || op.payment === 'UPI' || op.payment === 'Card') {
    docData.payment = op.payment;
  }
  if (op.roomNo !== undefined) docData.roomNo = anyNum(op.roomNo, 0);
  if (op.location === 'GODOWN' || op.location === 'NORMAL' || op.location === 'AC') {
    docData.location = op.location;
  }
  if (op.productId !== undefined) docData.productId = sanitizeStr(op.productId, 64);
  if (op.productName !== undefined) docData.productName = sanitizeStr(op.productName, 160);
  if (op.qty !== undefined) docData.qty = anyNum(op.qty, 0);
  if (op.reason !== undefined) docData.reason = sanitizeStr(op.reason, 240);
  if (op.reviewedBy !== undefined) docData.reviewedBy = sanitizeStr(op.reviewedBy, 80);
  if (op.reviewedAt !== undefined) docData.reviewedAtStr = sanitizeStr(op.reviewedAt, 40);
  if (op.reviewRemark !== undefined) docData.reviewRemark = sanitizeStr(op.reviewRemark, 300);
  return docData;
}

function fromOperationDoc(d: Record<string, any>): DailyOperation {
  return stripUndefined({
    operationId: d.operationId,
    type: d.type,
    date: d.date,
    name: d.name,
    amount: Number(d.amount || 0),
    payment: d.payment || undefined,
    roomNo: d.roomNo !== undefined ? Number(d.roomNo) : undefined,
    location: d.location || undefined,
    productId: d.productId,
    productName: d.productName,
    qty: d.qty !== undefined ? Number(d.qty) : undefined,
    reason: d.reason,
    status: d.status,
    createdBy: d.createdBy,
    createdAt: d.createdAtStr || '',
    reviewedBy: d.reviewedBy,
    reviewedAt: d.reviewedAtStr,
    reviewRemark: d.reviewRemark,
  });
}

function toLedgerDoc(l: StockLedgerEntry, memberEmails: string[], existingCreatedAt?: any) {
  const docData: Record<string, any> = {
    seq: anyNum(l.seq, 0),
    ledgerId: nonEmptyStr(l.ledgerId, 64, 'LED-000001'),
    timestampStr: nonEmptyStr(l.timestamp, 40, '2026-01-01 00:00:00'),
    location: l.location,
    productId: nonEmptyStr(l.productId, 64, 'PRD-000001'),
    delta: anyNum(l.delta, 0),
    balanceAfter: nonNegNum(l.balanceAfter, 0),
    refType: l.refType,
    refId: nonEmptyStr(l.refId, 80, 'REF'),
    approvedBy: nonEmptyStr(l.approvedBy, 80, 'admin'),
    businessDate: nonEmptyStr(l.businessDate, 20, '2026-01-01'),
    memberEmails,
    createdAt: existingCreatedAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (l.productName !== undefined) docData.productName = sanitizeStr(l.productName, 160);
  return docData;
}

function fromLedgerDoc(d: Record<string, any>): StockLedgerEntry {
  return stripUndefined({
    seq: Number(d.seq || 0),
    ledgerId: d.ledgerId,
    timestamp: d.timestampStr || '',
    location: d.location,
    productId: d.productId,
    productName: d.productName,
    delta: Number(d.delta || 0),
    balanceAfter: Number(d.balanceAfter || 0),
    refType: d.refType,
    refId: d.refId,
    approvedBy: d.approvedBy,
    businessDate: d.businessDate,
  });
}

function toAuditDoc(a: AuditLogEntry, memberEmails: string[], existingCreatedAt?: any) {
  return {
    auditId: nonEmptyStr(a.auditId, 64, 'AUD-000001'),
    timestampStr: nonEmptyStr(a.timestamp, 40, '2026-01-01 00:00:00'),
    userId: sanitizeStr(a.userId, 64, ''),
    username: nonEmptyStr(a.username, 80, 'system'),
    role: nonEmptyStr(a.role, 32, 'SYSTEM'),
    action: nonEmptyStr(a.action, 80, 'ACTION'),
    refId: sanitizeStr(a.refId, 80, ''),
    details: sanitizeStr(a.details, 500, ''),
    memberEmails,
    createdAt: existingCreatedAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function fromAuditDoc(d: Record<string, any>): AuditLogEntry {
  return {
    auditId: d.auditId,
    timestamp: d.timestampStr || '',
    userId: d.userId || '',
    username: d.username,
    role: d.role,
    action: d.action,
    refId: d.refId || '',
    details: d.details || '',
  };
}

function toDropdownDoc(o: DropdownOption, memberEmails: string[], existingCreatedAt?: any) {
  return {
    optionId: nonEmptyStr(o.optionId, 64, 'OPT-001'),
    type: o.type === 'WAGE' ? 'WAGE' : 'EXPENSE',
    value: nonEmptyStr(o.value, 140, 'Option'),
    active: Boolean(o.active),
    createdAtStr: sanitizeStr(o.createdAt, 40, '2026-01-01'),
    memberEmails,
    createdAt: existingCreatedAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function fromDropdownDoc(d: Record<string, any>): DropdownOption {
  return {
    optionId: d.optionId,
    type: d.type,
    value: d.value,
    active: Boolean(d.active),
    createdAt: d.createdAtStr || '2026-01-01',
  };
}

// =========================================================
// BOOTSTRAP & BATCHED SEEDING
// =========================================================

async function commitOperationsInChunks(
  db: Firestore,
  ops: Array<{ type: 'set' | 'update' | 'delete'; path: string; id: string; data?: Record<string, any> }>
): Promise<void> {
  const CHUNK_SIZE = 200;
  for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
    const chunk = ops.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const op of chunk) {
      const ref = doc(db, op.path, op.id);
      if (op.type === 'delete') {
        batch.delete(ref);
      } else if (op.type === 'update' && op.data) {
        batch.update(ref, op.data);
      } else if (op.data) {
        batch.set(ref, op.data);
      }
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, chunk[0]?.path || 'workspace');
    }
  }
}

async function ensureDefaultCloudMembers(db: Firestore, addedByEmail: string): Promise<void> {
  for (const adminEmail of DEFAULT_ADMIN_EMAILS) {
    const memberId = makeSafeMemberId(adminEmail);
    const ref = doc(db, 'cloud_members', memberId);
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          memberId,
          email: adminEmail.toLowerCase(),
          label: adminEmail.toLowerCase() === BOOTSTRAPPED_OWNER_EMAIL.toLowerCase() ? 'Primary Owner' : 'Cloud Admin',
          role: 'ADMIN',
          addedBy: sanitizeStr(addedByEmail, 160, BOOTSTRAPPED_OWNER_EMAIL),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch {
      // Non-fatal if already exists or concurrent write
    }
  }
}

export async function fetchCloudMembersList(
  db: Firestore,
  callerEmail: string,
  memberEmails: string[]
): Promise<CloudMemberRecord[]> {
  const callerLower = callerEmail.trim().toLowerCase();
  if (isBootstrappedAdminEmail(callerLower)) {
    try {
      const snap = await getDocs(collection(db, 'cloud_members'));
      const list = snap.docs
        .map((d) => d.data() as CloudMemberRecord)
        .sort((a, b) => a.email.localeCompare(b.email));
      if (list.length > 0) return list;
    } catch {
      // Fall back to per-member getDoc reads below
    }
  }

  const emails = sanitizeEmailList(memberEmails);
  const results = await Promise.all(
    emails.map(async (em) => {
      const memberId = makeSafeMemberId(em);
      try {
        const snap = await getDoc(doc(db, 'cloud_members', memberId));
        if (snap.exists()) {
          return snap.data() as CloudMemberRecord;
        }
      } catch {
        // Non-admin staff can only read their own cloud_members doc
      }
      if (em === callerLower || isBootstrappedAdminEmail(em)) {
        return {
          memberId,
          email: em,
          label: em === BOOTSTRAPPED_OWNER_EMAIL.toLowerCase() ? 'Primary Owner' : isBootstrappedAdminEmail(em) ? 'Cloud Admin' : 'Authorized Staff',
          role: isBootstrappedAdminEmail(em) ? 'ADMIN' : 'STAFF',
          addedBy: BOOTSTRAPPED_OWNER_EMAIL,
        } as CloudMemberRecord;
      }
      return null;
    })
  );

  return results
    .filter((item): item is CloudMemberRecord => Boolean(item))
    .sort((a, b) => a.email.localeCompare(b.email));
}

export async function authorizeCloudEmailInFirestore(
  db: Firestore,
  callerEmail: string,
  rawEmail: string,
  label: string,
  role: 'ADMIN' | 'STAFF',
  currentMemberEmails: string[]
): Promise<string[]> {
  const cleanEmail = rawEmail.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@') || cleanEmail.length < 5 || cleanEmail.length > 160) {
    throw new Error('Enter a valid Google email address.');
  }

  const existingNormalized = sanitizeEmailList(currentMemberEmails);
  if (!existingNormalized.includes(cleanEmail) && existingNormalized.length >= 25) {
    throw new Error('Maximum limit of 25 authorized Google emails reached.');
  }

  const nextMembers = sanitizeEmailList([...existingNormalized, cleanEmail]);
  const memberId = makeSafeMemberId(cleanEmail);
  const memberRef = doc(db, 'cloud_members', memberId);

  try {
    const existingMember = await getDoc(memberRef);
    if (existingMember.exists()) {
      await updateDoc(memberRef, {
        label: nonEmptyStr(label, 80, cleanEmail),
        role,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(memberRef, {
        memberId,
        email: cleanEmail,
        label: nonEmptyStr(label, 80, cleanEmail),
        role,
        addedBy: nonEmptyStr(callerEmail, 160, BOOTSTRAPPED_OWNER_EMAIL),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await updateDoc(doc(db, 'workspace_meta', 'main'), {
      memberEmails: nextMembers,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `cloud_members/${memberId}`);
  }

  const cols = [
    'staff_users',
    'products',
    'stock',
    'purchases',
    'requests',
    'transfers',
    'daily_sales',
    'deleted_daily_sales',
    'operations',
    'ledger',
    'audit_log',
    'dropdown_options',
  ];
  const ops: Array<{ type: 'set' | 'update' | 'delete'; path: string; id: string; data?: Record<string, any> }> = [];
  for (const colName of cols) {
    try {
      const snap = await getDocs(collection(db, colName));
      snap.docs.forEach((d) => {
        ops.push({
          type: 'update',
          path: colName,
          id: d.id,
          data: {
            memberEmails: nextMembers,
            updatedAt: serverTimestamp(),
          },
        });
      });
    } catch {
      // Non-fatal if collection empty or restricted
    }
  }
  if (ops.length > 0) {
    await commitOperationsInChunks(db, ops);
  }

  return nextMembers;
}

export async function revokeCloudEmailInFirestore(
  db: Firestore,
  memberId: string,
  rawEmail: string,
  currentMemberEmails: string[]
): Promise<string[]> {
  const cleanEmail = rawEmail.trim().toLowerCase();
  if (isBootstrappedAdminEmail(cleanEmail)) {
    throw new Error('Cannot remove a primary owner or built-in admin account.');
  }

  const nextMembers = sanitizeEmailList(currentMemberEmails.filter((e) => e.toLowerCase() !== cleanEmail));
  try {
    await deleteDoc(doc(db, 'cloud_members', memberId));
    await updateDoc(doc(db, 'workspace_meta', 'main'), {
      memberEmails: nextMembers,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `cloud_members/${memberId}`);
  }

  const cols = [
    'staff_users',
    'products',
    'stock',
    'purchases',
    'requests',
    'transfers',
    'daily_sales',
    'deleted_daily_sales',
    'operations',
    'ledger',
    'audit_log',
    'dropdown_options',
  ];
  const ops: Array<{ type: 'set' | 'update' | 'delete'; path: string; id: string; data?: Record<string, any> }> = [];
  for (const colName of cols) {
    try {
      const snap = await getDocs(collection(db, colName));
      snap.docs.forEach((d) => {
        ops.push({
          type: 'update',
          path: colName,
          id: d.id,
          data: {
            memberEmails: nextMembers,
            updatedAt: serverTimestamp(),
          },
        });
      });
    } catch {
      // Non-fatal
    }
  }
  if (ops.length > 0) {
    await commitOperationsInChunks(db, ops);
  }

  return nextMembers;
}

export async function ensureWorkspaceBootstrapped(
  db: Firestore,
  fbUser: FirebaseAuthUser,
  seedSnapshot: WorkspaceSnapshot,
  openingEpoch: string,
  catalogVersion: string,
  verifiedEmail?: string
): Promise<{ memberEmails: string[]; cloudMembers: CloudMemberRecord[] }> {
  const callerEmail = (verifiedEmail || getCallerEmail(fbUser)).trim();
  const callerLower = callerEmail.toLowerCase();
  const isBootstrapped = isBootstrappedAdminEmail(callerLower);

  // If bootstrapped owner, ensure /admins/{uid} doc exists
  if (isBootstrapped) {
    try {
      const adminRef = doc(db, 'admins', fbUser.uid);
      const adminSnap = await getDoc(adminRef);
      if (!adminSnap.exists()) {
        await setDoc(adminRef, {
          uid: fbUser.uid,
          email: callerLower,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch {
      // Non-fatal: isBootstrappedAdmin() in firestore.rules already grants admin rights
    }
  }

  let metaSnap;
  try {
    metaSnap = await getDoc(doc(db, 'workspace_meta', 'main'));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'workspace_meta/main');
  }

  if (metaSnap && metaSnap.exists() && metaSnap.data()?.bootstrapped) {
    const storedMembers = normalizeStoredMemberEmails(metaSnap.data()?.memberEmails);
    if (!isBootstrapped && !storedMembers.includes(callerLower)) {
      throw new Error(
        `UNAUTHORIZED_MEMBER: Google account "${callerLower}" is not authorized yet. Ask a Shop Admin or Cloud Admin to add "${callerLower}" in User Management → Authorized Cloud Emails.`
      );
    }

    if (isBootstrapped) {
      await ensureDefaultCloudMembers(db, callerLower);
    } else {
      // If this verified user is listed as ADMIN in cloud_members, ensure /admins/{uid} exists
      try {
        const myMemberSnap = await getDoc(doc(db, 'cloud_members', makeSafeMemberId(callerLower)));
        if (myMemberSnap.exists() && myMemberSnap.data()?.role === 'ADMIN') {
          const adminRef = doc(db, 'admins', fbUser.uid);
          const adminSnap = await getDoc(adminRef);
          if (!adminSnap.exists()) {
            await setDoc(adminRef, {
              uid: fbUser.uid,
              email: callerLower,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        }
      } catch {
        // Non-fatal for STAFF members
      }
    }

    const cloudMembers = await fetchCloudMembersList(db, callerLower, storedMembers);
    return { memberEmails: storedMembers, cloudMembers };
  }

  if (!isBootstrapped) {
    throw new Error(
      `UNAUTHORIZED_MEMBER: Shop cloud database has not been initialized by the owner (${BOOTSTRAPPED_OWNER_EMAIL}) yet. Please have the owner sign in once first.`
    );
  }

  const memberEmails = sanitizeEmailList(DEFAULT_ADMIN_EMAILS);
  const ops: Array<{ type: 'set' | 'update' | 'delete'; path: string; id: string; data?: Record<string, any> }> = [
    {
      type: 'set',
      path: 'workspace_meta',
      id: 'main',
      data: {
        metaId: 'main',
        bootstrapped: true,
        openingEpoch: nonEmptyStr(openingEpoch, 64, '2026-11-20-opening-v1'),
        catalogVersion: nonEmptyStr(catalogVersion, 64, '2026-11-20-opening-v1'),
        ownerEmail: callerLower,
        memberEmails,
        suppliers: seedSnapshot.suppliers.slice(0, 100),
        deletedProductIds: (seedSnapshot.deletedProductIds || []).slice(0, 1000),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
    },
  ];

  seedSnapshot.users.forEach((u) => {
    ops.push({ type: 'set', path: 'staff_users', id: u.userId, data: toStaffUserDoc(u, memberEmails) });
  });
  seedSnapshot.products.forEach((p) => {
    ops.push({ type: 'set', path: 'products', id: p.productId, data: toProductDoc(p, memberEmails) });
  });
  Object.entries(seedSnapshot.stock).forEach(([pid, lvl]) => {
    ops.push({ type: 'set', path: 'stock', id: pid, data: toStockDoc(pid, lvl, memberEmails) });
  });
  seedSnapshot.dropdownOptions.forEach((o) => {
    ops.push({ type: 'set', path: 'dropdown_options', id: o.optionId, data: toDropdownDoc(o, memberEmails) });
  });
  seedSnapshot.purchases.forEach((b) => {
    ops.push({ type: 'set', path: 'purchases', id: b.batchId, data: toPurchaseDoc(b, memberEmails) });
  });
  seedSnapshot.requests.forEach((r) => {
    ops.push({ type: 'set', path: 'requests', id: r.requestId, data: toRequestDoc(r, memberEmails) });
  });
  seedSnapshot.transfers.forEach((t) => {
    ops.push({ type: 'set', path: 'transfers', id: t.transferId, data: toTransferDoc(t, memberEmails) });
  });
  seedSnapshot.dailySales.forEach((s) => {
    ops.push({ type: 'set', path: 'daily_sales', id: s.reportId, data: toDailySalesDoc(s, memberEmails) });
  });
  (seedSnapshot.deletedDailySales || []).forEach((s) => {
    ops.push({ type: 'set', path: 'deleted_daily_sales', id: s.reportId, data: toDeletedDailySalesDoc(s, memberEmails) });
  });
  seedSnapshot.operations.forEach((op) => {
    ops.push({ type: 'set', path: 'operations', id: op.operationId, data: toOperationDoc(op, memberEmails) });
  });
  seedSnapshot.ledger.forEach((l) => {
    ops.push({ type: 'set', path: 'ledger', id: l.ledgerId, data: toLedgerDoc(l, memberEmails) });
  });
  seedSnapshot.auditLog.forEach((a) => {
    ops.push({ type: 'set', path: 'audit_log', id: a.auditId, data: toAuditDoc(a, memberEmails) });
  });

  await commitOperationsInChunks(db, ops);
  await ensureDefaultCloudMembers(db, callerLower);
  const cloudMembers = await fetchCloudMembersList(db, callerLower, memberEmails);
  return { memberEmails, cloudMembers };
}

// =========================================================
// REAL-TIME FIRESTORE SUBSCRIPTIONS
// =========================================================

export function subscribeWorkspaceCollections(
  db: Firestore,
  fbUser: FirebaseAuthUser,
  knownDocs: KnownDocsMap,
  onSliceUpdate: (partial: Partial<WorkspaceSnapshot>, memberEmails?: string[], cloudMembers?: CloudMemberRecord[]) => void,
  onSyncError: (errMsg: string) => void,
  verifiedEmail?: string
): Unsubscribe {
  const callerEmail = (verifiedEmail || getCallerEmail(fbUser)).trim();
  const callerLower = callerEmail.toLowerCase();
  const isBootstrapped = isBootstrappedAdminEmail(callerLower);
  const scopedQuery = (colName: string) => collection(db, colName);

  const markIds = (colName: string, ids: string[]) => {
    knownDocs.set(colName, new Set(ids));
  };

  const unsubs: Unsubscribe[] = [];

  const handleErr = (colName: string) => (err: unknown) => {
    try {
      handleFirestoreError(err, OperationType.LIST, colName);
    } catch (wrapped: any) {
      onSyncError(wrapped?.message || String(err));
    }
  };

  // workspace_meta/main (single doc read/listen tracks live memberEmails + suppliers)
  unsubs.push(
    onSnapshot(
      doc(db, 'workspace_meta', 'main'),
      async (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const storedMembers = normalizeStoredMemberEmails(data?.memberEmails);
          if (!isBootstrapped && !storedMembers.includes(callerLower)) {
            onSyncError(
              `UNAUTHORIZED_MEMBER: Access for "${callerLower}" was removed. Ask a Shop Admin or Cloud Admin to re-authorize it in User Management.`
            );
            return;
          }
          const updatedCloudMembers = await fetchCloudMembersList(db, callerLower, storedMembers);
          const metaPatch: Partial<WorkspaceSnapshot> = {
            deletedProductIds: Array.isArray(data?.deletedProductIds)
              ? data.deletedProductIds.filter((id): id is string => typeof id === 'string')
              : [],
          };
          if (Array.isArray(data?.suppliers)) {
            metaPatch.suppliers = data.suppliers;
          }
          onSliceUpdate(metaPatch, storedMembers, updatedCloudMembers);
        }
      },
      handleErr('workspace_meta/main')
    )
  );

  // cloud_members live listener for bootstrapped admins (or own doc for others)
  if (isBootstrapped) {
    unsubs.push(
      onSnapshot(
        collection(db, 'cloud_members'),
        (snap) => {
          const list = snap.docs
            .map((d) => d.data() as CloudMemberRecord)
            .sort((a, b) => a.email.localeCompare(b.email));
          onSliceUpdate({}, undefined, list);
        },
        () => {
          // Non-fatal fallback handled via workspace_meta refresh
        }
      )
    );
  }

  // staff_users
  unsubs.push(
    onSnapshot(
      scopedQuery('staff_users'),
      (snap) => {
        const ids: string[] = [];
        const items: User[] = [];
        snap.docs.forEach((d) => {
          ids.push(d.id);
          items.push(fromStaffUserDoc(d.data()));
        });
        markIds('staff_users', ids);
        onSliceUpdate({ users: items });
      },
      handleErr('staff_users')
    )
  );

  // products
  unsubs.push(
    onSnapshot(
      scopedQuery('products'),
      (snap) => {
        const ids: string[] = [];
        const items: Product[] = [];
        snap.docs.forEach((d) => {
          ids.push(d.id);
          items.push(fromProductDoc(d.data()));
        });
        markIds('products', ids);
        onSliceUpdate({ products: items });
      },
      handleErr('products')
    )
  );

  // stock
  unsubs.push(
    onSnapshot(
      scopedQuery('stock'),
      (snap) => {
        const ids: string[] = [];
        const map: Record<string, { godown: number; normal: number; ac: number }> = {};
        snap.docs.forEach((d) => {
          ids.push(d.id);
          const data = d.data();
          const pid = data.productId || d.id;
          map[pid] = {
            godown: Number(data.godown || 0),
            normal: Number(data.normal || 0),
            ac: Number(data.ac || 0),
          };
        });
        markIds('stock', ids);
        onSliceUpdate({ stock: map });
      },
      handleErr('stock')
    )
  );

  // purchases
  unsubs.push(
    onSnapshot(
      scopedQuery('purchases'),
      (snap) => {
        const ids: string[] = [];
        const items: PurchaseBatch[] = [];
        snap.docs.forEach((d) => {
          ids.push(d.id);
          items.push(fromPurchaseDoc(d.data()));
        });
        markIds('purchases', ids);
        onSliceUpdate({ purchases: items });
      },
      handleErr('purchases')
    )
  );

  // requests
  unsubs.push(
    onSnapshot(
      scopedQuery('requests'),
      (snap) => {
        const ids: string[] = [];
        const items: StockRequestItem[] = [];
        snap.docs.forEach((d) => {
          ids.push(d.id);
          items.push(fromRequestDoc(d.data()));
        });
        markIds('requests', ids);
        onSliceUpdate({ requests: items });
      },
      handleErr('requests')
    )
  );

  // transfers
  unsubs.push(
    onSnapshot(
      scopedQuery('transfers'),
      (snap) => {
        const ids: string[] = [];
        const items: StockTransfer[] = [];
        snap.docs.forEach((d) => {
          ids.push(d.id);
          items.push(fromTransferDoc(d.data()));
        });
        markIds('transfers', ids);
        onSliceUpdate({ transfers: items });
      },
      handleErr('transfers')
    )
  );

  // daily_sales
  unsubs.push(
    onSnapshot(
      scopedQuery('daily_sales'),
      (snap) => {
        const ids: string[] = [];
        const items: DailySalesReport[] = [];
        snap.docs.forEach((d) => {
          ids.push(d.id);
          items.push(fromDailySalesDoc(d.data()));
        });
        markIds('daily_sales', ids);
        onSliceUpdate({ dailySales: items });
      },
      handleErr('daily_sales')
    )
  );

  // deleted_daily_sales
  unsubs.push(
    onSnapshot(
      scopedQuery('deleted_daily_sales'),
      (snap) => {
        const ids: string[] = [];
        const items: DeletedDailySalesReport[] = [];
        snap.docs.forEach((d) => {
          ids.push(d.id);
          items.push(fromDeletedDailySalesDoc(d.data()));
        });
        markIds('deleted_daily_sales', ids);
        onSliceUpdate({ deletedDailySales: items });
      },
      handleErr('deleted_daily_sales')
    )
  );

  // operations
  unsubs.push(
    onSnapshot(
      scopedQuery('operations'),
      (snap) => {
        const ids: string[] = [];
        const items: DailyOperation[] = [];
        snap.docs.forEach((d) => {
          ids.push(d.id);
          items.push(fromOperationDoc(d.data()));
        });
        markIds('operations', ids);
        onSliceUpdate({ operations: items });
      },
      handleErr('operations')
    )
  );

  // ledger
  unsubs.push(
    onSnapshot(
      scopedQuery('ledger'),
      (snap) => {
        const ids: string[] = [];
        const items: StockLedgerEntry[] = [];
        snap.docs.forEach((d) => {
          ids.push(d.id);
          items.push(fromLedgerDoc(d.data()));
        });
        markIds('ledger', ids);
        onSliceUpdate({ ledger: items });
      },
      handleErr('ledger')
    )
  );

  // audit_log
  unsubs.push(
    onSnapshot(
      scopedQuery('audit_log'),
      (snap) => {
        const ids: string[] = [];
        const items: AuditLogEntry[] = [];
        snap.docs.forEach((d) => {
          ids.push(d.id);
          items.push(fromAuditDoc(d.data()));
        });
        markIds('audit_log', ids);
        onSliceUpdate({ auditLog: items });
      },
      handleErr('audit_log')
    )
  );

  // dropdown_options
  unsubs.push(
    onSnapshot(
      scopedQuery('dropdown_options'),
      (snap) => {
        const ids: string[] = [];
        const items: DropdownOption[] = [];
        snap.docs.forEach((d) => {
          ids.push(d.id);
          items.push(fromDropdownDoc(d.data()));
        });
        markIds('dropdown_options', ids);
        onSliceUpdate({ dropdownOptions: items });
      },
      handleErr('dropdown_options')
    )
  );

  return () => {
    unsubs.forEach((u) => {
      try {
        u();
      } catch {
        // Ignore cleanup errors
      }
    });
  };
}

// Manual pull for Retry / Sync button
export async function fetchAllCollectionsFromFirestore(
  db: Firestore,
  fbUser: FirebaseAuthUser,
  knownDocs: KnownDocsMap,
  verifiedEmail?: string
): Promise<Partial<WorkspaceSnapshot>> {
  const result: Partial<WorkspaceSnapshot> = {};

  const readCol = async <T,>(colName: string, mapper: (d: Record<string, any>) => T): Promise<T[]> => {
    try {
      const snap = await getDocs(collection(db, colName));
      knownDocs.set(colName, new Set(snap.docs.map((d) => d.id)));
      return snap.docs.map((d) => mapper(d.data()));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, colName);
    }
  };

  try {
    const metaSnap = await getDoc(doc(db, 'workspace_meta', 'main'));
    if (metaSnap.exists()) {
      const metaData = metaSnap.data();
      if (Array.isArray(metaData?.suppliers)) {
        result.suppliers = metaData.suppliers;
      }
      if (Array.isArray(metaData?.deletedProductIds)) {
        result.deletedProductIds = metaData.deletedProductIds.filter(
          (id): id is string => typeof id === 'string'
        );
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'workspace_meta/main');
  }

  const [
    users,
    products,
    stockArr,
    purchases,
    requests,
    transfers,
    dailySales,
    deletedDailySales,
    operations,
    ledger,
    auditLog,
    dropdownOptions,
  ] = await Promise.all([
    readCol('staff_users', fromStaffUserDoc),
    readCol('products', fromProductDoc),
    readCol('stock', (d) => ({ id: d.productId, data: d })),
    readCol('purchases', fromPurchaseDoc),
    readCol('requests', fromRequestDoc),
    readCol('transfers', fromTransferDoc),
    readCol('daily_sales', fromDailySalesDoc),
    readCol('deleted_daily_sales', fromDeletedDailySalesDoc),
    readCol('operations', fromOperationDoc),
    readCol('ledger', fromLedgerDoc),
    readCol('audit_log', fromAuditDoc),
    readCol('dropdown_options', fromDropdownDoc),
  ]);

  const stockMap: Record<string, { godown: number; normal: number; ac: number }> = {};
  stockArr.forEach((entry: any) => {
    if (entry?.id) {
      stockMap[entry.id] = {
        godown: Number(entry.data?.godown || 0),
        normal: Number(entry.data?.normal || 0),
        ac: Number(entry.data?.ac || 0),
      };
    }
  });

  result.users = users;
  result.products = products;
  result.stock = stockMap;
  result.purchases = purchases;
  result.requests = requests;
  result.transfers = transfers;
  result.dailySales = dailySales;
  result.deletedDailySales = deletedDailySales;
  result.operations = operations;
  result.ledger = ledger;
  result.auditLog = auditLog;
  result.dropdownOptions = dropdownOptions;
  return result;
}

// =========================================================
// GRANULAR SLICE SYNC (Rule-compliant creates, updates, deletes)
// =========================================================

export async function syncSlicesToFirestore(
  db: Firestore,
  fbUser: FirebaseAuthUser,
  knownDocs: KnownDocsMap,
  prevSnapshot: WorkspaceSnapshot,
  nextSnapshot: WorkspaceSnapshot,
  dirtySlices: string[],
  deletedIds?: Record<string, string[]>,
  isReset = false,
  activeMemberEmails?: string[]
): Promise<void> {
  const callerEmail = getCallerEmail(fbUser);
  const memberEmails = normalizeMemberEmails(
    activeMemberEmails && activeMemberEmails.length > 0 ? activeMemberEmails : DEFAULT_ADMIN_EMAILS,
    callerEmail
  );
  const dirty = new Set(dirtySlices);

  const ensureSet = (col: string): Set<string> => {
    let s = knownDocs.get(col);
    if (!s) {
      s = new Set();
      knownDocs.set(col, s);
    }
    return s;
  };

  if (isReset) {
    // Delete transactional collections cleanly, then reset opening state
    const colsToClear = ['purchases', 'requests', 'transfers', 'daily_sales', 'deleted_daily_sales', 'operations', 'ledger', 'audit_log'];
    const deleteOps: Array<{ type: 'set' | 'delete'; path: string; id: string }> = [];
    for (const colName of colsToClear) {
      try {
        const snap = await getDocs(collection(db, colName));
        snap.docs.forEach((d) => deleteOps.push({ type: 'delete', path: colName, id: d.id }));
        knownDocs.set(colName, new Set());
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, colName);
      }
    }
    if (deleteOps.length > 0) {
      await commitOperationsInChunks(db, deleteOps);
    }
    // Reset stock & suppliers
    const stockKnown = ensureSet('stock');
    for (const [pid, lvl] of Object.entries(nextSnapshot.stock)) {
      const ref = doc(db, 'stock', pid);
      try {
        if (stockKnown.has(pid)) {
          await updateDoc(ref, {
            godown: nonNegNum(lvl.godown, 0),
            normal: nonNegNum(lvl.normal, 0),
            ac: nonNegNum(lvl.ac, 0),
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(ref, toStockDoc(pid, lvl, memberEmails));
          stockKnown.add(pid);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `stock/${pid}`);
      }
    }
    try {
      await updateDoc(doc(db, 'workspace_meta', 'main'), {
        suppliers: nextSnapshot.suppliers.slice(0, 100),
        deletedProductIds: (nextSnapshot.deletedProductIds || []).slice(0, 1000),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'workspace_meta/main');
    }
  }

  // 1. suppliers & deletedProductIds
  if (dirty.has('suppliers') || dirty.has('deletedProductIds')) {
    try {
      const metaUpdate: Record<string, any> = {
        updatedAt: serverTimestamp(),
      };
      if (dirty.has('suppliers')) {
        metaUpdate.suppliers = nextSnapshot.suppliers.slice(0, 100);
      }
      if (dirty.has('deletedProductIds')) {
        metaUpdate.deletedProductIds = (nextSnapshot.deletedProductIds || []).slice(0, 1000);
      }
      await updateDoc(doc(db, 'workspace_meta', 'main'), metaUpdate);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'workspace_meta/main');
    }
  }

  // 2. users -> staff_users
  if (dirty.has('users')) {
    const known = ensureSet('staff_users');
    const prevMap = new Map(prevSnapshot.users.map((u) => [u.userId, u]));
    for (const u of nextSnapshot.users) {
      const prev = prevMap.get(u.userId);
      const path = `staff_users/${u.userId}`;
      try {
        if (!known.has(u.userId)) {
          await setDoc(doc(db, 'staff_users', u.userId), toStaffUserDoc(u, memberEmails));
          known.add(u.userId);
        } else if (
          !prev ||
          prev.password !== u.password ||
          prev.mustChange !== u.mustChange ||
          prev.active !== u.active ||
          prev.updatedAt !== u.updatedAt
        ) {
          const patch: Record<string, any> = { updatedAt: serverTimestamp() };
          if (!prev || prev.password !== u.password) patch.password = nonEmptyStr(u.password, 128, '1234');
          if (!prev || prev.mustChange !== u.mustChange) patch.mustChange = Boolean(u.mustChange);
          if (!prev || prev.active !== u.active) patch.active = Boolean(u.active);
          if (u.updatedAt) patch.updatedAtStr = sanitizeStr(u.updatedAt, 40);
          await updateDoc(doc(db, 'staff_users', u.userId), patch);
        }
      } catch (err) {
        handleFirestoreError(err, known.has(u.userId) ? OperationType.UPDATE : OperationType.CREATE, path);
      }
    }
  }

  // 3. products -> products
  if (dirty.has('products') || (deletedIds?.products && deletedIds.products.length > 0)) {
    const known = ensureSet('products');
    for (const delId of deletedIds?.products || []) {
      try {
        await deleteDoc(doc(db, 'products', delId));
        known.delete(delId);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `products/${delId}`);
      }
    }
    const prevMap = new Map(prevSnapshot.products.map((p) => [p.productId, p]));
    for (const p of nextSnapshot.products) {
      const prev = prevMap.get(p.productId);
      const path = `products/${p.productId}`;
      try {
        if (!known.has(p.productId)) {
          await setDoc(doc(db, 'products', p.productId), toProductDoc(p, memberEmails));
          known.add(p.productId);
        } else if (
          !prev ||
          prev.name !== p.name ||
          prev.category !== p.category ||
          prev.sizeML !== p.sizeML ||
          prev.casePack !== p.casePack ||
          prev.sellingPrice !== p.sellingPrice ||
          prev.active !== p.active ||
          prev.updatedAt !== p.updatedAt
        ) {
          const patch: Record<string, any> = {
            name: nonEmptyStr(p.name, 140, 'Unnamed Product'),
            category: nonEmptyStr(p.category, 80, 'Others'),
            sizeML: nonNegNum(p.sizeML, 750),
            casePack: Math.max(1, nonNegNum(p.casePack, 12)),
            sellingPrice: nonNegNum(p.sellingPrice, 0),
            active: Boolean(p.active),
            updatedAt: serverTimestamp(),
          };
          if (p.updatedAt !== undefined) patch.updatedAtStr = sanitizeStr(p.updatedAt, 40);
          if (p.updatedBy !== undefined) patch.updatedBy = sanitizeStr(p.updatedBy, 80);
          await updateDoc(doc(db, 'products', p.productId), patch);
        }
      } catch (err) {
        handleFirestoreError(err, known.has(p.productId) ? OperationType.UPDATE : OperationType.CREATE, path);
      }
    }
  }

  // 4. stock -> stock
  if (dirty.has('stock') || (deletedIds?.stock && deletedIds.stock.length > 0)) {
    const known = ensureSet('stock');
    for (const delId of deletedIds?.stock || []) {
      try {
        await deleteDoc(doc(db, 'stock', delId));
        known.delete(delId);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `stock/${delId}`);
      }
    }
    for (const [pid, lvl] of Object.entries(nextSnapshot.stock)) {
      const prev = prevSnapshot.stock[pid];
      if (
        !known.has(pid) ||
        !prev ||
        prev.godown !== lvl.godown ||
        prev.normal !== lvl.normal ||
        prev.ac !== lvl.ac
      ) {
        const path = `stock/${pid}`;
        try {
          if (!known.has(pid)) {
            await setDoc(doc(db, 'stock', pid), toStockDoc(pid, lvl, memberEmails));
            known.add(pid);
          } else {
            await updateDoc(doc(db, 'stock', pid), {
              godown: nonNegNum(lvl.godown, 0),
              normal: nonNegNum(lvl.normal, 0),
              ac: nonNegNum(lvl.ac, 0),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, known.has(pid) ? OperationType.UPDATE : OperationType.CREATE, path);
        }
      }
    }
  }

  // 5. purchases -> purchases
  if (dirty.has('purchases') || (deletedIds?.purchases && deletedIds.purchases.length > 0)) {
    const known = ensureSet('purchases');
    for (const delId of deletedIds?.purchases || []) {
      try {
        await deleteDoc(doc(db, 'purchases', delId));
        known.delete(delId);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `purchases/${delId}`);
      }
    }
    const prevMap = new Map(prevSnapshot.purchases.map((b) => [b.batchId, b]));
    for (const b of nextSnapshot.purchases) {
      const prev = prevMap.get(b.batchId);
      const path = `purchases/${b.batchId}`;
      try {
        if (!known.has(b.batchId)) {
          await setDoc(doc(db, 'purchases', b.batchId), toPurchaseDoc(b, memberEmails));
          known.add(b.batchId);
        } else if (!prev || JSON.stringify(prev) !== JSON.stringify(b)) {
          if (prev && prev.status === 'Pending' && b.status !== 'Pending') {
            await updateDoc(doc(db, 'purchases', b.batchId), {
              status: b.status,
              reviewedBy: sanitizeStr(b.reviewedBy, 80, ''),
              reviewedAtStr: sanitizeStr(b.reviewedAt, 40, ''),
              remark: sanitizeStr(b.remark, 300, ''),
              updatedAt: serverTimestamp(),
            });
          } else {
            await updateDoc(doc(db, 'purchases', b.batchId), {
              date: nonEmptyStr(b.date, 20, '2026-01-01'),
              billDate: nonEmptyStr(b.billDate, 20, '2026-01-01'),
              supplier: nonEmptyStr(b.supplier, 160, 'Supplier'),
              invoiceNo: nonEmptyStr(b.invoiceNo, 80, 'INV'),
              lines: Array.isArray(b.lines) ? b.lines.slice(0, 200) : [],
              totalQty: nonNegNum(b.totalQty, 0),
              netTotal: nonNegNum(b.netTotal, 0),
              remark: sanitizeStr(b.remark, 300, ''),
              updatedAt: serverTimestamp(),
            });
          }
        }
      } catch (err) {
        handleFirestoreError(err, known.has(b.batchId) ? OperationType.UPDATE : OperationType.CREATE, path);
      }
    }
  }

  // 6. requests -> requests
  if (dirty.has('requests') || (deletedIds?.requests && deletedIds.requests.length > 0)) {
    const known = ensureSet('requests');
    const requestDeleteIds = deletedIds?.requests || [];
    if (requestDeleteIds.length > 0) {
      await commitOperationsInChunks(
        db,
        requestDeleteIds.map((delId) => ({ type: 'delete' as const, path: 'requests', id: delId }))
      );
      requestDeleteIds.forEach((delId) => known.delete(delId));
    }
    const prevMap = new Map(prevSnapshot.requests.map((r) => [r.requestId, r]));
    for (const r of nextSnapshot.requests) {
      const prev = prevMap.get(r.requestId);
      const path = `requests/${r.requestId}`;
      try {
        if (!known.has(r.requestId)) {
          await setDoc(doc(db, 'requests', r.requestId), toRequestDoc(r, memberEmails));
          known.add(r.requestId);
        } else if (prev && prev.status === 'Pending' && r.status !== 'Pending') {
          await updateDoc(doc(db, 'requests', r.requestId), {
            status: r.status,
            reviewedBy: sanitizeStr(r.reviewedBy, 80, ''),
            reviewedAtStr: sanitizeStr(r.reviewedAt, 40, ''),
            remark: sanitizeStr(r.remark, 300, ''),
            updatedAt: serverTimestamp(),
          });
        } else if (prev && prev.status === 'Approved' && r.status === 'Reversed') {
          await updateDoc(doc(db, 'requests', r.requestId), {
            status: 'Reversed',
            reversedBy: sanitizeStr(r.reversedBy, 80, ''),
            reversedAtStr: sanitizeStr(r.reversedAt, 40, ''),
            remark: sanitizeStr(r.remark, 300, ''),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, known.has(r.requestId) ? OperationType.UPDATE : OperationType.CREATE, path);
      }
    }
  }

  // 7. transfers -> transfers
  if (dirty.has('transfers') || (deletedIds?.transfers && deletedIds.transfers.length > 0)) {
    const known = ensureSet('transfers');
    const transferDeleteIds = deletedIds?.transfers || [];
    if (transferDeleteIds.length > 0) {
      await commitOperationsInChunks(
        db,
        transferDeleteIds.map((delId) => ({ type: 'delete' as const, path: 'transfers', id: delId }))
      );
      transferDeleteIds.forEach((delId) => known.delete(delId));
    }
    const prevMap = new Map(prevSnapshot.transfers.map((t) => [t.transferId, t]));
    for (const t of nextSnapshot.transfers) {
      const prev = prevMap.get(t.transferId);
      const path = `transfers/${t.transferId}`;
      try {
        if (!known.has(t.transferId)) {
          await setDoc(doc(db, 'transfers', t.transferId), toTransferDoc(t, memberEmails));
          known.add(t.transferId);
        } else if (prev && prev.status === 'Pending' && t.status !== 'Pending') {
          await updateDoc(doc(db, 'transfers', t.transferId), {
            status: t.status,
            reviewedBy: sanitizeStr(t.reviewedBy, 80, ''),
            reviewedAtStr: sanitizeStr(t.reviewedAt, 40, ''),
            remark: sanitizeStr(t.remark, 300, ''),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, known.has(t.transferId) ? OperationType.UPDATE : OperationType.CREATE, path);
      }
    }
  }

  // 8. dailySales -> daily_sales
  if (dirty.has('dailySales') || (deletedIds?.dailySales && deletedIds.dailySales.length > 0)) {
    const known = ensureSet('daily_sales');
    for (const delId of deletedIds?.dailySales || []) {
      try {
        await deleteDoc(doc(db, 'daily_sales', delId));
        known.delete(delId);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `daily_sales/${delId}`);
      }
    }
    const prevMap = new Map(prevSnapshot.dailySales.map((r) => [r.reportId, r]));
    for (const r of nextSnapshot.dailySales) {
      const prev = prevMap.get(r.reportId);
      const path = `daily_sales/${r.reportId}`;
      try {
        if (!known.has(r.reportId)) {
          await setDoc(doc(db, 'daily_sales', r.reportId), toDailySalesDoc(r, memberEmails));
          known.add(r.reportId);
        } else if (!prev || JSON.stringify(prev) !== JSON.stringify(r)) {
          if (
            prev &&
            prev.status === 'Pending' &&
            r.status !== 'Pending' &&
            prev.totalSoldQty === r.totalSoldQty &&
            prev.recordedAmount === r.recordedAmount
          ) {
            await updateDoc(doc(db, 'daily_sales', r.reportId), {
              status: r.status,
              reviewedBy: sanitizeStr(r.reviewedBy, 80, ''),
              reviewedAtStr: sanitizeStr(r.reviewedAt, 40, ''),
              remark: sanitizeStr(r.remark, 300, ''),
              updatedAt: serverTimestamp(),
            });
          } else {
            const patch: Record<string, any> = {
              totalSoldQty: nonNegNum(r.totalSoldQty, 0),
              totalSalesValue: nonNegNum(r.totalSalesValue, 0),
              recordedAmount: anyNum(r.recordedAmount, 0),
              cashAmount: nonNegNum(r.cashAmount, 0),
              upiAmount: nonNegNum(r.upiAmount, 0),
              cardAmount: nonNegNum(r.cardAmount, 0),
              cashierName: sanitizeStr(r.cashierName, 100, ''),
              helperName: sanitizeStr(r.helperName, 100, ''),
              paymentDifference: anyNum(r.paymentDifference, 0),
              lines: Array.isArray(r.lines) ? r.lines.slice(0, 300) : [],
              remark: sanitizeStr(r.remark, 300, ''),
              updatedAt: serverTimestamp(),
            };
            if (r.acCharges !== undefined) patch.acCharges = anyNum(r.acCharges, 0);
            if (r.paymentExplanation !== undefined) {
              patch.paymentExplanation = sanitizeStr(r.paymentExplanation, 300, '');
            }
            if (r.editedBy !== undefined) patch.editedBy = sanitizeStr(r.editedBy, 80);
            if (r.editedAt !== undefined) patch.editedAtStr = sanitizeStr(r.editedAt, 40);
            await updateDoc(doc(db, 'daily_sales', r.reportId), patch);
          }
        }
      } catch (err) {
        handleFirestoreError(err, known.has(r.reportId) ? OperationType.UPDATE : OperationType.CREATE, path);
      }
    }
  }

  // 8b. deletedDailySales -> deleted_daily_sales
  if (dirty.has('deletedDailySales') || (deletedIds?.deletedDailySales && deletedIds.deletedDailySales.length > 0)) {
    const known = ensureSet('deleted_daily_sales');
    for (const delId of deletedIds?.deletedDailySales || []) {
      try {
        await deleteDoc(doc(db, 'deleted_daily_sales', delId));
        known.delete(delId);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `deleted_daily_sales/${delId}`);
      }
    }
    for (const r of nextSnapshot.deletedDailySales || []) {
      const path = `deleted_daily_sales/${r.reportId}`;
      try {
        if (!known.has(r.reportId)) {
          await setDoc(doc(db, 'deleted_daily_sales', r.reportId), toDeletedDailySalesDoc(r, memberEmails));
          known.add(r.reportId);
        }
      } catch (err) {
        handleFirestoreError(err, known.has(r.reportId) ? OperationType.UPDATE : OperationType.CREATE, path);
      }
    }
  }

  // 9. operations -> operations
  if (dirty.has('operations') || (deletedIds?.operations && deletedIds.operations.length > 0)) {
    const known = ensureSet('operations');
    for (const delId of deletedIds?.operations || []) {
      try {
        await deleteDoc(doc(db, 'operations', delId));
        known.delete(delId);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `operations/${delId}`);
      }
    }
    const prevMap = new Map(prevSnapshot.operations.map((o) => [o.operationId, o]));
    for (const o of nextSnapshot.operations) {
      const prev = prevMap.get(o.operationId);
      const path = `operations/${o.operationId}`;
      try {
        if (!known.has(o.operationId)) {
          await setDoc(doc(db, 'operations', o.operationId), toOperationDoc(o, memberEmails));
          known.add(o.operationId);
        } else if (prev && prev.status === 'Pending' && o.status !== 'Pending') {
          await updateDoc(doc(db, 'operations', o.operationId), {
            status: o.status,
            reviewedBy: sanitizeStr(o.reviewedBy, 80, ''),
            reviewedAtStr: sanitizeStr(o.reviewedAt, 40, ''),
            reviewRemark: sanitizeStr(o.reviewRemark, 300, ''),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, known.has(o.operationId) ? OperationType.UPDATE : OperationType.CREATE, path);
      }
    }
  }

  // 10. ledger -> ledger (append + targeted admin cleanup delete)
  if (dirty.has('ledger') || (deletedIds?.ledger && deletedIds.ledger.length > 0)) {
    const known = ensureSet('ledger');
    const ledgerDeleteIds = deletedIds?.ledger || [];
    if (ledgerDeleteIds.length > 0) {
      await commitOperationsInChunks(
        db,
        ledgerDeleteIds.map((delId) => ({ type: 'delete' as const, path: 'ledger', id: delId }))
      );
      ledgerDeleteIds.forEach((delId) => known.delete(delId));
    }
    const newEntries = nextSnapshot.ledger.filter((l) => !known.has(l.ledgerId));
    if (newEntries.length > 0) {
      await commitOperationsInChunks(
        db,
        newEntries.map((l) => ({
          type: 'set',
          path: 'ledger',
          id: l.ledgerId,
          data: toLedgerDoc(l, memberEmails),
        }))
      );
      newEntries.forEach((l) => known.add(l.ledgerId));
    }
  }

  // 11. auditLog -> audit_log (append-only)
  if (dirty.has('auditLog')) {
    const known = ensureSet('audit_log');
    const newEntries = nextSnapshot.auditLog.filter((a) => !known.has(a.auditId));
    if (newEntries.length > 0) {
      await commitOperationsInChunks(
        db,
        newEntries.map((a) => ({
          type: 'set',
          path: 'audit_log',
          id: a.auditId,
          data: toAuditDoc(a, memberEmails),
        }))
      );
      newEntries.forEach((a) => known.add(a.auditId));
    }
  }

  // 12. dropdownOptions -> dropdown_options
  if (dirty.has('dropdownOptions')) {
    const known = ensureSet('dropdown_options');
    const prevMap = new Map(prevSnapshot.dropdownOptions.map((o) => [o.optionId, o]));
    for (const o of nextSnapshot.dropdownOptions) {
      const prev = prevMap.get(o.optionId);
      const path = `dropdown_options/${o.optionId}`;
      try {
        if (!known.has(o.optionId)) {
          await setDoc(doc(db, 'dropdown_options', o.optionId), toDropdownDoc(o, memberEmails));
          known.add(o.optionId);
        } else if (!prev || prev.active !== o.active || prev.value !== o.value) {
          await updateDoc(doc(db, 'dropdown_options', o.optionId), {
            active: Boolean(o.active),
            value: nonEmptyStr(o.value, 140, 'Option'),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, known.has(o.optionId) ? OperationType.UPDATE : OperationType.CREATE, path);
      }
    }
  }
}
