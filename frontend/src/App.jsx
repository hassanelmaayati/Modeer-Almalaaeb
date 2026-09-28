import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { SportSelectView } from './views/SportSelectView';
import { LobbyBrowserView } from './views/LobbyBrowserView';
import { RoomLobbyView } from './views/RoomLobbyView';
import { CreateRoomView } from './views/CreateRoomView';
import { ProfileView } from './views/ProfileView';
import { PostGameRatingModal } from './views/PostGameRatingModal';

export function AppContent() {
  const [currentView, setView] = useState('sports'); // 'sports' | 'lobbies' | 'room' | 'create-room' | 'profile'
  const [selectedSport, setSelectedSport] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [ratingRoom, setRatingRoom] = useState(null);

  const handleSelectSport = (sport) => {
    setSelectedSport(sport);
    setView('lobbies');
  };

  const handleSelectRoom = (roomId) => {
    setSelectedRoomId(roomId);
    setView('room');
  };

  const handleCreateRoomSuccess = (newRoomId) => {
    setSelectedRoomId(newRoomId);
    setView('room');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar currentView={currentView} setView={setView} />

      <main className="flex-1 pb-12">
        {currentView === 'sports' && (
          <SportSelectView onSelectSport={handleSelectSport} />
        )}

        {currentView === 'lobbies' && (
          <LobbyBrowserView
            selectedSport={selectedSport}
            onSelectRoom={handleSelectRoom}
            onCreateRoom={() => setView('create-room')}
            onSelectSportClick={() => setView('sports')}
          />
        )}

        {currentView === 'room' && (
          <RoomLobbyView
            roomId={selectedRoomId}
            onBack={() => setView('lobbies')}
            onRateRoom={(room) => setRatingRoom(room)}
          />
        )}

        {currentView === 'create-room' && (
          <CreateRoomView
            selectedSport={selectedSport}
            onCreated={handleCreateRoomSuccess}
            onBack={() => setView('lobbies')}
          />
        )}

        {currentView === 'profile' && (
          <ProfileView
            onSelectRoom={handleSelectRoom}
            onRateRoom={(room) => setRatingRoom(room)}
          />
        )}
      </main>

      <AuthModal />

      {ratingRoom && (
        <PostGameRatingModal
          room={ratingRoom}
          onClose={() => setRatingRoom(null)}
          onSubmitted={() => setRatingRoom(null)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        Modeer Almalaaeb © 2026 • Real-Time Pickup Sports Platform in Bahrain
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
