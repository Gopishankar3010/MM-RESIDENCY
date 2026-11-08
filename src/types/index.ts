export type Role = 'ADMIN' | 'NORMAL' | 'AC';
export type CounterLocation = 'NORMAL' | 'AC';
export type StockLocation = 'GODOWN' | 'NORMAL' | 'AC';

export interface User {
  userId: string;
  username: string;
  fullName: string;
  role: Role;
  counter?: CounterLocation;
  active: boolean;
  mustChange: boolean;
  createdAt: string;
  password?: string;
}

export interface Product {
  productId: string;
  name: string;
  category: string;
  sizeML: number;
  casePack: number;
  sellingPrice: number;
  active: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface StockItem {
  productId: string;
  name: string;
  category: string;
  sizeML: number;
  casePack: number;
  price: number;
  godown: number;
  godownAvailable: number;
  normal: number;
  ac: number;
  active: boolean;
}

export interface PurchaseLine {
  id?: string;
  productId: string;
  productName?: string;
  casePack?: number;
  qty: number; // in bottles
  enteredQty?: number;
  unit?: 'CASE' | 'BOTTLE';
  rate: number; // per bottle
  enteredPrice?: number;
  invoiceNo?: string;
  sedAmt: number;
  discountAmt: number;
  tcsPct: number;
  grossAmount: number;
  netAmount: number;
}

export interface PurchaseBatch {
  batchId: string;
  supplier: string;
  date: string;
  billDate: string;
  invoiceNo: string;
  permitNumber?: string;
  documentNumber?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  lines: PurchaseLine[];
  totalQty: number; // in bottles
  grossTotal: number;
  sedTotal: number;
  discountTotal: number;
  tcsTotal: number;
  netTotal: number;
  createdBy: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  remark?: string;
}

export interface StockRequestItem {
  requestId: string;
  counter: CounterLocation;
  productId: string;
  productName: string;
  category: string;
  sizeML: number;
  casePack: number;
  qty: number; // in bottles
  enteredQty: number;
  unit: 'CASE' | 'BOTTLE' | 'MIXED';
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  date: string;
  createdBy: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  remark?: string;
  godownQty?: number;
  short?: boolean;
}

export interface RequestGroup {
  groupKey: string;
  counter: CounterLocation;
  date: string;
  reason: string;
  by: string;
  at: string;
  items: StockRequestItem[];
  totalBottles: number;
  shortCount: number;
}

export interface StockTransfer {
  transferId: string;
  type: 'GODOWN_TO_COUNTER' | 'COUNTER_TO_COUNTER';
  fromLoc: StockLocation;
  toLoc: StockLocation;
  productId: string;
  productName: string;
  casePack: number;
  qty: number; // in bottles
  enteredQty?: number;
  unit?: 'CASE' | 'BOTTLE';
  note?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdBy: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  remark?: string;
  sourceQty?: number;
}

export interface DailySalesLine {
  lineId: string;
  reportId: string;
  productId: string;
  name?: string;
  category?: string;
  sizeML?: number;
  casePack?: number;
  opening: number;
  godownIn: number;
  transferIn: number;
  transferOut: number;
  damageOut: number;
  inQty: number;
  outQty: number;
  available: number;
  closing: number;
  sold: number;
  price: number;
  value: number;
}

export interface DailySalesReport {
  reportId: string;
  date: string;
  counter: CounterLocation;
  status: 'Pending' | 'Approved' | 'Rejected';
  totalSoldQty: number;
  totalSalesValue: number;
  recordedAmount: number;
  cashAmount: number;
  upiAmount: number;
  cardAmount: number;
  cashierName: string;
  helperName: string;
  paymentDifference: number;
  paymentExplanation?: string;
  cutoffSeq: number;
  submittedBy: string;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  remark?: string;
  editedBy?: string;
  editedAt?: string;
  lines: DailySalesLine[];
}

export interface DailyOperation {
  operationId: string;
  type: 'EXPENSE' | 'WAGE' | 'ROOM' | 'DAMAGE';
  date: string;
  name: string; // expense type, employee name, guest name, damage reason
  amount: number;
  payment?: 'Cash' | 'UPI' | 'Card';
  roomNo?: number;
  location?: StockLocation;
  productId?: string;
  productName?: string;
  qty?: number;
  reason?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdBy: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewRemark?: string;
}

export interface StockLedgerEntry {
  seq: number;
  ledgerId: string;
  timestamp: string;
  location: StockLocation;
  productId: string;
  productName?: string;
  delta: number;
  balanceAfter: number;
  refType: 'PURCHASE' | 'PURCHASE_CORRECTION' | 'REQUEST' | 'TRANSFER' | 'SALE' | 'SALES_CORRECTION' | 'DAMAGE' | 'OPENING';
  refId: string;
  approvedBy: string;
  businessDate: string;
}

export interface AuditLogEntry {
  auditId: string;
  timestamp: string;
  userId: string;
  username: string;
  role: string;
  action: string;
  refId: string;
  details: string;
}

export interface DropdownOption {
  optionId: string;
  type: 'EXPENSE' | 'WAGE';
  value: string;
  active: boolean;
  createdAt: string;
}
