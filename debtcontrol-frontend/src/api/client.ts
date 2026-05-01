import axios from 'axios';
import type {
  Category,
  BankAccount,
  DebtTemplate,
  DebtInstance,
  Transaction,
  Upload,
  UploadTransaction,
  DashboardData,
  AnalyticsData,
  Settings,
} from '../types';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.error) {
      const { code, message } = error.response.data.error;
      const userMessage = message || 'An error occurred';
      return Promise.reject(new Error(`${code}: ${userMessage}`));
    }
    return Promise.reject(error);
  }
);

export const api = {
  dashboard: {
    get: async (): Promise<DashboardData> => {
      const { data } = await client.get('/dashboard');
      return data;
    },
  },

  analytics: {
    get: async (): Promise<AnalyticsData> => {
      const { data } = await client.get('/analytics');
      return data;
    },
  },

  debtTemplates: {
    getAll: async (): Promise<DebtTemplate[]> => {
      const { data } = await client.get('/debt-templates');
      return data;
    },
    getById: async (id: string): Promise<DebtTemplate> => {
      const { data } = await client.get(`/debt-templates/${id}`);
      return data;
    },
    create: async (template: Omit<DebtTemplate, 'id' | 'created_at'>): Promise<DebtTemplate> => {
      const { data } = await client.post('/debt-templates', template);
      return data;
    },
    update: async (id: string, template: Partial<DebtTemplate>): Promise<DebtTemplate> => {
      const { data } = await client.put(`/debt-templates/${id}`, template);
      return data;
    },
    delete: async (id: string): Promise<void> => {
      await client.delete(`/debt-templates/${id}`);
    },
    generate: async (): Promise<{ generated: number }> => {
      const { data } = await client.post('/debt-templates/generate');
      return data;
    },
  },

  debtInstances: {
    getAll: async (params?: {
      period?: string;
      status?: string;
      include_completed?: boolean;
    }): Promise<DebtInstance[]> => {
      const { data } = await client.get('/debt-instances', { params });
      return data;
    },
    update: async (id: string, updates: Partial<DebtInstance>): Promise<DebtInstance> => {
      const { data } = await client.patch(`/debt-instances/${id}`, updates);
      return data;
    },
    pay: async (id: string, amount: number, bankAccountId?: string, notes?: string): Promise<{
      instance: DebtInstance;
      transaction: Transaction;
    }> => {
      const { data } = await client.post(`/debt-instances/${id}/pay`, { amount, bank_account_id: bankAccountId, notes });
      return data;
    },
    markPaid: async (id: string): Promise<DebtInstance> => {
      const { data } = await client.post(`/debt-instances/${id}/mark-paid`);
      return data;
    },
  },

  transactions: {
    getAll: async (params?: {
      bank_id?: string;
      month?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }): Promise<Transaction[]> => {
      const { data } = await client.get('/transactions', { params });
      return data;
    },
    getById: async (id: string): Promise<Transaction> => {
      const { data } = await client.get(`/transactions/${id}`);
      return data;
    },
    create: async (transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> => {
      const { data } = await client.post('/transactions', transaction);
      return data;
    },
    delete: async (id: string): Promise<void> => {
      await client.delete(`/transactions/${id}`);
    },
  },

  bankAccounts: {
    getAll: async (): Promise<BankAccount[]> => {
      const { data } = await client.get('/bank-accounts');
      return data;
    },
    create: async (account: Omit<BankAccount, 'id' | 'created_at'>): Promise<BankAccount> => {
      const { data } = await client.post('/bank-accounts', account);
      return data;
    },
    update: async (id: string, account: Partial<BankAccount>): Promise<BankAccount> => {
      const { data } = await client.put(`/bank-accounts/${id}`, account);
      return data;
    },
    delete: async (id: string): Promise<void> => {
      await client.delete(`/bank-accounts/${id}`);
    },
  },

  categories: {
    getAll: async (): Promise<Category[]> => {
      const { data } = await client.get('/categories');
      return data;
    },
    create: async (category: Omit<Category, 'id' | 'created_at'>): Promise<Category> => {
      const { data } = await client.post('/categories', category);
      return data;
    },
    update: async (id: string, category: Partial<Category>): Promise<Category> => {
      const { data } = await client.put(`/categories/${id}`, category);
      return data;
    },
    delete: async (id: string): Promise<void> => {
      await client.delete(`/categories/${id}`);
    },
  },

  uploads: {
    getAll: async (): Promise<Upload[]> => {
      const { data } = await client.get('/uploads');
      return data;
    },
    getById: async (id: string): Promise<Upload> => {
      const { data } = await client.get(`/uploads/${id}`);
      return data;
    },
    upload: async (file: File): Promise<Upload> => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await client.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    delete: async (id: string): Promise<void> => {
      await client.delete(`/uploads/${id}`);
    },
    analyze: async (id: string): Promise<Upload> => {
      const { data } = await client.post(`/uploads/${id}/analyze`);
      return data;
    },
    getTransactions: async (id: string): Promise<UploadTransaction[]> => {
      const { data } = await client.get(`/uploads/${id}/transactions`);
      return data;
    },
  },

  uploadTransactions: {
    update: async (id: string, updates: Partial<UploadTransaction>): Promise<UploadTransaction> => {
      const { data } = await client.patch(`/upload-transactions/${id}`, updates);
      return data;
    },
    bulkAssign: async (ids: string[]): Promise<{ assigned: number }> => {
      const { data } = await client.post('/upload-transactions/bulk-assign', { ids });
      return data;
    },
    bulkCreate: async (ids: string[]): Promise<{ created: number; transactions: Transaction[] }> => {
      const { data } = await client.post('/upload-transactions/bulk-create', { ids });
      return data;
    },
  },

  ai: {
    chat: async (message: string, context?: { debts?: DebtInstance[]; transactions?: Transaction[] }): Promise<{ reply: string }> => {
      const { data } = await client.post('/ai/chat', { message, context });
      return data;
    },
    analyze: async (): Promise<{ report: string }> => {
      const { data } = await client.post('/ai/analyze');
      return data;
    },
    match: async (transaction: { amount: number; description: string; date: string }): Promise<{
      suggestions: { instance: DebtInstance; confidence: number }[];
    }> => {
      const { data } = await client.post('/ai/match', transaction);
      return data;
    },
  },

  settings: {
    get: async (): Promise<Settings> => {
      const { data } = await client.get('/settings');
      return data;
    },
    update: async (settings: Partial<Settings>): Promise<Settings> => {
      const { data } = await client.put('/settings', settings);
      return data;
    },
  },

  health: {
    check: async (): Promise<{ status: string; timestamp: string; uptime: number }> => {
      const { data } = await client.get('/health');
      return data;
    },
  },
};

export default client;