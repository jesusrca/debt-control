import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DebtCard } from '../../components/DebtCard';
import type { DebtInstance } from '../../types';

const createMockDebt = (overrides: Partial<DebtInstance> = {}): DebtInstance => ({
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
  ...overrides,
});

describe('DebtCard', () => {
  it('renders pending debt with blue border', () => {
    const debt = createMockDebt({
      status: 'pending',
      amount_due: 1000,
      amount_paid: 0,
      due_date: new Date(Date.now() + 86400000 * 10).toISOString(),
    });

    render(<DebtCard debt={debt} />);

    expect(screen.getByText('Test Debt')).toBeTruthy();
    expect(screen.getByText('Pendiente')).toBeTruthy();
    expect(screen.getByText('$0.00 / $1000.00')).toBeTruthy();
  });

  it('renders due_soon debt with amber border and warning badge', () => {
    const debt = createMockDebt({
      status: 'pending',
      amount_due: 1000,
      amount_paid: 0,
      due_date: new Date(Date.now() + 86400000 * 2).toISOString(),
    });

    render(<DebtCard debt={debt} />);

    expect(screen.getByText(/⚠.*días/)).toBeTruthy();
  });

  it('renders overdue debt with red border', () => {
    const debt = createMockDebt({
      status: 'overdue',
      amount_due: 1000,
      amount_paid: 0,
      due_date: new Date(Date.now() - 86400000 * 5).toISOString(),
    });

    render(<DebtCard debt={debt} />);

    expect(screen.getByText('Vencida')).toBeTruthy();
  });

  it('renders paid debt with green styling and strikethrough', () => {
    const debt = createMockDebt({
      status: 'paid',
      amount_due: 1000,
      amount_paid: 1000,
      due_date: new Date(Date.now() + 86400000 * 10).toISOString(),
      paid_at: new Date().toISOString(),
    });

    render(<DebtCard debt={debt} />);

    expect(screen.getByText('Completada')).toBeTruthy();
    const nameEl = screen.getByText('Test Debt');
    expect(nameEl.className).toContain('line-through');
  });

  it('calls onPay when pay button is clicked', () => {
    const onPay = vi.fn();
    const debt = createMockDebt({ status: 'pending' });

    render(<DebtCard debt={debt} onPay={onPay} />);

    fireEvent.click(screen.getByText('Registrar Pago'));
    expect(onPay).toHaveBeenCalledWith(debt);
  });

  it('calls onClick when card is clicked', () => {
    const onClick = vi.fn();
    const debt = createMockDebt({ status: 'pending' });

    render(<DebtCard debt={debt} onClick={onClick} />);

    fireEvent.click(screen.getByText('Test Debt').closest('div')!);
    expect(onClick).toHaveBeenCalledWith(debt);
  });

  it('shows correct paid percentage', () => {
    const debt = createMockDebt({
      status: 'pending',
      amount_due: 500,
      amount_paid: 250,
    });

    render(<DebtCard debt={debt} />);

    expect(screen.getByText('$250.00 / $500.00')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
  });
});
