// ============================================================
// CART ROUTES - Gestion du panier
// ============================================================

import { Hono } from 'hono';
import { carts, products } from '../data/store.js';
import { authMiddleware } from '../middleware/auth.js';
import { generateId } from '../utils/auth.js';
import type { Cart, CartItem } from '../types/index.js';

const cartRouter = new Hono();

// Toutes les routes du panier nécessitent une authentification
cartRouter.use('/*', authMiddleware);

/**
 * Obtenir ou créer le panier d'un utilisateur
 */
function getOrCreateCart(userId: string): Cart {
  let cart = carts.get(userId);
  if (!cart) {
    cart = {
      id: generateId('cart'),
      userId,
      items: [],
      subtotal: 0,
      itemCount: 0,
      updatedAt: new Date().toISOString(),
    };
    carts.set(userId, cart);
  }
  return cart;
}

/**
 * Recalculer les totaux du panier
 */
function recalculateCart(cart: Cart): Cart {
  cart.subtotal = cart.items.reduce((sum, item) => sum + (item.priceAtTime * item.quantity), 0);
  cart.itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  cart.updatedAt = new Date().toISOString();
  return cart;
}

/**
 * GET /api/cart
 * Obtenir le panier avec les détails produits
 */
cartRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const cart = getOrCreateCart(userId);
  
  // Enrichir avec les données produits
  const enrichedItems = cart.items.map(item => {
    const product = products.find(p => p.id === item.productId);
    return {
      ...item,
      product: product ? {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        stock: product.stock,
        image: product.images[0]?.url,
        isActive: product.isActive,
      } : null
    };
  }).filter(item => item.product); // Enlever les produits supprimés
  
  return c.json({
    success: true,
    data: {
      ...cart,
      items: enrichedItems,
    }
  });
});

/**
 * POST /api/cart/items
 * Ajouter un produit au panier
 */
cartRouter.post('/items', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{ productId: string; quantity: number }>();
  const { productId, quantity = 1 } = body;
  
  if (!productId) {
    return c.json({ success: false, error: 'ID produit requis' }, 400);
  }
  
  if (quantity < 1 || quantity > 99) {
    return c.json({ success: false, error: 'Quantité invalide (1-99)' }, 400);
  }
  
  // Vérifier le produit
  const product = products.find(p => p.id === productId && p.isActive);
  if (!product) {
    return c.json({ success: false, error: 'Produit non trouvé ou indisponible' }, 404);
  }
  
  const cart = getOrCreateCart(userId);
  
  // Vérifier si déjà dans le panier
  const existingItemIndex = cart.items.findIndex(i => i.productId === productId);
  
  if (existingItemIndex >= 0) {
    // Mettre à jour la quantité
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;
    
    if (newQuantity > product.stock) {
      return c.json({ success: false, error: `Stock insuffisant. Maximum disponible: ${product.stock}` }, 400);
    }
    
    cart.items[existingItemIndex].quantity = newQuantity;
  } else {
    // Vérifier le stock
    if (quantity > product.stock) {
      return c.json({ success: false, error: `Stock insuffisant. Maximum disponible: ${product.stock}` }, 400);
    }
    
    // Ajouter nouvel item
    const newItem: CartItem = {
      id: generateId('ci'),
      productId,
      quantity,
      priceAtTime: product.price,
      addedAt: new Date().toISOString(),
    };
    cart.items.push(newItem);
  }
  
  recalculateCart(cart);
  carts.set(userId, cart);
  
  return c.json({
    success: true,
    data: cart,
    message: `${product.name} ajouté au panier ✓`
  });
});

/**
 * PUT /api/cart/items/:itemId
 * Mettre à jour la quantité d'un item
 */
cartRouter.put('/items/:itemId', async (c) => {
  const userId = c.get('userId');
  const { itemId } = c.req.param();
  const body = await c.req.json<{ quantity: number }>();
  
  const cart = getOrCreateCart(userId);
  const itemIndex = cart.items.findIndex(i => i.id === itemId);
  
  if (itemIndex === -1) {
    return c.json({ success: false, error: 'Article non trouvé dans le panier' }, 404);
  }
  
  const { quantity } = body;
  
  if (quantity < 1) {
    // Supprimer l'item si quantité = 0
    cart.items.splice(itemIndex, 1);
  } else {
    const product = products.find(p => p.id === cart.items[itemIndex].productId);
    if (product && quantity > product.stock) {
      return c.json({ success: false, error: `Stock insuffisant. Maximum: ${product.stock}` }, 400);
    }
    cart.items[itemIndex].quantity = quantity;
  }
  
  recalculateCart(cart);
  carts.set(userId, cart);
  
  return c.json({ success: true, data: cart });
});

/**
 * DELETE /api/cart/items/:itemId
 * Supprimer un article du panier
 */
cartRouter.delete('/items/:itemId', async (c) => {
  const userId = c.get('userId');
  const { itemId } = c.req.param();
  
  const cart = getOrCreateCart(userId);
  const itemIndex = cart.items.findIndex(i => i.id === itemId);
  
  if (itemIndex === -1) {
    return c.json({ success: false, error: 'Article non trouvé' }, 404);
  }
  
  cart.items.splice(itemIndex, 1);
  recalculateCart(cart);
  carts.set(userId, cart);
  
  return c.json({ success: true, data: cart, message: 'Article supprimé du panier' });
});

/**
 * DELETE /api/cart
 * Vider le panier
 */
cartRouter.delete('/', async (c) => {
  const userId = c.get('userId');
  carts.delete(userId);
  
  return c.json({ success: true, message: 'Panier vidé' });
});

/**
 * POST /api/cart/apply-coupon
 * Appliquer un code promo
 */
cartRouter.post('/apply-coupon', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{ code: string }>();
  
  const { coupons } = await import('../data/store.js');
  const coupon = coupons.find(cp => cp.code === body.code?.toUpperCase() && cp.isActive);
  
  if (!coupon) {
    return c.json({ success: false, error: 'Code promo invalide ou expiré' }, 400);
  }
  
  const cart = getOrCreateCart(userId);
  
  if (coupon.minOrderAmount && cart.subtotal < coupon.minOrderAmount) {
    return c.json({ success: false, error: `Montant minimum requis: ${coupon.minOrderAmount}€` }, 400);
  }
  
  let discount = 0;
  if (coupon.type === 'percentage') discount = cart.subtotal * (coupon.value / 100);
  else if (coupon.type === 'fixed') discount = Math.min(coupon.value, cart.subtotal);
  else if (coupon.type === 'free_shipping') discount = 5.99; // Standard shipping cost
  
  return c.json({
    success: true,
    data: {
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discount: Math.round(discount * 100) / 100,
      }
    },
    message: `Code "${coupon.code}" appliqué! -${discount.toFixed(2)}€`
  });
});

export default cartRouter;
