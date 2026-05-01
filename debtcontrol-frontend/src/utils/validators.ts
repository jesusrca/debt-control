import { z } from 'zod';

export const debtTemplateSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  amount: z.number().positive('El monto debe ser positivo'),
  frequency: z.enum(['weekly', 'monthly', 'annual']),
  due_day: z.number().int().min(1).max(31).nullable(),
  due_weekday: z.number().int().min(0).max(6).nullable(),
  category_id: z.string().nullable(),
  bank_account_id: z.string().nullable(),
  notes: z.string().nullable(),
});

export const transactionSchema = z.object({
  amount: z.number(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido'),
  bank_account_id: z.string().nullable(),
  debt_instance_id: z.string().nullable(),
  notes: z.string().nullable(),
});

export const payDebtSchema = z.object({
  amount: z.number().positive('El monto debe ser positivo'),
  bank_account_id: z.string().optional(),
  notes: z.string().optional(),
});

export const bankAccountSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido'),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(50),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido'),
});

export const settingsSchema = z.object({
  currency: z.enum(['USD', 'MXN', 'COP', 'EUR']),
  darkMode: z.boolean(),
  aiEnabled: z.boolean(),
});

export type DebtTemplateInput = z.infer<typeof debtTemplateSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type PayDebtInput = z.infer<typeof payDebtSchema>;
export type BankAccountInput = z.infer<typeof bankAccountSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;