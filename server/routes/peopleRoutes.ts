import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireAdmin } from '../middleware/auth.js';
import {
  getAllPeople,
  getPersonById,
  createPerson,
  updatePerson,
  deletePerson,
  processAndSavePhoto,
  importPeopleFromCSV
} from '../services/peopleService.js';
import { db } from '../db.js';
import crypto from 'crypto';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Require admin for all people management routes
router.use(requireAdmin);

// GET /api/admin/people
router.get('/', (req: Request, res: Response) => {
  const search = req.query.search as string | undefined;
  const gameId = req.query.game_id as string | undefined;
  const people = getAllPeople(search, gameId);
  res.json({ people });
});

// POST /api/admin/people (Add Person with Childhood & Adult Photo Uploads)
router.post(
  '/',
  upload.fields([
    { name: 'childhood_photo', maxCount: 1 },
    { name: 'adult_photo', maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ error: 'Name is required' });
        return;
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      let childhoodPhotoUrl = '/uploads/default_child.webp';
      let adultPhotoUrl = '/uploads/default_adult.webp';

      if (files?.childhood_photo?.[0]) {
        const processed = await processAndSavePhoto(files.childhood_photo[0].buffer, 'child');
        childhoodPhotoUrl = processed.fullUrl;
      }

      if (files?.adult_photo?.[0]) {
        const processed = await processAndSavePhoto(files.adult_photo[0].buffer, 'adult');
        adultPhotoUrl = processed.fullUrl;
      }

      const person = createPerson(name, childhoodPhotoUrl, adultPhotoUrl);
      res.status(201).json({ person });
    } catch (err: any) {
      console.error('Error creating person:', err);
      res.status(500).json({ error: 'Failed to create person', details: err.message });
    }
  }
);

// PUT /api/admin/people/:id (Edit Person)
router.put(
  '/:id',
  upload.fields([
    { name: 'childhood_photo', maxCount: 1 },
    { name: 'adult_photo', maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { name } = req.body;

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      let childhoodPhotoUrl: string | undefined;
      let adultPhotoUrl: string | undefined;

      if (files?.childhood_photo?.[0]) {
        const processed = await processAndSavePhoto(files.childhood_photo[0].buffer, 'child');
        childhoodPhotoUrl = processed.fullUrl;
      }

      if (files?.adult_photo?.[0]) {
        const processed = await processAndSavePhoto(files.adult_photo[0].buffer, 'adult');
        adultPhotoUrl = processed.fullUrl;
      }

      const updated = updatePerson(id, name, childhoodPhotoUrl, adultPhotoUrl);
      if (!updated) {
        res.status(404).json({ error: 'Person not found' });
        return;
      }

      res.json({ person: updated });
    } catch (err: any) {
      console.error('Error updating person:', err);
      res.status(500).json({ error: 'Failed to update person' });
    }
  }
);

// DELETE /api/admin/people/:id
router.delete('/:id', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const deleted = deletePerson(id);
  if (!deleted) {
    res.status(404).json({ error: 'Person not found' });
    return;
  }
  res.json({ success: true, id });
});

// POST /api/admin/people/import-csv
router.post('/import-csv', upload.single('csv_file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'CSV file is required' });
      return;
    }

    const result = importPeopleFromCSV(req.file.buffer);
    res.json(result);
  } catch (err: any) {
    console.error('CSV Import Error:', err);
    res.status(500).json({ error: 'Failed to parse CSV file', details: err.message });
  }
});

// POST /api/admin/people/seed-demo (Seed sample members for instant playability!)
router.post('/seed-demo', (req: Request, res: Response) => {
  const sampleNames = [
    'Rahul Sharma', 'Amit Patel', 'Sneha Gupta', 'Priya Singh', 'Rohit Kumar',
    'Neha Verma', 'Arjun Reddy', 'Pooja Mehta', 'Karan Johar', 'Ankit Saxena',
    'Vikram Malhotra', 'Riya Sen', 'Siddharth Roy', 'Ananya Panday', 'Deepak Chopra',
    'Kavita Devi', 'Manish Malhotra', 'Simran Kaur', 'Aman Gupta', 'Divya Bhaskar',
    'Gaurav Chaudhary', 'Isha Ambani', 'Jatin Kumar', 'Kirti Kulhari', 'Lokesh Kanagaraj'
  ];

  const insert = db.prepare(
    'INSERT INTO people (id, name, childhood_photo_url, adult_photo_url, active) VALUES (?, ?, ?, ?, 1)'
  );

  let seededCount = 0;
  db.transaction(() => {
    for (let i = 0; i < sampleNames.length; i++) {
      const id = `person_demo_${i + 1}`;
      const existing = db.prepare('SELECT id FROM people WHERE id = ?').get(id);
      if (!existing) {
        const name = sampleNames[i];
        // Use styled SVG avatar placeholders for childhood & adult
        const childUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=child_${name.replace(/\s+/g, '_')}`;
        const adultUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=adult_${name.replace(/\s+/g, '_')}`;
        insert.run(id, name, childUrl, adultUrl);
        seededCount++;
      }
    }
  })();

  res.json({ success: true, seededCount, totalPeople: db.prepare('SELECT COUNT(*) as c FROM people').get() });
});

export default router;
