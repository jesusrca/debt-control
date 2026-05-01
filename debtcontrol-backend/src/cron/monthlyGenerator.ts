import cron from 'node-cron';
import { generateAndMarkOverdue } from '../services/debtGenerator.js';

export function setupMonthlyGenerator(): void {
  console.log('Setting up monthly debt generator cron...');

  cron.schedule('0 0 * * *', () => {
    console.log('[CRON] Running daily debt generation check...');
    const now = new Date();

    if (now.getDate() === 1) {
      console.log('[CRON] First day of month - generating instances for new period');
      const result = generateAndMarkOverdue();
      console.log(`[CRON] Generated ${result.generated} instances, marked ${result.marked} as overdue`);
      if (result.errors.length > 0) {
        console.error('[CRON] Errors:', result.errors);
      }
    } else {
      const marked = require('../services/debtGenerator.js').markOverdueInstances();
      console.log(`[CRON] Marked ${marked} instances as overdue`);
    }
  });

  console.log('Daily cron scheduled (midnight UTC)');
}

export function runOnStartup(): void {
  console.log('[STARTUP] Running initial debt generation...');
  const result = generateAndMarkOverdue();
  console.log(`[STARTUP] Generated ${result.generated} instances, marked ${result.marked} as overdue`);
  if (result.errors.length > 0) {
    console.error('[STARTUP] Errors:', result.errors);
  }
}