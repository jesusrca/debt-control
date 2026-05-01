import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import {
  getUploads,
  getUploadById,
  createUpload,
  updateUploadStatus,
  deleteUpload,
  getUploadTransactions,
  getUploadDir,
  getMaxSizeBytes,
} from '../services/uploadService.js';
import { analyzeUpload } from '../services/documentAnalyzer.js';

const router = Router();

const uploadDir = getUploadDir();
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `${uuidv4()}.${ext}`);
  },
});

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['application/pdf', 'image/png', 'image/jpeg'];
  const allowedExts = ['pdf', 'png', 'jpg', 'jpeg'];

  const ext = file.originalname.split('.').pop()?.toLowerCase();

  if (allowedMimes.includes(file.mimetype) && ext && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, PNG, and JPG are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: getMaxSizeBytes(),
  },
});

router.get('/', (_req, res) => {
  const uploads = getUploads();
  res.json(uploads);
});

router.get('/:id', (req, res) => {
  const upload = getUploadById(req.params.id);

  if (!upload) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Upload not found' },
    });
    return;
  }

  res.json(upload);
});

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' },
    });
    return;
  }

  const file = req.file;
  const originalName = file.originalname;
  const filename = file.filename;
  const fileType = file.mimetype === 'application/pdf' ? 'pdf' : 'image';
  const filePath = join(uploadDir, filename);

  const uploadRecord = createUpload(originalName, filename, fileType, filePath);

  res.status(201).json(uploadRecord);
});

router.delete('/:id', (req, res) => {
  const deleted = deleteUpload(req.params.id);

  if (!deleted) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Upload not found' },
    });
    return;
  }

  res.status(204).send();
});

router.post('/:id/analyze', async (req, res) => {
  const upload = getUploadById(req.params.id);

  if (!upload) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Upload not found' },
    });
    return;
  }

  if (upload.status === 'analyzing') {
    res.status(400).json({
      error: { code: 'CONFLICT', message: 'Upload is already being analyzed' },
    });
    return;
  }

  updateUploadStatus(req.params.id, 'analyzing');

  const result = await analyzeUpload(req.params.id);

  if (result.success) {
    res.json({
      message: 'Analysis complete',
      upload_id: req.params.id,
      transactions_extracted: result.transactionsExtracted,
    });
  } else {
    res.status(500).json({
      error: {
        code: 'ANALYSIS_FAILED',
        message: result.error || 'Analysis failed',
      },
    });
  }
});

router.get('/:id/transactions', (req, res) => {
  const upload = getUploadById(req.params.id);

  if (!upload) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Upload not found' },
    });
    return;
  }

  const transactions = getUploadTransactions(req.params.id);
  res.json(transactions);
});

router.patch('/transactions/:id', (req, res) => {
  const { debt_instance_id, confirmed } = req.body;
  const { getDb } = require('../db/index.js');
  const db = getDb();

  const transaction = db.prepare('SELECT * FROM upload_transactions WHERE id = ?').get(req.params.id);
  if (!transaction) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Transaction not found' },
    });
    return;
  }

  db.prepare(`
    UPDATE upload_transactions
    SET debt_instance_id = ?, is_assigned = ?
    WHERE id = ?
  `).run(debt_instance_id || null, confirmed !== false ? 1 : 0, req.params.id);

  const updated = db.prepare('SELECT * FROM upload_transactions WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.post('/transactions/bulk-assign', (req, res) => {
  const { transaction_ids, debt_instance_id } = req.body;
  const { getDb } = require('../db/index.js');
  const db = getDb();

  if (!Array.isArray(transaction_ids)) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'transaction_ids must be an array' },
    });
    return;
  }
  const stmt = db.prepare(`
    UPDATE upload_transactions
    SET debt_instance_id = ?, is_assigned = 1
    WHERE id = ?
  `);

  for (const id of transaction_ids) {
    stmt.run(debt_instance_id || null, id);
  }

  res.json({ assigned: transaction_ids.length });
});

export default router;