import React, { useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import confetti from 'canvas-confetti';
import { Trophy, Award, Sparkles } from 'lucide-react';

export const FinishedScreen: React.FC = () => {
  const { session, gameState } = useGame();

  useEffect(() => {
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.5 },
    });
  }, []);

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 space-y-6 text-center">
      {/* Trophy Header */}
      <div className="space-y-3">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-amber-500 to-pink-500 flex items-center justify-center shadow-xl shadow-amber-500/20 text-white">
          <Trophy className="w-10 h-10" />
        </div>

        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-800/80 text-amber-300 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>GAME OVER</span>
        </div>

        <h1 className="text-3xl font-black text-white">FINAL RESULTS</h1>
        <p className="text-slate-400 text-sm">Thanks for playing Guess Who live!</p>
      </div>

      {/* Participant Score Summary */}
      <div className="glass-card p-6 rounded-2xl border border-purple-500/30 bg-purple-950/20 space-y-2">
        <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">YOUR FINAL SCORE</span>
        <div className="text-5xl font-black gradient-text">{session?.score || 0}</div>
        <span className="text-xs text-slate-400 font-medium">POINTS EARNED</span>
      </div>

      {/* Final TOP 10 Leaderboard */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4 text-left">
        <div className="flex items-center space-x-2 text-amber-400 font-extrabold text-base border-b border-slate-800 pb-3">
          <Award className="w-5 h-5 text-amber-400" />
          <span>🏆 FINAL TOP 10 LEADERBOARD</span>
        </div>

        <div className="space-y-2">
          {gameState?.leaderboard?.map((item, idx) => {
            const isMe = item.id === session?.participantId;
            return (
              <div
                key={item.id}
                className={`p-3 rounded-xl flex items-center justify-between transition-all ${
                  isMe
                    ? 'bg-purple-950/80 border border-purple-500/80 text-white font-bold'
                    : 'bg-slate-900/80 border border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="w-6 text-center font-bold text-sm">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                  </span>
                  <span className="font-semibold text-sm">
                    {item.display_name} {isMe && '(You)'}
                  </span>
                </div>
                <span className="font-black text-amber-400 text-sm">{item.score} PTS</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
