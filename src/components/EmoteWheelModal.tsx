import React, { useEffect, useState } from 'react';
import { X, Smile, MessageSquare, Flame, Sparkles } from 'lucide-react';
import { EmoteDef } from '../types/game';

interface EmoteWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmote: (emote: string, label: string) => void;
  onSelectQuickChat: (phrase: string) => void;
}

export const POPULAR_EMOTES: EmoteDef[] = [
  { id: 'lol', emoji: '😂', label: 'LOL', category: 'reaction' },
  { id: 'rip', emoji: '💀', label: 'RIP', category: 'taunt' },
  { id: 'fire', emoji: '🔥', label: 'FIRE', category: 'reaction' },
  { id: 'sniped', emoji: '🎯', label: 'SNIPED', category: 'tactical' },
  { id: 'king', emoji: '👑', label: 'CHAMP', category: 'taunt' },
  { id: 'boom', emoji: '💣', label: 'BOOM', category: 'tactical' },
  { id: 'zap', emoji: '⚡', label: 'SHOCKED', category: 'reaction' },
  { id: 'noob', emoji: '💩', label: 'NOOB', category: 'taunt' },
  { id: 'shield', emoji: '🛡️', label: 'DEFEND', category: 'tactical' },
  { id: 'cool', emoji: '🕶️', label: 'SMOOTH', category: 'reaction' },
  { id: 'panic', emoji: '😱', label: 'PANIC', category: 'reaction' },
  { id: 'gg', emoji: '🤝', label: 'GG', category: 'tactical' },
];

export const QUICK_CALLOUTS = [
  { id: 'cover', phrase: 'Cover me! 🛡️', label: 'Cover me!' },
  { id: 'niceshot', phrase: 'Nice shot! 🎯', label: 'Nice shot!' },
  { id: 'rush', phrase: 'Rush them! ⚡', label: 'Rush them!' },
  { id: 'medic', phrase: 'Need health! 🚑', label: 'Medic!' },
  { id: 'behind', phrase: 'Behind you! ⚠️', label: 'Behind you!' },
  { id: 'watchout', phrase: 'Watch out! 💣', label: 'Watch out!' },
  { id: 'ammo', phrase: 'Need ammo! 💥', label: 'Need ammo!' },
  { id: 'ggwp', phrase: 'Good Game! 🏆', label: 'GG WP!' },
  { id: 'fallback', phrase: 'Fall back! 🏃', label: 'Fall back!' },
  { id: 'letsgo', phrase: "Let's do this! 🔥", label: "Let's go!" },
];

export const EmoteWheelModal: React.FC<EmoteWheelModalProps> = ({
  isOpen,
  onClose,
  onSelectEmote,
  onSelectQuickChat,
}) => {
  const [activeTab, setActiveTab] = useState<'emotes' | 'tactical'>('emotes');

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs select-none">
      {/* Background Dim Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-sm sm:max-w-md bg-slate-900/95 border-2 border-amber-500/80 rounded-2xl shadow-2xl overflow-hidden p-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎭</span>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-wide text-white uppercase flex items-center gap-1.5">
                Emote & Callout Wheel
              </h2>
              <p className="text-[10px] text-slate-400">Broadcast overhead animation & team alert</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 gap-2 my-3 p-1 bg-slate-950/70 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('emotes')}
            className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'emotes'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smile className="w-3.5 h-3.5" />
            <span>Overhead Emotes</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tactical')}
            className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'tactical'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Tactical Callouts</span>
          </button>
        </div>

        {/* Content Tabs */}
        {activeTab === 'emotes' ? (
          <div className="grid grid-cols-4 sm:grid-cols-4 gap-2.5 max-h-[300px] overflow-y-auto py-1">
            {POPULAR_EMOTES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectEmote(item.emoji, item.label);
                  onClose();
                }}
                className="group relative flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800/80 hover:bg-amber-500/20 active:scale-90 border border-slate-700 hover:border-amber-400 transition-all cursor-pointer shadow-md"
              >
                <span className="text-2xl sm:text-3xl filter drop-shadow group-hover:scale-110 transition-transform">
                  {item.emoji}
                </span>
                <span className="text-[9px] font-black tracking-tight text-slate-300 group-hover:text-amber-300 mt-1 uppercase truncate max-w-full">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto py-1">
            {QUICK_CALLOUTS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectQuickChat(item.phrase);
                  onClose();
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/80 hover:bg-cyan-500/20 active:scale-95 border border-slate-700 hover:border-cyan-400 text-left transition-all cursor-pointer shadow-md"
              >
                <span className="text-xs font-bold text-white tracking-wide truncate">
                  {item.phrase}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Footer tip */}
        <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
          <span>Shortcut: Press [C] or [E] to toggle</span>
          <span className="text-amber-400 font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Animated In-Game
          </span>
        </div>
      </div>
    </div>
  );
};
