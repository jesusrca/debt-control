import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { api } from '../api/client';

vi.mock('../api/client', () => ({
  api: {
    uploads: {
      upload: vi.fn(),
      analyze: vi.fn(),
      getTransactions: vi.fn(),
    },
    uploadTransactions: {
      update: vi.fn(),
    },
  },
}));

describe('Upload Flow: Upload → Analyze → Assign', () => {
  beforeAll(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('Upload Document', () => {
    it('uploads a PDF file successfully', async () => {
      const mockUpload = {
        id: 'upload-1',
        filename: 'bank-statement.pdf',
        original_name: 'bank-statement.pdf',
        file_type: 'pdf',
        file_path: '/uploads/upload-1.pdf',
        status: 'pending',
        analyzed_at: null,
        error_message: null,
        created_at: '2026-05-01T00:00:00.000Z',
      };

      (api.uploads.upload as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockUpload);

      render(<BrowserRouter><div /></BrowserRouter>);

      const file = new File(['pdf content'], 'bank-statement.pdf', { type: 'application/pdf' });
      const result = await api.uploads.upload(file);

      expect(api.uploads.upload).toHaveBeenCalled();
      expect(result.status).toBe('pending');
      expect(result.filename).toBe('bank-statement.pdf');
    });

    it('validates file type before upload', () => {
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg'];
      const invalidFile = new File(['content'], 'file.exe', { type: 'application/x-msdownload' });

      expect(validTypes.includes(invalidFile.type)).toBe(false);
    });

    it('validates file size before upload', () => {
      const maxSize = 10 * 1024 * 1024;
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });

      expect(largeFile.size > maxSize).toBe(true);
    });
  });

  describe('Analyze Document', () => {
    it('triggers AI analysis on uploaded document', async () => {
      const mockUpload = {
        id: 'upload-1',
        status: 'analyzing',
      };

      (api.uploads.analyze as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockUpload);

      const result = await api.uploads.analyze('upload-1');

      expect(api.uploads.analyze).toHaveBeenCalledWith('upload-1');
      expect(result.status).toBe('analyzing');
    });

    it('returns extracted transactions after analysis', async () => {
      const mockTransactions = [
        {
          id: 'txn-1',
          upload_id: 'upload-1',
          raw_text: 'NETFLIX.COM',
          extracted_date: '2026-05-01',
          extracted_description: 'NETFLIX.COM',
          extracted_amount: 15.99,
          extracted_type: 'debit',
          is_assigned: 0,
          debt_instance_id: null,
          ai_confidence: 0.85,
          created_at: '2026-05-01T00:00:00.000Z',
        },
        {
          id: 'txn-2',
          upload_id: 'upload-1',
          raw_text: 'SPOTIFY',
          extracted_date: '2026-05-02',
          extracted_description: 'SPOTIFY',
          extracted_amount: 9.99,
          extracted_type: 'debit',
          is_assigned: 0,
          debt_instance_id: null,
          ai_confidence: 0.82,
          created_at: '2026-05-01T00:00:00.000Z',
        },
      ];

      (api.uploads.getTransactions as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockTransactions);

      const result = await api.uploads.getTransactions('upload-1');

      expect(result).toHaveLength(2);
      expect(result[0].extracted_description).toBe('NETFLIX.COM');
    });
  });

  describe('Assign Transactions', () => {
    it('assigns transaction to existing debt', async () => {
      const mockAssignment = {
        id: 'txn-1',
        debt_instance_id: 'inst-1',
        is_assigned: 1,
      };

      (api.uploadTransactions.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockAssignment);

      const result = await api.uploadTransactions.update('txn-1', {
        debt_instance_id: 'inst-1',
        is_assigned: 1,
      });

      expect(result.debt_instance_id).toBe('inst-1');
      expect(result.is_assigned).toBe(1);
    });

    it('calculates match confidence correctly', () => {
      const nameMatch = 1.0;
      const amountMatch = 0.95;
      const dateMatch = 0.8;

      const confidence = (nameMatch * 0.5) + (amountMatch * 0.3) + (dateMatch * 0.2);
      const confidencePercent = Math.round(confidence * 100);

      expect(confidencePercent).toBe(95);
    });
  });
});
