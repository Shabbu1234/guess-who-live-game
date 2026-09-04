import crypto from 'crypto';
import { db } from '../db.js';

export interface Game {
  id: string;
  code: string;
  name: string;
  status: 'WAITING' | 'LIVE' | 'VOTING_CLOSED' | 'REVEALED' | 'FINISHED';
  current_round_id: string | null;
  created_at: string;
  ended_at: string | null;
}

export interface Participant {
  id: string;
  game_id: string;
  display_name: string;
  session_token: string;
  score: number;
  joined_at: string;
  last_seen_at: string;
}

// Generate short 5-character human-friendly uppercase code (e.g. 7K4P9)
export function generateGameCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude visually ambiguous 0, O, 1, I
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Check uniqueness
  const existing = db.prepare('SELECT id FROM games WHERE code = ?').get(code);
  if (existing) return generateGameCode(); // retry if collision
  
  return code;
}

export function createGame(name: string): Game {
  const id = `game_${crypto.randomUUID()}`;
  const code = generateGameCode();

  db.prepare(
    'INSERT INTO games (id, code, name, status) VALUES (?, ?, ?, ?)'
  ).run(id, code, name, 'WAITING');

  return getGameById(id)!;
}

export function getGameById(id: string): Game | undefined {
  return db.prepare('SELECT * FROM games WHERE id = ?').get(id) as Game | undefined;
}

export function getGameByCode(code: string): Game | undefined {
  return db.prepare('SELECT * FROM games WHERE code = ?').get(code.trim().toUpperCase()) as Game | undefined;
}

export function getActiveGame(): Game | undefined {
  return db.prepare("SELECT * FROM games WHERE status != 'FINISHED' ORDER BY created_at DESC LIMIT 1").get() as Game | undefined;
}

export function getGameStats(gameId: string) {
  const playersCount = (db.prepare('SELECT COUNT(*) as c FROM participants WHERE game_id = ?').get(gameId) as { c: number }).c;
  const roundsCount = (db.prepare('SELECT COUNT(*) as c FROM rounds WHERE game_id = ?').get(gameId) as { c: number }).c;
  const usedPeopleCount = (db.prepare('SELECT COUNT(*) as c FROM game_used_people WHERE game_id = ?').get(gameId) as { c: number }).c;
  const totalActivePeople = (db.prepare('SELECT COUNT(*) as c FROM people WHERE active = 1').get() as { c: number }).c;

  return {
    playersCount,
    roundsCount,
    usedPeopleCount,
    remainingPeopleCount: Math.max(0, totalActivePeople - usedPeopleCount),
    totalActivePeople,
  };
}

export function joinGame(code: string, displayName: string, existingSessionToken?: string): Participant {
  const game = getGameByCode(code);
  if (!game) {
    throw new Error('Game not found. Please check the Game Code.');
  }

  if (game.status === 'FINISHED') {
    throw new Error('This game has already finished.');
  }

  const cleanName = displayName.trim();
  if (!cleanName) {
    throw new Error('Participant name is required.');
  }

  // 1. Reconnect existing session if session token provided
  if (existingSessionToken) {
    const existing = db.prepare('SELECT * FROM participants WHERE session_token = ? AND game_id = ?').get(existingSessionToken, game.id) as Participant | undefined;
    if (existing) {
      db.prepare('UPDATE participants SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?').run(existing.id);
      return existing;
    }
  }

  // 2. Check if name already exists in game
  const nameMatch = db.prepare('SELECT * FROM participants WHERE game_id = ? AND LOWER(display_name) = LOWER(?)').get(game.id, cleanName) as Participant | undefined;
  if (nameMatch) {
    // Reuse existing session for this name (supports refresh/reconnect)
    db.prepare('UPDATE participants SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?').run(nameMatch.id);
    return nameMatch;
  }

  // 3. Create new participant
  const id = `part_${crypto.randomUUID()}`;
  const sessionToken = `st_${crypto.randomUUID()}`;

  db.prepare(
    'INSERT INTO participants (id, game_id, display_name, session_token, score) VALUES (?, ?, ?, ?, 0)'
  ).run(id, game.id, cleanName, sessionToken);

  return db.prepare('SELECT * FROM participants WHERE id = ?').get(id) as Participant;
}
