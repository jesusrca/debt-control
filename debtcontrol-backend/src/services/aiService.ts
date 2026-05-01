import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '../db/index.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.minimax.io/anthropic',
});

interface CacheEntry {
  response: string;
  timestamp: number;
}

const chatCache = new Map<string, CacheEntry>();
const CHAT_CACHE_TTL = parseInt(process.env.AI_CHAT_CACHE_TTL_MS || '300000', 10);
const ANALYZE_CACHE_TTL = parseInt(process.env.AI_ANALYZE_CACHE_TTL_MS || '86400000', 10);
const MAX_CACHE_SIZE = 100;
const analyzeCache = new Map<string, CacheEntry>();

function getCacheKey(endpoint: string, params: Record<string, unknown>): string {
  return `${endpoint}:${JSON.stringify(params)}`;
}

function cleanExpiredCache(cache: Map<string, CacheEntry>, ttl: number): void {
  const now = Date.now();
  // Remove expired entries
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > ttl) {
      cache.delete(key);
    }
  }
  // Enforce max cache size by removing oldest entries
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = cache.size - MAX_CACHE_SIZE;
    for (let i = 0; i < toRemove; i++) {
      cache.delete(entries[i][0]);
    }
  }
}

export async function chatWithAI(
  message: string,
  context?: { debts?: unknown[]; recentTransactions?: unknown[] }
): Promise<string> {
  cleanExpiredCache(chatCache, CHAT_CACHE_TTL);

  const cacheKey = getCacheKey('chat', { message, context });
  const cached = chatCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CHAT_CACHE_TTL) {
    return cached.response;
  }

  let systemPrompt = `You are a helpful financial assistant for DebtControl, a personal debt tracking app. You help users understand their finances, answer questions about their debts, and provide recommendations. Be concise, friendly, and practical.`;

  if (context?.debts && context.debts.length > 0) {
    systemPrompt += `\n\nCurrent debts:\n${(context.debts as { name?: string; amount_due?: number; status?: string }[]).map(d =>
      `- ${d.name || 'Unknown'}: $${d.amount_due || 0} (${d.status || 'pending'})`
    ).join('\n')}`;
  }

  if (context?.recentTransactions && context.recentTransactions.length > 0) {
    systemPrompt += `\n\nRecent transactions:\n${(context.recentTransactions as { date?: string; amount?: number; notes?: string }[]).map(t =>
      `- ${t.date || 'Unknown'}: $${t.amount || 0}${t.notes ? ` (${t.notes})` : ''}`
    ).join('\n')}`;
  }

  try {
    const response = await anthropic.messages.create({
      model: 'MiniMax-M2.7',
      max_tokens: 1024,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        { role: 'user', content: message }
      ],
    });

    const textBlock = response.content.find((block) => block.type === 'text') as { type: string; text: string } | undefined;
    const text = textBlock?.text || 'No response';

    chatCache.set(cacheKey, { response: text, timestamp: Date.now() });

    return text;
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err.status === 429) {
      throw new Error('RATE_LIMITED: Too many requests. Please wait before trying again.');
    }
    throw error;
  }
}

export async function generateMonthlyReport(): Promise<string> {
  cleanExpiredCache(analyzeCache, ANALYZE_CACHE_TTL);

  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const cacheKey = getCacheKey('analyze', { month: monthStr });

  const cached = analyzeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < ANALYZE_CACHE_TTL) {
    return cached.response;
  }

  const db = getDb();

  const totalDebt = db.prepare(`
    SELECT COALESCE(SUM(amount_due - amount_paid), 0) as total
    FROM debt_instances
    WHERE status != 'paid'
  `).get() as { total: number };

  const totalPaid = db.prepare(`
    SELECT COALESCE(SUM(amount_paid), 0) as total
    FROM debt_instances
    WHERE status = 'paid'
  `).get() as { total: number };

  const monthlySpend = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE date LIKE ?
  `).get(monthStr + '%') as { total: number };

  const upcomingDebts = db.prepare(`
    SELECT dt.name, di.amount_due - di.amount_paid as amount, di.due_date
    FROM debt_instances di
    JOIN debt_templates dt ON di.template_id = dt.id
    WHERE di.status = 'pending'
    ORDER BY di.due_date ASC
    LIMIT 5
  `).all() as { name: string; amount: number; due_date: string }[];

  const systemPrompt = `You are a financial analyst for DebtControl. Generate a monthly financial report in markdown format. Include:
- Summary of total debt and payments
- Spending analysis
- Upcoming payments
- Recommendations

Be concise and practical.`;

  const userPrompt = `Generate a monthly report for ${now.toLocaleString('default', { month: 'long', year: 'numeric' })}.

Current stats:
- Total outstanding debt: $${totalDebt.total}
- Total paid all time: $${totalPaid.total}
- Spending this month: $${monthlySpend.total}
- Upcoming debts: ${upcomingDebts.length > 0 ? upcomingDebts.map(d => `${d.name} ($${d.amount} due ${d.due_date})`).join(', ') : 'None'}`;

  try {
    const response = await anthropic.messages.create({
      model: 'MiniMax-M2.7',
      max_tokens: 2048,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text') as { type: string; text: string } | undefined;
    const text = textBlock?.text || 'No report generated';

    analyzeCache.set(cacheKey, { response: text, timestamp: Date.now() });

    return text;
  } catch (error: unknown) {
    const err = error as { status?: number };
    if (err.status === 429) {
      throw new Error('RATE_LIMITED: Too many requests. Please wait before trying again.');
    }
    throw error;
  }
}

export interface MatchSuggestion {
  debtInstanceId: string;
  debtName: string;
  confidence: number;
  reason: string;
}

export async function matchTransactionToDebt(
  transactionDescription: string,
  transactionAmount: number,
  transactionDate?: string
): Promise<MatchSuggestion | null> {
  const db = getDb();

  const pendingDebts = db.prepare(`
    SELECT di.id, di.amount_due, di.amount_paid, di.due_date, dt.name, dt.frequency
    FROM debt_instances di
    JOIN debt_templates dt ON di.template_id = dt.id
    WHERE di.status = 'pending'
  `).all() as { id: string; amount_due: number; amount_paid: number; due_date: string; name: string; frequency: string }[];

  if (pendingDebts.length === 0) {
    return null;
  }

  let bestMatch: MatchSuggestion | null = null;
  let bestScore = 0;

  const normalizedDesc = transactionDescription.toLowerCase().trim();

  for (const debt of pendingDebts) {
    const normalizedName = debt.name.toLowerCase().trim();

    let nameScore = 0;
    if (normalizedName.includes(normalizedDesc) || normalizedDesc.includes(normalizedName)) {
      nameScore = 1;
    } else {
      const words = normalizedName.split(' ').filter(w => w.length > 2);
      const matches = words.filter(w => normalizedDesc.includes(w)).length;
      nameScore = words.length > 0 ? matches / words.length : 0;
    }

    const amountScore = transactionAmount === debt.amount_due ? 1 :
      1 - Math.abs(transactionAmount - debt.amount_due) / debt.amount_due;

    let dateScore = 0;
    if (transactionDate && debt.due_date) {
      const txnDate = new Date(transactionDate);
      const dueDate = new Date(debt.due_date);
      const daysDiff = Math.abs((txnDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 5) dateScore = 1;
      else if (daysDiff <= 10) dateScore = 0.5;
    }

    const totalScore = (nameScore * 0.5) + (amountScore * 0.3) + (dateScore * 0.2);

    if (totalScore > bestScore && totalScore >= 0.4) {
      bestScore = totalScore;
      bestMatch = {
        debtInstanceId: debt.id,
        debtName: debt.name,
        confidence: Math.round(totalScore * 100),
        reason: `Name match: ${Math.round(nameScore * 100)}%, Amount match: ${Math.round(amountScore * 100)}%, Date match: ${Math.round(dateScore * 100)}%`,
      };
    }
  }

  return bestMatch;
}

export function clearAICaches(): void {
  chatCache.clear();
  analyzeCache.clear();
}