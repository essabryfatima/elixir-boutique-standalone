// ============================================================
// PAYMENTS ROUTES - Simulation Stripe
// ============================================================

import { Hono } from 'hono';
import { orders, carts } from '../data/store.js';
import { authMiddleware } from '../middleware/auth.js';
import { generateId } from '../utils/auth.js';

const paymentsRouter = new Hono();

/**
 * POST /api/payments/create-intent
 * Créer une intention de paiement Stripe
 * En prod: utiliser Stripe SDK
 */
paymentsRouter.post('/create-intent', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{ orderId: string }>();
  
  const order = orders.find(o => o.id === body.orderId && o.userId === userId);
  if (!order) {
    return c.json({ success: false, error: 'Commande non trouvée' }, 404);
  }
  
  if (order.paymentStatus === 'paid') {
    return c.json({ success: false, error: 'Cette commande est déjà payée' }, 400);
  }
  
  // Simuler la création d'un PaymentIntent Stripe
  const paymentIntentId = `pi_${generateId('stripe').replace(/-/g, '')}`;
  const clientSecret = `${paymentIntentId}_secret_${Math.random().toString(36).substring(2, 15)}`;
  
  order.paymentIntentId = paymentIntentId;
  order.updatedAt = new Date().toISOString();
  
  return c.json({
    success: true,
    data: {
      paymentIntentId,
      clientSecret,
      amount: Math.round(order.totalAmount * 100), // Stripe uses cents
      currency: order.currency.toLowerCase(),
      orderId: order.id,
    }
  });
});

/**
 * POST /api/payments/confirm
 * Confirmer un paiement (simulé)
 * En prod: écouter le webhook Stripe
 */
paymentsRouter.post('/confirm', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{ 
    orderId: string; 
    paymentIntentId: string;
    cardNumber?: string; // pour simulation
  }>();
  
  const order = orders.find(o => o.id === body.orderId && o.userId === userId);
  if (!order) {
    return c.json({ success: false, error: 'Commande non trouvée' }, 404);
  }
  
  // Simulation: carte se terminant par 0000 = échec
  if (body.cardNumber?.endsWith('0000')) {
    order.paymentStatus = 'failed';
    order.updatedAt = new Date().toISOString();
    return c.json({
      success: false,
      error: 'Paiement refusé. Veuillez utiliser une autre carte.',
      data: { orderId: order.id, paymentStatus: 'failed' }
    }, 402);
  }
  
  // Paiement réussi
  order.paymentStatus = 'paid';
  order.status = 'processing';
  order.updatedAt = new Date().toISOString();
  
  return c.json({
    success: true,
    message: `Paiement de ${order.totalAmount.toFixed(2)}€ accepté! 💳`,
    data: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentStatus: 'paid',
      amount: order.totalAmount,
    }
  });
});

/**
 * POST /api/payments/webhook
 * Webhook Stripe (simulation)
 */
paymentsRouter.post('/webhook', async (c) => {
  const body = await c.req.json();
  
  // En prod: vérifier la signature Stripe
  // const signature = c.req.header('stripe-signature');
  
  const event = body;
  
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntentId = event.data?.object?.id;
      const paidOrder = orders.find(o => o.paymentIntentId === paymentIntentId);
      if (paidOrder) {
        paidOrder.paymentStatus = 'paid';
        paidOrder.status = 'confirmed';
        paidOrder.updatedAt = new Date().toISOString();
      }
      break;
      
    case 'payment_intent.payment_failed':
      const failedIntentId = event.data?.object?.id;
      const failedOrder = orders.find(o => o.paymentIntentId === failedIntentId);
      if (failedOrder) {
        failedOrder.paymentStatus = 'failed';
        failedOrder.updatedAt = new Date().toISOString();
      }
      break;
      
    case 'charge.refunded':
      // Gérer les remboursements
      break;
  }
  
  return c.json({ received: true });
});

/**
 * POST /api/payments/refund/:orderId (admin)
 */
paymentsRouter.post('/refund/:orderId', authMiddleware, async (c) => {
  const body = await c.req.json<{ reason?: string }>();
  const { orderId } = c.req.param();
  const role = c.get('userRole');
  
  if (role !== 'admin') {
    return c.json({ success: false, error: 'Accès refusé' }, 403);
  }
  
  const order = orders.find(o => o.id === orderId);
  if (!order) {
    return c.json({ success: false, error: 'Commande non trouvée' }, 404);
  }
  
  if (order.paymentStatus !== 'paid') {
    return c.json({ success: false, error: 'Cette commande n\'a pas été payée' }, 400);
  }
  
  // Simuler un remboursement
  order.paymentStatus = 'refunded';
  order.status = 'refunded';
  order.updatedAt = new Date().toISOString();
  
  return c.json({
    success: true,
    message: `Remboursement de ${order.totalAmount.toFixed(2)}€ initié`,
    data: { orderId: order.id, refundAmount: order.totalAmount }
  });
});

export default paymentsRouter;
