import { db, initDatabase } from '../db.js';
import crypto from 'crypto';

initDatabase();

console.log('🧪 PHASE 1 Database & Migration Verification Test...');

// 1. Clean test records if any
db.prepare('DELETE FROM game_used_people').run();
db.prepare('DELETE FROM votes').run();
db.prepare('DELETE FROM rounds').run();
db.prepare('DELETE FROM participants').run();
db.prepare('DELETE FROM games').run();
db.prepare('DELETE FROM people').run();

// 2. Insert 100 people
const insertPerson = db.prepare(
  'INSERT INTO people (id, name, childhood_photo_url, adult_photo_url) VALUES (?, ?, ?, ?)'
);

const peopleIds: string[] = [];
for (let i = 1; i <= 100; i++) {
  const id = `person_${i}`;
  peopleIds.push(id);
  insertPerson.run(id, `Member ${i}`, `/uploads/child_${i}.webp`, `/uploads/adult_${i}.webp`);
}

const count = (db.prepare('SELECT COUNT(*) as count FROM people').get() as { count: number }).count;
console.log(`✅ Successfully inserted ${count} people into SQLite database.`);

// 3. Create Game A and Game B
const gameA = 'game_A_123';
const gameB = 'game_B_456';
const round1 = 'round_1_abc';

db.prepare('INSERT INTO games (id, code, name) VALUES (?, ?, ?)').run(gameA, 'GAMEA', 'Game A');
db.prepare('INSERT INTO games (id, code, name) VALUES (?, ?, ?)').run(gameB, 'GAMEB', 'Game B');

// 4. Mark Person 1 used in Game A
const markUsed = db.prepare(
  'INSERT INTO game_used_people (game_id, person_id, used_in_round_id) VALUES (?, ?, ?)'
);

markUsed.run(gameA, peopleIds[0], round1);
console.log(`✅ Marked ${peopleIds[0]} as used in Game A.`);

// 5. Try marking Person 1 as used in Game A again (Should FAIL with unique constraint)
let duplicateBlocked = false;
try {
  markUsed.run(gameA, peopleIds[0], 'round_2_xyz');
} catch (err: any) {
  if (err.message.includes('UNIQUE constraint failed')) {
    duplicateBlocked = true;
  }
}

if (duplicateBlocked) {
  console.log('✅ PASS: UNIQUE(game_id, person_id) constraint blocked duplicate person use in Game A!');
} else {
  console.error('❌ FAIL: Duplicate person use was NOT blocked in Game A!');
  process.exit(1);
}

// 6. Try marking Person 1 as used in Game B (Should SUCCEED!)
try {
  markUsed.run(gameB, peopleIds[0], 'round_b1');
  console.log('✅ PASS: Person 1 is available and usable in independent Game B!');
} catch (err: any) {
  console.error('❌ FAIL: Person 1 failed in Game B:', err.message);
  process.exit(1);
}

console.log('🎉 PHASE 1 Database & Migrations Test PASSED PERFECTLY!\n');
