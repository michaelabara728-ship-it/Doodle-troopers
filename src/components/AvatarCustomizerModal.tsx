import React, { useRef, useEffect } from 'react';
import { AvatarCustomization, HeadwearType, CamoType, SkinToneType } from '../types/game';
import { User, Check, X, Shield, Sparkles } from 'lucide-react';

interface AvatarCustomizerModalProps {
  name: string;
  avatar: AvatarCustomization;
  onSave: (name: string, avatar: AvatarCustomization) => void;
  onClose: () => void;
}

const HEADWEAR_OPTIONS: { id: HeadwearType; label: string; icon: string }[] = [
  { id: 'helmet', label: 'Steel Helmet', icon: '🪖' },
  { id: 'beret', label: 'Commando Beret', icon: '🔴' },
  { id: 'bandana', label: 'War Bandana', icon: '🧣' },
  { id: 'beanie', label: 'Winter Beanie', icon: '🧢' },
  { id: 'boonie', label: 'Jungle Boonie', icon: '👒' },
  { id: 'aviator', label: 'Aviator Goggles', icon: '🥽' },
];

const CAMO_OPTIONS: { id: CamoType; label: string; color: string }[] = [
  { id: 'jungle', label: 'Jungle Green', color: '#15803d' },
  { id: 'desert', label: 'Desert Tan', color: '#d97706' },
  { id: 'urban', label: 'Urban Navy', color: '#2563eb' },
  { id: 'arctic', label: 'Arctic Gray', color: '#94a3b8' },
  { id: 'blackops', label: 'Special Ops', color: '#1e293b' },
  { id: 'crimson', label: 'Crimson Camo', color: '#dc2626' },
];

const SKIN_TONES: { color: SkinToneType; label: string }[] = [
  { color: '#fde047', label: 'Fair' },
  { color: '#fcd34d', label: 'Warm' },
  { color: '#d97706', label: 'Tan' },
  { color: '#92400e', label: 'Deep' },
];

export const AvatarCustomizerModal: React.FC<AvatarCustomizerModalProps> = ({
  name: initialName,
  avatar: initialAvatar,
  onSave,
  onClose,
}) => {
  const [name, setName] = React.useState(initialName || 'Doodle Soldier');
  const [avatar, setAvatar] = React.useState<AvatarCustomization>(initialAvatar);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Render live preview on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Center origin
    const cx = canvas.width / 2;
    const cy = canvas.height / 2 + 10;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(2.2, 2.2);

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0f172a';
    ctx.lineCap = 'round';

    // Jetpack on back
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-17, -4, 8, 20);
    ctx.strokeRect(-17, -4, 8, 20);

    // Legs
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-4, 14);
    ctx.lineTo(-4, 25);
    ctx.moveTo(4, 14);
    ctx.lineTo(4, 25);
    ctx.stroke();

    // Torso Camo
    const camoColor = CAMO_OPTIONS.find((c) => c.id === avatar.camo)?.color || '#15803d';
    ctx.fillStyle = camoColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-10, -6, 20, 20, [4]);
    ctx.fill();
    ctx.stroke();

    // Belt
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-9, 10, 18, 4);

    // Head
    ctx.fillStyle = avatar.skinTone;
    ctx.beginPath();
    ctx.arc(0, -14, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Eye
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(4, -15, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrow
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(1, -19);
    ctx.lineTo(7, -17);
    ctx.stroke();

    // Headwear
    ctx.lineWidth = 3;
    switch (avatar.headwear) {
      case 'beret':
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.ellipse(0, -22, 13, 6, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(5, -22, 2.5, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'bandana':
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-10, -18, 20, 5);
        ctx.strokeRect(-10, -18, 20, 5);
        ctx.beginPath();
        ctx.moveTo(-10, -16);
        ctx.lineTo(-16, -10);
        ctx.lineTo(-10, -14);
        ctx.fill();
        break;

      case 'beanie':
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.roundRect(-10, -26, 20, 14, [6]);
        ctx.fill();
        ctx.stroke();
        break;

      case 'boonie':
        ctx.fillStyle = camoColor;
        ctx.fillRect(-8, -25, 16, 12);
        ctx.strokeRect(-8, -25, 16, 12);
        ctx.beginPath();
        ctx.ellipse(0, -18, 16, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;

      case 'aviator':
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(0, -16, 11, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-2, -18, 9, 5);
        ctx.strokeRect(-2, -18, 9, 5);
        break;

      case 'helmet':
      default:
        ctx.fillStyle = camoColor;
        ctx.beginPath();
        ctx.arc(0, -16, 12, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-12, -16, 24, 3);
        break;
    }

    // Gun in hand
    ctx.fillStyle = '#334155';
    ctx.fillRect(4, -2, 14, 6);
    ctx.strokeRect(4, -2, 14, 6);
    ctx.fillStyle = avatar.skinTone;
    ctx.beginPath();
    ctx.arc(6, 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }, [avatar]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-5 max-w-lg w-full shadow-2xl flex flex-col gap-4 text-white animate-scale-up my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-black tracking-tight text-white uppercase">Doodle Barracks & Avatar</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Soldier Name & Live Preview */}
        <div className="flex items-center gap-4 bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
          <div className="relative w-28 h-28 bg-slate-900 rounded-2xl border-2 border-amber-500/30 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
            <canvas ref={canvasRef} width={112} height={112} className="w-full h-full" />
            <span className="absolute bottom-1 text-[8px] font-black uppercase text-amber-400/80 tracking-widest">PREVIEW</span>
          </div>

          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-300">
              Soldier Codename
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={name}
                maxLength={14}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter soldier name..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm font-bold text-white focus:outline-hidden focus:border-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Headwear Selection */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-black uppercase tracking-wider text-slate-300">Headwear & Helmets</span>
          <div className="grid grid-cols-3 gap-2">
            {HEADWEAR_OPTIONS.map((hw) => {
              const isSelected = avatar.headwear === hw.id;
              return (
                <button
                  key={hw.id}
                  type="button"
                  onClick={() => setAvatar({ ...avatar, headwear: hw.id })}
                  className={`p-2 rounded-xl border flex items-center gap-2 transition-all active:scale-95 text-left ${
                    isSelected ? 'border-amber-400 bg-amber-500/20 shadow-md shadow-amber-500/20' : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                  }`}
                >
                  <span className="text-lg">{hw.icon}</span>
                  <span className="text-xs font-bold text-white truncate">{hw.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Camo Uniform Selection */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-black uppercase tracking-wider text-slate-300">Camo Uniform Pattern</span>
          <div className="grid grid-cols-3 gap-2">
            {CAMO_OPTIONS.map((c) => {
              const isSelected = avatar.camo === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setAvatar({ ...avatar, camo: c.id })}
                  className={`p-2 rounded-xl border flex items-center gap-2 transition-all active:scale-95 text-left ${
                    isSelected ? 'border-amber-400 bg-amber-500/20 shadow-md shadow-amber-500/20' : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full border border-black shrink-0"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="text-xs font-bold text-white truncate">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Skin Tone Selection */}
        <div className="flex items-center justify-between bg-slate-950/50 p-2.5 rounded-2xl border border-slate-800">
          <span className="text-xs font-black uppercase tracking-wider text-slate-300">Skin Tone</span>
          <div className="flex items-center gap-2">
            {SKIN_TONES.map((st) => (
              <button
                key={st.color}
                type="button"
                onClick={() => setAvatar({ ...avatar, skinTone: st.color })}
                className={`w-7 h-7 rounded-full border-2 transition-transform active:scale-90 ${
                  avatar.skinTone === st.color ? 'border-white scale-110 shadow-lg' : 'border-black'
                }`}
                style={{ backgroundColor: st.color }}
                title={st.label}
              />
            ))}
          </div>
        </div>

        {/* Save & Apply Button */}
        <button
          type="button"
          onClick={() => {
            onSave(name.trim() || 'Doodle Soldier', avatar);
            onClose();
          }}
          className="w-full bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black py-3 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 active:scale-98 transition-transform"
        >
          <Check className="w-4 h-4" /> Save Soldier Profile
        </button>
      </div>
    </div>
  );
};
