import React from 'react';
import { useGame } from '../context/GameContext';
import { Trophy, LogOut, Shield } from 'lucide-react';

export const Header: React.FC = () => {
  const { session, connectionStatus, leaveGame } = useGame();

  return (
    <header className="w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center font-extrabold text-white text-lg shadow-lg shadow-purple-500/20">
            ?
          </div>
          <div>
            <h1 className="font-black tracking-wider text-base gradient-text uppercase">GUESS WHO?</h1>
            {session && <p className="text-[10px] text-slate-400 font-mono">CODE: {session.gameCode}</p>}
          </div>
        </div>

        {/* User Info & Connection Signal & Admin Portal */}
        <div className="flex items-center space-x-2">
          {/* Admin Login Link */}
          <a
            href="#admin"
            title="Admin Login Portal"
            className="flex items-center space-x-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-purple-300 px-2 py-1 rounded-lg text-xs font-semibold transition-all"
          >
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Admin</span>
          </a>

          {/* Signal indicator */}
          <div className="flex items-center space-x-1.5 bg-slate-900/90 px-2.5 py-1 rounded-full border border-slate-800 text-xs">
            {connectionStatus === 'connected' && (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-emerald-400 font-medium text-[11px]">LIVE</span>
              </>
            )}
            {connectionStatus === 'connecting' && (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                <span className="text-amber-400 font-medium text-[11px]">Connecting...</span>
              </>
            )}
            {connectionStatus === 'disconnected' && (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="text-red-400 font-medium text-[11px]">Offline</span>
              </>
            )}
          </div>

          {/* Participant Score Badge */}
          {session && (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 bg-purple-950/60 border border-purple-800/60 text-purple-300 px-2.5 py-1 rounded-lg font-bold text-xs">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>{session.score} PTS</span>
              </div>

              <button
                onClick={leaveGame}
                title="Leave Game"
                className="text-slate-400 hover:text-red-400 transition-colors p-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
