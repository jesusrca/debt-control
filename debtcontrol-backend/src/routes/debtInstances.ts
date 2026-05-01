import { Router } from 'express';
import { getDb } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { payDebtInstanceSchema, updateDebtInstanceSchema } from '../schemas.js';
import type { DebtInstance } from '../types.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { period, status, include_completed } = req.query;

  let query = `
    SELECT di.*, dt.name as debt_name, dt.category_id, dt.bank_account_id,
           c.name as category_name, c.color as category_color,
           ba.name as bank_name, ba.color as bank_color
    FROM debt_instances di
    JOIN debt_templates dt ON di.template_id = dt.id
    LEFT JOIN categories c ON dt.category_id = c.id
    LEFT JOIN bank_accounts ba ON dt.bank_account_id = ba.id
    WHERE 1=1
  `;

  const params: unknown[] = [];

  if (status && status !== 'all') {
    query += ' AND di.status = ?';
    params.push(status);
  }

  if (include_completed === 'false' || include_completed === '0') {
    query += ' AND di.status != "paid"';
  }

  if (period) {
    query += ' AND di.period_label = ?';
    params.push(period);
  }

  query += ' ORDER BY di.due_date ASC';

  const instances = db.prepare(query).all(...params);
  res.json(instances);
});

router.post('/', (req, res) => {
  const db = getDb();
  const { template_id, period_label, amount_due, due_date } = req.body;

  if (!template_id || !period_label || !amount_due || !due_date) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' },
    });
    return;
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO debt_instances (id, template_id, period_label, amount_due, amount_paid, due_date, status, created_at)
    VALUES (?, ?, ?, ?, 0, ?, 'pending', ?)
  `).run(id, template_id, period_label, amount_due, due_date, now);

  const instance = db.prepare('SELECT * FROM debt_instances WHERE id = ?').get(id) as DebtInstance;
  res.status(201).json(instance);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const instance = db.prepare(`
    SELECT di.*, dt.name as debt_name, dt.category_id, dt.bank_account_id,
           c.name as category_name, c.color as category_color,
           ba.name as bank_name, ba.color as bank_color
    FROM debt_instances di
    JOIN debt_templates dt ON di.template_id = dt.id
    LEFT JOIN categories c ON dt.category_id = c.id
    LEFT JOIN bank_accounts ba ON dt.bank_account_id = ba.id
    WHERE di.id = ?
  `).get(req.params.id) as (DebtInstance & { debt_name: string }) | undefined;

  if (!instance) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Debt instance not found' },
    });
    return;
  }

  res.json(instance);
});

router.patch('/:id', (req, res) => {
  const data = updateDebtInstanceSchema.parse(req.body);
  const db = getDb();

  const existing = db.prepare('SELECT * FROM debt_instances WHERE id = ?').get(req.params.id) as DebtInstance | undefined;
  if (!existing) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Debt instance not found' },
    });
    return;
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.status !== undefined) {
    updates.push('status = ?');
    values.push(data.status);
  }
  if (data.amount_paid !== undefined) {
    updates.push('amount_paid = ?');
    values.push(data.amount_paid);
  }
  if (data.paid_at !== undefined) {
    updates.push('paid_at = ?');
    values.push(data.paid_at);
  }

  if (updates.length === 0) {
    res.json(existing);
    return;
  }

  values.push(req.params.id);
  db.prepare(`UPDATE debt_instances SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare('SELECT * FROM debt_instances WHERE id = ?').get(req.params.id) as DebtInstance;
  res.json(updated);
});

router.post('/:id/pay', (req, res) => {
  const data = payDebtInstanceSchema.parse(req.body);
  const db = getDb();

  const instance = db.prepare(`
    SELECT di.*, dt.name as debt_name
    FROM debt_instances di
    JOIN debt_templates dt ON di.template_id = dt.id
    WHERE di.id = ?
  `).get(req.params.id) as (DebtInstance & { debt_name: string }) | undefined;

  if (!instance) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Debt instance not found' },
    });
    return;
  }

  const remaining = instance.amount_due - instance.amount_paid;
  if (data.amount > remaining) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Payment exceeds remaining balance',
        details: { remaining },
      },
    });
    return;
  }

  const transactionId = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO transactions (id, debt_instance_id, amount, date, bank_account_id, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    transactionId,
    instance.id,
    data.amount,
    now.split('T')[0],
    data.bank_account_id ?? null,
    data.notes ?? null,
    now
  );

  const newAmountPaid = instance.amount_paid + data.amount;
  const newStatus = newAmountPaid >= instance.amount_due ? 'paid' : 'pending';
  const paidAt = newStatus === 'paid' ? now : null;

  db.prepare(`
    UPDATE debt_instances
    SET amount_paid = ?, status = ?, paid_at = ?
    WHERE id = ?
  `).run(newAmountPaid, newStatus, paidAt, instance.id);

  const updated = db.prepare('SELECT * FROM debt_instances WHERE id = ?').get(instance.id) as DebtInstance;
  const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(transactionId);

  res.json({ instance: updated, transaction });
});

router.post('/:id/mark-paid', (req, res) => {
  const db = getDb();

  const instance = db.prepare('SELECT * FROM debt_instances WHERE id = ?').get(req.params.id) as DebtInstance | undefined;
  if (!instance) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Debt instance not found' },
    });
    return;
  }

  const now = new Date().toISOString();
  const amountToPay = instance.amount_due - instance.amount_paid;

  // Create transaction record for audit trail
  const transactionId = uuidv4();
  db.prepare(`
    INSERT INTO transactions (id, debt_instance_id, amount, date, bank_account_id, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    transactionId,
    instance.id,
    amountToPay,
    now.split('T')[0],
    null,
    'Marked as paid',
    now
  );

  db.prepare(`
    UPDATE debt_instances
    SET status = 'paid', paid_at = ?, amount_paid = amount_due
    WHERE id = ?
  `).run(now, instance.id);

  const updated = db.prepare('SELECT * FROM debt_instances WHERE id = ?').get(instance.id) as DebtInstance;
  const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(transactionId);

  res.json({ instance: updated, transaction });
});

export default router;