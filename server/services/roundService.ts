import { db } from '../db.js';
import { getGameById } from './gameService.js';
import { broadcastToGame, broadcastToAdmins } from './websocketService.js';
import crypto from 'crypto';

export interface Round {
  id: string;
  game_id: string;
  round_number: number;
  person_id: string;
  childhood_photo_url: string;
  status: 'LIVE' | 'VOTING_CLOSED' | 'REVEALED';
  options_json: string;
  started_at: string;
  stopped_at: string | null;
  revealed_at: string | null;
}

export function getCurrentRound(gameId: string): Round | undefined {
  const game = getGameById(gameId);
  if (!game || !game.current_round_id) return undefined;
  return db.prepare('SELECT * FROM rounds WHERE id = ?').get(game.current_round_id) as Round | undefined;
}

// Fisher-Yates array shuffle helper
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function startRound(gameId: string) {
  const game = getGameById(gameId);
  if (!game) throw new Error('Game not found');

  if (game.status === 'LIVE' || game.status === 'VOTING_CLOSED') {
    throw new Error('Current round must be revealed or finished before starting a new round.');
  }

  // 1. Transactionally find random unused person
  let newRoundId = `round_${crypto.randomUUID()}`;
  let selectedPerson: { id: string; name: string; childhood_photo_url: string; adult_photo_url: string } | undefined;
  let options: string[] = [];
  let roundNumber = 1;

  db.transaction(() => {
    // Select unused person
    const unusedPerson = db.prepare(`
      SELECT id, name, childhood_photo_url, adult_photo_url 
      FROM people 
      WHERE active = 1 
        AND id NOT IN (SELECT person_id FROM game_used_people WHERE game_id = ?)
      ORDER BY RANDOM() 
      LIMIT 1
    `).get(gameId) as { id: string; name: string; childhood_photo_url: string; adult_photo_url: string } | undefined;

    if (!unusedPerson) {
      throw new Error('No more available unused members for this game! Add more people or end the game.');
    }

    selectedPerson = unusedPerson;

    // Get 4 distinct random distractor names
    const distractors = db.prepare(`
      SELECT name FROM people 
      WHERE active = 1 AND id != ?
      ORDER BY RANDOM()
      LIMIT 4
    `).all(unusedPerson.id) as { name: string }[];

    const optionNames = [unusedPerson.name, ...distractors.map(d => d.name)];
    options = shuffleArray(optionNames);

    // Calculate current round number
    const roundCountRow = db.prepare('SELECT COUNT(*) as c FROM rounds WHERE game_id = ?').get(gameId) as { c: number };
    roundNumber = roundCountRow.c + 1;

    // Insert round record
    db.prepare(`
      INSERT INTO rounds (id, game_id, round_number, person_id, childhood_photo_url, status, options_json)
      VALUES (?, ?, ?, ?, ?, 'LIVE', ?)
    `).run(newRoundId, gameId, roundNumber, unusedPerson.id, unusedPerson.childhood_photo_url, JSON.stringify(options));

    // Record person usage for this game (Database hard constraint prevents reuse)
    db.prepare(`
      INSERT INTO game_used_people (game_id, person_id, used_in_round_id)
      VALUES (?, ?, ?)
    `).run(gameId, unusedPerson.id, newRoundId);

    // Update game status
    db.prepare(`
      UPDATE games SET status = 'LIVE', current_round_id = ? WHERE id = ?
    `).run(newRoundId, gameId);
  })();

  // Broadcast state update to everyone (Zero answer leak: options list, no correct identifier)
  const publicRoundPayload = {
    gameId: game.id,
    gameCode: game.code,
    status: 'LIVE',
    roundNumber,
    roundId: newRoundId,
    childhoodPhotoUrl: selectedPerson!.childhood_photo_url,
    options,
  };

  broadcastToGame(game.code, 'GAME_STATE_UPDATE', publicRoundPayload);

  // Send admin live vote counts reset
  broadcastToAdmins(game.code, 'VOTE_COUNT_UPDATE', {
    roundId: newRoundId,
    totalVotes: 0,
    votesByOption: options.reduce((acc, opt) => ({ ...acc, [opt]: 0 }), {}),
  });

  return publicRoundPayload;
}

export function submitVote(roundId: string, participantId: string, selectedOption: string) {
  const round = db.prepare('SELECT * FROM rounds WHERE id = ?').get(roundId) as Round | undefined;
  if (!round) throw new Error('Round not found');

  if (round.status !== 'LIVE') {
    throw new Error('Voting is closed for this round.');
  }

  const options: string[] = JSON.parse(round.options_json);
  if (!options.includes(selectedOption)) {
    throw new Error('Invalid candidate selection.');
  }

  const voteId = `vote_${crypto.randomUUID()}`;

  try {
    db.prepare(`
      INSERT INTO votes (id, round_id, participant_id, selected_person_name)
      VALUES (?, ?, ?, ?)
    `).run(voteId, roundId, participantId, selectedOption);
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
      throw new Error('You have already submitted a vote for this round.');
    }
    throw err;
  }

  // Calculate live vote distribution for Admin
  const voteRows = db.prepare(`
    SELECT selected_person_name, COUNT(*) as count 
    FROM votes 
    WHERE round_id = ? 
    GROUP BY selected_person_name
  `).all(roundId) as { selected_person_name: string; count: number }[];

  const votesByOption: Record<string, number> = {};
  options.forEach(opt => { votesByOption[opt] = 0; });
  let totalVotes = 0;

  voteRows.forEach(row => {
    votesByOption[row.selected_person_name] = row.count;
    totalVotes += row.count;
  });

  const game = getGameById(round.game_id)!;
  const totalPlayers = (db.prepare('SELECT COUNT(*) as c FROM participants WHERE game_id = ?').get(game.id) as { c: number }).c;

  // Broadcast updated vote counts to ADMIN ONLY
  broadcastToAdmins(game.code, 'VOTE_COUNT_UPDATE', {
    roundId,
    totalVotes,
    totalPlayers,
    votesByOption,
  });

  return { success: true, roundId, selectedOption };
}

export function stopVoting(gameId: string) {
  const game = getGameById(gameId);
  if (!game || !game.current_round_id) throw new Error('No active round found');

  db.transaction(() => {
    db.prepare("UPDATE rounds SET status = 'VOTING_CLOSED', stopped_at = CURRENT_TIMESTAMP WHERE id = ?").run(game.current_round_id);
    db.prepare("UPDATE games SET status = 'VOTING_CLOSED' WHERE id = ?").run(gameId);
  })();

  const round = getCurrentRound(gameId)!;
  const options: string[] = JSON.parse(round.options_json);

  const payload = {
    gameId: game.id,
    gameCode: game.code,
    status: 'VOTING_CLOSED',
    roundNumber: round.round_number,
    roundId: round.id,
    childhoodPhotoUrl: round.childhood_photo_url,
    options,
  };

  broadcastToGame(game.code, 'GAME_STATE_UPDATE', payload);
  return payload;
}

export function revealAnswer(gameId: string) {
  const game = getGameById(gameId);
  if (!game || !game.current_round_id) throw new Error('No active round found');

  const round = getCurrentRound(gameId)!;
  const person = db.prepare('SELECT * FROM people WHERE id = ?').get(round.person_id) as { id: string; name: string; childhood_photo_url: string; adult_photo_url: string };

  let totalVotes = 0;
  let correctVotes = 0;

  db.transaction(() => {
    // 1. Mark correct votes
    db.prepare(`
      UPDATE votes 
      SET is_correct = CASE WHEN selected_person_name = ? THEN 1 ELSE 0 END 
      WHERE round_id = ?
    `).run(person.name, round.id);

    // 2. Increment scores for correct participants
    const correctVoterRows = db.prepare(`
      SELECT participant_id FROM votes WHERE round_id = ? AND selected_person_name = ?
    `).all(round.id, person.name) as { participant_id: string }[];

    correctVotes = correctVoterRows.length;

    const incrementScore = db.prepare('UPDATE participants SET score = score + 1 WHERE id = ?');
    correctVoterRows.forEach(voter => {
      incrementScore.run(voter.participant_id);
    });

    const totalVotesRow = db.prepare('SELECT COUNT(*) as c FROM votes WHERE round_id = ?').get(round.id) as { c: number };
    totalVotes = totalVotesRow.c;

    // 3. Update round & game status
    db.prepare("UPDATE rounds SET status = 'REVEALED', revealed_at = CURRENT_TIMESTAMP WHERE id = ?").run(round.id);
    db.prepare("UPDATE games SET status = 'REVEALED' WHERE id = ?").run(gameId);
  })();

  // 4. Calculate options vote distribution
  const options: string[] = JSON.parse(round.options_json);
  const voteRows = db.prepare(`
    SELECT selected_person_name, COUNT(*) as count 
    FROM votes 
    WHERE round_id = ? 
    GROUP BY selected_person_name
  `).all(round.id) as { selected_person_name: string; count: number }[];

  const votesByOption: Record<string, number> = {};
  options.forEach(opt => { votesByOption[opt] = 0; });
  voteRows.forEach(row => { votesByOption[row.selected_person_name] = row.count; });

  // 5. Get Top 10 Leaderboard
  const leaderboard = getLeaderboard(gameId);

  const revealPayload = {
    gameId: game.id,
    gameCode: game.code,
    status: 'REVEALED',
    roundNumber: round.round_number,
    roundId: round.id,
    correctName: person.name,
    childhoodPhotoUrl: person.childhood_photo_url,
    adultPhotoUrl: person.adult_photo_url,
    totalVotes,
    correctVotes,
    accuracyPercentage: totalVotes > 0 ? Math.round((correctVotes / totalVotes) * 100) : 0,
    votesByOption,
    leaderboard,
  };

  broadcastToGame(game.code, 'ROUND_REVEALED', revealPayload);
  return revealPayload;
}

export function getLeaderboard(gameId: string, limit = 10) {
  return db.prepare(`
    SELECT id, display_name, score, joined_at
    FROM participants
    WHERE game_id = ?
    ORDER BY score DESC, joined_at ASC
    LIMIT ?
  `).all(gameId, limit) as { id: string; display_name: string; score: number }[];
}

export function endGame(gameId: string) {
  const game = getGameById(gameId);
  if (!game) throw new Error('Game not found');

  db.prepare("UPDATE games SET status = 'FINISHED', ended_at = CURRENT_TIMESTAMP WHERE id = ?").run(gameId);

  const leaderboard = getLeaderboard(gameId, 10);
  const analytics = getGameAnalytics(gameId);

  const finishPayload = {
    gameId: game.id,
    gameCode: game.code,
    status: 'FINISHED',
    leaderboard,
    analytics,
  };

  broadcastToGame(game.code, 'GAME_FINISHED', finishPayload);
  return finishPayload;
}

export function getGameAnalytics(gameId: string) {
  const game = getGameById(gameId);
  if (!game) return null;

  const totalParticipants = (db.prepare('SELECT COUNT(*) as c FROM participants WHERE game_id = ?').get(gameId) as { c: number }).c;
  const totalRounds = (db.prepare('SELECT COUNT(*) as c FROM rounds WHERE game_id = ?').get(gameId) as { c: number }).c;
  
  const totalVotesRow = db.prepare(`
    SELECT COUNT(*) as total_votes, SUM(is_correct) as total_correct 
    FROM votes v 
    JOIN rounds r ON v.round_id = r.id 
    WHERE r.game_id = ?
  `).get(gameId) as { total_votes: number; total_correct: number };

  const totalVotes = totalVotesRow.total_votes || 0;
  const totalCorrect = totalVotesRow.total_correct || 0;
  const avgAccuracy = totalVotes > 0 ? Math.round((totalCorrect / totalVotes) * 100) : 0;

  // Round by round breakdown
  const roundRows = db.prepare(`
    SELECT r.id, r.round_number, p.name as person_name,
           COUNT(v.id) as vote_count,
           SUM(v.is_correct) as correct_count
    FROM rounds r
    JOIN people p ON r.person_id = p.id
    LEFT JOIN votes v ON r.id = v.round_id
    WHERE r.game_id = ?
    GROUP BY r.id
    ORDER BY r.round_number ASC
  `).all(gameId) as { id: string; round_number: number; person_name: string; vote_count: number; correct_count: number }[];

  let easiestRound: { round_number: number; accuracy: number; person_name: string } | null = null;
  let hardestRound: { round_number: number; accuracy: number; person_name: string } | null = null;

  const roundDetails = roundRows.map(r => {
    const accuracy = r.vote_count > 0 ? Math.round((r.correct_count / r.vote_count) * 100) : 0;
    
    if (r.vote_count > 0) {
      if (!easiestRound || accuracy > easiestRound.accuracy) {
        easiestRound = { round_number: r.round_number, accuracy, person_name: r.person_name };
      }
      if (!hardestRound || accuracy < hardestRound.accuracy) {
        hardestRound = { round_number: r.round_number, accuracy, person_name: r.person_name };
      }
    }

    return {
      roundNumber: r.round_number,
      personName: r.person_name,
      totalVotes: r.vote_count,
      correctVotes: r.correct_count || 0,
      accuracy,
    };
  });

  return {
    totalParticipants,
    totalRounds,
    totalVotes,
    totalCorrect,
    avgAccuracy,
    easiestRound,
    hardestRound,
    roundDetails,
  };
}

// Get public participant view for current round (ZERO ANSWER LEAKAGE GUARANTEE)
export function getParticipantState(gameId: string, participantId?: string) {
  const game = getGameById(gameId);
  if (!game) return { gameStatus: 'WAITING' };

  if (game.status === 'WAITING' || !game.current_round_id) {
    return { gameStatus: 'WAITING', gameCode: game.code, gameName: game.name };
  }

  const round = getCurrentRound(gameId);
  if (!round) return { gameStatus: game.status, gameCode: game.code, gameName: game.name };

  let participantVote: { selected_person_name: string; is_correct: number } | undefined;
  let participantScore = 0;

  if (participantId) {
    const part = db.prepare('SELECT score FROM participants WHERE id = ?').get(participantId) as { score: number } | undefined;
    if (part) participantScore = part.score;

    const vote = db.prepare('SELECT selected_person_name, is_correct FROM votes WHERE round_id = ? AND participant_id = ?').get(round.id, participantId) as { selected_person_name: string; is_correct: number } | undefined;
    if (vote) participantVote = vote;
  }

  const options: string[] = JSON.parse(round.options_json);

  // If revealed, include full answer data
  if (round.status === 'REVEALED') {
    const person = db.prepare('SELECT * FROM people WHERE id = ?').get(round.person_id) as { name: string; childhood_photo_url: string; adult_photo_url: string };
    const leaderboard = getLeaderboard(gameId);

    return {
      gameStatus: 'REVEALED',
      gameCode: game.code,
      gameName: game.name,
      roundNumber: round.round_number,
      roundId: round.id,
      childhoodPhotoUrl: person.childhood_photo_url,
      adultPhotoUrl: person.adult_photo_url,
      correctName: person.name,
      options,
      hasVoted: !!participantVote,
      selectedOption: participantVote?.selected_person_name,
      isCorrect: participantVote?.is_correct === 1,
      currentScore: participantScore,
      leaderboard,
    };
  }

  // Before reveal: ZERO ANSWER LEAKAGE! (No correct name, no adult photo, no person_id)
  return {
    gameStatus: round.status, // LIVE or VOTING_CLOSED
    gameCode: game.code,
    gameName: game.name,
    roundNumber: round.round_number,
    roundId: round.id,
    childhoodPhotoUrl: round.childhood_photo_url,
    options,
    hasVoted: !!participantVote,
    selectedOption: participantVote?.selected_person_name,
    currentScore: participantScore,
  };
}
