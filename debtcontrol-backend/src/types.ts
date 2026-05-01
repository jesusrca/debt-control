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
}

export interface Transaction {
  id: string;
  debt_instance_id: string | null;
  amount: number;
  date: string;
  bank_account_id: string | null;
  notes: string | null;
  created_at: string;
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

export interface Setting {
  key: string;
  value: string | null;
}

export interface DashboardStats {
  totalDebt: number;
  totalPaid: number;
  monthlySpend: number;
  nextPayment: {
    due_date: string;
    name: string;
    amount: number;
  } | null;
  upcomingDebts: (DebtInstance & { name: string; category_color: string | null })[];
  recentTransactions: (Transaction & { bank_name: string | null; bank_color: string | null })[];
}

export interface AnalyticsData {
  monthlySpending: { month: string; amount: number }[];
  categoryDistribution: { category: string; color: string; amount: number }[];
  debtProjection: {
    type: 'projected' | 'increasing' | 'no_data' | 'no_history';
    projectedDate?: string;
    monthsUntilFree?: number;
    totalPending?: number;
    avgMonthlyPayment?: number;
    message: string;
  };
  interestPaid: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}