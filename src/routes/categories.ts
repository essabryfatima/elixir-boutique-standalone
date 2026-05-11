// ============================================================
// CATEGORIES ROUTES
// ============================================================

import { Hono } from 'hono';
import { categories, products } from '../data/store.js';
import { adminMiddleware } from '../middleware/auth.js';
import { generateId, generateSlug } from '../utils/auth.js';
import type { Category } from '../types/index.js';

const categoriesRouter = new Hono();

/**
 * GET /api/categories
 * Liste toutes les catégories avec compte de produits
 */
categoriesRouter.get('/', async (c) => {
  const result = categories.map(cat => ({
    ...cat,
    productCount: products.filter(p => p.categoryId === cat.id && p.isActive).length,
  }));
  return c.json({ success: true, data: result });
});

/**
 * GET /api/categories/:slug
 * Détail d'une catégorie
 */
categoriesRouter.get('/:slug', async (c) => {
  const { slug } = c.req.param();
  const category = categories.find(cat => cat.slug === slug || cat.id === slug);
  
  if (!category) {
    return c.json({ success: false, error: 'Catégorie non trouvée' }, 404);
  }
  
  return c.json({
    success: true,
    data: {
      ...category,
      productCount: products.filter(p => p.categoryId === category.id && p.isActive).length,
    }
  });
});

/**
 * POST /api/categories (admin)
 */
categoriesRouter.post('/', adminMiddleware, async (c) => {
  const body = await c.req.json<Partial<Category>>();
  
  if (!body.name) {
    return c.json({ success: false, error: 'Le nom est requis' }, 400);
  }
  
  const newCategory: Category = {
    id: generateId('cat'),
    name: body.name,
    slug: generateSlug(body.name),
    description: body.description || '',
    imageUrl: body.imageUrl,
    displayOrder: body.displayOrder || categories.length + 1,
  };
  
  categories.push(newCategory);
  return c.json({ success: true, data: newCategory }, 201);
});

/**
 * PUT /api/categories/:id (admin)
 */
categoriesRouter.put('/:id', adminMiddleware, async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const index = categories.findIndex(cat => cat.id === id);
  
  if (index === -1) {
    return c.json({ success: false, error: 'Catégorie non trouvée' }, 404);
  }
  
  categories[index] = { ...categories[index], ...body, id: categories[index].id };
  return c.json({ success: true, data: categories[index] });
});

/**
 * DELETE /api/categories/:id (admin)
 */
categoriesRouter.delete('/:id', adminMiddleware, async (c) => {
  const { id } = c.req.param();
  const index = categories.findIndex(cat => cat.id === id);
  
  if (index === -1) {
    return c.json({ success: false, error: 'Catégorie non trouvée' }, 404);
  }
  
  const productCount = products.filter(p => p.categoryId === id).length;
  if (productCount > 0) {
    return c.json({ success: false, error: `Impossible de supprimer: ${productCount} produit(s) dans cette catégorie` }, 409);
  }
  
  categories.splice(index, 1);
  return c.json({ success: true, message: 'Catégorie supprimée' });
});

export default categoriesRouter;
