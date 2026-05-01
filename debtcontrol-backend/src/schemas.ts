import { z } from 'zod';

export const createDebtTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  amount: z.number().positive(),
  interest_rate: z.number().min(0).max(100).optional().default(0),
  frequency: z.enum(['weekly', 'monthly', 'annual']),
  due_day: z.number().int().min(1).max(31).optional().nullable(),
  due_weekday: z.number().int().min(0).max(6).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  bank_account_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateDebtTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  amount: z.number().positive().optional(),
  interest_rate: z.number().min(0).max(100).optional(),
  frequency: z.enum(['weekly', 'monthly', 'annual']).optional(),
  due_day: z.number().int().min(1).max(31).optional().nullable(),
  due_weekday: z.number().int().min(0).max(6).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  bank_account_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  is_active: z.number().int().min(0).max(1).optional(),
});

export const payDebtInstanceSchema = z.object({
  amount: z.number().positive(),
  bank_account_id: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
});

export const updateDebtInstanceSchema = z.object({
  status: z.enum(['pending', 'paid', 'overdue']).optional(),
  amount_paid: z.number().min(0).optional(),
  paid_at: z.string().optional(),
});

export const createTransactionSchema = z.object({
  debt_instance_id: z.string().uuid().optional().nullable(),
  amount: z.number().positive(),
  date: z.string(),
  bank_account_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const createBankAccountSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#6366F1'),
});

export const updateBankAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(50).optional().default('credit-card'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#6366F1'),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const updateSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string().nullable().optional(),
});

export const aiChatSchema = z.object({
  message: z.string().min(1).max(2000),
  context: z.record(z.unknown()).optional(),
});

export const assignUploadTransactionSchema = z.object({
  debt_instance_id: z.string().uuid().nullable(),
  confirmed: z.boolean().optional().default(true),
});

export type CreateDebtTemplate = z.infer<typeof createDebtTemplateSchema>;
export type UpdateDebtTemplate = z.infer<typeof updateDebtTemplateSchema>;
export type PayDebtInstance = z.infer<typeof payDebtInstanceSchema>;
export type UpdateDebtInstance = z.infer<typeof updateDebtInstanceSchema>;
export type CreateTransaction = z.infer<typeof createTransactionSchema>;
export type CreateBankAccount = z.infer<typeof createBankAccountSchema>;
export type UpdateBankAccount = z.infer<typeof updateBankAccountSchema>;
export type CreateCategory = z.infer<typeof createCategorySchema>;
export type UpdateCategory = z.infer<typeof updateCategorySchema>;
export type UpdateSetting = z.infer<typeof updateSettingSchema>;
export type AiChat = z.infer<typeof aiChatSchema>;
export type AssignUploadTransaction = z.infer<typeof assignUploadTransactionSchema>;