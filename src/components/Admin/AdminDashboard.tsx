import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { PeopleManager } from './PeopleManager';
import { Play, Square, Flame, FastForward, Power, Users, Trophy, BarChart3, History, Layers, Shield, RefreshCw } from 'lucide-react';

export const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'control' | 'people' | 'history' | 'analytics'>('control');
  const [game, setGame] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [liveVoteData, setLiveVoteData] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [newGameName, setNewGameName] = useState('');
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const { status: connectionStatus, addMessageListener } = useWebSocket(
    game?.code,
    'admin'
  );

  const fetchActiveGame = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/game/active');
      const data = await res.json();
      if (res.ok && data.game) {
        setGame(data.game);
        setStats(data.stats);
      } else {
        setGame(null);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/round/analytics');
      const data = await res.json();
      if (res.ok) {
        setAnalytics(data.analytics);
        setLeaderboard(data.leaderboard || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchActiveGame();
  }, [fetchActiveGame]);

  useEffect(() => {
    if (activeTab === 'analytics' || activeTab === 'history') {
      fetchAnalytics();
    }
  }, [activeTab, fetchAnalytics]);

  // Listen to WebSocket broadcasts
  useEffect(() => {
    const removeListener = addMessageListener((msg) => {
      if (msg.type === 'VOTE_COUNT_UPDATE') {
        setLiveVoteData(msg.data);
      } else if (msg.type === 'GAME_STATE_UPDATE') {
        fetchActiveGame();
      } else if (msg.type === 'ROUND_REVEALED') {
        fetchActiveGame();
        fetchAnalytics();
      } else if (msg.type === 'GAME_FINISHED') {
        fetchActiveGame();
        fetchAnalytics();
      }
    });
    return removeListener;
  }, [addMessageListener, fetchActiveGame, fetchAnalytics]);

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGameName) return;
    try {
      const res = await fetch('/api/admin/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGameName }),
      });
      const data = await res.json();
      if (res.ok) {
        setGame(data.game);
        setStats(data.stats);
        setNewGameName('');
        setMsg(`Game '${data.game.name}' created with code: ${data.game.code}`);
      }
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  const handleStartRound = async () => {
    try {
      const res = await fetch('/api/admin/round/start-round', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLiveVoteData(null);
      fetchActiveGame();
    } catch (err: any) {
      setMsg(`Error starting round: ${err.message}`);
    }
  };

  const handleStopVoting = async () => {
    try {
      const res = await fetch('/api/admin/round/stop-voting', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchActiveGame();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  const handleRevealAnswer = async () => {
    try {
      const res = await fetch('/api/admin/round/reveal-answer', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchActiveGame();
      fetchAnalytics();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  const handleEndGame = async () => {
    try {
      const res = await fetch('/api/admin/round/end-game', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowEndGameConfirm(false);
      fetchActiveGame();
      fetchAnalytics();
      setActiveTab('analytics');
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-purple-500/20">
              ⚡
            </div>
            <div>
              <h1 className="font-black text-lg gradient-text tracking-wider uppercase">GUESS WHO ADMIN</h1>
              <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
                <span>STATUS: {game?.status || 'NO GAME'}</span>
                {game?.code && <span className="bg-purple-950/80 text-purple-300 border border-purple-800 px-2 py-0.5 rounded">CODE: {game.code}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Signal */}
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span className="text-slate-300">{connectionStatus.toUpperCase()}</span>
            </div>

            <button
              onClick={onLogout}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs border border-slate-800 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('control')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all ${
              activeTab === 'control' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Live Game Control</span>
          </button>

          <button
            onClick={() => setActiveTab('people')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all ${
              activeTab === 'people' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>People & Photos</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all ${
              activeTab === 'analytics' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics & Leaderboard</span>
          </button>
        </div>

        {msg && (
          <div className="p-4 rounded-xl bg-purple-950/80 border border-purple-800 text-purple-200 text-xs font-semibold flex items-center justify-between animate-pulse">
            <span>{msg}</span>
            <button onClick={() => setMsg(null)} className="text-purple-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Tab 1: Live Control */}
        {activeTab === 'control' && (
          <div className="space-y-6">
            {!game || game.status === 'FINISHED' ? (
              /* Create Game Card */
              <div className="max-w-md mx-auto glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
                <h2 className="text-xl font-black text-white">Create New Event Game</h2>
                <form onSubmit={handleCreateGame} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Game Name</label>
                    <input
                      type="text"
                      value={newGameName}
                      onChange={(e) => setNewGameName(e.target.value)}
                      placeholder="e.g. Annual Teachers Day Guess Who 2026"
                      required
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-purple-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 font-extrabold text-sm text-white glow-btn"
                  >
                    CREATE GAME & GENERATE CODE
                  </button>
                </form>
              </div>
            ) : (
              /* Live Game Dashboard */
              <div className="space-y-6">
                {/* Stats Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-xs font-bold text-slate-400 uppercase">GAME CODE</span>
                    <div className="text-3xl font-black font-mono text-purple-400">{game.code}</div>
                  </div>

                  <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-xs font-bold text-slate-400 uppercase">PLAYERS JOINED</span>
                    <div className="text-3xl font-black text-white">{stats?.playersCount || 0}</div>
                  </div>

                  <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-xs font-bold text-slate-400 uppercase">CURRENT ROUND</span>
                    <div className="text-3xl font-black text-pink-400">#{stats?.roundsCount || 0}</div>
                  </div>

                  <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-xs font-bold text-slate-400 uppercase">REMAINING MEMBERS</span>
                    <div className="text-3xl font-black text-emerald-400">{stats?.remainingPeopleCount || 0}</div>
                  </div>
                </div>

                {/* Control Action Buttons */}
                <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">HOST GAME CONTROLS</h3>
                  <div className="flex flex-wrap gap-3">
                    {/* Start Round Button */}
                    {(game.status === 'WAITING' || game.status === 'REVEALED') && (
                      <button
                        onClick={handleStartRound}
                        className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-extrabold text-sm text-white flex items-center space-x-2 shadow-lg shadow-emerald-600/20 glow-btn"
                      >
                        <Play className="w-5 h-5 fill-current" />
                        <span>{game.status === 'WAITING' ? 'START ROUND 1' : 'NEXT ROUND'}</span>
                      </button>
                    )}

                    {/* Stop Voting Button */}
                    {game.status === 'LIVE' && (
                      <button
                        onClick={handleStopVoting}
                        className="px-6 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 font-extrabold text-sm text-white flex items-center space-x-2 shadow-lg shadow-amber-600/20 glow-btn"
                      >
                        <Square className="w-5 h-5 fill-current" />
                        <span>STOP VOTING</span>
                      </button>
                    )}

                    {/* Reveal Answer Button */}
                    {(game.status === 'LIVE' || game.status === 'VOTING_CLOSED') && (
                      <button
                        onClick={handleRevealAnswer}
                        className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-95 font-extrabold text-sm text-white flex items-center space-x-2 shadow-lg shadow-pink-600/20 glow-btn"
                      >
                        <Flame className="w-5 h-5 fill-current text-amber-300 animate-bounce" />
                        <span>🔥 REVEAL ANSWER</span>
                      </button>
                    )}

                    {/* End Game Button */}
                    <button
                      onClick={() => setShowEndGameConfirm(true)}
                      className="px-6 py-3.5 rounded-xl bg-red-950/80 border border-red-800 hover:bg-red-900 text-red-200 font-extrabold text-sm flex items-center space-x-2 ml-auto"
                    >
                      <Power className="w-4 h-4" />
                      <span>END GAME</span>
                    </button>
                  </div>
                </div>

                {/* Reset Test Data Utility */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={async () => {
                      if (confirm('Are you sure you want to delete all test games and reset player count to 0?')) {
                        const res = await fetch('/api/admin/game/reset-data', { method: 'POST' });
                        if (res.ok) {
                          setMsg('Database reset cleanly! Create a new game for live players.');
                          fetchActiveGame();
                        }
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-300 text-xs font-semibold flex items-center space-x-1.5 transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Clean Reset Test Data (0 Players)</span>
                  </button>
                </div>

                {/* Live Vote Monitor */}
                {liveVoteData && (
                  <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-lg text-white">LIVE VOTES RECEIVED</h3>
                      <div className="text-xs font-mono text-purple-300 bg-purple-950/80 border border-purple-800 px-3 py-1 rounded-lg">
                        VOTES: {liveVoteData.totalVotes} / {liveVoteData.totalPlayers || stats?.playersCount || 0}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {Object.entries(liveVoteData.votesByOption || {}).map(([option, count]: [string, any]) => {
                        const total = liveVoteData.totalVotes || 1;
                        const pct = Math.round((count / total) * 100);
                        return (
                          <div key={option} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold text-slate-200">
                              <span>{option}</span>
                              <span>{count} votes ({pct}%)</span>
                            </div>
                            <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-800">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: People Manager */}
        {activeTab === 'people' && <PeopleManager activeGameId={game?.id} />}

        {/* Tab 3: Analytics & Leaderboard */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {analytics ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-xs font-bold text-slate-400">TOTAL VOTES</span>
                    <div className="text-3xl font-black text-purple-400">{analytics.totalVotes}</div>
                  </div>
                  <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-xs font-bold text-slate-400">AVG ACCURACY</span>
                    <div className="text-3xl font-black text-pink-400">{analytics.avgAccuracy}%</div>
                  </div>
                  <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-xs font-bold text-slate-400">HARDEST ROUND</span>
                    <div className="text-lg font-bold text-amber-400">{analytics.hardestRound ? `Round #${analytics.hardestRound.round_number}` : 'N/A'}</div>
                  </div>
                  <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-xs font-bold text-slate-400">EASIEST ROUND</span>
                    <div className="text-lg font-bold text-emerald-400">{analytics.easiestRound ? `Round #${analytics.easiestRound.round_number}` : 'N/A'}</div>
                  </div>
                </div>

                {/* Leaderboard Table */}
                <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
                  <h3 className="font-extrabold text-lg text-white">TOP LEADERBOARD RANKINGS</h3>
                  <div className="divide-y divide-slate-800">
                    {leaderboard.map((item, idx) => (
                      <div key={item.id} className="py-3 flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-3">
                          <span className="w-6 font-bold text-slate-400">{idx + 1}.</span>
                          <span className="font-semibold text-white">{item.display_name}</span>
                        </div>
                        <span className="font-black text-purple-300">{item.score} PTS</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">No analytics available yet.</p>
            )}
          </div>
        )}
      </main>

      {/* End Game Confirmation Modal */}
      {showEndGameConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass-card p-6 rounded-2xl border border-red-800 space-y-4 text-center">
            <h3 className="text-lg font-black text-white">ARE YOU SURE?</h3>
            <p className="text-xs text-slate-300">
              This will permanently finish the current live game and publish the final leaderboard to all participants.
            </p>
            <div className="flex justify-center space-x-3 pt-2">
              <button
                onClick={() => setShowEndGameConfirm(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700"
              >
                CANCEL
              </button>
              <button
                onClick={handleEndGame}
                className="px-4 py-2.5 rounded-xl bg-red-600 text-white font-extrabold text-xs hover:bg-red-500"
              >
                END GAME NOW
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
