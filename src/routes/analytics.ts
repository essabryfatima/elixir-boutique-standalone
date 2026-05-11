// ============================================================
// ANALYTICS ROUTES - Dashboard Admin
// ============================================================

import { Hono } from 'hono';
import { orders, products, users, categories } from '../data/store.js';
import { adminMiddleware } from '../middleware/auth.js';
import type { Analytics } from '../types/index.js';

const analyticsRouter = new Hono();

// Toutes les routes analytics sont protégées admin
analyticsRouter.use('/*', adminMiddleware);

/**
 * GET /api/analytics/dashboard
 * Données du dashboard principal
 */
analyticsRouter.get('/dashboard', async (c) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  
  // ─── KPIs actuels (30 derniers jours) ─────────────────────
  const recentOrders = orders.filter(o => new Date(o.createdAt) >= thirtyDaysAgo);
  const previousOrders = orders.filter(o => new Date(o.createdAt) >= sixtyDaysAgo && new Date(o.createdAt) < thirtyDaysAgo);
  
  const totalRevenue = orders.filter(o => o.paymentStatus === 'paid').reduce((sum, o) => sum + o.totalAmount, 0);
  const previousRevenue = previousOrders.filter(o => o.paymentStatus === 'paid').reduce((sum, o) => sum + o.totalAmount, 0);
  const recentRevenue = recentOrders.filter(o => o.paymentStatus === 'paid').reduce((sum, o) => sum + o.totalAmount, 0);
  
  const revenueChange = previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 100;
  const ordersChange = previousOrders.length > 0 ? ((recentOrders.length - previousOrders.length) / previousOrders.length) * 100 : 100;
  
  // ─── Ventes par jour (7 derniers jours) ───────────────────
  const salesByDay = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    const dayOrders = orders.filter(o => o.createdAt.startsWith(dateStr));
    
    salesByDay.push({
      date: dateStr,
      label: date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
      revenue: dayOrders.filter(o => o.paymentStatus === 'paid').reduce((sum, o) => sum + o.totalAmount, 0),
      orders: dayOrders.length,
    });
  }
  
  // ─── Produits les plus vendus ──────────────────────────────
  const salesByProduct: Map<string, { product: any; sales: number; revenue: number }> = new Map();
  
  for (const order of orders) {
    for (const item of order.items) {
      const existing = salesByProduct.get(item.productId);
      const product = products.find(p => p.id === item.productId);
      if (product) {
        if (existing) {
          existing.sales += item.quantity;
          existing.revenue += item.totalPrice;
        } else {
          salesByProduct.set(item.productId, {
            product: { id: product.id, name: product.name, image: product.images[0]?.url, price: product.price },
            sales: item.quantity,
            revenue: item.totalPrice,
          });
        }
      }
    }
  }
  
  const topProducts = Array.from(salesByProduct.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  
  // ─── Ventes par catégorie ──────────────────────────────────
  const salesByCategory: Map<string, number> = new Map();
  const totalSalesAmount = orders.reduce((sum, o) => sum + o.subtotal, 0) || 1;
  
  for (const order of orders) {
    for (const item of order.items) {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        const category = categories.find(c => c.id === product.categoryId);
        const catName = category?.name || 'Autre';
        salesByCategory.set(catName, (salesByCategory.get(catName) || 0) + item.totalPrice);
      }
    }
  }
  
  const salesByCategoryArray = Array.from(salesByCategory.entries())
    .map(([category, revenue]) => ({
      category,
      revenue: Math.round(revenue * 100) / 100,
      percentage: Math.round((revenue / totalSalesAmount) * 100),
    }))
    .sort((a, b) => b.revenue - a.revenue);
  
  // ─── Statuts des commandes ─────────────────────────────────
  const ordersByStatus = [
    { status: 'pending', label: 'En attente', count: orders.filter(o => o.status === 'pending').length, color: '#f59e0b' },
    { status: 'processing', label: 'En traitement', count: orders.filter(o => o.status === 'processing').length, color: '#3b82f6' },
    { status: 'confirmed', label: 'Confirmées', count: orders.filter(o => o.status === 'confirmed').length, color: '#6366f1' },
    { status: 'shipped', label: 'Expédiées', count: orders.filter(o => o.status === 'shipped').length, color: '#8b5cf6' },
    { status: 'delivered', label: 'Livrées', count: orders.filter(o => o.status === 'delivered').length, color: '#10b981' },
    { status: 'cancelled', label: 'Annulées', count: orders.filter(o => o.status === 'cancelled').length, color: '#ef4444' },
  ];
  
  // ─── Dernières commandes ───────────────────────────────────
  const latestOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map(order => {
      const user = users.find(u => u.id === order.userId);
      return {
        ...order,
        user: user ? { firstName: user.firstName, lastName: user.lastName, email: user.email, avatar: user.avatar } : null
      };
    });
  
  // ─── Produits en rupture de stock ─────────────────────────
  const lowStockProducts = products.filter(p => p.isActive && p.stock <= 10)
    .map(p => ({ id: p.id, name: p.name, stock: p.stock, sku: p.sku, image: p.images[0]?.url }))
    .slice(0, 5);
  
  const analytics: Analytics = {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalOrders: orders.length,
    totalProducts: products.filter(p => p.isActive).length,
    totalUsers: users.length,
    revenueChange: Math.round(revenueChange * 10) / 10,
    ordersChange: Math.round(ordersChange * 10) / 10,
    recentOrders: latestOrders,
    topProducts,
    salesByDay,
    salesByCategory: salesByCategoryArray,
    ordersByStatus,
  };
  
  return c.json({ success: true, data: { ...analytics, lowStockProducts } });
});

/**
 * GET /api/analytics/users
 * Stats utilisateurs
 */
analyticsRouter.get('/users', async (c) => {
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.isActive).length;
  const adminUsers = users.filter(u => u.role === 'admin').length;
  
  const recentUsers = [...users]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)
    .map(({ password: _, ...u }) => u);
  
  return c.json({
    success: true,
    data: { totalUsers, activeUsers, adminUsers, recentUsers }
  });
});

/**
 * GET /api/analytics/products
 * Stats produits
 */
analyticsRouter.get('/products', async (c) => {
  const stats = {
    total: products.length,
    active: products.filter(p => p.isActive).length,
    featured: products.filter(p => p.isFeatured).length,
    outOfStock: products.filter(p => p.stock === 0).length,
    lowStock: products.filter(p => p.stock > 0 && p.stock <= 10).length,
    byCategory: categories.map(cat => ({
      ...cat,
      productCount: products.filter(p => p.categoryId === cat.id).length,
    })),
  };
  
  return c.json({ success: true, data: stats });
});

export default analyticsRouter;
