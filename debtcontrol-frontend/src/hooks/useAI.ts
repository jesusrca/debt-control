import { useCallback, useState } from 'react';
import { api } from '../api/client';
import type { DebtInstance, Transaction } from '../types';

interface ChatContext {
  debts?: DebtInstance[];
  transactions?: Transaction[];
}

export function useAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chat = useCallback(async (message: string, context?: ChatContext) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.ai.chat(message, context);
      return response.reply;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error en chat AI';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const analyze = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.ai.analyze();
      return response.report;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error en análisis AI';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const matchTransaction = useCallback(async (transaction: {
    amount: number;
    description: string;
    date: string;
  }) => {
    try {
      const response = await api.ai.match(transaction);
      return response.suggestions;
    } catch (err) {
      console.error('Match error:', err);
      return [];
    }
  }, []);

  return { chat, analyze, matchTransaction, isLoading, error };
}