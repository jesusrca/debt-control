import { useEffect, useState, useCallback } from 'react';
import { useDashboardStore, useDebtStore } from '../store';
import type { DebtInstance } from '../types';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { BottomNav, TopNav } from '../components/Layout';
import { DebtCard } from '../components/DebtCard';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Wallet, MessageCircle } from 'lucide-react';

export function DashboardPage() {
  const { dashboard, fetchDashboard, isLoading } = useDashboardStore();
  const { fetchInstances } = useDebtStore();
  const [aiMessage, setAiMessage] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const loadData = useCallback(() => {
    fetchDashboard();
    fetchInstances({ status: 'pending', include_completed: false });
  }, [fetchDashboard, fetchInstances]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePayDebt = (debt: DebtInstance) => {
    console.log('Pay debt:', debt);
  };

  const handleAiChat = async () => {
    if (!aiMessage.trim()) return;
    setIsAiLoading(true);
    try {
      const { api } = await import('../api/client');
      const response = await api.ai.chat(aiMessage, {
        debts: dashboard?.upcomingDebts,
        transactions: dashboard?.recentTransactions,
      });
      setAiResponse(response.reply);
      setAiMessage('');
    } catch (err) {
      console.error('AI chat error:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  if (isLoading && !dashboard) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <TopNav />
        <main className="p-4 pb-24 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 skeleton rounded-xl" />
            ))}
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <TopNav />
      <main className="p-4 pb-24 space-y-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card variant="default" padding="md" className="hover-glow cursor-pointer">
            <p className="text-xs text-[var(--color-text-secondary)] mb-1">Total Deuda</p>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">
              ${dashboard?.totalDebt.toFixed(2) || '0.00'}
            </p>
            <div className="h-1.5 bg-[var(--color-surface-elevated)] rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-[var(--color-primary)] rounded-full progress-stripe"
                style={{ width: `${dashboard ? (dashboard.totalPaid / dashboard.totalDebt) * 100 : 0}%` }}
              />
            </div>
          </Card>

          <Card variant="default" padding="md" className="hover-lift cursor-pointer">
            <p className="text-xs text-[var(--color-text-secondary)] mb-1">Pagado Este Mes</p>
            <p className="text-2xl font-bold text-[var(--color-success)]">
              ${dashboard?.totalPaid.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-[var(--color-success)] mt-1">+12% vs mes anterior</p>
          </Card>

          <Card variant="default" padding="md" className="hover-lift cursor-pointer">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-[var(--color-warning)]" />
              <p className="text-xs text-[var(--color-text-secondary)]">Próximo Pago</p>
            </div>
            {dashboard?.nextPayment ? (
              <>
                <p className="text-lg font-bold text-[var(--color-text-primary)]">
                  ${dashboard.nextPayment.debt.amount_due.toFixed(2)}
                </p>
                <Badge variant="warning" className="mt-2">
                  ⚠ {dashboard.nextPayment.daysUntil === 0 ? 'Hoy' : `${dashboard.nextPayment.daysUntil} días`}
                </Badge>
              </>
            ) : (
              <p className="text-sm text-[var(--color-text-secondary)]">Sin pagos próximos</p>
            )}
          </Card>

          <Card variant="default" padding="md" className="hover-lift cursor-pointer">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-[var(--color-primary)]" />
              <p className="text-xs text-[var(--color-text-secondary)]">Gasto Mensual</p>
            </div>
            <p className="text-lg font-bold text-[var(--color-text-primary)]">
              ${dashboard?.monthlySpend.toFixed(2) || '0.00'}
            </p>
          </Card>
        </div>

        {dashboard?.nextPayment && (
          <div
            className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5 animate-fade-in-up card-enter"
            style={{ borderLeft: '3px solid #FFAB00' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Próximo Pago</p>
              <Badge variant="warning">
                ⚠ {dashboard.nextPayment.daysUntil === 0 ? 'Hoy' : `${dashboard.nextPayment.daysUntil} días`}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--color-primary-muted)] rounded-lg flex items-center justify-center">
                <span className="text-[var(--color-primary)] text-lg">💳</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  {dashboard.nextPayment.debt.template?.name || 'Deuda'}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {format(parseISO(dashboard.nextPayment.debt.due_date), "d 'de' MMMM, yyyy", { locale: es })}
                </p>
              </div>
              <p className="text-lg font-bold text-[var(--color-primary)]">
                ${dashboard.nextPayment.debt.amount_due.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:gap-4">
          {dashboard?.upcomingDebts && dashboard.upcomingDebts.length > 0 && (
            <section className="lg:w-1/2 space-y-3">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Próximas Deudas</h2>
              {dashboard.upcomingDebts.slice(0, 5).map((debt) => (
                <DebtCard
                  key={debt.id}
                  debt={debt}
                  onPay={handlePayDebt}
                  onClick={() => {}}
                />
              ))}
            </section>
          )}

          {dashboard?.recentTransactions && dashboard.recentTransactions.length > 0 && (
            <section className="lg:w-1/2 space-y-3">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Transacciones Recientes</h2>
              <Card padding="md">
                <div className="space-y-3">
                  {dashboard.recentTransactions.slice(0, 5).map((txn) => (
                    <div key={txn.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: txn.bank_account?.color || '#6366F1' }}
                        />
                        <div>
                          <p className="text-sm text-[var(--color-text-primary)]">{txn.notes || 'Pago'}</p>
                          <p className="text-xs text-[var(--color-text-secondary)]">
                            {format(parseISO(txn.date), "d 'de' MMM", { locale: es })}
                          </p>
                        </div>
                      </div>
                      <p className={`text-sm font-semibold ${txn.amount < 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`}>
                        {txn.amount < 0 ? '-' : '+'}${Math.abs(txn.amount).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          )}
        </div>

        <Card padding="md" className="animate-fade-in-up">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5 text-[var(--color-primary)]" />
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Asistente AI</p>
          </div>
          {aiResponse && (
            <div className="bg-[var(--color-surface-elevated)] rounded-lg p-3 mb-4 text-sm text-[var(--color-text-primary)] whitespace-pre-wrap">
              {aiResponse}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Pregunta sobre tus deudas..."
              value={aiMessage}
              onChange={(e) => setAiMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAiChat()}
              className="flex-1 h-11 px-4 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-all"
            />
            <button
              onClick={handleAiChat}
              disabled={isAiLoading || !aiMessage.trim()}
              className="w-11 h-11 bg-[var(--color-primary)] text-white rounded-lg flex items-center justify-center hover:bg-[var(--color-primary-hover)] transition-all btn-ripple click-scale disabled:opacity-50"
            >
              {isAiLoading ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </Card>
      </main>
      <BottomNav />
    </div>
  );
}