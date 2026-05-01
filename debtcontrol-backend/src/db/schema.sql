-- DebtControl Database Schema
-- Version: 1.0

-- Categories of debt
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'credit-card',
  color TEXT DEFAULT '#6366F1',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Bank accounts (source of transactions)
CREATE TABLE IF NOT EXISTS bank_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366F1',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Recurring debt templates
CREATE TABLE IF NOT EXISTS debt_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  interest_rate REAL DEFAULT 0,
  frequency TEXT NOT NULL CHECK(frequency IN ('weekly', 'monthly', 'annual')),
  due_day INTEGER CHECK(due_day >= 1 AND due_day <= 31),
  due_weekday INTEGER CHECK(due_weekday >= 0 AND due_weekday <= 6),
  category_id TEXT REFERENCES categories(id),
  bank_account_id TEXT REFERENCES bank_accounts(id),
  notes TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Instances generated per period
CREATE TABLE IF NOT EXISTS debt_instances (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES debt_templates(id),
  period_label TEXT NOT NULL,
  amount_due REAL NOT NULL,
  amount_paid REAL DEFAULT 0,
  due_date TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'overdue')),
  paid_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Manually registered transactions
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  debt_instance_id TEXT REFERENCES debt_instances(id),
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  bank_account_id TEXT REFERENCES bank_accounts(id),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Uploaded files (PDFs/images of bank statements)
CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_type TEXT CHECK(file_type IN ('pdf', 'image')),
  file_path TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'analyzing', 'analyzed', 'failed')),
  analyzed_at TEXT,
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Transactions extracted via AI from documents
CREATE TABLE IF NOT EXISTS upload_transactions (
  id TEXT PRIMARY KEY,
  upload_id TEXT REFERENCES uploads(id),
  raw_text TEXT,
  extracted_date TEXT,
  extracted_description TEXT,
  extracted_amount REAL,
  extracted_type TEXT CHECK(extracted_type IN ('debit', 'credit')),
  is_assigned INTEGER DEFAULT 0,
  debt_instance_id TEXT REFERENCES debt_instances(id),
  ai_confidence REAL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Key-value configuration
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Migrations tracking
CREATE TABLE IF NOT EXISTS migrations (
  version INTEGER PRIMARY KEY
);