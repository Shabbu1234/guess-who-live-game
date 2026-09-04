import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Sparkles, ArrowRight, UserCheck, KeyRound } from 'lucide-react';

export const JoinScreen: React.FC = () => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const { joinGameSession, isLoading, error } = useGame();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name) return;
    await joinGameSession(code, name);
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
      {/* Title Header */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-800/60 text-purple-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <span>Childhood Photo Guessing Game</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
          GUESS <span className="gradient-text">WHO?</span>
        </h1>
        <p className="text-slate-400 text-sm max-w-xs mx-auto">
          Enter the Game Code from the screen & your name to start voting!
        </p>
      </div>

      {/* Join Card */}
      <div className="w-full glass-card p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-800/80">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs font-medium animate-pulse">
              ⚠️ {error}
            </div>
          )}

          {/* Game Code Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <KeyRound className="w-3.5 h-3.5 text-purple-400" />
              <span>Game Code</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. 7K4P9"
              maxLength={6}
              required
              className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl px-4 py-3.5 text-center text-2xl font-mono font-extrabold tracking-widest text-white uppercase placeholder:text-slate-600 placeholder:normal-case placeholder:text-base outline-none transition-all"
            />
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <UserCheck className="w-3.5 h-3.5 text-pink-400" />
              <span>Your Name</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              maxLength={30}
              required
              className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 rounded-xl px-4 py-3 text-base text-white placeholder:text-slate-600 outline-none transition-all font-medium"
            />
          </div>

          {/* Join CTA Button */}
          <button
            type="submit"
            disabled={isLoading || !code.trim() || !name.trim()}
            className="w-full py-4 rounded-xl font-extrabold text-base text-white bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed glow-btn flex items-center justify-center space-x-2 transition-all"
          >
            {isLoading ? (
              <span className="flex items-center space-x-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Joining...</span>
              </span>
            ) : (
              <>
                <span>JOIN GAME</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
