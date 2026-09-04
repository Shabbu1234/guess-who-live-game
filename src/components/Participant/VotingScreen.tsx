import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { HelpCircle, CheckCircle2, Lock } from 'lucide-react';

export const VotingScreen: React.FC = () => {
  const { gameState, submitParticipantVote, isLoading, error } = useGame();
  const [selectedOption, setSelectedOption] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption) return;
    await submitParticipantVote(selectedOption);
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 space-y-4">
      {/* Round Header */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-xs font-black text-emerald-400 tracking-wider uppercase">LIVE VOTING</span>
        </div>
        <span className="text-xs font-black text-purple-300 bg-purple-950/80 px-3 py-1 rounded-lg border border-purple-800/80">
          ROUND {gameState?.roundNumber || 1}
        </span>
      </div>

      {/* Childhood Photo Container */}
      <div className="relative glass-card p-3 rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl">
        <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800">
          {gameState?.childhoodPhotoUrl ? (
            <img
              src={gameState.childhoodPhotoUrl}
              alt="Childhood Mystery"
              className="w-full h-full object-cover rounded-xl"
              loading="eager"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-600">
              <HelpCircle className="w-16 h-16 animate-bounce" />
              <span className="text-xs font-medium mt-2">Loading photo...</span>
            </div>
          )}

          <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-pink-400" />
            <span>WHO IS THIS?</span>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs font-medium animate-pulse">
          ⚠️ {error}
        </div>
      )}

      {/* Candidate Name Radio Cards */}
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="space-y-2">
          {gameState?.options?.map((name, index) => {
            const isSelected = selectedOption === name;
            return (
              <label
                key={index}
                className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-purple-950/80 border-purple-500 shadow-lg shadow-purple-500/20 text-white font-bold scale-[1.01]'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      isSelected ? 'border-purple-400 bg-purple-600' : 'border-slate-600 bg-slate-950'
                    }`}
                  >
                    {isSelected && <span className="w-2 h-2 rounded-full bg-white"></span>}
                  </div>
                  <span className="text-base font-semibold">{name}</span>
                </div>
                {isSelected && <CheckCircle2 className="w-5 h-5 text-purple-400" />}
                <input
                  type="radio"
                  name="candidate"
                  value={name}
                  checked={isSelected}
                  onChange={() => setSelectedOption(name)}
                  className="hidden"
                />
              </label>
            );
          })}
        </div>

        {/* Submit CTA */}
        <button
          type="submit"
          disabled={isLoading || !selectedOption}
          className="w-full py-4 rounded-xl font-extrabold text-base text-white bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed glow-btn flex items-center justify-center space-x-2 transition-all mt-3"
        >
          {isLoading ? (
            <span className="flex items-center space-x-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>Locking vote...</span>
            </span>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>SUBMIT MY GUESS</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
