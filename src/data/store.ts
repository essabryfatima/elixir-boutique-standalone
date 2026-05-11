// ============================================================
// IN-MEMORY DATA STORE - Simule PostgreSQL + Redis
// En production: remplacer par Cloudflare D1 + KV
// ============================================================

import type { User, Product, Category, Cart, Order, Review, WishlistItem, Coupon } from '../types/index.js';

// ─── SEED DATA ────────────────────────────────────────────────

export const categories: Category[] = [
  { id: 'cat-1', name: 'Électronique', slug: 'electronique', description: 'Smartphones, laptops, accessoires', displayOrder: 1, imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400' },
  { id: 'cat-2', name: 'Mode & Vêtements', slug: 'mode', description: 'Tendances mode homme, femme, enfant', displayOrder: 2, imageUrl: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400' },
  { id: 'cat-3', name: 'Maison & Déco', slug: 'maison', description: 'Mobilier, décoration, cuisine', displayOrder: 3, imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400' },
  { id: 'cat-4', name: 'Sport & Fitness', slug: 'sport', description: 'Équipements sportifs, nutrition', displayOrder: 4, imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400' },
  { id: 'cat-5', name: 'Livres & Culture', slug: 'livres', description: 'Livres, musique, jeux vidéo', displayOrder: 5, imageUrl: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400' },
  { id: 'cat-6', name: 'Beauté & Santé', slug: 'beaute', description: 'Cosmétiques, soins, bien-être', displayOrder: 6, imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400' },
];

export const products: Product[] = [
  {
    id: 'prod-1', name: 'iPhone 15 Pro Max', slug: 'iphone-15-pro-max',
    description: 'Le dernier iPhone avec puce A17 Pro, système de caméra révolutionnaire et design en titane. Écran Super Retina XDR 6,7", 256 Go de stockage.',
    price: 1329, compareAtPrice: 1459, sku: 'IPH-15PM-256', stock: 45,
    isActive: true, isFeatured: true, categoryId: 'cat-1',
    images: [{ id: 'img-1', url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600', altText: 'iPhone 15 Pro Max', isPrimary: true, displayOrder: 1 }],
    rating: 4.8, reviewCount: 234, tags: ['smartphone', 'apple', 'ios', 'premium'], createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'prod-2', name: 'MacBook Pro 14" M3', slug: 'macbook-pro-14-m3',
    description: 'MacBook Pro avec puce M3 révolutionnaire. Performance exceptionnelle, autonomie de 22h, écran Liquid Retina XDR 14,2".',
    price: 1999, compareAtPrice: 2199, sku: 'MBP-14-M3-512', stock: 20,
    isActive: true, isFeatured: true, categoryId: 'cat-1',
    images: [{ id: 'img-2', url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600', altText: 'MacBook Pro', isPrimary: true, displayOrder: 1 }],
    rating: 4.9, reviewCount: 187, tags: ['laptop', 'apple', 'macos', 'professionnel'], createdAt: '2024-01-16T10:00:00Z', updatedAt: '2024-01-16T10:00:00Z'
  },
  {
    id: 'prod-3', name: 'Sony WH-1000XM5', slug: 'sony-wh-1000xm5',
    description: 'Casque sans fil avec la meilleure réduction de bruit active du marché. 30h d\'autonomie, son Hi-Res Audio, appels cristallins.',
    price: 299, compareAtPrice: 379, sku: 'SNY-WH1000XM5', stock: 67,
    isActive: true, isFeatured: true, categoryId: 'cat-1',
    images: [{ id: 'img-3', url: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600', altText: 'Sony Casque', isPrimary: true, displayOrder: 1 }],
    rating: 4.7, reviewCount: 456, tags: ['casque', 'audio', 'sans-fil', 'ANC'], createdAt: '2024-01-17T10:00:00Z', updatedAt: '2024-01-17T10:00:00Z'
  },
  {
    id: 'prod-4', name: 'Samsung Galaxy S24 Ultra', slug: 'samsung-galaxy-s24-ultra',
    description: 'Le flagship Android ultime avec stylet S Pen intégré, zoom optique 10x, écran Dynamic AMOLED 6,8" et 200 MP.',
    price: 1199, compareAtPrice: 1349, sku: 'SAM-S24U-256', stock: 38,
    isActive: true, isFeatured: false, categoryId: 'cat-1',
    images: [{ id: 'img-4', url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600', altText: 'Samsung S24', isPrimary: true, displayOrder: 1 }],
    rating: 4.6, reviewCount: 312, tags: ['smartphone', 'samsung', 'android'], createdAt: '2024-01-18T10:00:00Z', updatedAt: '2024-01-18T10:00:00Z'
  },
  {
    id: 'prod-5', name: 'Veste en Cuir Premium', slug: 'veste-cuir-premium',
    description: 'Veste en cuir véritable, coupe cintrée moderne. Doublure soie, fermetures YKK. Tailles S à XXL. Coloris Noir, Marron, Cognac.',
    price: 249, compareAtPrice: 389, sku: 'VCU-PREM-BLK', stock: 23,
    isActive: true, isFeatured: true, categoryId: 'cat-2',
    images: [{ id: 'img-5', url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600', altText: 'Veste Cuir', isPrimary: true, displayOrder: 1 }],
    rating: 4.5, reviewCount: 89, tags: ['veste', 'cuir', 'mode', 'premium'], createdAt: '2024-01-19T10:00:00Z', updatedAt: '2024-01-19T10:00:00Z'
  },
  {
    id: 'prod-6', name: 'Sneakers Air Max 2024', slug: 'sneakers-air-max-2024',
    description: 'Sneakers lifestyle avec technologie Air Max visible, mesh respirant, semelle en caoutchouc durable. Coloris exclusifs saison.',
    price: 139, compareAtPrice: 169, sku: 'SNK-AIRMAX-2024', stock: 89,
    isActive: true, isFeatured: false, categoryId: 'cat-2',
    images: [{ id: 'img-6', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600', altText: 'Sneakers', isPrimary: true, displayOrder: 1 }],
    rating: 4.4, reviewCount: 267, tags: ['chaussures', 'sneakers', 'sport', 'lifestyle'], createdAt: '2024-01-20T10:00:00Z', updatedAt: '2024-01-20T10:00:00Z'
  },
  {
    id: 'prod-7', name: 'Canapé Modulaire Scandinave', slug: 'canape-modulaire-scandinave',
    description: 'Canapé modulaire 4 places, design scandinave épuré. Tissu velours résistant, pieds en chêne massif. Personnalisable selon vos besoins.',
    price: 899, compareAtPrice: 1199, sku: 'CAP-MOD-SCN', stock: 12,
    isActive: true, isFeatured: true, categoryId: 'cat-3',
    images: [{ id: 'img-7', url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600', altText: 'Canapé', isPrimary: true, displayOrder: 1 }],
    rating: 4.6, reviewCount: 134, tags: ['meuble', 'canapé', 'scandinave', 'salon'], createdAt: '2024-01-21T10:00:00Z', updatedAt: '2024-01-21T10:00:00Z'
  },
  {
    id: 'prod-8', name: 'Cafetière Espresso Deluxe', slug: 'cafetiere-espresso-deluxe',
    description: 'Machine espresso professionnelle 19 bars, chauffe rapide 30s, mousseur de lait automatique. Capacité 1,8L. Design inox.',
    price: 289, compareAtPrice: 349, sku: 'CAF-ESP-DLX', stock: 44,
    isActive: true, isFeatured: false, categoryId: 'cat-3',
    images: [{ id: 'img-8', url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600', altText: 'Cafetière', isPrimary: true, displayOrder: 1 }],
    rating: 4.3, reviewCount: 198, tags: ['café', 'machine', 'cuisine', 'espresso'], createdAt: '2024-01-22T10:00:00Z', updatedAt: '2024-01-22T10:00:00Z'
  },
  {
    id: 'prod-9', name: 'Vélo de Route Carbon Pro', slug: 'velo-route-carbon-pro',
    description: 'Vélo de route en carbone T700, groupe Shimano 105, roues aéro, poids 7,8kg. Idéal cyclistes confirmés.',
    price: 1799, compareAtPrice: 2299, sku: 'VLO-RTE-CRB', stock: 8,
    isActive: true, isFeatured: true, categoryId: 'cat-4',
    images: [{ id: 'img-9', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600', altText: 'Vélo Carbon', isPrimary: true, displayOrder: 1 }],
    rating: 4.8, reviewCount: 67, tags: ['vélo', 'sport', 'carbone', 'cyclisme'], createdAt: '2024-01-23T10:00:00Z', updatedAt: '2024-01-23T10:00:00Z'
  },
  {
    id: 'prod-10', name: 'Tapis de Yoga Premium', slug: 'tapis-yoga-premium',
    description: 'Tapis de yoga antidérapant 6mm, matière TPE écologique, marquages d\'alignement, sac de transport inclus. 183x61cm.',
    price: 59, compareAtPrice: 89, sku: 'TAP-YOG-PREM', stock: 120,
    isActive: true, isFeatured: false, categoryId: 'cat-4',
    images: [{ id: 'img-10', url: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?w=600', altText: 'Tapis Yoga', isPrimary: true, displayOrder: 1 }],
    rating: 4.5, reviewCount: 342, tags: ['yoga', 'fitness', 'sport', 'meditation'], createdAt: '2024-01-24T10:00:00Z', updatedAt: '2024-01-24T10:00:00Z'
  },
  {
    id: 'prod-11', name: 'Crème Visage Hyaluronique', slug: 'creme-visage-hyaluronique',
    description: 'Crème hydratante intense à l\'acide hyaluronique multi-moléculaire. Texture légère, absorption rapide, éclat naturel. 50ml.',
    price: 45, compareAtPrice: 65, sku: 'CRM-VIS-HYA', stock: 156,
    isActive: true, isFeatured: false, categoryId: 'cat-6',
    images: [{ id: 'img-11', url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600', altText: 'Crème Visage', isPrimary: true, displayOrder: 1 }],
    rating: 4.4, reviewCount: 423, tags: ['beauté', 'soin', 'visage', 'hydratant'], createdAt: '2024-01-25T10:00:00Z', updatedAt: '2024-01-25T10:00:00Z'
  },
  {
    id: 'prod-12', name: 'Livre: Clean Code (FR)', slug: 'livre-clean-code',
    description: 'La référence absolue sur les bonnes pratiques du développement logiciel. Édition française, 431 pages, illustrations.',
    price: 34, compareAtPrice: 42, sku: 'LIV-CLEAN-CODE', stock: 78,
    isActive: true, isFeatured: false, categoryId: 'cat-5',
    images: [{ id: 'img-12', url: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600', altText: 'Livre Clean Code', isPrimary: true, displayOrder: 1 }],
    rating: 4.9, reviewCount: 567, tags: ['livre', 'programmation', 'développement', 'informatique'], createdAt: '2024-01-26T10:00:00Z', updatedAt: '2024-01-26T10:00:00Z'
  },
  {
    id: 'prod-13', name: 'iPad Pro 12.9" M2', slug: 'ipad-pro-12-m2',
    description: 'iPad Pro avec puce M2 ultra-rapide, écran Liquid Retina XDR 12,9", compatible Apple Pencil et Magic Keyboard. 256 Go Wi-Fi.',
    price: 1229, compareAtPrice: 1349, sku: 'IPD-PRO-12-M2', stock: 29,
    isActive: true, isFeatured: true, categoryId: 'cat-1',
    images: [{ id: 'img-13', url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600', altText: 'iPad Pro', isPrimary: true, displayOrder: 1 }],
    rating: 4.7, reviewCount: 156, tags: ['tablette', 'apple', 'ipad', 'premium'], createdAt: '2024-01-27T10:00:00Z', updatedAt: '2024-01-27T10:00:00Z'
  },
  {
    id: 'prod-14', name: 'Montre Connectée Series 9', slug: 'montre-connectee-series-9',
    description: 'Montre connectée avec suivi santé avancé, GPS, ECG, boîtier aluminium 45mm, bracelet Sport. Autonomie 18h.',
    price: 449, compareAtPrice: 499, sku: 'MNT-CONN-S9', stock: 55,
    isActive: true, isFeatured: true, categoryId: 'cat-1',
    images: [{ id: 'img-14', url: 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=600', altText: 'Montre Connectée', isPrimary: true, displayOrder: 1 }],
    rating: 4.6, reviewCount: 289, tags: ['montre', 'connectée', 'santé', 'smartwatch'], createdAt: '2024-01-28T10:00:00Z', updatedAt: '2024-01-28T10:00:00Z'
  },
  {
    id: 'prod-15', name: 'Parfum Signature Collection', slug: 'parfum-signature',
    description: 'Eau de parfum 100ml. Notes de tête: bergamote, citron. Notes de cœur: rose, jasmin. Fond: bois de santal, musc blanc.',
    price: 89, compareAtPrice: 119, sku: 'PAR-SIG-100', stock: 67,
    isActive: true, isFeatured: false, categoryId: 'cat-6',
    images: [{ id: 'img-15', url: 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=600', altText: 'Parfum', isPrimary: true, displayOrder: 1 }],
    rating: 4.3, reviewCount: 234, tags: ['parfum', 'beauté', 'luxe', 'cadeau'], createdAt: '2024-01-29T10:00:00Z', updatedAt: '2024-01-29T10:00:00Z'
  },
  {
    id: 'prod-16', name: 'AirPods Pro 2ème Génération', slug: 'airpods-pro-2',
    description: 'AirPods Pro avec puce H2, réduction active du bruit 2x améliorée, audio spatial personnalisé, autonomie 30h avec boîtier.',
    price: 279, compareAtPrice: 299, sku: 'APP-PRO-2GEN', stock: 89,
    isActive: true, isFeatured: false, categoryId: 'cat-1',
    images: [{ id: 'img-16', url: 'https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=600', altText: 'AirPods Pro', isPrimary: true, displayOrder: 1 }],
    rating: 4.7, reviewCount: 445, tags: ['airpods', 'apple', 'audio', 'ANC'], createdAt: '2024-01-30T10:00:00Z', updatedAt: '2024-01-30T10:00:00Z'
  },
];

// ─── USERS STORE ──────────────────────────────────────────────
// Passwords hashés (admin123 / user123)
export const users: User[] = [
  {
    id: 'usr-admin-1',
    email: 'admin@boutique.com',
    password: '$2a$12$hashedpasswordforadmin', // admin123 -> will be handled by auth
    firstName: 'Admin',
    lastName: 'Boutique',
    role: 'admin',
    isActive: true,
    avatar: 'https://ui-avatars.com/api/?name=Admin+Boutique&background=6366f1&color=fff',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'usr-1',
    email: 'alice@example.com',
    password: '$2a$12$hashedpasswordforuser', // user123
    firstName: 'Alice',
    lastName: 'Martin',
    role: 'user',
    isActive: true,
    avatar: 'https://ui-avatars.com/api/?name=Alice+Martin&background=ec4899&color=fff',
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z'
  },
];

// ─── ORDERS STORE ─────────────────────────────────────────────
export const orders: Order[] = [
  {
    id: 'ord-1',
    userId: 'usr-1',
    orderNumber: 'CMD-2024-001',
    status: 'delivered',
    paymentStatus: 'paid',
    subtotal: 1628,
    shippingCost: 0,
    taxAmount: 162.8,
    discountAmount: 0,
    totalAmount: 1790.8,
    currency: 'EUR',
    shippingAddress: { firstName: 'Alice', lastName: 'Martin', street: '12 Rue de la Paix', city: 'Paris', state: 'Île-de-France', zipCode: '75001', country: 'FR', phone: '+33612345678' },
    billingAddress: { firstName: 'Alice', lastName: 'Martin', street: '12 Rue de la Paix', city: 'Paris', state: 'Île-de-France', zipCode: '75001', country: 'FR' },
    paymentMethod: 'card',
    items: [
      { id: 'oi-1', orderId: 'ord-1', productId: 'prod-1', productName: 'iPhone 15 Pro Max', productSku: 'IPH-15PM-256', productImage: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600', quantity: 1, unitPrice: 1329, totalPrice: 1329 },
      { id: 'oi-2', orderId: 'ord-1', productId: 'prod-3', productName: 'Sony WH-1000XM5', productSku: 'SNY-WH1000XM5', productImage: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600', quantity: 1, unitPrice: 299, totalPrice: 299 },
    ],
    createdAt: '2024-02-10T14:30:00Z',
    updatedAt: '2024-02-15T10:00:00Z'
  },
  {
    id: 'ord-2',
    userId: 'usr-1',
    orderNumber: 'CMD-2024-002',
    status: 'shipped',
    paymentStatus: 'paid',
    subtotal: 289,
    shippingCost: 5.99,
    taxAmount: 28.9,
    discountAmount: 0,
    totalAmount: 323.89,
    currency: 'EUR',
    shippingAddress: { firstName: 'Alice', lastName: 'Martin', street: '12 Rue de la Paix', city: 'Paris', state: 'Île-de-France', zipCode: '75001', country: 'FR' },
    billingAddress: { firstName: 'Alice', lastName: 'Martin', street: '12 Rue de la Paix', city: 'Paris', state: 'Île-de-France', zipCode: '75001', country: 'FR' },
    paymentMethod: 'card',
    items: [
      { id: 'oi-3', orderId: 'ord-2', productId: 'prod-8', productName: 'Cafetière Espresso Deluxe', productSku: 'CAF-ESP-DLX', productImage: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600', quantity: 1, unitPrice: 289, totalPrice: 289 },
    ],
    createdAt: '2024-03-05T09:15:00Z',
    updatedAt: '2024-03-06T14:00:00Z'
  }
];

// ─── CARTS STORE ──────────────────────────────────────────────
export const carts: Map<string, Cart> = new Map();

// ─── REVIEWS STORE ────────────────────────────────────────────
export const reviews: Review[] = [
  { id: 'rev-1', productId: 'prod-1', userId: 'usr-1', userName: 'Alice M.', rating: 5, title: 'Excellent produit!', comment: 'L\'iPhone 15 Pro Max est incroyable, la qualité photo est exceptionnelle et la puce A17 est ultra-rapide.', isVerifiedPurchase: true, status: 'approved', createdAt: '2024-02-20T10:00:00Z' },
  { id: 'rev-2', productId: 'prod-2', userId: 'usr-1', userName: 'Alice M.', rating: 5, title: 'MacBook parfait pour le développement', comment: 'Performances incroyables avec la puce M3. Compilation rapide, autonomie excellente. Indispensable pour les développeurs.', isVerifiedPurchase: false, status: 'approved', createdAt: '2024-02-21T10:00:00Z' },
];

// ─── WISHLISTS STORE ──────────────────────────────────────────
export const wishlists: WishlistItem[] = [];

// ─── COUPONS STORE ────────────────────────────────────────────
export const coupons: Coupon[] = [
  { id: 'coup-1', code: 'BIENVENUE10', type: 'percentage', value: 10, minOrderAmount: 50, maxUses: 1000, usedCount: 234, isActive: true },
  { id: 'coup-2', code: 'LIVRAISON', type: 'free_shipping', value: 0, minOrderAmount: 30, isActive: true, usedCount: 89 },
  { id: 'coup-3', code: 'PROMO20', type: 'fixed', value: 20, minOrderAmount: 100, isActive: true, usedCount: 45 },
];

// ─── REFRESH TOKENS STORE ─────────────────────────────────────
export const refreshTokens: Map<string, string> = new Map(); // userId -> refreshToken

// ─── COUNTERS ─────────────────────────────────────────────────
let orderCounter = 3;
export const getNextOrderNumber = () => {
  const num = String(orderCounter++).padStart(3, '0');
  return `CMD-2024-${num}`;
};
