import { Router } from 'express';
import { generateAndMarkOverdue, generateInstancesForPeriod } from '../services/debtGenerator.js';

const router = Router();

router.post('/generate', (_req, res) => {
  const result = generateInstancesForPeriod();

  res.json({
    message: 'Generation complete',
    generated: result.generated,
    errors: result.errors,
  });
});

router.post('/generate-and-overdue', (_req, res) => {
  const result = generateAndMarkOverdue();

  res.json({
    message: 'Generation and overdue marking complete',
    generated: result.generated,
    marked_overdue: result.marked,
    errors: result.errors,
  });
});

export default router;