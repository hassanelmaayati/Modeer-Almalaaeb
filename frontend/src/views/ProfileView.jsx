import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import {
  User as UserIcon, Camera, Star, Calendar, MapPin,
  Trophy, ChevronRight, Edit3, Save, Check
} from 'lucide-react';

export const ProfileView = ({ onSelectRoom, onRateRoom }) => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [userRooms, setUserRooms] = useState([]);
  const [userRatings, setUserRatings] = useState(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [interests, setInterests] = useState(user?.sports_interests || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setInterests(user.sports_interests || '');

      api.getRooms()
        .then(rooms => {
          // Filter rooms where user is participant or host
          const mine = rooms.filter(r =>
            r.host_id === user.id ||
            r.teams.some(t => t.participants.some(p => p.user_id === user.id))
          );
          setUserRooms(mine);
        })
        .catch(err => console.error(err));

      api.getUserRatings(user.id)
        .then(data => setUserRatings(data))
        .catch(err => console.error(err));
    }
  }, [user]);

  if (!user) return null;

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.uploadAvatar(formData);
      await refreshUser();
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.updateMe({ name, sports_interests: interests });
      await refreshUser();
      setEditing(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const upcomingRooms = userRooms.filter(r => r.status !== 'completed' && r.status !== 'cancelled');
  const pastRooms = userRooms.filter(r => r.status === 'completed');

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Profile Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl mb-8 relative">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar with Upload */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 rounded-2xl bg-slate-800 border-2 border-emerald-500/40 overflow-hidden flex items-center justify-center text-slate-400 shadow-lg">
              {user.profile_picture_url ? (
                <img src={user.profile_picture_url} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-12 h-12 text-emerald-400" />
              )}
            </div>
            <label className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition">
              <Camera className="w-6 h-6 text-white" />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

          {/* User Details */}
          <div className="flex-1 text-center sm:text-left">
            {editing ? (
              <div className="space-y-3 max-w-md">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-bold"
                />
                <input
                  type="text"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="Sports interests (e.g. Basketball, Padel)"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
                />
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="inline-flex items-center gap-1 px-4 py-1.5 bg-emerald-500 text-slate-950 rounded-xl text-xs font-bold"
                >
                  <Save className="w-3.5 h-3.5" /> Save Profile
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-3">
                  <h2 className="text-2xl font-bold text-white">{user.name}</h2>
                  <button
                    onClick={() => setEditing(true)}
                    className="p-1 text-slate-400 hover:text-emerald-400 transition"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
                <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-xs font-bold mt-2">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{user.rating_average.toFixed(1)} Rating Average</span>
                  <span className="text-slate-400 font-normal">({user.rating_count} reviews)</span>
                </div>
                <p className="text-xs text-emerald-400 font-medium mt-2">
                  Interests: {user.sports_interests || 'Basketball, Soccer, Padel'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs: Upcoming Rooms / Past Rooms */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-6">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'upcoming'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          Upcoming Rooms ({upcomingRooms.length})
        </button>

        <button
          onClick={() => setActiveTab('past')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'past'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          Past Rooms ({pastRooms.length})
        </button>
      </div>

      {/* Rooms List Content */}
      <div className="space-y-3">
        {(activeTab === 'upcoming' ? upcomingRooms : pastRooms).length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
            <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400">No {activeTab} game rooms found.</p>
          </div>
        ) : (
          (activeTab === 'upcoming' ? upcomingRooms : pastRooms).map(room => (
            <div
              key={room.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-xl shrink-0">
                  {room.sport?.icon || '⚽'}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{room.name}</h4>
                  <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span><MapPin className="w-3 h-3 inline text-emerald-400" /> {room.location_text}</span>
                    <span>• {new Date(room.start_time).toLocaleDateString()}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {room.status === 'completed' && room.host_id === user.id && (
                  <button
                    onClick={() => onRateRoom(room)}
                    className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-400 transition"
                  >
                    Rate Players
                  </button>
                )}
                <button
                  onClick={() => onSelectRoom(room.id)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 font-bold rounded-xl text-xs transition"
                >
                  Enter Lobby
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Rating History List */}
      {userRatings && userRatings.ratings.length > 0 && (
        <div className="mt-10">
          <h3 className="text-base font-bold text-white mb-4">Post-Game Player Reviews</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {userRatings.ratings.map(r => (
              <div key={r.id} className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{r.rater_name || 'Game Host'}</span>
                  <div className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{r.score}.0</span>
                  </div>
                </div>
                {r.tags && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-md font-semibold">
                    {r.tags}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
