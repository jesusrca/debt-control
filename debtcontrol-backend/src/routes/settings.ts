import { Router } from 'express';
import { getDb } from '../db/index.js';
import { updateSettingSchema } from '../schemas.js';

const router = Router();

router.get('/', (_req, res) => {
  const db = getDb();
  const settings = db.prepare('SELECT * FROM settings').all();
  res.json(settings);
});

router.put('/', (req, res) => {
  const data = updateSettingSchema.parse(req.body);
  const db = getDb();

  if (!data.key) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Key is required' } });
    return;
  }

  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    .run(data.key, data.value ?? null);

  const setting = db.prepare('SELECT * FROM settings WHERE key = ?').get(data.key);
  res.json(setting);
});

router.get('/:key', (req, res) => {
  const db = getDb();
  const setting = db.prepare('SELECT * FROM settings WHERE key = ?').get(req.params.key);

  if (!setting) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Setting not found' } });
    return;
  }

  res.json(setting);
});

export default router;