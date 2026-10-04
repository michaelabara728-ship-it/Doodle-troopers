import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, X, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { ChatMessage } from '../types/game';

interface ChatOverlayProps {
  messages: ChatMessage[];
  isOpen: boolean;
  onToggleOpen: () => void;
  onSendMessage: (text: string) => void;
  onOpenEmoteWheel: () => void;
  localPlayerName: string;
}

const QUICK_CHIPS = [
  'Cover me! 🛡️',
  'Nice shot! 🎯',
  'Rush them! ⚡',
  'Medic! 🚑',
  'Behind you! ⚠️',
  'Need ammo! 💥',
  'GG WP! 🏆',
];

export const ChatOverlay: React.FC<ChatOverlayProps> = ({
  messages,
  isOpen,
  onToggleOpen,
  onSendMessage,
  onOpenEmoteWheel,
  localPlayerName,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle desktop key shortcut: Enter to open/focus or send
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input other than our chat input
      if (document.activeElement && document.activeElement.tagName === 'INPUT' && document.activeElement !== inputRef.current) {
        return;
      }

      if (e.key === 'Enter') {
        if (!isOpen) {
          e.preventDefault();
          onToggleOpen();
        }
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onToggleOpen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onToggleOpen]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInputText('');
  };

  const handleChipClick = (chip: string) => {
    onSendMessage(chip);
    if (!isOpen) onToggleOpen();
  };

  // Recent messages for passive floating display (last 4 within 7 seconds)
  const now = Date.now();
  const recentMessages = messages.filter((m) => now - m.timestamp < 6500).slice(-4);

  return (
    <>
      {/* 1. PASSIVE FLOATING CHAT FEED (Visible when chat box is CLOSED during active gameplay) */}
      {!isOpen && recentMessages.length > 0 && (
        <div className="fixed top-18 left-3 z-30 flex flex-col gap-1.5 max-w-[280px] sm:max-w-xs pointer-events-none select-none">
          {recentMessages.map((msg) => {
            const age = now - msg.timestamp;
            const opacity = age > 5000 ? Math.max(0.2, (6500 - age) / 1500) : 1;

            if (msg.system) {
              return (
                <div
                  key={msg.id}
                  style={{ opacity }}
                  className="px-2.5 py-1 rounded-lg bg-slate-950/75 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold shadow-md animate-in fade-in slide-in-from-left-2 duration-200"
                >
                  📢 {msg.text}
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                style={{ opacity }}
                className="px-2.5 py-1 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-xs shadow-lg backdrop-blur-xs flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 duration-200"
              >
                <span
                  className="font-black text-[11px] truncate max-w-[85px]"
                  style={{ color: msg.senderColor || '#38bdf8' }}
                >
                  {msg.senderName}:
                </span>
                <span className="font-semibold text-slate-100 truncate text-[11px] flex-1">
                  {msg.text}
                </span>
                {msg.isEmote && <span className="text-sm shrink-0">✨</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* 2. EXPANDED FULL CHAT MODAL / DOCKED PANEL */}
      {isOpen && (
        <div className="fixed top-16 left-3 z-40 w-[92vw] max-w-sm bg-slate-950/95 border-2 border-slate-700/90 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden flex flex-col pointer-events-auto animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black uppercase tracking-wider text-white">Match Chat</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                LIVE
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onOpenEmoteWheel}
                className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold border border-amber-500/40 flex items-center gap-1 cursor-pointer"
                title="Open Emote Wheel [C]"
              >
                <span>🎭 Emotes</span>
              </button>
              <button
                type="button"
                onClick={onToggleOpen}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Chat Callout Chips */}
          <div className="px-2.5 py-1.5 bg-slate-900/60 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {QUICK_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleChipClick(chip)}
                className="shrink-0 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-[10px] font-bold text-slate-200 border border-slate-700 hover:border-amber-400/60 cursor-pointer transition-all whitespace-nowrap"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Message History List */}
          <div className="h-44 sm:h-52 overflow-y-auto p-2.5 space-y-1.5 text-xs">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center px-4">
                <span className="text-xl mb-1">💬</span>
                <span className="text-[11px] font-medium">No messages yet. Send a chat or emote to opponents!</span>
              </div>
            ) : (
              messages.map((msg) => {
                const isLocal = msg.senderName === localPlayerName;

                if (msg.system) {
                  return (
                    <div
                      key={msg.id}
                      className="px-2 py-1 rounded bg-slate-900/70 border border-slate-800 text-center text-[10px] text-emerald-400 font-semibold"
                    >
                      📢 {msg.text}
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isLocal ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1 mb-0.5 text-[9px] text-slate-400">
                      <span
                        className="font-bold truncate max-w-[100px]"
                        style={{ color: msg.senderColor || '#38bdf8' }}
                      >
                        {msg.senderName}
                      </span>
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <div
                      className={`px-3 py-1.5 rounded-xl max-w-[85%] break-words ${
                        isLocal
                          ? 'bg-amber-500 text-slate-950 font-bold rounded-tr-xs'
                          : msg.isEmote
                          ? 'bg-slate-800 border border-amber-500/40 text-amber-200 font-bold rounded-tl-xs'
                          : 'bg-slate-800 text-slate-100 font-medium rounded-tl-xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSubmit} className="p-2 bg-slate-900 border-t border-slate-800 flex items-center gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value.substring(0, 100))}
              placeholder="Say something... (Press Enter)"
              maxLength={100}
              className="flex-1 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-slate-950 flex items-center justify-center font-bold transition-all cursor-pointer shadow-md"
              title="Send [Enter]"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
