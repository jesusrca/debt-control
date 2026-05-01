import { useEffect, useState, useCallback } from 'react';
import { useBankAccountStore, useCategoryStore, useSettingsStore } from '../store';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { TopNav } from '../components/Layout';
import { Plus, Edit2, Trash2, Moon, Sun } from 'lucide-react';
import type { BankAccount, Category } from '../types';

export function SettingsPage() {
  const { bankAccounts, fetchBankAccounts, createBankAccount, updateBankAccount, deleteBankAccount } = useBankAccountStore();
  const { categories, fetchCategories, createCategory, updateCategory, deleteCategory } = useCategoryStore();
  const { settings, updateSettings, toggleDarkMode } = useSettingsStore();

  const [showBankModal, setShowBankModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [bankForm, setBankForm] = useState({ name: '', color: '#2563EB' });
  const [categoryForm, setCategoryForm] = useState({ name: '', icon: 'credit-card', color: '#6366F1' });

  const loadData = useCallback(() => {
    fetchBankAccounts();
    fetchCategories();
  }, [fetchBankAccounts, fetchCategories]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveBank = async () => {
    if (!bankForm.name) return;
    try {
      if (editingBank) {
        await updateBankAccount(editingBank.id, bankForm);
      } else {
        await createBankAccount(bankForm);
      }
      setShowBankModal(false);
      setEditingBank(null);
      setBankForm({ name: '', color: '#2563EB' });
    } catch (err) {
      console.error('Save bank error:', err);
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name) return;
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryForm);
      } else {
        await createCategory(categoryForm);
      }
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', icon: 'credit-card', color: '#6366F1' });
    } catch (err) {
      console.error('Save category error:', err);
    }
  };

  const openEditBank = (bank: BankAccount) => {
    setEditingBank(bank);
    setBankForm({ name: bank.name, color: bank.color });
    setShowBankModal(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, icon: cat.icon, color: cat.color });
    setShowCategoryModal(true);
  };

  const colorOptions = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <TopNav />
      <main className="p-4 pb-24 space-y-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Configuración</h1>

        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {settings.darkMode ? (
                <Moon className="w-5 h-5 text-[var(--color-primary)]" />
              ) : (
                <Sun className="w-5 h-5 text-[var(--color-warning)]" />
              )}
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Modo Oscuro</p>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`w-12 h-7 rounded-full relative transition-all ${
                settings.darkMode ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${
                  settings.darkMode ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Moneda</label>
            <select
              value={settings.currency}
              onChange={(e) => updateSettings({ currency: e.target.value })}
              className="w-full h-12 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)]"
            >
              <option value="USD">USD - Dólar Estadounidense</option>
              <option value="MXN">MXN - Peso Mexicano</option>
              <option value="COP">COP - Peso Colombiano</option>
              <option value="EUR">EUR - Euro</option>
            </select>
          </div>
        </Card>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Cuentas Bancarias</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingBank(null);
                setBankForm({ name: '', color: '#2563EB' });
                setShowBankModal(true);
              }}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {bankAccounts.length === 0 ? (
            <Card padding="md" className="text-center">
              <p className="text-sm text-[var(--color-text-secondary)]">No hay cuentas bancarias</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {bankAccounts.map((bank) => (
                <Card key={bank.id} padding="sm" className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: bank.color }}
                    />
                    <span className="text-sm text-[var(--color-text-primary)]">{bank.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditBank(bank)} className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg">
                      <Edit2 className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    </button>
                    <button onClick={() => deleteBankAccount(bank.id)} className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg">
                      <Trash2 className="w-4 h-4 text-[var(--color-danger)]" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Categorías</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingCategory(null);
                setCategoryForm({ name: '', icon: 'credit-card', color: '#6366F1' });
                setShowCategoryModal(true);
              }}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {categories.length === 0 ? (
            <Card padding="md" className="text-center">
              <p className="text-sm text-[var(--color-text-secondary)]">No hay categorías</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {categories.map((cat) => (
                <Card key={cat.id} padding="sm" className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-sm text-[var(--color-text-primary)]">{cat.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditCategory(cat)} className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg">
                      <Edit2 className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    </button>
                    <button onClick={() => deleteCategory(cat.id)} className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg">
                      <Trash2 className="w-4 h-4 text-[var(--color-danger)]" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      <Modal
        isOpen={showBankModal}
        onClose={() => setShowBankModal(false)}
        title={editingBank ? 'Editar Cuenta' : 'Nueva Cuenta'}
      >
        <div className="space-y-4">
          <Input
            label="Nombre"
            placeholder="Ej: Cuenta Corriente"
            value={bankForm.name}
            onChange={(e) => setBankForm({ ...bankForm, name: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Color</label>
            <div className="flex gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  onClick={() => setBankForm({ ...bankForm, color })}
                  className={`w-8 h-8 rounded-full transition-all ${
                    bankForm.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--color-bg)]' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <Button variant="primary" className="w-full" onClick={handleSaveBank}>
            {editingBank ? 'Guardar' : 'Crear'}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title={editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
      >
        <div className="space-y-4">
          <Input
            label="Nombre"
            placeholder="Ej: Utilities, Rent"
            value={categoryForm.name}
            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Color</label>
            <div className="flex gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  onClick={() => setCategoryForm({ ...categoryForm, color })}
                  className={`w-8 h-8 rounded-full transition-all ${
                    categoryForm.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--color-bg)]' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <Button variant="primary" className="w-full" onClick={handleSaveCategory}>
            {editingCategory ? 'Guardar' : 'Crear'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}