import { Router } from 'express';
import { getDb } from '../db/index.js';

const router = Router();

router.get('/', (_req, res) => {
  const db = getDb();

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const totalDebt = db.prepare(`
    SELECT COALESCE(SUM(amount_due - amount_paid), 0) as total
    FROM debt_instances
    WHERE status != 'paid'
  `).get() as { total: number };

  const totalPaid = db.prepare(`
    SELECT COALESCE(SUM(amount_paid), 0) as total
    FROM debt_instances
  `).get() as { total: number };

  const monthlySpend = db.prepare(`
    SELECT COALESCE(SUM(t.amount), 0) as total
    FROM transactions t
    WHERE t.date LIKE ?
  `).get(currentMonth + '%') as { total: number };

  const nextPayment = db.prepare(`
    SELECT di.due_date, dt.name, di.amount_due - di.amount_paid as amount
    FROM debt_instances di
    JOIN debt_templates dt ON di.template_id = dt.id
    WHERE di.status = 'pending'
    ORDER BY di.due_date ASC
    LIMIT 1
  `).get() as { due_date: string; name: string; amount: number } | undefined;

  const upcomingDebts = db.prepare(`
    SELECT di.*, dt.name, c.color as category_color
    FROM debt_instances di
    JOIN debt_templates dt ON di.template_id = dt.id
    LEFT JOIN categories c ON dt.category_id = c.id
    WHERE di.status = 'pending'
    ORDER BY di.due_date ASC
    LIMIT 5
  `).all();

  const recentTransactions = db.prepare(`
    SELECT t.*, ba.name as bank_name, ba.color as bank_color
    FROM transactions t
    LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT 5
  `).all();

  res.json({
    totalDebt: totalDebt.total,
    totalPaid: totalPaid.total,
    monthlySpend: monthlySpend.total,
    nextPayment: nextPayment || null,
    upcomingDebts,
    recentTransactions,
  });
});

export default router;