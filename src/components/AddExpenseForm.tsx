import React, { useState, useEffect } from 'react';
import { User, SplitType, ExpenseSplit } from '../types.ts';
import { Landmark, Check, AlertCircle, Percent, Coins, Users } from 'lucide-react';

interface AddExpenseFormProps {
  groupId: string;
  members: User[];
  currentUser: User | null;
  onSubmitExpense: (expenseData: {
    amount: number;
    description: string;
    paidBy: string;
    splitType: SplitType;
    splits: { userId: string; amountOwed: number; percentage?: number; shareCount?: number }[];
  }) => Promise<void>;
  onCancel: () => void;
}

export default function AddExpenseForm({
  groupId,
  members,
  currentUser,
  onSubmitExpense,
  onCancel
}: AddExpenseFormProps) {
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [paidBy, setPaidBy] = useState(currentUser?.id || '');
  const [splitType, setSplitType] = useState<SplitType>('equal');

  // Multi-user distribution structures
  const [selectedSplitMembers, setSelectedSplitMembers] = useState<string[]>(
    members.map(m => m.id)
  );

  // States for custom allocations
  const [unequalAmounts, setUnequalAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [shares, setShares] = useState<Record<string, string>>({});

  const [validationError, setValidationError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-sync select options if member roster shifts or paidBy changes
  useEffect(() => {
    if (currentUser && !paidBy) {
      setPaidBy(currentUser.id);
    }
    // Default select everyone to share
    setSelectedSplitMembers(members.map(m => m.id));
  }, [members, currentUser]);

  // Handle equal default distribution on amount change
  const amount = parseFloat(amountStr) || 0;

  const handleMemberToggle = (memberId: string) => {
    if (selectedSplitMembers.includes(memberId)) {
      if (selectedSplitMembers.length > 1) {
        setSelectedSplitMembers(selectedSplitMembers.filter(id => id !== memberId));
      }
    } else {
      setSelectedSplitMembers([...selectedSplitMembers, memberId]);
    }
  };

  // Main submission coordinator
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!description.trim()) {
      setValidationError('Description is required');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setValidationError('Please specify a positive valid invoice charge ($)');
      return;
    }
    if (!paidBy) {
      setValidationError('Please designate who paid for this expense');
      return;
    }
    if (selectedSplitMembers.length === 0) {
      setValidationError('At least one group member must share the bill');
      return;
    }

    const payloadSplits: { userId: string; amountOwed: number; percentage?: number; shareCount?: number }[] = [];

    if (splitType === 'equal') {
      const perUserOwed = Math.round((amount / selectedSplitMembers.length) * 100) / 100;
      let calculatedSum = 0;

      // Select users owe standard share
      selectedSplitMembers.forEach((userId, idx) => {
        // Last member takes care of general floor rounding leftovers
        const userOwed = idx === selectedSplitMembers.length - 1 ? (amount - calculatedSum) : perUserOwed;
        calculatedSum += userOwed;

        payloadSplits.push({
          userId,
          amountOwed: Math.round(userOwed * 100) / 100
        });
      });
    } 
    else if (splitType === 'unequal') {
      let calcSum = 0;
      for (const userId of selectedSplitMembers) {
        const val = parseFloat(unequalAmounts[userId]) || 0;
        if (val < 0) {
          setValidationError('Custom amounts owe cannot be negative');
          return;
        }
        calcSum += val;
        payloadSplits.push({
          userId,
          amountOwed: Math.round(val * 100) / 100
        });
      }

      // Check sum constraint
      if (Math.abs(calcSum - amount) > 0.02) {
        setValidationError(`Sum of member shares ($${calcSum.toFixed(2)}) must exactly match invoice amount ($${amount.toFixed(2)})`);
        return;
      }
    } 
    else if (splitType === 'percentage') {
      let percentTotal = 0;
      for (const userId of selectedSplitMembers) {
        const pct = parseFloat(percentages[userId]) || 0;
        if (pct < 0) {
          setValidationError('Percentage share cannot be negative');
          return;
        }
        percentTotal += pct;
      }

      if (Math.abs(percentTotal - 100) > 0.1) {
        setValidationError(`Sum of percentages must exactly equal 100% (Current total is ${percentTotal}%)`);
        return;
      }

      let calcSum = 0;
      selectedSplitMembers.forEach((userId, idx) => {
        const pct = parseFloat(percentages[userId]) || 0;
        const userOwed = idx === selectedSplitMembers.length - 1 
          ? (amount - calcSum) 
          : (amount * pct) / 100;
        calcSum += Math.round(userOwed * 100) / 100;

        payloadSplits.push({
          userId,
          amountOwed: Math.round(userOwed * 100) / 100,
          percentage: pct
        });
      });
    } 
    else if (splitType === 'share') {
      let shareTotal = 0;
      for (const userId of selectedSplitMembers) {
        const wt = parseFloat(shares[userId]) || 0;
        if (wt <= 0) {
          setValidationError(`Weight for user must be a positive non-zero share`);
          return;
        }
        shareTotal += wt;
      }

      if (shareTotal <= 0) {
        setValidationError('Sum of share counts must be greater than zero');
        return;
      }

      let calcSum = 0;
      selectedSplitMembers.forEach((userId, idx) => {
        const wt = parseFloat(shares[userId]) || 0;
        const userOwed = idx === selectedSplitMembers.length - 1
          ? (amount - calcSum)
          : (amount * wt) / shareTotal;
        calcSum += Math.round(userOwed * 100) / 100;

        payloadSplits.push({
          userId,
          amountOwed: Math.round(userOwed * 100) / 100,
          shareCount: wt
        });
      });
    }

    setLoading(true);
    try {
      await onSubmitExpense({
        amount,
        description,
        paidBy,
        splitType,
        splits: payloadSplits
      });
    } catch (err: any) {
      setValidationError(err.message || 'Validation Failure');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="add-expense-container" className="bg-white rounded-2xl border border-slate-100 shadow-lg p-5 max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-emerald-500 text-white p-2 rounded-xl">
          <Landmark size={20} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Add Group Expense</h3>
          <p className="text-3xs text-slate-400 uppercase font-bold tracking-wider font-mono">Ledger Transaction Entry</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Core Description and Cost */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-2xs font-bold text-slate-500 mb-1 uppercase font-mono">Invoice Description</label>
            <input
              id="input-exp-desc"
              type="text"
              required
              placeholder="e.g. Sushi Dinner, Uber ride"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-500 transition-all font-medium text-slate-800"
            />
          </div>
          <div>
            <label className="block text-2xs font-bold text-slate-500 mb-1 uppercase font-mono">Charged amount ($)</label>
            <input
              id="input-exp-amount"
              type="number"
              step="0.01"
              required
              min="0.01"
              placeholder="0.00"
              value={amountStr}
              onChange={e => setAmountStr(e.target.value)}
              className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-500 transition-all font-mono font-bold text-slate-800"
            />
          </div>
        </div>

        {/* Paid By Node */}
        <div>
          <label className="block text-2xs font-bold text-slate-500 mb-1 uppercase font-mono">Who Paid for this invoice?</label>
          <select
            id="select-exp-payer"
            value={paidBy}
            onChange={e => setPaidBy(e.target.value)}
            className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-500 transition-all font-semibold text-slate-700"
          >
            {members.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.email})
              </option>
            ))}
          </select>
        </div>

        {/* Split Strategy picker */}
        <div>
          <label className="block text-2xs font-bold text-slate-500 mb-1 uppercase font-mono">Allocation Strategy</label>
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl">
            {(['equal', 'unequal', 'percentage', 'share'] as SplitType[]).map((type) => (
              <button
                type="button"
                key={type}
                id={`btn-split-type-${type}`}
                onClick={() => setSplitType(type)}
                className={`py-1.5 px-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                  splitType === type
                    ? 'bg-white text-emerald-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Member Selector and Strategic allocation inputs */}
        <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 font-mono flex items-center gap-1">
              <Users size={12} />
              Invoice Cohort Dividends
            </span>
            <span className="text-3xs text-slate-400 font-semibold font-mono">
              Selected: {selectedSplitMembers.length}
            </span>
          </div>

          <div className="space-y-1.5 divide-y divide-slate-100 max-h-[170px] overflow-y-auto pr-1">
            {members.map(m => {
              const checked = selectedSplitMembers.includes(m.id);
              return (
                <div key={m.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleMemberToggle(m.id)}
                      className={`w-4 h-4 rounded-md border flex items-center justify-center cursor-pointer flex-shrink-0 transition-all ${
                        checked
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-300 hover:border-emerald-500 bg-white'
                      }`}
                    >
                      {checked && <Check size={10} strokeWidth={4} />}
                    </button>
                    <img src={m.avatar} alt={m.name} className="w-5 h-5 rounded-full flex-shrink-0" referrerPolicy="no-referrer" />
                    <span className="text-xs font-semibold text-slate-700 truncate">{m.name}</span>
                  </div>

                  {/* Allocation inputs conditional on split mode type */}
                  {checked && (
                    <div className="flex-shrink-0 w-24">
                      {splitType === 'equal' && (
                        <div id={`alloc-equal-val-${m.id}`} className="text-right text-xs font-mono font-bold text-slate-500">
                          ${amount > 0 ? (amount / selectedSplitMembers.length).toFixed(2) : '0.00'}
                        </div>
                      )}

                      {splitType === 'unequal' && (
                        <div className="relative flex items-center">
                          <span className="absolute left-2 text-[10px] text-slate-400 font-bold font-mono">$</span>
                          <input
                            id={`alloc-unequal-input-${m.id}`}
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={unequalAmounts[m.id] || ''}
                            onChange={e => setUnequalAmounts({ ...unequalAmounts, [m.id]: e.target.value })}
                            className="w-full text-right text-xs font-mono py-1 pl-5 pr-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                          />
                        </div>
                      )}

                      {splitType === 'percentage' && (
                        <div className="relative flex items-center">
                          <input
                            id={`alloc-percentage-input-${m.id}`}
                            type="number"
                            placeholder="0%"
                            value={percentages[m.id] || ''}
                            onChange={e => setPercentages({ ...percentages, [m.id]: e.target.value })}
                            className="w-full text-right text-xs font-mono py-1 pl-2 pr-5 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                          />
                          <Percent size={10} className="absolute right-2 text-slate-400" />
                        </div>
                      )}

                      {splitType === 'share' && (
                        <div className="relative flex items-center">
                          <input
                            id={`alloc-share-input-${m.id}`}
                            type="number"
                            placeholder="1"
                            value={shares[m.id] !== undefined ? shares[m.id] : '1'}
                            onChange={e => setShares({ ...shares, [m.id]: e.target.value })}
                            className="w-full text-right text-xs font-mono py-1 pl-2 pr-5 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                          />
                          <Coins size={10} className="absolute right-2 text-emerald-500/70" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Validation Errors */}
        {validationError && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 flex items-start gap-2">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <p className="text-2xs font-semibold leading-relaxed">{validationError}</p>
          </div>
        )}

        {/* Action Panel */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            id="btn-cancel-expense"
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="btn-submit-expense"
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white rounded-xl shadow-md cursor-pointer transition-colors"
          >
            {loading ? 'Submitting...' : 'Mark Expense'}
          </button>
        </div>
      </form>
    </div>
  );
}
