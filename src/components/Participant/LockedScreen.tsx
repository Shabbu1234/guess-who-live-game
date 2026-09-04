import React from 'react';
import { useGame } from '../../context/GameContext';
import { CheckCircle2, Lock, Hourglass } from 'lucide-react';

export const LockedScreen: React.FC = () => {
  const { gameState } = useGame();

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 space-y-6 flex flex-col items-center justify-center min-h-[calc(100vh-120px)] text-center">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-emerald-950/60 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="w-10 h-10 animate-bounce" />
        </div>
      </div>

      <div className="space-y-2">
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs font-bold uppercase tracking-wider">
          <Lock className="w-3.5 h-3.5" />
          <span>VOTE SUBMITTED & LOCKED</span>
        </span>
        <h2 className="text-2xl font-black text-white">Your guess has been locked!</h2>
        <p className="text-slate-400 text-sm max-w-xs mx-auto">
          You guessed <span className="text-white font-extrabold underline decoration-purple-500">{gameState?.selectedOption}</span>.
        </p>
      </div>

      <div className="w-full glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-center space-x-2 text-purple-300 text-xs font-semibold">
          <Hourglass className="w-4 h-4 animate-spin text-pink-400" />
          <span>Waiting for host to reveal the answer...</span>
        </div>
        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 h-full w-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};
