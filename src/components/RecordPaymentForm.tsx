import React, { useState, useEffect } from 'react';
import { User, DebtRelation } from '../types.ts';
import { CreditCard, ArrowRight, CornerDownRight, CheckSquare } from 'lucide-react';

interface RecordPaymentFormProps {
  members: User[];
  debts: (DebtRelation & {
    fromName: string;
    fromAvatar: string;
    toName: string;
    toAvatar: string;
  })[];
  onSubmitSettlement: (settlementData: {
    payerId: string;
    payeeId: string;
    amount: number;
  }) => Promise<void>;
  onCancel: () => void;
}

export default function RecordPaymentForm({
  members,
  debts,
  onSubmitSettlement,
  onCancel
}: RecordPaymentFormProps) {
  const [payerId, setPayerId] = useState('');
  const [payeeId, setPayeeId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize dropdowns with first available options
  useEffect(() => {
    if (members.length >= 2) {
      setPayerId(members[0].id);
      setPayeeId(members[1].id);
    }
  }, [members]);

  const handleQuickSettle = async (fromId: string, toId: string, amount: number) => {
    setError('');
    setLoading(true);
    try {
      await onSubmitSettlement({
        payerId: fromId,
        payeeId: toId,
        amount
      });
    } catch (err: any) {
      setError(err.message || 'Payment recording failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const val = parseFloat(amountStr);
    if (isNaN(val) || val <= 0) {
      setError('Please specify a valid payment amount greater than zero.');
      return;
    }
    if (!payerId || !payeeId) {
      setError('Please identify both the sender (debtor) and receiver (creditor).');
      return;
    }
    if (payerId === payeeId) {
      setError('A user cannot record a debt settlement payment to themselves.');
      return;
    }

    setLoading(true);
    try {
      await onSubmitSettlement({
        payerId,
        payeeId,
        amount: val
      });
      setAmountStr('');
    } catch (err: any) {
      setError(err.message || 'Payment recording failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="record-payment-container" className="bg-white rounded-2xl border border-slate-100 shadow-lg p-5 max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="bg-emerald-500 text-white p-2 rounded-xl">
          <CreditCard size={20} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Record Settlement Payment</h3>
          <p className="text-3xs text-slate-400 uppercase font-bold tracking-wider font-mono">Settle Ledger Debts</p>
        </div>
      </div>

      {/* Suggested Settlements Section */}
      <div className="space-y-2">
        <span className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider flex items-center gap-1">
          <CornerDownRight size={12} className="text-emerald-500" />
          Suggested Quick-Settlements (Calculated Minimizer)
        </span>

        {debts.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
            <p className="text-2xs font-semibold text-slate-500 text-center">
              All group accounts are perfectly split and balanced! No outstanding debts found. 🎉
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
            {debts.map((d, index) => (
              <div
                key={index}
                id={`debt-recommendation-${index}`}
                className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10 gap-3"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="flex items-center gap-1">
                    <img src={d.fromAvatar} alt={d.fromName} className="w-4.5 h-4.5 rounded-full" referrerPolicy="no-referrer" />
                    <span className="text-2xs font-bold text-slate-700 truncate">{d.fromName.split(' ')[0]}</span>
                  </div>
                  <ArrowRight size={10} className="text-slate-400 flex-shrink-0" />
                  <div className="flex items-center gap-1">
                    <img src={d.toAvatar} alt={d.toName} className="w-4.5 h-4.5 rounded-full" referrerPolicy="no-referrer" />
                    <span className="text-2xs font-bold text-slate-700 truncate">{d.toName.split(' ')[0]}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-mono font-black text-amber-600">${d.amount.toFixed(2)}</span>
                  <button
                    id={`btn-quick-settle-${index}`}
                    onClick={() => handleQuickSettle(d.fromUser, d.toUser, d.amount)}
                    disabled={loading}
                    className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-bold text-[10px] py-1 px-3.5 rounded-lg shadow-xs cursor-pointer transition-colors"
                  >
                    <CheckSquare size={10} />
                    <span>Settle</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Entry Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5 pt-3 border-t border-slate-100">
        <span className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider">
          Or Enter Settlement Manually
        </span>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-3xs font-black text-slate-500 mb-1 uppercase font-mono">Who is Paying? (Debtor)</label>
            <select
              id="select-payer-member"
              value={payerId}
              onChange={e => setPayerId(e.target.value)}
              className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-500 font-semibold text-slate-700"
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-3xs font-black text-slate-500 mb-1 uppercase font-mono">Who is receiving? (Creditor)</label>
            <select
              id="select-payee-member"
              value={payeeId}
              onChange={e => setPayeeId(e.target.value)}
              className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-500 font-semibold text-slate-700"
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-3xs font-black text-slate-500 mb-1 uppercase font-mono">Amount Paid ($)</label>
          <input
            id="input-settle-amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="0.00"
            value={amountStr}
            onChange={e => setAmountStr(e.target.value)}
            className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-500 font-mono font-bold text-slate-800"
          />
        </div>

        {error && (
          <p className="text-2xs font-semibold text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-100">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            id="btn-cancel-settle"
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="btn-submit-settle"
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white rounded-xl shadow-md cursor-pointer transition-colors"
          >
            {loading ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </form>
    </div>
  );
}
