export const FREQUENCIES = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'annual', label: 'Anual' },
] as const;

export const DEFAULT_CATEGORIES = [
  { name: 'Utilities', icon: 'zap', color: '#F59E0B' },
  { name: 'Subscriptions', icon: 'repeat', color: '#8B5CF6' },
  { name: 'Loans', icon: 'landmark', color: '#EF4444' },
  { name: 'Rent', icon: 'home', color: '#10B981' },
  { name: 'Other', icon: 'credit-card', color: '#6366F1' },
] as const;

export const BANK_COLORS = [
  '#2563EB',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
] as const;

export const CURRENCIES = [
  { value: 'USD', label: 'USD - Dólar Estadounidense', symbol: '$' },
  { value: 'MXN', label: 'MXN - Peso Mexicano', symbol: '$' },
  { value: 'COP', label: 'COP - Peso Colombiano', symbol: '$' },
  { value: 'EUR', label: 'EUR - Euro', symbol: '€' },
] as const;

export const DEBT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  OVERDUE: 'overdue',
} as const;

export const UPLOAD_STATUS = {
  PENDING: 'pending',
  ANALYZING: 'analyzing',
  ANALYZED: 'analyzed',
  FAILED: 'failed',
} as const;

export const MAX_FILE_SIZE_MB = 10;
export const ALLOWED_FILE_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

export const AI_RATE_LIMIT = {
  MAX_REQUESTS: 10,
  WINDOW_MS: 60000,
  CHAT_CACHE_TTL_MS: 300000,
  ANALYZE_CACHE_TTL_MS: 86400000,
} as const;