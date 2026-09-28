import React, { useState } from 'react';
import { api } from '../api';
import { X, Star, Check, Award } from 'lucide-react';

export const PostGameRatingModal = ({ room, onClose, onSubmitted }) => {
  if (!room) return null;

  // Extract participants excluding host
  const participants = [];
  room.teams?.forEach(team => {
    team.participants?.forEach(p => {
      if (p.user_id !== room.host_id) {
        participants.push(p);
      }
    });
  });

  const [ratings, setRatings] = useState(() => {
    const init = {};
    participants.forEach(p => {
      init[p.user_id] = { score: 5, tags: 'Team Player, Punctual' };
    });
    return init;
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleScoreChange = (userId, score) => {
    setRatings(prev => ({
      ...prev,
      [userId]: { ...prev[userId], score }
    }));
  };

  const handleTagToggle = (userId, tag) => {
    const currentTags = (ratings[userId]?.tags || '').split(', ').filter(Boolean);
    let newTags = [];
    if (currentTags.includes(tag)) {
      newTags = currentTags.filter(t => t !== tag);
    } else {
      newTags = [...currentTags, tag];
    }
    setRatings(prev => ({
      ...prev,
      [userId]: { ...prev[userId], tags: newTags.join(', ') }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = Object.entries(ratings).map(([userId, val]) => ({
        rated_user_id: parseInt(userId),
        score: val.score,
        tags: val.tags
      }));

      await api.submitRatings(room.id, payload);
      if (onSubmitted) onSubmitted();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const AVAILABLE_TAGS = ['Team Player', 'Punctual', 'Fair Play', 'MVPlayer', 'Skilled'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 relative shadow-2xl my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Award className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Post-Game Player Ratings</h2>
          <p className="text-xs text-slate-400 mt-1">
            Rate your participants for <span className="text-white font-semibold">{room.name}</span> to build trust in the Bahrain community
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {participants.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-6">No other participants joined this room to rate.</p>
          ) : (
            participants.map(p => {
              const currentVal = ratings[p.user_id] || { score: 5, tags: '' };
              const selectedTags = (currentVal.tags || '').split(', ').filter(Boolean);

              return (
                <div key={p.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-emerald-400">
                        {p.user?.name ? p.user.name.charAt(0) : 'P'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{p.user?.name}</p>
                        <p className="text-[10px] text-slate-400">Participant</p>
                      </div>
                    </div>

                    {/* Star Rating Selector */}
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => handleScoreChange(p.user_id, star)}
                          className="p-1 text-amber-400 hover:scale-110 transition"
                        >
                          <Star className={`w-4 h-4 ${star <= currentVal.score ? 'fill-amber-400' : 'text-slate-700'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tags Selector */}
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80">
                    {AVAILABLE_TAGS.map(tag => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          type="button"
                          key={tag}
                          onClick={() => handleTagToggle(p.user_id, tag)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition ${
                            isSelected
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || participants.length === 0}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold rounded-2xl text-xs transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {submitting ? 'Saving Ratings...' : 'Submit Player Ratings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
