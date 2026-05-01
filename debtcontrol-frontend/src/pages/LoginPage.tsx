import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      const success = login(password);
      if (success) {
        navigate('/');
      } else {
        setError('Contraseña incorrecta');
        setPassword('');
      }
      setIsLoading(false);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 shadow-xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-dcdark-primary rounded-2xl flex items-center justify-center mb-4">
              <span className="text-black font-bold text-xl">DC</span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">DebtControl</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">Ingresa tu contraseña</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error}
              autoFocus
            />
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isLoading}
              disabled={!password}
            >
              Ingresar
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}