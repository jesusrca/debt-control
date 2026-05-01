import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosError } from 'axios';

const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: { use: vi.fn(), eject: vi.fn() },
    response: { use: vi.fn(), eject: vi.fn() },
  },
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
}));

describe('api client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('error handling', () => {
    it('extracts code and message from error response', async () => {
      interface AxiosErrorMock extends Error {
        response: { data: { error: { code: string; message: string } } };
        isAxiosError: boolean;
      }
      const errorResponse = new Error('NOT_FOUND: Resource not found') as AxiosErrorMock;
      errorResponse.response = {
        data: {
          error: {
            code: 'NOT_FOUND',
            message: 'Resource not found',
          },
        },
      };
      errorResponse.isAxiosError = true;

      mockAxiosInstance.get.mockRejectedValue(errorResponse);

      const { api } = await import('../../../src/api/client');

      await expect(api.dashboard.get()).rejects.toThrow('NOT_FOUND: Resource not found');
    });

    it('handles validation errors', async () => {
      interface AxiosErrorMock extends Error {
        response: { data: { error: { code: string; message: string } } };
        isAxiosError: boolean;
      }
      const errorResponse = new Error('VALIDATION_ERROR: Invalid input data') as AxiosErrorMock;
      errorResponse.response = {
        data: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
          },
        },
      };
      errorResponse.isAxiosError = true;

      mockAxiosInstance.get.mockRejectedValue(errorResponse);

      const { api } = await import('../../../src/api/client');

      await expect(api.dashboard.get()).rejects.toThrow('VALIDATION_ERROR: Invalid input data');
    });

    it('handles network errors without response data', async () => {
      const networkError = {
        message: 'Network Error',
        code: 'ERR_NETWORK',
      } as AxiosError;

      mockAxiosInstance.get.mockRejectedValue(networkError);

      const { api } = await import('../../../src/api/client');

      await expect(api.dashboard.get()).rejects.toThrow();
    });
  });

  describe('dashboard.get', () => {
    it('makes GET request to /dashboard', async () => {
      const mockData = { totalDebt: 1000, totalPaid: 500 };
      mockAxiosInstance.get.mockResolvedValue({ data: mockData });

      const { api } = await import('../../../src/api/client');
      const result = await api.dashboard.get();

      expect(result).toEqual(mockData);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('debtInstances.pay', () => {
    it('makes POST request with correct payload', async () => {
      const mockResponse = {
        instance: { id: 'debt-1', amount_paid: 500 },
        transaction: { id: 'txn-1' },
      };
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const { api } = await import('../../../src/api/client');
      const result = await api.debtInstances.pay('debt-1', 500, 'bank-1', 'Payment');

      expect(result).toEqual(mockResponse);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/debt-instances/debt-1/pay',
        { amount: 500, bank_account_id: 'bank-1', notes: 'Payment' }
      );
    });
  });

  describe('transactions.create', () => {
    it('makes POST request with transaction data', async () => {
      const txnData = {
        debt_instance_id: 'debt-1',
        amount: 100,
        date: '2026-05-01',
        bank_account_id: 'bank-1',
        notes: 'Test',
      };
      const mockResponse = { id: 'txn-new', ...txnData };
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const { api } = await import('../../../src/api/client');
      const result = await api.transactions.create(txnData);

      expect(result).toEqual(mockResponse);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/transactions', txnData);
    });
  });
});
