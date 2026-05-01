import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUploadStore, useDebtStore } from '../store';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { BottomNav, TopNav } from '../components/Layout';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Brain, Check, X, Plus, AlertCircle, FileText } from 'lucide-react';
import type { UploadTransaction, DebtInstance, Upload } from '../types';

interface InlineDebtFormProps {
  onSubmit: (data: { name: string; amount: number }) => void;
  onCancel: () => void;
  suggestedAmount?: number;
}

function InlineDebtForm({ onSubmit, onCancel, suggestedAmount }: InlineDebtFormProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState(suggestedAmount?.toFixed(2) || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;
    onSubmit({ name, amount: parseFloat(amount) });
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-[var(--color-surface-elevated)] rounded-lg space-y-3 animate-scale-in">
      <Input
        label="Nombre de la deuda"
        placeholder="Ej: Netflix, Renta"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <Input
        label="Monto"
        type="number"
        placeholder="0.00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <div className="flex gap-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" className="flex-1">
          Crear
        </Button>
      </div>
    </form>
  );
}

export function UploadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { analyzeUpload } = useUploadStore();
  const { instances, fetchInstances, createTemplate } = useDebtStore();

  const [transactions, setTransactions] = useState<UploadTransaction[]>([]);
  const [upload, setUpload] = useState<Upload | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showInlineDebtForm, setShowInlineDebtForm] = useState(false);
  const [inlineDebtAmount, setInlineDebtAmount] = useState<number | undefined>();
  const [inlineDebtTxn, setInlineDebtTxn] = useState<UploadTransaction | null>(null);

  const loadUploadDetail = useCallback(async () => {
    try {
      const { api } = await import('../api/client');
      const uploadData = await api.uploads.getById(id!);
      setUpload(uploadData);

      const txns = await api.uploads.getTransactions(id!);
      setTransactions(txns);
    } catch (err) {
      console.error('Load upload detail error:', err);
    }
  }, [id]);

  const loadInstances = useCallback(async () => {
    await fetchInstances({ include_completed: true });
  }, [fetchInstances]);

  const loadUploadData = useCallback(async () => {
    if (!id) return;
    try {
      const { api } = await import('../api/client');
      const uploadData = await api.uploads.getById(id);
      setUpload(uploadData);
      const txns = await api.uploads.getTransactions(id);
      setTransactions(txns);
    } catch (err) {
      console.error('Load upload detail error:', err);
    }
    await fetchInstances({ include_completed: true });
  }, [id, fetchInstances]);

  useEffect(() => {
    const timer = setTimeout(() => loadUploadData(), 0);
    return () => clearTimeout(timer);
  }, [loadUploadData]);

  const handleCreateInlineDebt = useCallback(async (data: { name: string; amount: number }) => {
    if (!data.name || !data.amount) return;
    try {
      const template = await createTemplate({
        name: data.name,
        amount: data.amount,
        interest_rate: 0,
        frequency: 'monthly',
        due_day: null,
        due_weekday: null,
        category_id: null,
        bank_account_id: null,
        notes: null,
        is_active: 1,
      });
      if (inlineDebtTxn && template) {
        const { api } = await import('../api/client');
        await api.uploadTransactions.update(inlineDebtTxn.id, {
          debt_instance_id: template.id,
          is_assigned: 1,
        });
        await loadUploadDetail();
      }
      await loadInstances();
      setShowInlineDebtForm(false);
      setInlineDebtAmount(undefined);
      setInlineDebtTxn(null);
    } catch (err) {
      console.error('Create inline debt error:', err);
    }
  }, [createTemplate, inlineDebtTxn, loadUploadDetail, loadInstances]);

  const handleAddDebtClick = (txn: UploadTransaction) => {
    setInlineDebtTxn(txn);
    setInlineDebtAmount(txn.extracted_amount ?? undefined);
    setShowInlineDebtForm(true);
  };

  const handleAnalyze = async () => {
    if (!id) return;
    setIsAnalyzing(true);
    try {
      await analyzeUpload(id);
      await loadUploadDetail();
    } catch (err) {
      console.error('Analyze error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirm = (txnId: string) => {
    setSelectedIds((prev) =>
      prev.includes(txnId) ? prev.filter((id) => id !== txnId) : [...prev, txnId]
    );
  };

  const handleReject = async (txnId: string) => {
    try {
      const { api } = await import('../api/client');
      await api.uploadTransactions.update(txnId, { is_assigned: -1 });
      await loadUploadDetail();
    } catch (err) {
      console.error('Reject error:', err);
    }
  };

  const handleBulkCreate = async () => {
    if (selectedIds.length === 0) return;
    try {
      const { api } = await import('../api/client');
      await api.uploadTransactions.bulkCreate(selectedIds);
      await loadUploadDetail();
      setSelectedIds([]);
    } catch (err) {
      console.error('Bulk create error:', err);
    }
  };

  const getConfidenceColor = (confidence: number | null) => {
    if (!confidence) return 'text-[var(--color-text-secondary)]';
    if (confidence >= 0.8) return 'text-[var(--color-success)]';
    if (confidence >= 0.6) return 'text-[var(--color-warning)]';
    return 'text-[var(--color-danger)]';
  };

  const findMatchingDebt = (txn: UploadTransaction): { instance: DebtInstance; confidence: number } | null => {
    if (!txn.extracted_amount || !txn.extracted_description) return null;

    let bestMatch: { instance: DebtInstance; confidence: number } | null = null;

    for (const instance of instances) {
      if (instance.status === 'paid') continue;

      const amountScore = txn.extracted_amount
        ? 1 - Math.abs(Math.abs(txn.extracted_amount) - instance.amount_due) / instance.amount_due
        : 0;

      if (amountScore > 0.7) {
        const confidence = amountScore * 100;
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { instance, confidence };
        }
      }
    }

    return bestMatch;
  };

  if (!upload) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <TopNav />
        <main className="p-4 pb-24">
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
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
        <div className="flex flex-col lg:flex-row lg:gap-6">
          <div className="lg:w-2/5 space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/upload')}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-[var(--color-text-secondary)]" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold text-[var(--color-text-primary)] truncate">
                  {upload.original_name}
                </h1>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {format(parseISO(upload.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                </p>
              </div>
              <Badge
                variant={
                  upload.status === 'analyzed' ? 'success' :
                  upload.status === 'analyzing' ? 'warning' :
                  upload.status === 'failed' ? 'danger' : 'default'
                }
              >
                {upload.status === 'analyzed' ? 'Analizado' :
                 upload.status === 'analyzing' ? 'Analizando...' :
                 upload.status === 'failed' ? 'Error' : 'Pendiente'}
              </Badge>
            </div>

            {upload.status === 'pending' && (
              <Button
                variant="primary"
                className="w-full"
                isLoading={isAnalyzing}
                onClick={handleAnalyze}
              >
                <Brain className="w-5 h-5 mr-2" />
                Analizar Documento
              </Button>
            )}

            {upload.error_message && (
              <Card padding="md" className="bg-[var(--color-danger-muted)] border-[var(--color-danger)]/30">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[var(--color-danger)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-danger)]">Error en el análisis</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">{upload.error_message}</p>
                  </div>
                </div>
              </Card>
            )}

            <Card padding="md" className="bg-[var(--color-surface-elevated)]">
              <div className="flex items-center justify-center h-32 text-[var(--color-text-secondary)]">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Vista previa no disponible</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:w-3/5 space-y-4">
            {transactions.length === 0 && upload.status === 'analyzed' && (
              <Card padding="lg" className="text-center">
                <p className="text-[var(--color-text-secondary)]">
                  No se encontraron transacciones en este documento
                </p>
              </Card>
            )}

            {transactions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    Transacciones Extraídas ({transactions.length})
                  </p>
                  {selectedIds.length > 0 && (
                    <Button variant="success" size="sm" onClick={handleBulkCreate}>
                      <Check className="w-4 h-4 mr-1" />
                      Guardar {selectedIds.length}
                    </Button>
                  )}
                </div>

                {showInlineDebtForm && (
                  <InlineDebtForm
                    onSubmit={handleCreateInlineDebt}
                    onCancel={() => {
                      setShowInlineDebtForm(false);
                      setInlineDebtTxn(null);
                      setInlineDebtAmount(undefined);
                    }}
                    suggestedAmount={inlineDebtAmount}
                  />
                )}

                {transactions.map((txn) => {
                  const match = findMatchingDebt(txn);
                  const isSelected = selectedIds.includes(txn.id);
                  const isRejected = txn.is_assigned === -1;

                  return (
                    <Card
                      key={txn.id}
                      padding="md"
                      className={`card-enter ${isSelected ? 'border-[var(--color-primary)]' : ''} ${isRejected ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-medium text-[var(--color-text-primary)]">
                            {txn.extracted_description || 'Sin descripción'}
                          </p>
                          <p className="text-xs text-[var(--color-text-secondary)]">
                            {txn.extracted_date
                              ? format(parseISO(txn.extracted_date), "d 'de' MMMM, yyyy", { locale: es })
                              : 'Fecha no disponible'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={txn.extracted_type === 'credit' ? 'success' : 'danger'}>
                            {txn.extracted_type === 'credit' ? 'Crédito' : 'Débito'}
                          </Badge>
                          <p className={`text-lg font-bold ${txn.extracted_type === 'credit' ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                            {txn.extracted_type === 'credit' ? '+' : '-'}${Math.abs(txn.extracted_amount || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {match && (
                        <div className="bg-[var(--color-surface-elevated)] rounded-lg p-3 mb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-[var(--color-text-secondary)]">Sugerencia de coincidencia</p>
                              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                                {match.instance.template?.name || 'Deuda'}
                              </p>
                            </div>
                            <span className={`text-sm font-bold ${getConfidenceColor(match.confidence / 100)}`}>
                              {Math.round(match.confidence)}%
                            </span>
                          </div>
                        </div>
                      )}

                      {!isRejected && (
                        <div className="flex gap-2">
                          <Button
                            variant={isSelected ? 'success' : 'secondary'}
                            size="sm"
                            className="flex-1"
                            onClick={() => handleConfirm(txn.id)}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            {isSelected ? 'Confirmada' : 'Confirmar'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddDebtClick(txn)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReject(txn.id)}
                          >
                            <X className="w-4 h-4 text-[var(--color-danger)]" />
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}