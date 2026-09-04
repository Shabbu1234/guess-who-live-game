import React, { useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import confetti from 'canvas-confetti';
import { CheckCircle2, XCircle, Trophy, Sparkles } from 'lucide-react';

export const RevealScreen: React.FC = () => {
  const { gameState } = useGame();
  const isCorrect = gameState?.isCorrect;

  useEffect(() => {
    if (isCorrect) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#F59E0B'],
      });
    }
  }, [isCorrect]);

  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 space-y-5 animate-in fade-in zoom-in-95 duration-300">
      {/* Result Outcome Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs font-bold uppercase tracking-wider text-purple-300">
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <span>ROUND {gameState?.roundNumber} REVEALED</span>
        </div>

        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">THE ANSWER IS</h2>
        <h1 className="text-3xl sm:text-4xl font-black text-white gradient-text tracking-tight uppercase">
          {gameState?.correctName}
        </h1>
      </div>

      {/* Side by Side Photos: Childhood + Adult */}
      <div className="glass-card p-3 rounded-2xl border border-slate-800 space-y-3 shadow-2xl">
        <div className="grid grid-cols-2 gap-3">
          {/* Childhood Photo */}
          <div className="space-y-1.5 text-center">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
              <img
                src={gameState?.childhoodPhotoUrl}
                alt="Childhood"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">CHILDHOOD</span>
          </div>

          {/* Adult / Current Photo */}
          <div className="space-y-1.5 text-center">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-950 border border-purple-500/40 shadow-lg shadow-purple-500/20">
              <img
                src={gameState?.adultPhotoUrl}
                alt="Current / Adult"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">CURRENT</span>
          </div>
        </div>
      </div>

      {/* Outcome Result Card */}
      <div
        className={`p-4 rounded-2xl border flex items-center justify-between ${
          isCorrect
            ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-200'
            : 'bg-red-950/80 border-red-500/80 text-red-200'
        }`}
      >
        <div className="flex items-center space-x-3">
          {isCorrect ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="w-8 h-8 text-red-400 shrink-0" />
          )}
          <div>
            <h3 className="font-black text-lg">
              {isCorrect ? 'YOU GOT IT RIGHT!' : 'WRONG GUESS!'}
            </h3>
            <p className="text-xs opacity-80">
              You guessed: <span className="font-bold underline">{gameState?.selectedOption || 'No vote'}</span>
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-2xl font-black">{isCorrect ? '+1' : '+0'}</span>
          <span className="block text-[10px] uppercase font-bold opacity-75">POINT</span>
        </div>
      </div>

      {/* Top 5 Leaderboard Snapshot */}
      {gameState?.leaderboard && gameState.leaderboard.length > 0 && (
        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-400 font-extrabold text-sm">
              <Trophy className="w-4 h-4" />
              <span>LEADERBOARD TOP 5</span>
            </div>
            <span className="text-[11px] text-slate-500">Updated Live</span>
          </div>

          <div className="divide-y divide-slate-800/60">
            {gameState.leaderboard.slice(0, 5).map((item, idx) => (
              <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2.5">
                  <span className="w-5 text-center font-bold text-slate-400">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                  </span>
                  <span className="font-semibold text-slate-200">{item.display_name}</span>
                </div>
                <span className="font-black text-purple-300">{item.score} PTS</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-slate-500 font-mono animate-pulse">
        Waiting for next round starting soon...
      </p>
    </div>
  );
};
