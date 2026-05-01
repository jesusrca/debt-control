import { format, parseISO, differenceInDays, addDays, startOfMonth, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatDate(date: string | Date, formatStr: string = "d 'de' MMMM, yyyy"): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr, { locale: es });
}

export function formatDateShort(date: string | Date): string {
  return formatDate(date, "d 'de' MMM");
}

export function getMonthName(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMMM', { locale: es });
}

export function daysUntil(date: string | Date): number {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return differenceInDays(d, new Date());
}

export function calculateDueDate(
  frequency: 'weekly' | 'monthly' | 'annual',
  dueDay: number | null,
  baseDate: Date = new Date()
): Date {
  switch (frequency) {
    case 'weekly': {
      const dayOfWeek = dueDay ?? 0;
      const currentDay = baseDate.getDay();
      let daysToAdd = dayOfWeek - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
      return addDays(baseDate, daysToAdd);
    }
    case 'monthly': {
      const day = dueDay ?? 1;
      const thisMonth = startOfMonth(baseDate);
      let targetDate = new Date(thisMonth);
      targetDate.setDate(day);
      if (targetDate < baseDate) {
        targetDate = addMonths(targetDate, 1);
      }
      return targetDate;
    }
    case 'annual': {
      const day = dueDay ?? 1;
      const thisYear = baseDate.getFullYear();
      const targetDate = new Date(thisYear, baseDate.getMonth(), day);
      if (targetDate < baseDate) {
        return new Date(thisYear + 1, baseDate.getMonth(), day);
      }
      return targetDate;
    }
  }
}

export function formatDateISO(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function getPeriodLabel(frequency: 'weekly' | 'monthly' | 'annual', date: Date = new Date()): string {
  switch (frequency) {
    case 'weekly': {
      const weekNumber = Math.ceil(date.getDate() / 7);
      return `Semana ${weekNumber} ${date.getFullYear()}`;
    }
    case 'monthly':
      return format(date, 'MMMM yyyy', { locale: es });
    case 'annual':
      return format(date, 'yyyy');
  }
}