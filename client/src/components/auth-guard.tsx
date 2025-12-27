import { ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../hooks/use-auth';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        </div>
      )
    );
  }

  if (!isAuthenticated) {
    // Redireciona para login
    setLocation('/login');
    return null;
  }

  return <>{children}</>;
}

interface PublicOnlyProps {
  children: ReactNode;
}

/**
 * Componente que só renderiza se o usuário NÃO estiver autenticado
 * Útil para páginas de login/signup
 */
export function PublicOnly({ children }: PublicOnlyProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    // Redireciona para home se já autenticado
    setLocation('/');
    return null;
  }

  return <>{children}</>;
}
