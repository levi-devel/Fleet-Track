import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware para validação de API Key
 * Verifica o header X-API-Key contra a variável de ambiente TRACKING_API_KEY
 */
export function validateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'];
  const expectedApiKey = process.env.TRACKING_API_KEY;

  if (!expectedApiKey) {
    console.error('TRACKING_API_KEY não configurada no ambiente');
    return res.status(500).json({ error: 'API Key não configurada no servidor' });
  }

  if (!apiKey) {
    return res.status(401).json({ error: 'API Key não fornecida. Use o header X-API-Key.' });
  }

  if (apiKey !== expectedApiKey) {
    return res.status(401).json({ error: 'API Key inválida' });
  }

  next();
}
