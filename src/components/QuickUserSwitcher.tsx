import React, { useState } from 'react';
import { User } from '../types.ts';
import { Users, UserPlus, Shuffle, ShieldCheck } from 'lucide-react';

interface QuickUserSwitcherProps {
  users: User[];
  currentUser: User | null;
  onSelectUser: (user: User) => void;
  onRegisterUser: (name: string, email: string) => Promise<void>;
}

export default function QuickUserSwitcher({
  users,
  currentUser,
  onSelectUser,
  onRegisterUser
}: QuickUserSwitcherProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onRegisterUser(newName, newEmail);
      setNewName('');
      setNewEmail('');
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message || 'Email already exists');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="quick-user-switcher" className="bg-slate-900 border-b border-slate-800 py-3 px-4 md:px-8 text-white relative z-50">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Title and Active Status */}
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-lg border border-emerald-500/30">
            <ShieldCheck size={18} />
          </div>
          <div>
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase font-mono">Session Control Engine</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-medium">Testing as:</span>
              {currentUser ? (
                <div className="flex items-center gap-1.5 bg-slate-800 py-1 px-2.5 rounded-full border border-slate-700">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-4 h-4 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-xs font-semibold text-emerald-400">{currentUser.name}</span>
                </div>
              ) : (
                <span className="text-xs text-red-400 font-semibold">No active session (Login below)</span>
              )}
            </div>
          </div>
        </div>

        {/* User Selector Row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-medium mr-1 hidden sm:inline flex-shrink-0">Switch Session Account:</span>
          
          <div className="flex flex-wrap gap-1.5 items-center">
            {users.map(user => {
              const isActive = currentUser?.id === user.id;
              return (
                <button
                  id={`btn-select-user-${user.id}`}
                  key={user.id}
                  onClick={() => onSelectUser(user)}
                  className={`flex items-center gap-1.5 py-1 px-3 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-400/50'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
                  }`}
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-3.5 h-3.5 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                  <span>{user.name.split(' ')[0]}</span>
                </button>
              );
            })}

            {/* Quick Register Toggle */}
            <button
              id="btn-toggle-add-user"
              onClick={() => setShowAddForm(!showAddForm)}
              className={`flex items-center gap-1 py-1 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                showAddForm
                  ? 'bg-slate-700 border-slate-600 text-amber-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-slate-600 text-slate-300'
              }`}
            >
              <UserPlus size={12} />
              <span>{showAddForm ? 'Close' : 'Add User'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Slide down User Creation Form */}
      {showAddForm && (
        <div className="max-w-md mx-auto mt-4 p-4 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 shadow-xl">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5 text-slate-100">
            <Users size={16} className="text-slate-400" />
            Register New Account in Relational DB
          </h4>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-2xs text-slate-400 font-semibold mb-1 font-mono uppercase">Full Name</label>
              <input
                id="input-new-user-name"
                type="text"
                placeholder="e.g. Donna Paulsen"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full text-xs py-2 px-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                maxLength={40}
              />
            </div>
            <div>
              <label className="block text-2xs text-slate-400 font-semibold mb-1 font-mono uppercase">Email Address</label>
              <input
                id="input-new-user-email"
                type="email"
                placeholder="donna@firm.com"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                className="w-full text-xs py-2 px-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                maxLength={80}
              />
            </div>
            {error && (
              <p className="text-2xs font-semibold text-red-400 bg-red-400/10 p-2 rounded-lg border border-red-500/20">{error}</p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                id="btn-cancel-user-reg"
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 rounded-lg text-2xs font-medium text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-submit-user-reg"
                type="submit"
                disabled={loading}
                className="px-3.5 py-1.5 rounded-lg text-2xs font-semibold bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-white flex items-center gap-1 cursor-pointer"
              >
                {loading ? 'Creating...' : 'Register User'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
