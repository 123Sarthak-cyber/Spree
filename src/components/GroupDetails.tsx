import React, { useState, useEffect } from 'react';
import { GroupWithMembers, User, ExpenseWithSplits, DebtRelation, BalanceSummary, Settlement } from '../types.ts';
import { Coins, UserPlus2, UserMinus2, ReceiptText, PiggyBank, CreditCard, ArrowUpRight, ArrowDownRight, WalletCards, History } from 'lucide-react';
import ExpenseDetailsModal from './ExpenseDetailsModal.tsx';
import AddExpenseForm from './AddExpenseForm.tsx';
import RecordPaymentForm from './RecordPaymentForm.tsx';

interface GroupDetailsProps {
  group: GroupWithMembers;
  systemUsers: User[];
  currentUser: User | null;
  onRefreshGroups: () => void;
}

export default function GroupDetails({
  group,
  systemUsers,
  currentUser,
  onRefreshGroups
}: GroupDetailsProps) {
  // Views layout switchers
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'settlements'>('expenses');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseWithSplits | null>(null);

  // States fetched dynamically from Express Relational APIs
  const [expenses, setExpenses] = useState<ExpenseWithSplits[]>([]);
  const [balances, setBalances] = useState<BalanceSummary[]>([]);
  const [debts, setDebts] = useState<(DebtRelation & { 
    fromName: string; fromAvatar: string; toName: string; toAvatar: string; 
  })[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  const [inviteUserId, setInviteUserId] = useState('');
  const [inviteError, setInviteError] = useState('');

  // Hydrate all child data for the group
  const loadGroupDetails = async () => {
    try {
      const gId = group.id;

      // Parallel GET fetches to maintain blazing-fast UX
      const [expRes, balRes, debtRes, setRes] = await Promise.all([
        fetch(`/api/groups/${gId}/expenses`),
        fetch(`/api/groups/${gId}/balances`),
        fetch(`/api/groups/${gId}/debts`),
        fetch(`/api/groups/${gId}/settlements`)
      ]);

      if (expRes.ok) setExpenses(await expRes.json());
      if (balRes.ok) setBalances(await balRes.json());
      if (debtRes.ok) setDebts(await debtRes.json());
      if (setRes.ok) setSettlements(await setRes.json());
    } catch (e) {
      console.error('Failed to load group sub-details:', e);
    }
  };

  useEffect(() => {
    loadGroupDetails();
  }, [group.id]);

  // Invites another user into the structural roster
  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    if (!inviteUserId) return;

    try {
      const res = await fetch(`/api/groups/${group.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: inviteUserId })
      });

      if (res.ok) {
        setInviteUserId('');
        loadGroupDetails();
        onRefreshGroups();
      } else {
        const data = await res.json();
        setInviteError(data.error || 'Inviting user failed');
      }
    } catch (err) {
      setInviteError('Internal request error');
    }
  };

  // Kicks a user from the group
  const handleRemoveUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/groups/${group.id}/members/${userId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        loadGroupDetails();
        onRefreshGroups();
      } else {
        const data = await res.json();
        alert(`Relational Constraint Lock: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Inserts a new Expense split
  const handleAddExpenseSubmit = async (expenseData: any) => {
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...expenseData,
          groupId: group.id
        })
      });

      if (res.ok) {
        setShowAddExpense(false);
        loadGroupDetails();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error);
      }
    } catch (e: any) {
      alert(`Ledger Validation Fail: ${e.message}`);
    }
  };

  // Submits a Settlement payment
  const handleRecordPaymentSubmit = async (settlementData: any) => {
    try {
      const res = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settlementData,
          groupId: group.id
        })
      });

      if (res.ok) {
        setShowRecordPayment(false);
        loadGroupDetails();
      } else {
        const data = await res.json();
        throw new Error(data.error);
      }
    } catch (e: any) {
      alert(`Ledger marker failed: ${e.message}`);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        loadGroupDetails();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSettlement = async (settlementId: string) => {
    if (confirm('Are you sure you want to delete this recorded settlement pay log?')) {
      try {
        const res = await fetch(`/api/settlements/${settlementId}`, {
          method: 'DELETE'
        });

        if (res.ok) {
          loadGroupDetails();
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Find users who can be invited to this group (in database, but not already members)
  const isMember = (uId: string) => group.members.some(m => m.id === uId);
  const inviteableUsers = systemUsers.filter(u => !isMember(u.id));

  // Compute current session's status relative to this specific group
  const myBalance = balances.find(b => b.userId === currentUser?.id)?.netBalance || 0;

  return (
    <div id={`group-details-pane-${group.id}`} className="space-y-5">
      {/* Group Detail Banner */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{group.name}</h2>
            {group.description && (
              <p className="text-xs text-slate-400 font-medium mt-0.5 leading-relaxed">{group.description}</p>
            )}
          </div>

          {/* Quick Action buttons */}
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <button
              id="btn-trigger-add-expense"
              onClick={() => {
                setShowAddExpense(true);
                setShowRecordPayment(false);
              }}
              disabled={!currentUser}
              className="flex items-center gap-1.5 cursor-pointer bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md transition-colors"
            >
              <Coins size={14} />
              <span>Add Expense</span>
            </button>
            <button
              id="btn-trigger-settle"
              onClick={() => {
                setShowRecordPayment(true);
                setShowAddExpense(false);
              }}
              disabled={!currentUser}
              className="flex items-center gap-1.5 cursor-pointer bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md transition-colors"
            >
              <CreditCard size={14} />
              <span>Settle up</span>
            </button>
          </div>
        </div>

        {/* Dynamic Balance Indicator for current session */}
        {currentUser && (
          <div className="pt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <img
                src={currentUser.avatar}
                alt="user av"
                className="w-10 h-10 rounded-full border border-slate-200"
                referrerPolicy="no-referrer"
              />
              <div>
                <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono">My Group Balance Summary</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs font-semibold text-slate-500">Net Status:</span>
                  <span className={`text-sm font-bold font-mono ${
                    myBalance > 0.01 
                      ? 'text-emerald-500' 
                      : myBalance < -0.01 
                        ? 'text-red-500' 
                        : 'text-slate-500'
                  }`}>
                    {myBalance > 0.01 
                      ? `We are owed $${myBalance.toFixed(2)}` 
                      : myBalance < -0.01 
                        ? `We owe $${Math.abs(myBalance).toFixed(2)}` 
                        : `We are completely settled up`
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Micro Stats Indicators */}
            <div className="flex items-center gap-3">
              <div className="bg-slate-50 py-1.5 px-3 rounded-xl text-center border border-slate-100">
                <span className="block text-[8px] font-bold text-slate-400 uppercase font-mono">Total Roster</span>
                <span className="text-xs font-black text-slate-700">{group.members?.length || 0} users</span>
              </div>
              <div className="bg-slate-50 py-1.5 px-3 rounded-xl text-center border border-slate-100">
                <span className="block text-[8px] font-bold text-slate-400 uppercase font-mono">Ledger Rows</span>
                <span className="text-xs font-black text-slate-700">{expenses.length} splits</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Conditional Active input sheets */}
      {showAddExpense && currentUser && (
        <AddExpenseForm
          groupId={group.id}
          members={group.members}
          currentUser={currentUser}
          onSubmitExpense={handleAddExpenseSubmit}
          onCancel={() => setShowAddExpense(false)}
        />
      )}

      {showRecordPayment && currentUser && (
        <RecordPaymentForm
          members={group.members}
          debts={debts}
          onSubmitSettlement={handleRecordPaymentSubmit}
          onCancel={() => setShowRecordPayment(false)}
        />
      )}

      {/* Core Grid: Left Content, Right Roster info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column (Lists of transactions) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden flex flex-col min-h-[400px]">
            {/* Roster tab list headers */}
            <div className="flex bg-slate-50 border-b border-slate-100 p-1">
              <button
                id="tab-btn-expenses"
                onClick={() => setActiveTab('expenses')}
                className={`flex-1 py-2 text-2xs font-bold uppercase rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  activeTab === 'expenses'
                    ? 'bg-white text-emerald-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <ReceiptText size={13} />
                <span>Expense Feed</span>
              </button>
              <button
                id="tab-btn-balances"
                onClick={() => setActiveTab('balances')}
                className={`flex-1 py-2 text-2xs font-bold uppercase rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  activeTab === 'balances'
                    ? 'bg-white text-emerald-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <PiggyBank size={13} />
                <span>Balances</span>
              </button>
              <button
                id="tab-btn-settlements"
                onClick={() => setActiveTab('settlements')}
                className={`flex-1 py-2 text-2xs font-bold uppercase rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  activeTab === 'settlements'
                    ? 'bg-white text-emerald-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <History size={13} />
                <span>Settlements</span>
              </button>
            </div>

            {/* Tab view components */}
            <div className="p-4 flex-1">
              {/* EXPENSES TAB */}
              {activeTab === 'expenses' && (
                <div className="space-y-2">
                  {expenses.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      No expenses logged for this group yet. Add one above!
                    </div>
                  ) : (
                    expenses.map(e => {
                      const isSelfPayer = e.paidBy === currentUser?.id;
                      const mySplit = e.splits.find(s => s.userId === currentUser?.id);
                      const mySplitAmount = mySplit?.amountOwed || 0;

                      return (
                        <div
                          key={e.id}
                          id={`expense-row-${e.id}`}
                          onClick={() => setSelectedExpense(e)}
                          className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-emerald-500/20 hover:bg-slate-50/50 cursor-pointer transition-all gap-4"
                        >
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-slate-800 truncate">{e.description}</h4>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-3xs text-slate-400 font-bold uppercase font-mono">{e.splitType} Split</span>
                              <span className="text-slate-300 select-none">•</span>
                              <span className="text-3xs text-slate-500 font-semibold font-mono">Paid by: {e.payerName}</span>
                            </div>
                          </div>

                          {/* Float state layouts */}
                          <div className="text-right flex items-center gap-3">
                            <div>
                              <p className="text-xs font-mono font-black text-slate-800">${e.amount.toFixed(2)}</p>
                              {currentUser && (
                                <p className={`text-[10px] font-bold font-mono mt-0.5 ${
                                  isSelfPayer 
                                    ? 'text-emerald-500' 
                                    : mySplitAmount > 0 
                                      ? 'text-red-500' 
                                      : 'text-slate-400'
                                }`}>
                                  {isSelfPayer 
                                    ? `Owed $${(e.amount - mySplitAmount).toFixed(2)}` 
                                    : mySplitAmount > 0 
                                      ? `You owe $${mySplitAmount.toFixed(2)}` 
                                      : 'No share'
                                  }
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* GROUP-WISE BALANCES TAB (Requirement 3c) */}
              {activeTab === 'balances' && (
                <div className="space-y-4">
                  {/* Dynamic net visualizer table */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Group Wise Net Balances Ledger</span>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 divide-y divide-slate-150 space-y-2.5 first:pt-0 last:pb-0">
                      {balances.map(b => (
                        <div key={b.userId} className="flex items-center justify-between py-2 text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <img src={b.userAvatar} alt="av" className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
                            <span className="font-bold text-slate-700 truncate">{b.userId === currentUser?.id ? `${b.userName} (You)` : b.userName}</span>
                          </div>
                          <div className="text-right font-mono font-black text-xs flex items-center gap-1">
                            {b.netBalance > 0.01 ? (
                              <span className="text-emerald-500 flex items-center gap-0.5"><ArrowUpRight size={10} /> Owed +${b.netBalance.toFixed(2)}</span>
                            ) : b.netBalance < -0.01 ? (
                              <span className="text-red-500 flex items-center gap-0.5"><ArrowDownRight size={10} /> Owes -${Math.abs(b.netBalance).toFixed(2)}</span>
                            ) : (
                              <span className="text-slate-400">Settled up</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Solved grid settle pathways summary */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Calculated Minimize-Cashflow Settlement Paths</span>
                    {debts.length === 0 ? (
                      <p className="text-2xs text-slate-400 italic">No settle pathways needed. Everyone is balanced!</p>
                    ) : (
                      <div className="bg-amber-500/5 rounded-xl border border-amber-500/10 p-3 space-y-2">
                        {debts.map((d, i) => (
                          <div key={i} className="text-2xs text-slate-700 font-semibold flex items-center gap-1.5">
                            <span className="font-bold text-slate-800">{d.fromName}</span>
                            <span className="text-slate-400">needs to pay</span>
                            <span className="font-bold text-slate-800">{d.toName}</span>
                            <span className="text-amber-600 font-mono font-black">${d.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SETTLEMENTS HISTORIC FEED */}
              {activeTab === 'settlements' && (
                <div className="space-y-2">
                  {settlements.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      No settlement logs registered for this group yet. Settle up above!
                    </div>
                  ) : (
                    settlements.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all gap-4">
                        <div className="min-w-0">
                          <p className="text-2xs font-semibold text-slate-700">
                            <span className="font-bold text-slate-900">{s.payerName}</span> paid <span className="font-bold text-slate-900">{s.payeeName}</span>
                          </p>
                          <span className="text-[10px] text-slate-400 font-sans italic block mt-0.5">
                            Recorded {new Date(s.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <span className="text-xs font-mono font-black text-emerald-600">${s.amount.toFixed(2)}</span>
                          <button
                            id={`btn-delete-settle-${s.id}`}
                            onClick={() => handleDeleteSettlement(s.id)}
                            className="text-3xs font-bold text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="Delete Payment Log"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Manage Group Roster / Members) */}
        <div className="space-y-4">
          {/* Members detail roster */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono flex items-center gap-1.5">
              <WalletCards size={14} className="text-emerald-500" />
              Group Roster
            </h3>

            {/* Add User (Invite) selector Form */}
            {currentUser && inviteableUsers.length > 0 && (
              <form onSubmit={handleInviteUser} className="space-y-2 pb-3.5 border-b border-slate-100">
                <span className="text-3xs text-slate-400 font-bold block uppercase font-mono">Invite User into Group</span>
                <div className="flex gap-2">
                  <select
                    id="select-invite-user"
                    value={inviteUserId}
                    onChange={e => setInviteUserId(e.target.value)}
                    className="flex-1 text-xs py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-500 font-medium text-slate-700"
                  >
                    <option value="">-- Choose User --</option>
                    {inviteableUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <button
                    id="btn-inv-submit"
                    type="submit"
                    disabled={!inviteUserId}
                    className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white p-2 rounded-lg flex items-center justify-center cursor-pointer flex-shrink-0"
                    title="Add to group list"
                  >
                    <UserPlus2 size={13} strokeWidth={2.5} />
                  </button>
                </div>
                {inviteError && (
                  <p className="text-3xs text-red-500 font-bold">{inviteError}</p>
                )}
              </form>
            )}

            {/* Group Members detail table */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {group.members.map(m => {
                const isCreator = m.id === group.createdBy;
                const matchesSession = m.id === currentUser?.id;

                return (
                  <div key={m.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={m.avatar} alt="av" className="w-5 h-5 rounded-full flex-shrink-0" referrerPolicy="no-referrer" />
                      <span className="text-2xs font-bold text-slate-700 truncate">
                        {m.name} {matchesSession && '(You)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isCreator ? (
                        <span className="text-[8px] font-black uppercase tracking-wider font-mono bg-blue-500/10 border border-blue-500/20 text-blue-500 py-0.5 px-1 rounded">
                          Owner
                        </span>
                      ) : (
                        // Kick / Remove user button
                        <button
                          id={`btn-remove-member-${m.id}`}
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove ${m.name} from this group?`)) {
                              handleRemoveUser(m.id);
                            }
                          }}
                          className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                          title="Remove user (Checks relational debts first)"
                        >
                          <UserMinus2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Conditionally float details modal on click */}
      {selectedExpense && (
        <div id="expense-modal-holder" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg">
            <ExpenseDetailsModal
              expense={selectedExpense}
              currentUser={currentUser}
              onClose={() => {
                setSelectedExpense(null);
                loadGroupDetails();
              }}
              onDeleteExpense={handleDeleteExpense}
            />
          </div>
        </div>
      )}
    </div>
  );
}
