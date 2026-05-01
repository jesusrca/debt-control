import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTransactionStore } from '../../store/index';
import type { Transaction } from '../../types';

vi.mock('../../api/client', () => ({
  api: {
    transactions: {
      getAll: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const mockTransaction: Transaction = {
  id: 'txn-1',
  debt_instance_id: null,
  amount: 100,
  date: new Date().toISOString(),
  bank_account_id: 'bank-1',
  notes: 'Test Transaction',
  created_at: new Date().toISOString(),
};

describe('useTransactionStore', () => {
  beforeEach(() => {
    useTransactionStore.setState({
      transactions: [mockTransaction],
      pendingIds: new Set(),
      isLoading: false,
      error: null,
      hasMore: true,
      offset: 0,
      limit: 20,
    });
  });

  describe('fetchTransactions', () => {
    it('fetches and sets transactions', async () => {
      const { api } = await import('../../api/client');
      vi.mocked(api.transactions.getAll).mockResolvedValue([mockTransaction]);

      await useTransactionStore.getState().fetchTransactions();

      expect(useTransactionStore.getState().transactions).toHaveLength(1);
      expect(useTransactionStore.getState().isLoading).toBe(false);
    });

    it('handles API errors', async () => {
      const { api } = await import('../../api/client');
      vi.mocked(api.transactions.getAll).mockRejectedValue(new Error('API Error'));

      await useTransactionStore.getState().fetchTransactions();

      expect(useTransactionStore.getState().error).toBe('API Error');
    });
  });

  describe('createTransaction', () => {
    it('adds optimistic transaction immediately', async () => {
      const newTxn = { ...mockTransaction, id: 'new-txn', notes: 'New' };
      const { api } = await import('../../api/client');
      vi.mocked(api.transactions.create).mockResolvedValue(newTxn);

      const promise = useTransactionStore.getState().createTransaction({
        amount: newTxn.amount,
        date: newTxn.date,
        bank_account_id: newTxn.bank_account_id,
        notes: newTxn.notes,
        debt_instance_id: newTxn.debt_instance_id,
      });

      const interimState = useTransactionStore.getState();
      expect(interimState.transactions[0].id.startsWith('temp-')).toBe(true);

      await promise;
    });

    it('replaces temp transaction with real one on success', async () => {
      const newTxn = { ...mockTransaction, id: 'new-txn', notes: 'New' };
      const { api } = await import('../../api/client');
      vi.mocked(api.transactions.create).mockResolvedValue(newTxn);

      await useTransactionStore.getState().createTransaction({
        amount: newTxn.amount,
        date: newTxn.date,
        bank_account_id: newTxn.bank_account_id,
        notes: newTxn.notes,
        debt_instance_id: newTxn.debt_instance_id,
      });

      const state = useTransactionStore.getState();
      expect(state.transactions.find(t => t.id === 'new-txn')).toBeTruthy();
    });

    it('removes optimistic transaction on failure', async () => {
      const { api } = await import('../../api/client');
      vi.mocked(api.transactions.create).mockRejectedValue(new Error('API Error'));

      try {
        await useTransactionStore.getState().createTransaction({
          debt_instance_id: mockTransaction.debt_instance_id,
          amount: mockTransaction.amount,
          date: mockTransaction.date,
          bank_account_id: mockTransaction.bank_account_id,
          notes: mockTransaction.notes,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      const state = useTransactionStore.getState();
      const tempTxn = state.transactions.find(t => t.id.startsWith('temp-'));
      expect(tempTxn).toBeUndefined();
    });
  });

  describe('deleteTransaction', () => {
    it('removes transaction from list', async () => {
      const { api } = await import('../../api/client');
      vi.mocked(api.transactions.delete).mockResolvedValue(undefined);

      await useTransactionStore.getState().deleteTransaction('txn-1');

      expect(useTransactionStore.getState().transactions.find(t => t.id === 'txn-1')).toBeUndefined();
    });
  });
});
