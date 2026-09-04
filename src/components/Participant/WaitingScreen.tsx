import React from 'react';
import { useGame } from '../../context/GameContext';
import { Radio, Loader2 } from 'lucide-react';

export const WaitingScreen: React.FC = () => {
  const { session } = useGame();

  return (
    <div className="w-full max-w-md mx-auto px-4 py-12 flex flex-col items-center justify-center text-center min-h-[calc(100vh-100px)]">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-purple-950/60 border border-purple-800/80 flex items-center justify-center text-purple-400">
          <Radio className="w-10 h-10 animate-pulse" />
        </div>
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-pink-500"></span>
        </span>
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">Welcome, {session?.displayName}! 👋</h2>
      <p className="text-slate-400 text-sm mb-6 max-w-xs">
        You're in! Get ready, the host will start the round on the screen soon...
      </p>

      <div className="glass-card px-6 py-4 rounded-xl flex items-center space-x-3 border border-slate-800 text-slate-300 text-xs font-mono">
        <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
        <span>Waiting for Round 1 to start...</span>
      </div>
    </div>
  );
};
