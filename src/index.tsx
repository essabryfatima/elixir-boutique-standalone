// ============================================================
// MAIN APP - Boutique Parfums E-commerce
// ============================================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';

// Routes
import authRouter from './routes/auth.js';
import productsRouter from './routes/products.js';
import categoriesRouter from './routes/categories.js';
import cartRouter from './routes/cart.js';
import ordersRouter from './routes/orders.js';
import paymentsRouter from './routes/payments.js';
import analyticsRouter from './routes/analytics.js';
import reviewsRouter, { wishlistRouter } from './routes/reviews.js';
import perfumesRouter from './routes/perfumes.js';

const app = new Hono();

// ─── GLOBAL MIDDLEWARE ────────────────────────────────────────
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ─── STATIC FILES ─────────────────────────────────────────────
app.use('/static/*', serveStatic({ root: './public' }));
app.use('/images/*', serveStatic({ root: './public' }));

// ─── API ROUTES ───────────────────────────────────────────────
app.route('/api/auth', authRouter);
app.route('/api/products', productsRouter);
app.route('/api/categories', categoriesRouter);
app.route('/api/cart', cartRouter);
app.route('/api/orders', ordersRouter);
app.route('/api/payments', paymentsRouter);
app.route('/api/analytics', analyticsRouter);
app.route('/api/reviews', reviewsRouter);
app.route('/api/wishlist', wishlistRouter);
app.route('/api/perfumes', perfumesRouter);

// ─── HEALTH CHECK ─────────────────────────────────────────────
app.get('/api/health', (c) => c.json({ 
  status: 'OK', 
  timestamp: new Date().toISOString(),
  version: '2.0.0',
}));

// ─── FRONTEND SPA ─────────────────────────────────────────────
app.get('*', (c) => {
  return c.html(getHTML());
});

function getHTML(): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Élixir Boutique — Beauté de Luxe</title>
  <meta name="description" content="Découvrez notre collection exclusive de maquillage, skincare et accessoires de luxe. Livraison 24h au Maroc. Marque Élixir Boutique.">
  <meta name="theme-color" content="#6B3F2A">
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  
  <!-- Icons -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css">
  
  <!-- Tailwind -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brown:   { 50:'#fdf6ef', 100:'#f5ede4', 200:'#e8d5c0', 300:'#d4a96a', 400:'#c49050', 500:'#b8893a', 600:'#9e6e2a', 700:'#6b3f2a', 800:'#5c3317', 900:'#3d2210' },
            gold:    { 50:'#fffbeb', 100:'#fef3c7', 200:'#fde68a', 300:'#fcd34d', 400:'#fbbf24', 500:'#f59e0b', 600:'#d97706', 700:'#b45309', 800:'#92400e', 900:'#78350f' },
            cream:   { 50:'#fdfbf7', 100:'#faf7f0', 200:'#f5f0e3', 300:'#ede4cc', 400:'#ddd0ae', 500:'#c9b98d', 600:'#b09a6b', 700:'#917c4f', 800:'#73613d', 900:'#5c4d30' },
            stone:   { 50:'#fafaf9', 100:'#f5f5f4', 200:'#e7e5e4', 300:'#d6d3d1', 400:'#a8a29e', 500:'#78716c', 600:'#57534e', 700:'#44403c', 800:'#292524', 900:'#1c1917' },
          },
          fontFamily: {
            serif: ['Cormorant Garamond', 'Georgia', 'serif'],
            sans:  ['Inter', 'system-ui', 'sans-serif'],
          },
        }
      }
    }
  </script>

  <!-- Custom Styles -->
  <link rel="stylesheet" href="/static/style.css">
  
  <style>
    /* ── Base ── */
    *, *::before, *::after { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #faf9f7; color: #1c1917; }

    /* ── Animations ── */
    @keyframes fadeIn    { from { opacity:0 }                      to { opacity:1 } }
    @keyframes slideUp   { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
    @keyframes slideDown { from { opacity:0; transform:translateY(-16px) } to { opacity:1; transform:translateY(0) } }
    @keyframes scaleIn   { from { opacity:0; transform:scale(0.92) } to { opacity:1; transform:scale(1) } }
    @keyframes spin      { to   { transform:rotate(360deg) } }
    @keyframes shimmer   { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
    @keyframes pulse     { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }

    .fade-in    { animation: fadeIn  0.35s ease-out; }
    .slide-up   { animation: slideUp 0.4s  ease-out; }
    .scale-in   { animation: scaleIn 0.3s  ease-out; }

    /* ── Skeleton ── */
    .skeleton {
      background: linear-gradient(90deg,#f0ede8 25%,#e8e4dc 50%,#f0ede8 75%);
      background-size: 200% 100%;
      animation: shimmer 1.6s infinite;
      border-radius: 8px;
    }

    /* ── Navigation ── */
    #mainNav {
      background: rgba(255,255,255,0.97);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(180,160,100,0.15);
      transition: box-shadow 0.3s ease;
    }
    #mainNav.scrolled { box-shadow: 0 2px 24px rgba(0,0,0,0.08); }

    .nav-link {
      position: relative;
      font-size: 0.875rem;
      font-weight: 500;
      color: #44403c;
      padding: 0.5rem 0.875rem;
      border-radius: 0.5rem;
      transition: color 0.2s, background 0.2s;
      white-space: nowrap;
    }
    .nav-link:hover { color: #b45309; background: rgba(180,83,9,0.06); }
    .nav-link.active { color: #b45309; }
    .nav-link.active::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 50%;
      transform: translateX(-50%);
      width: 20px;
      height: 2px;
      background: #b45309;
      border-radius: 2px;
    }

    /* ── Product Cards ── */
    .product-card {
      background: #fff;
      border: 1px solid #e7e5e4;
      border-radius: 1rem;
      overflow: hidden;
      transition: transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94), box-shadow 0.3s ease, border-color 0.3s ease;
    }
    .product-card:hover {
      transform: translateY(-6px);
      box-shadow: 0 20px 48px rgba(0,0,0,0.1), 0 6px 16px rgba(0,0,0,0.06);
      border-color: rgba(180,83,9,0.2);
    }
    .product-card .card-img-wrap {
      position: relative;
      width: 100%;
      padding-top: 100%;
      overflow: hidden;
      background: linear-gradient(135deg, #fdf6ec, #fef3c7);
    }
    .product-card .card-img-wrap img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.6s cubic-bezier(0.25,0.46,0.45,0.94);
    }
    .product-card:hover .card-img-wrap img { transform: scale(1.07); }

    .product-card .card-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 50%, transparent 100%);
      opacity: 0;
      transition: opacity 0.3s ease;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 1rem;
    }
    .product-card:hover .card-overlay { opacity: 1; }

    /* ── Catalogue Grid ── */
    .catalogue-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
    }
    @media (max-width: 900px)  { .catalogue-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 560px)  { .catalogue-grid { grid-template-columns: 1fr; } }

    /* ── Category Header Banner ── */
    .cat-banner {
      position: relative;
      border-radius: 1.25rem;
      overflow: hidden;
      cursor: pointer;
      transition: box-shadow 0.3s ease;
    }
    .cat-banner:hover { box-shadow: 0 12px 40px rgba(0,0,0,0.18); }
    .cat-banner img { transition: transform 0.6s ease; }
    .cat-banner:hover img { transform: scale(1.04); }

    /* ── Cart Sidebar ── */
    #cartPanel {
      transform: translateX(100%);
      transition: transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94);
    }
    #cartPanel.open { transform: translateX(0); }

    /* ── Badge styles ── */
    .badge { display:inline-flex; align-items:center; font-size:0.65rem; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; padding:0.25rem 0.625rem; border-radius:9999px; }
    .badge-bestseller   { background:#b45309; color:#fff; }
    .badge-exclusif     { background:#6d28d9; color:#fff; }
    .badge-nouveau      { background:#059669; color:#fff; }
    .badge-edition      { background:#dc2626; color:#fff; }
    .badge-sale         { background:#dc2626; color:#fff; }
    .badge-featured     { background:#4f46e5; color:#fff; }

    /* ── Toast ── */
    .toast-wrap { position:fixed; bottom:1.5rem; right:1.5rem; z-index:9999; max-width:360px; pointer-events:none; }
    .toast-item {
      pointer-events:auto; margin-top:0.5rem; padding:0.875rem 1rem;
      border-radius:0.75rem; display:flex; align-items:center; gap:0.75rem;
      box-shadow:0 8px 32px rgba(0,0,0,0.15); animation:slideUp 0.3s ease-out;
      font-size:0.875rem; font-weight:500;
    }
    .toast-success { background:rgba(5,150,105,0.95);  color:#fff; }
    .toast-error   { background:rgba(220,38,38,0.95);  color:#fff; }
    .toast-info    { background:rgba(109,40,217,0.95); color:#fff; }
    .toast-warning { background:rgba(180,83,9,0.95);   color:#fff; }

    /* ── Modal ── */
    .modal-backdrop { animation:fadeIn 0.2s ease; }
    .modal-box      { animation:scaleIn 0.3s ease-out; }

    /* ── Scrollbar ── */
    ::-webkit-scrollbar       { width:5px; height:5px; }
    ::-webkit-scrollbar-track { background:#f5f5f4; }
    ::-webkit-scrollbar-thumb { background:#c9b98d; border-radius:4px; }

    /* ── Price ── */
    .price-strike { text-decoration:line-through; color:#a8a29e; }
    .price-main   { color:#b45309; font-weight:700; }

    /* ── Qty controls ── */
    .qty-btn {
      width:2rem; height:2rem; border:1px solid #e7e5e4; border-radius:0.5rem;
      display:flex; align-items:center; justify-content:center;
      background:#fff; cursor:pointer; transition:all 0.2s; font-size:0.75rem; color:#57534e;
    }
    .qty-btn:hover { background:#fdf6ec; border-color:#b45309; color:#b45309; }

    /* ── Stars ── */
    .star { color:#e5e7eb; }
    .star.filled { color:#f59e0b; }

    /* ── Section headings ── */
    .section-title {
      font-family:'Cormorant Garamond', Georgia, serif;
      font-weight:600;
      letter-spacing:0.01em;
    }
    .section-subtitle {
      font-size:0.8rem;
      font-weight:600;
      letter-spacing:0.12em;
      text-transform:uppercase;
      color:#b45309;
    }

    /* ── Hover line button ── */
    .btn-underline {
      position:relative; font-size:0.875rem; font-weight:600; color:#b45309;
      transition:color 0.2s;
    }
    .btn-underline::after {
      content:''; position:absolute; bottom:-2px; left:0; width:0; height:1.5px;
      background:#b45309; transition:width 0.3s ease;
    }
    .btn-underline:hover::after { width:100%; }

    /* ── Filter sidebar ── */
    .filter-tag {
      display:inline-flex; align-items:center; gap:0.375rem; padding:0.375rem 0.75rem;
      border:1px solid #e7e5e4; border-radius:9999px; font-size:0.8rem; font-weight:500;
      cursor:pointer; transition:all 0.2s; background:#fff; color:#57534e;
    }
    .filter-tag:hover, .filter-tag.active {
      background:#fdf6ec; border-color:#b45309; color:#b45309;
    }

    /* ── Hero text gradient ── */
    .text-gold-gradient {
      background: linear-gradient(135deg, #fbbf24, #b45309);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* ── Mobile menu ── */
    #mobileMenu { animation:slideDown 0.25s ease-out; }

    /* ── Input focus ── */
    input:focus, textarea:focus, select:focus {
      outline:none; border-color:#b45309 !important;
      box-shadow: 0 0 0 3px rgba(180,83,9,0.1);
    }

    /* ── Contact form ── */
    .form-input {
      width:100%; padding:0.875rem 1rem;
      border:1px solid #e7e5e4; border-radius:0.75rem;
      font-size:0.875rem; transition:border-color 0.2s, box-shadow 0.2s;
      background:#fff;
    }
    .form-input:focus { border-color:#b45309; box-shadow:0 0 0 3px rgba(180,83,9,0.08); outline:none; }
  </style>
</head>
<body>

<!-- ═══════════════════════════════════════════════════════════
     NAVIGATION
═══════════════════════════════════════════════════════════ -->
<nav id="mainNav" class="sticky top-0 z-40">
  <div class="max-w-7xl mx-auto px-4 sm:px-6">
    <div class="flex items-center justify-between h-16 md:h-18">

      <!-- Logo -->
      <a href="#" onclick="navigate('home')" class="flex items-center gap-3 cursor-pointer flex-shrink-0">
        <div class="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md"
             style="background:linear-gradient(135deg,var(--primary-dk, #5C3317),var(--primary, #6B3F2A));box-shadow:0 4px 14px rgba(92,51,23,0.35);">
          <i class="fas fa-gem text-sm" style="color:var(--accent, #D4A96A);"></i>
        </div>
        <div class="hidden sm:block">
          <span class="font-serif text-xl font-semibold tracking-wide" style="color:var(--primary, #6B3F2A);">Élixir</span>
          <span class="font-sans text-xs font-light tracking-widest uppercase block -mt-1" style="color:var(--accent-dk, #B8893A);">Boutique</span>
        </div>
      </a>

      <!-- Desktop Nav Links -->
      <div class="hidden md:flex items-center gap-1">
        <button onclick="navigate('home')"      id="nav-home"      class="nav-link">
          <i class="fas fa-home mr-1.5 text-xs opacity-60"></i>Accueil
        </button>
        <button onclick="navigate('catalogue')" id="nav-catalogue" class="nav-link">
          <i class="fas fa-th-large mr-1.5 text-xs opacity-60"></i>Catalogue
        </button>
        <button onclick="navigate('parfums')"   id="nav-parfums"   class="nav-link">
          <i class="fas fa-spray-can mr-1.5 text-xs opacity-60"></i>Parfums
        </button>
        <button onclick="navigate('contact')"   id="nav-contact"   class="nav-link">
          <i class="fas fa-envelope mr-1.5 text-xs opacity-60"></i>Contact
        </button>
      </div>

      <!-- Search (desktop) -->
      <div class="hidden lg:flex flex-1 max-w-xs mx-6 relative">
        <input type="text" id="searchInput" placeholder="Rechercher un parfum…"
          class="w-full pl-4 pr-9 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl
                 placeholder-stone-400 transition-all focus:bg-white focus:border-gold-600"
          oninput="handleSearch(this.value)">
        <i class="fas fa-search absolute right-3 top-2.5 text-stone-300 text-xs pointer-events-none"></i>
        <div id="searchDropdown"
             class="hidden absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl
                    border border-stone-100 z-50 overflow-hidden max-h-80 overflow-y-auto">
        </div>
      </div>

      <!-- Nav Actions -->
      <div class="flex items-center gap-1">

        <!-- Favoris -->
        <button onclick="navigate('favorites')" class="nav-link relative hidden sm:flex items-center gap-1.5" title="Mes Favoris">
          <i class="fas fa-heart text-base" style="color:var(--text-muted)"></i>
          <span id="favoritesCountBadge"
                class="hidden absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-0.5
                       text-white text-[0.6rem] font-bold rounded-full flex items-center justify-center"
                style="background:#ef4444;">0</span>
        </button>

        <!-- Panier -->
        <button onclick="toggleCart()" class="nav-link flex items-center gap-1.5 relative">
          <i class="fas fa-shopping-bag text-base"></i>
          <span class="hidden sm:inline">Panier</span>
          <span id="cartCount"
                class="hidden absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-0.5
                       text-white text-[0.6rem] font-bold rounded-full flex items-center justify-center"
                style="background:var(--primary, #6B3F2A);">0</span>
        </button>

        <!-- User menu -->
        <div class="relative" id="userMenuContainer">
          <button onclick="toggleUserMenu()" class="nav-link flex items-center gap-1.5">
            <div id="userAvatar"
                 class="w-7 h-7 bg-stone-100 rounded-full overflow-hidden flex items-center justify-center">
              <i class="fas fa-user text-stone-400 text-xs"></i>
            </div>
            <span id="userMenuText" class="hidden md:block">Connexion</span>
            <i class="fas fa-chevron-down text-xs opacity-50"></i>
          </button>
          <div id="userDropdown"
               class="hidden absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl
                      border border-stone-100 w-52 z-50 py-1 overflow-hidden">
            <div id="guestMenuItems">
              <button onclick="navigate('login'); closeAllDropdowns()"
                      class="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-amber-50
                             hover:text-gold-800 flex items-center gap-2.5 transition-colors">
                <i class="fas fa-sign-in-alt w-4 text-gold-600"></i> Se connecter
              </button>
              <button onclick="navigate('register'); closeAllDropdowns()"
                      class="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-amber-50
                             hover:text-gold-800 flex items-center gap-2.5 transition-colors">
                <i class="fas fa-user-plus w-4 text-emerald-500"></i> S'inscrire
              </button>
            </div>
            <div id="authMenuItems" class="hidden">
              <button onclick="navigate('profile'); closeAllDropdowns()"
                      class="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-amber-50
                             hover:text-gold-800 flex items-center gap-2.5 transition-colors">
                <i class="fas fa-user-circle w-4 text-gold-600"></i> Mon Profil
              </button>
              <button onclick="navigate('orders'); closeAllDropdowns()"
                      class="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors"
                      style="color:var(--text)" onmouseover="this.style.background='var(--bg-warm)'" onmouseout="this.style.background=''">
                <i class="fas fa-box w-4 text-blue-500"></i> Mes Commandes
              </button>
              <button onclick="navigate('favorites'); closeAllDropdowns()"
                      class="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors"
                      style="color:var(--text)" onmouseover="this.style.background='var(--bg-warm)'" onmouseout="this.style.background=''">
                <i class="fas fa-heart w-4 text-red-400"></i> Mes Favoris
              </button>
              <div id="adminMenuItem" class="hidden">
                <hr class="my-1 border-stone-100">
                <button onclick="navigate('admin'); closeAllDropdowns()"
                        class="w-full text-left px-4 py-2.5 text-sm text-purple-700 hover:bg-purple-50
                               flex items-center gap-2.5 transition-colors">
                  <i class="fas fa-shield-alt w-4 text-purple-500"></i> Admin
                </button>
              </div>
              <hr class="my-1 border-stone-100">
              <button onclick="logout()"
                      class="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50
                             flex items-center gap-2.5 transition-colors">
                <i class="fas fa-sign-out-alt w-4"></i> Déconnexion
              </button>
            </div>
          </div>
        </div>

        <!-- Mobile menu toggle (hamburger) -->
        <button onclick="toggleMobileMenu()" id="hamburgerBtn"
                class="md:hidden hamburger nav-link w-9 h-9 flex flex-col items-center justify-center gap-1.5">
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
        </button>
      </div>
    </div>
  </div>

  <!-- Mobile Menu -->
  <div id="mobileMenu" class="hidden md:hidden bg-white border-t border-stone-100 px-4 pt-3 pb-4">
    <!-- Mobile search -->
    <div class="flex items-center gap-2 bg-stone-50 rounded-xl px-4 py-2.5 mb-3 border border-stone-200">
      <i class="fas fa-search text-stone-300 text-xs"></i>
      <input type="text" placeholder="Rechercher un parfum…"
             class="bg-transparent flex-1 text-sm outline-none placeholder-stone-400"
             oninput="handleSearch(this.value)">
    </div>
    <nav class="space-y-0.5">
      <button onclick="navigate('home'); closeMobileMenu()"
              class="w-full text-left py-2.5 px-3 text-sm text-stone-700 hover:bg-amber-50
                     hover:text-gold-800 rounded-lg flex items-center gap-3 transition-colors">
        <i class="fas fa-home text-gold-600 w-4 text-xs"></i> Accueil
      </button>
      <button onclick="navigate('catalogue'); closeMobileMenu()"
              class="w-full text-left py-2.5 px-3 text-sm text-stone-700 hover:bg-amber-50
                     hover:text-gold-800 rounded-lg flex items-center gap-3 transition-colors">
        <i class="fas fa-th-large text-gold-600 w-4 text-xs"></i> Catalogue
      </button>
      <button onclick="navigate('parfums'); closeMobileMenu()"
              class="w-full text-left py-2.5 px-3 text-sm text-stone-700 hover:bg-amber-50
                     hover:text-gold-800 rounded-lg flex items-center gap-3 transition-colors">
        <i class="fas fa-spray-can text-gold-600 w-4 text-xs"></i> Parfums
      </button>
      <button onclick="navigate('contact'); closeMobileMenu()"
              class="w-full text-left py-2.5 px-3 text-sm rounded-lg flex items-center gap-3 transition-colors"
              style="color:var(--text)" onmouseover="this.style.background='var(--bg-warm)'" onmouseout="this.style.background=''">
        <i class="fas fa-envelope w-4 text-xs" style="color:var(--primary)"></i> Contact
      </button>
      <button onclick="toggleCart(); closeMobileMenu()"
              class="w-full text-left py-2.5 px-3 text-sm rounded-lg flex items-center gap-3 transition-colors"
              style="color:var(--text)" onmouseover="this.style.background='var(--bg-warm)'" onmouseout="this.style.background=''">
        <i class="fas fa-shopping-bag w-4 text-xs" style="color:var(--primary)"></i> Panier
      </button>
      <button onclick="navigate('favorites'); closeMobileMenu()"
              class="w-full text-left py-2.5 px-3 text-sm rounded-lg flex items-center gap-3 transition-colors"
              style="color:var(--text)" onmouseover="this.style.background='var(--bg-warm)'" onmouseout="this.style.background=''">
        <i class="fas fa-heart w-4 text-xs text-red-400"></i> Mes Favoris
      </button>
    </nav>
  </div>
</nav>

<!-- ═══════════════════════════════════════════════════════════
     MAIN CONTENT
═══════════════════════════════════════════════════════════ -->
<main id="app" class="min-h-screen"></main>

<!-- ═══════════════════════════════════════════════════════════
     CART SIDEBAR
═══════════════════════════════════════════════════════════ -->
<div id="cartSidebar" class="hidden fixed inset-0 z-50">
  <!-- Backdrop -->
  <div class="absolute inset-0 bg-black/40 backdrop-blur-sm modal-backdrop" onclick="toggleCart()"></div>
  <!-- Panel -->
  <div id="cartPanel" class="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col">
    
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-stone-100">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100">
          <i class="fas fa-shopping-bag text-gold-700 text-sm"></i>
        </div>
        <div>
          <h2 class="font-semibold text-stone-900 text-base">Mon Panier</h2>
          <p class="text-xs text-stone-400 mt-0.5" id="cartItemCountText">0 article</p>
        </div>
      </div>
      <button onclick="toggleCart()"
              class="w-8 h-8 rounded-lg bg-stone-50 hover:bg-stone-100 flex items-center
                     justify-center text-stone-400 hover:text-stone-600 transition-all">
        <i class="fas fa-times text-sm"></i>
      </button>
    </div>

    <!-- Items -->
    <div id="cartItems" class="flex-1 overflow-y-auto px-4 py-3 space-y-3"></div>

    <!-- Footer -->
    <div id="cartFooter" class="hidden border-t border-stone-100 px-5 py-4 bg-stone-50/60">
      <div class="space-y-2 mb-4 text-sm">
        <div class="flex justify-between text-stone-600">
          <span>Sous-total</span>
          <span id="cartSubtotal" class="font-medium text-stone-900">0,00 MAD</span>
        </div>
        <div class="flex justify-between text-stone-600">
          <span>Livraison</span>
          <span id="cartShipping" class="text-emerald-600 font-medium">Gratuite</span>
        </div>
        <div id="cartCouponRow" class="hidden flex justify-between text-emerald-600">
          <span id="cartCouponLabel">Réduction</span>
          <span id="cartCouponAmount">-0,00 MAD</span>
        </div>
        <hr class="border-stone-200">
        <div class="flex justify-between font-bold text-stone-900 text-base">
          <span>Total</span>
          <span id="cartTotal">0,00 MAD</span>
        </div>
      </div>

      <!-- Coupon -->
      <div class="flex gap-2 mb-4">
        <input type="text" id="couponInput" placeholder="Code promo"
               class="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white
                      focus:border-gold-600 focus:outline-none transition-colors">
        <button onclick="applyCoupon()"
                class="px-4 py-2 bg-stone-100 text-sm font-medium text-stone-700 rounded-lg
                       hover:bg-stone-200 transition-colors">
          Appliquer
        </button>
      </div>

      <button onclick="navigate('checkout'); toggleCart()"
              class="w-full py-3.5 rounded-xl font-semibold text-white text-sm
                     flex items-center justify-center gap-2 transition-all
                     hover:shadow-lg hover:-translate-y-0.5"
              style="background:linear-gradient(135deg,#b45309,#78350f)">
        <i class="fas fa-lock text-xs"></i> Passer la commande
      </button>
      <button onclick="navigate('parfums'); toggleCart()"
              class="w-full mt-2 py-2.5 text-sm text-gold-700 hover:text-gold-900 transition-colors font-medium">
        Continuer mes achats →
      </button>
    </div>

    <!-- Empty Cart -->
    <div id="emptyCart"
         class="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div class="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mb-5 border border-amber-100">
        <i class="fas fa-shopping-bag text-3xl text-gold-200"></i>
      </div>
      <h3 class="font-semibold text-stone-800 mb-2">Votre panier est vide</h3>
      <p class="text-sm text-stone-400 mb-6 leading-relaxed">
        Découvrez nos collections exclusives de parfums de luxe
      </p>
      <button onclick="navigate('parfums'); toggleCart()"
              class="px-6 py-2.5 text-sm font-semibold text-white rounded-xl transition-all hover:-translate-y-0.5"
              style="background:linear-gradient(135deg,#b45309,#78350f)">
        Découvrir le catalogue
      </button>
    </div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════
     TOAST NOTIFICATIONS
═══════════════════════════════════════════════════════════ -->
<div id="toastContainer" class="toast-wrap"></div>

<!-- ═══════════════════════════════════════════════════════════
     FOOTER
═══════════════════════════════════════════════════════════ -->
<footer style="background:#1c1917; color:#e7e5e4;">
  <div class="max-w-7xl mx-auto px-4 py-14">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
      
      <!-- Brand -->
      <div>
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-2xl flex items-center justify-center"
               style="background:linear-gradient(135deg,var(--primary-dk,#5C3317),var(--primary,#6B3F2A));">
            <i class="fas fa-gem text-sm" style="color:var(--accent,#D4A96A);"></i>
          </div>
          <div>
            <span class="font-serif text-lg font-semibold tracking-wide" style="color:#fff;">Élixir</span>
            <span class="text-xs tracking-widest uppercase block -mt-1" style="color:var(--accent-lt,#EDD8AD);">Boutique</span>
          </div>
        </div>
        <p class="text-stone-400 text-sm leading-relaxed mb-5">
          Votre destination exclusive pour les parfums de luxe. Fragrances authentiques, expédiées avec soin.
        </p>
        <div class="flex gap-3">
  <a href="https://www.instagram.com/la_chica_trabajadora?igsh=aXh3b2Ricm41NWp2" target="_blank" rel="noopener" aria-label="Instagram" class="social-icon-link"><i class="fab fa-instagram"></i></a>
  <a href="https://www.tiktok.com/@softscissorsasmr0" target="_blank" rel="noopener" aria-label="TikTok" class="social-icon-link"><i class="fab fa-tiktok"></i></a>
  <a href="https://www.facebook.com/profile.php?id=100079676007045" target="_blank" rel="noopener" aria-label="Facebook" class="social-icon-link"><i class="fab fa-facebook-f"></i></a>
  <a href="https://wa.me/message/BM7JJGGZKPB3N1" target="_blank" rel="noopener" aria-label="WhatsApp" class="social-icon-link"><i class="fab fa-whatsapp"></i></a>
</div>

      </div>

      <!-- Collections -->
      <div>
        <h4 class="text-xs font-bold uppercase tracking-widest text-amber-400 mb-4">Collections</h4>
        <ul class="space-y-2.5 text-sm text-stone-400">
          <li><button onclick="navigate('parfums',{category:'signature'})" class="hover:text-amber-300 transition-colors">Parfums Signature</button></li>
          <li><button onclick="navigate('parfums',{category:'femme'})"    class="hover:text-amber-300 transition-colors">Collection Femme</button></li>
          <li><button onclick="navigate('parfums',{category:'homme'})"   class="hover:text-amber-300 transition-colors">Collection Homme</button></li>
          <li><button onclick="navigate('catalogue',{category:'maquillage'})" class="hover:text-amber-300 transition-colors">Maquillage Luxe</button></li>
          <li><button onclick="navigate('catalogue',{category:'skincare'})" class="hover:text-amber-300 transition-colors">Skincare Premium</button></li>
          <li><button onclick="navigate('catalogue',{category:'accessoires'})" class="hover:text-amber-300 transition-colors">Accessoires</button></li>
        </ul>
      </div>

      <!-- Service Client -->
<div>
  <h4 class="text-xs font-bold uppercase tracking-widest text-amber-400 mb-4">Service Client</h4>
  <ul class="space-y-2.5 text-sm text-stone-400">
    <li><button onclick="navigate('contact')" class="hover:text-amber-300 transition-colors">Contact</button></li>
    <li><button onclick="showFooterInfo('faq')" class="hover:text-amber-300 transition-colors">FAQ</button></li>
    <li><button onclick="showFooterInfo('livraison')" class="hover:text-amber-300 transition-colors">Livraison & Retours</button></li>
    <li><button onclick="showFooterInfo('suivi')" class="hover:text-amber-300 transition-colors">Suivi de commande</button></li>
    <li><button onclick="showFooterInfo('authenticite')" class="hover:text-amber-300 transition-colors">Authenticité</button></li>
  </ul>
</div>

      <!-- Newsletter -->
      <!-- Newsletter -->
<div>
  <h4 class="text-xs font-bold uppercase tracking-widest text-amber-400 mb-4">Newsletter</h4>
  <p class="text-sm text-stone-400 mb-3 leading-relaxed">
    Recevez nos nouvelles collections et offres exclusives en avant-première.
  </p>
  <form id="footerNewsletterForm" onsubmit="submitNewsletter(event)">
    <div class="flex gap-2 mb-4">
      <input type="email" id="footerNewsletterEmail" name="email" placeholder="votre@email.com" required
             class="flex-1 px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm
                    text-white placeholder-stone-500 focus:outline-none focus:border-gold-600 transition-colors">
      <button type="submit" class="px-3 py-2 rounded-lg text-sm transition-colors"
              style="background:#b45309" onmouseover="this.style.background='#92400e'" onmouseout="this.style.background='#b45309'">
        <i class="fas fa-paper-plane text-white"></i>
      </button>
    </div>
  </form>
  <div class="flex items-center gap-2 text-xs text-stone-500">
    <i class="fas fa-lock text-green-500"></i>
    <span>Paiement 100% sécurisé</span>
  </div>
  <div class="flex gap-2 mt-3 items-center">
    <i class="fab fa-cc-visa text-2xl text-stone-500"></i>
    <i class="fab fa-cc-mastercard text-2xl text-stone-500"></i>
    <i class="fab fa-cc-paypal text-2xl text-stone-500"></i>
  </div>
</div>
    </div>

    <div class="border-t border-stone-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
  <span>© 2025 Élixir Boutique. Tous droits réservés.</span>
  <div class="flex gap-5">
    <button onclick="showFooterInfo('mentions')" class="hover:text-amber-400 transition-colors">Mentions légales</button>
    <button onclick="showFooterInfo('confidentialite')" class="hover:text-amber-400 transition-colors">Confidentialité</button>
    <button onclick="showFooterInfo('cgv')" class="hover:text-amber-400 transition-colors">CGV</button>
  </div>
</div>
  </div>
</footer>

<script src="/static/app.js"></script>
<script src="/static/perfumes.js"></script>
</body>
</html>`;
}

export default app;
