import React, { useState } from 'react';
import { Copy, Check, Share2, Play, LogOut, Users, Crown, ShieldAlert } from 'lucide-react';
import { FirebaseLobbyPlayer, FirebaseRoomData } from '../services/firebase';
import { MAPS } from '../game/maps';

interface MatchLobbyModalProps {
  roomCode: string;
  roomData: FirebaseRoomData | null;
  localPlayerId: string;
  isHost: boolean;
  onStartMatch: () => void;
  onLeaveRoom: () => void;
  errorMessage?: string | null;
}

export const MatchLobbyModal: React.FC<MatchLobbyModalProps> = ({
  roomCode,
  roomData,
  localPlayerId,
  isHost,
  onStartMatch,
  onLeaveRoom,
  errorMessage,
}) => {
  const [copied, setCopied] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const players: FirebaseLobbyPlayer[] = roomData?.players
    ? Object.values(roomData.players)
    : [];

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleShare = async () => {
    const shareText = `Join my Battle Toon match! Room Code: ${roomCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Battle Toon Arena Shooter',
          text: shareText,
          url: window.location.href,
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      } catch (e) {
        // User cancelled share
      }
    } else {
      handleCopyCode();
    }
  };

  const currentMap = MAPS[roomData?.mapId || 'jungle'] || MAPS.jungle;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md select-none">
      <div className="relative w-full max-w-lg bg-slate-900/95 border-3 border-amber-500 rounded-3xl shadow-2xl p-5 sm:p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Error Alert Message if any */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-950/80 border-2 border-rose-500 text-rose-200 text-xs font-bold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <div className="flex-1 break-words">{errorMessage}</div>
          </div>
        )}

        {/* Header Title */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-black tracking-widest uppercase">
            <span>⚔️ MULTIPLAYER LOBBY</span>
          </div>
          <p className="text-slate-400 text-xs mt-1">Share this room code with friends to fight together</p>
        </div>

        {/* 4-Letter Room Code in Very Large Text */}
        <div className="flex flex-col items-center justify-center p-4 bg-slate-950 rounded-2xl border-2 border-amber-500/60 shadow-inner">
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">ROOM CODE</span>
          <div className="text-5xl sm:text-6xl font-black font-mono tracking-widest text-amber-400 py-1 drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)]">
            {roomCode}
          </div>

          {/* Action Buttons: Copy Code & Share */}
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-bold text-slate-200 border border-slate-600 hover:border-amber-400 flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
              <span>{copied ? 'Code Copied!' : 'Copy Code'}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="px-4 py-2 rounded-xl bg-sky-600/80 hover:bg-sky-500 active:scale-95 text-xs font-bold text-white border border-sky-400 flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <Share2 className="w-4 h-4" />
              <span>{shareSuccess ? 'Shared!' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* Live List of Players */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-300">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Squad List ({players.length}/6)</span>
            </span>
            <span className="text-[10px] text-slate-400 font-bold">
              Map: {currentMap.name}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
            {players.map((p) => {
              const isLocal = p.id === localPlayerId;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border ${
                    isLocal
                      ? 'bg-amber-500/10 border-amber-500/60 shadow-md'
                      : 'bg-slate-800/60 border-slate-700/80'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-8 h-8 rounded-full border border-black flex items-center justify-center text-sm shadow-xs shrink-0"
                      style={{ backgroundColor: p.avatar?.skinTone || '#fde047' }}
                    >
                      {p.avatar?.headwear === 'beret' ? '🎖️' : p.avatar?.headwear === 'bandana' ? '🥷' : '🪖'}
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="text-xs font-black text-white truncate flex items-center gap-1">
                        {p.name}
                        {isLocal && <span className="text-[9px] text-amber-400">(You)</span>}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold">
                        {p.isHost ? 'Room Commander' : 'Ready'}
                      </span>
                    </div>
                  </div>

                  {p.isHost && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[9px] font-black uppercase flex items-center gap-1 shrink-0">
                      <Crown className="w-3 h-3 fill-slate-950" />
                      Host
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Host Control / Waiting Status */}
        <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onLeaveRoom}
            className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-bold text-rose-300 border border-slate-700 hover:border-rose-500 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Leave Room</span>
          </button>

          {isHost ? (
            <button
              type="button"
              onClick={onStartMatch}
              className="w-full sm:flex-1 py-3 px-6 rounded-2xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-sm font-black text-slate-950 shadow-xl border-2 border-amber-300 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>Start Match for Everyone</span>
            </button>
          ) : (
            <div className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center flex items-center justify-center gap-2 text-slate-300 text-xs font-bold animate-pulse">
              <span className="text-base">⏳</span>
              <span>Waiting for Host to start match...</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
