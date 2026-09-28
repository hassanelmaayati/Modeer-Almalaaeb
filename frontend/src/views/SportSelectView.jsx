import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Search, Trophy, ChevronRight, Activity, Users, MapPin } from 'lucide-react';

export const SportSelectView = ({ onSelectSport }) => {
  const [sports, setSports] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSports()
      .then(data => setSports(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filteredSports = sports.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold mb-4">
          <Activity className="w-3.5 h-3.5" />
          Real-Time Pickup Sports Platform
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Find or Host Pickup Games in <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">Bahrain</span>
        </h2>
        <p className="text-slate-400 text-sm mt-3">
          Select a sport below to browse active game lobbies in Manama, Riffa, Muharraq, and across the Kingdom.
        </p>

        {/* Search Bar */}
        <div className="mt-8 relative max-w-lg mx-auto">
          <Search className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sports (Basketball, Soccer, Padel, Tennis...)"
            className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-xl text-sm"
          />
        </div>
      </div>

      {/* Sports Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} className="h-40 bg-slate-800/40 animate-pulse rounded-2xl border border-slate-800"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {filteredSports.map(sport => (
            <div
              key={sport.id}
              onClick={() => onSelectSport(sport)}
              className="group relative bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 flex flex-col items-center text-center cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-emerald-500/10"
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 group-hover:bg-emerald-500/10 border border-slate-700 group-hover:border-emerald-500/30 flex items-center justify-center text-3xl mb-4 transition">
                {sport.icon || '⚽'}
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition">
                {sport.name}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                Browse Lobbies <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition" />
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Feature Highlights Banner */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex items-start gap-4">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Real-Time Lobbies</h4>
            <p className="text-xs text-slate-400 mt-1">Claim specific team slots live with instant WebSocket synchronization.</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex items-start gap-4">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Host Controls & Vet</h4>
            <p className="text-xs text-slate-400 mt-1">Hosts review profiles and ratings before accepting players into approval rooms.</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex items-start gap-4">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Local Bahrain Spots</h4>
            <p className="text-xs text-slate-400 mt-1">Discover games at local venues across Manama, Riffa, Muharraq, and Saar.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
