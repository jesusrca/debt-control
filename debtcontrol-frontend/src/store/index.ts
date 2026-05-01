import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DebtTemplate,
  DebtInstance,
  Transaction,
  BankAccount,
  Category,
  Upload,
  DashboardData,
  AnalyticsData,
  Settings,
} from '../types';
import { api } from '../api/client';
import {
  getCache,
  setCache,
  isCacheFresh,
  invalidateCache,
  cacheKeys,
} from '../utils/cache';

type TransactionListResponse = Transaction[] | { data: Transaction[]; total: number };

interface OfflineQueueItem {
  id: string;
  type: 'payDebt' | 'createTransaction' | 'markPaid';
  payload: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

interface DebtState {
  templates: DebtTemplate[];
  instances: DebtInstance[];
  isLoading: boolean;
  error: string | null;
  pendingIds: Set<string>;
  fetchTemplates: () => Promise<void>;
  fetchInstances: (params?: { period?: string; status?: string; include_completed?: boolean }) => Promise<void>;
  createTemplate: (template: Omit<DebtTemplate, 'id' | 'created_at'>) => Promise<DebtTemplate>;
  updateTemplate: (id: string, updates: Partial<DebtTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  payDebt: (instanceId: string, amount: number, bankAccountId?: string, notes?: string) => Promise<DebtInstance>;
  markPaid: (instanceId: string) => Promise<void>;
  generateInstances: () => Promise<number>;
}

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  pendingIds: Set<string>;
  hasMore: boolean;
  offset: number;
  limit: number;
  fetchTransactions: (params?: { bank_id?: string; month?: string; search?: string; limit?: number; offset?: number }) => Promise<void>;
  loadMoreTransactions: () => Promise<void>;
  createTransaction: (transaction: Omit<Transaction, 'id' | 'created_at'>) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
}

interface BankAccountState {
  bankAccounts: BankAccount[];
  isLoading: boolean;
  error: string | null;
  fetchBankAccounts: () => Promise<void>;
  createBankAccount: (account: Omit<BankAccount, 'id' | 'created_at'>) => Promise<BankAccount>;
  updateBankAccount: (id: string, updates: Partial<BankAccount>) => Promise<void>;
  deleteBankAccount: (id: string) => Promise<void>;
}

interface CategoryState {
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  fetchCategories: () => Promise<void>;
  createCategory: (category: Omit<Category, 'id' | 'created_at'>) => Promise<Category>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

interface UploadState {
  uploads: Upload[];
  isLoading: boolean;
  error: string | null;
  fetchUploads: () => Promise<void>;
  uploadFile: (file: File) => Promise<Upload>;
  deleteUpload: (id: string) => Promise<void>;
  analyzeUpload: (id: string) => Promise<Upload>;
}

interface DashboardState {
  dashboard: DashboardData | null;
  analytics: AnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  fetchDashboard: () => Promise<void>;
  fetchAnalytics: () => Promise<void>;
}

interface SettingsState {
  settings: Settings;
  isLoading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
  toggleDarkMode: () => void;
}

interface UIState {
  theme: 'dark' | 'light';
  toasts: { id: string; message: string; type: 'success' | 'error' | 'info' }[];
  offlineQueue: OfflineQueueItem[];
  isOnline: boolean;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  addToOfflineQueue: (item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>) => void;
  removeFromOfflineQueue: (id: string) => void;
  markQueueItemFailed: (id: string, error: string) => void;
  syncOfflineQueue: () => Promise<void>;
  setOnline: (online: boolean) => void;
}

const OFFLINE_QUEUE_KEY = 'debtcontrol-offline-queue';

export const useDebtStore = create<DebtState>((set, get) => ({
  templates: [],
  instances: [],
  isLoading: false,
  error: null,
  pendingIds: new Set(),

  fetchTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      const templates = await api.debtTemplates.getAll();
      set({ templates, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchInstances: async (params) => {
    if (isCacheFresh(cacheKeys.debtInstances)) {
      const cached = getCache<DebtInstance[]>(cacheKeys.debtInstances);
      if (cached) {
        set({ instances: cached.data, isLoading: false });
        return;
      }
    }
    set({ isLoading: true, error: null });
    try {
      const instances = await api.debtInstances.getAll(params);
      setCache(cacheKeys.debtInstances, instances);
      set({ instances, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  createTemplate: async (template) => {
    set({ isLoading: true, error: null });
    try {
      const created = await api.debtTemplates.create(template);
      set((state) => ({ templates: [...state.templates, created], isLoading: false }));
      return created;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  updateTemplate: async (id, updates) => {
    try {
      const updated = await api.debtTemplates.update(id, updates);
      set((state) => ({
        templates: state.templates.map((t) => (t.id === id ? updated : t)),
      }));
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    }
  },

  deleteTemplate: async (id) => {
    try {
      await api.debtTemplates.delete(id);
      set((state) => ({
        templates: state.templates.filter((t) => t.id !== id),
      }));
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    }
  },

  payDebt: async (instanceId, amount, bankAccountId, notes) => {
    const tempInstance = get().instances.find(i => i.id === instanceId);
    if (tempInstance) {
      const optimisticInstance: DebtInstance = {
        ...tempInstance,
        amount_paid: tempInstance.amount_paid + amount,
        status: tempInstance.amount_paid + amount >= tempInstance.amount_due ? 'paid' : tempInstance.status,
        paid_at: tempInstance.amount_paid + amount >= tempInstance.amount_due ? new Date().toISOString() : tempInstance.paid_at,
      };
      set(state => ({
        instances: state.instances.map(i => i.id === instanceId ? optimisticInstance : i),
        pendingIds: new Set([...state.pendingIds, instanceId]),
      }));
    }
    try {
      const { instance } = await api.debtInstances.pay(instanceId, amount, bankAccountId, notes);
      set(state => ({
        instances: state.instances.map(i => i.id === instanceId ? instance : i),
        pendingIds: new Set([...state.pendingIds].filter(id => id !== instanceId)),
      }));
      invalidateCache(cacheKeys.dashboard);
      invalidateCache(cacheKeys.debtInstances);
      invalidateCache(cacheKeys.transactions);
      return instance;
    } catch (err) {
      const existingInstance = get().instances.find(i => i.id === instanceId);
      const rollbackInstance = tempInstance ?? existingInstance;
      set(state => ({
        instances: state.instances.map(i => i.id === instanceId && rollbackInstance ? rollbackInstance : i),
        pendingIds: new Set([...state.pendingIds].filter(id => id !== instanceId)),
      }));
      useUIStore.getState().addToast('Error al registrar pago', 'error');
      throw err;
    }
  },

  markPaid: async (instanceId) => {
    const tempInstance = get().instances.find(i => i.id === instanceId);
    if (tempInstance) {
      const optimisticInstance: DebtInstance = {
        ...tempInstance,
        status: 'paid',
        paid_at: new Date().toISOString(),
        amount_paid: tempInstance.amount_due,
      };
      set(state => ({
        instances: state.instances.map(i => i.id === instanceId ? optimisticInstance : i),
        pendingIds: new Set([...state.pendingIds, instanceId]),
      }));
    }
    try {
      const instance = await api.debtInstances.markPaid(instanceId);
      set(state => ({
        instances: state.instances.map(i => i.id === instanceId ? instance : i),
        pendingIds: new Set([...state.pendingIds].filter(id => id !== instanceId)),
      }));
      invalidateCache(cacheKeys.dashboard);
      invalidateCache(cacheKeys.debtInstances);
      invalidateCache(cacheKeys.transactions);
    } catch (err) {
      const existingInstance = get().instances.find(i => i.id === instanceId);
      const rollbackInstance = tempInstance ?? existingInstance;
      set(state => ({
        instances: state.instances.map(i => i.id === instanceId && rollbackInstance ? rollbackInstance : i),
        pendingIds: new Set([...state.pendingIds].filter(id => id !== instanceId)),
      }));
      useUIStore.getState().addToast('Error al marcar como pagada', 'error');
      throw err;
    }
  },

  generateInstances: async () => {
    const { generated } = await api.debtTemplates.generate();
    await get().fetchInstances();
    return generated;
  },
}));

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  isLoading: false,
  error: null,
  pendingIds: new Set(),
  hasMore: true,
  offset: 0,
  limit: 20,

  fetchTransactions: async (params) => {
    set({ isLoading: true, error: null, offset: 0, transactions: [] });
    try {
      const limit = params?.limit ?? get().limit;
      const result = await api.transactions.getAll({ ...params, limit, offset: 0 }) as TransactionListResponse;
      const isArray = Array.isArray(result);
      const txns = isArray ? result : result.data;
      const total = isArray ? txns.length : result.total ?? txns.length;
      set({
        transactions: txns,
        isLoading: false,
        offset: txns.length,
        hasMore: txns.length < total,
      });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  loadMoreTransactions: async () => {
    const { hasMore, isLoading, offset, limit, transactions } = get();
    if (!hasMore || isLoading) return;
    set({ isLoading: true });
    try {
      const result = await api.transactions.getAll({ limit, offset }) as TransactionListResponse;
      const isArray = Array.isArray(result);
      const newTxns = isArray ? result : result.data;
      const total = isArray ? transactions.length + newTxns.length : result.total ?? transactions.length + newTxns.length;
      set(state => ({
        transactions: [...state.transactions, ...newTxns],
        isLoading: false,
        offset: state.offset + newTxns.length,
        hasMore: state.offset + newTxns.length < total,
      }));
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  createTransaction: async (transaction) => {
    const tempTransaction: Transaction = {
      ...transaction,
      id: `temp-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    set(state => ({
      transactions: [tempTransaction, ...state.transactions],
      pendingIds: new Set([...state.pendingIds, tempTransaction.id]),
    }));
    try {
      const created = await api.transactions.create(transaction);
      set(state => ({
        transactions: state.transactions.map(t => t.id === tempTransaction.id ? created : t).filter(t => t.id !== tempTransaction.id),
        pendingIds: new Set([...state.pendingIds].filter(id => id !== tempTransaction.id)),
      }));
      return created;
    } catch (err) {
      set(state => ({
        transactions: state.transactions.filter(t => t.id !== tempTransaction.id),
        pendingIds: new Set([...state.pendingIds].filter(id => id !== tempTransaction.id)),
      }));
      throw err;
    }
  },

  deleteTransaction: async (id) => {
    await api.transactions.delete(id);
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    }));
  },
}));

export const useBankAccountStore = create<BankAccountState>((set) => ({
  bankAccounts: [],
  isLoading: false,
  error: null,

  fetchBankAccounts: async () => {
    set({ isLoading: true, error: null });
    try {
      const bankAccounts = await api.bankAccounts.getAll();
      set({ bankAccounts, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  createBankAccount: async (account) => {
    const created = await api.bankAccounts.create(account);
    set((state) => ({ bankAccounts: [...state.bankAccounts, created] }));
    return created;
  },

  updateBankAccount: async (id, updates) => {
    const updated = await api.bankAccounts.update(id, updates);
    set((state) => ({
      bankAccounts: state.bankAccounts.map((a) => (a.id === id ? updated : a)),
    }));
  },

  deleteBankAccount: async (id) => {
    await api.bankAccounts.delete(id);
    set((state) => ({
      bankAccounts: state.bankAccounts.filter((a) => a.id !== id),
    }));
  },
}));

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  isLoading: false,
  error: null,

  fetchCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      const categories = await api.categories.getAll();
      set({ categories, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  createCategory: async (category) => {
    const created = await api.categories.create(category);
    set((state) => ({ categories: [...state.categories, created] }));
    return created;
  },

  updateCategory: async (id, updates) => {
    const updated = await api.categories.update(id, updates);
    set((state) => ({
      categories: state.categories.map((c) => (c.id === id ? updated : c)),
    }));
  },

  deleteCategory: async (id) => {
    await api.categories.delete(id);
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
    }));
  },
}));

export const useUploadStore = create<UploadState>((set) => ({
  uploads: [],
  isLoading: false,
  error: null,

  fetchUploads: async () => {
    set({ isLoading: true, error: null });
    try {
      const uploads = await api.uploads.getAll();
      set({ uploads, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  uploadFile: async (file) => {
    const uploaded = await api.uploads.upload(file);
    set((state) => ({ uploads: [uploaded, ...state.uploads] }));
    return uploaded;
  },

  deleteUpload: async (id) => {
    await api.uploads.delete(id);
    set((state) => ({
      uploads: state.uploads.filter((u) => u.id !== id),
    }));
  },

  analyzeUpload: async (id) => {
    const updated = await api.uploads.analyze(id);
    set((state) => ({
      uploads: state.uploads.map((u) => (u.id === id ? updated : u)),
    }));
    return updated;
  },
}));

export const useDashboardStore = create<DashboardState>((set) => ({
  dashboard: null,
  analytics: null,
  isLoading: false,
  error: null,

  fetchDashboard: async () => {
    if (isCacheFresh(cacheKeys.dashboard)) {
      const cached = getCache<DashboardData>(cacheKeys.dashboard);
      if (cached) {
        set({ dashboard: cached.data, isLoading: false });
        return;
      }
    }
    set({ isLoading: true, error: null });
    try {
      const dashboard = await api.dashboard.get();
      setCache(cacheKeys.dashboard, dashboard);
      set({ dashboard, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchAnalytics: async () => {
    if (isCacheFresh(cacheKeys.analytics, 24 * 60 * 60 * 1000)) {
      const cached = getCache<AnalyticsData>(cacheKeys.analytics);
      if (cached) {
        set({ analytics: cached.data, isLoading: false });
        return;
      }
    }
    set({ isLoading: true, error: null });
    try {
      const analytics = await api.analytics.get();
      setCache(cacheKeys.analytics, analytics, 24 * 60 * 60 * 1000);
      set({ analytics, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },
}));

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: {
        currency: 'USD',
        darkMode: false,
        aiEnabled: true,
      },
      isLoading: false,
      error: null,

      fetchSettings: async () => {
        set({ isLoading: true, error: null });
        try {
          const settings = await api.settings.get();
          set({ settings: { ...get().settings, ...settings }, isLoading: false });
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
        }
      },

      updateSettings: async (updates) => {
        const updated = await api.settings.update(updates);
        set({ settings: { ...get().settings, ...updated } });
      },

      toggleDarkMode: () => {
        const newMode = !get().settings.darkMode;
        set({ settings: { ...get().settings, darkMode: newMode } });
        get().updateSettings({ darkMode: newMode });
      },
    }),
    {
      name: 'debtcontrol-settings',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);

export const useUIStore = create<UIState>((set, get) => {
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => get().syncOfflineQueue());
    window.addEventListener('offline', () => set({ isOnline: false }));
  }
  return {
    theme: 'dark',
    toasts: [],
    offlineQueue: JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]'),
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,

    addToast: (message, type) => {
      const id = Date.now().toString();
      set((state) => ({
        toasts: [...state.toasts, { id, message, type }],
      }));
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, 4000);
    },

    removeToast: (id) => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    },

    addToOfflineQueue: (item) => {
      const queueItem: OfflineQueueItem = {
        ...item,
        id: Date.now().toString(),
        timestamp: Date.now(),
        retryCount: 0,
      };
      set((state) => {
        const newQueue = [...state.offlineQueue, queueItem];
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(newQueue));
        return { offlineQueue: newQueue };
      });
    },

    removeFromOfflineQueue: (id) => {
      set((state) => {
        const newQueue = state.offlineQueue.filter((item) => item.id !== id);
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(newQueue));
        return { offlineQueue: newQueue };
      });
    },

    markQueueItemFailed: (id, error) => {
      set((state) => {
        const newQueue = state.offlineQueue.map((item) =>
          item.id === id ? { ...item, lastError: error } : item
        );
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(newQueue));
        return { offlineQueue: newQueue };
      });
    },

    syncOfflineQueue: async () => {
      const { offlineQueue, removeFromOfflineQueue, addToast, markQueueItemFailed } = get();
      if (offlineQueue.length === 0) return;
      set({ isOnline: true });
      const MAX_RETRIES = 3;
      const pendingItems = offlineQueue.filter((item) => !item.lastError);
      const failedItems = offlineQueue.filter((item) => item.lastError);

      for (const item of pendingItems) {
        try {
          if (item.type === 'payDebt') {
            const { api } = await import('../api/client');
            await api.debtInstances.pay(
              item.payload.instanceId as string,
              item.payload.amount as number,
              item.payload.bankAccountId as string | undefined,
              item.payload.notes as string | undefined
            );
          } else if (item.type === 'createTransaction') {
            const { api } = await import('../api/client');
            await api.transactions.create(item.payload as Omit<Transaction, 'id' | 'created_at'>);
          } else if (item.type === 'markPaid') {
            const { api } = await import('../api/client');
            await api.debtInstances.markPaid(item.payload.instanceId as string);
          }
          removeFromOfflineQueue(item.id);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          const newRetryCount = item.retryCount + 1;
          if (newRetryCount < MAX_RETRIES) {
            markQueueItemFailed(item.id, errorMsg);
            const backoffMs = Math.pow(2, item.retryCount) * 1000;
            setTimeout(() => {
              const { offlineQueue: currentQueue } = get();
              const currentItem = currentQueue.find((q) => q.id === item.id);
              if (currentItem && currentItem.retryCount < MAX_RETRIES) {
                set((state) => ({
                  offlineQueue: state.offlineQueue.map((q) =>
                    q.id === item.id ? { ...q, retryCount: newRetryCount, lastError: undefined } : q
                  ),
                }));
                get().syncOfflineQueue();
              }
            }, backoffMs);
          } else {
            markQueueItemFailed(item.id, `Max retries reached: ${errorMsg}`);
            addToast(`Error al sincronizar: ${item.type} falló tras ${MAX_RETRIES} intentos`, 'error');
          }
        }
      }
      const remainingCount = pendingItems.length - offlineQueue.filter((i) => i.lastError && i.retryCount >= MAX_RETRIES).length;
      if (remainingCount === 0 && failedItems.length === 0) {
        addToast('Cambios sincronizados', 'success');
      }
    },

    setOnline: (online) => set({ isOnline: online }),
  };
});