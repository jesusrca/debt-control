import { Router } from 'express';
import { getDb } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { createBankAccountSchema, updateBankAccountSchema } from '../schemas.js';
import type { BankAccount } from '../types.js';

const router = Router();

router.get('/', (_req, res) => {
  const db = getDb();
  const accounts = db.prepare('SELECT * FROM bank_accounts ORDER BY created_at DESC').all();
  res.json(accounts);
});

router.post('/', (req, res) => {
  const data = createBankAccountSchema.parse(req.body);
  const db = getDb();

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare('INSERT INTO bank_accounts (id, name, color, created_at) VALUES (?, ?, ?, ?)')
    .run(id, data.name, data.color, now);

  const account = db.prepare('SELECT * FROM bank_accounts WHERE id = ?').get(id) as BankAccount;
  res.status(201).json(account);
});

router.put('/:id', (req, res) => {
  const data = updateBankAccountSchema.parse(req.body);
  const db = getDb();

  const existing = db.prepare('SELECT * FROM bank_accounts WHERE id = ?').get(req.params.id) as BankAccount | undefined;
  if (!existing) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Bank account not found' } });
    return;
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
  if (data.color !== undefined) { updates.push('color = ?'); values.push(data.color); }

  if (updates.length === 0) { res.json(existing); return; }

  values.push(req.params.id);
  db.prepare(`UPDATE bank_accounts SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare('SELECT * FROM bank_accounts WHERE id = ?').get(req.params.id) as BankAccount;
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const db = getDb();

  const existing = db.prepare('SELECT * FROM bank_accounts WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Bank account not found' } });
    return;
  }

  db.prepare('DELETE FROM bank_accounts WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;