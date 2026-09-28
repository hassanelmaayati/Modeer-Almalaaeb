import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Trophy, MapPin, Calendar, Clock, ShieldCheck, Lock,
  Users, ChevronLeft, Sparkles
} from 'lucide-react';

export const CreateRoomView = ({ selectedSport, onCreated, onBack }) => {
  const { user, setAuthModalOpen } = useAuth();
  const [sports, setSports] = useState([]);
  const [sportId, setSportId] = useState(selectedSport ? selectedSport.id : '');
  const [name, setName] = useState('');
  const [format, setFormat] = useState('5v5');
  const [teamCount, setTeamCount] = useState(2);
  const [maxPlayersPerTeam, setMaxPlayersPerTeam] = useState(5);
  const [locationText, setLocationText] = useState('Manama Sports Club, Manama');
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2);
    return d.toISOString().slice(0, 16);
  });
  const [skillLevel, setSkillLevel] = useState('All Levels');
  const [isPrivate, setIsPrivate] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [joinMode, setJoinMode] = useState('open'); // 'open' or 'approval_required'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getSports().then(data => {
      setSports(data);
      if (!sportId && data.length > 0) {
        setSportId(data[0].id);
      }
    });
  }, []);

  const handleFormatChange = (fmt) => {
    setFormat(fmt);
    if (fmt === '5v5') {
      setMaxPlayersPerTeam(5);
    } else if (fmt === '2v2') {
      setMaxPlayersPerTeam(2);
    } else if (fmt === '1v1') {
      setMaxPlayersPerTeam(1);
    } else if (fmt === '7v7') {
      setMaxPlayersPerTeam(7);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const room = await api.createRoom({
        sport_id: parseInt(sportId),
        name,
        format,
        team_count: parseInt(teamCount),
        max_players_per_team: parseInt(maxPlayersPerTeam),
        location_text: locationText,
        start_time: new Date(startTime).toISOString(),
        skill_level: skillLevel,
        is_private: isPrivate,
        room_code: isPrivate ? roomCode || 'MODEER' : null,
        join_mode: joinMode
      });

      onCreated(room.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:underline mb-4"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl">
            🏆
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Create Sports Game Lobby</h2>
            <p className="text-xs text-slate-400">Set up format, venue, and host controls for your match</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sport & Lobby Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Sport
              </label>
              <select
                value={sportId}
                onChange={(e) => setSportId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                {sports.map(s => (
                  <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Lobby Title
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Friday Night 5v5 Basketball"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Format & Teams */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => handleFormatChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="5v5">5v5 (10 players)</option>
                <option value="2v2">2v2 (4 players)</option>
                <option value="1v1">1v1 (2 players)</option>
                <option value="7v7">7v7 (14 players)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Teams Count
              </label>
              <input
                type="number"
                min="2"
                max="4"
                value={teamCount}
                onChange={(e) => setTeamCount(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Players per Team
              </label>
              <input
                type="number"
                min="1"
                max="11"
                value={maxPlayersPerTeam}
                onChange={(e) => setMaxPlayersPerTeam(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Location & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Venue / Location
              </label>
              <input
                type="text"
                required
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                placeholder="e.g. Riffa Sports Club, Court 2"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                Date & Start Time
              </label>
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Skill Level */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Target Skill Level
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['All Levels', 'Beginner', 'Intermediate', 'Advanced'].map(lvl => (
                <button
                  type="button"
                  key={lvl}
                  onClick={() => setSkillLevel(lvl)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                    skillLevel === lvl
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Host Control Toggles: Approval & Private */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Require Host Approval to Join
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Host manually reviews each player's profile and ratings before accepting them into a slot.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setJoinMode(joinMode === 'open' ? 'approval_required' : 'open')}
                className={`w-12 h-6 rounded-full p-1 transition ${
                  joinMode === 'approval_required' ? 'bg-emerald-500' : 'bg-slate-800'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-slate-950 transition transform ${
                  joinMode === 'approval_required' ? 'translate-x-6' : ''
                }`} />
              </button>
            </div>

            <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  Private Room (Passcode)
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Only players with the room code can discover or join.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsPrivate(!isPrivate)}
                className={`w-12 h-6 rounded-full p-1 transition ${
                  isPrivate ? 'bg-amber-500' : 'bg-slate-800'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-slate-950 transition transform ${
                  isPrivate ? 'translate-x-6' : ''
                }`} />
              </button>
            </div>

            {isPrivate && (
              <div className="mt-2">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Set Passcode (e.g., RIFFA123)"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-amber-400 text-xs font-mono tracking-widest uppercase focus:outline-none focus:border-amber-500"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-2xl shadow-xl shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50 text-sm"
          >
            {submitting ? 'Creating Game Lobby...' : 'Launch Game Lobby & Claim Host Slot'}
          </button>
        </form>
      </div>
    </div>
  );
};
