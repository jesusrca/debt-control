import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createDatabase, setDb, closeDb } from '../db/index.js';
import { matchTransactionToDebt } from './aiService.js';

vi.mock('pdf2pic', () => ({
  fromPath: vi.fn(),
}));

vi.mock('@anthropic-ai/sdk', () => {
  const mockMessages = {
    create: vi.fn(),
  };
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: mockMessages,
    })),
  };
});

describe('Upload Service - createUploadTransaction', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
    db.runMigrations();
    setDb(db);
  });

  afterEach(() => {
    closeDb();
  });

  it('creates upload_transactions record', async () => {
    const { createUploadTransaction } = await import('./uploadService.js');
    const uploadId = 'test-upload-id';
    db.prepare('INSERT INTO uploads (id, filename, original_name, file_type, file_path, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(uploadId, 'test.pdf', 'test.pdf', 'pdf', '/uploads/test.pdf', 'pending', new Date().toISOString());

    const result = createUploadTransaction(uploadId, {
      rawText: '{"date": "2026-05-01"}',
      extractedDate: '2026-05-01',
      extractedDescription: 'Test transaction',
      extractedAmount: 150.00,
      extractedType: 'debit',
      aiConfidence: 90,
    });

    expect(result).toBeDefined();
    expect((result as { extracted_description?: string }).extracted_description).toBe('Test transaction');
    expect((result as { extracted_amount?: number }).extracted_amount).toBe(150.00);
    expect((result as { extracted_type?: string }).extracted_type).toBe('debit');
  });

  it('handles null optional fields', async () => {
    const { createUploadTransaction } = await import('./uploadService.js');
    const uploadId = 'test-upload-id';
    db.prepare('INSERT INTO uploads (id, filename, original_name, file_type, file_path, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(uploadId, 'test.pdf', 'test.pdf', 'pdf', '/uploads/test.pdf', 'pending', new Date().toISOString());

    const result = createUploadTransaction(uploadId, {
      rawText: null,
      extractedDate: null,
      extractedDescription: null,
      extractedAmount: null,
      extractedType: null,
      aiConfidence: null,
    });

    expect(result).toBeDefined();
  });

  it('creates multiple transactions for same upload', async () => {
    const { createUploadTransaction } = await import('./uploadService.js');
    const uploadId = 'test-upload-id';
    db.prepare('INSERT INTO uploads (id, filename, original_name, file_type, file_path, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(uploadId, 'test.pdf', 'test.pdf', 'pdf', '/uploads/test.pdf', 'pending', new Date().toISOString());

    createUploadTransaction(uploadId, {
      extractedDate: '2026-05-01',
      extractedDescription: 'Transaction 1',
      extractedAmount: 100,
      extractedType: 'debit',
    });

    createUploadTransaction(uploadId, {
      extractedDate: '2026-05-02',
      extractedDescription: 'Transaction 2',
      extractedAmount: 200,
      extractedType: 'debit',
    });

    const transactions = db.prepare('SELECT * FROM upload_transactions WHERE upload_id = ?').all(uploadId);
    expect(transactions).toHaveLength(2);
  });
});

describe('Document Analyzer - parseTransactionsFromResponse', () => {
  it('parses valid JSON array of transactions', async () => {
    const { parseTransactionsFromResponse } = await import('./documentAnalyzer.js');
    const response = '[{"date": "2026-05-01", "description": "Netflix subscription", "amount": 15.99, "type": "debit"}]';
    const result = parseTransactionsFromResponse(response);

    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-05-01');
    expect(result[0].description).toBe('Netflix subscription');
    expect(result[0].amount).toBe(15.99);
    expect(result[0].type).toBe('debit');
    expect(result[0].confidence).toBe(85);
  });

  it('parses transactions with date as ISO string', async () => {
    const { parseTransactionsFromResponse } = await import('./documentAnalyzer.js');
    const response = '[{"date": "2026-05-15", "description": "Electric bill", "amount": 120.50, "type": "debit"}]';
    const result = parseTransactionsFromResponse(response);

    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-05-15');
    expect(result[0].amount).toBe(120.50);
  });

  it('handles negative amounts as credits', async () => {
    const { parseTransactionsFromResponse } = await import('./documentAnalyzer.js');
    const response = '[{"date": "2026-05-01", "description": "Salary deposit", "amount": -5000, "type": "credit"}]';
    const result = parseTransactionsFromResponse(response);

    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(5000);
    expect(result[0].type).toBe('credit');
  });

  it('handles JSON wrapped in markdown code blocks', async () => {
    const { parseTransactionsFromResponse } = await import('./documentAnalyzer.js');
    const response = 'Here is the data:\n```json\n[{"date": "2026-05-01", "description": "Test", "amount": 100, "type": "debit"}]\n```\nDone.';
    const result = parseTransactionsFromResponse(response);

    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('Test');
  });

  it('handles JSON with extra text before/after', async () => {
    const { parseTransactionsFromResponse } = await import('./documentAnalyzer.js');
    const response = 'Some text before [{"date": "2026-05-01", "description": "Test", "amount": 50, "type": "debit"}] some text after';
    const result = parseTransactionsFromResponse(response);

    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('Test');
  });

  it('returns empty array for invalid JSON', async () => {
    const { parseTransactionsFromResponse } = await import('./documentAnalyzer.js');
    const response = 'not valid json at all';
    const result = parseTransactionsFromResponse(response);

    expect(result).toHaveLength(0);
  });

  it('handles multiple transactions', async () => {
    const { parseTransactionsFromResponse } = await import('./documentAnalyzer.js');
    const response = '[{"date": "2026-05-01", "description": "First", "amount": 100, "type": "debit"}, {"date": "2026-05-02", "description": "Second", "amount": 200, "type": "credit"}]';
    const result = parseTransactionsFromResponse(response);

    expect(result).toHaveLength(2);
    expect(result[0].description).toBe('First');
    expect(result[1].description).toBe('Second');
  });

  it('uses default date when date is missing', async () => {
    const { parseTransactionsFromResponse } = await import('./documentAnalyzer.js');
    const response = '[{"description": "Test", "amount": 100, "type": "debit"}]';
    const result = parseTransactionsFromResponse(response);

    expect(result).toHaveLength(1);
    expect(result[0].date).toBe(new Date().toISOString().split('T')[0]);
  });

  it('uses "Unknown" when description is missing', async () => {
    const { parseTransactionsFromResponse } = await import('./documentAnalyzer.js');
    const response = '[{"date": "2026-05-01", "amount": 100, "type": "debit"}]';
    const result = parseTransactionsFromResponse(response);

    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('Unknown');
  });

  it('stores raw_text as JSON string', async () => {
    const { parseTransactionsFromResponse } = await import('./documentAnalyzer.js');
    const response = '[{"date": "2026-05-01", "description": "Test", "amount": 100, "type": "debit"}]';
    const result = parseTransactionsFromResponse(response);

    expect(result[0].raw_text).toBe('{"date":"2026-05-01","description":"Test","amount":100,"type":"debit"}');
  });
});

describe('AI Service - matchTransactionToDebt', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
    db.runMigrations();
    setDb(db);
  });

  afterEach(() => {
    closeDb();
  });

  it('returns null when no pending debts exist', async () => {
    const result = await matchTransactionToDebt('Internet Bill', 50, '2026-09-15');
    expect(result).toBeNull();
  });

  it('matches exact name and amount', async () => {
    db.prepare(`
      INSERT INTO debt_templates (id, name, amount, frequency, due_day, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('tpl-1', 'Internet Bill', 50, 'monthly', 15, new Date().toISOString());

    db.prepare(`
      INSERT INTO debt_instances (id, template_id, period_label, amount_due, amount_paid, due_date, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('inst-1', 'tpl-1', 'September 2026', 50, 0, '2026-09-15', 'pending', new Date().toISOString());

    const result = await matchTransactionToDebt('Internet Bill', 50, '2026-09-15');

    expect(result).not.toBeNull();
    expect(result?.debtInstanceId).toBe('inst-1');
    expect(result?.debtName).toBe('Internet Bill');
    expect(result?.confidence).toBeGreaterThanOrEqual(40);
  });

  it('matches partial name', async () => {
    db.prepare(`
      INSERT INTO debt_templates (id, name, amount, frequency, due_day, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('tpl-2', 'Comcast Internet', 80, 'monthly', 20, new Date().toISOString());

    db.prepare(`
      INSERT INTO debt_instances (id, template_id, period_label, amount_due, amount_paid, due_date, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('inst-2', 'tpl-2', 'September 2026', 80, 0, '2026-09-20', 'pending', new Date().toISOString());

    const result = await matchTransactionToDebt('Internet Bill Payment', 80, '2026-09-20');

    expect(result).not.toBeNull();
    expect(result?.debtInstanceId).toBe('inst-2');
  });

  it('returns null when confidence is below threshold', async () => {
    db.prepare(`
      INSERT INTO debt_templates (id, name, amount, frequency, due_day, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('tpl-3', 'Very Expensive Service', 500, 'monthly', 1, new Date().toISOString());

    db.prepare(`
      INSERT INTO debt_instances (id, template_id, period_label, amount_due, amount_paid, due_date, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('inst-3', 'tpl-3', 'September 2026', 500, 0, '2026-09-01', 'pending', new Date().toISOString());

    const result = await matchTransactionToDebt('Coffee', 5, '2026-09-01');

    expect(result).toBeNull();
  });

  it('prefers higher confidence match', async () => {
    db.prepare(`
      INSERT INTO debt_templates (id, name, amount, frequency, due_day, created_at)
      VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)
    `).run('tpl-4', 'Netflix', 15, 'monthly', 1, new Date().toISOString(), 'tpl-5', 'Internet Bill', 80, 'monthly', 15, new Date().toISOString());

    db.prepare(`
      INSERT INTO debt_instances (id, template_id, period_label, amount_due, amount_paid, due_date, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('inst-4', 'tpl-4', 'September 2026', 15, 0, '2026-09-01', 'pending', new Date().toISOString(), 'inst-5', 'tpl-5', 'September 2026', 80, 0, '2026-09-15', 'pending', new Date().toISOString());

    const result = await matchTransactionToDebt('Netflix subscription', 15, '2026-09-01');

    expect(result).not.toBeNull();
    expect(result?.debtInstanceId).toBe('inst-4');
  });

  it('uses date scoring when transaction date is near due date', async () => {
    db.prepare(`
      INSERT INTO debt_templates (id, name, amount, frequency, due_day, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('tpl-6', 'Electric Bill', 100, 'monthly', 15, new Date().toISOString());

    db.prepare(`
      INSERT INTO debt_instances (id, template_id, period_label, amount_due, amount_paid, due_date, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('inst-6', 'tpl-6', 'September 2026', 100, 0, '2026-09-15', 'pending', new Date().toISOString());

    const result = await matchTransactionToDebt('Electric', 100, '2026-09-17');

    expect(result).not.toBeNull();
    expect(result?.debtInstanceId).toBe('inst-6');
  });
});