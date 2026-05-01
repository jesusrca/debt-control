export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
}

export interface BankAccount {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface DebtTemplate {
  id: string;
  name: string;
  amount: number;
  interest_rate: number;
  frequency: 'weekly' | 'monthly' | 'annual';
  due_day: number | null;
  due_weekday: number | null;
  category_id: string | null;
  bank_account_id: string | null;
  notes: string | null;
  is_active: number;
  created_at: string;
  category?: Category;
  bank_account?: BankAccount;
}

export interface DebtInstance {
  id: string;
  template_id: string;
  period_label: string;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  paid_at: string | null;
  created_at: string;
  template?: DebtTemplate;
  category?: Category;
  bank_account?: BankAccount;
}

export interface Transaction {
  id: string;
  debt_instance_id: string | null;
  amount: number;
  date: string;
  bank_account_id: string | null;
  notes: string | null;
  created_at: string;
  bank_account?: BankAccount;
  debt_instance?: DebtInstance;
}

export interface Upload {
  id: string;
  filename: string;
  original_name: string;
  file_type: 'pdf' | 'image';
  file_path: string;
  status: 'pending' | 'analyzing' | 'analyzed' | 'failed';
  analyzed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface UploadTransaction {
  id: string;
  upload_id: string;
  raw_text: string | null;
  extracted_date: string | null;
  extracted_description: string | null;
  extracted_amount: number | null;
  extracted_type: 'debit' | 'credit' | null;
  is_assigned: number;
  debt_instance_id: string | null;
  ai_confidence: number | null;
  created_at: string;
}

export interface DashboardData {
  totalDebt: number;
  totalPaid: number;
  monthlySpend: number;
  nextPayment: {
    debt: DebtInstance;
    daysUntil: number;
  } | null;
  upcomingDebts: DebtInstance[];
  recentTransactions: Transaction[];
}

export interface AnalyticsData {
  monthlySpending: { month: string; amount: number }[];
  categoryDistribution: { category: string; amount: number; color: string }[];
  debtProjection: {
    debtFreeDate: string | null;
    monthsRemaining: number | null;
    totalRemaining: number;
    message: string;
  };
  interestPaid: number;
}

export interface Settings {
  currency: string;
  darkMode: boolean;
  aiEnabled: boolean;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}