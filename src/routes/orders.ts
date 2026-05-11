// ============================================================
// ORDERS ROUTES - Commandes
// ============================================================

import { Hono } from 'hono';
import { orders, carts, products, users, getNextOrderNumber as getOrderNum } from '../data/store.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { generateId, calculateTax } from '../utils/auth.js';
import type { Order, OrderItem, OrderDTO } from '../types/index.js';

const ordersRouter = new Hono();

/**
 * GET /api/orders
 * Historique des commandes (user: ses commandes, admin: toutes)
 */
ordersRouter.get('/', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const role = c.get('userRole');
  const { page = '1', limit = '10', status } = c.req.query();
  
  let userOrders = role === 'admin' ? [...orders] : orders.filter(o => o.userId === userId);
  
  if (status) userOrders = userOrders.filter(o => o.status === status);
  
  // Trier par date décroissante
  userOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  // Pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const total = userOrders.length;
  const data = userOrders.slice((pageNum - 1) * limitNum, pageNum * limitNum);
  
  // Enrichir avec infos utilisateur (admin only)
  const enrichedData = data.map(order => {
    if (role === 'admin') {
      const user = users.find(u => u.id === order.userId);
      return {
        ...order,
        user: user ? { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, avatar: user.avatar } : null
      };
    }
    return order;
  });
  
  return c.json({
    success: true,
    data: enrichedData,
    meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
  });
});

/**
 * GET /api/orders/:id
 * Détail d'une commande
 */
ordersRouter.get('/:id', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const role = c.get('userRole');
  const { id } = c.req.param();
  
  const order = orders.find(o => o.id === id || o.orderNumber === id);
  
  if (!order) {
    return c.json({ success: false, error: 'Commande non trouvée' }, 404);
  }
  
  // Vérifier accès (user ne peut voir que ses commandes)
  if (role !== 'admin' && order.userId !== userId) {
    return c.json({ success: false, error: 'Accès refusé' }, 403);
  }
  
  return c.json({ success: true, data: order });
});

/**
 * POST /api/orders
 * Créer une commande depuis le panier
 */
ordersRouter.post('/', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<OrderDTO>();
  
  const { shippingAddress, billingAddress, paymentMethod, notes, couponCode } = body;
  
  if (!shippingAddress || !billingAddress || !paymentMethod) {
    return c.json({ success: false, error: 'Adresse de livraison, facturation et mode de paiement requis' }, 400);
  }
  
  // Obtenir le panier
  const cart = carts.get(userId);
  if (!cart || cart.items.length === 0) {
    return c.json({ success: false, error: 'Votre panier est vide' }, 400);
  }
  
  // Vérifier stock et créer les items de commande
  const orderItems: OrderItem[] = [];
  
  for (const cartItem of cart.items) {
    const product = products.find(p => p.id === cartItem.productId);
    if (!product) {
      return c.json({ success: false, error: `Produit ${cartItem.productId} non trouvé` }, 400);
    }
    if (product.stock < cartItem.quantity) {
      return c.json({ success: false, error: `Stock insuffisant pour ${product.name}` }, 400);
    }
    
    orderItems.push({
      id: generateId('oi'),
      orderId: '', // sera rempli
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      productImage: product.images[0]?.url,
      quantity: cartItem.quantity,
      unitPrice: cartItem.priceAtTime,
      totalPrice: cartItem.priceAtTime * cartItem.quantity,
    });
  }
  
  const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const shippingCost = subtotal >= 50 ? 0 : 5.99; // Livraison gratuite dès 50€
  const taxAmount = calculateTax(subtotal);
  
  // Appliquer coupon
  let discountAmount = 0;
  if (couponCode) {
    const { coupons } = await import('../data/store.js');
    const coupon = coupons.find(cp => cp.code === couponCode.toUpperCase() && cp.isActive);
    if (coupon) {
      if (coupon.type === 'percentage') discountAmount = subtotal * (coupon.value / 100);
      else if (coupon.type === 'fixed') discountAmount = Math.min(coupon.value, subtotal);
      else if (coupon.type === 'free_shipping') discountAmount = shippingCost;
    }
  }
  
  const totalAmount = subtotal + shippingCost + taxAmount - discountAmount;
  const orderId = generateId('ord');
  
  // Mettre à jour orderId dans les items
  orderItems.forEach(item => item.orderId = orderId);
  
  const newOrder: Order = {
    id: orderId,
    userId,
    orderNumber: getOrderNum(),
    status: 'pending',
    paymentStatus: paymentMethod === 'card' ? 'pending' : 'pending',
    subtotal: Math.round(subtotal * 100) / 100,
    shippingCost: Math.round(shippingCost * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    currency: 'EUR',
    shippingAddress,
    billingAddress,
    paymentMethod,
    items: orderItems,
    notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  orders.push(newOrder);
  
  // Déduire le stock
  for (const cartItem of cart.items) {
    const product = products.find(p => p.id === cartItem.productId);
    if (product) product.stock -= cartItem.quantity;
  }
  
  // Vider le panier
  carts.delete(userId);
  
  return c.json({
    success: true,
    data: newOrder,
    message: `Commande ${newOrder.orderNumber} créée avec succès! 🎉`
  }, 201);
});

/**
 * PATCH /api/orders/:id/status (admin)
 * Mettre à jour le statut d'une commande
 */
ordersRouter.patch('/:id/status', adminMiddleware, async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<{ status: Order['status']; paymentStatus?: Order['paymentStatus'] }>();
  
  const order = orders.find(o => o.id === id || o.orderNumber === id);
  if (!order) {
    return c.json({ success: false, error: 'Commande non trouvée' }, 404);
  }
  
  const validStatuses = ['pending', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'];
  if (!validStatuses.includes(body.status)) {
    return c.json({ success: false, error: 'Statut invalide' }, 400);
  }
  
  order.status = body.status;
  if (body.paymentStatus) order.paymentStatus = body.paymentStatus;
  order.updatedAt = new Date().toISOString();
  
  const statusLabels: Record<string, string> = {
    pending: 'En attente',
    processing: 'En traitement',
    confirmed: 'Confirmée',
    shipped: 'Expédiée',
    delivered: 'Livrée',
    cancelled: 'Annulée',
    refunded: 'Remboursée',
  };
  
  return c.json({
    success: true,
    data: order,
    message: `Statut mis à jour: ${statusLabels[body.status]}`
  });
});

/**
 * POST /api/orders/:id/cancel
 * Annuler une commande (user)
 */
ordersRouter.post('/:id/cancel', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const { id } = c.req.param();
  
  const order = orders.find(o => o.id === id && o.userId === userId);
  if (!order) {
    return c.json({ success: false, error: 'Commande non trouvée' }, 404);
  }
  
  if (!['pending', 'processing'].includes(order.status)) {
    return c.json({ success: false, error: 'Cette commande ne peut plus être annulée' }, 400);
  }
  
  order.status = 'cancelled';
  order.updatedAt = new Date().toISOString();
  
  // Restaurer le stock
  for (const item of order.items) {
    const product = products.find(p => p.id === item.productId);
    if (product) product.stock += item.quantity;
  }
  
  return c.json({ success: true, data: order, message: 'Commande annulée avec succès' });
});

export default ordersRouter;
