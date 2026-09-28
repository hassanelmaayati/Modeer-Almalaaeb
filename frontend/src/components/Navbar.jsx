import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, Plus, User, LogOut, Search, Compass } from 'lucide-react';

export const Navbar = ({ currentView, setView }) => {
  const { user, logout, setAuthModalOpen } = useAuth();

  return (
    <nav className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => setView('sports')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Trophy className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent leading-tight">
              Modeer Almalaaeb
            </h1>
            <p className="text-[10px] font-medium tracking-widest text-emerald-400 uppercase">
              Bahrain Sports Lobbies
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setView('sports')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              currentView === 'sports'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Sports
          </button>

          <button
            onClick={() => setView('lobbies')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              currentView === 'lobbies'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Browse Lobbies
          </button>
        </div>

        {/* User / Action Bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (!user) setAuthModalOpen(true);
              else setView('create-room');
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 px-3.5 py-2 rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create Room</span>
          </button>

          {user ? (
            <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
              <button
                onClick={() => setView('profile')}
                className={`flex items-center gap-2.5 p-1 pr-3 rounded-xl border transition ${
                  currentView === 'profile'
                    ? 'bg-slate-800 border-emerald-500/50 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-slate-800 overflow-hidden flex items-center justify-center border border-slate-700">
                  {user.profile_picture_url ? (
                    <img src={user.profile_picture_url} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold leading-none">{user.name}</p>
                  <p className="text-[10px] text-amber-400 font-medium">
                    ★ {user.rating_average.toFixed(1)} ({user.rating_count})
                  </p>
                </div>
              </button>

              <button
                onClick={logout}
                title="Log Out"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
