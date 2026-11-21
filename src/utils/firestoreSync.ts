import {
  doc,
  writeBatch,
  serverTimestamp,
  DocumentReference,
  increment,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, BOOTSTRAPPED_ADMIN_EMAILS } from '../firebase';
import {
  AuditLogEntry,
  DailyOperation,
  DailySalesReport,
  DropdownOption,
  Product,
  PurchaseBatch,
  StockLedgerEntry,
  StockRequestItem,
  StockTransfer,
  User,
} from '../types';

export interface CloudMemberRecord {
  memberId: string;
  email: string;
  label: string;
  role: 'ADMIN' | 'STAFF';
  addedBy: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface WorkspaceMetaRecord {
  metaId: string;
  bootstrapped: boolean;
  openingEpoch: string;
  catalogVersion: string;
  ownerEmail: string;
  memberEmails: string[];
  suppliers: string[];
}

export type BatchOp =
  | { type: 'set'; ref: DocumentReference; data: Record<string, any> }
  | { type: 'update'; ref: DocumentReference; data: Record<string, any> }
  | { type: 'delete'; ref: DocumentReference };

export function clampStr(val: any, maxLen: number): string {
  const s = String(val ?? '');
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

export function stripUndefinedDeep<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj as Record<string, any>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return obj;
}

export function sanitizeEmailList(emails: string[]): string[] {
  const set = new Set<string>(BOOTSTRAPPED_ADMIN_EMAILS.map(e => e.toLowerCase()));
  for (const e of emails) {
    const clean = String(e || '').trim().toLowerCase();
    if (clean && clean.length >= 5 && clean.length <= 160 && clean.includes('@')) {
      set.add(clean);
    }
    if (set.size >= 25) break;
  }
  return Array.from(set);
}

export function makeSafeMemberId(email: string): string {
  const clean = email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return (`mbr_${clean}`).slice(0, 120);
}

export async function commitFirestoreOps(ops: BatchOp[], pathLabel: string): Promise<void> {
  if (!ops.length) return;
  const CHUNK_SIZE = 380;
  try {
    for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
      const chunk = ops.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const op of chunk) {
        if (op.type === 'set') {
          batch.set(op.ref, op.data);
        } else if (op.type === 'update') {
          batch.update(op.ref, op.data);
        } else {
          batch.delete(op.ref);
        }
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathLabel);
  }
}

export function buildStockIncrementOp(
  productId: string,
  deltas: { godown?: number; normal?: number; ac?: number }
): BatchOp | null {
  const updateData: Record<string, any> = {};
  if (deltas.godown) updateData.godown = increment(deltas.godown);
  if (deltas.normal) updateData.normal = increment(deltas.normal);
  if (deltas.ac) updateData.ac = increment(deltas.ac);
  if (Object.keys(updateData).length === 0) return null;
  updateData.updatedAt = serverTimestamp();
  return {
    type: 'update',
    ref: doc(db, 'stock', productId),
    data: updateData,
  };
}

export function toFirestoreStaffUser(u: User, memberEmails: string[], isCreate = true): Record<string, any> {
  const base: Record<string, any> = {
    userId: clampStr(u.userId, 64),
    username: clampStr(u.username, 64),
    fullName: clampStr(u.fullName, 120),
    role: u.role,
    active: Boolean(u.active),
    mustChange: Boolean(u.mustChange),
    password: clampStr(u.password || 'changeme123', 128),
    createdAtStr: clampStr(u.createdAt || '', 40),
    memberEmails: sanitizeEmailList(memberEmails),
    updatedAt: serverTimestamp(),
  };
  if (u.counter === 'NORMAL' || u.counter === 'AC') base.counter = u.counter;
  if (u.updatedAt) base.updatedAtStr = clampStr(u.updatedAt, 40);
  if (isCreate) base.createdAt = serverTimestamp();
  return base;
}

export function fromFirestoreStaffUser(data: any): User {
  return {
    userId: data.userId,
    username: data.username,
    fullName: data.fullName,
    role: data.role,
    counter: data.counter || undefined,
    active: Boolean(data.active),
    mustChange: Boolean(data.mustChange),
    password: data.password,
    createdAt: data.createdAtStr || '',
    updatedAt: data.updatedAtStr || undefined,
  };
}

export function toFirestoreProduct(p: Product, memberEmails: string[], isCreate = true): Record<string, any> {
  const base: Record<string, any> = {
    productId: clampStr(p.productId, 64),
    name: clampStr(p.name, 140),
    category: clampStr(p.category, 80),
    sizeML: Math.max(0, Number(p.sizeML) || 0),
    casePack: Math.max(1, Number(p.casePack) || 1),
    sellingPrice: Math.max(0, Number(p.sellingPrice) || 0),
    active: Boolean(p.active),
    memberEmails: sanitizeEmailList(memberEmails),
    updatedAt: serverTimestamp(),
  };
  if (p.updatedAt) base.updatedAtStr = clampStr(p.updatedAt, 40);
  if (p.updatedBy) base.updatedBy = clampStr(p.updatedBy, 80);
  if (isCreate) base.createdAt = serverTimestamp();
  return base;
}

export function fromFirestoreProduct(data: any): Product {
  return {
    productId: data.productId,
    name: data.name,
    category: data.category,
    sizeML: Number(data.sizeML) || 0,
    casePack: Number(data.casePack) || 1,
    sellingPrice: Number(data.sellingPrice) || 0,
    active: data.active !== false,
    updatedAt: data.updatedAtStr || undefined,
    updatedBy: data.updatedBy || undefined,
  };
}

export function toFirestoreStockLevel(
  productId: string,
  val: { godown: number; normal: number; ac: number },
  memberEmails: string[],
  isCreate = true
): Record<string, any> {
  const base: Record<string, any> = {
    productId: clampStr(productId, 64),
    godown: Math.max(0, Number(val.godown) || 0),
    normal: Math.max(0, Number(val.normal) || 0),
    ac: Math.max(0, Number(val.ac) || 0),
    memberEmails: sanitizeEmailList(memberEmails),
    updatedAt: serverTimestamp(),
  };
  if (isCreate) base.createdAt = serverTimestamp();
  return base;
}

export function toFirestorePurchaseBatch(b: PurchaseBatch, memberEmails: string[], isCreate = true): Record<string, any> {
  const safeLines = stripUndefinedDeep((b.lines || []).slice(0, 200));
  const base: Record<string, any> = {
    batchId: clampStr(b.batchId, 64),
    supplier: clampStr(b.supplier, 160),
    date: clampStr(b.date, 20),
    billDate: clampStr(b.billDate, 20),
    invoiceNo: clampStr(b.invoiceNo, 80),
    permitNumber: clampStr(b.permitNumber || 'N/A', 80),
    documentNumber: clampStr(b.documentNumber || 'N/A', 80),
    status: b.status,
    lines: safeLines,
    totalQty: Math.max(0, Number(b.totalQty) || 0),
    grossTotal: Math.max(0, Number(b.grossTotal) || 0),
    sedTotal: Math.max(0, Number(b.sedTotal) || 0),
    discountTotal: Math.max(0, Number(b.discountTotal) || 0),
    tcsTotal: Math.max(0, Number(b.tcsTotal) || 0),
    netTotal: Math.max(0, Number(b.netTotal) || 0),
    createdBy: clampStr(b.createdBy || 'admin', 80),
    createdAtStr: clampStr(b.createdAt || new Date().toISOString(), 40),
    memberEmails: sanitizeEmailList(memberEmails),
    updatedAt: serverTimestamp(),
  };
  if (b.reviewedBy) base.reviewedBy = clampStr(b.reviewedBy, 80);
  if (b.reviewedAt) base.reviewedAtStr = clampStr(b.reviewedAt, 40);
  if (b.remark !== undefined) base.remark = clampStr(b.remark, 300);
  if (isCreate) base.createdAt = serverTimestamp();
  return base;
}

export function fromFirestorePurchaseBatch(data: any): PurchaseBatch {
  return {
    batchId: data.batchId,
    supplier: data.supplier,
    date: data.date,
    billDate: data.billDate,
    invoiceNo: data.invoiceNo,
    permitNumber: data.permitNumber,
    documentNumber: data.documentNumber,
    status: data.status,
    lines: Array.isArray(data.lines) ? data.lines : [],
    totalQty: Number(data.totalQty) || 0,
    grossTotal: Number(data.grossTotal) || 0,
    sedTotal: Number(data.sedTotal) || 0,
    discountTotal: Number(data.discountTotal) || 0,
    tcsTotal: Number(data.tcsTotal) || 0,
    netTotal: Number(data.netTotal) || 0,
    createdBy: data.createdBy,
    createdAt: data.createdAtStr || '',
    reviewedBy: data.reviewedBy,
    reviewedAt: data.reviewedAtStr,
    remark: data.remark,
  };
}

export function toFirestoreStockRequest(r: StockRequestItem, memberEmails: string[], isCreate = true): Record<string, any> {
  const base: Record<string, any> = {
    requestId: clampStr(r.requestId, 64),
    counter: r.counter,
    productId: clampStr(r.productId, 64),
    productName: clampStr(r.productName, 160),
    category: clampStr(r.category, 80),
    sizeML: Math.max(0, Number(r.sizeML) || 0),
    casePack: Math.max(1, Number(r.casePack) || 1),
    qty: Math.max(0, Number(r.qty) || 0),
    enteredQty: Math.max(0, Number(r.enteredQty) || 0),
    unit: r.unit,
    reason: clampStr(r.reason || '', 240),
    status: r.status,
    date: clampStr(r.date, 20),
    createdBy: clampStr(r.createdBy || 'staff', 80),
    createdAtStr: clampStr(r.createdAt || '', 40),
    memberEmails: sanitizeEmailList(memberEmails),
    updatedAt: serverTimestamp(),
  };
  if (r.reviewedBy) base.reviewedBy = clampStr(r.reviewedBy, 80);
  if (r.reviewedAt) base.reviewedAtStr = clampStr(r.reviewedAt, 40);
  if (r.remark !== undefined) base.remark = clampStr(r.remark, 300);
  if (isCreate) base.createdAt = serverTimestamp();
  return base;
}

export function fromFirestoreStockRequest(data: any): StockRequestItem {
  return {
    requestId: data.requestId,
    counter: data.counter,
    productId: data.productId,
    productName: data.productName,
    category: data.category,
    sizeML: Number(data.sizeML) || 0,
    casePack: Number(data.casePack) || 1,
    qty: Number(data.qty) || 0,
    enteredQty: Number(data.enteredQty) || 0,
    unit: data.unit,
    reason: data.reason || '',
    status: data.status,
    date: data.date,
    createdBy: data.createdBy,
    createdAt: data.createdAtStr || '',
    reviewedBy: data.reviewedBy,
    reviewedAt: data.reviewedAtStr,
    remark: data.remark,
  };
}

export function toFirestoreStockTransfer(t: StockTransfer, memberEmails: string[], isCreate = true): Record<string, any> {
  const base: Record<string, any> = {
    transferId: clampStr(t.transferId, 64),
    type: t.type,
    fromLoc: t.fromLoc,
    toLoc: t.toLoc,
    productId: clampStr(t.productId, 64),
    productName: clampStr(t.productName, 160),
    casePack: Math.max(1, Number(t.casePack) || 1),
    qty: Math.max(0, Number(t.qty) || 0),
    status: t.status,
    createdBy: clampStr(t.createdBy || 'admin', 80),
    createdAtStr: clampStr(t.createdAt || '', 40),
    memberEmails: sanitizeEmailList(memberEmails),
    updatedAt: serverTimestamp(),
  };
  if (t.enteredQty !== undefined) base.enteredQty = Number(t.enteredQty) || 0;
  if (t.unit) base.unit = t.unit;
  if (t.note !== undefined) base.note = clampStr(t.note, 240);
  if (t.reviewedBy) base.reviewedBy = clampStr(t.reviewedBy, 80);
  if (t.reviewedAt) base.reviewedAtStr = clampStr(t.reviewedAt, 40);
  if (t.remark !== undefined) base.remark = clampStr(t.remark, 300);
  if (isCreate) base.createdAt = serverTimestamp();
  return base;
}

export function fromFirestoreStockTransfer(data: any): StockTransfer {
  return {
    transferId: data.transferId,
    type: data.type,
    fromLoc: data.fromLoc,
    toLoc: data.toLoc,
    productId: data.productId,
    productName: data.productName,
    casePack: Number(data.casePack) || 1,
    qty: Number(data.qty) || 0,
    enteredQty: data.enteredQty,
    unit: data.unit,
    note: data.note,
    status: data.status,
    createdBy: data.createdBy,
    createdAt: data.createdAtStr || '',
    reviewedBy: data.reviewedBy,
    reviewedAt: data.reviewedAtStr,
    remark: data.remark,
  };
}

export function toFirestoreDailySalesReport(r: DailySalesReport, memberEmails: string[], isCreate = true): Record<string, any> {
  const safeLines = stripUndefinedDeep((r.lines || []).slice(0, 300));
  const base: Record<string, any> = {
    reportId: clampStr(r.reportId, 64),
    date: clampStr(r.date, 20),
    counter: r.counter,
    status: r.status,
    totalSoldQty: Math.max(0, Number(r.totalSoldQty) || 0),
    totalSalesValue: Math.max(0, Number(r.totalSalesValue) || 0),
    recordedAmount: Number(r.recordedAmount) || 0,
    cashAmount: Math.max(0, Number(r.cashAmount) || 0),
    upiAmount: Math.max(0, Number(r.upiAmount) || 0),
    cardAmount: Math.max(0, Number(r.cardAmount) || 0),
    cashierName: clampStr(r.cashierName || '', 100),
    helperName: clampStr(r.helperName || '', 100),
    paymentDifference: Number(r.paymentDifference) || 0,
    cutoffSeq: Number(r.cutoffSeq) || 0,
    submittedBy: clampStr(r.submittedBy || 'staff', 80),
    submittedAtStr: clampStr(r.submittedAt || '', 40),
    lines: safeLines,
    memberEmails: sanitizeEmailList(memberEmails),
    updatedAt: serverTimestamp(),
  };
  if (r.acCharges !== undefined) base.acCharges = Number(r.acCharges) || 0;
  if (r.paymentExplanation !== undefined) base.paymentExplanation = clampStr(r.paymentExplanation, 300);
  if (r.reviewedBy) base.reviewedBy = clampStr(r.reviewedBy, 80);
  if (r.reviewedAt) base.reviewedAtStr = clampStr(r.reviewedAt, 40);
  if (r.remark !== undefined) base.remark = clampStr(r.remark, 300);
  if (r.editedBy) base.editedBy = clampStr(r.editedBy, 80);
  if (r.editedAt) base.editedAtStr = clampStr(r.editedAt, 40);
  if (isCreate) base.createdAt = serverTimestamp();
  return base;
}

export function fromFirestoreDailySalesReport(data: any): DailySalesReport {
  return {
    reportId: data.reportId,
    date: data.date,
    counter: data.counter,
    status: data.status === 'Pending' ? 'Approved' : data.status,
    totalSoldQty: Number(data.totalSoldQty) || 0,
    totalSalesValue: Number(data.totalSalesValue) || 0,
    recordedAmount: Number(data.recordedAmount) || 0,
    cashAmount: Number(data.cashAmount) || 0,
    upiAmount: Number(data.upiAmount) || 0,
    cardAmount: Number(data.cardAmount) || 0,
    acCharges: data.acCharges,
    cashierName: data.cashierName || '',
    helperName: data.helperName || '',
    paymentDifference: Number(data.paymentDifference) || 0,
    paymentExplanation: data.paymentExplanation,
    cutoffSeq: Number(data.cutoffSeq) || 0,
    submittedBy: data.submittedBy,
    submittedAt: data.submittedAtStr || '',
    reviewedBy: data.reviewedBy || (data.status === 'Pending' ? 'Auto-Approved' : undefined),
    reviewedAt: data.reviewedAtStr,
    remark: data.remark,
    editedBy: data.editedBy,
    editedAt: data.editedAtStr,
    lines: Array.isArray(data.lines) ? data.lines : [],
  };
}

export function toFirestoreDailyOperation(o: DailyOperation, memberEmails: string[], isCreate = true): Record<string, any> {
  const base: Record<string, any> = {
    operationId: clampStr(o.operationId, 64),
    type: o.type,
    date: clampStr(o.date, 20),
    name: clampStr(o.name, 160),
    amount: Number(o.amount) || 0,
    status: o.status,
    createdBy: clampStr(o.createdBy || 'staff', 80),
    createdAtStr: clampStr(o.createdAt || '', 40),
    memberEmails: sanitizeEmailList(memberEmails),
    updatedAt: serverTimestamp(),
  };
  if (o.payment) base.payment = o.payment;
  if (o.roomNo !== undefined) base.roomNo = Number(o.roomNo) || 0;
  if (o.location) base.location = o.location;
  if (o.productId) base.productId = clampStr(o.productId, 64);
  if (o.productName) base.productName = clampStr(o.productName, 160);
  if (o.qty !== undefined) base.qty = Number(o.qty) || 0;
  if (o.reason !== undefined) base.reason = clampStr(o.reason, 240);
  if (o.reviewedBy) base.reviewedBy = clampStr(o.reviewedBy, 80);
  if (o.reviewedAt) base.reviewedAtStr = clampStr(o.reviewedAt, 40);
  if (o.reviewRemark !== undefined) base.reviewRemark = clampStr(o.reviewRemark, 300);
  if (isCreate) base.createdAt = serverTimestamp();
  return base;
}

export function fromFirestoreDailyOperation(data: any): DailyOperation {
  return {
    operationId: data.operationId,
    type: data.type,
    date: data.date,
    name: data.name,
    amount: Number(data.amount) || 0,
    payment: data.payment,
    roomNo: data.roomNo,
    location: data.location,
    productId: data.productId,
    productName: data.productName,
    qty: data.qty,
    reason: data.reason,
    status: data.status,
    createdBy: data.createdBy,
    createdAt: data.createdAtStr || '',
    reviewedBy: data.reviewedBy,
    reviewedAt: data.reviewedAtStr,
    reviewRemark: data.reviewRemark,
  };
}

export function toFirestoreLedgerEntry(l: StockLedgerEntry, memberEmails: string[], isCreate = true): Record<string, any> {
  const base: Record<string, any> = {
    seq: Number(l.seq) || 0,
    ledgerId: clampStr(l.ledgerId, 64),
    timestampStr: clampStr(l.timestamp, 40),
    location: l.location,
    productId: clampStr(l.productId, 64),
    delta: Number(l.delta) || 0,
    balanceAfter: Math.max(0, Number(l.balanceAfter) || 0),
    refType: l.refType,
    refId: clampStr(l.refId, 80),
    approvedBy: clampStr(l.approvedBy || 'system', 80),
    businessDate: clampStr(l.businessDate, 20),
    memberEmails: sanitizeEmailList(memberEmails),
    updatedAt: serverTimestamp(),
  };
  if (l.productName) base.productName = clampStr(l.productName, 160);
  if (isCreate) base.createdAt = serverTimestamp();
  return base;
}

export function fromFirestoreLedgerEntry(data: any): StockLedgerEntry {
  return {
    seq: Number(data.seq) || 0,
    ledgerId: data.ledgerId,
    timestamp: data.timestampStr || '',
    location: data.location,
    productId: data.productId,
    productName: data.productName,
    delta: Number(data.delta) || 0,
    balanceAfter: Number(data.balanceAfter) || 0,
    refType: data.refType,
    refId: data.refId,
    approvedBy: data.approvedBy,
    businessDate: data.businessDate,
  };
}

export function toFirestoreAuditEntry(a: AuditLogEntry, memberEmails: string[], isCreate = true): Record<string, any> {
  const base: Record<string, any> = {
    auditId: clampStr(a.auditId, 64),
    timestampStr: clampStr(a.timestamp, 40),
    userId: clampStr(a.userId || '-', 64),
    username: clampStr(a.username || 'system', 80),
    role: clampStr(a.role || 'SYSTEM', 32),
    action: clampStr(a.action, 80),
    refId: clampStr(a.refId || '', 80),
    details: clampStr(a.details || '', 500),
    memberEmails: sanitizeEmailList(memberEmails),
    updatedAt: serverTimestamp(),
  };
  if (isCreate) base.createdAt = serverTimestamp();
  return base;
}

export function fromFirestoreAuditEntry(data: any): AuditLogEntry {
  return {
    auditId: data.auditId,
    timestamp: data.timestampStr || '',
    userId: data.userId,
    username: data.username,
    role: data.role,
    action: data.action,
    refId: data.refId,
    details: data.details,
  };
}

export function toFirestoreDropdownOption(d: DropdownOption, memberEmails: string[], isCreate = true): Record<string, any> {
  const base: Record<string, any> = {
    optionId: clampStr(d.optionId, 64),
    type: d.type,
    value: clampStr(d.value, 140),
    active: Boolean(d.active),
    createdAtStr: clampStr(d.createdAt || '', 40),
    memberEmails: sanitizeEmailList(memberEmails),
    updatedAt: serverTimestamp(),
  };
  if (isCreate) base.createdAt = serverTimestamp();
  return base;
}

export function fromFirestoreDropdownOption(data: any): DropdownOption {
  return {
    optionId: data.optionId,
    type: data.type,
    value: data.value,
    active: data.active !== false,
    createdAt: data.createdAtStr || '',
  };
}
