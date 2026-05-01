import { Link } from 'react-router-dom';
import { formatDateShort } from '../../utils/date';
import { formatCurrency } from '../../utils/format';
import { Badge } from '../ui/Badge';
import type { Transaction } from '../../types';

interface TransactionItemProps {
  transaction: Transaction;
  currency?: string;
  onClick?: () => void;
}

export function TransactionItem({
  transaction,
  currency = 'USD',
  onClick,
}: TransactionItemProps) {
  const bankColor = transaction.bank_account?.color || '#6366F1';
  const debtLink = transaction.debt_instance_id
    ? `/debts/${transaction.debt_instance_id}`
    : null;

  return (
    <div
      className="flex items-center justify-between p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl cursor-pointer hover:border-[var(--color-border-hover)] transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: bankColor }}
        />
        <div>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            {transaction.notes || 'Transacción'}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {formatDateShort(transaction.date)}
          </p>
          {transaction.bank_account && (
            <Badge variant="default" className="mt-1">
              {transaction.bank_account.name}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end">
        <p
          className={`text-base font-semibold ${
            transaction.amount < 0
              ? 'text-[var(--color-danger)]'
              : 'text-[var(--color-success)]'
          }`}
        >
          {transaction.amount < 0 ? '-' : '+'}
          {formatCurrency(Math.abs(transaction.amount), currency)}
        </p>
        {debtLink && (
          <Link
            to={debtLink}
            className="text-xs text-[var(--color-primary)] hover:underline mt-1"
            onClick={(e) => e.stopPropagation()}
          >
            Ver deuda
          </Link>
        )}
      </div>
    </div>
  );
}

export function TransactionItemSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-[var(--color-border)]" />
        <div>
          <div className="h-4 w-24 bg-[var(--color-border)] rounded mb-2" />
          <div className="h-3 w-16 bg-[var(--color-border)] rounded" />
        </div>
      </div>
      <div className="h-5 w-20 bg-[var(--color-border)] rounded" />
    </div>
  );
}