import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TransactionItem } from '../../components/shared/TransactionItem';
import type { Transaction } from '../../types';

const createMockTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'txn-1',
  debt_instance_id: null,
  amount: 100,
  date: new Date().toISOString(),
  bank_account_id: 'bank-1',
  notes: 'Test Transaction',
  created_at: new Date().toISOString(),
  bank_account: {
    id: 'bank-1',
    name: 'Test Bank',
    color: '#6366F1',
    created_at: new Date().toISOString(),
  },
  ...overrides,
});

describe('TransactionItem', () => {
  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
  };

  it('renders transaction with positive amount in green', () => {
    const transaction = createMockTransaction({ amount: 100 });

    renderWithRouter(<TransactionItem transaction={transaction} />);

    expect(screen.getByText('Test Transaction')).toBeTruthy();
    expect(screen.getByText(/\+/)).toBeTruthy();
    expect(screen.getByText(/\$100,00/)).toBeTruthy();
  });

  it('renders transaction with negative amount in red', () => {
    const transaction = createMockTransaction({ amount: -100 });

    renderWithRouter(<TransactionItem transaction={transaction} />);

    expect(screen.getByText(/-/)).toBeTruthy();
  });

  it('renders transaction without bank account', () => {
    const transaction = createMockTransaction({
      bank_account_id: null,
      bank_account: undefined,
    });

    renderWithRouter(<TransactionItem transaction={transaction} />);

    expect(screen.getByText('Test Transaction')).toBeTruthy();
  });

  it('shows debt link when debt_instance_id is present', () => {
    const transaction = createMockTransaction({
      debt_instance_id: 'debt-1',
    });

    renderWithRouter(<TransactionItem transaction={transaction} />);

    expect(screen.getByText('Ver deuda')).toBeTruthy();
  });

  it('does not show debt link when debt_instance_id is null', () => {
    const transaction = createMockTransaction({
      debt_instance_id: null,
    });

    renderWithRouter(<TransactionItem transaction={transaction} />);

    expect(screen.queryByText('Ver deuda')).toBeNull();
  });

  it('calls onClick when card is clicked', () => {
    const onClick = vi.fn();
    const transaction = createMockTransaction({ amount: 100 });

    renderWithRouter(<TransactionItem transaction={transaction} onClick={onClick} />);

    fireEvent.click(screen.getByText('Test Transaction').closest('div')!);
    expect(onClick).toHaveBeenCalled();
  });

  it('uses default USD currency', () => {
    const transaction = createMockTransaction({ amount: 250 });

    renderWithRouter(<TransactionItem transaction={transaction} />);

    expect(screen.getByText(/\$250,00/)).toBeTruthy();
  });

  it('uses custom currency', () => {
    const transaction = createMockTransaction({ amount: 250 });

    renderWithRouter(<TransactionItem transaction={transaction} currency="EUR" />);

    expect(screen.getByText(/€250,00/)).toBeTruthy();
  });

  it('shows "Transacción" when notes is empty', () => {
    const transaction = createMockTransaction({ notes: null });

    renderWithRouter(<TransactionItem transaction={transaction} />);

    expect(screen.getByText('Transacción')).toBeTruthy();
  });

  it('displays bank account badge when bank_account exists', () => {
    const transaction = createMockTransaction({
      bank_account: {
        id: 'bank-1',
        name: 'Main Bank',
        color: '#10B981',
        created_at: new Date().toISOString(),
      },
    });

    renderWithRouter(<TransactionItem transaction={transaction} />);

    expect(screen.getByText('Main Bank')).toBeTruthy();
  });
});
