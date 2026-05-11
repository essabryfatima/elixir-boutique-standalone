// ============================================================
// AUTH ROUTES - Register, Login, Refresh, Logout, Profile
// ============================================================

import { Hono } from 'hono';
import { users, refreshTokens } from '../data/store.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, hashPassword, verifyPassword, isValidEmail, generateId } from '../utils/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import type { User, RegisterDTO, LoginDTO } from '../types/index.js';

const auth = new Hono();

/**
 * POST /api/auth/register
 * Inscription d'un nouvel utilisateur
 */
auth.post('/register', async (c) => {
  const body = await c.req.json<RegisterDTO>();
  const { email, password, firstName, lastName } = body;
  
  // Validation
  if (!email || !password || !firstName || !lastName) {
    return c.json({ success: false, error: 'Tous les champs sont requis' }, 400);
  }
  if (!isValidEmail(email)) {
    return c.json({ success: false, error: 'Format d\'email invalide' }, 400);
  }
  if (password.length < 8) {
    return c.json({ success: false, error: 'Le mot de passe doit contenir au moins 8 caractères' }, 400);
  }
  
  // Vérifier si l'email existe déjà
  const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return c.json({ success: false, error: 'Cet email est déjà utilisé' }, 409);
  }
  
  // Créer l'utilisateur
  const hashedPassword = await hashPassword(password);
  const newUser: User = {
    id: generateId('usr'),
    email: email.toLowerCase(),
    password: hashedPassword,
    firstName,
    lastName,
    role: 'user',
    isActive: true,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName + '+' + lastName)}&background=6366f1&color=fff`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  users.push(newUser);
  
  // Générer tokens
  const accessToken = await generateAccessToken({ sub: newUser.id, email: newUser.email, role: newUser.role });
  const refreshToken = await generateRefreshToken(newUser.id);
  refreshTokens.set(newUser.id, refreshToken);
  
  const { password: _, ...userWithoutPassword } = newUser;
  
  return c.json({
    success: true,
    message: 'Inscription réussie! Bienvenue 🎉',
    data: {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes
    }
  }, 201);
});

/**
 * POST /api/auth/login
 * Connexion utilisateur
 */
auth.post('/login', async (c) => {
  const body = await c.req.json<LoginDTO>();
  const { email, password } = body;
  
  if (!email || !password) {
    return c.json({ success: false, error: 'Email et mot de passe requis' }, 400);
  }
  
  // Trouver l'utilisateur
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return c.json({ success: false, error: 'Email ou mot de passe incorrect' }, 401);
  }
  
  if (!user.isActive) {
    return c.json({ success: false, error: 'Compte désactivé. Contactez le support.' }, 403);
  }
  
  // Vérification spéciale pour les comptes de démo
  let passwordValid = false;
  if (email === 'admin@boutique.com' && password === 'admin123') {
    passwordValid = true;
  } else if (email === 'alice@example.com' && password === 'user123') {
    passwordValid = true;
  } else {
    passwordValid = await verifyPassword(password, user.password);
  }
  
  if (!passwordValid) {
    return c.json({ success: false, error: 'Email ou mot de passe incorrect' }, 401);
  }
  
  // Générer tokens
  const accessToken = await generateAccessToken({ sub: user.id, email: user.email, role: user.role });
  const refreshToken = await generateRefreshToken(user.id);
  refreshTokens.set(user.id, refreshToken);
  
  const { password: _, ...userWithoutPassword } = user;
  
  return c.json({
    success: true,
    message: `Bienvenue ${user.firstName}! 👋`,
    data: {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
      expiresIn: 900,
    }
  });
});

/**
 * POST /api/auth/refresh
 * Renouveler le token d'accès
 */
auth.post('/refresh', async (c) => {
  const body = await c.req.json<{ refreshToken: string }>();
  const { refreshToken } = body;
  
  if (!refreshToken) {
    return c.json({ success: false, error: 'Refresh token requis' }, 400);
  }
  
  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) {
    return c.json({ success: false, error: 'Refresh token invalide ou expiré' }, 401);
  }
  
  const user = users.find(u => u.id === payload.sub);
  if (!user || !user.isActive) {
    return c.json({ success: false, error: 'Utilisateur non trouvé' }, 401);
  }
  
  // Vérifier que le refresh token correspond
  const storedToken = refreshTokens.get(user.id);
  if (storedToken !== refreshToken) {
    return c.json({ success: false, error: 'Refresh token révoqué' }, 401);
  }
  
  // Générer nouveau access token
  const newAccessToken = await generateAccessToken({ sub: user.id, email: user.email, role: user.role });
  const newRefreshToken = await generateRefreshToken(user.id);
  refreshTokens.set(user.id, newRefreshToken);
  
  return c.json({
    success: true,
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900,
    }
  });
});

/**
 * POST /api/auth/logout
 * Déconnexion - révoque le refresh token
 */
auth.post('/logout', authMiddleware, async (c) => {
  const userId = c.get('userId');
  refreshTokens.delete(userId);
  
  return c.json({ success: true, message: 'Déconnecté avec succès' });
});

/**
 * GET /api/auth/me
 * Obtenir le profil de l'utilisateur connecté
 */
auth.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return c.json({ success: false, error: 'Utilisateur non trouvé' }, 404);
  }
  
  const { password: _, ...userWithoutPassword } = user;
  return c.json({ success: true, data: userWithoutPassword });
});

/**
 * PATCH /api/auth/me
 * Mettre à jour le profil
 */
auth.patch('/me', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return c.json({ success: false, error: 'Utilisateur non trouvé' }, 404);
  }
  
  const { firstName, lastName, avatar } = body;
  
  if (firstName) users[userIndex].firstName = firstName;
  if (lastName) users[userIndex].lastName = lastName;
  if (avatar) users[userIndex].avatar = avatar;
  users[userIndex].updatedAt = new Date().toISOString();
  
  const { password: _, ...userWithoutPassword } = users[userIndex];
  return c.json({ success: true, data: userWithoutPassword, message: 'Profil mis à jour' });
});

/**
 * POST /api/auth/change-password
 * Changer le mot de passe
 */
auth.post('/change-password', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{ currentPassword: string; newPassword: string }>();
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return c.json({ success: false, error: 'Utilisateur non trouvé' }, 404);
  }
  
  if (!body.newPassword || body.newPassword.length < 8) {
    return c.json({ success: false, error: 'Nouveau mot de passe trop court (min 8 caractères)' }, 400);
  }
  
  users[userIndex].password = await hashPassword(body.newPassword);
  users[userIndex].updatedAt = new Date().toISOString();
  
  return c.json({ success: true, message: 'Mot de passe modifié avec succès' });
});

export default auth;
