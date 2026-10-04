import React from 'react';
import { Trophy, RotateCcw, Home, Award, CheckCircle2, Vote } from 'lucide-react';
import { MAPS } from '../game/maps';

interface GameOverModalProps {
  winnerName: string;
  winnerId: string;
  isWinner: boolean;
  leaderboard: { name: string; kills: number; deaths: number; color: string }[];
  currentMapId: string;
  mapTallies: Record<string, number>;
  userVotedMap: string | null;
  onVoteMap: (mapId: string) => void;
  onPlayAgain: () => void;
  onExitLobby: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  winnerName,
  isWinner,
  leaderboard,
  currentMapId,
  mapTallies,
  userVotedMap,
  onVoteMap,
  onPlayAgain,
  onExitLobby,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center p-3 md:p-5 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-5 md:p-6 max-w-lg w-full shadow-2xl flex flex-col items-center gap-3.5 text-white text-center animate-scale-up my-auto">
        {/* Victory Trophy Badge */}
        <div className="w-14 h-14 rounded-full bg-linear-to-b from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/40">
          <Trophy className="w-8 h-8 text-slate-950" />
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase">MATCH FINISHED</span>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            {isWinner ? 'VICTORY!' : 'GAME OVER'}
          </h2>
          <p className="text-xs md:text-sm font-extrabold text-slate-300">
            <span className="text-amber-400 font-black">{winnerName}</span> won the arena with 15 kills!
          </p>
        </div>

        {/* Final Standings Table */}
        <div className="w-full bg-slate-950/70 rounded-2xl border border-slate-800 overflow-hidden text-left">
          <div className="grid grid-cols-12 text-[9px] font-black uppercase text-slate-400 px-3 py-1.5 border-b border-slate-800 bg-slate-900/60">
            <span className="col-span-2">Rank</span>
            <span className="col-span-6">Soldier</span>
            <span className="col-span-4 text-right">Kills / Deaths</span>
          </div>
          <div className="divide-y divide-slate-850 max-h-28 overflow-y-auto">
            {leaderboard.map((item, idx) => (
              <div
                key={idx}
                className={`grid grid-cols-12 items-center px-3 py-1.5 text-xs font-bold ${
                  idx === 0 ? 'bg-amber-500/10' : ''
                }`}
              >
                <span className="col-span-2 flex items-center gap-1 font-black">
                  {idx === 0 ? <Award className="w-3.5 h-3.5 text-amber-400" /> : `#${idx + 1}`}
                </span>
                <div className="col-span-6 flex items-center gap-1.5 truncate">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate text-white font-extrabold">{item.name}</span>
                </div>
                <span className="col-span-4 text-right text-amber-400 font-black">
                  {item.kills} <span className="text-slate-400 font-semibold">/ {item.deaths}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* MAP VOTING SECTION */}
        <div className="w-full bg-slate-950/60 p-3 rounded-2xl border border-slate-800 flex flex-col gap-2 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-sky-400">
              <Vote className="w-4 h-4 text-sky-400" />
              <span>Vote Next Arena Map</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400">Tap to vote</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {Object.values(MAPS).map((m) => {
              const votes = mapTallies[m.id] || 0;
              const isSelected = userVotedMap === m.id;

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onVoteMap(m.id)}
                  className={`relative p-2 rounded-xl border text-left flex flex-col gap-1 transition-all active:scale-95 ${
                    isSelected
                      ? 'border-sky-400 bg-sky-950/70 shadow-md shadow-sky-500/20'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white truncate max-w-[85px]">{m.name}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                  </div>
                  <span className="text-[9px] text-slate-400 font-semibold truncate">{m.theme}</span>

                  {/* Vote Count Badge */}
                  <div className="mt-1 flex items-center justify-between">
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                        votes > 0
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {votes} {votes === 1 ? 'vote' : 'votes'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons: Play Again or Main Menu */}
        <div className="flex gap-2 w-full mt-1">
          <button
            type="button"
            onClick={onExitLobby}
            className="flex-1 bg-slate-800 hover:bg-slate-700 active:scale-98 text-slate-300 font-black py-2.5 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <Home className="w-4 h-4" /> Main Menu
          </button>
          <button
            type="button"
            onClick={onPlayAgain}
            className="flex-2 bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-98 text-slate-950 font-black py-2.5 rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/30 transition-all"
          >
            <RotateCcw className="w-4 h-4" /> Play Next Map
          </button>
        </div>
      </div>
    </div>
  );
};
