import React, { useState, useEffect, useRef } from 'react';
import { ExpenseWithSplits, ChatMessage, User } from '../types.ts';
import { MessageSquare, Send, X, Clock, HelpCircle } from 'lucide-react';

interface ExpenseDetailsModalProps {
  expense: ExpenseWithSplits;
  currentUser: User | null;
  onClose: () => void;
  onDeleteExpense: (id: string) => Promise<void>;
}

export default function ExpenseDetailsModal({
  expense,
  currentUser,
  onClose,
  onDeleteExpense
}: ExpenseDetailsModalProps) {
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingChats, setLoadingChats] = useState(false);
  const [sendingChat, setSendingChat] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Load and poll chats for real-time update emulation (every 3 seconds)
  const fetchChats = async () => {
    try {
      const res = await fetch(`/api/expenses/${expense.id}/chats`);
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    } catch (err) {
      console.error('Failed to poll chats:', err);
    }
  };

  useEffect(() => {
    setLoadingChats(true);
    fetchChats().then(() => setLoadingChats(false));

    const interval = setInterval(fetchChats, 3000);
    return () => clearInterval(interval);
  }, [expense.id]);

  // Scroll details
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chats]);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    setSendingChat(true);
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expenseId: expense.id,
          userId: currentUser.id,
          message: newMessage.trim(),
        }),
      });

      if (res.ok) {
        setNewMessage('');
        await fetchChats();
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setSendingChat(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this expense split from the ledger?\nThis operation is irreversible!')) {
      setDeleteLoading(true);
      try {
        await onDeleteExpense(expense.id);
        onClose();
      } catch (err) {
        console.error(err);
      } finally {
        setDeleteLoading(false);
      }
    }
  };

  return (
    <div id="expense-modal-backdrop" className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden flex flex-col h-full min-h-[460px]">
      {/* Modal Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div>
          <h3 className="text-xs font-bold text-slate-800 truncate max-w-[200px] md:max-w-xs">{expense.description}</h3>
          <p className="text-3xs text-slate-400 font-bold font-mono uppercase mt-0.5">Expense Record Details</p>
        </div>
        <button
          id="btn-close-expense-modal"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body Grid: Top info + Bottom Chat */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col justify-between">
        <div className="space-y-4">
          {/* Main Transaction Card */}
          <div className="bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <img
                src={expense.payerAvatar}
                alt={expense.payerName}
                className="w-8 h-8 rounded-full border border-emerald-500/20 shadow-xs"
                referrerPolicy="no-referrer"
              />
              <div>
                <p className="text-xs font-bold text-slate-800">{expense.payerName}</p>
                <p className="text-3xs text-slate-400 font-semibold font-mono mt-0.5">Paid this invoice</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono font-black text-emerald-600">${expense.amount.toFixed(2)}</p>
              <div className="flex items-center gap-0.5 justify-end text-3xs font-semibold text-slate-400 lowercase italic mt-0.5">
                <Clock size={8} />
                <span>{new Date(expense.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Allocation Breakdown list */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider flex items-center gap-1">
              <HelpCircle size={11} className="text-emerald-500" />
              Strategic Split Dividends ({expense.splitType})
            </span>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
              {expense.splits.map((split, idx) => {
                const selfPaid = split.userId === expense.paidBy;
                return (
                  <div key={idx} className="flex items-center justify-between text-xs font-medium">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <img src={split.userAvatar} alt={split.userName} className="w-4 h-4 rounded-full" referrerPolicy="no-referrer" />
                      <span className="text-slate-700 font-semibold truncate text-2xs">{split.userName}</span>
                      {selfPaid && (
                        <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 py-0.5 px-1 rounded text-[8px] font-mono font-bold uppercase flex-shrink-0">
                          Payer
                        </span>
                      )}
                    </div>
                    <div className="text-right font-mono font-bold text-slate-600 text-2xs">
                      ${split.amountOwed.toFixed(2)}
                      {split.percentage !== undefined && (
                        <span className="text-3xs text-slate-400 ml-1">({split.percentage}%)</span>
                      )}
                      {split.shareCount !== undefined && (
                        <span className="text-3xs text-slate-400 ml-1">({split.shareCount} sh)</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Discussion stream */}
        <div className="border-t border-slate-100 pt-3 flex flex-col flex-1 h-[240px]">
          <span className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider mb-2 flex items-center gap-1">
            <MessageSquare size={11} className="text-emerald-500" />
            Live Expense Discussion (SSE Mock Polling)
          </span>

          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 p-1 max-h-[140px]">
            {loadingChats ? (
              <p className="text-center text-3xs text-slate-400 py-2">Loading discussion logs...</p>
            ) : chats.length === 0 ? (
              <p className="text-center text-3xs text-slate-400 py-4 italic">No messages in chat thread. Post a note below!</p>
            ) : (
              chats.map(chat => {
                const isSelf = chat.userId === currentUser?.id;
                return (
                  <div key={chat.id} id={`chat-msg-${chat.id}`} className={`flex items-start gap-1.5 ${isSelf ? 'justify-end' : ''}`}>
                    {!isSelf && chat.userAvatar && (
                      <img src={chat.userAvatar} alt="user avatar" className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5" referrerPolicy="no-referrer" />
                    )}
                    <div className={`max-w-[80%] rounded-lg p-2 text-2xs leading-relaxed ${
                      isSelf ? 'bg-emerald-500 text-white font-medium' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {!isSelf && (
                        <span className="block text-[8px] font-bold text-slate-500/70 select-none uppercase mb-0.5">{chat.userName}</span>
                      )}
                      <p>{chat.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Chat Post Entry */}
          {currentUser ? (
            <form onSubmit={handleSendChat} className="flex gap-1.5 mt-2 pt-2 border-t border-slate-100 flex-shrink-0">
              <input
                id="input-new-chat-msg"
                type="text"
                placeholder="Type group discuss note here..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                disabled={sendingChat}
                className="flex-1 text-2xs py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-500 text-slate-800 font-medium"
                maxLength={200}
              />
              <button
                id="btn-send-chat-msg"
                type="submit"
                disabled={sendingChat || !newMessage.trim()}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-bold p-1.5 rounded-lg flex-shrink-0 cursor-pointer transition-colors"
              >
                <Send size={12} />
              </button>
            </form>
          ) : (
            <p className="text-center text-[10px] text-slate-400 mt-2">Choose an account session above to comment.</p>
          )}
        </div>
      </div>

      {/* Delete panel footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
        <button
          id="btn-delete-expense"
          onClick={handleDelete}
          disabled={deleteLoading}
          className="text-3xs font-bold text-red-500 hover:text-white hover:bg-red-500 border border-red-500/20 bg-red-50/50 py-1.5 px-3 rounded-lg transition-all cursor-pointer"
        >
          {deleteLoading ? 'Deleting...' : 'Delete Expense'}
        </button>
      </div>
    </div>
  );
}
