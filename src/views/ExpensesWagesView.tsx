import React, { useState } from 'react';
import { useStock } from '../context/StockContext';
import { Plus, Trash2, Wallet, PlusCircle, Check } from 'lucide-react';

interface EntryRow {
  name: string;
  amount: string;
  note: string;
}

export const ExpensesWagesView: React.FC = () => {
  const { businessDate, operations, dropdownOptions, saveDailyOperationsBatch, addDropdownOption } = useStock();

  // Tabular state for expenses
  const [expenseRows, setExpenseRows] = useState<EntryRow[]>([{ name: '', amount: '', note: '' }]);
  // Tabular state for wages
  const [wageRows, setWageRows] = useState<EntryRow[]>([{ name: '', amount: '', note: '' }]);

  // Add custom option dialog
  const [showAddOptionModal, setShowAddOptionModal] = useState<{ type: 'EXPENSE' | 'WAGE' } | null>(null);
  const [newOptionValue, setNewOptionValue] = useState('');

  const [statusMessage, setStatusMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const expenseOptions = dropdownOptions.filter(o => o.type === 'EXPENSE' && o.active);
  const wageOptions = dropdownOptions.filter(o => o.type === 'WAGE' && o.active);

  const formatCurrency = (val: number) => '₹' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Calculate totals
  const totalExpenseForm = expenseRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalWageForm = wageRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  // Filter operations for current business date
  const dayExpenses = operations.filter(o => o.type === 'EXPENSE' && o.date === businessDate);
  const dayWages = operations.filter(o => o.type === 'WAGE' && o.date === businessDate);

  const handleSaveExpenses = async () => {
    try {
      setStatusMessage(null);
      const validItems = expenseRows
        .filter(r => r.name.trim() && Number(r.amount) > 0)
        .map(r => ({
          name: r.name.trim(),
          amount: Number(r.amount),
          note: r.note.trim()
        }));

      if (!validItems.length) throw new Error('Add at least one valid expense row with name and positive amount.');

      const res = await saveDailyOperationsBatch({
        type: 'EXPENSE',
        date: businessDate,
        items: validItems
      });

      setStatusMessage({ type: 'ok', text: `Saved ${res.count} expense entries totaling ${formatCurrency(res.total)}!` });
      setExpenseRows([{ name: '', amount: '', note: '' }]);
    } catch (e: any) {
      setStatusMessage({ type: 'err', text: e.message });
    }
  };

  const handleSaveWages = async () => {
    try {
      setStatusMessage(null);
      const validItems = wageRows
        .filter(r => r.name.trim() && Number(r.amount) > 0)
        .map(r => ({
          name: r.name.trim(),
          amount: Number(r.amount),
          note: r.note.trim()
        }));

      if (!validItems.length) throw new Error('Add at least one valid wage row with employee name and positive amount.');

      const res = await saveDailyOperationsBatch({
        type: 'WAGE',
        date: businessDate,
        items: validItems
      });

      setStatusMessage({ type: 'ok', text: `Saved ${res.count} wage payouts totaling ${formatCurrency(res.total)}!` });
      setWageRows([{ name: '', amount: '', note: '' }]);
    } catch (e: any) {
      setStatusMessage({ type: 'err', text: e.message });
    }
  };

  const handleAddOptionSubmit = async () => {
    if (!showAddOptionModal || !newOptionValue.trim()) return;
    try {
      await addDropdownOption(showAddOptionModal.type, newOptionValue.trim());
      setNewOptionValue('');
      setShowAddOptionModal(null);
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[11px] font-extrabold tracking-widest text-amber-600 dark:text-amber-400 uppercase">
          Daily Outflows
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Expenses & Wages
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Record operational costs and daily helper/cashier wage payouts for {businessDate}
        </p>
      </div>

      {statusMessage && (
        <div
          className={`rounded-xl border p-4 text-xs font-semibold ${
            statusMessage.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* SECTION 1: DAILY EXPENSES */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Daily Operational Expenses</h2>
            <p className="text-xs text-slate-500">Add cleaning, ice, water, snacks, generator diesel or utility charges</p>
          </div>
          <button
            onClick={() => setShowAddOptionModal({ type: 'EXPENSE' })}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <PlusCircle className="h-3.5 w-3.5 text-amber-500" />
            <span>+ New Expense Category</span>
          </button>
        </div>

        {/* Expenses Table Input */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">Expense Category</th>
                <th className="py-2.5 px-3 w-40">Amount (₹)</th>
                <th className="py-2.5 px-3">Note / Memo</th>
                <th className="py-2.5 px-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {expenseRows.map((row, idx) => (
                <tr key={idx}>
                  <td className="py-2 px-3">
                    <select
                      value={row.name}
                      onChange={e => {
                        const val = e.target.value;
                        setExpenseRows(prev => prev.map((r, i) => i === idx ? { ...r, name: val } : r));
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">Select category...</option>
                      {expenseOptions.map(o => (
                        <option key={o.optionId} value={o.value}>{o.value}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={row.amount}
                      onChange={e => {
                        const val = e.target.value;
                        setExpenseRows(prev => prev.map((r, i) => i === idx ? { ...r, amount: val } : r));
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-xs font-bold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      placeholder="Optional memo..."
                      value={row.note}
                      onChange={e => {
                        const val = e.target.value;
                        setExpenseRows(prev => prev.map((r, i) => i === idx ? { ...r, note: val } : r));
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </td>
                  <td className="py-2 px-3 text-center">
                    {expenseRows.length > 1 && (
                      <button
                        onClick={() => setExpenseRows(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t font-bold bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
                <td className="py-2.5 px-3">Total Expense Outflow</td>
                <td className="py-2.5 px-3 font-mono text-sm text-red-600 dark:text-red-400">
                  {formatCurrency(totalExpenseForm)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setExpenseRows(prev => [...prev, { name: '', amount: '', note: '' }])}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Add Row</span>
          </button>

          <button
            disabled={totalExpenseForm <= 0}
            onClick={handleSaveExpenses}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-40 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 transition-colors"
          >
            <Check className="h-4 w-4" />
            <span>Save Expenses ({formatCurrency(totalExpenseForm)})</span>
          </button>
        </div>

        {/* Existing Expense Entries Today */}
        {dayExpenses.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Recorded Expenses on {businessDate}
            </h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {dayExpenses.map(e => (
                <div key={e.operationId} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{e.name}</span>
                    {e.reason && <span className="text-slate-500 ml-2">({e.reason})</span>}
                  </div>
                  <span className="font-mono font-bold text-red-600">{formatCurrency(e.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: DAILY WAGES */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Daily Helper & Cashier Wages</h2>
            <p className="text-xs text-slate-500">Record daily wages paid out to counter staff and security personnel</p>
          </div>
          <button
            onClick={() => setShowAddOptionModal({ type: 'WAGE' })}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <PlusCircle className="h-3.5 w-3.5 text-amber-500" />
            <span>+ Add Employee Name</span>
          </button>
        </div>

        {/* Wages Table Input */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">Employee Name</th>
                <th className="py-2.5 px-3 w-40">Amount Paid (₹)</th>
                <th className="py-2.5 px-3">Note / Shift</th>
                <th className="py-2.5 px-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {wageRows.map((row, idx) => (
                <tr key={idx}>
                  <td className="py-2 px-3">
                    <select
                      value={row.name}
                      onChange={e => {
                        const val = e.target.value;
                        setWageRows(prev => prev.map((r, i) => i === idx ? { ...r, name: val } : r));
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">Select employee...</option>
                      {wageOptions.map(o => (
                        <option key={o.optionId} value={o.value}>{o.value}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={row.amount}
                      onChange={e => {
                        const val = e.target.value;
                        setWageRows(prev => prev.map((r, i) => i === idx ? { ...r, amount: val } : r));
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-xs font-bold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      placeholder="Optional shift notes..."
                      value={row.note}
                      onChange={e => {
                        const val = e.target.value;
                        setWageRows(prev => prev.map((r, i) => i === idx ? { ...r, note: val } : r));
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </td>
                  <td className="py-2 px-3 text-center">
                    {wageRows.length > 1 && (
                      <button
                        onClick={() => setWageRows(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t font-bold bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
                <td className="py-2.5 px-3">Total Wage Payout</td>
                <td className="py-2.5 px-3 font-mono text-sm text-red-600 dark:text-red-400">
                  {formatCurrency(totalWageForm)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setWageRows(prev => [...prev, { name: '', amount: '', note: '' }])}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Add Row</span>
          </button>

          <button
            disabled={totalWageForm <= 0}
            onClick={handleSaveWages}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-40 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 transition-colors"
          >
            <Check className="h-4 w-4" />
            <span>Save Wages ({formatCurrency(totalWageForm)})</span>
          </button>
        </div>

        {/* Existing Wage Entries Today */}
        {dayWages.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Recorded Wage Payouts on {businessDate}
            </h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {dayWages.map(w => (
                <div key={w.operationId} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{w.name}</span>
                    {w.reason && <span className="text-slate-500 ml-2">({w.reason})</span>}
                  </div>
                  <span className="font-mono font-bold text-red-600">{formatCurrency(w.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* POPUP MODAL: Add Dropdown Option */}
      {showAddOptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {showAddOptionModal.type === 'EXPENSE' ? 'Add Expense Category' : 'Add Employee Name'}
            </h3>
            <p className="text-xs text-slate-500">
              {showAddOptionModal.type === 'EXPENSE'
                ? 'Enter the name of the new operational expense category.'
                : 'Enter the full name and role of the employee.'}
            </p>

            <input
              type="text"
              placeholder={showAddOptionModal.type === 'EXPENSE' ? 'e.g. Generator Fuel' : 'e.g. Ramesh (Bar Helper)'}
              value={newOptionValue}
              onChange={e => setNewOptionValue(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-amber-500 dark:bg-slate-800 dark:text-white dark:border-slate-700"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddOptionModal(null)}
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                disabled={!newOptionValue.trim()}
                onClick={handleAddOptionSubmit}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
