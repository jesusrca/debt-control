import { useEffect, useState, useRef, useCallback } from 'react';
import { useDebtStore, useCategoryStore } from '../store';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { BottomNav, TopNav } from '../components/Layout';
import { DebtCard } from '../components/DebtCard';
import { Plus, Check, LayoutGrid, List } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DebtInstance } from '../types';

type TabType = 'active' | 'completed';

interface SwipeableDebtCardProps {
  debt: DebtInstance;
  onPay: (debt: DebtInstance) => void;
  onMarkPaid: (debt: DebtInstance) => void;
  onClick: (debt: DebtInstance) => void;
  isPending?: boolean;
}

function SwipeableDebtCard({ debt, onPay, onMarkPaid, onClick, isPending }: SwipeableDebtCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const touchStartX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.touches[0].clientX;
    if (diff > 0) {
      setTranslateX(Math.min(diff, 80));
    }
  };

  const handleTouchEnd = () => {
    if (translateX > 60) {
      onMarkPaid(debt);
    }
    setTranslateX(0);
  };

  return (
    <div className="relative overflow-hidden">
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-[var(--color-success)] w-20"
        style={{ opacity: Math.min(translateX / 60, 1) }}
      >
        <Check className="w-6 h-6 text-white" />
      </div>
      <div
        className="relative bg-[var(--color-bg)] transition-transform duration-200"
        style={{ transform: `translateX(-${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <DebtCard debt={debt} onPay={onPay} onClick={onClick} />
        {isPending && (
          <div className="absolute inset-0 bg-[var(--color-primary)]/10 animate-pulse" />
        )}
      </div>
    </div>
  );
}

export function DebtsPage() {
  const { instances, templates, fetchInstances, fetchTemplates, createTemplate, payDebt, markPaid, pendingIds } = useDebtStore();
  const { categories, fetchCategories } = useCategoryStore();

  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showNewDebtModal, setShowNewDebtModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DebtInstance | null>(null);
  const [payAmount, setPayAmount] = useState('');

  const [newDebtForm, setNewDebtForm] = useState({
    name: '',
    amount: '',
    frequency: 'monthly' as 'weekly' | 'monthly' | 'annual',
    due_day: '',
    category_id: '',
    bank_account_id: '',
    notes: '',
  });

  const loadData = useCallback(() => {
    fetchInstances({ include_completed: activeTab === 'completed' });
    fetchTemplates();
    fetchCategories();
  }, [activeTab, fetchInstances, fetchTemplates, fetchCategories]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePayClick = (debt: DebtInstance) => {
    setSelectedDebt(debt);
    setPayAmount((debt.amount_due - debt.amount_paid).toFixed(2));
    setShowPayModal(true);
  };

  const handlePaySubmit = async () => {
    if (!selectedDebt || !payAmount) return;
    try {
      await payDebt(selectedDebt.id, parseFloat(payAmount));
      setShowPayModal(false);
      setSelectedDebt(null);
      setPayAmount('');
    } catch (err) {
      console.error('Pay error:', err);
    }
  };

  const handleMarkPaid = async (debt: DebtInstance) => {
    try {
      await markPaid(debt.id);
    } catch (err) {
      console.error('Mark paid error:', err);
    }
  };

  const handleCreateDebt = async () => {
    if (!newDebtForm.name || !newDebtForm.amount) return;
    try {
      await createTemplate({
        name: newDebtForm.name,
        amount: parseFloat(newDebtForm.amount),
        interest_rate: 0,
        frequency: newDebtForm.frequency,
        due_day: newDebtForm.due_day ? parseInt(newDebtForm.due_day) : null,
        due_weekday: null,
        category_id: newDebtForm.category_id || null,
        bank_account_id: newDebtForm.bank_account_id || null,
        notes: newDebtForm.notes || null,
        is_active: 1,
      });
      setShowNewDebtModal(false);
      setNewDebtForm({
        name: '', amount: '', frequency: 'monthly', due_day: '',
        category_id: '', bank_account_id: '', notes: '',
      });
    } catch (err) {
      console.error('Create error:', err);
    }
  };

  const filteredInstances = instances.filter(i => {
    if (activeTab === 'completed') return i.status === 'paid';
    return i.status !== 'paid';
  });

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <TopNav />
      <main className="p-4 pb-24 space-y-4 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex gap-2 p-1 bg-[var(--color-surface)] rounded-xl lg:w-auto w-full">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 lg:flex-none py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'active'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Activas
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 lg:flex-none py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'completed'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Completadas
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]'}`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {filteredInstances.length === 0 ? (
          <Card padding="lg" className="text-center">
            <p className="text-[var(--color-text-secondary)] mb-4">
              {activeTab === 'active' ? 'No hay deudas activas' : 'No hay deudas completadas'}
            </p>
            {activeTab === 'active' && (
              <Button variant="primary" onClick={() => setShowNewDebtModal(true)}>
                + Nueva Deuda
              </Button>
            )}
          </Card>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                    <th className="pb-3 font-medium">Nombre</th>
                    <th className="pb-3 font-medium text-right">Monto</th>
                    <th className="pb-3 font-medium text-right">Fecha Vencimiento</th>
                    <th className="pb-3 font-medium text-center">Estado</th>
                    <th className="pb-3 font-medium text-center">Progreso</th>
                    <th className="pb-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInstances.map((debt) => {
                    const progress = debt.amount_due > 0 ? (debt.amount_paid / debt.amount_due) * 100 : 0;
                    return (
                      <tr key={debt.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface)]/50 transition-colors">
                        <td className="py-3 text-[var(--color-text-primary)] font-medium">
                          {debt.template?.name || 'Deuda'}
                        </td>
                        <td className="py-3 text-right text-[var(--color-text-primary)]">
                          ${debt.amount_due.toFixed(2)}
                        </td>
                        <td className="py-3 text-right text-[var(--color-text-secondary)]">
                          {format(parseISO(debt.due_date), "d MMM, yyyy", { locale: es })}
                        </td>
                        <td className="py-3 text-center">
                          <Badge variant={debt.status === 'paid' ? 'success' : debt.status === 'pending' ? 'warning' : 'default'}>
                            {debt.status === 'paid' ? 'Pagada' : debt.status === 'pending' ? 'Pendiente' : debt.status}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-[var(--color-surface-elevated)] rounded-full overflow-hidden">
                              <div className="h-full bg-[var(--color-primary)] rounded-full" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-xs text-[var(--color-text-secondary)]">{Math.round(progress)}%</span>
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          {debt.status !== 'paid' && (
                            <Button variant="primary" size="sm" onClick={() => handlePayClick(debt)}>
                              Pagar
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="lg:hidden space-y-3">
              {filteredInstances.map((debt) => (
                <SwipeableDebtCard
                  key={debt.id}
                  debt={debt}
                  onPay={handlePayClick}
                  onMarkPaid={handleMarkPaid}
                  onClick={() => {}}
                  isPending={pendingIds.has(debt.id)}
                />
              ))}
            </div>
          </>
        )}

        {templates.length > 0 && activeTab === 'active' && (
          <details className="group">
            <summary className="flex items-center justify-between p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] cursor-pointer list-none">
              <span className="text-sm font-medium text-[var(--color-text-primary)]">Plantillas Recurrentes</span>
              <span className="text-[var(--color-text-secondary)] group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="mt-2 space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="flex justify-between items-center p-3 bg-[var(--color-surface-elevated)] rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{t.name}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">${t.amount} / {t.frequency}</p>
                  </div>
                  <Badge variant={t.is_active ? 'success' : 'default'}>
                    {t.is_active ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
              ))}
            </div>
          </details>
        )}
      </main>

      <button
        onClick={() => setShowNewDebtModal(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-[var(--color-primary)] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[var(--color-primary-hover)] transition-all glow-primary md:bottom-6"
      >
        <Plus className="w-6 h-6" />
      </button>

      <BottomNav />

      <Modal
        isOpen={showNewDebtModal}
        onClose={() => setShowNewDebtModal(false)}
        title="Nueva Deuda"
      >
        <div className="space-y-4">
          <Input
            label="Nombre"
            placeholder="Ej: Netflix, Renta, Gym"
            value={newDebtForm.name}
            onChange={(e) => setNewDebtForm({ ...newDebtForm, name: e.target.value })}
          />
          <Input
            label="Monto"
            type="number"
            placeholder="0.00"
            value={newDebtForm.amount}
            onChange={(e) => setNewDebtForm({ ...newDebtForm, amount: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Frecuencia</label>
            <select
              value={newDebtForm.frequency}
              onChange={(e) => setNewDebtForm({ ...newDebtForm, frequency: e.target.value as 'weekly' | 'monthly' | 'annual' })}
              className="w-full h-12 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)]"
            >
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
              <option value="annual">Anual</option>
            </select>
          </div>
          <Input
            label="Día de vencimiento (1-31)"
            type="number"
            placeholder="15"
            value={newDebtForm.due_day}
            onChange={(e) => setNewDebtForm({ ...newDebtForm, due_day: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Categoría</label>
            <select
              value={newDebtForm.category_id}
              onChange={(e) => setNewDebtForm({ ...newDebtForm, category_id: e.target.value })}
              className="w-full h-12 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)]"
            >
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <Button variant="primary" className="w-full" onClick={handleCreateDebt}>
            Crear Deuda
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        title="Registrar Pago"
      >
        <div className="space-y-4">
          {selectedDebt && (
            <div className="bg-[var(--color-surface-elevated)] rounded-lg p-4">
              <p className="text-sm text-[var(--color-text-secondary)]">Deuda</p>
              <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                {selectedDebt.template?.name || 'Deuda'}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                Pendiente: ${(selectedDebt.amount_due - selectedDebt.amount_paid).toFixed(2)}
              </p>
            </div>
          )}
          <Input
            label="Monto a pagar"
            type="number"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
          />
          <Button variant="success" className="w-full" onClick={handlePaySubmit}>
            Confirmar Pago
          </Button>
        </div>
      </Modal>
    </div>
  );
}