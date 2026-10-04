import React, { useEffect, useState } from 'react';
import { Smartphone, RefreshCw } from 'lucide-react';

export const OrientationBanner: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Check window aspect ratio
      const portrait = window.innerHeight > window.innerWidth && window.innerWidth < 768;
      setIsPortrait(portrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isPortrait || dismissed) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white">
      <div className="w-16 h-16 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center mb-4 text-sky-400 animate-bounce">
        <Smartphone className="w-8 h-8 rotate-90" />
      </div>
      <h2 className="text-xl font-black mb-1">Rotate to Landscape</h2>
      <p className="text-xs text-slate-300 max-w-xs mb-5 font-semibold">
        Battle Toon is built for landscape mode on Android phones for the best joystick aiming and dual thumb combat.
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white"
      >
        Continue Anyway
      </button>
    </div>
  );
};
