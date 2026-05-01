import { useEffect, useState, useCallback } from 'react';
import { useDashboardStore, useDebtStore } from '../store';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BottomNav, TopNav } from '../components/Layout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Brain, TrendingUp, Calendar, CreditCard } from 'lucide-react';

export function AnalyticsPage() {
  const { dashboard, analytics, fetchDashboard, fetchAnalytics } = useDashboardStore();
  const { fetchInstances } = useDebtStore();
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const loadData = useCallback(() => {
    fetchDashboard();
    fetchAnalytics();
    fetchInstances({ include_completed: true });
  }, [fetchDashboard, fetchAnalytics, fetchInstances]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerateReport = async () => {
    setIsAiLoading(true);
    try {
      const { api } = await import('../api/client');
      const response = await api.ai.analyze();
      setAiReport(response.report);
    } catch (err) {
      console.error('AI analyze error:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const totalDebt = dashboard?.totalDebt || 0;
  const totalPaid = dashboard?.totalPaid || 0;

  const barChartData = analytics?.monthlySpending?.map(item => ({
    month: item.month.slice(0, 3),
    amount: item.amount,
  })) || [];

  const categoryData = analytics?.categoryDistribution?.map(item => ({
    name: item.category,
    value: item.amount,
    color: item.color,
  })) || [];

  const debtFreeDate = analytics?.debtProjection?.debtFreeDate
    ? format(parseISO(analytics.debtProjection.debtFreeDate), "d 'de' MMMM, yyyy", { locale: es })
    : dashboard?.nextPayment?.debt?.due_date
    ? format(parseISO(dashboard.nextPayment.debt.due_date), "d 'de' MMMM, yyyy", { locale: es })
    : 'No definido';

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <TopNav />
      <main className="p-4 pb-24 space-y-4 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-6">
          <div className="hidden lg:block lg:w-64 flex-shrink-0">
            <div className="sticky top-4 space-y-4">
              <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">Filtros</h3>
              <Card padding="md">
                <p className="text-xs text-[var(--color-text-secondary)] mb-2">Período</p>
                <select className="w-full h-10 px-3 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)]">
                  <option>Últimos 6 meses</option>
                  <option>Último año</option>
                </select>
              </Card>
              <Card padding="md">
                <p className="text-xs text-[var(--color-text-secondary)] mb-2">Categoría</p>
                <select className="w-full h-10 px-3 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)]">
                  <option>Todas</option>
                </select>
              </Card>
            </div>
          </div>
          <div className="flex-1 space-y-4">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Analytics</h1>

            <Card padding="md" className="hover-lift">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-[var(--color-primary)]" />
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Gasto Mensual (Últimos 6 meses)</p>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-text-secondary)" fontSize={12} />
                <YAxis stroke="var(--color-text-secondary)" fontSize={12} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-primary)',
                  }}
                />
                <Bar dataKey="amount" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card padding="md" className="hover-lift">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-[var(--color-primary)]" />
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Distribución por Categoría</p>
          </div>
          <div className="h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card padding="md" className="hover-glow cursor-pointer">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-[var(--color-success)]" />
              <p className="text-xs text-[var(--color-text-secondary)]">Próximo Pago</p>
            </div>
            <p className="text-lg font-bold text-[var(--color-text-primary)]">{debtFreeDate}</p>
{dashboard?.nextPayment && (
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                {dashboard.nextPayment.debt?.template?.name || 'Próximo pago programado'}
              </p>
            )}
            {!dashboard?.nextPayment && (
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">Sin pagos programados</p>
            )}
          </Card>

          <Card padding="md" className="hover-lift cursor-pointer">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[var(--color-warning)]" />
              <p className="text-xs text-[var(--color-text-secondary)]">Total Pagado</p>
            </div>
            <p className="text-lg font-bold text-[var(--color-success)]">${totalPaid.toFixed(2)}</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">De ${totalDebt.toFixed(2)} total</p>
          </Card>
        </div>

        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-[var(--color-primary)]" />
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Informe AI</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              isLoading={isAiLoading}
              onClick={handleGenerateReport}
            >
              Generar
            </Button>
          </div>
          {aiReport && (
            <div className="bg-[var(--color-surface-elevated)] rounded-lg p-4 text-sm text-[var(--color-text-primary)] whitespace-pre-wrap">
              {aiReport}
            </div>
          )}
          {!aiReport && !isAiLoading && (
            <p className="text-xs text-[var(--color-text-secondary)]">
              Genera un informe narrativo con análisis de tus deudas y recomendaciones.
            </p>
          )}
        </Card>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}