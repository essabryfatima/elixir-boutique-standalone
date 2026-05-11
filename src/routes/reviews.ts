// ============================================================
// REVIEWS & WISHLIST ROUTES
// ============================================================

import { Hono } from 'hono';
import { reviews, wishlists, products, orders } from '../data/store.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { generateId } from '../utils/auth.js';
import type { Review, WishlistItem } from '../types/index.js';

const reviewsRouter = new Hono();

// ─── REVIEWS ──────────────────────────────────────────────────

/**
 * GET /api/reviews/product/:productId
 */
reviewsRouter.get('/product/:productId', async (c) => {
  const { productId } = c.req.param();
  const productReviews = reviews.filter(r => r.productId === productId && r.status === 'approved')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const avgRating = productReviews.length 
    ? productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length 
    : 0;
  
  return c.json({
    success: true,
    data: productReviews,
    meta: {
      count: productReviews.length,
      averageRating: Math.round(avgRating * 10) / 10,
      distribution: [5, 4, 3, 2, 1].map(rating => ({
        rating,
        count: productReviews.filter(r => r.rating === rating).length
      }))
    }
  });
});

/**
 * POST /api/reviews
 */
reviewsRouter.post('/', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{ productId: string; rating: number; title: string; comment: string }>();
  
  if (!body.productId || !body.rating || !body.comment) {
    return c.json({ success: false, error: 'Produit, note et commentaire requis' }, 400);
  }
  
  if (body.rating < 1 || body.rating > 5) {
    return c.json({ success: false, error: 'La note doit être entre 1 et 5' }, 400);
  }
  
  const product = products.find(p => p.id === body.productId);
  if (!product) {
    return c.json({ success: false, error: 'Produit non trouvé' }, 404);
  }
  
  // Vérifier achat vérifié
  const hasOrdered = orders.some(o => 
    o.userId === userId && 
    o.paymentStatus === 'paid' && 
    o.items.some(i => i.productId === body.productId)
  );
  
  const { users } = await import('../data/store.js');
  const user = users.find(u => u.id === userId);
  
  const newReview: Review = {
    id: generateId('rev'),
    productId: body.productId,
    userId,
    userName: user ? `${user.firstName} ${user.lastName.charAt(0)}.` : 'Anonyme',
    userAvatar: user?.avatar,
    rating: body.rating,
    title: body.title || '',
    comment: body.comment,
    isVerifiedPurchase: hasOrdered,
    status: 'approved', // Auto-approve pour la démo
    createdAt: new Date().toISOString(),
  };
  
  reviews.push(newReview);
  
  // Mettre à jour la note du produit
  const productReviews = reviews.filter(r => r.productId === body.productId && r.status === 'approved');
  product.rating = Math.round((productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length) * 10) / 10;
  product.reviewCount = productReviews.length;
  
  return c.json({ success: true, data: newReview, message: 'Avis publié! Merci pour votre retour 🌟' }, 201);
});

/**
 * DELETE /api/reviews/:id
 */
reviewsRouter.delete('/:id', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const role = c.get('userRole');
  const { id } = c.req.param();
  
  const index = reviews.findIndex(r => r.id === id);
  if (index === -1) {
    return c.json({ success: false, error: 'Avis non trouvé' }, 404);
  }
  
  if (role !== 'admin' && reviews[index].userId !== userId) {
    return c.json({ success: false, error: 'Accès refusé' }, 403);
  }
  
  reviews.splice(index, 1);
  return c.json({ success: true, message: 'Avis supprimé' });
});

export default reviewsRouter;


// ─── WISHLIST ROUTER ──────────────────────────────────────────

export const wishlistRouter = new Hono();

/**
 * GET /api/wishlist
 */
wishlistRouter.get('/', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const userWishlist = wishlists
    .filter(w => w.userId === userId)
    .map(w => ({
      ...w,
      product: products.find(p => p.id === w.productId)
    }))
    .filter(w => w.product);
  
  return c.json({ success: true, data: userWishlist });
});

/**
 * POST /api/wishlist/:productId
 */
wishlistRouter.post('/:productId', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const { productId } = c.req.param();
  
  const product = products.find(p => p.id === productId);
  if (!product) {
    return c.json({ success: false, error: 'Produit non trouvé' }, 404);
  }
  
  const existing = wishlists.find(w => w.userId === userId && w.productId === productId);
  if (existing) {
    return c.json({ success: false, error: 'Déjà dans la wishlist' }, 409);
  }
  
  const item: WishlistItem = {
    id: generateId('wl'),
    userId,
    productId,
    addedAt: new Date().toISOString(),
  };
  
  wishlists.push(item);
  return c.json({ success: true, data: item, message: `${product.name} ajouté à la wishlist ❤️` }, 201);
});

/**
 * DELETE /api/wishlist/:productId
 */
wishlistRouter.delete('/:productId', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const { productId } = c.req.param();
  
  const index = wishlists.findIndex(w => w.userId === userId && w.productId === productId);
  if (index === -1) {
    return c.json({ success: false, error: 'Produit non trouvé dans la wishlist' }, 404);
  }
  
  wishlists.splice(index, 1);
  return c.json({ success: true, message: 'Retiré de la wishlist' });
});
