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
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  // Carrega sessão inicial
  useEffect(() => {
    // Se Supabase não está configurado, considera como autenticado (modo sem auth)
    if (!isSupabaseConfigured) {
      console.log('Supabase not configured, running without authentication');
      setState({
        user: { id: 'anonymous', email: undefined, username: 'Usuário' },
        session: null,
        isLoading: false,
        isAuthenticated: true, // Permite acesso sem login
        error: null,
      });
      return;
    }

    let mounted = true;

    const initAuth = async () => {
      console.log('[Auth] Iniciando verificação de sessão...');
      const startTime = Date.now();

      try {
        // Promise para obter sessão
        const sessionPromise = supabase.auth.getSession();
        
        // Promise de timeout
        const timeoutPromise = new Promise<{ timeout: true }>((resolve) => {
          setTimeout(() => resolve({ timeout: true }), AUTH_TIMEOUT_MS);
        });

        // Race entre obter sessão e timeout
        const result = await Promise.race([sessionPromise, timeoutPromise]);

        if ('timeout' in result) {
          throw new Error('Tempo limite excedido ao tentar restaurar sessão');
        }

        const { data, error: sessionError } = result;

        if (sessionError) {
          throw sessionError;
        }

        const session = data.session;

        if (session?.user) {
          console.log('[Auth] Sessão encontrada para usuário:', session.user.id);
          
          // Busca perfil do usuário
          // Envolvemos em try/catch para que falha no perfil não impeça login
          let profile = null;
          try {
             const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', session.user.id)
              .single();
              
              if (profileError) {
                console.warn('[Auth] Erro ao buscar perfil:', profileError);
              } else {
                profile = profileData;
              }
          } catch (err) {
             console.warn('[Auth] Falha na requisição de perfil:', err);
          }
          
          if (mounted) {
            setState({
              user: {
                id: session.user.id,
                email: session.user.email,
                username: profile?.username,
              },
              session,
              isLoading: false,
              isAuthenticated: true,
              error: null,
            });
            console.log(`[Auth] Autenticação concluída em ${Date.now() - startTime}ms`);
          }
        } else {
          console.log('[Auth] Nenhuma sessão ativa encontrada');
          if (mounted) {
            setState({
              user: null,
              session: null,
              isLoading: false,
              isAuthenticated: false,
              error: null,
            });
          }
        }
      } catch (error: any) {
        console.error('[Auth] Erro crítico ao inicializar autenticação:', error);
        
        // Em caso de erro crítico, forçamos logout para limpar estado inválido
        // mas mantemos a mensagem de erro visível se possível ou apenas redirecionamos
        if (mounted) {
          setState({
            user: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
            error: error.message || 'Falha ao restaurar sessão',
          });
          
          // Tentativa de limpar dados locais que podem estar corrompidos
          try {
             await supabase.auth.signOut();
          } catch (e) {
             console.error('[Auth] Erro ao forçar signOut após falha:', e);
          }
        }
      }
    };

    initAuth();

    // Escuta mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[Auth] Mudança de estado: ${event}`, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Apenas busca perfil se realmente mudou o usuário ou é um novo login
          // Para evitar requisições desnecessárias, poderíamos checar se o usuário atual é diferente
          // mas por segurança e simplicidade, atualizamos.
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', session.user.id)
            .single();
          
          if (mounted) {
            setState({
              user: {
                id: session.user.id,
                email: session.user.email,
                username: profile?.username,
              },
              session,
              isLoading: false,
              isAuthenticated: true,
              error: null,
            });
          }
        } else if (event === 'SIGNED_OUT') {
          if (mounted) {
            setState({
              user: null,
              session: null,
              isLoading: false,
              isAuthenticated: false,
              error: null,
            });
          }
        } else if (event === 'TOKEN_REFRESHED' && session) {
          if (mounted) {
            setState(prev => ({ ...prev, session }));
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return { error: error.message };
      }
      
      return {};
    } catch (error) {
      return { error: 'Erro ao fazer login' };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, username?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
        },
      });
      
      if (error) {
        return { error: error.message };
      }
      
      // Cria perfil do usuário
      if (data.user && username) {
        await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username,
          });
      }
      
      return {};
    } catch (error) {
      return { error: 'Erro ao criar conta' };
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.refreshSession();
    if (session) {
      setState(prev => ({ ...prev, session }));
    }
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
