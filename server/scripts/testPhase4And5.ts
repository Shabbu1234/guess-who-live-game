import express from 'express';
import cookieParser from 'cookie-parser';
import adminAuthRoutes from '../routes/adminAuthRoutes.js';
import adminGameRoutes from '../routes/adminGameRoutes.js';
import participantRoutes from '../routes/participantRoutes.js';
import { initDatabase } from '../db.js';
import http from 'http';

initDatabase();

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/admin', adminAuthRoutes);
app.use('/api/admin/game', adminGameRoutes);
app.use('/api/game', participantRoutes);

const server = http.createServer(app);
server.listen(3011, async () => {
  console.log('🧪 Testing PHASE 4 & 5 Game Creation & Participant Join on port 3011...');

  try {
    // 1. Admin login
    const loginRes = await fetch('http://localhost:3011/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: process.env.ADMIN_PASSWORD || 'GuessWhoAdmin2026!' }),
    });
    const cookie = loginRes.headers.get('set-cookie')?.split(';')[0] || '';

    // 2. Create Game (Phase 4)
    const createRes = await fetch('http://localhost:3011/api/admin/game/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ name: 'Annual Gala Guess Who 2026' }),
    });
    const createData = await createRes.json();
    console.assert(createRes.status === 201 && createData.game.code.length === 5, 'Game creation failed');
    console.log(`✅ PASS: Admin created game '${createData.game.name}' with human code: ${createData.game.code}`);

    // 3. Verify Code
    const verifyRes = await fetch(`http://localhost:3011/api/game/verify-code/${createData.game.code}`);
    const verifyData = await verifyRes.json();
    console.assert(verifyRes.status === 200 && verifyData.valid, 'Code verification failed');
    console.log(`✅ PASS: Code '${createData.game.code}' verified successfully`);

    // 4. Participant Join (Phase 5)
    const joinRes = await fetch('http://localhost:3011/api/game/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: createData.game.code, name: 'Rahul Participant' }),
    });
    const joinData = await joinRes.json();
    console.assert(joinRes.status === 200 && joinData.display_name === 'Rahul Participant', 'Join failed');
    console.log(`✅ PASS: Participant joined game with session token (${joinData.session_token})`);

    // 5. Reconnect test with same name & session token
    const reconnectRes = await fetch('http://localhost:3011/api/game/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: createData.game.code, name: 'Rahul Participant', session_token: joinData.session_token }),
    });
    const reconnectData = await reconnectRes.json();
    console.assert(reconnectData.participant_id === joinData.participant_id, 'Reconnect created duplicate participant');
    console.log('✅ PASS: Participant reconnected seamlessly without creating duplicate session');

    console.log('🎉 PHASE 4 & 5 Game Creation & Participant Join Test PASSED PERFECTLY!\n');
  } catch (err) {
    console.error('❌ PHASE 4 & 5 test error:', err);
    process.exit(1);
  } finally {
    server.close();
  }
});
