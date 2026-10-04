import React, { useRef, useEffect, useState } from 'react';
import { Flame, Bomb, Swords, ArrowLeftRight, Crosshair } from 'lucide-react';

interface TouchControlsProps {
  onMoveChange: (x: number, y: number) => void;
  onAimChange: (x: number, y: number, isShooting: boolean) => void;
  onMelee: () => void;
  onThrowGrenade: () => void;
  onSwapWeapon: () => void;
  onCycleGrenade?: () => void;
  onOpenEmoteWheel?: () => void;
  onToggleChat?: () => void;
  grenadeCount: number;
  grenadeType?: 'frag' | 'stun' | 'gas';
}

const MAX_KNOB_TRAVEL = 44; // Max distance knob can travel from center inside the fixed base
const TOUCH_ACTIVATION_RADIUS = 82; // Touch area radius around the center (base is 72px radius)
const SWAP_ZONE_RADIUS = 18; // Dragging close to center triggers weapon swap

export const TouchControls: React.FC<TouchControlsProps> = ({
  onMoveChange,
  onAimChange,
  onMelee,
  onThrowGrenade,
  onSwapWeapon,
  onCycleGrenade,
  onOpenEmoteWheel,
  onToggleChat,
  grenadeCount,
  grenadeType = 'frag',
}) => {
  // FIXED Left Joystick (Movement + Jetpack fly up + Crouch)
  const leftBaseRef = useRef<HTMLDivElement>(null);
  const leftTouchId = useRef<number | null>(null);
  const [leftKnob, setLeftKnob] = useState<{
    active: boolean;
    x: number;
    y: number;
    thrustRatio: number;
  }>({
    active: false,
    x: 0,
    y: 0,
    thrustRatio: 0,
  });

  // FIXED Right Joystick (Aim + Auto-fire + Drag-to-center Weapon Swap)
  const rightBaseRef = useRef<HTMLDivElement>(null);
  const rightTouchId = useRef<number | null>(null);
  const hasTriggeredSwapRef = useRef(false);
  const [rightKnob, setRightKnob] = useState<{
    active: boolean;
    x: number;
    y: number;
    inSwapZone: boolean;
  }>({
    active: false,
    x: 0,
    y: 0,
    inSwapZone: false,
  });

  // LEFT JOYSTICK TOUCH HANDLERS (Fixed Base)
  const handleLeftTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (leftTouchId.current !== null) return;

    const baseEl = leftBaseRef.current;
    if (!baseEl) return;
    const rect = baseEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const dist = Math.hypot(touch.clientX - centerX, touch.clientY - centerY);
      // Only responds to touches that start inside its own base circle (with slightly larger touch hit area)
      if (dist <= TOUCH_ACTIVATION_RADIUS) {
        leftTouchId.current = touch.identifier;
        updateLeftJoystick(touch.clientX, touch.clientY, centerX, centerY);
        break;
      }
    }
  };

  const updateLeftJoystick = (clientX: number, clientY: number, centerX: number, centerY: number) => {
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    // Knob moves only inside its fixed base
    let knobX = dx;
    let knobY = dy;
    if (dist > MAX_KNOB_TRAVEL) {
      knobX = (dx / dist) * MAX_KNOB_TRAVEL;
      knobY = (dy / dist) * MAX_KNOB_TRAVEL;
    }

    const normX = Math.max(-1, Math.min(1, dx / MAX_KNOB_TRAVEL));
    const normY = Math.max(-1, Math.min(1, dy / MAX_KNOB_TRAVEL));
    const upwardThrust = Math.max(0, -normY);

    setLeftKnob({
      active: true,
      x: knobX,
      y: knobY,
      thrustRatio: upwardThrust,
    });

    onMoveChange(normX, normY);
  };

  // RIGHT JOYSTICK TOUCH HANDLERS (Fixed Base)
  const handleRightTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (rightTouchId.current !== null) return;

    const baseEl = rightBaseRef.current;
    if (!baseEl) return;
    const rect = baseEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const dist = Math.hypot(touch.clientX - centerX, touch.clientY - centerY);
      // Only responds to touches that start inside its own base circle (with slightly larger touch hit area)
      if (dist <= TOUCH_ACTIVATION_RADIUS) {
        rightTouchId.current = touch.identifier;
        hasTriggeredSwapRef.current = false;
        updateRightJoystick(touch.clientX, touch.clientY, centerX, centerY);
        break;
      }
    }
  };

  const updateRightJoystick = (clientX: number, clientY: number, centerX: number, centerY: number) => {
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    // Knob moves only inside its fixed base
    let knobX = dx;
    let knobY = dy;
    if (dist > MAX_KNOB_TRAVEL) {
      knobX = (dx / dist) * MAX_KNOB_TRAVEL;
      knobY = (dy / dist) * MAX_KNOB_TRAVEL;
    }

    // Inner ring weapon swap check
    const inSwapZone = dist < SWAP_ZONE_RADIUS;
    if (inSwapZone && !hasTriggeredSwapRef.current) {
      hasTriggeredSwapRef.current = true;
      onSwapWeapon();
    } else if (!inSwapZone) {
      hasTriggeredSwapRef.current = false;
    }

    let aimX = dx;
    let aimY = dy;
    if (dist < 4) {
      aimX = 1;
      aimY = 0;
    } else {
      aimX = dx / dist;
      aimY = dy / dist;
    }

    // Fire weapon while dragged outside inner swap zone
    const isShooting = dist >= SWAP_ZONE_RADIUS;

    setRightKnob({
      active: true,
      x: knobX,
      y: knobY,
      inSwapZone,
    });

    onAimChange(aimX, aimY, isShooting);
  };

  // Global window touchmove & touchend listeners so drag remains fluid even if finger drifts slightly
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === leftTouchId.current && leftBaseRef.current) {
          const rect = leftBaseRef.current.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          updateLeftJoystick(touch.clientX, touch.clientY, centerX, centerY);
        } else if (touch.identifier === rightTouchId.current && rightBaseRef.current) {
          const rect = rightBaseRef.current.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          updateRightJoystick(touch.clientX, touch.clientY, centerX, centerY);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === leftTouchId.current) {
          leftTouchId.current = null;
          // Snap knob back to center
          setLeftKnob({
            active: false,
            x: 0,
            y: 0,
            thrustRatio: 0,
          });
          onMoveChange(0, 0);
        } else if (touch.identifier === rightTouchId.current) {
          rightTouchId.current = null;
          hasTriggeredSwapRef.current = false;
          // Snap knob back to center
          setRightKnob({
            active: false,
            x: 0,
            y: 0,
            inSwapZone: false,
          });
          onAimChange(0, 0, false);
        }
      }
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [onMoveChange, onAimChange, onSwapWeapon]);

  // Desktop keyboard & mouse fallback
  useEffect(() => {
    const keysDown = new Set<string>();

    const updateKeys = () => {
      let mx = 0;
      let my = 0;
      if (keysDown.has('KeyA') || keysDown.has('ArrowLeft')) mx -= 1;
      if (keysDown.has('KeyD') || keysDown.has('ArrowRight')) mx += 1;
      if (keysDown.has('KeyW') || keysDown.has('ArrowUp') || keysDown.has('Space')) my -= 1;
      if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) my += 0.5;

      const isKeyActive = mx !== 0 || my !== 0;
      setLeftKnob({
        active: isKeyActive,
        x: mx * MAX_KNOB_TRAVEL,
        y: (my > 0 ? 0.6 : my) * MAX_KNOB_TRAVEL,
        thrustRatio: Math.max(0, -my),
      });

      onMoveChange(mx, my);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') {
        return;
      }
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW'].includes(e.code)) {
        e.preventDefault();
      }
      keysDown.add(e.code);
      if (e.code === 'KeyF') onMelee();
      if (e.code === 'KeyG') onThrowGrenade();
      if (e.code === 'KeyT') onCycleGrenade?.();
      if (e.code === 'KeyQ') onSwapWeapon();
      if (e.code === 'KeyC' || e.code === 'KeyE') onOpenEmoteWheel?.();
      updateKeys();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDown.delete(e.code);
      updateKeys();
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy) || 1;
        setRightKnob({
          active: true,
          x: (dx / dist) * MAX_KNOB_TRAVEL,
          y: (dy / dist) * MAX_KNOB_TRAVEL,
          inSwapZone: false,
        });
        onAimChange(dx / dist, dy / dist, true);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (e.buttons === 1) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy) || 1;
        setRightKnob({
          active: true,
          x: (dx / dist) * MAX_KNOB_TRAVEL,
          y: (dy / dist) * MAX_KNOB_TRAVEL,
          inSwapZone: false,
        });
        onAimChange(dx / dist, dy / dist, true);
      }
    };

    const handleMouseUp = () => {
      setRightKnob({
        active: false,
        x: 0,
        y: 0,
        inSwapZone: false,
      });
      onAimChange(1, 0, false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onMoveChange, onAimChange, onMelee, onThrowGrenade, onSwapWeapon]);

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 overflow-hidden">
      {/* FIXED MOVE JOYSTICK (Bottom-Left: always in the same place, never moves or floats) */}
      <div
        className="absolute bottom-5 left-5 pointer-events-auto touch-none select-none flex items-center justify-center p-2"
        onTouchStart={handleLeftTouchStart}
        style={{
          paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
          paddingLeft: 'calc(1.25rem + env(safe-area-inset-left, 0px))',
        }}
      >
        {/* Fixed Base Circle */}
        <div
          ref={leftBaseRef}
          className={`relative w-36 h-36 rounded-full border-2 shadow-2xl backdrop-blur-xs flex items-center justify-center transition-colors duration-150 ${
            leftKnob.active
              ? leftKnob.thrustRatio > 0.1
                ? 'border-amber-400 bg-amber-950/60 shadow-amber-500/20'
                : 'border-sky-400 bg-sky-950/50 shadow-sky-500/20'
              : 'border-sky-400/50 bg-slate-950/80 shadow-black/60'
          }`}
        >
          {/* Inner Guide Ring */}
          <div className="absolute inset-3 rounded-full border border-sky-400/20 pointer-events-none" />

          {/* Upward Thrust Indicator */}
          <div className="absolute top-2 flex flex-col items-center pointer-events-none">
            <Flame
              className={`w-4 h-4 transition-colors ${
                leftKnob.thrustRatio > 0.1 ? 'text-amber-400 animate-pulse' : 'text-amber-400/80'
              }`}
            />
            <span className="text-[7.5px] font-black text-amber-300 uppercase tracking-tight">
              {leftKnob.thrustRatio > 0.1 ? `FLY ${Math.round(leftKnob.thrustRatio * 100)}%` : 'UP TO FLY'}
            </span>
          </div>

          {/* Horizontal Movement Guides */}
          <div className="flex items-center justify-between w-full px-2.5 text-[8.5px] font-black text-sky-300/70 pointer-events-none">
            <span>◀ RUN</span>
            <span>RUN ▶</span>
          </div>

          {/* Downward Crouch Guide */}
          <div className="absolute bottom-2 flex flex-col items-center pointer-events-none">
            <span className="text-[7.5px] font-black text-sky-300/80 uppercase tracking-tight">
              DOWN TO CROUCH 🛡️
            </span>
          </div>

          {/* Small Inner Knob - moves strictly inside base, snaps back to center on release */}
          <div
            className={`absolute w-14 h-14 rounded-full border-2 border-white shadow-xl flex items-center justify-center pointer-events-none ${
              leftKnob.active
                ? leftKnob.thrustRatio > 0.1
                  ? 'bg-linear-to-b from-amber-400 to-orange-600'
                  : 'bg-linear-to-b from-sky-400 to-blue-600'
                : 'bg-linear-to-b from-sky-400/90 to-blue-600/90 transition-transform duration-150 ease-out'
            }`}
            style={{
              transform: `translate(${leftKnob.x}px, ${leftKnob.y}px)`,
            }}
          >
            <div className="w-4 h-4 rounded-full bg-white/70 shadow-xs" />
          </div>
        </div>
      </div>

      {/* BOTTOM-CENTER: Actions (Emote, Melee, Grenades) */}
      <div
        className="absolute bottom-5 left-1/2 -translate-x-1/2 pointer-events-none flex items-center justify-center pb-2"
        style={{
          paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Quick Emote & Callout Button */}
          {onOpenEmoteWheel && (
            <button
              type="button"
              onClick={onOpenEmoteWheel}
              className="w-13 h-13 rounded-2xl bg-linear-to-b from-amber-400 to-amber-600 border-2 border-white/90 shadow-xl flex flex-col items-center justify-center active:scale-90 active:bg-amber-700 text-slate-950 transition-transform cursor-pointer"
              title="Emotes & Callouts [C]"
            >
              <span className="text-lg leading-none">🎭</span>
              <span className="text-[7px] font-black uppercase tracking-tighter mt-0.5">EMOTE</span>
            </button>
          )}

          {/* Melee (Fist / Knife) Button */}
          <button
            type="button"
            onClick={onMelee}
            className="w-13 h-13 rounded-2xl bg-linear-to-b from-orange-500 to-red-600 border-2 border-white/90 shadow-xl flex flex-col items-center justify-center active:scale-90 active:bg-orange-700 text-white transition-transform cursor-pointer"
            title="Melee Attack [F]"
          >
            <Swords className="w-5 h-5 text-white" />
            <span className="text-[7.5px] font-black uppercase tracking-tighter">MELEE</span>
          </button>

          {/* Grenade Button (With Count & Current Type) */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onThrowGrenade}
              disabled={grenadeCount <= 0}
              className={`w-13 h-13 rounded-2xl border-2 border-white/90 shadow-xl flex flex-col items-center justify-center transition-transform active:scale-90 cursor-pointer ${
                grenadeCount > 0
                  ? grenadeType === 'stun'
                    ? 'bg-linear-to-b from-sky-500 to-blue-700 text-white active:bg-sky-800'
                    : grenadeType === 'gas'
                    ? 'bg-linear-to-b from-lime-500 to-emerald-700 text-white active:bg-lime-800'
                    : 'bg-linear-to-b from-emerald-500 to-green-700 text-white active:bg-emerald-800'
                  : 'bg-slate-800/80 text-slate-500 border-slate-700 cursor-not-allowed'
              }`}
              title="Throw Grenade [G]"
            >
              <span className="text-lg leading-none">
                {grenadeType === 'stun' ? '⚡' : grenadeType === 'gas' ? '🧪' : '💣'}
              </span>
              <span className="text-[7px] font-black uppercase tracking-tighter mt-0.5">
                {grenadeType === 'stun' ? 'STUN' : grenadeType === 'gas' ? 'GAS' : 'BOMB'} ({grenadeCount})
              </span>
            </button>

            {/* Cycle Grenade Type Button */}
            {onCycleGrenade && (
              <button
                type="button"
                onClick={onCycleGrenade}
                className="w-7 h-13 rounded-xl bg-slate-900/90 active:bg-slate-800 border border-slate-600 shadow-md flex flex-col items-center justify-center text-slate-300 active:scale-95 transition-transform cursor-pointer"
                title="Cycle Grenade Type (Frag, Stun, Gas) [T]"
              >
                <span className="text-[11px] font-black text-amber-400">↺</span>
                <span className="text-[6.5px] font-black uppercase text-slate-300 mt-0.5">TYPE</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FIXED AIM/FIRE JOYSTICK (Bottom-Right: always in the same place, never moves or floats) */}
      <div
        className="absolute bottom-5 right-5 pointer-events-auto touch-none select-none flex items-center justify-center p-2"
        onTouchStart={handleRightTouchStart}
        style={{
          paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
          paddingRight: 'calc(1.25rem + env(safe-area-inset-right, 0px))',
        }}
      >
        {/* Fixed Base Circle */}
        <div
          ref={rightBaseRef}
          className={`relative w-36 h-36 rounded-full border-2 shadow-2xl backdrop-blur-xs flex items-center justify-center transition-colors duration-150 ${
            rightKnob.active
              ? rightKnob.inSwapZone
                ? 'border-sky-400 bg-sky-950/60 shadow-sky-500/20'
                : 'border-rose-500 bg-rose-950/60 shadow-rose-500/20'
              : 'border-rose-500/50 bg-slate-950/80 shadow-black/60'
          }`}
        >
          {/* Outer Guide Ring */}
          <div className="absolute inset-3 rounded-full border border-rose-500/20 pointer-events-none" />

          {/* Inner Swap Zone Ring */}
          <div
            className={`absolute w-11 h-11 rounded-full border border-dashed flex items-center justify-center transition-colors pointer-events-none ${
              rightKnob.inSwapZone ? 'border-sky-400 bg-sky-500/40' : 'border-sky-400/40 bg-sky-950/30'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-sky-300" />
          </div>

          <div className="absolute top-2 flex flex-col items-center pointer-events-none">
            <Crosshair className="w-4 h-4 text-rose-400" />
            <span className="text-[7.5px] font-black text-rose-300 uppercase tracking-tight">HOLD TO SHOOT</span>
          </div>

          <div className="absolute bottom-2 pointer-events-none">
            <span className="text-[7px] font-black text-sky-300/80 uppercase">
              {rightKnob.active
                ? rightKnob.inSwapZone
                  ? 'SWAPPED!'
                  : 'FIRING!'
                : 'INNER: SWAP GUN'}
            </span>
          </div>

          {/* Small Inner Knob - moves strictly inside base, snaps back to center on release */}
          <div
            className={`absolute w-14 h-14 rounded-full border-2 border-white shadow-xl flex items-center justify-center pointer-events-none ${
              rightKnob.active
                ? rightKnob.inSwapZone
                  ? 'bg-linear-to-b from-sky-400 to-blue-600'
                  : 'bg-linear-to-b from-rose-500 to-red-700'
                : 'bg-linear-to-b from-rose-500/90 to-red-700/90 transition-transform duration-150 ease-out'
            }`}
            style={{
              transform: `translate(${rightKnob.x}px, ${rightKnob.y}px)`,
            }}
          >
            <Crosshair
              className={`w-6 h-6 text-white ${
                rightKnob.active && !rightKnob.inSwapZone ? 'animate-spin' : ''
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
