import React from 'react';
import { PlayerState, KillFeedItem } from '../types/game';
import { WEAPONS } from '../game/weapons';
import {
  ZoomIn,
  RefreshCw,
  Trophy,
  Volume2,
  VolumeX,
  ListOrdered,
  Bomb,
  Heart,
  Flame,
  MessageSquare,
  Smile,
} from 'lucide-react';

interface HUDProps {
  localPlayer: PlayerState | undefined;
  players: PlayerState[];
  killFeed: KillFeedItem[];
  roomCode: string;
  zoomLevel: 1 | 2 | 3 | 4 | 5 | 6;
  onCycleZoom: () => void;
  onReload: () => void;
  onCycleGrenade?: () => void;
  onToggleScoreboard: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  mapName: string;
  matchTimerText: string;
  gameMode: 'multiplayer' | 'survival';
  survivalWave?: number;
  onToggleChat?: () => void;
  unreadChatCount?: number;
  onOpenEmoteWheel?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  localPlayer,
  killFeed,
  roomCode,
  zoomLevel,
  onCycleZoom,
  onReload,
  onCycleGrenade,
  onToggleScoreboard,
  isMuted,
  onToggleMute,
  matchTimerText,
  gameMode,
  survivalWave,
  onToggleChat,
  unreadChatCount,
  onOpenEmoteWheel,
}) => {
  if (!localPlayer) return null;

  const currentWeapon = WEAPONS[localPlayer.currentWeapon] || WEAPONS.pistol;
  const maxClipAmmo = localPlayer.isDualWielding ? currentWeapon.ammoMax * 2 : currentWeapon.ammoMax;
  const maxHp = localPlayer.maxHealth || 120;
  const hpRatio = Math.max(0, localPlayer.health / maxHp);
  const fuelRatio = Math.max(0, localPlayer.fuel / localPlayer.maxFuel);

  const activeGrenadeCount = localPlayer.grenadeInventory
    ? localPlayer.grenadeInventory[localPlayer.currentGrenadeType || 'frag'] || 0
    : localPlayer.grenades ?? 3;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 p-2.5 flex flex-col justify-between">
      {/* EMP Stunned Alert */}
      {localPlayer.stunTimer && localPlayer.stunTimer > 0 && !localPlayer.isDead && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 pointer-events-none z-30">
          <div className="bg-sky-950/90 border-2 border-sky-400 text-sky-200 px-3.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xl animate-pulse backdrop-blur-xs">
            <span className="text-sm">⚡</span>
            <span className="text-xs font-black tracking-wider uppercase text-white">EMP STUNNED!</span>
            <span className="text-[10px] font-mono text-sky-300 font-extrabold">{localPlayer.stunTimer.toFixed(1)}s</span>
          </div>
        </div>
      )}

      {/* Burning Alert */}
      {localPlayer.burnTimer && localPlayer.burnTimer > 0 && !localPlayer.isDead && (
        <div className="fixed top-22 left-1/2 -translate-x-1/2 pointer-events-none z-30">
          <div className="bg-orange-950/90 border-2 border-orange-500 text-orange-200 px-3.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xl animate-pulse backdrop-blur-xs">
            <span className="text-sm">🔥</span>
            <span className="text-xs font-black tracking-wider uppercase text-white">BURNING!</span>
          </div>
        </div>
      )}

      {/* Small Room Code Corner Badge */}
      {roomCode && (
        <div className="fixed bottom-3 right-3 pointer-events-none z-20">
          <div className="bg-slate-950/85 border border-amber-500/60 text-amber-300 px-2.5 py-1 rounded-xl shadow-lg backdrop-blur-xs flex items-center gap-1.5 font-mono text-[11px] font-black tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>ROOM: {roomCode}</span>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div className="flex items-start justify-between w-full">
        {/* TOP-LEFT: Zoom Button & Health / Fuel / Lives */}
        <div className="flex items-center gap-2">
          {/* Zoom / Scope Button (1x, 2x, 4x) */}
          <button
            type="button"
            onClick={onCycleZoom}
            className="pointer-events-auto bg-slate-900/85 active:scale-95 border-2 border-sky-400/60 text-sky-300 rounded-2xl px-2.5 py-1.5 flex flex-col items-center justify-center shadow-lg backdrop-blur-xs transition-transform"
            title="Cycle Camera Zoom (1x to 6x)"
          >
            <div className="flex items-center gap-0.5">
              <ZoomIn className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-xs font-black tracking-wider text-white">{zoomLevel}x</span>
            </div>
            <span className="text-[8px] font-black uppercase text-sky-400/90 tracking-tighter">SCOPE</span>
          </button>

          {/* Health Bar (Purple), Fuel Bar (Blue) & Lives Counter */}
          <div className="bg-slate-900/85 border-2 border-slate-700/80 rounded-2xl p-2 flex items-center gap-3 shadow-lg backdrop-blur-xs min-w-[200px]">
            {/* Lives Counter with soldier face icon */}
            <div className="flex items-center gap-1 bg-slate-800/90 px-2 py-1 rounded-xl border border-slate-700">
              {/* Doodle soldier face mini badge */}
              <div
                className="w-5 h-5 rounded-full border border-black flex items-center justify-center text-[10px] shadow-xs"
                style={{ backgroundColor: localPlayer.avatar?.skinTone || '#fde047' }}
              >
                🪖
              </div>
              <span className="text-xs font-black text-amber-300">
                x{localPlayer.lives !== undefined ? localPlayer.lives : 3}
              </span>
            </div>

            {/* Health & Fuel Bars */}
            <div className="flex flex-col gap-1 w-28 md:w-32">
              {/* HEALTH BAR (PURPLE or Pulsing EMERALD on passive regen) */}
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between text-[9px] font-black leading-none">
                  <span className={`flex items-center gap-0.5 ${localPlayer.isRegeneratingHealth ? 'text-emerald-400 font-extrabold animate-pulse' : 'text-purple-300'}`}>
                    <Heart className={`w-2.5 h-2.5 ${localPlayer.isRegeneratingHealth ? 'text-emerald-400 fill-emerald-400' : 'text-purple-400 fill-purple-400'}`} />
                    HP {localPlayer.isRegeneratingHealth && <span className="text-[7.5px] uppercase tracking-tighter text-emerald-300 ml-0.5 font-black">+REGEN</span>}
                  </span>
                  <span className={localPlayer.isRegeneratingHealth ? 'text-emerald-300 font-extrabold font-mono text-[9px]' : 'text-purple-200 font-mono text-[9px]'}>
                    {Math.round(localPlayer.health)}/{maxHp}
                  </span>
                </div>
                <div className={`w-full h-2 bg-slate-950 rounded-full overflow-hidden border p-0.5 transition-colors ${localPlayer.isRegeneratingHealth ? 'border-emerald-400/80 shadow-xs shadow-emerald-500/50' : 'border-purple-500/40'}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-100 ${localPlayer.isRegeneratingHealth ? 'bg-linear-to-r from-emerald-600 via-emerald-400 to-green-300' : 'bg-linear-to-r from-purple-600 via-purple-500 to-fuchsia-400'}`}
                    style={{ width: `${hpRatio * 100}%` }}
                  />
                </div>
              </div>

              {/* JETPACK FUEL BAR (BLUE) */}
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between text-[9px] font-black leading-none">
                  <span className="text-sky-300 flex items-center gap-0.5">
                    <Flame className="w-2.5 h-2.5 text-sky-400 fill-sky-400" /> JET
                  </span>
                  <span className="text-sky-200">{Math.round(localPlayer.fuel)}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-sky-500/40 p-0.5">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-blue-600 to-sky-400 transition-all duration-75"
                    style={{ width: `${fuelRatio * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TOP-CENTER: Match Timer / Survival Wave */}
        <div className="flex flex-col items-center">
          <div className="bg-slate-900/85 border-2 border-amber-500/50 rounded-2xl px-3 py-1 flex items-center gap-1.5 shadow-lg backdrop-blur-xs">
            <span className="text-amber-400 text-xs font-black">⏱</span>
            <span className="text-sm font-black tracking-wider text-white font-mono">{matchTimerText}</span>
          </div>
          {gameMode === 'survival' && (
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest mt-0.5 drop-shadow">
              WAVE {survivalWave || 1}
            </span>
          )}
        </div>

        {/* TOP-RIGHT: Weapon Panel & Reload Button & Controls */}
        <div className="flex items-center gap-1.5">
          {/* Match Chat Button with unread indicator */}
          {onToggleChat && (
            <button
              type="button"
              onClick={onToggleChat}
              className="relative pointer-events-auto bg-slate-900/85 active:scale-95 border border-slate-700 hover:border-amber-400 text-slate-300 p-2 rounded-xl shadow-md transition-colors cursor-pointer"
              title="Toggle Match Chat [Enter]"
            >
              <MessageSquare className="w-4 h-4 text-amber-400" />
              {unreadChatCount && unreadChatCount > 0 ? (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                  {unreadChatCount > 9 ? '9+' : unreadChatCount}
                </span>
              ) : null}
            </button>
          )}

          {/* Emote & Callout Wheel Button */}
          {onOpenEmoteWheel && (
            <button
              type="button"
              onClick={onOpenEmoteWheel}
              className="pointer-events-auto bg-slate-900/85 active:scale-95 border border-slate-700 hover:border-amber-400 text-slate-300 p-2 rounded-xl shadow-md transition-colors cursor-pointer"
              title="Emotes & Quick Callouts [C]"
            >
              <Smile className="w-4 h-4 text-amber-300" />
            </button>
          )}

          {/* Mute and Scoreboard buttons */}
          <button
            type="button"
            onClick={onToggleScoreboard}
            className="pointer-events-auto bg-slate-900/85 active:scale-95 border border-slate-700 text-slate-300 p-2 rounded-xl shadow-md cursor-pointer"
            title="Scoreboard [TAB]"
          >
            <ListOrdered className="w-4 h-4 text-amber-400" />
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            className="pointer-events-auto bg-slate-900/85 active:scale-95 border border-slate-700 text-slate-300 p-2 rounded-xl shadow-md cursor-pointer"
            title="Mute Audio"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
          </button>

          {/* Current Weapon Panel */}
          <div className="bg-slate-900/85 border-2 border-slate-700/80 rounded-2xl px-3 py-1.5 flex items-center gap-2.5 shadow-lg backdrop-blur-xs">
            {/* Gun Icon & Name */}
            <div className="flex flex-col items-start leading-tight">
              <div className="flex items-center gap-1">
                <span className="text-base">{currentWeapon.icon}</span>
                <span className="text-xs font-black text-white">{currentWeapon.name}</span>
                {localPlayer.isDualWielding && (
                  <span className="text-[8px] font-black bg-amber-500 text-slate-950 px-1 rounded-sm">
                    x2
                  </span>
                )}
              </div>
              {/* Ammo in clip and reserve */}
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-sm font-black text-amber-400 font-mono">
                  {localPlayer.ammo}
                </span>
                <span className="text-[10px] font-extrabold text-slate-400 font-mono">
                  / {localPlayer.reserveAmmo}
                </span>
              </div>
            </div>

            {/* Grenade Badge / Switcher with count */}
            <button
              type="button"
              onClick={onCycleGrenade}
              className="pointer-events-auto flex items-center gap-1 bg-slate-800/90 hover:bg-slate-700/90 active:scale-95 px-2 py-0.5 rounded-lg border border-slate-700 shadow-sm transition-transform cursor-pointer"
              title="Cycle Grenade Type (Frag 💣, EMP Stun ⚡, Toxic Gas 🧪) [T]"
            >
              <span className="text-xs">
                {localPlayer.currentGrenadeType === 'stun'
                  ? '⚡'
                  : localPlayer.currentGrenadeType === 'gas'
                  ? '🧪'
                  : '💣'}
              </span>
              <span
                className={`text-[11px] font-black ${
                  localPlayer.currentGrenadeType === 'stun'
                    ? 'text-sky-300'
                    : localPlayer.currentGrenadeType === 'gas'
                    ? 'text-lime-300'
                    : 'text-amber-300'
                }`}
              >
                {activeGrenadeCount}
              </span>
            </button>

            {/* Reload Button */}
            <button
              type="button"
              onClick={onReload}
              className={`pointer-events-auto bg-amber-500 active:bg-amber-400 text-slate-950 px-2 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md active:scale-95 transition-transform ${
                localPlayer.isReloading ? 'animate-spin opacity-70' : ''
              }`}
              title="Reload Weapon"
            >
              <RefreshCw className="w-3 h-3" />
              <span className="hidden sm:inline">RELOAD</span>
            </button>
          </div>
        </div>
      </div>

      {/* TOP-RIGHT CORNER: Real-time Kill Feed */}
      <div className="flex flex-col items-end gap-1 mt-1 pr-1 pointer-events-none">
        {killFeed.slice(0, 3).map((item) => (
          <div
            key={item.id}
            className="bg-slate-950/80 border border-slate-800/80 rounded-xl px-2 py-0.5 text-[10px] font-extrabold flex items-center gap-1 shadow-md backdrop-blur-xs animate-fade-in"
          >
            <span style={{ color: item.killerColor }}>{item.killerName}</span>
            <span>{item.weapon === 'melee' ? '👊' : item.weapon === 'grenade' ? '💣' : '🔫'}</span>
            <span style={{ color: item.victimColor }}>{item.victimName}</span>
          </div>
        ))}
      </div>

      {/* Respawn Countdown Overlay if dead */}
      {localPlayer.isDead && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center bg-black/50 z-30">
          <div className="bg-slate-900/90 border-2 border-rose-500 rounded-3xl p-4 flex flex-col items-center gap-1 shadow-2xl animate-pulse">
            <span className="text-rose-400 text-xs font-black uppercase tracking-widest">RESPAWNING IN</span>
            <span className="text-4xl font-black text-white font-mono">
              {Math.max(1, Math.ceil(localPlayer.respawnTimeRemaining))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
