import { useEffect, useState, useCallback } from 'react';
import { useTransactionStore, useBankAccountStore, useDebtStore } from '../store';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { BottomNav, TopNav } from '../components/Layout';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Search } from 'lucide-react';

export function TransactionsPage() {
  const { transactions, fetchTransactions, createTransaction, loadMoreTransactions, hasMore, isLoading } = useTransactionStore();
  const { bankAccounts, fetchBankAccounts } = useBankAccountStore();
  const { instances, fetchInstances } = useDebtStore();

  const [filters, setFilters] = useState({
    bank_id: '',
    month: '',
    search: '',
  });
  const [showNewTransactionModal, setShowNewTransactionModal] = useState(false);
  const [newTransactionForm, setNewTransactionForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    bank_account_id: '',
    debt_instance_id: '',
    notes: '',
  });

  const loadData = useCallback(() => {
    fetchTransactions(filters);
    fetchBankAccounts();
    fetchInstances({ status: 'pending', include_completed: false });
  }, [fetchTransactions, fetchBankAccounts, fetchInstances, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    fetchTransactions(filters);
  }, [fetchTransactions, filters]);

  const handleCreateTransaction = async () => {
    if (!newTransactionForm.amount || !newTransactionForm.date) return;
    try {
      await createTransaction({
        amount: parseFloat(newTransactionForm.amount),
        date: newTransactionForm.date,
        bank_account_id: newTransactionForm.bank_account_id || null,
        debt_instance_id: newTransactionForm.debt_instance_id || null,
        notes: newTransactionForm.notes || null,
      });
      setShowNewTransactionModal(false);
      setNewTransactionForm({
        amount: '', date: new Date().toISOString().split('T')[0],
        bank_account_id: '', debt_instance_id: '', notes: '',
      });
    } catch (err) {
      console.error('Create error:', err);
    }
  };

  const getBankColor = (id: string | null) => {
    const bank = bankAccounts.find((b) => b.id === id);
    return bank?.color || '#6366F1';
  };

  const getDebtName = (id: string | null) => {
    if (!id) return null;
    const instance = instances.find((i) => i.id === id);
    return instance?.template?.name || null;
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <TopNav />
      <main className="p-4 pb-24 space-y-4 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-4">
          <div className="hidden lg:block lg:w-64 flex-shrink-0">
            <div className="sticky top-4 space-y-4">
              <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">Filtros</h3>
              <select
                value={filters.bank_id}
                onChange={(e) => setFilters({ ...filters, bank_id: e.target.value })}
                className="w-full h-12 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)]"
              >
                <option value="">Todas las cuentas</option>
                {bankAccounts.map((bank) => (
                  <option key={bank.id} value={bank.id}>{bank.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-secondary)]" />
                <input
                  type="text"
                  placeholder="Buscar transacciones..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full h-11 pl-10 pr-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <select
                value={filters.bank_id}
                onChange={(e) => setFilters({ ...filters, bank_id: e.target.value })}
                className="lg:hidden h-11 px-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)]"
              >
                <option value="">Todos</option>
                {bankAccounts.map((bank) => (
                  <option key={bank.id} value={bank.id}>{bank.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {transactions.length === 0 ? (
          <Card padding="lg" className="text-center">
            <p className="text-[var(--color-text-secondary)] mb-4">No hay transacciones registradas</p>
            <Button variant="primary" onClick={() => setShowNewTransactionModal(true)}>
              + Registrar Transacción
            </Button>
          </Card>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                    <th className="pb-3 font-medium">Fecha</th>
                    <th className="pb-3 font-medium">Descripción</th>
                    <th className="pb-3 font-medium">Cuenta</th>
                    <th className="pb-3 font-medium">Vínculo</th>
                    <th className="pb-3 font-medium text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => {
                    const debtName = getDebtName(txn.debt_instance_id);
                    return (
                      <tr key={txn.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface)]/50 transition-colors">
                        <td className="py-3 text-[var(--color-text-secondary)]">
                          {format(parseISO(txn.date), "d MMM, yyyy", { locale: es })}
                        </td>
                        <td className="py-3 text-[var(--color-text-primary)] font-medium">
                          {txn.notes || 'Transacción'}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getBankColor(txn.bank_account_id) }} />
                            <span className="text-[var(--color-text-secondary)]">
                              {bankAccounts.find(b => b.id === txn.bank_account_id)?.name || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3">
                          {debtName && <Badge variant="primary">{debtName}</Badge>}
                        </td>
                        <td className={`py-3 text-right font-semibold ${txn.amount < 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`}>
                          {txn.amount < 0 ? '-' : '+'}${Math.abs(txn.amount).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="lg:hidden space-y-3">
              {transactions.map((txn) => {
                const debtName = getDebtName(txn.debt_instance_id);
                return (
                  <Card key={txn.id} padding="md" className="card-enter">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getBankColor(txn.bank_account_id) }} />
                        <div>
                          <p className="text-sm font-medium text-[var(--color-text-primary)]">
                            {txn.notes || 'Transacción'}
                          </p>
                          <p className="text-xs text-[var(--color-text-secondary)]">
                            {format(parseISO(txn.date), "d 'de' MMMM, yyyy", { locale: es })}
                          </p>
                          {debtName && (
                            <Badge variant="primary" className="mt-1">
                              {debtName}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className={`text-lg font-semibold ${txn.amount < 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`}>
                        {txn.amount < 0 ? '-' : '+'}${Math.abs(txn.amount).toFixed(2)}
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {hasMore && (
          <div className="flex justify-center pt-4">
            <Button
              variant="secondary"
              onClick={loadMoreTransactions}
              isLoading={isLoading}
            >
              {isLoading ? 'Cargando...' : 'Cargar más'}
            </Button>
          </div>
        )}
      </main>

      <button
        onClick={() => setShowNewTransactionModal(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-[var(--color-primary)] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[var(--color-primary-hover)] transition-all glow-primary md:bottom-6"
      >
        <Plus className="w-6 h-6" />
      </button>

      <BottomNav />

      <Modal
        isOpen={showNewTransactionModal}
        onClose={() => setShowNewTransactionModal(false)}
        title="Registrar Transacción"
      >
        <div className="space-y-4">
          <Input
            label="Monto"
            type="number"
            placeholder="0.00"
            value={newTransactionForm.amount}
            onChange={(e) => setNewTransactionForm({ ...newTransactionForm, amount: e.target.value })}
          />
          <Input
            label="Fecha"
            type="date"
            value={newTransactionForm.date}
            onChange={(e) => setNewTransactionForm({ ...newTransactionForm, date: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Cuenta Bancaria</label>
            <select
              value={newTransactionForm.bank_account_id}
              onChange={(e) => setNewTransactionForm({ ...newTransactionForm, bank_account_id: e.target.value })}
              className="w-full h-12 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)]"
            >
              <option value="">Sin cuenta</option>
              {bankAccounts.map((bank) => (
                <option key={bank.id} value={bank.id}>{bank.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Vincular a Deuda</label>
            <select
              value={newTransactionForm.debt_instance_id}
              onChange={(e) => setNewTransactionForm({ ...newTransactionForm, debt_instance_id: e.target.value })}
              className="w-full h-12 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)]"
            >
              <option value="">Sin vínculo</option>
              {instances.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.template?.name || 'Deuda'} - ${inst.amount_due.toFixed(2)}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Notas (opcional)"
            placeholder="Descripción de la transacción"
            value={newTransactionForm.notes}
            onChange={(e) => setNewTransactionForm({ ...newTransactionForm, notes: e.target.value })}
          />
          <Button variant="success" className="w-full" onClick={handleCreateTransaction}>
            Registrar
          </Button>
        </div>
      </Modal>
    </div>
  );
}