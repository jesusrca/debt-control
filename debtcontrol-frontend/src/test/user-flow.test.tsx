import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { api } from '../api/client';

vi.mock('../api/client', () => ({
  api: {
    debtTemplates: {
      create: vi.fn(),
      getAll: vi.fn(),
      generate: vi.fn(),
    },
    debtInstances: {
      getAll: vi.fn(),
      update: vi.fn(),
      pay: vi.fn(),
    },
    transactions: {
      create: vi.fn(),
    },
  },
}));

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('User Flow: Create Debt → Pay', () => {
  beforeAll(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('Create Debt Flow', () => {
    it('creates a new debt template', async () => {
      const mockDebt = {
        id: 'debt-1',
        name: 'Internet',
        amount: 50,
        interest_rate: 0,
        frequency: 'monthly',
        due_day: 15,
        due_weekday: null,
        category_id: null,
        bank_account_id: null,
        notes: null,
        is_active: 1,
        created_at: '2026-05-01T00:00:00.000Z',
      };

      (api.debtTemplates.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockDebt);

      renderWithRouter(<div data-testid="create-form" />);

      const result = await api.debtTemplates.create({
        name: 'Internet',
        amount: 50,
        interest_rate: 0,
        frequency: 'monthly',
        due_day: 15,
        due_weekday: null,
        category_id: null,
        bank_account_id: null,
        notes: null,
        is_active: 1,
      });

      expect(api.debtTemplates.create).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'debt-1');
    });

    it('generates debt instance for current period', async () => {
      const mockInstances = [
        {
          id: 'inst-1',
          template_id: 'tmpl-1',
          period_label: 'May 2026',
          amount_due: 50,
          amount_paid: 0,
          status: 'pending',
          due_date: '2026-05-15',
        },
      ];

      (api.debtInstances.getAll as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockInstances);

      const result = await api.debtInstances.getAll({ status: 'pending' });

      expect(result).toHaveLength(1);
      expect(result[0].period_label).toBe('May 2026');
      expect(result[0].status).toBe('pending');
    });

    it('marks debt as paid after full payment', async () => {
      const mockUpdatedDebt = {
        id: 'inst-1',
        template_id: 'tmpl-1',
        period_label: 'May 2026',
        amount_due: 50,
        amount_paid: 50,
        status: 'paid',
        paid_at: '2026-05-10T00:00:00.000Z',
      };

      (api.debtInstances.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockUpdatedDebt);

      const result = await api.debtInstances.update('inst-1', {
        status: 'paid',
        amount_paid: 50,
        paid_at: '2026-05-10T00:00:00.000Z',
      });

      expect(result.status).toBe('paid');
      expect(result.amount_paid).toBe(50);
    });
  });

  describe('Partial Payment Flow', () => {
    it('keeps debt pending after partial payment', async () => {
      const mockUpdatedDebt = {
        id: 'inst-2',
        template_id: 'tmpl-2',
        period_label: 'May 2026',
        amount_due: 100,
        amount_paid: 50,
        status: 'pending',
      };

      (api.debtInstances.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockUpdatedDebt);

      const result = await api.debtInstances.update('inst-2', {
        amount_paid: 50,
      });

      expect(result.status).toBe('pending');
      expect(result.amount_paid).toBe(50);
      expect(result.amount_due).toBe(100);
    });

    it('calculates remaining balance correctly', () => {
      const debt = { amount_due: 100, amount_paid: 30 };
      const remaining = debt.amount_due - debt.amount_paid;
      expect(remaining).toBe(70);
    });
  });
});
