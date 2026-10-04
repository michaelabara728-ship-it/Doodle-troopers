import React from 'react';
import { X, Trophy, Skull, Crosshair } from 'lucide-react';
import { PlayerState } from '../types/game';

interface ScoreboardModalProps {
  players: PlayerState[];
  onClose: () => void;
  targetKills: number;
}

export const ScoreboardModal: React.FC<ScoreboardModalProps> = ({
  players,
  onClose,
  targetKills,
}) => {
  const sorted = [...players].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-md w-full shadow-2xl flex flex-col gap-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-black tracking-tight">Arena Leaderboard</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs font-bold text-slate-400">
          First soldier to reach <span className="text-amber-400">{targetKills} Kills</span> wins the match!
        </div>

        {/* Players List Table */}
        <div className="bg-slate-950/60 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="grid grid-cols-12 text-[10px] font-black uppercase text-slate-400 px-3 py-2 border-b border-slate-800 bg-slate-900/60">
            <span className="col-span-1">#</span>
            <span className="col-span-6">Soldier</span>
            <span className="col-span-2 text-center">Kills</span>
            <span className="col-span-3 text-center">Deaths</span>
          </div>

          <div className="divide-y divide-slate-850 max-h-[300px] overflow-y-auto">
            {sorted.map((p, idx) => (
              <div
                key={p.id}
                className="grid grid-cols-12 items-center px-3 py-2.5 text-xs font-bold hover:bg-white/5 transition-colors"
              >
                <span className="col-span-1 font-black text-slate-400">{idx + 1}</span>
                <div className="col-span-6 flex items-center gap-2 truncate">
                  <div
                    className="w-3 h-3 rounded-full border border-white/60 shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="truncate text-white font-extrabold">
                    {p.name} {p.isBot && <span className="text-[10px] text-amber-400">[BOT]</span>}
                  </span>
                </div>
                <span className="col-span-2 text-center text-amber-400 font-black">{p.kills}</span>
                <span className="col-span-3 text-center text-slate-400">{p.deaths}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full bg-slate-800 hover:bg-slate-700 active:scale-98 text-white font-black py-2.5 rounded-xl text-xs transition-all"
        >
          Return to Combat
        </button>
      </div>
    </div>
  );
};
