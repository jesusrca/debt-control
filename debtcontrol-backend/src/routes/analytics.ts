import { Router } from 'express';
import { getDb } from '../db/index.js';
import { subMonths, format } from 'date-fns';

const router = Router();

router.get('/', (_req, res) => {
  const db = getDb();

  // Get date range for last 6 months
  const endDate = new Date();
  const startDate = subMonths(endDate, 5);
  const startMonthStr = format(startDate, 'yyyy-MM');
  const endMonthStr = format(endDate, 'yyyy-MM');

  // Single query for all monthly spending
  const monthlyResults = db.prepare(`
    SELECT strftime('%Y-%m', date) as month, COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE date >= ? AND date <= ?
    GROUP BY strftime('%Y-%m', date)
  `).all(startMonthStr + '-01', endMonthStr + '-31') as { month: string; total: number }[];

  // Build complete 6-month array with all months present
  const monthlyMap = new Map(monthlyResults.map(r => [r.month, r.total]));
  const monthlySpending: { month: string; amount: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    const monthStr = format(date, 'yyyy-MM');
    monthlySpending.push({
      month: format(date, 'MMM yyyy'),
      amount: monthlyMap.get(monthStr) ?? 0,
    });
  }

  const categoryDistribution = db.prepare(`
    SELECT c.name as category, c.color, COALESCE(SUM(di.amount_due), 0) as amount
    FROM categories c
    LEFT JOIN debt_templates dt ON dt.category_id = c.id
    LEFT JOIN debt_instances di ON di.template_id = dt.id AND di.status != 'paid'
    GROUP BY c.id
    HAVING amount > 0
  `).all() as { category: string; color: string; amount: number }[];

  const pendingDebts = db.prepare(`
    SELECT * FROM debt_instances WHERE status != 'paid'
  `).all() as { amount_due: number; amount_paid: number }[];

  const totalPending = pendingDebts.reduce((sum, d) => sum + (d.amount_due - d.amount_paid), 0);

  const paymentHistory: number[] = [];
  for (let i = 2; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    const monthStr = format(date, 'yyyy-MM');
    const result = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE date LIKE ?
    `).get(monthStr + '%') as { total: number };
    paymentHistory.push(result.total);
  }

  let debtProjection: {
    type: 'projected' | 'increasing' | 'no_data' | 'no_history';
    projectedDate?: string;
    monthsUntilFree?: number;
    totalPending?: number;
    avgMonthlyPayment?: number;
    message: string;
  };

  const avgMonthlyPayment = paymentHistory.length >= 3
    ? paymentHistory.reduce((a, b) => a + b, 0) / 3
    : 0;

  if (avgMonthlyPayment === 0) {
    debtProjection = {
      type: 'no_history',
      totalPending,
      message: 'No payment history available. Make payments to see projection.',
    };
  } else if (totalPending === 0) {
    debtProjection = {
      type: 'projected',
      projectedDate: new Date().toISOString().split('T')[0],
      monthsUntilFree: 0,
      totalPending,
      avgMonthlyPayment,
      message: 'You are debt-free!',
    };
  } else if (avgMonthlyPayment > 0 && totalPending / avgMonthlyPayment < 0) {
    debtProjection = {
      type: 'increasing',
      totalPending,
      avgMonthlyPayment,
      message: 'Your debt is increasing. Consider making extra payments.',
    };
  } else {
    const monthsUntilFree = Math.ceil(totalPending / avgMonthlyPayment);
    const projectedDate = new Date();
    projectedDate.setMonth(projectedDate.getMonth() + monthsUntilFree);
    debtProjection = {
      type: 'projected',
      projectedDate: projectedDate.toISOString().split('T')[0],
      monthsUntilFree,
      totalPending,
      avgMonthlyPayment,
      message: `Based on your last 3 months of payments`,
    };
  }

  const interestPaid = db.prepare(`
    SELECT COALESCE(SUM(dt.interest_rate * dt.amount / 100), 0) as total
    FROM debt_instances di
    JOIN debt_templates dt ON di.template_id = dt.id
    WHERE di.status = 'paid'
  `).get() as { total: number };

  res.json({
    monthlySpending,
    categoryDistribution,
    debtProjection,
    interestPaid: interestPaid.total,
  });
});

export default router;