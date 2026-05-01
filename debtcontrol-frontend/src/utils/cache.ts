const CACHE_PREFIX = 'dc-cache-';
const DEFAULT_TTL = 5 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export function getCache<T>(key: string): { data: T; age: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);
    const age = Date.now() - entry.timestamp;
    return { data: entry.data, age };
  } catch {
    return null;
  }
}

export function setCache<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

export function isCacheFresh(key: string, customTTL?: number): boolean {
  const cached = getCache<unknown>(key);
  if (!cached) return false;
  const ttl = customTTL || DEFAULT_TTL;
  return cached.age < ttl;
}

export function invalidateCache(key: string): void {
  localStorage.removeItem(CACHE_PREFIX + key);
}

export function invalidateCachePattern(pattern: string): void {
  const keys = Object.keys(localStorage).filter(
    (k) => k.startsWith(CACHE_PREFIX) && k.includes(pattern)
  );
  keys.forEach((k) => localStorage.removeItem(k));
}

export function getLastUpdatedLabel(key: string): string | null {
  const cached = getCache<unknown>(key);
  if (!cached) return null;

  const minutes = Math.floor(cached.age / 60000);
  if (minutes < 1) return 'Hace menos de un minuto';
  if (minutes === 1) return 'Hace 1 minuto';
  if (minutes < 60) return `Hace ${minutes} minutos`;

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return 'Hace 1 hora';
  if (hours < 24) return `Hace ${hours} horas`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'Hace 1 día';
  return `Hace ${days} días`;
}

export const cacheKeys = {
  dashboard: 'dashboard',
  analytics: 'analytics',
  debtInstances: 'debt-instances',
  debtTemplates: 'debt-templates',
  transactions: 'transactions',
  bankAccounts: 'bank-accounts',
  categories: 'categories',
  uploads: 'uploads',
  settings: 'settings',
};
