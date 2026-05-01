import { Router } from 'express';
import { getDb } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { createCategorySchema, updateCategorySchema } from '../schemas.js';
import type { Category } from '../types.js';

const router = Router();

router.get('/', (_req, res) => {
  const db = getDb();
  const categories = db.prepare('SELECT * FROM categories ORDER BY created_at DESC').all();
  res.json(categories);
});

router.post('/', (req, res) => {
  const data = createCategorySchema.parse(req.body);
  const db = getDb();

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare('INSERT INTO categories (id, name, icon, color, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, data.name, data.icon, data.color, now);

  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category;
  res.status(201).json(category);
});

router.put('/:id', (req, res) => {
  const data = updateCategorySchema.parse(req.body);
  const db = getDb();

  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id) as Category | undefined;
  if (!existing) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Category not found' } });
    return;
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
  if (data.icon !== undefined) { updates.push('icon = ?'); values.push(data.icon); }
  if (data.color !== undefined) { updates.push('color = ?'); values.push(data.color); }

  if (updates.length === 0) { res.json(existing); return; }

  values.push(req.params.id);
  db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id) as Category;
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const db = getDb();

  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Category not found' } });
    return;
  }

  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;