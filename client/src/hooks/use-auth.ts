import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthUser {
  id: string;
  email?: string;
  username?: string;
}

interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, username?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Timeout para evitar carregamento infinito (10 segundos)
const AUTH_TIMEOUT_MS = 10000;

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useAuthProvider(): AuthContextValue {
  // Sistema sem autenticação - sempre retorna usuário autenticado
  const [state] = useState<AuthState>({
    user: { id: 'anonymous', email: undefined, username: 'Usuário' },
    session: null,
    isLoading: false,
    isAuthenticated: true,
    error: null,
  });

  // Funções stub mantidas para compatibilidade
  const signIn = useCallback(async (email: string, password: string) => {
    return {};
  }, []);

  const signUp = useCallback(async (email: string, password: string, username?: string) => {
    return {};
  }, []);

  const signOut = useCallback(async () => {
    // Não faz nada - sistema sem logout
  }, []);

  const refreshSession = useCallback(async () => {
    // Não faz nada - não há sessão para renovar
  }, []);

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    refreshSession,
  };
}

export { AuthContext };
export type { AuthUser, AuthState, AuthContextValue };
