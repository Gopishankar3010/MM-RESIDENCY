import { CounterLocation, DailyOperation, DailySalesReport } from '../types';

export const roundCurrency = (value: number): number =>
  Math.round((Number(value) || 0) * 100) / 100;

export interface NormalCashOutflowBreakdown {
  expensesTotal: number;
  wagesTotal: number;
  combinedTotal: number;
}

/**
 * Approved Shop Expenses and Staff Wages totals for `date`.
 * Paid directly out of the Normal Counter cash drawer.
 */
export const getNormalCashBreakdownForDate = (
  operations: DailyOperation[],
  date: string
): NormalCashOutflowBreakdown => {
  if (!date) return { expensesTotal: 0, wagesTotal: 0, combinedTotal: 0 };
  let expensesTotal = 0;
  let wagesTotal = 0;
  operations.forEach(o => {
    if (o.date !== date || o.status !== 'Approved') return;
    if (o.type === 'EXPENSE') expensesTotal += Number(o.amount) || 0;
    else if (o.type === 'WAGE') wagesTotal += Number(o.amount) || 0;
  });
  const cleanExp = roundCurrency(expensesTotal);
  const cleanWages = roundCurrency(wagesTotal);
  return {
    expensesTotal: cleanExp,
    wagesTotal: cleanWages,
    combinedTotal: roundCurrency(cleanExp + cleanWages),
  };
};

/**
 * Total approved Shop Expenses & Staff Wages on `date`.
 * Staff pay these directly out of the Normal Counter cash drawer.
 */
export const getNormalCashOutflowsForDate = (
  operations: DailyOperation[],
  date: string
): number => getNormalCashBreakdownForDate(operations, date).combinedTotal;

/**
 * Portion of Shop Expenses & Wages on `date` credited against Normal Counter
 * liquor sales cash. If outflows exceed Normal liquor sales (or no sales exist),
 * any remainder stays unabsorbed for Consolidated Net Surplus calculation.
 */
export const getNormalExpenseCredit = (
  counter: CounterLocation,
  grossSalesValue: number,
  operations: DailyOperation[],
  date: string
): number => {
  if (counter !== 'NORMAL') return 0;
  const totalOutflows = getNormalCashOutflowsForDate(operations, date);
  const cleanSales = roundCurrency(grossSalesValue);
  if (totalOutflows <= 0 || cleanSales <= 0) return 0;
  return roundCurrency(Math.min(totalOutflows, cleanSales));
};

export interface ShiftReconciliationSummary {
  grossSalesValue: number;
  acCharges: number;
  shopOutflowsTotal: number;
  shopOutflowsCredited: number;
  expectedDrawerTotal: number;
  collectedTotal: number;
  staffDifference: number;
}

export const computeShiftReconciliation = (params: {
  counter: CounterLocation;
  date: string;
  grossSalesValue: number;
  cashAmount: number;
  upiAmount: number;
  cardAmount?: number;
  acCharges?: number;
  recordedAmountFallback?: number;
  operations: DailyOperation[];
}): ShiftReconciliationSummary => {
  const grossSalesValue = roundCurrency(params.grossSalesValue);
  const acCharges = params.counter === 'AC' ? roundCurrency(params.acCharges || 0) : 0;
  const shopOutflowsTotal =
    params.counter === 'NORMAL' ? getNormalCashOutflowsForDate(params.operations, params.date) : 0;
  const shopOutflowsCredited = getNormalExpenseCredit(
    params.counter,
    grossSalesValue,
    params.operations,
    params.date
  );
  const expectedDrawerTotal = roundCurrency(grossSalesValue + acCharges - shopOutflowsCredited);
  const componentSum = roundCurrency(
    (Number(params.cashAmount) || 0) +
      (Number(params.upiAmount) || 0) +
      (Number(params.cardAmount) || 0) +
      acCharges
  );
  const collectedTotal =
    componentSum === 0 && (Number(params.recordedAmountFallback) || 0) > 0
      ? roundCurrency(params.recordedAmountFallback || 0)
      : componentSum;
  const staffDifference = roundCurrency(collectedTotal - expectedDrawerTotal);

  return {
    grossSalesValue,
    acCharges,
    shopOutflowsTotal,
    shopOutflowsCredited,
    expectedDrawerTotal,
    collectedTotal,
    staffDifference,
  };
};

export const getReportReconciliation = (
  report: DailySalesReport,
  operations: DailyOperation[]
): ShiftReconciliationSummary =>
  computeShiftReconciliation({
    counter: report.counter,
    date: report.date,
    grossSalesValue: report.totalSalesValue || 0,
    cashAmount: report.cashAmount || 0,
    upiAmount: report.upiAmount || 0,
    cardAmount: report.cardAmount || 0,
    acCharges: report.acCharges || 0,
    recordedAmountFallback: report.recordedAmount || 0,
    operations,
  });
