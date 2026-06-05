import { useState, useEffect } from 'react';
import { User, GroupWithMembers } from './types.ts';
import QuickUserSwitcher from './components/QuickUserSwitcher.tsx';
import GroupList from './components/GroupList.tsx';
import GroupDetails from './components/GroupDetails.tsx';
import { Landmark, Compass, CircleHelp, Coins } from 'lucide-react';

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch users and groups initially
  const loadInitialData = async (shouldPreserveSelectedGroup = false) => {
    try {
      const usersRes = await fetch('/api/users');
      const groupsRes = await fetch('/api/groups');

      if (usersRes.ok && groupsRes.ok) {
        const usersData: User[] = await usersRes.json();
        const groupsData: GroupWithMembers[] = await groupsRes.json();

        setUsers(usersData);
        setGroups(groupsData);

        // Auto-select session user if none active
        if (usersData.length > 0) {
          const storedUid = localStorage.getItem('current_test_uid');
          const matched = usersData.find(u => u.id === storedUid);
          setCurrentUser(matched || usersData[0]);
        }

        // Set default group selection
        if (groupsData.length > 0 && !shouldPreserveSelectedGroup) {
          setSelectedGroupId(groupsData[0].id);
        }
      }
    } catch (e: any) {
      setError('Connection to Express background proxy failed. Please reload.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('current_test_uid', user.id);
  };

  const handleRegisterUser = async (name: string, email: string) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email })
    });

    if (res.ok) {
      const newUser = await res.json();
      await loadInitialData(true);
      setCurrentUser(newUser);
      localStorage.setItem('current_test_uid', newUser.id);
    } else {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to create user');
    }
  };

  const handleCreateGroup = async (name: string, description: string) => {
    if (!currentUser) return;
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        description,
        createdBy: currentUser.id
      })
    });

    if (res.ok) {
      const newGroup = await res.json();
      await loadInitialData(true);
      setSelectedGroupId(newGroup.id);
    } else {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create group');
    }
  };

  const handleDeleteGroup = async (gId: string) => {
    const res = await fetch(`/api/groups/${gId}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      // Refresh list
      await loadInitialData(false);
    } else {
      const err = await res.json();
      alert(`Delete Error: ${err.error}`);
    }
  };

  const activeGroup = groups.find(g => g.id === selectedGroupId);

  return (
    <div id="splitwise-app-root" className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      
      {/* Session Switcher Node */}
      <QuickUserSwitcher
        users={users}
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
        onRegisterUser={handleRegisterUser}
      />

      {/* Spreetail Branded Header Banner */}
      <header id="app-branded-header" className="bg-white border-b border-slate-150 py-4 px-4 md:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center text-white shadow-xs">
              <Landmark size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1">
                Spreetail <span className="text-emerald-500 font-medium">Splits</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-bold tracking-wider font-mono uppercase">Splitwise Reverse-Engineered Intern System</p>
            </div>
          </div>

          {/* Quick Info Pill */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 py-1.5 px-3 rounded-full border border-slate-200">
            <Coins size={12} className="text-emerald-500" />
            <span className="text-3xs font-extrabold uppercase text-slate-500 font-mono">Relational DB Backend: Active</span>
          </div>
        </div>
      </header>

      {/* Loading & Error Screens */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-2xs font-bold text-slate-400 font-mono uppercase tracking-wider">Synchronizing relational system maps...</p>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-4">
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-5 max-w-md text-center shadow-lg">
            <h3 className="font-black text-xs uppercase font-mono mb-2">Relational Sync Connection Offline</h3>
            <p className="text-2xs font-medium leading-relaxed mb-4">{error}</p>
            <button
              onClick={() => {
                setLoading(true);
                setError('');
                loadInitialData();
              }}
              className="bg-red-500 hover:bg-red-600 text-white font-bold text-2xs py-2 px-4 rounded-xl cursor-pointer"
            >
              Re-establish Session Connection
            </button>
          </div>
        </div>
      ) : (
        /* Primary App Dashboard Grid layout */
        <main id="app-main-grid" className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Left Column (Roster Lists & Creating) */}
          <section className="md:col-span-1 xl:col-span-1">
            <GroupList
              groups={groups}
              selectedGroupId={selectedGroupId}
              onSelectGroup={setSelectedGroupId}
              onCreateGroup={handleCreateGroup}
              onDeleteGroup={handleDeleteGroup}
              currentUser={currentUser}
            />
          </section>

          {/* Right Column (Focus dashboard details / empty fallbacks) */}
          <section className="md:col-span-2 xl:col-span-3">
            {activeGroup ? (
              <GroupDetails
                group={activeGroup}
                systemUsers={users}
                currentUser={currentUser}
                onRefreshGroups={() => loadInitialData(true)}
              />
            ) : (
              <div id="empty-dashboard-state" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-14 h-14 rounded-full bg-slate-105 flex items-center justify-center text-slate-400 mb-4 border border-slate-100">
                  <Compass size={24} />
                </div>
                <h3 className="text-sm font-bold text-slate-800">No Group Selected</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                  Select an active group from the sidebar, or create a brand new one using the "+" button to begin recording split expenses!
                </p>

                {/* Developer Checklist */}
                <div className="mt-8 max-w-sm text-left border-t border-slate-100 pt-6 space-y-3">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono flex items-center gap-1">
                    <CircleHelp size={12} className="text-emerald-500" />
                    Interactive Developer Sandboxing Guide:
                  </span>
                  <ul className="space-y-2 text-3xs text-slate-500 font-semibold leading-relaxed pl-1.5 list-disc list-inside">
                    <li>Use the <span className="text-emerald-400">Session Switcher Bar</span> at the very top of files to impersonate user profiles (Sarthak, Alice, Bob, Charlie) in 1-click.</li>
                    <li>Add/Join new folks or dissolve rosters with full relational cascading integrity.</li>
                    <li>Toggle transaction modes between **equal, unequal, percentage, and share weights** inside the Add Expense tab.</li>
                  </ul>
                </div>
              </div>
            )}
          </section>
        </main>
      )}

      {/* Humble Footer */}
      <footer className="py-6 text-center border-t border-slate-200">
        <p className="text-3xs text-slate-400 uppercase font-bold font-mono tracking-widest">
          Spreetail splits intern engine • Fully Relational model • compiled with vite
        </p>
      </footer>

    </div>
  );
}
