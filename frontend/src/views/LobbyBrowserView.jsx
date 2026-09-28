import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  Plus, Search, Filter, MapPin, Calendar, Clock,
  Users, Lock, ShieldCheck, ChevronRight, User
} from 'lucide-react';

export const LobbyBrowserView = ({ selectedSport, onSelectRoom, onCreateRoom, onSelectSportClick }) => {
  const [rooms, setRooms] = useState([]);
  const [skillFilter, setSkillFilter] = useState('All');
  const [formatFilter, setFormatFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchRooms = () => {
    api.getRooms({
      sport_id: selectedSport ? selectedSport.id : undefined,
      skill_level: skillFilter !== 'All' ? skillFilter : undefined,
      format: formatFilter !== 'All' ? formatFilter : undefined,
    })
      .then(data => setRooms(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 4000); // Poll live updates
    return () => clearInterval(interval);
  }, [selectedSport, skillFilter, formatFilter]);

  const filteredRooms = rooms.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.location_text.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={onSelectSportClick}
              className="text-xs font-semibold text-emerald-400 hover:underline"
            >
              ← Change Sport
            </button>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <span>{selectedSport ? selectedSport.icon : '🏆'}</span>
            <span>{selectedSport ? `${selectedSport.name} Lobbies` : 'All Game Lobbies'}</span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Join active pickup lobbies or create a new room for your team
          </p>
        </div>

        <button
          onClick={onCreateRoom}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm shadow-lg shadow-emerald-500/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Create New Room
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-4">
        {/* Search Input */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by venue or title..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-700/70 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Skill Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-semibold text-slate-400">Skill:</span>
          <select
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700/70 text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="All">All Levels</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>

        {/* Format Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Format:</span>
          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700/70 text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="All">All Formats</option>
            <option value="5v5">5v5</option>
            <option value="2v2">2v2</option>
            <option value="1v1">1v1</option>
            <option value="7v7">7v7</option>
          </select>
        </div>
      </div>

      {/* Room List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-28 bg-slate-900/60 animate-pulse rounded-2xl border border-slate-800"></div>
          ))}
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/50 border border-slate-800/80 rounded-2xl p-8">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">No active lobbies found</h3>
          <p className="text-slate-400 text-xs mt-1 mb-6">
            Be the first to create a game lobby for this sport!
          </p>
          <button
            onClick={onCreateRoom}
            className="inline-flex items-center gap-2 bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs"
          >
            <Plus className="w-4 h-4" />
            Create Lobby Now
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRooms.map(room => {
            const isFull = room.current_player_count >= room.max_player_count;
            const startTimeStr = new Date(room.start_time).toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={room.id}
                onClick={() => onSelectRoom(room.id)}
                className="group bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition shadow-md hover:shadow-emerald-500/10"
              >
                {/* Left Section: Info */}
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shrink-0">
                    {room.sport?.icon || '⚽'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition">
                        {room.name}
                      </h3>
                      {room.is_private && (
                        <span className="p-1 bg-amber-500/10 text-amber-400 rounded-md text-[10px]" title="Private Room">
                          <Lock className="w-3 h-3" />
                        </span>
                      )}
                      {room.join_mode === 'approval_required' && (
                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md text-[10px] font-semibold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Approval Req.
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        {room.location_text}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        {startTimeStr}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-800 rounded-md text-[10px] font-medium text-slate-300">
                        {room.skill_level}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Section: Badges & CTA */}
                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                  {/* Fill Indicator */}
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white justify-end">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{room.current_player_count} / {room.max_player_count}</span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-1 ${
                      room.status === 'in_progress' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      isFull ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {room.status === 'in_progress' ? 'In Match' : isFull ? 'Full' : 'Open'}
                    </span>
                  </div>

                  <div className="p-2 bg-slate-800 group-hover:bg-emerald-500 group-hover:text-slate-950 text-slate-300 rounded-xl transition">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
