import { Router } from 'express';
import { getDb } from '../db/index.js';
import { chatWithAI, generateMonthlyReport, matchTransactionToDebt } from '../services/aiService.js';
import { aiChatSchema } from '../schemas.js';

const router = Router();

router.post('/chat', async (req, res) => {
  const data = aiChatSchema.parse(req.body);
  const db = getDb();

  const recentDebts = db.prepare(`
    SELECT dt.name, di.amount_due - di.amount_paid as amount, di.status
    FROM debt_instances di
    JOIN debt_templates dt ON di.template_id = dt.id
    WHERE di.status != 'paid'
    ORDER BY di.due_date ASC
    LIMIT 10
  `).all();

  const recentTransactions = db.prepare(`
    SELECT t.date, t.amount, t.notes, ba.name as bank_name
    FROM transactions t
    LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id
    ORDER BY t.date DESC
    LIMIT 10
  `).all();

  const context = {
    debts: recentDebts,
    recentTransactions,
  };

  const reply = await chatWithAI(data.message, context);
  res.json({ reply });
});

router.post('/analyze', async (_req, res) => {
  const report = await generateMonthlyReport();
  res.json({ report });
});

router.post('/match', async (req, res) => {
  const { description, amount, date } = req.body;

  if (!description || amount === undefined) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'description and amount are required',
      },
    });
    return;
  }

  const match = await matchTransactionToDebt(description, amount, date);

  if (!match) {
    res.json({ match: null, message: 'No matching debt found' });
    return;
  }

  res.json({
    match: {
      debt_instance_id: match.debtInstanceId,
      debt_name: match.debtName,
      confidence: match.confidence,
      reason: match.reason,
    },
  });
});

export default router;