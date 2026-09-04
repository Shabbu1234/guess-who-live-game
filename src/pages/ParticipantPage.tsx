import React from 'react';
import { useGame } from '../context/GameContext';
import { Header } from '../components/Header';
import { JoinScreen } from '../components/Participant/JoinScreen';
import { WaitingScreen } from '../components/Participant/WaitingScreen';
import { VotingScreen } from '../components/Participant/VotingScreen';
import { LockedScreen } from '../components/Participant/LockedScreen';
import { RevealScreen } from '../components/Participant/RevealScreen';
import { FinishedScreen } from '../components/Participant/FinishedScreen';

export const ParticipantPage: React.FC = () => {
  const { session, gameState } = useGame();

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0B0F19]">
        <Header />
        <JoinScreen />
      </div>
    );
  }

  const renderContent = () => {
    const status = gameState?.gameStatus;

    if (status === 'FINISHED') {
      return <FinishedScreen />;
    }

    if (status === 'REVEALED') {
      return <RevealScreen />;
    }

    if (status === 'VOTING_CLOSED' || gameState?.hasVoted) {
      return <LockedScreen />;
    }

    if (status === 'LIVE') {
      return <VotingScreen />;
    }

    return <WaitingScreen />;
  };

  return (
    <div className="min-h-screen bg-[#0B0F19]">
      <Header />
      <main className="py-4">
        {renderContent()}
      </main>
    </div>
  );
};
