import { getDb } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { existsSync, unlinkSync } from 'fs';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_SIZE_MB = parseInt(process.env.UPLOAD_MAX_SIZE_MB || '10', 10);
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export function getUploadDir(): string {
  return UPLOAD_DIR;
}

export function getMaxSizeBytes(): number {
  return MAX_SIZE_BYTES;
}

export interface UploadRecord {
  id: string;
  filename: string;
  original_name: string;
  file_type: 'pdf' | 'image';
  file_path: string;
  status: 'pending' | 'analyzing' | 'analyzed' | 'failed';
  analyzed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export function createUpload(
  originalName: string,
  filename: string,
  fileType: 'pdf' | 'image',
  filePath: string
): UploadRecord {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO uploads (id, filename, original_name, file_type, file_path, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?)
  `).run(id, filename, originalName, fileType, filePath, now);

  return db.prepare('SELECT * FROM uploads WHERE id = ?').get(id) as UploadRecord;
}

export function getUploads(): UploadRecord[] {
  const db = getDb();
  return db.prepare('SELECT * FROM uploads ORDER BY created_at DESC').all() as UploadRecord[];
}

export function getUploadById(id: string): UploadRecord | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM uploads WHERE id = ?').get(id) as UploadRecord | undefined;
}

export function updateUploadStatus(
  id: string,
  status: 'pending' | 'analyzing' | 'analyzed' | 'failed',
  errorMessage?: string
): UploadRecord | undefined {
  const db = getDb();
  const now = new Date().toISOString();

  if (status === 'analyzed') {
    db.prepare(`UPDATE uploads SET status = ?, analyzed_at = ? WHERE id = ?`).run(status, now, id);
  } else if (errorMessage) {
    db.prepare(`UPDATE uploads SET status = ?, error_message = ? WHERE id = ?`).run(status, errorMessage, id);
  } else {
    db.prepare(`UPDATE uploads SET status = ? WHERE id = ?`).run(status, id);
  }

  return getUploadById(id);
}

export function deleteUpload(id: string): boolean {
  const db = getDb();
  const upload = getUploadById(id);

  if (!upload) {
    return false;
  }

  try {
    if (existsSync(upload.file_path)) {
      unlinkSync(upload.file_path);
    }
  } catch (e) {
    console.error(`Failed to delete file: ${upload.file_path}`, e);
  }

  db.prepare('DELETE FROM upload_transactions WHERE upload_id = ?').run(id);
  db.prepare('DELETE FROM uploads WHERE id = ?').run(id);

  return true;
}

export function getUploadTransactions(uploadId: string) {
  const db = getDb();
  return db.prepare(`
    SELECT ut.*, di.period_label as debt_period, dt.name as debt_name
    FROM upload_transactions ut
    LEFT JOIN debt_instances di ON ut.debt_instance_id = di.id
    LEFT JOIN debt_templates dt ON di.template_id = dt.id
    WHERE ut.upload_id = ?
    ORDER BY ut.created_at DESC
  `).all(uploadId);
}

export function createUploadTransaction(
  uploadId: string,
  data: {
    rawText?: string;
    extractedDate?: string;
    extractedDescription?: string;
    extractedAmount?: number;
    extractedType?: 'debit' | 'credit';
    aiConfidence?: number;
  }
) {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO upload_transactions (id, upload_id, raw_text, extracted_date, extracted_description, extracted_amount, extracted_type, ai_confidence, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    uploadId,
    data.rawText ?? null,
    data.extractedDate ?? null,
    data.extractedDescription ?? null,
    data.extractedAmount ?? null,
    data.extractedType ?? null,
    data.aiConfidence ?? null,
    now
  );

  return db.prepare('SELECT * FROM upload_transactions WHERE id = ?').get(id);
}

export function assignUploadTransaction(
  transactionId: string,
  debtInstanceId: string | null,
  confirmed: boolean = true
) {
  const db = getDb();

  db.prepare(`
    UPDATE upload_transactions
    SET debt_instance_id = ?, is_assigned = ?
    WHERE id = ?
  `).run(debtInstanceId, confirmed ? 1 : 0, transactionId);

  return db.prepare('SELECT * FROM upload_transactions WHERE id = ?').get(transactionId);
}

export function bulkAssignUploadTransactions(
  transactionIds: string[],
  debtInstanceId: string | null
) {
  const db = getDb();

  const stmt = db.prepare(`
    UPDATE upload_transactions
    SET debt_instance_id = ?, is_assigned = 1
    WHERE id = ?
  `);

  for (const id of transactionIds) {
    stmt.run(debtInstanceId, id);
  }

  return transactionIds.length;
}