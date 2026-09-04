import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { parse } from 'csv-parse/sync';
import { db } from '../db.js';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const THUMBS_DIR = path.resolve(UPLOADS_DIR, 'thumbs');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(THUMBS_DIR)) fs.mkdirSync(THUMBS_DIR, { recursive: true });

export interface Person {
  id: string;
  name: string;
  childhood_photo_url: string;
  adult_photo_url: string;
  active: number;
  created_at: string;
}

// Compress image to WebP (1080px max) + 150px thumbnail
export async function processAndSavePhoto(fileBuffer: Buffer, filenamePrefix: string): Promise<{ fullUrl: string; thumbUrl: string }> {
  const hash = crypto.randomBytes(8).toString('hex');
  const filename = `${filenamePrefix}_${Date.now()}_${hash}.webp`;
  const thumbFilename = `thumb_${filename}`;

  const fullPath = path.join(UPLOADS_DIR, filename);
  const thumbPath = path.join(THUMBS_DIR, thumbFilename);

  // High quality optimized WebP
  await sharp(fileBuffer)
    .resize(1080, 1080, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(fullPath);

  // Fast loading thumbnail WebP
  await sharp(fileBuffer)
    .resize(150, 150, { fit: 'cover' })
    .webp({ quality: 75 })
    .toFile(thumbPath);

  return {
    fullUrl: `/uploads/${filename}`,
    thumbUrl: `/uploads/thumbs/${thumbFilename}`,
  };
}

export function getAllPeople(search?: string, gameId?: string): (Person & { is_used?: boolean })[] {
  let query = 'SELECT p.* FROM people p WHERE p.active = 1';
  const params: any[] = [];

  if (search && search.trim() !== '') {
    query += ' AND p.name LIKE ?';
    params.push(`%${search.trim()}%`);
  }

  query += ' ORDER BY p.name ASC';

  const people = db.prepare(query).all(...params) as Person[];

  if (gameId) {
    const usedRows = db.prepare('SELECT person_id FROM game_used_people WHERE game_id = ?').all(gameId) as { person_id: string }[];
    const usedSet = new Set(usedRows.map(r => r.person_id));

    return people.map(p => ({
      ...p,
      is_used: usedSet.has(p.id),
    }));
  }

  return people;
}

export function getPersonById(id: string): Person | undefined {
  return db.prepare('SELECT * FROM people WHERE id = ?').get(id) as Person | undefined;
}

export function createPerson(name: string, childhoodPhotoUrl: string, adultPhotoUrl: string): Person {
  const id = `person_${crypto.randomUUID()}`;
  db.prepare(
    'INSERT INTO people (id, name, childhood_photo_url, adult_photo_url, active) VALUES (?, ?, ?, ?, 1)'
  ).run(id, name, childhoodPhotoUrl, adultPhotoUrl);

  return getPersonById(id)!;
}

export function updatePerson(id: string, name: string, childhoodPhotoUrl?: string, adultPhotoUrl?: string): Person | undefined {
  const person = getPersonById(id);
  if (!person) return undefined;

  const newChild = childhoodPhotoUrl || person.childhood_photo_url;
  const newAdult = adultPhotoUrl || person.adult_photo_url;

  db.prepare(
    'UPDATE people SET name = ?, childhood_photo_url = ?, adult_photo_url = ? WHERE id = ?'
  ).run(name, newChild, newAdult, id);

  return getPersonById(id);
}

export function deletePerson(id: string): boolean {
  const res = db.prepare('DELETE FROM people WHERE id = ?').run(id);
  return res.changes > 0;
}

export function importPeopleFromCSV(csvBuffer: Buffer): { importedCount: number; errors: string[] } {
  const records = parse(csvBuffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  let importedCount = 0;
  const errors: string[] = [];

  const insert = db.prepare(
    'INSERT INTO people (id, name, childhood_photo_url, adult_photo_url, active) VALUES (?, ?, ?, ?, 1)'
  );

  db.transaction(() => {
    for (const record of records) {
      const name = record.name || record.Name;
      if (!name) {
        errors.push('Row missing name column');
        continue;
      }

      const childUrl = record.childhood_photo || record.childhood_photo_url || '/uploads/default_child.webp';
      const adultUrl = record.adult_photo || record.adult_photo_url || '/uploads/default_adult.webp';
      const id = `person_${crypto.randomUUID()}`;

      insert.run(id, name, childUrl, adultUrl);
      importedCount++;
    }
  })();

  return { importedCount, errors };
}
