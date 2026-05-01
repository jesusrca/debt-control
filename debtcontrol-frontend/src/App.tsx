import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect, Component } from 'react';
import type { ReactNode } from 'react';
import { DashboardPage } from './pages/DashboardPage';
import { DebtsPage } from './pages/DebtsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { UploadPage } from './pages/UploadPage';
import { UploadDetailPage } from './pages/UploadDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { Layout } from './components/Layout';
import { useAuthStore } from './store/authStore';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 max-w-md text-center">
            <div className="w-12 h-12 bg-[var(--color-danger)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Algo salió mal</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              {this.state.error?.message || 'Ha ocurrido un error inesperado'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg font-medium text-sm hover:bg-[var(--color-primary-hover)] transition-colors"
              >
                Reintentar
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] rounded-lg font-medium text-sm hover:bg-[var(--color-border)] transition-colors"
              >
                Recargar página
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ScrollToTop() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return null;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (isAuthenticated && location.pathname === '/login') {
    return <Navigate to="/" replace />;
  }

  if (!isAuthenticated && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  useEffect(() => {
    const checkApi = async () => {
      try {
        const { api } = await import('./api/client');
        await api.health.check();
      } catch {
        console.warn('API unavailable, redirecting...');
      }
    };
    checkApi();
  }, [location.pathname]);
  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <AuthGuard>
          <Layout>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<DashboardPage />} />
              <Route path="/debts" element={<ProtectedRoute><DebtsPage /></ProtectedRoute>} />
              <Route path="/transactions" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/upload/:id" element={<UploadDetailPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<div className="min-h-screen bg-[var(--color-bg)] p-4 text-[var(--color-text-primary)]">404 - Not Found</div>} />
            </Routes>
          </Layout>
        </AuthGuard>
      </BrowserRouter>
    </ErrorBoundary>
  );
}