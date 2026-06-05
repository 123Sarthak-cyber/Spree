import React, { useState } from 'react';
import { GroupWithMembers, User } from '../types.ts';
import { FolderHeart, Plus, Trash2, Users } from 'lucide-react';

interface GroupListProps {
  groups: GroupWithMembers[];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
  onCreateGroup: (name: string, description: string) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
  currentUser: User | null;
}

export default function GroupList({
  groups,
  selectedGroupId,
  onSelectGroup,
  onCreateGroup,
  onDeleteGroup,
  currentUser
}: GroupListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onCreateGroup(name, description);
      setName('');
      setDescription('');
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="group-list-sidebar" className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full min-h-[350px]">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider font-mono">
          <FolderHeart size={16} className="text-emerald-500" />
          My Groups
        </h3>
        <button
          id="btn-toggle-add-group"
          onClick={() => setShowAddForm(!showAddForm)}
          disabled={!currentUser}
          className="p-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 text-white cursor-pointer transition-colors"
          title={currentUser ? 'Create New Group' : 'Select a user to create groups'}
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Add Group Drawer */}
      {showAddForm && currentUser && (
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <form onSubmit={handleSubmit} className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700">New Group details</h4>
            <div>
              <input
                id="input-group-name"
                type="text"
                placeholder="Group Name (e.g. Vegas Trip)"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full text-xs py-2 px-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 transition-colors"
                maxLength={40}
              />
            </div>
            <div>
              <input
                id="input-group-desc"
                type="text"
                placeholder="Description (optional)"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full text-xs py-2 px-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 transition-colors"
                maxLength={100}
              />
            </div>
            {error && (
              <p className="text-2xs text-red-500 font-semibold bg-red-50 p-2 rounded-lg border border-red-100">{error}</p>
            )}
            <div className="flex justify-end gap-1.5 pt-1">
              <button
                id="btn-cancel-group-creation"
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-2.5 py-1 text-2xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-submit-group-creation"
                type="submit"
                disabled={loading}
                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white rounded-md text-2xs font-bold cursor-pointer"
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List Container */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-50">
        {groups.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs text-slate-400 font-medium">No active groups found.</p>
            {currentUser ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-2 text-2xs text-emerald-500 hover:text-emerald-600 font-semibold underline"
              >
                Create one now
              </button>
            ) : (
              <p className="mt-1 text-2xs text-slate-400">Choose a session to begin.</p>
            )}
          </div>
        ) : (
          groups.map(g => {
            const isSelected = selectedGroupId === g.id;
            const size = g.members?.length || 0;
            return (
              <div
                key={g.id}
                id={`grp-card-${g.id}`}
                onClick={() => onSelectGroup(g.id)}
                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'bg-slate-50 border-l-4 border-emerald-500 shadow-xs'
                    : 'hover:bg-slate-50/75 border-l-4 border-transparent'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800 truncate">{g.name}</span>
                    <span className="flex items-center gap-0.5 bg-slate-100 text-slate-500 py-0.5 px-1.5 rounded-md text-[10px] font-semibold flex-shrink-0">
                      <Users size={8} /> {size}
                    </span>
                  </div>
                  {g.description && (
                    <p className="text-3xs text-slate-400 truncate mt-0.5">{g.description}</p>
                  )}
                  {g.createdByDetails && (
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      By: <span className="text-slate-500 font-sans">{g.createdByDetails.name}</span>
                    </p>
                  )}
                </div>

                {/* Relational CASCADE Deletion controls */}
                <button
                  id={`btn-delete-group-${g.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`CRITICAL RELATION TRIGGER: Are you sure you want to delete group "${g.name}"?\nThis will cascade delete all expenses, splits, settlements, and live chats!`)) {
                      onDeleteGroup(g.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all cursor-pointer flex-shrink-0"
                  title="Dissolve Group (Relational Cascade)"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
