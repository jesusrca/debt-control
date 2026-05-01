import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import 'express-async-errors';

import { getDb } from './db/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { logRequest } from './middleware/requestLogger.js';
import { aiRateLimiter } from './middleware/rateLimiter.js';
import { authMiddleware } from './middleware/auth.js';
import { runOnStartup, setupMonthlyGenerator } from './cron/monthlyGenerator.js';

import debtTemplatesRouter from './routes/debtTemplates.js';
import debtInstancesRouter from './routes/debtInstances.js';
import transactionsRouter from './routes/transactions.js';
import bankAccountsRouter from './routes/bankAccounts.js';
import categoriesRouter from './routes/categories.js';
import settingsRouter from './routes/settings.js';
import dashboardRouter from './routes/dashboard.js';
import analyticsRouter from './routes/analytics.js';
import aiRouter from './routes/ai.js';
import uploadsRouter from './routes/uploads.js';
import debtGeneratorRouter from './routes/debtGenerator.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());

app.use((req: Request, _res: Response, next: NextFunction) => {
  const start = Date.now();
  _res.on('finish', () => {
    logRequest(req.method, req.path, _res.statusCode, Date.now() - start);
  });
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/api/db-check', (_req, res) => {
  const db = getDb();
  const categories = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  const bankAccounts = db.prepare('SELECT COUNT(*) as count FROM bank_accounts').get() as { count: number };
  res.json({ categories: categories.count, bankAccounts: bankAccounts.count });
});

app.use('/api/debt-templates', authMiddleware, debtTemplatesRouter);
app.use('/api/debt-instances', authMiddleware, debtInstancesRouter);
app.use('/api/transactions', authMiddleware, transactionsRouter);
app.use('/api/bank-accounts', authMiddleware, bankAccountsRouter);
app.use('/api/categories', authMiddleware, categoriesRouter);
app.use('/api/settings', authMiddleware, settingsRouter);
app.use('/api/dashboard', authMiddleware, dashboardRouter);
app.use('/api/analytics', authMiddleware, analyticsRouter);

app.use('/api/ai', (req: Request, res: Response, next: NextFunction) => {
  const result = aiRateLimiter({
    ip: req.ip,
    connection: req.connection,
    headers: req.headers as { [key: string]: string },
  });
  res.setHeader('X-RateLimit-Limit', '10');
  res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
  res.setHeader('X-RateLimit-Reset', Math.floor(result.resetIn / 1000).toString());

  if (!result.allowed) {
    res.setHeader('Retry-After', Math.ceil(result.resetIn / 1000).toString());
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please wait before trying again.',
        details: { retry_after_ms: result.resetIn },
      },
    });
    return;
  }
  next();
}, aiRouter);

app.use('/api/uploads', authMiddleware, uploadsRouter);
app.use('/api/debt-generator', authMiddleware, debtGeneratorRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`DebtControl API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);

  runOnStartup();
  setupMonthlyGenerator();
});

export default app;