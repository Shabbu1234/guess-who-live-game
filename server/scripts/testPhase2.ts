import express from 'express';
import cookieParser from 'cookie-parser';
import adminAuthRoutes from '../routes/adminAuthRoutes.js';
import { requireAdmin } from '../middleware/auth.js';
import { initDatabase } from '../db.js';
import http from 'http';

initDatabase();

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/admin', adminAuthRoutes);

app.get('/api/admin/protected-test', requireAdmin, (req, res) => {
  res.json({ secretData: 'TopSecret123' });
});

const server = http.createServer(app);
server.listen(3009, async () => {
  console.log('🧪 Testing PHASE 2 Admin Auth on port 3009...');

  try {
    // 1. Incorrect password test
    const res1 = await fetch('http://localhost:3009/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'WrongPassword!' }),
    });
    console.assert(res1.status === 401, 'Expected 401 for wrong password');
    console.log('✅ PASS: Rejected invalid password');

    // 2. Correct password test
    const res2 = await fetch('http://localhost:3009/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: process.env.ADMIN_PASSWORD || 'GuessWhoAdmin2026!' }),
    });
    console.assert(res2.status === 200, 'Expected 200 for correct password');
    const cookieHeader = res2.headers.get('set-cookie');
    console.assert(!!cookieHeader, 'Expected set-cookie header');
    console.log('✅ PASS: Accepted valid password & issued HTTP-only session cookie');

    // Extract cookie token
    const token = cookieHeader?.split(';')[0];

    // 3. Protected endpoint test
    const res3 = await fetch('http://localhost:3009/api/admin/protected-test', {
      headers: { Cookie: token || '' },
    });
    const body3 = await res3.json();
    console.assert(res3.status === 200 && body3.secretData === 'TopSecret123', 'Protected endpoint failed');
    console.log('✅ PASS: Protected admin endpoint accessible with valid session cookie');

    // 4. Logout test
    const res4 = await fetch('http://localhost:3009/api/admin/logout', {
      method: 'POST',
      headers: { Cookie: token || '' },
    });
    console.assert(res4.status === 200, 'Logout failed');

    const res5 = await fetch('http://localhost:3009/api/admin/protected-test', {
      headers: { Cookie: token || '' },
    });
    console.assert(res5.status === 401, 'Expected 401 after logout');
    console.log('✅ PASS: Admin session successfully invalidated upon logout');

    console.log('🎉 PHASE 2 Admin Authentication Test PASSED PERFECTLY!\n');
  } catch (err) {
    console.error('❌ PHASE 2 test error:', err);
    process.exit(1);
  } finally {
    server.close();
  }
});
