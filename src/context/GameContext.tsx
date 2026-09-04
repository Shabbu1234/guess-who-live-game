import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWebSocket, ConnectionStatus } from '../hooks/useWebSocket';

export interface LeaderboardItem {
  id: string;
  display_name: string;
  score: number;
}

export interface GameState {
  gameStatus: 'WAITING' | 'LIVE' | 'VOTING_CLOSED' | 'REVEALED' | 'FINISHED';
  gameCode?: string;
  gameName?: string;
  roundNumber?: number;
  roundId?: string;
  childhoodPhotoUrl?: string;
  adultPhotoUrl?: string;
  options?: string[];
  hasVoted?: boolean;
  selectedOption?: string;
  correctName?: string;
  isCorrect?: boolean;
  currentScore?: number;
  leaderboard?: LeaderboardItem[];
  analytics?: any;
}

export interface ParticipantSession {
  participantId: string;
  gameId: string;
  gameCode: string;
  gameName: string;
  displayName: string;
  sessionToken: string;
  score: number;
}

interface GameContextType {
  session: ParticipantSession | null;
  gameState: GameState | null;
  connectionStatus: ConnectionStatus;
  isLoading: boolean;
  error: string | null;
  joinGameSession: (code: string, name: string) => Promise<boolean>;
  submitParticipantVote: (option: string) => Promise<boolean>;
  leaveGame: () => void;
  fetchLatestState: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<ParticipantSession | null>(() => {
    const saved = localStorage.getItem('guess_who_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { status: connectionStatus, addMessageListener } = useWebSocket(
    session?.gameCode,
    'participant',
    session?.participantId
  );

  const fetchLatestState = useCallback(async () => {
    if (!session?.gameCode) return;
    try {
      const res = await fetch(`/api/game/state?game_code=${session.gameCode}&participant_id=${session.participantId}`);
      if (res.ok) {
        const data: GameState = await res.json();
        setGameState(data);
        if (data.currentScore !== undefined && session) {
          setSession(prev => prev ? ({ ...prev, score: data.currentScore! }) : null);
        }
      }
    } catch (err) {
      console.error('Fetch State Error:', err);
    }
  }, [session?.gameCode, session?.participantId]);

  useEffect(() => {
    if (session) {
      fetchLatestState();
    }
  }, [session, fetchLatestState]);

  // Listen to WebSocket broadcasts
  useEffect(() => {
    const removeListener = addMessageListener((msg) => {
      if (msg.type === 'GAME_STATE_UPDATE') {
        setGameState(prev => ({
          ...prev,
          gameStatus: msg.data.status,
          roundNumber: msg.data.roundNumber,
          roundId: msg.data.roundId,
          childhoodPhotoUrl: msg.data.childhoodPhotoUrl,
          options: msg.data.options,
          hasVoted: false,
          selectedOption: undefined,
          correctName: undefined,
          adultPhotoUrl: undefined,
        }));
      } else if (msg.type === 'ROUND_REVEALED') {
        setGameState(prev => ({
          ...prev,
          gameStatus: 'REVEALED',
          roundNumber: msg.data.roundNumber,
          roundId: msg.data.roundId,
          correctName: msg.data.correctName,
          childhoodPhotoUrl: msg.data.childhoodPhotoUrl,
          adultPhotoUrl: msg.data.adultPhotoUrl,
          leaderboard: msg.data.leaderboard,
        }));

        // Re-fetch individual participant state for score update & answer correctness
        fetchLatestState();
      } else if (msg.type === 'GAME_FINISHED') {
        setGameState(prev => ({
          ...prev,
          gameStatus: 'FINISHED',
          leaderboard: msg.data.leaderboard,
          analytics: msg.data.analytics,
        }));
      }
    });

    return removeListener;
  }, [addMessageListener, fetchLatestState]);

  const joinGameSession = async (code: string, name: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          name,
          session_token: session?.sessionToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to join game');
      }

      const newSession: ParticipantSession = {
        participantId: data.participant_id,
        gameId: data.game_id,
        gameCode: data.game_code,
        gameName: data.game_name,
        displayName: data.display_name,
        sessionToken: data.session_token,
        score: data.score || 0,
      };

      setSession(newSession);
      localStorage.setItem('guess_who_session', JSON.stringify(newSession));
      setIsLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
      return false;
    }
  };

  const submitParticipantVote = async (option: string): Promise<boolean> => {
    if (!session || !gameState?.roundId) return false;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/game/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round_id: gameState.roundId,
          participant_id: session.participantId,
          selected_option: option,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit vote');
      }

      setGameState(prev => prev ? ({
        ...prev,
        hasVoted: true,
        selectedOption: option,
      }) : null);

      setIsLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
      return false;
    }
  };

  const leaveGame = () => {
    localStorage.removeItem('guess_who_session');
    setSession(null);
    setGameState(null);
  };

  return (
    <GameContext.Provider
      value={{
        session,
        gameState,
        connectionStatus,
        isLoading,
        error,
        joinGameSession,
        submitParticipantVote,
        leaveGame,
        fetchLatestState,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
};
