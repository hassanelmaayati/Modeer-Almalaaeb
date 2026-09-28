import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import {
  Crown, MapPin, Calendar, Clock, Lock, ShieldCheck,
  Send, UserX, ArrowRightLeft, CheckCircle, AlertCircle,
  Settings, Play, XCircle, LogOut, ChevronLeft, User, MessageSquare
} from 'lucide-react';

export const RoomLobbyView = ({ roomId, onBack, onRateRoom }) => {
  const { user, token, setAuthModalOpen } = useAuth();
  const [room, setRoom] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [joinRequests, setJoinRequests] = useState([]);
  const [ws, setWs] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showHostPanel, setShowHostPanel] = useState(false);

  // Host edit fields
  const [editLocation, setEditLocation] = useState('');
  const [editTime, setEditTime] = useState('');

  const chatBottomRef = useRef(null);

  // Connect WebSocket when token & roomId available
  useEffect(() => {
    let socket = null;
    let isMounted = true;

    if (roomId && token) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/rooms/${roomId}?token=${token}`;

      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('Connected to WebSocket for room:', roomId);
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'room_state') {
            setRoom(msg.payload);
            setEditLocation(msg.payload.location_text || '');
            if (msg.payload.start_time) {
              setEditTime(new Date(msg.payload.start_time).toISOString().slice(0, 16));
            }
          } else if (msg.type === 'chat_message') {
            setChatMessages(prev => [...prev, msg.payload]);
          } else if (msg.type === 'join_request_received') {
            fetchJoinRequests();
          } else if (msg.type === 'error') {
            setErrorMsg(msg.payload.message || 'Error occurred');
            setTimeout(() => setErrorMsg(''), 4000);
          } else {
            // For slot_taken, ready_changed, host_changed, room_status_changed, re-fetch via REST fallback if needed
            fetchRoomData();
          }
        } catch (e) {
          console.error(e);
        }
      };

      socket.onclose = () => {
        console.log('WebSocket closed');
      };

      setWs(socket);
    } else {
      fetchRoomData();
    }

    return () => {
      isMounted = false;
      if (socket) socket.close();
    };
  }, [roomId, token]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const fetchRoomData = () => {
    api.getRoom(roomId)
      .then(r => {
        setRoom(r);
        setEditLocation(r.location_text);
        if (r.start_time) setEditTime(new Date(r.start_time).toISOString().slice(0, 16));
      })
      .catch(err => console.error(err));
  };

  const fetchJoinRequests = () => {
    if (room && user && room.host_id === user.id) {
      api.getJoinRequests(roomId)
        .then(reqs => setJoinRequests(reqs))
        .catch(err => console.error(err));
    }
  };

  useEffect(() => {
    if (room && user && room.host_id === user.id) {
      fetchJoinRequests();
    }
  }, [room, user]);

  if (!room) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center text-slate-400">
        Loading room lobby...
      </div>
    );
  }

  const isHost = user && room.host_id === user.id;

  // Find user's participant record
  let currentParticipant = null;
  room.teams?.forEach(t => {
    t.participants?.forEach(p => {
      if (user && p.user_id === user.id) {
        currentParticipant = p;
      }
    });
  });

  const sendWs = (type, payload = {}) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    } else {
      // Fallback
      if (type === 'join_slot') {
        api.joinRoomRest(roomId, payload).then(() => fetchRoomData()).catch(e => setErrorMsg(e.message));
      }
    }
  };

  const handleClaimSlot = (teamId, slotNum) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (room.join_mode === 'approval_required' && !isHost) {
      sendWs('request_join', { team_id: teamId, slot_number: slotNum });
      setErrorMsg('Join request sent to host for approval!');
      setTimeout(() => setErrorMsg(''), 4000);
    } else {
      sendWs('join_slot', { team_id: teamId, slot_number: slotNum });
    }
  };

  const handleLeaveSlot = () => {
    sendWs('leave_slot', {});
  };

  const handleToggleReady = () => {
    sendWs('toggle_ready', {});
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    sendWs('send_chat', { message: chatInput });
    setChatInput('');
  };

  const handleResolveJoinRequest = async (reqId, status) => {
    try {
      await api.resolveJoinRequest(roomId, reqId, status);
      fetchJoinRequests();
      fetchRoomData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleSaveRoomEdits = () => {
    sendWs('edit_room', {
      location_text: editLocation,
      start_time: new Date(editTime).toISOString()
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:underline mb-4"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Lobbies
      </button>

      {/* Error / Alert banner */}
      {errorMsg && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-6 shadow-xl relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-2xl">{room.sport?.icon || '🏀'}</span>
              <h2 className="text-2xl font-bold text-white">{room.name}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                room.status === 'in_progress' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                room.status === 'locked' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {room.status === 'in_progress' ? 'In Match' : room.status}
              </span>
              {room.join_mode === 'approval_required' && (
                <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Host Approval
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-emerald-400" /> {room.location_text}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-emerald-400" /> {new Date(room.start_time).toLocaleString()}
              </span>
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <Crown className="w-4 h-4" /> Host: {room.host?.name}
              </span>
            </div>
          </div>

          {/* Action Bar / Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {currentParticipant && (
              <button
                onClick={handleToggleReady}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  currentParticipant.is_ready
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                {currentParticipant.is_ready ? 'Ready!' : 'Ready Up'}
              </button>
            )}

            {currentParticipant && (
              <button
                onClick={handleLeaveSlot}
                className="px-3 py-2 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 rounded-xl text-xs font-semibold transition"
              >
                Leave Slot
              </button>
            )}

            {isHost && (
              <button
                onClick={() => setShowHostPanel(!showHostPanel)}
                className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Settings className="w-4 h-4" />
                Host Management
              </button>
            )}
          </div>
        </div>

        {/* Host Control Panel Drawer */}
        {isHost && showHostPanel && (
          <div className="mt-6 border-t border-slate-800 pt-6 bg-slate-950/80 -mx-6 -mb-6 p-6 rounded-b-3xl space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" /> Host Control Center
            </h3>

            {/* Quick Host Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => sendWs('lock_room', {})}
                className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                {room.status === 'locked' ? 'Unlock Lobby' : 'Lock Lobby'}
              </button>

              <button
                onClick={() => sendWs('start_match', {})}
                className="py-2.5 px-3 bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold rounded-xl text-xs flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5" />
                Start Match
              </button>

              <button
                onClick={() => {
                  sendWs('start_match', {});
                  if (onRateRoom) onRateRoom(room);
                }}
                className="py-2.5 px-3 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2"
              >
                Finish & Rate
              </button>

              <button
                onClick={() => sendWs('cancel_room', {})}
                className="py-2.5 px-3 bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 font-bold rounded-xl text-xs flex items-center justify-center gap-2"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel Lobby
              </button>
            </div>

            {/* Edit Venue & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Update Venue</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Update Start Time</label>
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                  />
                  <button
                    onClick={handleSaveRoomEdits}
                    className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>

            {/* Pending Join Requests */}
            {room.join_mode === 'approval_required' && (
              <div className="pt-3 border-t border-slate-800">
                <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  Pending Join Requests ({joinRequests.length})
                </h4>

                {joinRequests.length === 0 ? (
                  <p className="text-xs text-slate-500">No pending join requests.</p>
                ) : (
                  <div className="space-y-2">
                    {joinRequests.map(jr => (
                      <div key={jr.id} className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-emerald-400">
                            {jr.user?.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{jr.user?.name}</p>
                            <p className="text-[10px] text-amber-400">★ {jr.user?.rating_average.toFixed(1)} ({jr.user?.rating_count} games)</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleResolveJoinRequest(jr.id, 'accepted')}
                            className="px-3 py-1 bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleResolveJoinRequest(jr.id, 'declined')}
                            className="px-3 py-1 bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg text-xs"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Grid: Teams & Live Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teams & Slots Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {room.teams?.map((team, idx) => (
              <div key={team.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: team.color || '#EF4444' }} />
                    <h3 className="text-base font-bold text-white">{team.name}</h3>
                  </div>
                  <span className="text-xs font-bold text-slate-400">
                    {team.participants?.length || 0} / {team.slot_count} Players
                  </span>
                </div>

                {/* Numbered Slots */}
                <div className="space-y-2.5">
                  {Array.from({ length: team.slot_count }).map((_, i) => {
                    const slotNum = i + 1;
                    const participant = team.participants?.find(p => p.slot_number === slotNum);

                    return (
                      <div
                        key={slotNum}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition ${
                          participant
                            ? 'bg-slate-950 border-slate-800'
                            : 'bg-slate-950/40 border-dashed border-slate-800/80 hover:border-emerald-500/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 text-[10px] font-bold flex items-center justify-center">
                            #{slotNum}
                          </span>

                          {participant ? (
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-slate-800 overflow-hidden flex items-center justify-center border border-slate-700">
                                {participant.user?.profile_picture_url ? (
                                  <img src={participant.user.profile_picture_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-4 h-4 text-emerald-400" />
                                )}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                  <span>{participant.user?.name}</span>
                                  {participant.role === 'host' && (
                                    <Crown className="w-3.5 h-3.5 text-amber-400" title="Host" />
                                  )}
                                </p>
                                <p className="text-[10px] text-amber-400 font-medium">
                                  ★ {participant.user?.rating_average?.toFixed(1) || '0.0'}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 font-medium">Empty Slot</span>
                          )}
                        </div>

                        {/* Right side controls */}
                        <div>
                          {participant ? (
                            <div className="flex items-center gap-2">
                              {participant.is_ready && (
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[10px] font-bold">
                                  Ready
                                </span>
                              )}

                              {isHost && participant.user_id !== user.id && (
                                <button
                                  onClick={() => sendWs('kick_player', { user_id: participant.user_id })}
                                  className="p-1 text-slate-500 hover:text-rose-400 transition"
                                  title="Kick Player"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleClaimSlot(team.id, slotNum)}
                              className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition shadow-sm"
                            >
                              {room.join_mode === 'approval_required' && !isHost ? 'Request' : 'Claim Slot'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Lobby Chat Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col h-[500px]">
          <div className="border-b border-slate-800 pb-3 mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Live Lobby Chat</h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {chatMessages.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-12">
                Say hello to coordinate details with your team!
              </p>
            ) : (
              chatMessages.map((msg, index) => (
                <div key={index} className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-emerald-400">{msg.user_name}</span>
                    <span className="text-[10px] text-slate-500">
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200">{msg.message}</p>
                </div>
              ))
            )}
            <div ref={chatBottomRef} />
          </div>

          <form onSubmit={handleSendChat} className="mt-3 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Send message..."
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="px-3.5 py-2 bg-emerald-500 text-slate-950 rounded-xl font-bold text-xs"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
