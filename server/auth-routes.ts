import type { Express } from 'express';
import { supabaseAdmin } from './lib/supabase';
import { requireAuth, type AuthenticatedRequest } from './middleware/auth';

export function registerAuthRoutes(app: Express): void {
  /**
   * POST /api/auth/signup
   * Registra um novo usuário
   */
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password, username } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }
      
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username },
      });
      
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      
      // Cria perfil do usuário
      if (data.user && username) {
        await supabaseAdmin
          .from('profiles')
          .insert({
            id: data.user.id,
            username,
          });
      }
      
      res.status(201).json({ 
        message: 'Usuário criado com sucesso',
        user: {
          id: data.user?.id,
          email: data.user?.email,
        }
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ error: 'Erro ao criar usuário' });
    }
  });

  /**
   * POST /api/auth/login
   * Autentica um usuário e retorna tokens
   */
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }
      
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }
      
      // Busca perfil do usuário
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('username')
        .eq('id', data.user.id)
        .single();
      
      res.json({
        user: {
          id: data.user.id,
          email: data.user.email,
          username: profile?.username,
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Erro ao fazer login' });
    }
  });

  /**
   * POST /api/auth/logout
   * Invalida a sessão do usuário
   */
  app.post('/api/auth/logout', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        await supabaseAdmin.auth.admin.signOut(token);
      }
      
      res.json({ message: 'Logout realizado com sucesso' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Erro ao fazer logout' });
    }
  });

  /**
   * GET /api/auth/me
   * Retorna informações do usuário autenticado
   */
  app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }
      
      // Busca perfil do usuário
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();
      
      res.json({
        user: {
          id: userId,
          email: req.user?.email,
          username: profile?.username,
        },
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
  });

  /**
   * POST /api/auth/refresh
   * Renova o token de acesso usando o refresh token
   */
  app.post('/api/auth/refresh', async (req, res) => {
    try {
      const { refresh_token } = req.body;
      
      if (!refresh_token) {
        return res.status(400).json({ error: 'Refresh token é obrigatório' });
      }
      
      const { data, error } = await supabaseAdmin.auth.refreshSession({
        refresh_token,
      });
      
      if (error || !data.session) {
        return res.status(401).json({ error: 'Refresh token inválido' });
      }
      
      res.json({
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        },
      });
    } catch (error) {
      console.error('Refresh error:', error);
      res.status(500).json({ error: 'Erro ao renovar token' });
    }
  });
}
