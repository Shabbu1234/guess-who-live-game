import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const dbPath = path.resolve(process.cwd(), process.env.DATABASE_FILE || 'guess_who.db');
export const db = new Database(dbPath);

// Enable WAL mode for high concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'WAITING',
      current_round_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      childhood_photo_url TEXT NOT NULL,
      adult_photo_url TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      session_token TEXT UNIQUE NOT NULL,
      score INTEGER DEFAULT 0,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rounds (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      round_number INTEGER NOT NULL,
      person_id TEXT NOT NULL,
      childhood_photo_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'LIVE',
      options_json TEXT NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      stopped_at DATETIME,
      revealed_at DATETIME,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
      FOREIGN KEY (person_id) REFERENCES people(id)
    );

    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      round_id TEXT NOT NULL,
      participant_id TEXT NOT NULL,
      selected_person_name TEXT NOT NULL,
      is_correct INTEGER DEFAULT 0,
      voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
      FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
      CONSTRAINT unique_participant_vote UNIQUE(round_id, participant_id)
    );

    CREATE TABLE IF NOT EXISTS game_used_people (
      game_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      used_in_round_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
      CONSTRAINT unique_game_person UNIQUE(game_id, person_id)
    );

    -- Create indexes for speed
    CREATE INDEX IF NOT EXISTS idx_games_code ON games(code);
    CREATE INDEX IF NOT EXISTS idx_participants_game ON participants(game_id);
    CREATE INDEX IF NOT EXISTS idx_rounds_game ON rounds(game_id);
    CREATE INDEX IF NOT EXISTS idx_votes_round ON votes(round_id);
    CREATE INDEX IF NOT EXISTS idx_used_game_person ON game_used_people(game_id, person_id);
  `);

  // Ensure admin user exists with current configured password
  const adminPassword = process.env.ADMIN_PASSWORD || 'A_For_Apple@01';
  const passwordHash = bcrypt.hashSync(adminPassword, 10);

  const adminRow = db.prepare('SELECT id FROM admins WHERE username = ?').get('admin');
  if (!adminRow) {
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run('admin', passwordHash);
    console.log('✅ Created admin user (username: admin)');
  } else {
    db.prepare('UPDATE admins SET password_hash = ? WHERE username = ?').run(passwordHash, 'admin');
    console.log('✅ Updated admin user password to match configured environment password');
  }
}
