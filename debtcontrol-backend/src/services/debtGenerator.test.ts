import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';

import { createDatabase, setDb, closeDb } from '../db/index.js';
import {
  generateInstancesForPeriod,
  markOverdueInstances,
  calculateDueDate,
  getPeriodLabel,
  TemplateWithInstance
} from './debtGenerator.js';

const dbPath = ':memory:';
let db: Database.Database & ReturnType<typeof createDatabase>;

const categories = [
  { id: 'cat-1', name: 'Utilities', icon: 'zap', color: '#F59E0B' },
  { id: 'cat-2', name: 'Subscriptions', icon: 'repeat', color: '#8B5CF6' },
  { id: 'cat-3', name: 'Loans', icon: 'landmark', color: '#EF4444' },
  { id: 'cat-4', name: 'Rent', icon: 'home', color: '#10B981' },
  { id: 'cat-5', name: 'Other', icon: 'credit-card', color: '#6366F1' },
];

const bankAccounts = [
  { id: 'bank-1', name: 'Checking', color: '#2563EB' },
  { id: 'bank-2', name: 'Savings', color: '#10B981' },
];

beforeAll(() => {
  db = createDatabase(dbPath) as Database.Database & ReturnType<typeof createDatabase>;
  db.runMigrations();

  for (const cat of categories) {
    db.prepare('INSERT INTO categories (id, name, icon, color) VALUES (?, ?, ?, ?)').run(cat.id, cat.name, cat.icon, cat.color);
  }

  for (const bank of bankAccounts) {
    db.prepare('INSERT INTO bank_accounts (id, name, color) VALUES (?, ?, ?)').run(bank.id, bank.name, bank.color);
  }

  setDb(db as ReturnType<typeof createDatabase>);
});

afterAll(() => {
  closeDb();
});

describe('debtGenerator', () => {
  describe('generateInstancesForPeriod', () => {
    it('creates instance for active template', () => {
      db.prepare(`
        INSERT INTO debt_templates (id, name, amount, frequency, due_day, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('tmpl-1', 'Internet', 50, 'monthly', 15, 1, new Date().toISOString());

      const result = generateInstancesForPeriod(new Date());

      expect(result.generated).toBe(1);
      expect(result.errors).toHaveLength(0);

      const instance = db.prepare('SELECT * FROM debt_instances WHERE template_id = ?').get('tmpl-1') as {
        template_id: string;
        amount_due: number;
        status: string;
      } | undefined;
      expect(instance).toBeDefined();
      expect(instance!.amount_due).toBe(50);
      expect(instance!.status).toBe('pending');
    });

    it('does not create duplicate for same period', () => {
      db.prepare(`
        INSERT INTO debt_templates (id, name, amount, frequency, due_day, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('tmpl-2', 'Rent', 1000, 'monthly', 1, 1, new Date().toISOString());

      const periodDate = new Date(2026, 4, 1);
      const result1 = generateInstancesForPeriod(periodDate);
      const result2 = generateInstancesForPeriod(periodDate);

      expect(result1.generated).toBe(1);
      expect(result2.generated).toBe(0);

      const instances = db.prepare('SELECT * FROM debt_instances WHERE template_id = ?').all('tmpl-2');
      expect(instances).toHaveLength(1);
    });

    it('skips inactive templates', () => {
      db.prepare(`
        INSERT INTO debt_templates (id, name, amount, frequency, due_day, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('tmpl-3', 'Inactive', 100, 'monthly', 5, 0, new Date().toISOString());

      const result = generateInstancesForPeriod(new Date());

      expect(result.generated).toBe(0);

      const instance = db.prepare('SELECT * FROM debt_instances WHERE template_id = ?').get('tmpl-3');
      expect(instance).toBeUndefined();
    });
  });

  describe('calculateDueDate', () => {
    it('calculates correct day for monthly frequency', () => {
      const template: TemplateWithInstance = {
        id: 'tmpl-m',
        name: 'Monthly',
        amount: 50,
        frequency: 'monthly',
        due_day: 20,
        due_weekday: null,
        is_active: 1,
      };

      const periodStart = new Date(2026, 4, 1);
      const dueDate = calculateDueDate(template, periodStart);

      expect(dueDate.getDate()).toBe(20);
      expect(dueDate.getMonth()).toBe(4);
    });

    it('calculates next weekday for weekly frequency', () => {
      const template: TemplateWithInstance = {
        id: 'tmpl-w',
        name: 'Weekly',
        amount: 30,
        frequency: 'weekly',
        due_day: null,
        due_weekday: 5,
        is_active: 1,
      };

      const periodStart = new Date();
      const dueDate = calculateDueDate(template, periodStart);
      const dayOfWeek = dueDate.getDay();

      expect(dayOfWeek).toBe(5);
    });

    it('uses correct month for annual frequency', () => {
      const template: TemplateWithInstance = {
        id: 'tmpl-a',
        name: 'Annual',
        amount: 500,
        frequency: 'annual',
        due_day: 15,
        due_weekday: null,
        is_active: 1,
      };

      const periodStart = new Date(2026, 5, 1);
      const dueDate = calculateDueDate(template, periodStart);

      expect(dueDate.getMonth()).toBe(5);
      expect(dueDate.getDate()).toBe(15);
    });
  });

  describe('markOverdueInstances', () => {
    it('marks overdue instances as overdue', () => {
      db.prepare(`
        INSERT INTO debt_templates (id, name, amount, frequency, due_day, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('tmpl-ov-1', 'OverdueTest', 100, 'monthly', 1, 1, new Date().toISOString());

      db.prepare(`
        INSERT INTO debt_instances (id, template_id, period_label, amount_due, amount_paid, due_date, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('inst-ov-1', 'tmpl-ov-1', 'May 2026', 100, 0, '2026-04-01', 'pending', new Date().toISOString());

      const marked = markOverdueInstances();

      expect(marked).toBe(1);

      const instance = db.prepare('SELECT status FROM debt_instances WHERE id = ?').get('inst-ov-1') as { status: string };
      expect(instance.status).toBe('overdue');
    });

    it('does not mark paid instances as overdue', () => {
      db.prepare(`
        INSERT INTO debt_templates (id, name, amount, frequency, due_day, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('tmpl-ov-2', 'PaidTest', 100, 'monthly', 1, 1, new Date().toISOString());

      db.prepare(`
        INSERT INTO debt_instances (id, template_id, period_label, amount_due, amount_paid, due_date, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('inst-ov-2', 'tmpl-ov-2', 'June 2026', 100, 100, '2026-04-01', 'paid', new Date().toISOString());

      const marked = markOverdueInstances();

      expect(marked).toBe(0);

      const instance = db.prepare('SELECT status FROM debt_instances WHERE id = ?').get('inst-ov-2') as { status: string };
      expect(instance.status).toBe('paid');
    });
  });
});