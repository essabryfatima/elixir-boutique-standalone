// ============================================================
// AUTH UTILITIES - JWT, Password Hashing
// ============================================================

import { SignJWT, jwtVerify } from 'jose';
import type { JWTPayload } from '../types/index.js';

const JWT_SECRET = new TextEncoder().encode('ecommerce-super-secret-key-2024-change-in-production');
const JWT_REFRESH_SECRET = new TextEncoder().encode('ecommerce-refresh-secret-key-2024-change-in-production');

/**
 * Génère un access token JWT (expire dans 15min)
 */
export async function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(JWT_SECRET);
}

/**
 * Génère un refresh token JWT (expire dans 7 jours)
 */
export async function generateRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_REFRESH_SECRET);
}

/**
 * Vérifie et décode un access token
 */
export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Vérifie un refresh token
 */
export async function verifyRefreshToken(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET);
    return { sub: payload.sub as string };
  } catch {
    return null;
  }
}

/**
 * Simple hash de mot de passe (sans bcrypt - Cloudflare Workers compatible)
 * En production: utiliser bcrypt via un service externe ou Web Crypto API
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = 'ecommerce-salt-2024'; // En prod: générer un salt aléatoire
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Vérifie un mot de passe contre son hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedInput = await hashPassword(password);
  return hashedInput === hash;
}

/**
 * Génère un ID unique
 */
export function generateId(prefix: string = 'id'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Génère un slug à partir d'une chaîne
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Validation d'email
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Formate un prix en euros
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

/**
 * Calcule la TVA (20%)
 */
export function calculateTax(amount: number, rate: number = 0.20): number {
  return Math.round(amount * rate * 100) / 100;
}

/**
 * Génère le prochain numéro de commande (re-export for backward compat)
 */
export { getNextOrderNumber } from '../data/store.js';
