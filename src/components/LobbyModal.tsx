import React, { useState } from 'react';
import { Play, Plus, LogIn, Shield, Flame, Swords, RefreshCw, Users } from 'lucide-react';
import { MAPS } from '../game/maps';
import { AvatarCustomization } from '../types/game';
import { FirebaseRoomSummary } from '../services/firebase';

interface LobbyModalProps {
  onJoinRoom: (roomCode: string, name: string, avatar: AvatarCustomization) => void;
  onCreateRoom: (name: string, avatar: AvatarCustomization, mapId: string) => void;
  onPlaySurvival: (name: string, avatar: AvatarCustomization, mapId: string) => void;
  avatar: AvatarCustomization;
  playerName: string;
  onOpenAvatarCustomizer: () => void;
  isConnecting: boolean;
  errorMessage: string | null;
  firebaseConnected?: boolean;
  activeRooms?: FirebaseRoomSummary[];
  onRefreshRooms?: () => void;
}

export const LobbyModal: React.FC<LobbyModalProps> = ({
  onJoinRoom,
  onCreateRoom,
  onPlaySurvival,
  avatar,
  playerName,
  onOpenAvatarCustomizer,
  isConnecting,
  errorMessage,
  firebaseConnected = false,
  activeRooms = [],
  onRefreshRooms,
}) => {
  const [selectedMap, setSelectedMap] = useState<string>('jungle');
  const [joinCode, setJoinCode] = useState('');
  const [activeTab, setActiveTab] = useState<'survival' | 'create' | 'join'>('survival');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateRoom(playerName, avatar, selectedMap);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    onJoinRoom(joinCode.trim().toUpperCase(), playerName, avatar);
  };

  const handleJoinSpecificRoom = (code: string) => {
    onJoinRoom(code.toUpperCase(), playerName, avatar);
  };

  const handleSurvival = () => {
    onPlaySurvival(playerName, avatar, selectedMap);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-5 md:p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 text-white my-auto">
        {/* Title & Doodle Branding */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-0.5 rounded-full text-[10px] font-black tracking-widest text-amber-400 uppercase mb-1">
            <Flame className="w-3.5 h-3.5 text-amber-400" /> Hand-Drawn 2D Jetpack Shooter
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white drop-shadow">
            DOODLE TROOPERS
          </h1>
          <p className="text-xs text-slate-400 font-bold mb-2">
            Dual Wield • Rocket Jetpacks • Survival Waves • Online Arena
          </p>

          {/* Firebase Connection Status Badge (.info/connected) */}
          <div className="flex items-center justify-center">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide border shadow-sm ${
                firebaseConnected
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-emerald-500/10'
                  : 'bg-rose-950/80 border-rose-500/60 text-rose-300 shadow-rose-500/10'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  firebaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              Firebase: {firebaseConnected ? 'connected' : 'not connected'}
            </span>
          </div>
        </div>

        {/* Error message Red Box */}
        {errorMessage && (
          <div className="bg-rose-950/90 border-2 border-rose-600 text-rose-200 text-xs font-mono p-3 rounded-2xl text-left flex items-start gap-2.5 shadow-xl shadow-rose-950/50">
            <span className="text-rose-400 text-base leading-none select-none">⚠️</span>
            <div className="flex-1 break-words">
              <span className="text-[10px] uppercase font-black tracking-wider text-rose-400 block mb-0.5">
                Multiplayer Connection Error:
              </span>
              <span className="font-semibold text-rose-100">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Soldier Profile Badge & Custom Avatar button */}
        <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl border-2 border-black flex items-center justify-center text-xl shadow-md"
              style={{ backgroundColor: avatar.skinTone }}
            >
              {avatar.headwear === 'beret'
                ? '🔴'
                : avatar.headwear === 'bandana'
                ? '🧣'
                : avatar.headwear === 'aviator'
                ? '🥽'
                : '🪖'}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-black text-white">{playerName}</span>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                {avatar.headwear} • {avatar.camo}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenAvatarCustomizer}
            className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-sky-400 border border-sky-400/40 font-black text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-transform"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Customize</span>
          </button>
        </div>

        {/* Mode Navigation Tabs */}
        <div className="flex bg-slate-950 rounded-2xl p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('survival')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'survival' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Swords className="w-3.5 h-3.5" /> Survival Waves
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'create' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Create Room
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'join' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" /> Join Room
          </button>
        </div>

        {/* Arena Map Selection */}
        {activeTab !== 'join' && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider text-left">
              Select Battle Map
            </span>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(MAPS).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMap(m.id)}
                  className={`p-2.5 rounded-2xl border text-left flex flex-col gap-0.5 transition-all active:scale-95 ${
                    selectedMap === m.id
                      ? 'border-amber-400 bg-amber-500/15 shadow-md shadow-amber-500/20'
                      : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs font-black text-white truncate">{m.name}</span>
                  <span className="text-[9px] text-slate-400 font-semibold truncate">{m.theme}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB 1: SURVIVAL MODE */}
        {activeTab === 'survival' && (
          <div className="flex flex-col gap-3">
            <div className="bg-amber-950/30 border border-amber-500/30 p-3 rounded-2xl text-left text-xs font-semibold text-amber-200/90 leading-relaxed">
              ⭐ <strong>Survival Mode:</strong> Fight escalating waves of armed doodle bots, earn kill streaks, pick up dual weapons, and survive as long as your 3 lives last!
            </div>
            <button
              type="button"
              onClick={handleSurvival}
              className="w-full bg-linear-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black py-3 rounded-2xl text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 active:scale-98 transition-transform"
            >
              <Play className="w-4 h-4 fill-slate-950" /> Start Survival Mode
            </button>
          </div>
        )}

        {/* TAB 2: CREATE MULTIPLAYER ROOM */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <div className="bg-sky-950/30 border border-sky-500/30 p-3 rounded-2xl text-left text-xs font-semibold text-sky-200/90 leading-relaxed">
              🌐 <strong>Online Multiplayer:</strong> Creates a match room with a 4-letter code for up to 6 players. First soldier to 15 kills wins!
            </div>
            <button
              type="submit"
              disabled={isConnecting}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black py-3 rounded-2xl text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30 active:scale-98 transition-transform disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> {isConnecting ? 'Creating...' : 'Create 4-Letter Room'}
            </button>
          </form>
        )}

        {/* TAB 3: JOIN MULTIPLAYER ROOM */}
        {activeTab === 'join' && (
          <div className="flex flex-col gap-4">
            <form onSubmit={handleJoin} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">
                  Enter 4-Letter Room Code
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. K9Z2"
                  className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-2xl font-black text-center text-amber-400 tracking-widest uppercase focus:outline-hidden focus:border-rose-400 font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={isConnecting || !joinCode.trim()}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-3 rounded-2xl text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 active:scale-98 transition-transform disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" /> {isConnecting ? 'Joining Room...' : 'Enter Arena'}
              </button>
            </form>

            {/* Active Firebase Rooms Listing */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-left">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-amber-400" /> Active Online Rooms
                </span>
                {onRefreshRooms && (
                  <button
                    type="button"
                    onClick={onRefreshRooms}
                    className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                )}
              </div>

              {activeRooms.length === 0 ? (
                <div className="text-[11px] text-slate-500 font-semibold bg-slate-950/40 border border-slate-800/80 rounded-xl p-2.5 text-center">
                  No other active rooms right now. Create one in the "Create Room" tab!
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {activeRooms.map((room) => (
                    <button
                      key={room.code}
                      type="button"
                      onClick={() => handleJoinSpecificRoom(room.code)}
                      disabled={isConnecting}
                      className="flex items-center justify-between bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-amber-400/60 p-2.5 rounded-xl text-left transition-all active:scale-98"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-amber-400 text-sm tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">
                          {room.code}
                        </span>
                        <span className="text-xs font-bold text-white capitalize">
                          {MAPS[room.mapId]?.name || room.mapId}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400">
                          {room.playerCount}/{room.maxPlayers} Players
                        </span>
                        <span className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black px-2 py-0.5 rounded-lg">
                          Join
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
