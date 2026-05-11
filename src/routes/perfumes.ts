// ============================================================
// PERFUME BOUTIQUE ROUTES
// Endpoints: GET /api/perfumes/categories, /api/perfumes/products, etc.
// ============================================================

import { Hono } from 'hono';
import {
  perfumeCategories,
  getAllPerfumeProducts,
  getPerfumeCategoryById,
  getPerfumeProductById,
  type PerfumeCategory,
  type PerfumeProduct,
} from '../data/perfumes.js';

const perfumesRouter = new Hono();

// ─── GET /api/perfumes/categories ─────────────────────────────
// Retourne toutes les catégories avec métadonnées (sans les produits pour alléger)
perfumesRouter.get('/categories', (c) => {
  const categoriesSummary = perfumeCategories.map((cat) => ({
    id: cat.id,
    slug: cat.slug,
    name: cat.name,
    description: cat.description,
    icon: cat.icon,
    color: cat.color,
    textColor: cat.textColor,
    imageUrl: cat.imageUrl,
    productCount: cat.products.length,
  }));

  return c.json({
    success: true,
    data: categoriesSummary,
    total: categoriesSummary.length,
  });
});

// ─── GET /api/perfumes/categories/:slug ───────────────────────
// Retourne une catégorie avec tous ses produits
perfumesRouter.get('/categories/:slug', (c) => {
  const slug = c.req.param('slug');
  const category = getPerfumeCategoryById(slug);

  if (!category) {
    return c.json({ success: false, error: 'Catégorie non trouvée' }, 404);
  }

  return c.json({
    success: true,
    data: category,
  });
});

// ─── GET /api/perfumes/products ───────────────────────────────
// Retourne tous les produits avec filtres optionnels
perfumesRouter.get('/products', (c) => {
  const query = c.req.query();
  let products = getAllPerfumeProducts();

  // Filtrer par catégorie
  if (query.category) {
    products = products.filter((p) => p.categoryId === query.category);
  }

  // Filtrer par prix min/max
  if (query.minPrice) {
    products = products.filter((p) => p.price >= Number(query.minPrice));
  }
  if (query.maxPrice) {
    products = products.filter((p) => p.price <= Number(query.maxPrice));
  }

  // Filtrer par badge
  if (query.badge) {
    products = products.filter((p) => p.badge === query.badge);
  }

  // Recherche par nom
  if (query.search) {
    const searchLower = query.search.toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        p.notes.top.some((n) => n.toLowerCase().includes(searchLower)) ||
        p.notes.heart.some((n) => n.toLowerCase().includes(searchLower)) ||
        p.notes.base.some((n) => n.toLowerCase().includes(searchLower))
    );
  }

  // Trier
  const sort = query.sort || 'default';
  switch (sort) {
    case 'price_asc':
      products.sort((a, b) => a.price - b.price);
      break;
    case 'price_desc':
      products.sort((a, b) => b.price - a.price);
      break;
    case 'rating':
      products.sort((a, b) => b.rating - a.rating);
      break;
    case 'popular':
      products.sort((a, b) => b.reviewCount - a.reviewCount);
      break;
    default:
      break; // Keep original order
  }

  // Pagination
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || products.length;
  const total = products.length;
  const totalPages = Math.ceil(total / limit);
  const paginated = products.slice((page - 1) * limit, page * limit);

  return c.json({
    success: true,
    data: paginated,
    meta: { page, limit, total, totalPages },
  });
});

// ─── GET /api/perfumes/products/:id ───────────────────────────
// Retourne un produit spécifique
perfumesRouter.get('/products/:id', (c) => {
  const id = c.req.param('id');
  const product = getPerfumeProductById(id);

  if (!product) {
    return c.json({ success: false, error: 'Produit non trouvé' }, 404);
  }

  // Produits similaires (même catégorie, différent id)
  const category = getPerfumeCategoryById(product.categoryId);
  const similar = category?.products
    .filter((p) => p.id !== id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3) ?? [];

  return c.json({
    success: true,
    data: { ...product, similar },
  });
});

// ─── GET /api/perfumes/featured ───────────────────────────────
// Produits Bestseller & Exclusif à mettre en avant
perfumesRouter.get('/featured', (c) => {
  const featured = getAllPerfumeProducts()
    .filter((p) => p.badge === 'Bestseller' || p.badge === 'Exclusif')
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 8);

  return c.json({
    success: true,
    data: featured,
    total: featured.length,
  });
});

// ─── GET /api/perfumes/search ─────────────────────────────────
// Recherche rapide pour le dropdown
perfumesRouter.get('/search', (c) => {
  const q = c.req.query('q') || '';
  if (q.length < 2) {
    return c.json({ success: true, data: [] });
  }

  const searchLower = q.toLowerCase();
  const results = getAllPerfumeProducts()
    .filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.notes.top.some((n) => n.toLowerCase().includes(searchLower)) ||
        p.notes.heart.some((n) => n.toLowerCase().includes(searchLower))
    )
    .slice(0, 6)
    .map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      imageUrl: p.imageUrl,
      categoryId: p.categoryId,
      volume: p.volume,
    }));

  return c.json({ success: true, data: results });
});

// ─── GET /api/perfumes/stats ──────────────────────────────────
// Stats globales pour affichage
perfumesRouter.get('/stats', (c) => {
  const allProducts = getAllPerfumeProducts();
  const stats = {
    totalProducts: allProducts.length,
    totalCategories: perfumeCategories.length,
    avgRating:
      allProducts.reduce((sum, p) => sum + p.rating, 0) / allProducts.length,
    totalReviews: allProducts.reduce((sum, p) => sum + p.reviewCount, 0),
    priceRange: {
      min: Math.min(...allProducts.map((p) => p.price)),
      max: Math.max(...allProducts.map((p) => p.price)),
    },
    categories: perfumeCategories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      count: cat.products.length,
    })),
  };

  return c.json({ success: true, data: stats });
});

export default perfumesRouter;
