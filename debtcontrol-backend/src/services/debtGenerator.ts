import { getDb } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { format, addDays, addWeeks, addMonths, addYears, startOfWeek, isBefore } from 'date-fns';

export interface TemplateWithInstance {
  id: string;
  name: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'annual';
  due_day: number | null;
  due_weekday: number | null;
  is_active: number;
}

export function calculateDueDate(template: TemplateWithInstance, periodStart: Date): Date {
  const now = new Date();

  if (template.frequency === 'monthly' && template.due_day) {
    const dueDate = new Date(periodStart.getFullYear(), periodStart.getMonth(), template.due_day);
    if (isBefore(dueDate, now)) {
      return addMonths(dueDate, 1);
    }
    return dueDate;
  }

  if (template.frequency === 'weekly' && template.due_weekday !== null) {
    let dueDate = startOfWeek(now, { weekStartsOn: 0 });
    dueDate = addDays(dueDate, template.due_weekday);
    if (isBefore(dueDate, now)) {
      dueDate = addWeeks(dueDate, 1);
    }
    return dueDate;
  }

  if (template.frequency === 'annual' && template.due_day) {
    const dueDate = new Date(now.getFullYear(), periodStart.getMonth(), template.due_day);
    if (isBefore(dueDate, now)) {
      return addYears(dueDate, 1);
    }
    return dueDate;
  }

  return addDays(now, 30);
}

export function getPeriodLabel(template: TemplateWithInstance, periodStart: Date): string {
  if (template.frequency === 'monthly') {
    return format(periodStart, 'MMMM yyyy');
  }

  if (template.frequency === 'weekly') {
    const weekStart = startOfWeek(periodStart, { weekStartsOn: 0 });
    const weekNum = Math.ceil(((weekStart.getTime() - new Date(periodStart.getFullYear(), 0, 1).getTime()) / 86400000) / 7);
    return `${format(periodStart, 'yyyy')} Week ${weekNum}`;
  }

  if (template.frequency === 'annual') {
    return format(periodStart, 'yyyy');
  }

  return format(periodStart, 'yyyy-MM');
}

export function generateInstancesForPeriod(periodStart?: Date): { generated: number; errors: string[] } {
  const db = getDb();
  const now = periodStart || new Date();
  const errors: string[] = [];

  const templates = db.prepare(`
    SELECT * FROM debt_templates WHERE is_active = 1
  `).all() as TemplateWithInstance[];

  let generated = 0;

  for (const template of templates) {
    try {
      const periodLabel = getPeriodLabel(template, now);
      const dueDate = calculateDueDate(template, now);

      const existing = db.prepare(`
        SELECT id FROM debt_instances
        WHERE template_id = ? AND period_label = ?
      `).get(template.id, periodLabel);

      if (existing) {
        continue;
      }

      const id = uuidv4();
      const createdAt = now.toISOString();

      db.prepare(`
        INSERT INTO debt_instances (id, template_id, period_label, amount_due, amount_paid, due_date, status, created_at)
        VALUES (?, ?, ?, ?, 0, ?, 'pending', ?)
      `).run(id, template.id, periodLabel, template.amount, dueDate.toISOString().split('T')[0], createdAt);

      generated++;
    } catch (error) {
      errors.push(`Failed to generate instance for template ${template.id}: ${error}`);
    }
  }

  return { generated, errors };
}

export function markOverdueInstances(): number {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const result = db.prepare(`
    UPDATE debt_instances
    SET status = 'overdue'
    WHERE status = 'pending' AND due_date < ?
  `).run(today);

  return result.changes;
}

export function generateAndMarkOverdue(): { generated: number; marked: number; errors: string[] } {
  const { generated, errors } = generateInstancesForPeriod();
  const marked = markOverdueInstances();
  return { generated, marked, errors };
}