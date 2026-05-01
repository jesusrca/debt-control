import { format, differenceInDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { ProgressBar } from './ui/ProgressBar';
import type { DebtInstance } from '../types';

interface DebtCardProps {
  debt: DebtInstance;
  onPay?: (debt: DebtInstance) => void;
  onClick?: (debt: DebtInstance) => void;
}

export function DebtCard({ debt, onPay, onClick }: DebtCardProps) {
  const dueDate = parseISO(debt.due_date);
  const today = new Date();
  const daysUntil = differenceInDays(dueDate, today);

  const getStatusConfig = () => {
    if (debt.status === 'paid') {
      return {
        borderColor: 'border-l-4 border-[var(--color-success)]',
        bgColor: 'bg-[var(--color-success-muted)]',
        badge: <Badge variant="success">Completada</Badge>,
        amountColor: 'text-[var(--color-success)]',
        nameDecoration: 'line-through',
      };
    }

    if (daysUntil < 0) {
      return {
        borderColor: 'border-l-4 border-[var(--color-danger)]',
        bgColor: 'bg-[var(--color-danger-muted)]',
        badge: <Badge variant="danger">Vencida</Badge>,
        amountColor: 'text-[var(--color-danger)]',
        nameDecoration: '',
        pulse: true,
      };
    }

    if (daysUntil <= 3) {
      return {
        borderColor: 'border-l-4 border-[var(--color-warning)]',
        bgColor: '',
        badge: <Badge variant="warning">⚠ {daysUntil === 0 ? 'Hoy' : `${daysUntil} días`}</Badge>,
        amountColor: 'text-[var(--color-warning)]',
        nameDecoration: '',
      };
    }

    return {
      borderColor: 'border-l-4 border-[var(--color-primary)]',
      bgColor: '',
      badge: <Badge variant="primary">Pendiente</Badge>,
      amountColor: 'text-[var(--color-text-primary)]',
      nameDecoration: '',
    };
  };

  const status = getStatusConfig();
  const paidPercentage = debt.amount_due > 0 ? (debt.amount_paid / debt.amount_due) * 100 : 0;
  const remaining = debt.amount_due - debt.amount_paid;

  return (
    <div
      className={`rounded-xl border border-[var(--color-border)] ${status.borderColor} ${status.bgColor} p-5 transition-all duration-200 hover-lift cursor-pointer card-enter`}
      onClick={() => onClick?.(debt)}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className={`font-semibold text-[var(--color-text-primary)] ${status.nameDecoration}`}>
            {debt.template?.name || 'Deuda'}
          </h4>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            {format(dueDate, "d 'de' MMMM, yyyy", { locale: es })}
          </p>
        </div>
        {status.badge}
      </div>

      <div className="flex justify-between mb-2">
        <span className="text-sm text-[var(--color-text-secondary)]">
          ${debt.amount_paid.toFixed(2)} / ${debt.amount_due.toFixed(2)}
        </span>
        <span className={`text-sm font-semibold ${status.amountColor}`}>
          {paidPercentage.toFixed(0)}%
        </span>
      </div>

      <ProgressBar
        value={debt.amount_paid}
        max={debt.amount_due}
        variant={debt.status === 'paid' ? 'success' : remaining > 0 && daysUntil <= 3 ? 'warning' : 'default'}
        animated={debt.status !== 'paid'}
      />

      {debt.status !== 'paid' && onPay && (
        <Button
          variant="primary"
          size="sm"
          className="w-full mt-4"
          onClick={(e) => {
            e.stopPropagation();
            onPay(debt);
          }}
        >
          Registrar Pago
        </Button>
      )}
    </div>
  );
}