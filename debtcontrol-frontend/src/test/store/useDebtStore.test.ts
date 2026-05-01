import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDebtStore } from '../../store/index';
import type { DebtInstance } from '../../types';

vi.mock('../../api/client', () => ({
  api: {
    debtInstances: {
      getAll: vi.fn().mockResolvedValue([]),
      pay: vi.fn(),
      markPaid: vi.fn(),
    },
  },
}));

const mockDebtInstance: DebtInstance = {
  id: 'debt-1',
  template_id: 'tmpl-1',
  period_label: 'May 2026',
  amount_due: 1000,
  amount_paid: 0,
  due_date: new Date(Date.now() + 86400000 * 10).toISOString(),
  status: 'pending',
  paid_at: null,
  created_at: new Date().toISOString(),
  template: {
    id: 'tmpl-1',
    name: 'Test Debt',
    amount: 1000,
    interest_rate: 0,
    frequency: 'monthly',
    due_day: 15,
    due_weekday: null,
    category_id: null,
    bank_account_id: null,
    notes: null,
    is_active: 1,
    created_at: new Date().toISOString(),
  },
};

describe('useDebtStore', () => {
  beforeEach(() => {
    useDebtStore.setState({
      instances: [mockDebtInstance],
      pendingIds: new Set(),
    });
  });

  describe('payDebt optimistic rollback', () => {
    it('applies optimistic update immediately', async () => {
      const { api } = await import('../../api/client');
      vi.mocked(api.debtInstances.pay).mockResolvedValue({
        instance: { ...mockDebtInstance, amount_paid: 500, status: 'pending' },
        transaction: { id: 'txn-new', amount: 500, date: '2026-05-01' } as unknown as import('../../types').Transaction,
      });

      const promise = useDebtStore.getState().payDebt('debt-1', 500);

      const interimState = useDebtStore.getState();
      expect(interimState.pendingIds.has('debt-1')).toBe(true);
      expect(interimState.instances.find(i => i.id === 'debt-1')?.amount_paid).toBe(500);

      await promise;
    });

    it('rolls back on API failure', async () => {
      const { api } = await import('../../api/client');
      vi.mocked(api.debtInstances.pay).mockRejectedValue(new Error('Network error'));

      try {
        await useDebtStore.getState().payDebt('debt-1', 500);
      } catch (error) {
        // Expected: rollback occurs on error
        expect(error).toBeInstanceOf(Error);
      }

      const stateAfterError = useDebtStore.getState();
      expect(stateAfterError.instances.find(i => i.id === 'debt-1')?.amount_paid).toBe(0);
      expect(stateAfterError.pendingIds.has('debt-1')).toBe(false);
    });

    it('removes from pendingIds on success', async () => {
      const { api } = await import('../../api/client');
      vi.mocked(api.debtInstances.pay).mockResolvedValue({
        instance: { ...mockDebtInstance, amount_paid: 500 },
        transaction: { id: 'txn-new', amount: 500, date: '2026-05-01' } as unknown as import('../../types').Transaction,
      });

      await useDebtStore.getState().payDebt('debt-1', 500);

      expect(useDebtStore.getState().pendingIds.has('debt-1')).toBe(false);
    });
  });

  describe('markPaid optimistic rollback', () => {
    it('applies optimistic update immediately', async () => {
      const { api } = await import('../../api/client');
      vi.mocked(api.debtInstances.markPaid).mockResolvedValue({
        ...mockDebtInstance,
        status: 'paid',
        amount_paid: 1000,
        paid_at: new Date().toISOString(),
      });

      const promise = useDebtStore.getState().markPaid('debt-1');

      const interimState = useDebtStore.getState();
      expect(interimState.pendingIds.has('debt-1')).toBe(true);
      expect(interimState.instances.find(i => i.id === 'debt-1')?.status).toBe('paid');

      await promise;
    });

    it('rolls back on API failure', async () => {
      const { api } = await import('../../api/client');
      vi.mocked(api.debtInstances.markPaid).mockRejectedValue(new Error('Network error'));

      try {
        await useDebtStore.getState().markPaid('debt-1');
      } catch (error) {
        // Expected: rollback occurs on error
        expect(error).toBeInstanceOf(Error);
      }

      const stateAfterError = useDebtStore.getState();
      expect(stateAfterError.instances.find(i => i.id === 'debt-1')?.status).toBe('pending');
      expect(stateAfterError.pendingIds.has('debt-1')).toBe(false);
    });

    it('removes from pendingIds on success', async () => {
      const { api } = await import('../../api/client');
      vi.mocked(api.debtInstances.markPaid).mockResolvedValue({
        ...mockDebtInstance,
        status: 'paid',
        amount_paid: 1000,
      });

      await useDebtStore.getState().markPaid('debt-1');

      expect(useDebtStore.getState().pendingIds.has('debt-1')).toBe(false);
    });
  });
});
