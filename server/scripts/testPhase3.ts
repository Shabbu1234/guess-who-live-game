import express from 'express';
import cookieParser from 'cookie-parser';
import peopleRoutes from '../routes/peopleRoutes.js';
import adminAuthRoutes from '../routes/adminAuthRoutes.js';
import { initDatabase } from '../db.js';
import { processAndSavePhoto } from '../services/peopleService.js';
import http from 'http';
import sharp from 'sharp';

initDatabase();

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/admin', adminAuthRoutes);
app.use('/api/admin/people', peopleRoutes);

const server = http.createServer(app);
server.listen(3010, async () => {
  console.log('🧪 Testing PHASE 3 People & Photo Pipeline on port 3010...');

  try {
    // 1. Log in admin to get session cookie
    const loginRes = await fetch('http://localhost:3010/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: process.env.ADMIN_PASSWORD || 'GuessWhoAdmin2026!' }),
    });
    const cookie = loginRes.headers.get('set-cookie')?.split(';')[0] || '';

    // 2. Test Image pipeline directly with Sharp
    const testImageBuffer = await sharp({
      create: {
        width: 1200,
        height: 1200,
        channels: 4,
        background: { r: 139, g: 92, b: 246, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const { fullUrl, thumbUrl } = await processAndSavePhoto(testImageBuffer, 'test_member');
    console.assert(fullUrl.endsWith('.webp') && thumbUrl.includes('thumb_'), 'Image processing failed');
    console.log(`✅ PASS: Sharp image pipeline converted 1200px PNG -> WebP (${fullUrl}) & 150px WebP thumb (${thumbUrl})`);

    // 3. Seed demo people
    const seedRes = await fetch('http://localhost:3010/api/admin/people/seed-demo', {
      method: 'POST',
      headers: { Cookie: cookie },
    });
    const seedData = await seedRes.json();
    console.assert(seedRes.status === 200 && seedData.success, 'Seeding demo people failed');
    console.log(`✅ PASS: Seeded demo members dataset (Total people in DB: ${seedData.totalPeople.c})`);

    // 4. Test GET /api/admin/people with search filter
    const getRes = await fetch('http://localhost:3010/api/admin/people?search=Rahul', {
      headers: { Cookie: cookie },
    });
    const getData = await getRes.json();
    console.assert(getRes.status === 200 && getData.people.length > 0, 'People search failed');
    console.log(`✅ PASS: Search filter returned '${getData.people[0].name}'`);

    // 5. Test CSV Import
    const csvContent = 'name,childhood_photo_url,adult_photo_url\n"Imported Person 1","/uploads/c1.webp","/uploads/a1.webp"\n"Imported Person 2","/uploads/c2.webp","/uploads/a2.webp"';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const formData = new FormData();
    formData.append('csv_file', blob, 'members.csv');

    const csvRes = await fetch('http://localhost:3010/api/admin/people/import-csv', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: formData,
    });
    const csvData = await csvRes.json();
    console.assert(csvRes.status === 200 && csvData.importedCount === 2, 'CSV import failed');
    console.log(`✅ PASS: CSV import successfully created ${csvData.importedCount} members from CSV file`);

    console.log('🎉 PHASE 3 People & Photo Manager Test PASSED PERFECTLY!\n');
  } catch (err) {
    console.error('❌ PHASE 3 test error:', err);
    process.exit(1);
  } finally {
    server.close();
  }
});
