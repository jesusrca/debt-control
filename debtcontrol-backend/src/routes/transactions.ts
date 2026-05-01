import { Router } from 'express';
import { getDb } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { createTransactionSchema } from '../schemas.js';
import type { Transaction } from '../types.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { bank_id, month, search, limit = '50', offset = '0' } = req.query;

  let query = `
    SELECT t.*, ba.name as bank_name, ba.color as bank_color,
           di.period_label as debt_period, dt.name as debt_name
    FROM transactions t
    LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id
    LEFT JOIN debt_instances di ON t.debt_instance_id = di.id
    LEFT JOIN debt_templates dt ON di.template_id = dt.id
    WHERE 1=1
  `;

  const params: unknown[] = [];

  if (bank_id) {
    query += ' AND t.bank_account_id = ?';
    params.push(bank_id);
  }

  if (month) {
    query += ' AND t.date LIKE ?';
    params.push(`${month}%`);
  }

  if (search) {
    query += ' AND (t.notes LIKE ? OR dt.name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY t.date DESC, t.created_at DESC';
  query += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit as string, 10), parseInt(offset as string, 10));

  const transactions = db.prepare(query).all(...params);
  res.json(transactions);
});

router.post('/', (req, res) => {
  const data = createTransactionSchema.parse(req.body);
  const db = getDb();

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO transactions (id, debt_instance_id, amount, date, bank_account_id, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.debt_instance_id ?? null,
    data.amount,
    data.date,
    data.bank_account_id ?? null,
    data.notes ?? null,
    now
  );

  if (data.debt_instance_id) {
    const instance = db.prepare('SELECT * FROM debt_instances WHERE id = ?').get(data.debt_instance_id) as { amount_due: number; amount_paid: number; status: string } | undefined;
    if (instance) {
      const newAmountPaid = instance.amount_paid + data.amount;
      const newStatus = newAmountPaid >= instance.amount_due ? 'paid' : 'pending';
      const paidAt = newStatus === 'paid' ? now : null;

      db.prepare(`
        UPDATE debt_instances
        SET amount_paid = ?, status = ?, paid_at = ?
        WHERE id = ?
      `).run(newAmountPaid, newStatus, paidAt, data.debt_instance_id);
    }
  }

  const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Transaction;
  res.status(201).json(transaction);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const transaction = db.prepare(`
    SELECT t.*, ba.name as bank_name, ba.color as bank_color,
           di.period_label as debt_period, dt.name as debt_name
    FROM transactions t
    LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id
    LEFT JOIN debt_instances di ON t.debt_instance_id = di.id
    LEFT JOIN debt_templates dt ON di.template_id = dt.id
    WHERE t.id = ?
  `).get(req.params.id) as Transaction | undefined;

  if (!transaction) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Transaction not found' },
    });
    return;
  }

  res.json(transaction);
});

router.delete('/:id', (req, res) => {
  const db = getDb();

  const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id) as Transaction | undefined;
  if (!transaction) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Transaction not found' },
    });
    return;
  }

  if (transaction.debt_instance_id) {
    const instance = db.prepare('SELECT * FROM debt_instances WHERE id = ?').get(transaction.debt_instance_id) as { amount_due: number; amount_paid: number } | undefined;
    if (instance) {
      const newAmountPaid = Math.max(0, instance.amount_paid - transaction.amount);
      const newStatus = newAmountPaid >= instance.amount_due ? 'paid' : 'pending';

      db.prepare(`
        UPDATE debt_instances
        SET amount_paid = ?, status = ?, paid_at = NULL
        WHERE id = ?
      `).run(newAmountPaid, newStatus, transaction.debt_instance_id);
    }
  }

  db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;