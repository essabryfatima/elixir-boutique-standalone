// ============================================================
// PRODUCTS ROUTES - CRUD, Search, Filter, Pagination
// ============================================================

import { Hono } from 'hono';
import { products, categories, reviews } from '../data/store.js';
import { adminMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { generateId, generateSlug } from '../utils/auth.js';
import type { Product, ProductDTO } from '../types/index.js';

const productsRouter = new Hono();

/**
 * GET /api/products
 * Liste produits avec filtres, recherche, pagination
 */
productsRouter.get('/', optionalAuthMiddleware, async (c) => {
  const { 
    page = '1', limit = '12', 
    category, search, 
    minPrice, maxPrice, 
    sort = 'newest',
    featured, inStock
  } = c.req.query();
  
  let filtered = [...products].filter(p => p.isActive);
  
  // Filtres
  if (category) {
    const cat = categories.find(cat => cat.slug === category || cat.id === category);
    if (cat) filtered = filtered.filter(p => p.categoryId === cat.id);
  }
  
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    );
  }
  
  if (minPrice) filtered = filtered.filter(p => p.price >= parseFloat(minPrice));
  if (maxPrice) filtered = filtered.filter(p => p.price <= parseFloat(maxPrice));
  if (featured === 'true') filtered = filtered.filter(p => p.isFeatured);
  if (inStock === 'true') filtered = filtered.filter(p => p.stock > 0);
  
  // Tri
  switch (sort) {
    case 'price-asc': filtered.sort((a, b) => a.price - b.price); break;
    case 'price-desc': filtered.sort((a, b) => b.price - a.price); break;
    case 'rating': filtered.sort((a, b) => b.rating - a.rating); break;
    case 'popular': filtered.sort((a, b) => b.reviewCount - a.reviewCount); break;
    case 'oldest': filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break;
    default: filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // newest
  }
  
  // Pagination
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const total = filtered.length;
  const totalPages = Math.ceil(total / limitNum);
  const data = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);
  
  return c.json({
    success: true,
    data,
    meta: { page: pageNum, limit: limitNum, total, totalPages }
  });
});

/**
 * GET /api/products/featured
 * Produits mis en avant (homepage)
 */
productsRouter.get('/featured', async (c) => {
  const featured = products.filter(p => p.isActive && p.isFeatured).slice(0, 8);
  return c.json({ success: true, data: featured });
});

/**
 * GET /api/products/search
 * Recherche instantanée (autocomplete)
 */
productsRouter.get('/search', async (c) => {
  const { q } = c.req.query();
  if (!q || q.length < 2) return c.json({ success: true, data: [] });
  
  const query = q.toLowerCase();
  const results = products
    .filter(p => p.isActive && (
      p.name.toLowerCase().includes(query) ||
      p.tags.some(t => t.toLowerCase().includes(query))
    ))
    .slice(0, 8)
    .map(p => ({ id: p.id, name: p.name, slug: p.slug, price: p.price, image: p.images[0]?.url }));
  
  return c.json({ success: true, data: results });
});

/**
 * GET /api/products/:id
 * Détail d'un produit
 */
productsRouter.get('/:id', async (c) => {
  const { id } = c.req.param();
  const product = products.find(p => (p.id === id || p.slug === id) && p.isActive);
  
  if (!product) {
    return c.json({ success: false, error: 'Produit non trouvé' }, 404);
  }
  
  // Ajouter les reviews approuvées
  const productReviews = reviews.filter(r => r.productId === product.id && r.status === 'approved');
  const category = categories.find(c => c.id === product.categoryId);
  
  return c.json({
    success: true,
    data: {
      ...product,
      category,
      reviews: productReviews,
    }
  });
});

/**
 * GET /api/products/:id/related
 * Produits similaires
 */
productsRouter.get('/:id/related', async (c) => {
  const { id } = c.req.param();
  const product = products.find(p => p.id === id || p.slug === id);
  
  if (!product) {
    return c.json({ success: false, error: 'Produit non trouvé' }, 404);
  }
  
  const related = products
    .filter(p => p.isActive && p.id !== product.id && p.categoryId === product.categoryId)
    .slice(0, 4);
  
  return c.json({ success: true, data: related });
});

// ─── ADMIN ROUTES ─────────────────────────────────────────────

/**
 * POST /api/products
 * Créer un produit (admin)
 */
productsRouter.post('/', adminMiddleware, async (c) => {
  const body = await c.req.json<ProductDTO>();
  
  if (!body.name || !body.price || !body.sku || !body.categoryId) {
    return c.json({ success: false, error: 'Nom, prix, SKU et catégorie sont requis' }, 400);
  }
  
  // Vérifier que la catégorie existe
  const category = categories.find(cat => cat.id === body.categoryId);
  if (!category) {
    return c.json({ success: false, error: 'Catégorie non trouvée' }, 400);
  }
  
  // Vérifier unicité du SKU
  if (products.some(p => p.sku === body.sku)) {
    return c.json({ success: false, error: 'Ce SKU est déjà utilisé' }, 409);
  }
  
  const newProduct: Product = {
    id: generateId('prod'),
    name: body.name,
    slug: generateSlug(body.name),
    description: body.description || '',
    price: body.price,
    compareAtPrice: body.compareAtPrice,
    sku: body.sku,
    stock: body.stock || 0,
    isActive: body.isActive !== false,
    isFeatured: body.isFeatured || false,
    categoryId: body.categoryId,
    images: (body.images || []).map((url, i) => ({
      id: generateId('img'),
      url,
      altText: body.name,
      isPrimary: i === 0,
      displayOrder: i + 1
    })),
    rating: 0,
    reviewCount: 0,
    tags: body.tags || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  products.push(newProduct);
  
  return c.json({ success: true, data: newProduct, message: 'Produit créé avec succès' }, 201);
});

/**
 * PUT /api/products/:id
 * Mettre à jour un produit (admin)
 */
productsRouter.put('/:id', adminMiddleware, async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const index = products.findIndex(p => p.id === id);
  
  if (index === -1) {
    return c.json({ success: false, error: 'Produit non trouvé' }, 404);
  }
  
  const updated = {
    ...products[index],
    ...body,
    id: products[index].id, // immutable
    updatedAt: new Date().toISOString(),
  };
  
  if (body.name && body.name !== products[index].name) {
    updated.slug = generateSlug(body.name);
  }
  
  products[index] = updated;
  
  return c.json({ success: true, data: products[index], message: 'Produit mis à jour' });
});

/**
 * DELETE /api/products/:id
 * Supprimer un produit (admin)
 */
productsRouter.delete('/:id', adminMiddleware, async (c) => {
  const { id } = c.req.param();
  const index = products.findIndex(p => p.id === id);
  
  if (index === -1) {
    return c.json({ success: false, error: 'Produit non trouvé' }, 404);
  }
  
  products.splice(index, 1);
  
  return c.json({ success: true, message: 'Produit supprimé avec succès' });
});

/**
 * PATCH /api/products/:id/stock
 * Mettre à jour le stock (admin)
 */
productsRouter.patch('/:id/stock', adminMiddleware, async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<{ stock: number; operation?: 'set' | 'add' | 'subtract' }>();
  const product = products.find(p => p.id === id);
  
  if (!product) {
    return c.json({ success: false, error: 'Produit non trouvé' }, 404);
  }
  
  const { stock, operation = 'set' } = body;
  
  if (operation === 'set') product.stock = stock;
  else if (operation === 'add') product.stock += stock;
  else if (operation === 'subtract') {
    if (product.stock < stock) {
      return c.json({ success: false, error: 'Stock insuffisant' }, 400);
    }
    product.stock -= stock;
  }
  
  product.updatedAt = new Date().toISOString();
  
  return c.json({ success: true, data: { id: product.id, stock: product.stock }, message: 'Stock mis à jour' });
});

export default productsRouter;
