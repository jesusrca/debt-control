import { Router } from 'express';
import { getDb } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { createDebtTemplateSchema, updateDebtTemplateSchema } from '../schemas.js';
import type { DebtTemplate } from '../types.js';

const router = Router();

router.get('/', (_req, res) => {
  const db = getDb();
  const templates = db.prepare(`
    SELECT dt.*, c.name as category_name, c.color as category_color,
           ba.name as bank_name, ba.color as bank_color
    FROM debt_templates dt
    LEFT JOIN categories c ON dt.category_id = c.id
    LEFT JOIN bank_accounts ba ON dt.bank_account_id = ba.id
    WHERE dt.is_active = 1
    ORDER BY dt.created_at DESC
  `).all();

  res.json(templates);
});

router.post('/', (req, res) => {
  const data = createDebtTemplateSchema.parse(req.body);
  const db = getDb();

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO debt_templates (id, name, amount, interest_rate, frequency, due_day, due_weekday, category_id, bank_account_id, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.name,
    data.amount,
    data.interest_rate ?? 0,
    data.frequency,
    data.due_day ?? null,
    data.due_weekday ?? null,
    data.category_id ?? null,
    data.bank_account_id ?? null,
    data.notes ?? null,
    now
  );

  const template = db.prepare('SELECT * FROM debt_templates WHERE id = ?').get(id) as DebtTemplate;
  res.status(201).json(template);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const template = db.prepare(`
    SELECT dt.*, c.name as category_name, c.color as category_color,
           ba.name as bank_name, ba.color as bank_color
    FROM debt_templates dt
    LEFT JOIN categories c ON dt.category_id = c.id
    LEFT JOIN bank_accounts ba ON dt.bank_account_id = ba.id
    WHERE dt.id = ?
  `).get(req.params.id) as DebtTemplate & { category_name?: string; category_color?: string };

  if (!template) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Debt template not found' },
    });
    return;
  }

  res.json(template);
});

router.put('/:id', (req, res) => {
  const data = updateDebtTemplateSchema.parse(req.body);
  const db = getDb();

  const existing = db.prepare('SELECT * FROM debt_templates WHERE id = ?').get(req.params.id) as DebtTemplate | undefined;
  if (!existing) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Debt template not found' },
    });
    return;
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
  if (data.amount !== undefined) { updates.push('amount = ?'); values.push(data.amount); }
  if (data.interest_rate !== undefined) { updates.push('interest_rate = ?'); values.push(data.interest_rate); }
  if (data.frequency !== undefined) { updates.push('frequency = ?'); values.push(data.frequency); }
  if (data.due_day !== undefined) { updates.push('due_day = ?'); values.push(data.due_day); }
  if (data.due_weekday !== undefined) { updates.push('due_weekday = ?'); values.push(data.due_weekday); }
  if (data.category_id !== undefined) { updates.push('category_id = ?'); values.push(data.category_id); }
  if (data.bank_account_id !== undefined) { updates.push('bank_account_id = ?'); values.push(data.bank_account_id); }
  if (data.notes !== undefined) { updates.push('notes = ?'); values.push(data.notes); }
  if (data.is_active !== undefined) { updates.push('is_active = ?'); values.push(data.is_active); }

  if (updates.length === 0) {
    res.json(existing);
    return;
  }

  values.push(req.params.id);
  db.prepare(`UPDATE debt_templates SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare('SELECT * FROM debt_templates WHERE id = ?').get(req.params.id) as DebtTemplate;
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const db = getDb();

  const existing = db.prepare('SELECT * FROM debt_templates WHERE id = ?').get(req.params.id) as DebtTemplate | undefined;
  if (!existing) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Debt template not found' },
    });
    return;
  }

  db.prepare('UPDATE debt_templates SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;