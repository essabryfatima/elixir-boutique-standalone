// ============================================================
// AUTH MIDDLEWARE - JWT Verification & Role Guards
// ============================================================

import { createMiddleware } from 'hono/factory';
import { verifyAccessToken } from '../utils/auth.js';
import { users } from '../data/store.js';

/**
 * Middleware d'authentification - vérifie le JWT Bearer token
 */
export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Token d\'authentification requis' }, 401);
  }
  
  const token = authHeader.substring(7);
  const payload = await verifyAccessToken(token);
  
  if (!payload) {
    return c.json({ success: false, error: 'Token invalide ou expiré' }, 401);
  }
  
  // Vérifier que l'utilisateur existe toujours
  const user = users.find(u => u.id === payload.sub);
  if (!user || !user.isActive) {
    return c.json({ success: false, error: 'Utilisateur non trouvé ou désactivé' }, 401);
  }
  
  // Injecter les données utilisateur dans le contexte
  c.set('userId', payload.sub);
  c.set('userEmail', payload.email);
  c.set('userRole', payload.role);
  
  await next();
});

/**
 * Middleware admin - vérifie le rôle admin
 */
export const adminMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Token d\'authentification requis' }, 401);
  }
  
  const token = authHeader.substring(7);
  const payload = await verifyAccessToken(token);
  
  if (!payload) {
    return c.json({ success: false, error: 'Token invalide ou expiré' }, 401);
  }
  
  if (payload.role !== 'admin') {
    return c.json({ success: false, error: 'Accès réservé aux administrateurs' }, 403);
  }
  
  c.set('userId', payload.sub);
  c.set('userEmail', payload.email);
  c.set('userRole', payload.role);
  
  await next();
});

/**
 * Middleware optionnel - ne bloque pas si pas de token
 */
export const optionalAuthMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = await verifyAccessToken(token);
    
    if (payload) {
      c.set('userId', payload.sub);
      c.set('userEmail', payload.email);
      c.set('userRole', payload.role);
    }
  }
  
  await next();
});
