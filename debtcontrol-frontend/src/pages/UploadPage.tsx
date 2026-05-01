import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUploadStore } from '../store';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { BottomNav, TopNav } from '../components/Layout';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Upload as UploadIcon, FileText, Image, Trash2, Brain } from 'lucide-react';
import type { Upload as UploadType } from '../types';

export function UploadPage() {
  const navigate = useNavigate();
  const { uploads, fetchUploads, uploadFile, deleteUpload, analyzeUpload } = useUploadStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  const handleUpload = useCallback(async (file: File) => {
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!validTypes.includes(file.type)) {
      alert('Solo se permiten archivos PDF, PNG o JPG');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('El archivo debe ser menor a 10MB');
      return;
    }

    setIsUploading(true);
    try {
      await uploadFile(file);
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  }, [uploadFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      await handleUpload(file);
    }
  }, [handleUpload]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    for (const file of files) {
      await handleUpload(file);
    }
    e.target.value = '';
  }, [handleUpload]);

  const handleAnalyze = useCallback(async (id: string) => {
    try {
      await analyzeUpload(id);
    } catch (err) {
      console.error('Analyze error:', err);
    }
  }, [analyzeUpload]);

  const getStatusBadge = (status: UploadType['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="default">Pendiente</Badge>;
      case 'analyzing':
        return <Badge variant="warning">Analizando...</Badge>;
      case 'analyzed':
        return <Badge variant="success">Analizado</Badge>;
      case 'failed':
        return <Badge variant="danger">Error</Badge>;
    }
  };

  const getFileIcon = (type: string) => {
    if (type === 'pdf') return <FileText className="w-8 h-8 text-[var(--color-danger)]" />;
    return <Image className="w-8 h-8 text-[var(--color-primary)]" />;
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <TopNav />
      <main className="p-4 pb-24 space-y-4 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Documentos</h1>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 lg:p-12 text-center transition-all lg:mb-6 ${
            isDragging
              ? 'border-[var(--color-primary)] bg-[var(--color-primary-muted)]'
              : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
          }`}
        >
          <UploadIcon className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-secondary)]" />
          <p className="text-sm text-[var(--color-text-primary)] mb-2">
            Arrastra archivos aquí o
          </p>
          <label className="inline-block">
            <span className="inline-flex items-center px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg font-medium text-sm cursor-pointer hover:bg-[var(--color-primary-hover)] transition-all">
              Seleccionar Archivo
            </span>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>
          <p className="text-xs text-[var(--color-text-secondary)] mt-4">
            PDF, PNG, JPG — Máximo 10MB
          </p>
        </div>

        {isUploading && (
          <Card padding="md" className="text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[var(--color-text-primary)]">Subiendo archivo...</p>
            </div>
          </Card>
        )}

        {uploads.length === 0 && !isUploading ? (
          <Card padding="lg" className="text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-secondary)]" />
            <p className="text-[var(--color-text-secondary)]">
              No hay documentos subidos aún
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploads.map((upload) => (
              <Card key={upload.id} padding="md" className="card-enter">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[var(--color-surface-elevated)] rounded-lg flex items-center justify-center flex-shrink-0">
                    {getFileIcon(upload.file_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                        {upload.original_name}
                      </p>
                      {getStatusBadge(upload.status)}
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {format(parseISO(upload.created_at), "d 'de' MMM, yyyy HH:mm", { locale: es })}
                    </p>
                    {upload.error_message && (
                      <p className="text-xs text-[var(--color-danger)] mt-2">{upload.error_message}</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      {upload.status === 'pending' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleAnalyze(upload.id)}
                        >
                          <Brain className="w-4 h-4 mr-1" />
                          Analizar
                        </Button>
                      )}
                      {upload.status === 'analyzed' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/upload/${upload.id}`)}
                        >
                          Ver Transacciones
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteUpload(upload.id)}
                      >
                        <Trash2 className="w-4 h-4 text-[var(--color-danger)]" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}