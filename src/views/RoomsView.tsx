import React, { useState } from 'react';
import { useStock } from '../context/StockContext';
import { Home, Check, CreditCard, Banknote, Smartphone } from 'lucide-react';

export const RoomsView: React.FC = () => {
  const { businessDate, operations, saveDailyOperation } = useStock();

  const [roomNo, setRoomNo] = useState('1');
  const [amount, setAmount] = useState('');
  const [payment, setPayment] = useState<'Cash' | 'UPI' | 'Card'>('Cash');
  const [guestName, setGuestName] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const formatCurrency = (val: number) => '₹' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Room entries on this date
  const roomEntries = operations.filter(o => o.type === 'ROOM' && o.date === businessDate);
  const totalRoomRevenue = roomEntries.reduce((s, r) => s + r.amount, 0);

  // Taken rooms today
  const occupiedRoomNumbers = new Set(roomEntries.map(r => r.roomNo));

  const handleRecordRent = async () => {
    try {
      setStatusMsg(null);
      const parsedRoom = Number(roomNo);
      const parsedAmt = Number(amount);

      if (!parsedRoom || parsedRoom < 1 || parsedRoom > 9) {
        throw new Error('Room number must be between 1 and 9.');
      }
      if (!parsedAmt || parsedAmt <= 0) {
        throw new Error('Enter a valid rent amount.');
      }
      if (occupiedRoomNumbers.has(parsedRoom)) {
        throw new Error(`Room ${parsedRoom} already has a rent entry for ${businessDate}.`);
      }

      await saveDailyOperation({
        type: 'ROOM',
        date: businessDate,
        name: guestName.trim() ? `Room ${parsedRoom} - ${guestName.trim()}` : `Room ${parsedRoom}`,
        amount: parsedAmt,
        payment,
        roomNo: parsedRoom
      });

      setStatusMsg({
        type: 'ok',
        text: `Room ${parsedRoom} rent of ${formatCurrency(parsedAmt)} recorded successfully via ${payment}!`
      });

      setAmount('');
      setGuestName('');
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: e.message });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[11px] font-extrabold tracking-widest text-amber-600 dark:text-amber-400 uppercase">
          Lodging & Hospitality
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Rooms Rented
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Record guest lodging collections for Rooms 1 through 9 on {businessDate}
        </p>
      </div>

      {statusMsg && (
        <div
          className={`rounded-xl border p-4 text-xs font-semibold ${
            statusMsg.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* 9 Rooms Grid Status */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Room Occupancy Overview ({occupiedRoomNumbers.size} of 9 Booked)
          </h2>
          <span className="font-mono text-xs font-bold text-emerald-600">
            Total Rent Today: {formatCurrency(totalRoomRevenue)}
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
          {Array.from({ length: 9 }, (_, i) => i + 1).map(r => {
            const isOccupied = occupiedRoomNumbers.has(r);
            const entry = roomEntries.find(e => e.roomNo === r);

            return (
              <button
                key={r}
                type="button"
                onClick={() => {
                  if (!isOccupied) setRoomNo(String(r));
                }}
                disabled={isOccupied}
                className={`rounded-xl p-3 text-center border transition-all ${
                  isOccupied
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                    : roomNo === String(r)
                    ? 'border-amber-500 bg-amber-50 text-amber-950 dark:border-amber-400 dark:bg-amber-950/40 dark:text-amber-200 ring-2 ring-amber-400'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <div className="text-[10px] font-bold uppercase text-slate-500">Room</div>
                <div className="font-mono text-lg font-black">{r}</div>
                <span className="text-[10px] block mt-0.5 font-semibold">
                  {isOccupied ? formatCurrency(entry?.amount || 0) : 'Available'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Entry Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          Record Room Rent Receipt
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Room Number
            </label>
            <select
              value={roomNo}
              onChange={e => setRoomNo(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {Array.from({ length: 9 }, (_, i) => i + 1).map(r => (
                <option key={r} value={r} disabled={occupiedRoomNumbers.has(r)}>
                  Room {r} {occupiedRoomNumbers.has(r) ? '(Already Recorded)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Rent Amount (₹) *
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="e.g. 1500.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-xs font-bold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Payment Method *
            </label>
            <select
              value={payment}
              onChange={e => setPayment(e.target.value as 'Cash' | 'UPI' | 'Card')}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="Cash">Cash Collection</option>
              <option value="UPI">UPI / GPay / PhonePe</option>
              <option value="Card">Debit / Credit Card</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Guest Name / Memo (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Mr. Vignesh"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        <button
          disabled={!amount || Number(amount) <= 0 || occupiedRoomNumbers.has(Number(roomNo))}
          onClick={handleRecordRent}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-40 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 transition-colors"
        >
          Record Room Rent Receipt
        </button>
      </div>

      {/* Room Entries History on Current Date */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Room Collections Log ({businessDate})
        </h2>

        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 font-bold uppercase text-[10px] text-slate-600 dark:text-slate-400">
                  <th className="py-3 px-4">Room #</th>
                  <th className="py-3 px-4">Rent Amount</th>
                  <th className="py-3 px-4">Payment Channel</th>
                  <th className="py-3 px-4">Guest Reference</th>
                  <th className="py-3 px-4">Recorded By</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {roomEntries.length > 0 ? (
                  roomEntries.map(r => (
                    <tr key={r.operationId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-amber-600">Room {r.roomNo}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600">
                        {formatCurrency(r.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                          {r.payment === 'Cash' && <Banknote className="h-3.5 w-3.5 text-emerald-600" />}
                          {r.payment === 'UPI' && <Smartphone className="h-3.5 w-3.5 text-blue-600" />}
                          {r.payment === 'Card' && <CreditCard className="h-3.5 w-3.5 text-purple-600" />}
                          <span>{r.payment}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{r.name}</td>
                      <td className="py-3 px-4 text-slate-500">{r.createdBy}</td>
                      <td className="py-3 px-4">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                      No rooms rented yet for {businessDate}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
