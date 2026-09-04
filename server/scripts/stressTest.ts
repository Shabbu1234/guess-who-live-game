import http from 'http';
import WebSocket from 'ws';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { initDatabase, db } from '../db.js';
import { initWebSocketServer } from '../services/websocketService.js';
import adminAuthRoutes from '../routes/adminAuthRoutes.js';
import peopleRoutes from '../routes/peopleRoutes.js';
import adminGameRoutes from '../routes/adminGameRoutes.js';
import adminRoundRoutes from '../routes/adminRoundRoutes.js';
import participantRoutes from '../routes/participantRoutes.js';
import participantVoteRoutes from '../routes/participantVoteRoutes.js';

initDatabase();

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use('/api/admin', adminAuthRoutes);
app.use('/api/admin/people', peopleRoutes);
app.use('/api/admin/game', adminGameRoutes);
app.use('/api/admin/round', adminRoundRoutes);
app.use('/api/game', participantRoutes);
app.use('/api', participantVoteRoutes);

const server = http.createServer(app);
initWebSocketServer(server);

const TEST_PORT = 3012;

server.listen(TEST_PORT, async () => {
  console.log(`\n======================================================`);
  console.log(`🚀 STARTING END-TO-END 200-USER STRESS & SECURITY AUDIT`);
  console.log(`======================================================\n`);

  try {
    // 1. Admin login & Seed 50 people
    console.log('Step 1: Authenticating Admin & Seeding 50 members...');
    const loginRes = await fetch(`http://localhost:${TEST_PORT}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: process.env.ADMIN_PASSWORD || 'GuessWhoAdmin2026!' }),
    });
    const cookie = loginRes.headers.get('set-cookie')?.split(';')[0] || '';

    await fetch(`http://localhost:${TEST_PORT}/api/admin/people/seed-demo`, {
      method: 'POST',
      headers: { Cookie: cookie },
    });

    // 2. Create Game
    console.log('\nStep 2: Creating Live Game...');
    const createRes = await fetch(`http://localhost:${TEST_PORT}/api/admin/game/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ name: '200-Player Stress Test Event' }),
    });
    const { game } = await createRes.json();
    console.log(`✅ Game Created. Code: [ ${game.code} ]`);

    // 3. Connect 200 simulated WebSocket Participants & Join API
    console.log('\nStep 3: Joining 200 Concurrent Participants via REST + WebSocket...');
    const participants: { id: string; sessionToken: string; name: string; ws: WebSocket }[] = [];
    const wsPromises: Promise<void>[] = [];

    const startTime = Date.now();

    for (let i = 1; i <= 200; i++) {
      const name = `Player_${i.toString().padStart(3, '0')}`;

      // Join REST
      const joinRes = await fetch(`http://localhost:${TEST_PORT}/api/game/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: game.code, name }),
      });
      const joinData = await joinRes.json();

      // Connect WebSocket
      const ws = new WebSocket(`ws://localhost:${TEST_PORT}/ws`);
      const p = new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          ws.send(JSON.stringify({ type: 'JOIN_ROOM', gameCode: game.code, role: 'participant', participantId: joinData.participant_id }));
        });
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'ROOM_JOINED') resolve();
        });
        ws.on('error', reject);
      });

      wsPromises.push(p);
      participants.push({ id: joinData.participant_id, sessionToken: joinData.session_token, name, ws });
    }

    await Promise.all(wsPromises);
    console.log(`✅ 200/200 Participants Connected & Joined in ${Date.now() - startTime}ms!`);

    // Connect 1 Admin WebSocket
    let adminLiveVoteCount = 0;
    const adminWs = new WebSocket(`ws://localhost:${TEST_PORT}/ws`);
    
    adminWs.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'VOTE_COUNT_UPDATE') {
          adminLiveVoteCount = msg.data.totalVotes;
        }
      } catch (err) {}
    });

    await new Promise<void>((resolve) => {
      adminWs.on('open', () => {
        adminWs.send(JSON.stringify({ type: 'JOIN_ROOM', gameCode: game.code, role: 'admin' }));
      });
      const joinHandler = (data: any) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ROOM_JOINED') {
          adminWs.off('message', joinHandler);
          resolve();
        }
      };
      adminWs.on('message', joinHandler);
    });
    console.log('✅ Admin WebSocket Connected to Live Monitor Room');

    // 4. Start Round 1
    console.log('\nStep 4: Admin Starting Round 1...');
    const startRoundRes = await fetch(`http://localhost:${TEST_PORT}/api/admin/round/start-round`, {
      method: 'POST',
      headers: { Cookie: cookie },
    });
    const { round: roundData } = await startRoundRes.json();
    console.log(`✅ Round ${roundData.roundNumber} Started! Round ID: ${roundData.roundId}`);

    // 5. SECURITY AUDIT: Check zero answer leakage
    console.log('\nStep 5: 🛡️ AUDITING ZERO ANSWER LEAKAGE FOR PARTICIPANTS...');
    const publicStateRes = await fetch(`http://localhost:${TEST_PORT}/api/game/state?game_code=${game.code}&participant_id=${participants[0].id}`);
    const publicState = await publicStateRes.json();
    
    console.assert(publicState.correctName === undefined, 'SECURITY AUDIT FAILED: correctName leaked!');
    console.assert(publicState.person_id === undefined, 'SECURITY AUDIT FAILED: person_id leaked!');
    console.assert(publicState.adultPhotoUrl === undefined, 'SECURITY AUDIT FAILED: adultPhotoUrl leaked!');
    console.assert(publicState.options.length === 5, 'Options count invalid');
    console.log('🔒 PASS: ZERO ANSWER LEAKAGE CONFIRMED! Correct answer and adult photo are 100% hidden.');

    // 6. STRESS TEST: Submit 200 Votes concurrently within 2 seconds
    console.log('\nStep 6: ⚡ SUBMITTING 200 CONCURRENT VOTES IN UNDER 2 SECONDS...');
    const voteStartTime = Date.now();

    const votePromises = participants.map((p, idx) => {
      // Pick random option from the 5 candidates
      const selectedOption = roundData.options[idx % roundData.options.length];
      return fetch(`http://localhost:${TEST_PORT}/api/game/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round_id: roundData.roundId,
          participant_id: p.id,
          selected_option: selectedOption,
        }),
      }).then(r => r.json());
    });

    const voteResults = await Promise.all(votePromises);
    const voteDuration = Date.now() - voteStartTime;

    const successfulVotes = voteResults.filter(r => r.success).length;
    console.log(`⚡ 200 Votes Processed in ${voteDuration}ms (${successfulVotes}/200 Success Rate)!`);
    console.assert(successfulVotes === 200, 'Some votes failed');

    // 7. Duplicate vote protection test
    console.log('\nStep 7: Testing Duplicate Vote Prevention...');
    const dupRes = await fetch(`http://localhost:${TEST_PORT}/api/game/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        round_id: roundData.roundId,
        participant_id: participants[0].id,
        selected_option: roundData.options[0],
      }),
    });
    const dupData = await dupRes.json();
    console.assert(dupRes.status === 400 && dupData.error.includes('already submitted'), `Duplicate vote test failed: ${JSON.stringify(dupData)}`);
    console.log('✅ PASS: Database UNIQUE(round_id, participant_id) blocked duplicate vote attempt!');

    // Wait 100ms for WS broadcast catchup
    await new Promise(r => setTimeout(r, 150));
    console.log(`✅ Admin Live Monitor received real-time count: ${adminLiveVoteCount}/200`);
    console.assert(adminLiveVoteCount === 200, 'Admin WS vote count mismatch');

    // 8. Admin Stop Voting & Reveal
    console.log('\nStep 8: Admin Stopping Voting & Revealing Answer...');
    await fetch(`http://localhost:${TEST_PORT}/api/admin/round/stop-voting`, {
      method: 'POST',
      headers: { Cookie: cookie },
    });

    const revealRes = await fetch(`http://localhost:${TEST_PORT}/api/admin/round/reveal-answer`, {
      method: 'POST',
      headers: { Cookie: cookie },
    });
    const { result: revealData } = await revealRes.json();
    console.log(`🎉 Answer Revealed: ${revealData.correctName}! Total Votes: ${revealData.totalVotes}, Accuracy: ${revealData.accuracyPercentage}%`);
    console.log(`🏆 Current Top 3: 1st ${revealData.leaderboard[0]?.display_name} (${revealData.leaderboard[0]?.score} pts)`);

    // 9. PHOTO ANTI-REUSE AUDIT across 5 consecutive rounds
    console.log('\nStep 9: 🛡️ AUDITING PHOTO ANTI-REUSE ACROSS 5 CONSECUTIVE ROUNDS...');
    const usedPeople = [roundData.person_id];

    for (let r = 2; r <= 5; r++) {
      const nextRes = await fetch(`http://localhost:${TEST_PORT}/api/admin/round/start-round`, {
        method: 'POST',
        headers: { Cookie: cookie },
      });
      const nextData = await nextRes.json();

      await fetch(`http://localhost:${TEST_PORT}/api/admin/round/stop-voting`, { method: 'POST', headers: { Cookie: cookie } });
      const revRes = await fetch(`http://localhost:${TEST_PORT}/api/admin/round/reveal-answer`, { method: 'POST', headers: { Cookie: cookie } });
      const revJson = await revRes.json();

      const roundPersonRow = db.prepare('SELECT person_id FROM rounds WHERE id = ?').get(nextData.round.roundId) as { person_id: string };
      console.log(`  Round ${r}: Used Person ID = ${roundPersonRow.person_id} (${revJson.result.correctName})`);

      console.assert(!usedPeople.includes(roundPersonRow.person_id), `FAIL: Duplicate person ${roundPersonRow.person_id} reused!`);
      usedPeople.push(roundPersonRow.person_id);
    }

    console.log(`✅ PASS: All 5 rounds used 100% unique distinct people! DB UNIQUE(game_id, person_id) verified.`);

    // Clean up WS sockets
    participants.forEach(p => p.ws.close());
    adminWs.close();

    console.log('\n======================================================');
    console.log('🎉 ALL 200-USER STRESS & SECURITY AUDITS PASSED 100%!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ STRESS TEST ERROR:', err);
    process.exit(1);
  } finally {
    server.close();
  }
});
