// ============================================================
// ÉLIXIR BOUTIQUE — Frontend Application v4.0
// Brown & White Luxury Beauty E-commerce
// ============================================================

/* ─── CSS VARIABLES SYNC ──────────────────────────────────── */
const BRAND = {
  primary:   '#6B3F2A',
  primaryDk: '#5C3317',
  primaryLt: '#8B5A3C',
  accent:    '#D4A96A',
  accentDk:  '#B8893A',
  accentLt:  '#EDD8AD',
  text:      '#2C1A0E',
  textMuted: '#7A5C44',
  bg:        '#FAF7F4',
  bgWarm:    '#F5EDE4',
};

/* ─── STATE ─────────────────────────────────────────────── */
const Store = {
  state: {
    user: null,
    accessToken: null,
    refreshToken: null,
    cart: { items: [], subtotal: 0, itemCount: 0 },
    wishlist: [],
    favorites: [], // local favorites for beauty products
    categories: [],
    currentRoute: 'home',
    coupon: null,
  },
  init() {
    try {
      const saved = localStorage.getItem('elixir_state_v4');
      if (saved) {
        const p = JSON.parse(saved);
        this.state.user = p.user || null;
        this.state.accessToken = p.accessToken || null;
        this.state.refreshToken = p.refreshToken || null;
        this.state.favorites = p.favorites || [];
      }
    } catch(e) {}
  },
  save() {
    localStorage.setItem('elixir_state_v4', JSON.stringify({
      user: this.state.user,
      accessToken: this.state.accessToken,
      refreshToken: this.state.refreshToken,
      favorites: this.state.favorites,
    }));
  },
  setAuth(user, accessToken, refreshToken) {
    this.state.user = user;
    this.state.accessToken = accessToken;
    this.state.refreshToken = refreshToken;
    this.save();
    updateAuthUI();
  },
  clearAuth() {
    this.state.user = null;
    this.state.accessToken = null;
    this.state.refreshToken = null;
    this.state.cart = { items: [], subtotal: 0, itemCount: 0 };
    this.state.wishlist = [];
    localStorage.removeItem('elixir_state_v4');
    updateAuthUI();
    updateCartUI();
  },
  isAuthenticated() { return !!this.state.accessToken; },
  isAdmin() { return this.state.user?.role === 'admin'; },
  isFavorite(productId) {
    return this.state.favorites.includes(productId);
  },
  toggleFavorite(productId) {
    const idx = this.state.favorites.indexOf(productId);
    if (idx >= 0) {
      this.state.favorites.splice(idx, 1);
    } else {
      this.state.favorites.push(productId);
    }
    this.save();
    return this.isFavorite(productId);
  },
};
// Sauvegarder la wishlist dans localStorage
function saveWishlistToLocal() {
  localStorage.setItem('elixir_wishlist', JSON.stringify(Store.state.wishlist));
}

// Charger la wishlist depuis localStorage
function loadWishlistFromLocal() {
  const saved = localStorage.getItem('elixir_wishlist');
  if (saved) {
    try {
      Store.state.wishlist = JSON.parse(saved);
    } catch(e) {}
  } else {
    Store.state.wishlist = [];
  }
}

/* ─── API CLIENT ─────────────────────────────────────────── */
const API = {
  base: '/api',
  async request(method, endpoint, data = null, auth = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && Store.state.accessToken) {
      headers['Authorization'] = `Bearer ${Store.state.accessToken}`;
    }
    const options = { method, headers };
    if (data && method !== 'GET') options.body = JSON.stringify(data);
    try {
      const res = await fetch(this.base + endpoint, options);
      if (res.status === 401 && Store.state.refreshToken && endpoint !== '/auth/refresh') {
        const ok = await this.refreshToken();
        if (ok) {
          headers['Authorization'] = `Bearer ${Store.state.accessToken}`;
          return (await fetch(this.base + endpoint, { ...options, headers })).json();
        } else {
          Store.clearAuth();
          navigate('login');
          return { success: false, error: 'Session expirée' };
        }
      }
      return res.json();
    } catch(e) {
      return { success: false, error: 'Erreur réseau.' };
    }
  },
  async refreshToken() {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: Store.state.refreshToken }),
      });
      const d = await res.json();
      if (d.success) {
        Store.state.accessToken  = d.data.accessToken;
        Store.state.refreshToken = d.data.refreshToken;
        Store.save();
        return true;
      }
      return false;
    } catch { return false; }
  },
  get:    (ep, auth=false)        => API.request('GET',    ep, null, auth),
  post:   (ep, data, auth=false)  => API.request('POST',   ep, data, auth),
  put:    (ep, data, auth=false)  => API.request('PUT',    ep, data, auth),
  patch:  (ep, data, auth=false)  => API.request('PATCH',  ep, data, auth),
  delete: (ep, auth=false)        => API.request('DELETE', ep, null, auth),
};

/* ─── ROUTER ─────────────────────────────────────────────── */
const routes = {
  home:       renderHome,
  products:   renderProducts,
  product:    renderProductDetail,
  cart:       () => { toggleCart(true); },
  checkout:   renderCheckout,
  orders:     renderOrders,
  order:      renderOrderDetail,
  login:      renderLogin,
  register:   renderRegister,
  profile:    renderProfile,
  wishlist:   renderWishlist,
  favorites:  renderFavorites,
  admin:      renderAdmin,
  contact:    renderContact,
  catalogue:  async (params) => { await renderBeautyCatalogue(params || {}); },
  parfums:    async (params) => {
    if (typeof renderParfums === 'function') {
      await renderParfums(params || {});
    } else {
      document.getElementById('app').innerHTML =
        '<div class="flex items-center justify-center py-32"><p style="color:var(--primary)">Chargement…</p></div>';
    }
  },
};

let currentRoute = '';
let routeParams  = {};

async function navigate(route, params = {}) {
  closeAllDropdowns();
  closeMobileMenu();
  currentRoute = route;
  routeParams  = params;

  const privateRoutes = ['checkout', 'orders', 'order', 'profile', 'wishlist', 'favorites'];
  const adminRoutes   = ['admin'];

  if (privateRoutes.includes(route) && !Store.isAuthenticated()) {
    showToast('Connectez-vous pour accéder à cette page', 'info');
    navigate('login');
    return;
  }
  if (adminRoutes.includes(route) && !Store.isAdmin()) {
    showToast('Accès réservé aux administrateurs', 'error');
    navigate('home');
    return;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
  const navMap = { home:'nav-home', catalogue:'nav-catalogue', parfums:'nav-parfums', contact:'nav-contact' };
  if (navMap[route]) document.getElementById(navMap[route])?.classList.add('active');

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="flex items-center justify-center min-h-64 py-24">
      <div class="text-center">
        <div class="w-10 h-10 border-3 border-t-transparent rounded-full mx-auto mb-3"
             style="border-width:3px;animation:spin 0.9s linear infinite;border-color:var(--primary);border-top-color:transparent;"></div>
        <p class="text-sm" style="color:var(--text-muted)">Chargement…</p>
      </div>
    </div>`;

  if (routes[route]) await routes[route](params);
  else render404();
}

/* ─── TOAST ──────────────────────────────────────────────── */
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  const icons = { success:'fa-check-circle', error:'fa-times-circle', warning:'fa-exclamation-circle', info:'fa-info-circle' };
  const item = document.createElement('div');
  item.className = `toast-item toast-${type}`;
  item.innerHTML = `
    <i class="fas ${icons[type] || 'fa-info-circle'} flex-shrink-0"></i>
    <span class="flex-1">${message}</span>
    <button onclick="this.parentElement.remove()" class="opacity-70 hover:opacity-100 ml-1">
      <i class="fas fa-times text-xs"></i>
    </button>`;
  container.appendChild(item);
  setTimeout(() => { item.style.opacity='0'; item.style.transition='opacity 0.3s'; setTimeout(()=>item.remove(), 300); }, duration);
}

/* ─── AUTH UI ─────────────────────────────────────────────── */
function updateAuthUI() {
  const user = Store.state.user;
  document.getElementById('guestMenuItems')?.classList.toggle('hidden', !!user);
  document.getElementById('authMenuItems')?.classList.toggle('hidden', !user);
  document.getElementById('adminMenuItem')?.classList.toggle('hidden', user?.role !== 'admin');

  const text   = document.getElementById('userMenuText');
  const avatar = document.getElementById('userAvatar');

  if (user) {
    if (text)   text.textContent = user.firstName;
    if (avatar) avatar.innerHTML = `
      <div class="w-full h-full flex items-center justify-center text-xs font-bold text-white"
           style="background:linear-gradient(135deg,var(--primary),var(--primary-lt));">
        ${user.firstName[0]}${user.lastName[0]}
      </div>`;
    loadCart();
    loadWishlist();
  } else {
    if (text)   text.textContent = 'Connexion';
    if (avatar) avatar.innerHTML = '<i class="fas fa-user text-sm" style="color:var(--text-muted)"></i>';
  }
  // Update wishlist/favorites badge
  updateFavoritesUI();
}

function updateFavoritesUI() {
  const count = Store.state.favorites.length;
  const badge = document.getElementById('favoritesCountBadge');
  if (badge) {
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
  }
}

/* ─── CART ───────────────────────────────────────────────── */

/* ─── CART (VERSION ROBUSTE LOCALSTORAGE) ───────────────── */
function loadCartFromLocal() {
  const saved = localStorage.getItem('elixir_cart');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Store.state.cart = {
        items: Array.isArray(parsed.items) ? parsed.items : [],
        subtotal: typeof parsed.subtotal === 'number' ? parsed.subtotal : 0,
        itemCount: typeof parsed.itemCount === 'number' ? parsed.itemCount : 0,
      };
      Store.state.cart.itemCount = Store.state.cart.items.reduce((s, i) => s + (i.quantity || 0), 0);
      Store.state.cart.subtotal = Store.state.cart.items.reduce((s, i) => s + (i.priceAtTime || 0) * (i.quantity || 0), 0);
    } catch(e) {
      Store.state.cart = { items: [], subtotal: 0, itemCount: 0 };
    }
  } else {
    Store.state.cart = { items: [], subtotal: 0, itemCount: 0 };
  }
  updateCartUI();
}

function saveCartToLocal() {
  localStorage.setItem('elixir_cart', JSON.stringify(Store.state.cart));
}

function loadCart() {
  loadCartFromLocal();
}

function updateCartUI() {
  const cart  = Store.state.cart;
  const count = cart.itemCount || 0;
  const cc    = document.getElementById('cartCount');
  const ct    = document.getElementById('cartItemCountText');
  if (cc) {
    cc.textContent = count;
    cc.classList.toggle('hidden', count === 0);
    if (count > 0) {
      cc.style.animation = 'pulse 0.4s ease';
      setTimeout(() => cc.style.animation = '', 400);
    }
  }
  if (ct) ct.textContent = `${count} article${count !== 1 ? 's' : ''}`;
  renderCartItems();
}

function renderCartItems() {
  const el     = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  const empty  = document.getElementById('emptyCart');
  const items  = Store.state.cart.items || [];
  if (!el) return;
  if (items.length === 0) {
    footer?.classList.add('hidden');
    empty?.classList.remove('hidden');
    el.innerHTML = '';
    return;
  }
  empty?.classList.add('hidden');
  footer?.classList.remove('hidden');

  const shipping = Store.state.cart.subtotal >= 500 ? 0 : 50;
  const total = Store.state.cart.subtotal + shipping;

  el.innerHTML = items.map(item => `
    <div class="flex gap-3 bg-white rounded-xl p-3 border shadow-sm" style="border-color:var(--border);" id="ci-${item.id}">
      <div class="w-18 h-18 rounded-lg overflow-hidden flex-shrink-0" style="width:4.5rem;height:4.5rem;background:var(--bg-warm);">
        <img src="${item.product?.image || 'https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=80'}"
             class="w-full h-full object-cover" alt="${item.product?.name || ''}"
             loading="lazy"
             onerror="this.src='https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=80'">
      </div>
      <div class="flex-1 min-w-0">
        <h4 class="text-sm font-semibold truncate" style="color:var(--text)">${item.product?.name || ''}</h4>
        <p class="text-xs mt-0.5" style="color:var(--text-muted)">Beauté de luxe</p>
        <p class="font-bold mt-0.5 text-sm price-main">${formatPrice(item.priceAtTime)}</p>
        <div class="flex items-center justify-between mt-2">
          <div class="flex items-center gap-1">
            <button class="qty-btn" onclick="updateCartItem('${item.id}',${item.quantity-1})">
              <i class="fas fa-minus text-xs"></i>
            </button>
            <span class="w-7 text-center text-sm font-bold" style="color:var(--text)">${item.quantity}</span>
            <button class="qty-btn" onclick="updateCartItem('${item.id}',${item.quantity+1})">
              <i class="fas fa-plus text-xs"></i>
            </button>
          </div>
          <button onclick="removeCartItem('${item.id}')"
                  class="p-1 transition-colors" style="color:var(--border-md);"
                  onmouseover="this.style.color='#dc2626'" onmouseout="this.style.color='var(--border-md)'">
            <i class="fas fa-trash-alt text-xs"></i>
          </button>
        </div>
      </div>
    </div>`).join('');

  const sub  = document.getElementById('cartSubtotal');
  const ship = document.getElementById('cartShipping');
  const tot  = document.getElementById('cartTotal');

  if (sub)  sub.textContent  = formatPrice(Store.state.cart.subtotal);
  if (ship) ship.textContent = shipping === 0 ? 'Gratuite 🎉' : formatPrice(shipping);
  if (tot)  tot.textContent  = formatPrice(total);
}

function addToCart(productId, quantity = 1, productData = {}) {
  if (!Store.isAuthenticated()) {
    showToast('Connectez-vous pour ajouter au panier', 'info');
    navigate('login');
    return;
  }
  const existing = Store.state.cart.items.find(i => i.id === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    Store.state.cart.items.push({
      id: productId,
      quantity: quantity,
      priceAtTime: productData.price || 0,
      product: { name: productData.name || 'Produit', image: productData.image || '' }
    });
  }
  Store.state.cart.itemCount = Store.state.cart.items.reduce((s,i) => s + i.quantity, 0);
  Store.state.cart.subtotal = Store.state.cart.items.reduce((s,i) => s + i.priceAtTime * i.quantity, 0);
  saveCartToLocal();
  updateCartUI();
  showToast(`✨ ${productData.name || 'Produit'} ajouté au panier`, 'success');
  toggleCart(true);
}

function updateCartItem(itemId, quantity) {
  if (quantity <= 0) { removeCartItem(itemId); return; }
  const item = Store.state.cart.items.find(i => i.id === itemId);
  if (item) item.quantity = quantity;
  Store.state.cart.itemCount = Store.state.cart.items.reduce((s,i) => s + i.quantity, 0);
  Store.state.cart.subtotal = Store.state.cart.items.reduce((s,i) => s + i.priceAtTime * i.quantity, 0);
  saveCartToLocal();
  updateCartUI();
}

function removeCartItem(itemId) {
  Store.state.cart.items = Store.state.cart.items.filter(i => i.id !== itemId);
  Store.state.cart.itemCount = Store.state.cart.items.reduce((s,i) => s + i.quantity, 0);
  Store.state.cart.subtotal = Store.state.cart.items.reduce((s,i) => s + i.priceAtTime * i.quantity, 0);
  saveCartToLocal();
  updateCartUI();
  showToast('Article retiré', 'info');
}

function applyCoupon() {
  showToast('Code promo non actif pour le moment', 'info');
}

let cartOpen = false;
function toggleCart(forceOpen = false) {
  const sidebar = document.getElementById('cartSidebar');
  const panel   = document.getElementById('cartPanel');
  if (forceOpen) cartOpen = false;
  cartOpen = !cartOpen;
  sidebar?.classList.toggle('hidden', !cartOpen);
  if (cartOpen) {
    document.body.style.overflow = 'hidden';
    setTimeout(() => panel?.classList.add('open'), 10);
  } else {
    panel?.classList.remove('open');
    setTimeout(() => { document.body.style.overflow = ''; }, 350);
  }
}
/* ─── WISHLIST ────────────────────────────────────────────── */
async function loadWishlist() {
  if (!Store.isAuthenticated()) return;
  loadWishlistFromLocal(); // charger depuis localStorage au lieu de l’API
}

async function toggleWishlist(productId, btn) {
  if (!Store.isAuthenticated()) {
    showToast('Connectez-vous pour utiliser la liste de souhaits', 'info');
    navigate('login');
    return;
  }
  const isIn = Store.state.wishlist.some(item => item.productId === productId);
  if (isIn) {
    // Retirer de la wishlist
    Store.state.wishlist = Store.state.wishlist.filter(item => item.productId !== productId);
    if (btn) {
      btn.classList.remove('text-red-500');
      btn.classList.add('text-stone-300');
    }
    showToast('Retiré des favoris', 'info');
  } else {
    // Ajouter à la wishlist – besoin de récupérer les infos du produit
    // Pour les parfums et produits beauté, on essaie de les trouver
    let product = null;
    // Chercher d'abord dans les parfums (via API ou données locales)
    try {
      const res = await API.get(`/perfumes/products/${productId}`);
      if (res.success) product = res.data;
    } catch(e) {}
    if (!product) {
      // Chercher dans les catégories beauté
      for (const cat of Object.values(BEAUTY_CATEGORIES)) {
        const found = cat.products.find(p => p.id === productId);
        if (found) {
          product = found;
          product.category = cat.name;
          break;
        }
      }
    }
    if (!product) {
      showToast('Produit introuvable', 'error');
      return;
    }
    Store.state.wishlist.push({
      productId: product.id,
      product: product,
      addedAt: new Date().toISOString(),
    });
    if (btn) {
      btn.classList.add('text-red-500');
      btn.classList.remove('text-stone-300');
    }
    showToast('Ajouté aux favoris ❤️', 'success');
  }
  saveWishlistToLocal();
  // Mettre à jour l’UI de la wishlist si la page est ouverte
  if (currentRoute === 'wishlist') renderWishlist();
}

/* ─── LOCAL FAVORITES (Beauty Products) ──────────────────── */
function toggleLocalFavorite(productId, btn) {
  if (!Store.isAuthenticated()) {
    showToast('Connectez-vous pour sauvegarder vos favoris', 'info');
    navigate('login');
    return;
  }
  const isFav = Store.toggleFavorite(productId);
  if (btn) {
    btn.style.color = isFav ? '#ef4444' : '';
    btn.innerHTML = `<i class="fas fa-heart text-sm ${isFav ? '' : 'opacity-50'}"></i>`;
  }
  updateFavoritesUI();
  showToast(isFav ? 'Ajouté à vos favoris ❤️' : 'Retiré des favoris', isFav ? 'success' : 'info');
}

/* ─── HELPERS ─────────────────────────────────────────────── */
function formatPrice(amount) {
  return new Intl.NumberFormat('fr-MA', { style:'currency', currency:'MAD', minimumFractionDigits:0, maximumFractionDigits:0 }).format(amount || 0);
}
function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' });
}
function renderStars(rating, max=5) {
  let h = '';
  for (let i=1; i<=max; i++) h += `<span class="star ${i<=Math.round(rating)?'filled':''}">★</span>`;
  return h;
}
function renderStarsSmall(r) {
  return Array.from({length:5},(_,i)=>`<i class="fas fa-star text-xs" style="color:${i<Math.round(r)?'#f59e0b':'#e5e7eb'};"></i>`).join('');
}
function getStatusBadge(s) {
  const labels = { pending:'En attente', processing:'En traitement', confirmed:'Confirmée', shipped:'Expédiée', delivered:'Livrée', cancelled:'Annulée', refunded:'Remboursée' };
  const colors  = { pending:'bg-amber-100 text-amber-800', processing:'bg-blue-100 text-blue-800', confirmed:'bg-purple-100 text-purple-800', shipped:'bg-indigo-100 text-indigo-800', delivered:'bg-green-100 text-green-800', cancelled:'bg-red-100 text-red-800', refunded:'bg-stone-100 text-stone-700' };
  return `<span class="${colors[s]||'bg-stone-100 text-stone-700'} px-2.5 py-1 rounded-full text-xs font-semibold">${labels[s]||s}</span>`;
}
function getPaymentBadge(s) {
  const cfg = { pending:['bg-amber-100 text-amber-800','En attente'], paid:['bg-green-100 text-green-800','Payé'], failed:['bg-red-100 text-red-800','Échoué'], refunded:['bg-stone-100 text-stone-700','Remboursé'] };
  const [cls, label] = cfg[s] || ['bg-stone-100 text-stone-700', s];
  return `<span class="${cls} px-2.5 py-1 rounded-full text-xs font-semibold">${label}</span>`;
}
function toggleUserMenu() { document.getElementById('userDropdown')?.classList.toggle('hidden'); }
function closeAllDropdowns() {
  document.getElementById('userDropdown')?.classList.add('hidden');
  document.getElementById('searchDropdown')?.classList.add('hidden');
}
function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const btn  = document.getElementById('hamburgerBtn');
  menu?.classList.toggle('hidden');
  btn?.classList.toggle('open');
}
function closeMobileMenu() {
  document.getElementById('mobileMenu')?.classList.add('hidden');
  document.getElementById('hamburgerBtn')?.classList.remove('open');
}

document.addEventListener('click', e => {
  if (!document.getElementById('userMenuContainer')?.contains(e.target)) {
    document.getElementById('userDropdown')?.classList.add('hidden');
  }
  const si = document.getElementById('searchInput');
  const sd = document.getElementById('searchDropdown');
  if (si && !si.contains(e.target) && !sd?.contains(e.target)) sd?.classList.add('hidden');
});

window.addEventListener('scroll', () => {
  const nav = document.getElementById('mainNav');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
});

/* ─── SEARCH ──────────────────────────────────────────────── */
let _searchT;
async function handleSearch(query) {
  clearTimeout(_searchT);
  const dd = document.getElementById('searchDropdown');
  if (query.length < 2) { dd?.classList.add('hidden'); return; }
  _searchT = setTimeout(async () => {
    const res = await fetch(`/api/perfumes/search?q=${encodeURIComponent(query)}`).then(r=>r.json()).catch(()=>({success:false}));
    if (res.success && dd) {
      if (!res.data.length) {
        dd.innerHTML = `<div class="p-4 text-sm text-center" style="color:var(--text-muted)">Aucun résultat pour "${query}"</div>`;
      } else {
        dd.innerHTML = res.data.map(p => `
          <button onclick="navigate('parfums'); document.getElementById('searchDropdown').classList.add('hidden'); document.getElementById('searchInput').value=''"
            class="w-full flex items-center gap-3 px-4 py-3 transition-colors border-b last:border-0"
            style="border-color:var(--border);" onmouseover="this.style.background='var(--bg-warm)'" onmouseout="this.style.background=''">
            <img src="${p.imageUrl||'https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=40'}"
                 class="w-10 h-10 rounded-lg object-cover flex-shrink-0" loading="lazy">
            <div class="flex-1 text-left">
              <p class="text-sm font-medium" style="color:var(--text)">${p.name}</p>
              <p class="text-xs font-semibold price-main">${formatPrice(p.price)}</p>
            </div>
          </button>`).join('') +
          `<button onclick="navigate('parfums'); document.getElementById('searchDropdown').classList.add('hidden')"
            class="w-full px-4 py-3 text-sm font-medium text-center border-t"
            style="color:var(--primary);border-color:var(--border);">
            Voir tous les résultats
          </button>`;
      }
      dd.classList.remove('hidden');
    }
  }, 280);
}

/* ─── REGISTER GATE (Modal obligatoire) ─────────────────── */
let _gateResolved = false;
function hasRegistered() {
  return localStorage.getItem('elixir_registered') === '1' || Store.isAuthenticated();
}

function showRegisterGate() {
  return new Promise((resolve) => {
    if (_gateResolved || hasRegistered()) { resolve(); return; }
    const overlay = document.createElement('div');
    overlay.id = 'registerGateOverlay';
    overlay.innerHTML = `
      <div id="registerGateModal">
        <div class="gate-modal-header">
          <div class="relative z-10">
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 float-anim"
                 style="background:linear-gradient(135deg,var(--primary-dk),var(--primary));box-shadow:0 8px 32px rgba(92,51,23,0.5);">
              <i class="fas fa-gem text-2xl" style="color:var(--accent);"></i>
            </div>
            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
                 style="background:rgba(212,169,106,0.15);color:var(--accent-lt);border:1px solid rgba(212,169,106,0.3);">
              <i class="fas fa-star text-xs"></i> Accès Exclusif
            </div>
            <h2 class="font-serif text-2xl font-bold text-white mb-2">
              Bienvenue chez <span class="text-shimmer">Élixir</span>
            </h2>
            <p class="text-sm leading-relaxed" style="color:rgba(255,255,255,0.6)">
              Créez votre compte pour accéder à notre catalogue exclusif de beauté de luxe
            </p>
          </div>
        </div>
        <div class="p-6">
          <div class="flex rounded-xl overflow-hidden border mb-6" style="border-color:var(--border-md);">
            <button onclick="switchGateTab('register')" id="gateTabRegister"
                    class="flex-1 py-2.5 text-sm font-semibold transition-all"
                    style="background:linear-gradient(135deg,var(--primary),var(--primary-dk));color:#fff;">
              <i class="fas fa-user-plus mr-1.5"></i>S'inscrire
            </button>
            <button onclick="switchGateTab('login')" id="gateTabLogin"
                    class="flex-1 py-2.5 text-sm font-semibold transition-all" style="color:var(--text-muted);">
              <i class="fas fa-sign-in-alt mr-1.5"></i>Se connecter
            </button>
          </div>
          <form id="gateRegisterForm" onsubmit="submitGateRegister(event)" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="form-label">Prénom *</label>
                <input type="text" id="gateFirstName" required placeholder="Fatima" class="form-input" autocomplete="given-name">
              </div>
              <div>
                <label class="form-label">Nom *</label>
                <input type="text" id="gateLastName" required placeholder="Alami" class="form-input" autocomplete="family-name">
              </div>
            </div>
            <div>
              <label class="form-label">Email *</label>
              <input type="email" id="gateEmail" required placeholder="vous@email.ma" class="form-input" autocomplete="email"
                     oninput="validateGateEmail(this)">
              <div id="gateEmailErr" class="form-error hidden"><i class="fas fa-exclamation-circle"></i> Email invalide</div>
            </div>
            <div>
              <label class="form-label">Mot de passe *</label>
              <div class="relative">
                <input type="password" id="gatePassword" required placeholder="Minimum 6 caractères"
                       class="form-input pr-10" autocomplete="new-password"
                       oninput="updatePasswordStrength(this)">
                <button type="button" onclick="togglePassVis('gatePassword','gatePassIcon')" tabindex="-1"
                        class="absolute right-3 top-1/2 -translate-y-1/2" style="color:var(--text-muted)">
                  <i id="gatePassIcon" class="fas fa-eye text-sm"></i>
                </button>
              </div>
              <div class="password-strength mt-2"><div id="gatePassStrengthBar" class="password-strength-bar" style="width:0%"></div></div>
              <p id="gatePassStrengthLabel" class="form-hint"></p>
            </div>
            <div class="flex items-start gap-2.5">
              <input type="checkbox" id="gateConsent" required class="mt-0.5 rounded" style="width:1rem;height:1rem;flex-shrink:0;accent-color:var(--primary);">
              <label for="gateConsent" class="text-xs leading-relaxed" style="color:var(--text-muted)">
                J'accepte les <a href="#" class="hover:underline font-medium" style="color:var(--primary)">CGV</a> et la 
                <a href="#" class="hover:underline font-medium" style="color:var(--primary)">politique de confidentialité</a>.
              </label>
            </div>
            <button type="submit" id="gateSubmitBtn" class="btn-luxury btn-luxury-gold w-full py-3.5 text-base">
              <i class="fas fa-gem"></i> Accéder au Catalogue
            </button>
          </form>
          <form id="gateLoginForm" onsubmit="submitGateLogin(event)" class="space-y-3 hidden">
            <div>
              <label class="form-label">Email *</label>
              <input type="email" id="gateLoginEmail" required placeholder="vous@email.ma" class="form-input" autocomplete="email">
            </div>
            <div>
              <label class="form-label">Mot de passe *</label>
              <div class="relative">
                <input type="password" id="gateLoginPassword" required placeholder="Votre mot de passe"
                       class="form-input pr-10" autocomplete="current-password">
                <button type="button" onclick="togglePassVis('gateLoginPassword','gateLoginPassIcon')" tabindex="-1"
                        class="absolute right-3 top-1/2 -translate-y-1/2" style="color:var(--text-muted)">
                  <i id="gateLoginPassIcon" class="fas fa-eye text-sm"></i>
                </button>
              </div>
            </div>
            <div class="text-right">
              <button type="button" onclick="showForgotPassword()" class="forgot-password-link">Mot de passe oublié ?</button>
            </div>
            <button type="submit" id="gateLoginBtn" class="btn-luxury btn-luxury-gold w-full py-3.5 text-base">
              <i class="fas fa-sign-in-alt"></i> Se connecter
            </button>
          </form>
          <div class="mt-5 pt-5 border-t" style="border-color:var(--border);">
            <div class="grid grid-cols-3 gap-3 text-center">
              ${[{icon:'fa-tag',text:'Offres exclusives'},{icon:'fa-heart',text:'Mes favoris'},{icon:'fa-truck',text:'Livraison 24h'}].map(b=>`
                <div class="text-center">
                  <div class="w-8 h-8 rounded-lg mx-auto mb-1.5 flex items-center justify-center" style="background:var(--bg-warm);">
                    <i class="fas ${b.icon} text-xs" style="color:var(--primary);"></i>
                  </div>
                  <p class="text-xs leading-tight" style="color:var(--text-muted)">${b.text}</p>
                </div>`).join('')}
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    window._gateResolve = () => {
      _gateResolved = true;
      localStorage.setItem('elixir_registered', '1');
      overlay.style.animation = 'fadeIn 0.2s ease reverse';
      setTimeout(() => {
        overlay.remove();
        document.body.style.overflow = '';
        resolve();
      }, 200);
    };
  });
}

function switchGateTab(tab) {
  const regForm   = document.getElementById('gateRegisterForm');
  const loginForm = document.getElementById('gateLoginForm');
  const tabReg    = document.getElementById('gateTabRegister');
  const tabLogin  = document.getElementById('gateTabLogin');
  if (tab === 'register') {
    regForm.classList.remove('hidden'); loginForm.classList.add('hidden');
    tabReg.style.cssText   = `background:linear-gradient(135deg,var(--primary),var(--primary-dk));color:#fff;`;
    tabLogin.style.cssText = `color:var(--text-muted);background:none;`;
  } else {
    loginForm.classList.remove('hidden'); regForm.classList.add('hidden');
    tabLogin.style.cssText = `background:linear-gradient(135deg,var(--primary),var(--primary-dk));color:#fff;`;
    tabReg.style.cssText   = `color:var(--text-muted);background:none;`;
  }
}

function togglePassVis(inputId, iconId) {
  const inp  = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!inp) return;
  if (inp.type === 'password') { inp.type = 'text';     if(icon) icon.className = 'fas fa-eye-slash text-sm'; }
  else                         { inp.type = 'password'; if(icon) icon.className = 'fas fa-eye text-sm'; }
}

function validateGateEmail(inp) {
  const err = document.getElementById('gateEmailErr');
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inp.value);
  if (err) err.classList.toggle('hidden', valid || !inp.value);
  inp.classList.toggle('error', !valid && !!inp.value);
  inp.classList.toggle('valid', valid);
}

function updatePasswordStrength(inp) {
  const val = inp.value;
  const bar = document.getElementById('gatePassStrengthBar');
  const lbl = document.getElementById('gatePassStrengthLabel');
  if (!bar) return;
  let score = 0;
  if (val.length >= 6) score++;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const pct = (score / 5 * 100) + '%';
  const colors = ['#dc2626','#f87171','#f59e0b','#22c55e','#059669'];
  const labels = ['Très faible','Faible','Moyen','Fort','Très fort'];
  bar.style.width = pct;
  bar.style.background = colors[score - 1] || '#e5e7eb';
  if (lbl) { lbl.textContent = val ? labels[score - 1] || '' : ''; lbl.style.color = colors[score-1] || ''; }
}

async function submitGateRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('gateSubmitBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full" style="animation:spin 0.9s linear infinite;"></div> Création du compte…';
  const data = {
    firstName: document.getElementById('gateFirstName').value.trim(),
    lastName:  document.getElementById('gateLastName').value.trim(),
    email:     document.getElementById('gateEmail').value.trim(),
    password:  document.getElementById('gatePassword').value,
  };
  const res = await API.post('/auth/register', data);
  if (res.success) {
    Store.setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
    showToast(`Bienvenue ${res.data.user.firstName} ! 🎉`, 'success');
    if (window._gateResolve) window._gateResolve();
  } else {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-gem"></i> Accéder au Catalogue';
    showToast(res.error || "Erreur lors de l'inscription", 'error');
  }
}

async function submitGateLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('gateLoginBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full" style="animation:spin 0.9s linear infinite;"></div> Connexion…';
  const res = await API.post('/auth/login', {
    email:    document.getElementById('gateLoginEmail').value.trim(),
    password: document.getElementById('gateLoginPassword').value,
  });
  if (res.success) {
    Store.setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
    showToast(`Content de vous revoir ${res.data.user.firstName} ! 🌟`, 'success');
    if (window._gateResolve) window._gateResolve();
  } else {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter';
    showToast(res.error || 'Email ou mot de passe incorrect', 'error');
  }
}

/* ─── FORGOT PASSWORD ────────────────────────────────────── */
function showForgotPassword() {
  // Remove existing modal if present
  document.getElementById('forgotPasswordModal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'forgotPasswordModal';
  modal.innerHTML = `
    <div class="forgot-modal-box">
      <div class="flex items-center justify-between mb-6">
        <h2 class="font-serif text-xl font-bold" style="color:var(--text)">Réinitialiser le mot de passe</h2>
        <button onclick="document.getElementById('forgotPasswordModal').remove()"
                class="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style="color:var(--text-muted);" onmouseover="this.style.background='var(--bg-warm)'" onmouseout="this.style.background=''">
          <i class="fas fa-times text-sm"></i>
        </button>
      </div>
      <p class="text-sm mb-6" style="color:var(--text-muted)">
        Saisissez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
      </p>
      <form onsubmit="submitForgotPassword(event)" class="space-y-4">
        <div>
          <label class="form-label">Adresse email *</label>
          <input type="email" id="forgotEmail" required placeholder="vous@email.ma" class="form-input" autocomplete="email">
        </div>
        <button type="submit" id="forgotSubmitBtn" class="btn-luxury btn-luxury-gold w-full py-3.5">
          <i class="fas fa-paper-plane"></i> Envoyer le lien
        </button>
      </form>
      <p class="text-xs text-center mt-4" style="color:var(--text-muted)">
        Vous recevrez un email dans les 5 minutes si le compte existe.
      </p>
    </div>`;
  document.body.appendChild(modal);
}

async function submitForgotPassword(e) {
  e.preventDefault();
  const btn = document.getElementById('forgotSubmitBtn');
  const email = document.getElementById('forgotEmail').value.trim();
  btn.disabled = true;
  btn.innerHTML = '<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full" style="animation:spin 0.9s linear infinite;"></div> Envoi…';
  
  // Simulate API call (real implementation would call /api/auth/forgot-password)
  await new Promise(r => setTimeout(r, 1500));
  
  document.getElementById('forgotPasswordModal').remove();
  showToast('Si ce compte existe, un email de réinitialisation a été envoyé.', 'success', 6000);
}

/* ─── MOROCCAN REVIEWS ──────────────────────────────────── */
const MOROCCAN_REVIEWS = [
  {
    name: 'Fatima Zahra El Amrani', city: 'Casablanca',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop',
    rating: 5, product: 'Rouge à Lèvres Velours Ruby', date: 'Décembre 2024',
    text: 'Subhanallah, ce rouge à lèvres est d\'une qualité exceptionnelle ! La tenue est incroyable, toute la journée sans retouche. L\'emballage luxueux, parfait comme cadeau. Je recommande à 100% !',
    verified: true,
  },
  {
    name: 'Youssef Benali', city: 'Marrakech',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop',
    rating: 5, product: 'Sérum Vitamine C Illuminant', date: 'Novembre 2024',
    text: 'Le sérum vitamine C a complètement transformé le teint de ma femme. Sa peau est lumineuse et les taches ont diminué en 3 semaines. Livraison rapide et service excellent. Merci Élixir !',
    verified: true,
  },
  {
    name: 'Khadija Tazi', city: 'Rabat',
    avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop',
    rating: 5, product: 'Sac Vanity Cuir Camel', date: 'Janvier 2025',
    text: 'Le sac vanity est magnifique ! Le cuir est de très haute qualité, les coutures parfaites et l\'intérieur bien organisé. Exactement ce que je cherchais. Je reviendrai sans hésitation.',
    verified: true,
  },
  {
    name: 'Hamid Chraibi', city: 'Fès',
    avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop',
    rating: 5, product: 'Masque Or 24 Carats Anti-Âge', date: 'Décembre 2024',
    text: 'En tant que passionné de soins haut de gamme, je suis très exigeant. Ce masque m\'a vraiment surpris — la peau est rebondie et lumineuse après chaque application. Bravo Élixir !',
    verified: true,
  },
  {
    name: 'Nadia El Fassi', city: 'Agadir',
    avatar: 'https://images.pexels.com/photos/712513/pexels-photo-712513.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop',
    rating: 4, product: 'Palette Yeux Or et Bronze', date: 'Février 2025',
    text: 'La palette est superbe — les pigments sont intenses et la tenue excellente. Parfaite pour les occasions spéciales comme pour le quotidien. Le service client est aussi très réactif !',
    verified: true,
  },
  {
    name: 'Omar Benjelloun', city: 'Tanger',
    avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop',
    rating: 5, product: 'Coffret Cadeau Luxe Premium', date: 'Janvier 2025',
    text: 'Offert à ma femme pour son anniversaire et elle était aux anges ! Le coffret est magnifique, les produits de qualité exceptionnelle. Un vrai luxe marocain. Je recommande vivement !',
    verified: true,
  },
];

function renderReviewCard(review, delay = 0) {
  const stars = Array.from({length:5}, (_,i) =>
    `<i class="fas fa-star text-xs" style="color:${i<review.rating?'#f59e0b':'#e5e7eb'};"></i>`
  ).join('');
  return `
    <div class="review-card fade-in-up" style="animation-delay:${delay}s;">
      <div class="flex items-start gap-3 mb-4">
        <img src="${review.avatar}" alt="${review.name}"
             class="review-avatar" loading="lazy"
             onerror="this.src='https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=80'">
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <p class="font-semibold text-sm truncate" style="color:var(--text)">${review.name}</p>
            ${review.verified ? '<span class="text-xs text-emerald-600 font-medium flex-shrink-0"><i class="fas fa-check-circle mr-1"></i>Vérifié</span>' : ''}
          </div>
          <p class="text-xs" style="color:var(--text-muted)">${review.city} · ${review.date}</p>
          <div class="flex gap-0.5 mt-1">${stars}</div>
        </div>
      </div>
      <p class="text-xs font-medium mb-2" style="color:var(--accent-dk)"><i class="fas fa-gem mr-1"></i>${review.product}</p>
      <p class="text-sm leading-relaxed" style="color:var(--text-muted)">${review.text}</p>
    </div>`;
}


/* ─── HOME PAGE ──────────────────────────────────────────── */
async function renderHome() {
  await showRegisterGate();
  const app = document.getElementById('app');

  let perfumeFeatured = [];
  try {
    const pf = await fetch('/api/perfumes/featured').then(r=>r.json());
    if (pf.success) perfumeFeatured = pf.data.slice(0,8);
  } catch(e){}

  app.innerHTML = `
    <!-- HERO -->
    <section class="hero-video-section">
      <div class="hero-video-bg">
        <video autoplay muted loop playsinline preload="none"
               poster="https://images.pexels.com/photos/2253834/pexels-photo-2253834.jpeg?auto=compress&cs=tinysrgb&w=1920">
          <source src="https://cdn.coverr.co/videos/coverr-a-woman-applying-perfume-6015/mp4" type="video/mp4">
          <source src="https://cdn.coverr.co/videos/coverr-pouring-perfume-into-a-glass-bottle-4765/mp4" type="video/mp4">
        </video>
      </div>
      <div class="hero-video-overlay"></div>
      <div class="hero-particle" style="left:10%;animation-duration:8s;animation-delay:0s;width:3px;height:3px;"></div>
      <div class="hero-particle" style="left:25%;animation-duration:12s;animation-delay:2s;width:2px;height:2px;"></div>
      <div class="hero-particle" style="left:60%;animation-duration:10s;animation-delay:4s;width:4px;height:4px;"></div>
      <div class="hero-particle" style="left:80%;animation-duration:9s;animation-delay:1s;width:2px;height:2px;"></div>
      <div class="hero-video-content">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 py-24 md:py-32">
          <div class="max-w-2xl">
            <div class="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full text-xs font-semibold tracking-widest uppercase border fade-in"
                 style="background:rgba(212,169,106,0.15);color:var(--accent-lt);border-color:rgba(212,169,106,0.4);animation-delay:0.1s;">
              <i class="fas fa-gem text-xs"></i> Collections Prestige 2025 <i class="fas fa-crown text-xs"></i>
            </div>
            <h1 class="font-serif font-bold text-white leading-none mb-6 fade-in-up" style="font-size:clamp(2.8rem,7vw,5rem);animation-delay:0.2s;">
              L'Art de la<br>
              <span class="text-shimmer">Beauté Luxueuse</span>
            </h1>
            <p class="text-lg leading-relaxed mb-10 max-w-lg fade-in-up" style="color:rgba(255,255,255,0.75);animation-delay:0.35s;">
              Maquillage raffiné, soins premium et accessoires iconiques — 
              une expérience beauté hors du commun, livré chez vous au Maroc en 24h.
            </p>
            <div class="flex flex-wrap gap-4 fade-in-up" style="animation-delay:0.5s;">
              <button onclick="navigate('catalogue')" class="btn-luxury btn-luxury-gold">
                <i class="fas fa-gem"></i> Explorer le Catalogue
              </button>
              <button onclick="navigate('contact')" class="btn-luxury btn-luxury-outline">
                <i class="fas fa-envelope text-xs"></i> Nous contacter
              </button>
            </div>
            <div class="flex flex-wrap gap-10 mt-14 fade-in-up" style="animation-delay:0.65s;">
              ${[['27+','Produits Beauté'],['4','Univers Luxury'],['100%','Authenticité'],['24h','Livraison Maroc']].map(([v,l],i)=>`
                <div class="text-center">
                  <p class="stat-number" style="animation-delay:${0.7+i*0.1}s;">${v}</p>
                  <p class="text-xs uppercase tracking-wider mt-0.5" style="color:rgba(255,255,255,0.5)">${l}</p>
                </div>`).join('')}
            </div>
          </div>
        </div>
      </div>
      <div class="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-xs animate-bounce" style="color:rgba(255,255,255,0.5)">
        <span>Découvrir</span><i class="fas fa-chevron-down"></i>
      </div>
    </section>

    <!-- TRUST BAR -->
    <section class="trust-bar">
      <div class="max-w-7xl mx-auto px-4 py-5">
        <div class="flex flex-wrap justify-center md:justify-between gap-5">
          ${[
            {icon:'fa-shipping-fast',color:'#6B3F2A',bg:'#F5EDE4',text:'Livraison offerte dès 500 MAD'},
            {icon:'fa-lock',color:'#059669',bg:'#dcfce7',text:'Paiement 100% sécurisé'},
            {icon:'fa-undo',color:'#3b82f6',bg:'#dbeafe',text:'Retours sous 30 jours'},
            {icon:'fa-headset',color:'#7c3aed',bg:'#ede9fe',text:'Support 7j/7'},
            {icon:'fa-certificate',color:'#D4A96A',bg:'#FDF6EC',text:'Produits 100% authentiques'},
          ].map(t=>`
            <div class="trust-item">
              <div class="trust-icon" style="background:${t.bg};">
                <i class="fas ${t.icon} text-sm" style="color:${t.color};"></i>
              </div>
              <span>${t.text}</span>
            </div>`).join('')}
        </div>
      </div>
    </section>

    <!-- 4 UNIVERS -->
    <section class="max-w-7xl mx-auto px-4 py-20">
      <div class="text-center mb-14 reveal">
        <p class="section-subtitle mb-3">Nos Univers</p>
        <h2 class="section-title text-3xl md:text-5xl mb-4" style="color:var(--text)">Explorez nos 4 collections</h2>
        <div class="section-divider">
          <div class="section-divider-line"></div>
          <i class="fas fa-gem section-divider-icon"></i>
          <div class="section-divider-line"></div>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        ${[
          {id:'parfums',name:'Parfums',sub:'Fragrances exclusives',img:'https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=600&h=800&fit=crop',icon:'fa-spray-can',count:'36+ fragrances'},
          {id:'maquillage',name:'Maquillage',sub:'Teints sublimés',img:'https://images.pexels.com/photos/33365012/pexels-photo-33365012.jpeg?auto=compress&cs=tinysrgb&w=600&h=800&fit=crop',icon:'fa-palette',count:'9 produits'},
          {id:'skincare',name:'Skincare',sub:'Soins visage & corps',img:'https://images.pexels.com/photos/3762879/pexels-photo-3762879.jpeg?auto=compress&cs=tinysrgb&w=600&h=800&fit=crop',icon:'fa-leaf',count:'9 soins'},
          {id:'accessoires',name:'Accessoires',sub:'Sacs, bijoux & plus',img:'https://images.pexels.com/photos/3641056/pexels-photo-3641056.jpeg?auto=compress&cs=tinysrgb&w=600&h=800&fit=crop',icon:'fa-gem',count:'9 articles'},
        ].map((col,i)=>`
          <button onclick="navigate('catalogue',{category:'${col.id}'})"
                  class="beauty-cat-card reveal" style="animation-delay:${i*0.1}s;">
            <img src="${col.img}" alt="${col.name}" loading="lazy"
                 onerror="this.src='https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=600'">
            <div class="beauty-cat-overlay"></div>
            <div class="absolute top-4 left-4">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center backdrop-blur-sm"
                   style="background:rgba(212,169,106,0.2);border:1px solid rgba(212,169,106,0.4);">
                <i class="fas ${col.icon} text-sm" style="color:var(--accent-lt)"></i>
              </div>
            </div>
            <div class="beauty-cat-content">
              <p class="text-xs font-bold uppercase tracking-widest mb-1" style="color:var(--accent)">${col.count}</p>
              <h3 class="text-white font-serif text-2xl font-bold leading-tight">${col.name}</h3>
              <p class="text-sm mt-1" style="color:rgba(255,255,255,0.6)">${col.sub}</p>
              <div class="beauty-cat-cta">Découvrir <i class="fas fa-arrow-right text-xs"></i></div>
            </div>
          </button>`).join('')}
      </div>
    </section>

    <!-- BESTSELLERS -->
    ${perfumeFeatured.length > 0 ? `
    <section class="py-20" style="background:linear-gradient(180deg,var(--bg-warm) 0%,var(--bg) 100%);">
      <div class="max-w-7xl mx-auto px-4">
        <div class="flex items-end justify-between mb-12">
          <div class="reveal">
            <p class="section-subtitle mb-3">Bestsellers</p>
            <h2 class="section-title text-3xl md:text-4xl" style="color:var(--text)">Parfums les plus aimés</h2>
          </div>
          <button onclick="navigate('parfums')" class="btn-underline hidden sm:flex items-center gap-1.5">
            Voir tout <i class="fas fa-arrow-right text-xs"></i>
          </button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          ${perfumeFeatured.slice(0,4).map((p,i) => renderPerfumeCard(p, i)).join('')}
        </div>
        ${perfumeFeatured.length > 4 ? `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          ${perfumeFeatured.slice(4,8).map((p,i) => renderPerfumeCard(p, i+4)).join('')}
        </div>` : ''}
        <div class="text-center mt-10">
          <button onclick="navigate('parfums')" class="btn-luxury btn-luxury-gold">
            <i class="fas fa-spray-can"></i> Voir tous les parfums
          </button>
        </div>
      </div>
    </section>` : ''}

    <!-- PROMO BANNER -->
    <section class="max-w-7xl mx-auto px-4 py-12">
      <div class="promo-banner relative overflow-hidden" style="padding:4rem 2rem;">
        <div class="absolute inset-0 pointer-events-none">
          <div style="position:absolute;top:0;right:0;width:24rem;height:24rem;opacity:0.15;background:radial-gradient(circle,var(--accent),transparent);transform:translate(25%,-25%);"></div>
        </div>
        <div class="relative flex flex-col md:flex-row items-center justify-between gap-8">
          <div class="text-center md:text-left max-w-xl">
            <span class="inline-block text-xs font-bold uppercase tracking-widest mb-4 px-4 py-1.5 rounded-full border"
                  style="color:var(--accent);border-color:rgba(212,169,106,0.4);background:rgba(212,169,106,0.1);">✦ Offre de Bienvenue</span>
            <h2 class="font-serif text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
              <span class="text-shimmer">-10%</span> sur votre<br>première commande
            </h2>
            <p class="text-sm leading-relaxed" style="color:rgba(255,255,255,0.7)">
              Utilisez le code 
              <strong class="px-2.5 py-1 rounded-lg font-mono tracking-wider" style="color:var(--accent);background:rgba(255,255,255,0.1);">BIENVENUE10</strong>
              lors de votre premier achat.
            </p>
          </div>
          <div class="flex flex-col items-center gap-4">
            <div class="w-28 h-28 rounded-full flex items-center justify-center border-2 float-anim"
                 style="background:rgba(212,169,106,0.2);border-color:rgba(212,169,106,0.4);">
              <div class="text-center">
                <p class="text-4xl font-bold font-serif" style="color:var(--accent)">-10</p>
                <p class="text-sm font-bold" style="color:var(--accent)">%</p>
              </div>
            </div>
            <button onclick="navigate('catalogue')" class="btn-luxury btn-luxury-gold">
              <i class="fas fa-tag"></i> Profiter de l'offre
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- AVIS CLIENTS -->
    <section class="py-20" style="background:linear-gradient(180deg,var(--bg-warm) 0%,var(--bg) 100%);">
      <div class="max-w-7xl mx-auto px-4">
        <div class="text-center mb-14 reveal">
          <p class="section-subtitle mb-3">Témoignages</p>
          <h2 class="section-title text-3xl md:text-4xl mb-3" style="color:var(--text)">Ce que disent nos clients</h2>
          <div class="inline-flex items-center gap-3 mt-5 px-5 py-2.5 rounded-full border" style="background:var(--bg-warm);border-color:var(--border-md);">
            <div class="flex gap-0.5">${Array.from({length:5},()=>'<i class="fas fa-star text-amber-400 text-sm"></i>').join('')}</div>
            <span class="font-bold" style="color:var(--text)">4.9/5</span>
            <span style="color:var(--text-muted)">•</span>
            <span class="text-sm" style="color:var(--text-muted)">+2 400 avis vérifiés</span>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          ${MOROCCAN_REVIEWS.map((r, i) => renderReviewCard(r, i * 0.1)).join('')}
        </div>
        <div class="text-center mt-10">
          <button onclick="navigate('parfums')" class="btn-underline flex items-center gap-2 mx-auto">
            Lire plus d'avis <i class="fas fa-arrow-right text-xs"></i>
          </button>
        </div>
      </div>
    </section>

    <!-- NEWSLETTER & RÉSEAUX SOCIAUX -->
    <section class="py-16" style="background:linear-gradient(135deg,var(--primary-dk),var(--primary));">
      <div class="max-w-3xl mx-auto px-4 text-center">
        <div class="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
             style="background:rgba(212,169,106,0.2);border:1px solid rgba(212,169,106,0.3);">
          <i class="fas fa-paper-plane text-xl" style="color:var(--accent)"></i>
        </div>
        <h2 class="font-serif text-3xl font-bold text-white mb-3">Restez informée en avant-première</h2>
        <p class="mb-8 text-sm" style="color:rgba(255,255,255,0.65)">
          Recevez nos nouvelles collections, offres exclusives et conseils beauté directement dans votre boîte mail.
        </p>
        <form id="homeNewsletterForm" onsubmit="submitNewsletter(event)" class="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
  <input type="email" id="homeNewsletterEmail" name="email" placeholder="votre@email.ma" required
         class="newsletter-input flex-1 rounded-xl">
  <button type="submit" class="btn-luxury btn-luxury-accent flex-shrink-0">
    <i class="fas fa-arrow-right"></i> S'abonner
  </button>
</form>
        <div class="flex items-center justify-center gap-2 mt-4 text-xs" style="color:rgba(255,255,255,0.5)">
          <i class="fas fa-lock text-emerald-400"></i>
          <span>Pas de spam. Désabonnement en un clic.</span>
        </div>
        <div class="flex justify-center gap-4 mt-10" style="gap:16px;">
  <a href="https://www.instagram.com/la_chica_trabajadora?igsh=aXh3b2Ricm41NWp2" target="_blank" rel="noopener" class="social-icon-link"><i class="fab fa-instagram"></i></a>
  <a href="https://www.tiktok.com/@softscissorsasmr0" target="_blank" rel="noopener" class="social-icon-link"><i class="fab fa-tiktok"></i></a>
  <a href="https://www.facebook.com/profile.php?id=100079676007045" target="_blank" rel="noopener" class="social-icon-link"><i class="fab fa-facebook-f"></i></a>
  <a href="https://wa.me/message/BM7JJGGZKPB3N1" target="_blank" rel="noopener" class="social-icon-link"><i class="fab fa-whatsapp"></i></a>
</div>
      </div>
    </section>
  `;
  initScrollReveal();
}

function renderPerfumeCard(p) {
  const discount = p.compareAtPrice ? Math.round((1-p.price/p.compareAtPrice)*100) : 0;
  return `
    <article class="product-card group cursor-pointer" onclick="navigate('parfums')">
      <div class="card-img-wrap">
        <img src="${p.imageUrl}" alt="${p.name}" loading="lazy"
             onerror="this.src='https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=300'">
        <div class="card-overlay">
          <button onclick="event.stopPropagation(); addToCart('${p.id}', 1, { price: ${p.price}, name: '${p.name.replace(/'/g, "\\'")}', image: '${p.imageUrl}' })"
                  class="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all"
                  style="background:linear-gradient(135deg,var(--primary-lt),var(--primary))">
            <i class="fas fa-shopping-bag mr-1"></i> Ajouter au panier
          </button>
        </div>
        <div class="absolute top-2 left-2 flex flex-col gap-1">
          ${p.badge ? `<span class="badge badge-bestseller">${p.badge}</span>` : ''}
          ${discount > 0 ? `<span class="badge badge-sale">-${discount}%</span>` : ''}
        </div>
        <div class="absolute top-2 right-2">
          <span class="bg-white/90 text-xs font-semibold px-2 py-1 rounded-full shadow-sm" style="color:var(--text-muted)">${p.volume}</span>
        </div>
      </div>
      <div class="p-4">
        <p class="text-xs font-semibold uppercase tracking-wider mb-1" style="color:var(--primary)">${p.categoryId || 'Parfum'}</p>
        <h3 class="font-semibold text-sm leading-tight mb-2 truncate" style="color:var(--text)">${p.name}</h3>
        <div class="flex items-center gap-1 mb-3">
          <div class="flex text-xs">${renderStarsSmall(p.rating)}</div>
          <span class="text-xs" style="color:var(--text-muted)">(${p.reviewCount})</span>
        </div>
        <div class="flex items-center justify-between">
          <div>
            <span class="price-main text-base">${formatPrice(p.price)}</span>
            ${p.compareAtPrice ? `<span class="price-strike text-xs ml-1">${formatPrice(p.compareAtPrice)}</span>` : ''}
          </div>
          <button onclick="event.stopPropagation(); addPerfumeToCartGlobal('${p.id}')"
                  class="w-8 h-8 rounded-lg text-white flex items-center justify-center transition-all hover:-translate-y-0.5"
                  style="background:linear-gradient(135deg,var(--primary-lt),var(--primary))">
            <i class="fas fa-plus text-xs"></i>
          </button>
        </div>
      </div>
    </article>`;
}

function renderStarsPerfumeSimple(r) {
  let h='';
  for(let i=1;i<=5;i++) h += `<span style="color:${i<=Math.round(r)?'#f59e0b':'#e5e7eb'}; font-size:0.7rem;">★</span>`;
  return h;
}

async function addPerfumeToCartGlobal(productId) {
  if (typeof addPerfumeToCart === 'function') {
    await addPerfumeToCart(productId);
  } else {
    showToast('Ajouté au panier!', 'success');
  }
}

/* ─── PRODUCTS PAGE ──────────────────────────────────────── */
async function renderProducts(params = {}) {
  const app = document.getElementById('app');

  const catsRes = await API.get('/categories');
  const cats    = catsRes.data || [];
  Store.state.categories = cats;

  const urlParams = new URLSearchParams();
  if (params.category) urlParams.set('category', params.category);
  if (params.search)   urlParams.set('search',   params.search);
  if (params.minPrice) urlParams.set('minPrice', params.minPrice);
  if (params.maxPrice) urlParams.set('maxPrice', params.maxPrice);
  urlParams.set('sort',  params.sort  || 'newest');
  urlParams.set('limit', '9');
  urlParams.set('page',  params.page  || '1');

  const productsRes = await API.get(`/products?${urlParams}`);
  const { data: prods = [], meta = {} } = productsRes;
  const currentCat = cats.find(c => c.slug === params.category);

  app.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 py-10">
      <nav class="flex items-center gap-2 text-xs mb-8" style="color:var(--text-muted)">
        <button onclick="navigate('home')" class="hover:underline transition-colors" style="color:var(--text-muted)">Accueil</button>
        <i class="fas fa-chevron-right text-xs opacity-50"></i>
        ${currentCat ?
          `<button onclick="navigate('products')" class="hover:underline transition-colors" style="color:var(--text-muted)">Boutique</button>
           <i class="fas fa-chevron-right text-xs opacity-50"></i>
           <span class="font-medium" style="color:var(--text)">${currentCat.name}</span>` :
          `<span class="font-medium" style="color:var(--text)">Boutique</span>`}
      </nav>

      <div class="flex gap-8">
        <aside class="hidden lg:block w-60 flex-shrink-0">
          <div class="bg-white rounded-2xl border shadow-sm p-5 sticky top-24" style="border-color:var(--border);">
            <h3 class="font-semibold mb-5 flex items-center gap-2 text-sm" style="color:var(--text)">
              <i class="fas fa-sliders-h text-xs" style="color:var(--primary)"></i> Filtres
            </h3>
            <div class="mb-6">
              <h4 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--text-muted)">Catégories</h4>
              <div class="space-y-1">
                <button onclick="navigate('products')"
                        class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                        style="${!params.category ? 'background:var(--bg-warm);color:var(--primary);' : 'color:var(--text-muted);'}">
                  Toutes
                </button>
                ${cats.map(cat => `
                  <button onclick="navigate('products',{category:'${cat.slug}'})"
                          class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors flex justify-between"
                          style="${params.category===cat.slug ? 'background:var(--bg-warm);color:var(--primary);' : 'color:var(--text-muted);'}">
                    <span>${cat.name}</span>
                    <span style="color:var(--border-md)">${cat.productCount}</span>
                  </button>`).join('')}
              </div>
            </div>
            <div class="mb-6">
              <h4 class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--text-muted)">Prix (MAD)</h4>
              <div class="grid grid-cols-2 gap-2">
                <input type="number" id="filterMinPrice" placeholder="Min" value="${params.minPrice||''}"
                       class="w-full px-3 py-2 text-xs border rounded-xl outline-none" style="border-color:var(--border);background:var(--bg);">
                <input type="number" id="filterMaxPrice" placeholder="Max" value="${params.maxPrice||''}"
                       class="w-full px-3 py-2 text-xs border rounded-xl outline-none" style="border-color:var(--border);background:var(--bg);">
              </div>
              <button onclick="applyPriceFilter()"
                      class="w-full mt-2 py-2 text-xs font-semibold text-white rounded-xl transition-all hover:-translate-y-0.5"
                      style="background:linear-gradient(135deg,var(--primary-lt),var(--primary))">
                Appliquer
              </button>
            </div>
          </div>
        </aside>

        <div class="flex-1">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 class="section-title text-2xl" style="color:var(--text)">${currentCat ? currentCat.name : 'Tous les produits'}</h1>
              <p class="text-xs mt-1" style="color:var(--text-muted)">${meta.total||0} produit${(meta.total||0)!==1?'s':''}</p>
            </div>
            <select onchange="navigate('products',{...${JSON.stringify(params)},sort:this.value})"
                    class="px-3 py-2 bg-white border rounded-xl text-xs focus:outline-none cursor-pointer"
                    style="border-color:var(--border);color:var(--text);">
              <option value="newest" ${(params.sort||'newest')==='newest'?'selected':''}>Plus récents</option>
              <option value="price-asc"  ${params.sort==='price-asc'?'selected':''}>Prix ↑</option>
              <option value="price-desc" ${params.sort==='price-desc'?'selected':''}>Prix ↓</option>
              <option value="rating"     ${params.sort==='rating'?'selected':''}>Mieux notés</option>
            </select>
          </div>

          ${prods.length === 0 ? `
            <div class="text-center py-20 bg-white rounded-2xl border" style="border-color:var(--border);">
              <i class="fas fa-search text-4xl mb-4" style="color:var(--border-md)"></i>
              <h3 class="font-semibold mb-2" style="color:var(--text)">Aucun produit trouvé</h3>
              <p class="text-sm mb-6" style="color:var(--text-muted)">Essayez d'autres critères</p>
              <button onclick="navigate('products')" class="btn-luxury btn-luxury-gold text-sm px-6 py-2.5">
                Voir tous les produits
              </button>
            </div>` : `
            <div class="catalogue-grid">
              ${prods.map(p => renderProductCardBoutique(p)).join('')}
            </div>`}

          ${(meta.totalPages||0) > 1 ? `
            <div class="flex justify-center gap-2 mt-10">
              ${meta.page > 1 ? `<button onclick="navigate('products',{...${JSON.stringify(params)},page:${meta.page-1}})" class="btn-luxury btn-luxury-gold text-xs px-4 py-2"><i class="fas fa-chevron-left mr-1"></i>Précédent</button>` : ''}
              <span class="px-4 py-2 text-xs bg-white rounded-xl border" style="border-color:var(--border);color:var(--text-muted)">Page ${meta.page} / ${meta.totalPages}</span>
              ${meta.page < meta.totalPages ? `<button onclick="navigate('products',{...${JSON.stringify(params)},page:${meta.page+1}})" class="btn-luxury btn-luxury-gold text-xs px-4 py-2">Suivant<i class="fas fa-chevron-right ml-1"></i></button>` : ''}
            </div>` : ''}
        </div>
      </div>
    </div>`;
}

function renderProductCardBoutique(product) {
  const inWishlist = Store.state.wishlist.some(w => w.productId === product.id);
  const isFav = Store.isFavorite(product.id);
  const discount = product.compareAtPrice ? Math.round((1-product.price/product.compareAtPrice)*100) : 0;
  const sku = product.sku || `REF-COS-${product.id?.toString().padStart(5,'0')}`;
  return `
    <div class="product-card group" onclick="navigate('product',{id:'${product.slug||product.id}'})" style="cursor:pointer;">
      <div class="card-img-wrap">
        <img src="${product.images?.[0]?.url || 'https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=300'}"
             alt="${product.name}" loading="lazy"
             onerror="this.src='https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=300'">
        <div class="card-overlay">
          <button onclick="event.stopPropagation(); addToCart('${product.id}', 1, { price: ${product.price}, name: '${product.name.replace(/'/g, "\\'")}', image: '${product.images?.[0]?.url || ''}' })"
                  ${product.stock===0?'disabled':''}
                  class="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all ${product.stock===0?'opacity-50 cursor-not-allowed':''}"
                  style="background:linear-gradient(135deg,var(--primary-lt),var(--primary))">
            <i class="fas fa-shopping-bag mr-1"></i>
            ${product.stock===0?'Indisponible':'Ajouter au panier'}
          </button>
        </div>
        <div class="absolute top-2 left-2 flex flex-col gap-1">
          ${product.isFeatured ? '<span class="badge badge-featured">Vedette</span>' : ''}
          ${discount > 0 ? `<span class="badge badge-sale">-${discount}%</span>` : ''}
          ${product.stock === 0 ? '<span class="badge" style="background:#57534e;color:#fff;">Épuisé</span>' : ''}
          ${product.stock > 0 && product.stock <= 5 ? `<span class="badge badge-edition">Derniers</span>` : ''}
        </div>
        <button onclick="event.stopPropagation(); toggleLocalFavorite('${product.id}', this)"
                class="wishlist-btn ${isFav?'active':''}" title="Ajouter aux favoris">
          <i class="fas fa-heart text-xs"></i>
        </button>
      </div>
      <div class="p-4">
        <p class="text-xs mb-0.5 font-mono" style="color:var(--text-muted)">${sku}</p>
        <h3 class="font-semibold text-sm leading-tight mb-2 truncate" style="color:var(--text)">${product.name}</h3>
        <div class="flex items-center gap-1 mb-3">
          <div class="flex text-xs">${renderStarsSmall(product.rating)}</div>
          <span class="text-xs" style="color:var(--text-muted)">(${product.reviewCount})</span>
        </div>
        <div class="flex items-center justify-between">
          <div>
            <span class="price-main">${formatPrice(product.price)}</span>
            ${product.compareAtPrice ? `<span class="price-strike text-xs ml-1">${formatPrice(product.compareAtPrice)}</span>` : ''}
          </div>
          <button onclick="event.stopPropagation(); addToCart('${product.id}')"
                  ${product.stock===0?'disabled':''}
                  class="w-8 h-8 rounded-lg text-white flex items-center justify-center transition-all ${product.stock===0?'opacity-40 cursor-not-allowed':'hover:-translate-y-0.5'}"
                  style="background:linear-gradient(135deg,var(--primary-lt),var(--primary))">
            <i class="fas fa-plus text-xs"></i>
          </button>
        </div>
      </div>
    </div>`;
}

function applyPriceFilter() {
  const min = document.getElementById('filterMinPrice')?.value;
  const max = document.getElementById('filterMaxPrice')?.value;
  navigate('products', { ...routeParams, minPrice:min||undefined, maxPrice:max||undefined });
}


/* ─── PRODUCT DETAIL (Flormar Style) ────────────────────── */
async function renderProductDetail(params = {}) {
  const app = document.getElementById('app');
  const pid = params.id || params.slug;
  const [res, relatedRes] = await Promise.all([
    API.get(`/products/${pid}`),
    API.get(`/products/${pid}/related`),
  ]);
  if (!res.success) {
    app.innerHTML = `
      <div class="max-w-xl mx-auto px-4 py-24 text-center">
        <i class="fas fa-exclamation-triangle text-4xl text-amber-400 mb-4"></i>
        <h2 class="font-serif text-2xl font-bold mb-3" style="color:var(--text)">Produit introuvable</h2>
        <p class="mb-8" style="color:var(--text-muted)">Ce produit n'existe pas ou a été retiré du catalogue.</p>
        <button onclick="navigate('products')" class="btn-luxury btn-luxury-gold">Retour au catalogue</button>
      </div>`;
    return;
  }
  const product  = res.data;
  const related  = relatedRes.data || [];
  const isFav = Store.isFavorite(product.id);
  const discount = product.compareAtPrice ? Math.round((1-product.price/product.compareAtPrice)*100) : 0;
  const sku = product.sku || `REF-COS-${product.id?.toString().padStart(5,'0')}`;
  const images = product.images?.length ? product.images : [{ url: product.images?.[0]?.url || 'https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=600' }];

  app.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 py-10">
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-2 text-xs mb-10" style="color:var(--text-muted)">
        <button onclick="navigate('home')" class="hover:underline" style="color:var(--text-muted)">Accueil</button>
        <i class="fas fa-chevron-right opacity-40"></i>
        <button onclick="navigate('products')" class="hover:underline" style="color:var(--text-muted)">Boutique</button>
        <i class="fas fa-chevron-right opacity-40"></i>
        ${product.category ? `<button onclick="navigate('products',{category:'${product.category.slug}'})" class="hover:underline" style="color:var(--text-muted)">${product.category.name}</button><i class="fas fa-chevron-right opacity-40"></i>` : ''}
        <span class="font-medium truncate max-w-xs" style="color:var(--text)">${product.name}</span>
      </nav>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-14 mb-16">
        <!-- Gallery -->
        <div>
          <div class="product-gallery-main mb-4" id="productMainImg" onclick="toggleZoom(this)">
            <img src="${images[0]?.url || 'https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=600'}"
                 class="w-full h-full object-cover" alt="${product.name}" id="mainProductImg" loading="lazy"
                 onerror="this.src='https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=600'">
            ${discount > 0 ? `<span class="absolute top-4 left-4 badge badge-sale text-sm">-${discount}%</span>` : ''}
            <div class="absolute top-4 right-4 text-xs px-2 py-1 rounded-full" style="background:rgba(255,255,255,0.9);color:var(--text-muted)">
              <i class="fas fa-search-plus mr-1"></i>Zoom
            </div>
          </div>
          <div class="flex gap-3 overflow-x-auto pb-1" id="thumbsRow">
            ${images.map((img, i) => `
              <button class="product-gallery-thumb ${i===0?'active':''}" onclick="switchProductImg('${img.url}', this)" title="Image ${i+1}">
                <img src="${img.url}" alt="Image ${i+1}" loading="lazy">
              </button>`).join('')}
            ${images.length < 3 ? [
              'https://images.pexels.com/photos/3762879/pexels-photo-3762879.jpeg?auto=compress&cs=tinysrgb&w=200',
              'https://images.pexels.com/photos/28255122/pexels-photo-28255122.jpeg?auto=compress&cs=tinysrgb&w=200',

              
            ].slice(0, 3 - images.length).map((url, i) => `
              <button class="product-gallery-thumb" onclick="switchProductImg('${url}', this)" title="Vue ${i+2}">
                <img src="${url}" alt="Vue alternative" loading="lazy">
              </button>`).join('') : ''}
          </div>
        </div>

        <!-- Info Panel -->
        <div>
          ${product.category ? `<span class="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full" style="color:var(--primary);background:var(--bg-warm)">${product.category.name}</span>` : ''}
          <h1 class="font-serif text-3xl md:text-4xl font-bold mt-4 mb-3" style="color:var(--text)">${product.name}</h1>
          
          <div class="flex items-center gap-3 mb-4">
            <div class="flex">${renderStars(product.rating)}</div>
            <span class="font-bold" style="color:var(--text)">${product.rating}</span>
            <span class="text-sm" style="color:var(--text-muted)">${product.reviewCount} avis</span>
          </div>
          
          <!-- SKU & Stock -->
          <div class="flex items-center gap-3 mb-5 flex-wrap">
            <span class="sku-badge"><i class="fas fa-tag mr-1 text-xs"></i>${sku}</span>
            ${product.stock > 10 ? '<span class="text-sm font-semibold stock-high"><i class="fas fa-check-circle mr-1 text-xs"></i>En stock</span>' :
              product.stock > 0 ? `<span class="text-sm font-semibold stock-low"><i class="fas fa-exclamation-circle mr-1 text-xs"></i>Plus que ${product.stock}!</span>` :
              '<span class="text-sm font-semibold stock-none"><i class="fas fa-times-circle mr-1 text-xs"></i>Épuisé</span>'}
          </div>

          <!-- Price -->
          <div class="flex items-baseline gap-3 mb-6">
            <span class="text-3xl font-bold price-main">${formatPrice(product.price)}</span>
            ${product.compareAtPrice ? `
              <span class="price-strike text-lg">${formatPrice(product.compareAtPrice)}</span>
              <span class="badge badge-sale">-${discount}%</span>` : ''}
          </div>
          
          <!-- Description -->
          <p class="text-sm leading-relaxed mb-6" style="color:var(--text-muted)">${product.description}</p>

          <!-- Volume/Variants (if applicable) -->
          ${product.variants?.length ? `
          <div class="mb-6">
            <h3 class="text-sm font-semibold mb-3" style="color:var(--text)">Taille / Volume</h3>
            <div class="flex flex-wrap gap-2">
              ${product.variants.map((v, i) => `
                <button class="variant-btn ${i===0?'selected':''}" onclick="selectVariant(this, '${v.id}')">
                  ${v.name}
                </button>`).join('')}
            </div>
          </div>` : ''}

          <!-- Détails produit -->
          <div class="rounded-2xl p-4 mb-6 space-y-2.5 text-sm border" style="background:var(--bg-warm);border-color:var(--border);">
            <div class="flex justify-between">
              <span style="color:var(--text-muted)">Référence:</span>
              <span class="font-mono font-medium" style="color:var(--text)">${sku}</span>
            </div>
            ${product.volume ? `<div class="flex justify-between"><span style="color:var(--text-muted)">Contenu:</span><span class="font-medium" style="color:var(--text)">${product.volume}</span></div>` : ''}
            <div class="flex justify-between">
              <span style="color:var(--text-muted)">Disponibilité:</span>
              ${product.stock > 10 ? '<span class="text-emerald-600 font-semibold">En stock</span>' :
                product.stock > 0 ? `<span style="color:#d97706" class="font-semibold">Dernières unités (${product.stock})</span>` :
                '<span class="text-red-500 font-semibold">Épuisé</span>'}
            </div>
            ${product.category ? `<div class="flex justify-between"><span style="color:var(--text-muted)">Catégorie:</span><span class="font-medium" style="color:var(--text)">${product.category.name}</span></div>` : ''}
          </div>

          <!-- Actions -->
          <div class="flex flex-col sm:flex-row gap-3 mb-7">
            <div class="flex items-center gap-2 rounded-xl p-1 w-fit border" style="background:var(--bg-warm);border-color:var(--border);">
              <button onclick="changeQty(-1)" class="qty-btn"><i class="fas fa-minus text-xs"></i></button>
              <span id="productQty" class="w-10 text-center font-bold" style="color:var(--text)">1</span>
              <button onclick="changeQty(1)"  class="qty-btn"><i class="fas fa-plus text-xs"></i></button>
            </div>
            <button onclick="addToCart('${product.id}', parseInt(document.getElementById('productQty').textContent))"
                    ${product.stock===0?'disabled':''}
                    class="flex-1 py-3.5 rounded-xl font-semibold text-white text-sm transition-all flex items-center justify-center gap-2 ${product.stock===0?'opacity-50 cursor-not-allowed':'hover:shadow-lg hover:-translate-y-0.5'}"
                    style="${product.stock>0?'background:linear-gradient(135deg,var(--primary-lt),var(--primary))':'background:#a8a29e'}">
              <i class="fas fa-shopping-bag"></i>
              ${product.stock===0?'Produit indisponible':'Ajouter au panier'}
            </button>
            <button onclick="toggleLocalFavorite('${product.id}', this)"
                    class="p-3.5 border-2 rounded-xl transition-all"
                    style="${isFav ? 'border-color:#fca5a5;color:#ef4444;' : 'border-color:var(--border-md);color:var(--text-muted);'}"
                    title="Ajouter aux favoris">
              <i class="fas fa-heart text-lg"></i>
            </button>
          </div>
          
          <!-- Guarantees -->
          <div class="grid grid-cols-3 gap-3 text-xs">
            ${[
              {ic:'fa-shield-alt',bg:'#ecfdf5',c:'#059669',t:'Paiement sécurisé'},
              {ic:'fa-shipping-fast',bg:'#eff6ff',c:'#3b82f6',t:'Livraison rapide'},
              {ic:'fa-undo',bg:'#f5f3ff',c:'#7c3aed',t:'Retour 30 jours'},
            ].map(b=>`
              <div class="text-center p-3 rounded-xl" style="background:${b.bg}">
                <i class="fas ${b.ic} mb-1 block" style="color:${b.c}"></i>
                <p class="font-medium leading-tight" style="color:${b.c}">${b.t}</p>
              </div>`).join('')}
          </div>
        </div>
      </div>

      <!-- Product Tabs (Description / Composition / Avis) -->
      <div class="bg-white rounded-3xl border shadow-sm mb-12" style="border-color:var(--border);">
        <div class="flex border-b overflow-x-auto" style="border-color:var(--border);">
          <button class="product-tab active" id="tab-desc" onclick="switchProductTab('desc')">Description</button>
          <button class="product-tab" id="tab-comp" onclick="switchProductTab('comp')">Composition</button>
          <button class="product-tab" id="tab-use" onclick="switchProductTab('use')">Utilisation</button>
          <button class="product-tab" id="tab-reviews" onclick="switchProductTab('reviews')">Avis (${product.reviews?.length||0})</button>
        </div>
        <div id="tab-content-desc" class="p-8">
          <p class="text-sm leading-relaxed mb-4" style="color:var(--text-muted)">${product.description}</p>
          ${product.longDescription ? `<p class="text-sm leading-relaxed" style="color:var(--text-muted)">${product.longDescription}</p>` :
            `<p class="text-sm leading-relaxed" style="color:var(--text-muted)">
              Ce produit a été soigneusement formulé pour offrir les meilleurs résultats. 
              Sa texture légère s'adapte à tous les types de peau pour une application facile et agréable. 
              Bénéficiez d'une couverture parfaite et d'un résultat professionnel à la maison.
            </p>`}
        </div>
        <div id="tab-content-comp" class="p-8 hidden">
          <h3 class="font-semibold mb-3" style="color:var(--text)">Composition</h3>
          <p class="text-sm leading-relaxed mb-4" style="color:var(--text-muted)">
            ${product.ingredients || 'Aqua, Glycerin, Cetyl Alcohol, Dimethicone, Tocopherol (Vitamin E), Panthenol, Niacinamide, Sodium Hyaluronate, Retinol, Rosa Damascena Flower Extract, Argania Spinosa Kernel Oil, Parfum.'}
          </p>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            ${['Sans parabènes','Sans sulfates','Testé dermatologiquement','Vegan','Cruelty-free','Fabriqué au Maroc'].map(b=>`
              <div class="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg" style="background:var(--bg-warm);color:var(--text-muted)">
                <i class="fas fa-check text-xs" style="color:var(--primary)"></i>${b}
              </div>`).join('')}
          </div>
        </div>
        <div id="tab-content-use" class="p-8 hidden">
          <h3 class="font-semibold mb-3" style="color:var(--text)">Mode d'emploi</h3>
          <ol class="space-y-3 text-sm" style="color:var(--text-muted)">
            ${['Nettoyez et préparez votre peau avant l\'application.',
               'Appliquez le produit en quantité appropriée.',
               'Répartissez uniformément du centre du visage vers l\'extérieur.',
               'Laissez poser selon les indications.',
               'Peut être utilisé matin et/ou soir selon les besoins.'].map((step, i) => `
              <li class="flex items-start gap-3">
                <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" 
                      style="background:var(--primary)">${i+1}</span>
                <span>${step}</span>
              </li>`).join('')}
          </ol>
          <div class="mt-6 p-4 rounded-xl" style="background:rgba(212,169,106,0.1);border:1px solid rgba(212,169,106,0.3)">
            <p class="text-xs font-semibold mb-1" style="color:var(--primary)"><i class="fas fa-lightbulb mr-1"></i>Conseil Pro</p>
            <p class="text-xs" style="color:var(--text-muted)">Pour de meilleurs résultats, utilisez en association avec les autres produits de la gamme.</p>
          </div>
        </div>
        <div id="tab-content-reviews" class="p-8 hidden">
          ${(product.reviews?.length||0) > 0 ? `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              ${product.reviews.map(r=>`
                <div class="rounded-2xl p-5 border" style="background:var(--bg-warm);border-color:var(--border)">
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                           style="background:linear-gradient(135deg,var(--primary-lt),var(--primary))">
                        ${r.userName?.[0]||'U'}
                      </div>
                      <div>
                        <p class="font-semibold text-sm" style="color:var(--text)">${r.userName}</p>
                        <p class="text-xs" style="color:var(--text-muted)">${formatDate(r.createdAt)}</p>
                      </div>
                    </div>
                    <div class="flex text-xs">${renderStarsSmall(r.rating)}</div>
                  </div>
                  ${r.title ? `<h4 class="font-semibold text-sm mb-2" style="color:var(--text)">${r.title}</h4>` : ''}
                  <p class="text-sm leading-relaxed" style="color:var(--text-muted)">${r.comment}</p>
                </div>`).join('')}
            </div>` : `
            <div class="text-center py-10">
              <i class="fas fa-star text-3xl mb-3" style="color:var(--border-md)"></i>
              <p class="text-sm" style="color:var(--text-muted)">Aucun avis pour le moment</p>
            </div>`}
          ${Store.isAuthenticated() ? `
            <div class="border-t pt-6" style="border-color:var(--border)">
              <h3 class="font-semibold mb-4" style="color:var(--text)">Laisser un avis</h3>
              <div class="flex gap-2 mb-3">
                ${[1,2,3,4,5].map(n=>`<button onclick="setReviewRating(${n})" id="star-btn-${n}" class="text-2xl transition-colors" style="color:#e5e7eb">★</button>`).join('')}
              </div>
              <input id="reviewTitle" placeholder="Titre de votre avis"
                     class="form-input mb-3">
              <textarea id="reviewComment" placeholder="Votre commentaire…" rows="3"
                        class="form-input mb-3 resize-none"></textarea>
              <button onclick="submitReview('${product.id}')" class="btn-luxury btn-luxury-gold">
                <i class="fas fa-paper-plane"></i> Publier l'avis
              </button>
            </div>` :
            `<p class="text-sm text-center mt-4" style="color:var(--text-muted)">
               <button onclick="navigate('login')" class="font-medium hover:underline" style="color:var(--primary)">Connectez-vous</button> pour laisser un avis
             </p>`}
        </div>
      </div>

      ${related.length > 0 ? `
        <div>
          <h2 class="font-serif text-2xl font-bold mb-6" style="color:var(--text)">Produits similaires</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-5">
            ${related.map(p => renderProductCardBoutique(p)).join('')}
          </div>
        </div>` : ''}
    </div>`;
}

function switchProductImg(url, btn) {
  const mainImg = document.getElementById('mainProductImg');
  if (mainImg) mainImg.src = url;
  document.querySelectorAll('.product-gallery-thumb').forEach(b => b.classList.remove('active'));
  btn?.classList.add('active');
}

function toggleZoom(el) {
  el.classList.toggle('zoomed');
}

function switchProductTab(tab) {
  ['desc','comp','use','reviews'].forEach(t => {
    document.getElementById(`tab-content-${t}`)?.classList.add('hidden');
    const btn = document.getElementById(`tab-${t}`);
    if (btn) btn.classList.remove('active');
  });
  document.getElementById(`tab-content-${tab}`)?.classList.remove('hidden');
  document.getElementById(`tab-${tab}`)?.classList.add('active');
}

function selectVariant(btn, variantId) {
  document.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

let selectedRating = 0;
function setReviewRating(r) {
  selectedRating = r;
  for (let i=1;i<=5;i++) {
    const b = document.getElementById(`star-btn-${i}`);
    if (b) b.style.color = i<=r ? '#f59e0b' : '#e5e7eb';
  }
}
async function submitReview(productId) {
  if (!selectedRating) { showToast('Choisissez une note', 'warning'); return; }
  const comment = document.getElementById('reviewComment')?.value?.trim();
  if (!comment) { showToast('Rédigez votre commentaire', 'warning'); return; }
  const res = await API.post('/reviews', {
    productId, rating:selectedRating,
    title:  document.getElementById('reviewTitle')?.value?.trim() || '',
    comment,
  }, true);
  if (res.success) { showToast(res.message, 'success'); navigate('product', routeParams); }
  else showToast(res.error, 'error');
}
function changeQty(delta) {
  const el = document.getElementById('productQty');
  if (!el) return;
  el.textContent = Math.max(1, Math.min(99, (parseInt(el.textContent)||1) + delta));
}

/* ─── CONTACT ────────────────────────────────────────────── */
async function renderContact() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="max-w-6xl mx-auto px-4 py-16">
      <div class="text-center mb-14">
        <p class="section-subtitle mb-3">Contactez-nous</p>
        <h1 class="section-title text-4xl mb-4" style="color:var(--text)">Comment pouvons-nous vous aider ?</h1>
        <p class="max-w-xl mx-auto text-sm leading-relaxed" style="color:var(--text-muted)">
          Notre équipe est à votre disposition pour toute question concernant nos produits, vos commandes ou nos collections.
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-5 gap-10">
        <div class="lg:col-span-2 space-y-5">
          ${[
            {icon:'fa-map-marker-alt',title:'Adresse',lines:['123 Boulevard des Fragrances','Casablanca 20000, Maroc']},
            {icon:'fa-phone-alt',title:'Téléphone',lines:['+212 522 000 000','Lun–Sam 9h–19h']},
            {icon:'fa-envelope',title:'Email',lines:['contact@elixir-boutique.ma','Réponse sous 24h']},
            {icon:'fa-clock',title:'Horaires',lines:['Lun–Ven: 9h–18h','Samedi: 10h–17h']},
          ].map(item=>`
            <div class="contact-info-card flex gap-4">
              <div class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style="background:var(--bg-warm);">
                <i class="fas ${item.icon} text-sm" style="color:var(--primary)"></i>
              </div>
              <div>
                <p class="font-semibold text-sm mb-1" style="color:var(--text)">${item.title}</p>
                ${item.lines.map(l=>`<p class="text-xs" style="color:var(--text-muted)">${l}</p>`).join('')}
              </div>
            </div>`).join('')}

          <div class="contact-info-card">
            <p class="font-semibold text-sm mb-4" style="color:var(--text)">Suivez-nous</p>
            <div class="flex gap-3">
  <a href="https://www.instagram.com/la_chica_trabajadora?igsh=aXh3b2Ricm41NWp2" target="_blank" rel="noopener" aria-label="Instagram" class="social-icon-link"><i class="fab fa-instagram"></i></a>
  <a href="https://www.tiktok.com/@softscissorsasmr0" target="_blank" rel="noopener" aria-label="TikTok" class="social-icon-link"><i class="fab fa-tiktok"></i></a>
  <a href="https://www.facebook.com/profile.php?id=100079676007045" target="_blank" rel="noopener" aria-label="Facebook" class="social-icon-link"><i class="fab fa-facebook-f"></i></a>
  <a href="https://wa.me/message/BM7JJGGZKPB3N1" target="_blank" rel="noopener" aria-label="WhatsApp" class="social-icon-link"><i class="fab fa-whatsapp"></i></a>
</div>
          </div>
        </div>

        <div class="lg:col-span-3">
          <div class="bg-white rounded-2xl border shadow-sm p-8" style="border-color:var(--border);">
            <h2 class="font-serif text-2xl font-semibold mb-6" style="color:var(--text)">Envoyez-nous un message</h2>
            <form id="contactForm" onsubmit="submitContact(event)" class="space-y-5">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider mb-2" style="color:var(--text-muted)">Prénom *</label>
                  <input type="text" id="contactFirstName" required placeholder="Fatima" class="form-input">
                </div>
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider mb-2" style="color:var(--text-muted)">Nom *</label>
                  <input type="text" id="contactLastName" required placeholder="Alami" class="form-input">
                </div>
              </div>
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider mb-2" style="color:var(--text-muted)">Email *</label>
                <input type="email" id="contactEmail" required placeholder="vous@email.ma" class="form-input">
              </div>
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider mb-2" style="color:var(--text-muted)">Sujet</label>
                <select id="contactSubject" class="form-input" style="cursor:pointer;">
                  <option value="">Sélectionnez un sujet</option>
                  <option>Question sur un produit</option>
                  <option>Commande et livraison</option>
                  <option>Retour et remboursement</option>
                  <option>Partenariat</option>
                  <option>Autre</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider mb-2" style="color:var(--text-muted)">Message *</label>
                <textarea id="contactMessage" required rows="5" placeholder="Décrivez votre demande en détail…"
                          class="form-input resize-none"></textarea>
              </div>
              <div class="flex items-start gap-3">
                <input type="checkbox" id="contactConsent" required class="mt-1 rounded" style="accent-color:var(--primary);">
                <label for="contactConsent" class="text-xs leading-relaxed" style="color:var(--text-muted)">
                  J'accepte que mes données soient utilisées pour traiter ma demande, conformément à la
                  <a href="#" class="hover:underline" style="color:var(--primary)">politique de confidentialité</a>.
                </label>
              </div>
              <button type="submit" id="contactBtn"
                      class="btn-luxury btn-luxury-gold w-full py-4 text-sm flex items-center justify-center gap-2">
                <i class="fas fa-paper-plane"></i> Envoyer le message
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>`;
}

async function submitContact(e) {
  e.preventDefault();
  const btn = document.getElementById('contactBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full" style="animation:spin 0.9s linear infinite;"></div> Envoi en cours…';
  await new Promise(r => setTimeout(r, 1200));
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="max-w-lg mx-auto px-4 py-24 text-center">
      <div class="success-circle mx-auto mb-6">
        <i class="fas fa-check text-3xl text-white"></i>
      </div>
      <h2 class="font-serif text-3xl font-bold mb-3" style="color:var(--text)">Message envoyé !</h2>
      <p class="mb-8 leading-relaxed" style="color:var(--text-muted)">Merci de nous avoir contactés. Notre équipe vous répondra dans les 24 heures.</p>
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <button onclick="navigate('catalogue')" class="btn-luxury btn-luxury-gold">
          <i class="fas fa-gem mr-2"></i>Découvrir le catalogue
        </button>
        <button onclick="navigate('home')" class="btn-luxury px-6 py-3 border-2 text-sm font-semibold rounded-xl"
                style="background:transparent;color:var(--text);border-color:var(--border-md);">
          Retour à l'accueil
        </button>
      </div>
    </div>`;
}


/* ─── CHECKOUT (Sephora-style étapes) ───────────────────── */
/* ─── CHECKOUT (Sephora-style étapes) – VERSION LOCALSTORAGE ── */
let checkoutStep = 1;
let checkoutData = {};

async function renderCheckout() {
  if (!Store.isAuthenticated()) { navigate('login'); return; }
  // Recharger le panier depuis localStorage
  loadCartFromLocal();
  const cart = Store.state.cart;
  if (!cart.items?.length) {
    showToast('Votre panier est vide', 'info');
    navigate('catalogue');
    return;
  }
  checkoutStep = 1;
  checkoutData = {};
  renderCheckoutStep();
}

function renderCheckoutStep() {
  const cart = Store.state.cart;
  const shipping = cart.subtotal >= 500 ? 0 : 50;
  const total    = cart.subtotal + shipping;

  const steps = [
    { n: 1, label: 'Panier', icon: 'fa-shopping-bag' },
    { n: 2, label: 'Infos', icon: 'fa-user' },
    { n: 3, label: 'Livraison', icon: 'fa-map-marker-alt' },
    { n: 4, label: 'Résumé', icon: 'fa-list-check' },
    { n: 5, label: 'Paiement', icon: 'fa-credit-card' },
  ];

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="max-w-5xl mx-auto px-4 py-10">
      <div class="flex items-center gap-3 mb-8">
        <button onclick="navigate('catalogue')" class="w-9 h-9 rounded-xl bg-white border flex items-center justify-center transition-all hover:-translate-y-0.5"
                style="border-color:var(--border-md);color:var(--text-muted);">
          <i class="fas fa-arrow-left text-sm"></i>
        </button>
        <h1 class="font-serif text-2xl font-bold" style="color:var(--text)">Finaliser la commande</h1>
      </div>

      <!-- Stepper -->
      <div class="checkout-stepper mb-10">
        ${steps.map((s, i) => `
          <div class="step-item ${checkoutStep === s.n ? 'active' : ''}">
            ${i > 0 ? `<div class="step-connector ${checkoutStep > s.n ? 'done' : ''}"></div>` : ''}
            <div class="flex flex-col items-center">
              <div class="step-circle ${checkoutStep === s.n ? 'active' : checkoutStep > s.n ? 'done' : ''}">
                ${checkoutStep > s.n ? '<i class="fas fa-check text-xs"></i>' : s.n}
              </div>
              <span class="step-label">${s.label}</span>
            </div>
          </div>`).join('')}
      </div>

      <!-- Total -->
      <div class="bg-white rounded-2xl border p-4 mb-6 flex items-center justify-between" style="border-color:var(--border);">
        <div class="flex items-center gap-3">
          <span class="text-sm" style="color:var(--text-muted)">${cart.itemCount} article${cart.itemCount > 1 ? 's' : ''}</span>
          ${shipping === 0 ? '<span class="text-xs text-emerald-600 font-semibold">Livraison gratuite 🎉</span>' : `<span class="text-xs" style="color:var(--text-muted)">+${formatPrice(shipping)} livraison</span>`}
        </div>
        <div class="text-lg font-bold price-main">Total: ${formatPrice(total)}</div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2">
          ${renderCheckoutStepContent(checkoutStep, cart, total, shipping)}
        </div>
        <div class="hidden lg:block">
          <div class="bg-white rounded-2xl border shadow-sm p-5 sticky top-24" style="border-color:var(--border);">
            <h3 class="font-semibold text-sm mb-4" style="color:var(--text)">Votre commande</h3>
            <div class="space-y-3 mb-4 max-h-64 overflow-y-auto">
              ${cart.items.map(item => `
                <div class="flex gap-3">
                  <div class="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0" style="background:var(--bg-warm);">
                    <img src="${item.product?.image || 'https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=48'}"
                         class="w-full h-full object-cover" loading="lazy">
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-medium truncate" style="color:var(--text)">${item.product?.name}</p>
                    <p class="text-xs" style="color:var(--text-muted)">×${item.quantity}</p>
                    <p class="text-sm font-bold price-main">${formatPrice(item.priceAtTime * item.quantity)}</p>
                  </div>
                </div>`).join('')}
            </div>
            <div class="border-t pt-4 space-y-2 text-xs" style="border-color:var(--border);">
              <div class="flex justify-between"><span>Sous-total</span><span class="font-medium">${formatPrice(cart.subtotal)}</span></div>
              <div class="flex justify-between"><span>Livraison</span><span class="${shipping === 0 ? 'text-emerald-600' : ''}">${shipping === 0 ? 'Gratuite' : formatPrice(shipping)}</span></div>
              <div class="flex justify-between font-bold text-sm pt-2"><span>Total</span><span class="price-main">${formatPrice(total)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

function renderCheckoutStepContent(step, cart, total, shipping) {
  const u = Store.state.user;
  if (step === 1) {
    return `
      <div class="checkout-panel">
        <h2><span class="step-icon"><i class="fas fa-shopping-bag"></i></span>Votre panier</h2>
        <div class="space-y-4">
          ${cart.items.map(item => `
            <div class="flex gap-4 p-4 rounded-xl border" style="border-color:var(--border);">
              <div class="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style="background:var(--bg-warm);">
                <img src="${item.product?.image || 'https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=64'}"
                     class="w-full h-full object-cover">
              </div>
              <div class="flex-1">
                <p class="font-semibold text-sm" style="color:var(--text)">${item.product?.name}</p>
                <p class="text-xs mt-1" style="color:var(--text-muted)">Quantité: ${item.quantity}</p>
                <p class="font-bold price-main">${formatPrice(item.priceAtTime * item.quantity)}</p>
              </div>
            </div>`).join('')}
        </div>
        <button onclick="goCheckoutStep(2)" class="btn-luxury btn-luxury-gold w-full py-4 mt-6">
          Continuer <i class="fas fa-arrow-right ml-2"></i>
        </button>
      </div>`;
  }
  if (step === 2) {
    return `
    <div class="checkout-panel">
      <h2><span class="step-icon"><i class="fas fa-map-marker-alt"></i></span>Adresse de livraison</h2>
      <div class="space-y-4">
        <div>
          <label class="form-label">Adresse *</label>
          <input type="text" id="ship_street" value="${checkoutData.street || ''}" class="form-input" placeholder="123 Rue Mohamed V">
          <div id="err_street" class="form-error hidden"><i class="fas fa-exclamation-circle"></i> Requis</div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="form-label">Ville *</label>
            <select id="ship_city" required class="form-input">
              <option value="">Sélectionnez une ville</option>
              <option value="Casablanca">Casablanca</option>
              <option value="Rabat">Rabat</option>
              <option value="Marrakech">Marrakech</option>
              <option value="Fès">Fès</option>
              <option value="Tanger">Tanger</option>
              <option value="Agadir">Agadir</option>
              <option value="Meknès">Meknès</option>
              <option value="Oujda">Oujda</option>
              <option value="Tétouan">Tétouan</option>
              <option value="Essaouira">Essaouira</option>
            </select>
            <div id="err_city" class="form-error hidden"><i class="fas fa-exclamation-circle"></i> Veuillez sélectionner une ville</div>
          </div>
          <div>
            <label class="form-label">Code postal *</label>
            <input type="text" id="ship_zip" value="${checkoutData.zipCode || ''}" class="form-input" placeholder="20000" maxlength="5" pattern="[0-9]{5}" inputmode="numeric">
            <div id="err_zip" class="form-error hidden"><i class="fas fa-exclamation-circle"></i> Code postal : 5 chiffres uniquement</div>
          </div>
        </div>
        <div>
          <label class="form-label">Pays</label>
          <input type="text" id="ship_country" value="${checkoutData.country || 'Maroc'}" class="form-input">
        </div>
        <div>
          <label class="form-label">Notes</label>
          <textarea id="ship_notes" rows="2" class="form-input resize-none">${checkoutData.notes || ''}</textarea>
        </div>
      </div>
      <div class="flex gap-3 mt-6">
        <button onclick="goCheckoutStep(2)" class="btn-luxury px-6 py-3 border-2 text-sm rounded-xl"
                style="background:transparent;border-color:var(--border-md);">Retour</button>
        <button onclick="validateAndNextCheckout(3)" class="btn-luxury btn-luxury-gold flex-1 py-4">Continuer</button>
      </div>
    </div>`;
  }
  if (step === 4) {
    return `
      <div class="checkout-panel">
        <h2><span class="step-icon"><i class="fas fa-list-check"></i></span>Récapitulatif</h2>
        <div class="space-y-4 mb-6">
          <div class="p-4 rounded-xl border" style="background:var(--bg-warm);">
            <p><strong>${checkoutData.firstName} ${checkoutData.lastName}</strong><br>${checkoutData.email}<br>${checkoutData.phone}</p>
          </div>
          <div class="p-4 rounded-xl border" style="background:var(--bg-warm);">
            <p>${checkoutData.street}, ${checkoutData.zipCode} ${checkoutData.city}<br>${checkoutData.country || 'Maroc'}</p>
          </div>
          <div class="p-4 rounded-xl border">
            <p class="font-semibold">Articles :</p>
            ${cart.items.map(item => `<div>${item.product?.name} ×${item.quantity} : ${formatPrice(item.priceAtTime * item.quantity)}</div>`).join('')}
            <hr class="my-2">
            <div class="font-bold">Total : ${formatPrice(total)}</div>
          </div>
        </div>
        <div class="flex gap-3">
          <button onclick="goCheckoutStep(3)" class="btn-luxury px-6 py-3 border-2 text-sm rounded-xl">Retour</button>
          <button onclick="goCheckoutStep(5)" class="btn-luxury btn-luxury-gold flex-1 py-4">Procéder au paiement</button>
        </div>
      </div>`;
  }
  // Step 5: Paiement
  // Step 5: Paiement
return `
  <div class="checkout-panel">
    <h2><span class="step-icon"><i class="fas fa-credit-card"></i></span>Paiement sécurisé</h2>
    <div class="space-y-4 mb-6">
      <div class="space-y-3">
        <!-- Option Carte bancaire (logos à droite) -->
        <label class="payment-method-card flex items-center justify-between p-3 border rounded-xl cursor-pointer hover:bg-amber-50 transition">
          <div class="flex items-center gap-3">
            <input type="radio" name="payMethod" value="card" checked class="w-4 h-4 accent-amber-700">
            <span class="text-sm font-medium">Carte bancaire</span>
          </div>
          <div class="flex items-center gap-2">
            <i class="fab fa-cc-visa text-2xl text-blue-800"></i>
            <i class="fab fa-cc-mastercard text-2xl text-red-600"></i>
            <i class="fab fa-cc-amex text-2xl text-cyan-700"></i>
          </div>
        </label>
        <!-- Option Paiement à la livraison (icône camion à droite) -->
        <label class="payment-method-card flex items-center justify-between p-3 border rounded-xl cursor-pointer hover:bg-amber-50 transition">
          <div class="flex items-center gap-3">
            <input type="radio" name="payMethod" value="cod" class="w-4 h-4 accent-amber-700">
            <span class="text-sm font-medium">Paiement à la livraison (espèces / carte à la livraison)</span>
          </div>
          <div class="flex items-center gap-2">
            <i class="fas fa-truck text-xl text-amber-600"></i>
          </div>
        </label>
      </div>
      <div id="cardFields">
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 text-xs text-amber-800">
          <strong>Mode démo :</strong> Utilisez n’importe quelle carte (simulation).
        </div>
        <div>
          <label class="form-label">Titulaire</label>
          <input id="cardName" class="form-input" placeholder="Fatima Alami" value="Fatima Alami">
        </div>
        <div>
          <label class="form-label">Numéro de carte</label>
          <input id="cardNumber" class="form-input" placeholder="1234 5678 9012 3456" maxlength="19" oninput="formatCardNumber(this)">
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="form-label">Expiration (MM/AA)</label>
            <input id="cardExpiry" class="form-input" placeholder="MM/AA" maxlength="5" oninput="formatExpiry(this)">
          </div>
          <div>
            <label class="form-label">CVV</label>
            <input id="cardCvv" class="form-input" placeholder="123" maxlength="3 " pattern="\\d*" inputmode="numeric"
                   oninput="this.value = this.value.replace(/\\D/g, '').slice(0,4)">
          </div>
        </div>
      </div>
    </div>
    <div class="flex gap-3">
      <button onclick="goCheckoutStep(4)" class="btn-luxury px-6 py-3 border-2 text-sm rounded-xl">Retour</button>
      <button onclick="placeOrder()" id="placeOrderBtn" class="btn-luxury btn-luxury-gold flex-1 py-4">Confirmer et payer ${formatPrice(total)}</button>
    </div>
  </div>`;
}

function goCheckoutStep(n) {
  checkoutStep = n;
  renderCheckoutStep();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateAndNextCheckout(step) {
  let valid = true;
  if (step === 2) {
    const fn = document.getElementById('info_firstName')?.value.trim();
    const ln = document.getElementById('info_lastName')?.value.trim();
    const em = document.getElementById('info_email')?.value.trim();
    const ph = document.getElementById('info_phone')?.value.trim();

    if (!fn) { document.getElementById('err_firstName').classList.remove('hidden'); valid = false; }
    else document.getElementById('err_firstName').classList.add('hidden');

    if (!ln) { document.getElementById('err_lastName').classList.remove('hidden'); valid = false; }
    else document.getElementById('err_lastName').classList.add('hidden');

    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { document.getElementById('err_email').classList.remove('hidden'); valid = false; }
    else document.getElementById('err_email').classList.add('hidden');

    // Validation téléphone (format marocain)
    const phoneRegex = /^(?:(?:\+|00)212|0)?[5-7]\d{8}$/;
    const phoneOk = phoneRegex.test(ph.replace(/\s/g, ''));
    if (!ph || !phoneOk) {
      document.getElementById('err_phone').classList.remove('hidden');
      valid = false;
    } else {
      document.getElementById('err_phone').classList.add('hidden');
    }

    if (valid) {
      checkoutData = { ...checkoutData, firstName: fn, lastName: ln, email: em, phone: ph };
      goCheckoutStep(3);
    }
  }

  if (step === 3) {
  const street = document.getElementById('ship_street')?.value.trim();
  const city = document.getElementById('ship_city')?.value;      // pour un select
  const zip = document.getElementById('ship_zip')?.value.trim();

  if (!street) {
    document.getElementById('err_street').classList.remove('hidden');
    valid = false;
  } else {
    document.getElementById('err_street').classList.add('hidden');
  }

  if (!city || city === "") {
    document.getElementById('err_city').classList.remove('hidden');
    valid = false;
  } else {
    document.getElementById('err_city').classList.add('hidden');
  }

  const zipOk = /^\d{5}$/.test(zip);   // exactement 5 chiffres
  if (!zip || !zipOk) {
    document.getElementById('err_zip').classList.remove('hidden');
    valid = false;
  } else {
    document.getElementById('err_zip').classList.add('hidden');
  }

  if (valid) {
    checkoutData = {
      ...checkoutData,
      street,
      city,
      zipCode: zip,
      country: document.getElementById('ship_country')?.value || 'Maroc',
      notes: document.getElementById('ship_notes')?.value || '',
    };
    goCheckoutStep(4);
  }
}
}

function formatCardNumber(input) {
  let val = input.value.replace(/\s/g, '').replace(/[^0-9]/g, '');
  input.value = (val.match(/.{1,4}/g)?.join(' ') || val).substring(0, 19);
}

function formatExpiry(input) {
  let val = input.value.replace(/[^0-9]/g, '');
  if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2);
  input.value = val.substring(0, 5);
}

async function placeOrder() {
  const btn = document.getElementById('placeOrderBtn');
  const payMethod = document.querySelector('input[name="payMethod"]:checked')?.value || 'card';

  if (payMethod === 'card') {
    const cardName   = document.getElementById('cardName')?.value.trim();
    const cardNumber = document.getElementById('cardNumber')?.value.replace(/\s/g, '');
    const cardExpiry = document.getElementById('cardExpiry')?.value.trim();
    const cardCvv    = document.getElementById('cardCvv')?.value.trim();
    if (!cardName) { showToast('Saisissez le nom du titulaire', 'error'); return; }
    if (!cardNumber || cardNumber.length < 16) { showToast('Numéro de carte invalide', 'error'); return; }
    if (!cardExpiry || cardExpiry.length < 5) { showToast('Date d\'expiration invalide', 'error'); return; }
    if (!cardCvv || cardCvv.length < 3) { showToast('CVV invalide', 'error'); return; }
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>';
  }

  // Simuler un délai
  await new Promise(resolve => setTimeout(resolve, 1500));

  const orderNumber = 'ELX-' + Date.now().toString().slice(-8);
  const total = Store.state.cart.subtotal + (Store.state.cart.subtotal >= 500 ? 0 : 50);

  
const user = Store.state.user;
if (!user || !user.email) {
  showToast('Vous devez être connecté pour commander', 'error');
  if (btn) btn.disabled = false;
  return;
}

const paymentStatus = payMethod === 'cod' ? 'pending' : 'paid';

const order = {
  id: Date.now(),
  orderNumber: 'ELX-' + Date.now().toString().slice(-8),
  createdAt: new Date().toISOString(),
  totalAmount: total,
  subtotal: Store.state.cart.subtotal,
  shippingCost: Store.state.cart.subtotal >= 500 ? 0 : 50,
  discountAmount: 0,
  status: 'confirmed',          
  paymentStatus: paymentStatus,
  userId: user.id,                      
  items: Store.state.cart.items.map(item => ({
    productName: item.product?.name,
    productSku: item.id,
    quantity: item.quantity,
    unitPrice: item.priceAtTime,
    totalPrice: item.priceAtTime * item.quantity,
    productImage: item.product?.image,
  })),
  shippingAddress: {
    firstName: checkoutData.firstName || user.firstName,
    lastName:  checkoutData.lastName  || user.lastName,
    email:     user.email,              // ← FORCÉ (pas checkoutData.email)
    street: checkoutData.street,
    city: checkoutData.city,
    zipCode: checkoutData.zipCode,
    country: checkoutData.country || 'Maroc',
    phone: checkoutData.phone,
  },
  paymentMethod: payMethod,
};

  // Sauvegarder dans localStorage (simulation)

  const orders = JSON.parse(localStorage.getItem('elixir_orders') || '[]');
  orders.unshift(order);   // ← ajoute la nouvelle commande au début
  localStorage.setItem('elixir_orders', JSON.stringify(orders));
  

  // Vider le panier
  Store.state.cart = { items: [], subtotal: 0, itemCount: 0 };
  if (typeof saveCartToLocal === 'function') saveCartToLocal();
  updateCartUI();

  // Afficher la confirmation
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="max-w-lg mx-auto px-4 py-20 text-center">
      <div class="success-circle mx-auto mb-6"><i class="fas fa-check text-3xl text-white"></i></div>
      <h1 class="font-serif text-3xl font-bold mb-3" style="color:var(--text)">Commande confirmée ! 🎉</h1>
      <p class="mb-2" style="color:var(--text-muted)">Merci pour votre achat, ${checkoutData.firstName || Store.state.user?.firstName}!</p>
      <p class="text-lg font-bold price-main mb-2">${orderNumber}</p>
      <p class="text-sm mb-8" style="color:var(--text-muted)">Un email de confirmation a été envoyé à ${checkoutData.email || Store.state.user?.email}</p>
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <button onclick="navigate('orders')" class="btn-luxury btn-luxury-gold">Mes commandes</button>
        <button onclick="navigate('catalogue')" class="btn-luxury px-6 py-3 border-2 text-sm rounded-xl"
                style="background:transparent;color:var(--text);border-color:var(--border-md);">
          Continuer mes achats
        </button>
      </div>
    </div>`;
}


/* ─── ORDERS ─────────────────────────────────────────────── */
async function renderOrders() {
  if (!Store.isAuthenticated()) { navigate('login'); return; }
  const user = Store.state.user;
  const userEmail = user?.email;
  const userId = user?.id;

  let orders = [];
  try {
    const saved = localStorage.getItem('elixir_orders');
    if (saved) {
      const allOrders = JSON.parse(saved);
      orders = allOrders.filter(order =>
        order.shippingAddress?.email === userEmail ||
        order.userId === userId
      );
    }
  } catch(e) { console.error('Erreur lecture commandes:', e); }

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="max-w-4xl mx-auto px-4 py-10">
      <div class="flex items-center justify-between mb-10">
        <div>
          <h1 class="font-serif text-2xl font-bold" style="color:var(--text)">Mes Commandes</h1>
          <p class="text-xs mt-1" style="color:var(--text-muted)">${orders.length} commande${orders.length !== 1 ? 's' : ''}</p>
        </div>
        <button onclick="navigate('catalogue')" class="btn-luxury btn-luxury-gold text-sm px-5 py-2.5">
          <i class="fas fa-gem mr-1.5 text-xs"></i>Continuer mes achats
        </button>
      </div>
      ${orders.length === 0 ? `
        <div class="text-center py-20 bg-white rounded-2xl border" style="border-color:var(--border);">
          <i class="fas fa-box text-4xl mb-4" style="color:var(--border-md)"></i>
          <h3 class="font-semibold mb-2" style="color:var(--text)">Aucune commande</h3>
          <p class="text-sm mb-6" style="color:var(--text-muted)">Vous n'avez pas encore passé de commande</p>
          <button onclick="navigate('catalogue')" class="btn-luxury btn-luxury-gold px-6 py-2.5 text-sm">
            Découvrir nos produits
          </button>
        </div>` : `
        <div class="space-y-4">
          ${orders.map(order => `
            <div class="bg-white rounded-2xl border shadow-sm overflow-hidden" style="border-color:var(--border);">
              <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border-b gap-3" style="border-color:var(--bg-warm);">
                <div>
                  <p class="font-bold" style="color:var(--text)">${order.orderNumber}</p>
                  <p class="text-xs mt-0.5" style="color:var(--text-muted)">${formatDate(order.createdAt)}</p>
                </div>
                <div class="flex items-center gap-2 flex-wrap">
                  ${getStatusBadge(order.status)}
                  ${getPaymentBadge(order.paymentStatus)}
                  <span class="font-bold price-main">${formatPrice(order.totalAmount)}</span>
                </div>
              </div>
              <div class="px-5 py-4 flex items-center gap-4">
                <div class="flex -space-x-2">
                  ${order.items.slice(0,3).map(item => `
                    <div class="w-10 h-10 rounded-xl overflow-hidden border-2 border-white shadow-sm" style="background:var(--bg-warm);">
                      <img src="${item.productImage || 'https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=40'}"
                           class="w-full h-full object-cover" loading="lazy">
                    </div>`).join('')}
                  ${order.items.length > 3 ? `<div class="w-10 h-10 rounded-xl border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold" style="background:var(--bg-warm);color:var(--text-muted)">+${order.items.length-3}</div>` : ''}
                </div>
                <div class="flex-1">
                  <p class="text-sm font-medium" style="color:var(--text)">${order.items[0].productName}${order.items.length > 1 ? ` +${order.items.length-1}` : ''}</p>
                  <p class="text-xs" style="color:var(--text-muted)">${order.items.reduce((s, i) => s + i.quantity, 0)} article${order.items.reduce((s,i) => s + i.quantity, 0) > 1 ? 's' : ''}</p>
                </div>
                <button onclick="navigate('order',{id:'${order.id}'})"
                        class="px-4 py-2 text-xs font-semibold rounded-xl transition-colors" style="color:var(--primary);"
                        onmouseover="this.style.background='var(--bg-warm)'" onmouseout="this.style.background=''">
                  Détails <i class="fas fa-chevron-right ml-1 text-xs"></i>
                </button>
              </div>
            </div>`).join('')}
        </div>`}
    </div>`;
}
async function renderOrderDetail(params = {}) {
  if (!Store.isAuthenticated()) { navigate('login'); return; }
  
  const orderId = parseInt(params.id);
  if (isNaN(orderId)) {
    showToast('Commande invalide', 'error');
    navigate('orders');
    return;
  }

  let orders = [];
  try {
    const saved = localStorage.getItem('elixir_orders');
    if (saved) orders = JSON.parse(saved);
  } catch(e) { console.error(e); }
  
  const order = orders.find(o => o.id === orderId);
  if (!order) {
    showToast('Commande non trouvée', 'error');
    navigate('orders');
    return;
  }

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="max-w-4xl mx-auto px-4 py-10">
      <div class="flex items-center gap-3 mb-10">
        <button onclick="navigate('orders')"
                class="w-9 h-9 rounded-xl bg-white border flex items-center justify-center transition-all hover:-translate-y-0.5"
                style="border-color:var(--border-md);color:var(--text-muted);">
          <i class="fas fa-arrow-left text-sm"></i>
        </button>
        <div>
          <h1 class="font-serif text-2xl font-bold" style="color:var(--text)">${order.orderNumber}</h1>
          <p class="text-xs" style="color:var(--text-muted)">${formatDate(order.createdAt)}</p>
        </div>
        <div class="ml-auto flex gap-2">${getStatusBadge(order.status)}${getPaymentBadge(order.paymentStatus)}</div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="md:col-span-2 bg-white rounded-2xl border shadow-sm overflow-hidden" style="border-color:var(--border);">
          <div class="p-5 border-b" style="border-color:var(--bg-warm);"><h2 class="font-semibold" style="color:var(--text)">Articles (${order.items.length})</h2></div>
          <div class="divide-y" style="border-color:var(--bg-warm);">
            ${order.items.map(item=>`
              <div class="flex gap-4 p-5">
                <div class="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style="background:var(--bg-warm);">
                  <img src="${item.productImage||'https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=64'}"
                       class="w-full h-full object-cover" loading="lazy">
                </div>
                <div class="flex-1">
                  <p class="font-semibold" style="color:var(--text)">${item.productName}</p>
                  <p class="text-xs font-mono mt-0.5" style="color:var(--text-muted)">SKU: ${item.productSku}</p>
                  <p class="text-sm mt-1" style="color:var(--text-muted)">Qté: ${item.quantity} × ${formatPrice(item.unitPrice)}</p>
                </div>
                <div class="font-bold price-main">${formatPrice(item.totalPrice)}</div>
              </div>`).join('')}
          </div>
        </div>
        <div class="bg-white rounded-2xl border shadow-sm p-6" style="border-color:var(--border);">
          <h2 class="font-semibold mb-4" style="color:var(--text)">Récapitulatif</h2>
          <div class="space-y-2.5 text-sm">
            <div class="flex justify-between"><span style="color:var(--text-muted)">Sous-total</span><span>${formatPrice(order.subtotal)}</span></div>
            <div class="flex justify-between"><span style="color:var(--text-muted)">Livraison</span><span>${order.shippingCost===0?'Gratuite':formatPrice(order.shippingCost)}</span></div>
            ${order.discountAmount>0 ? `<div class="flex justify-between text-emerald-600"><span>Réduction</span><span>-${formatPrice(order.discountAmount)}</span></div>` : ''}
            <div class="border-t pt-2.5 flex justify-between font-bold text-base" style="border-color:var(--border);">
              <span>Total</span><span class="price-main">${formatPrice(order.totalAmount)}</span>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-2xl border shadow-sm p-6" style="border-color:var(--border);">
          <h2 class="font-semibold mb-4" style="color:var(--text)">Adresse de livraison</h2>
          <div class="text-sm space-y-1" style="color:var(--text-muted)">
            <p class="font-semibold" style="color:var(--text)">${order.shippingAddress.firstName} ${order.shippingAddress.lastName}</p>
            <p>${order.shippingAddress.street}</p>
            <p>${order.shippingAddress.zipCode} ${order.shippingAddress.city}</p>
            <p>${order.shippingAddress.country}</p>
            ${order.shippingAddress.phone ? `<p><i class="fas fa-phone text-xs mr-1"></i>${order.shippingAddress.phone}</p>` : ''}
          </div>
        </div>
      </div>
      ${['pending','processing'].includes(order.status) ? `
        <div class="mt-6 flex justify-end">
          <button onclick="localCancelOrder('${order.id}')"
                  class="px-6 py-3 border-2 border-red-200 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors flex items-center gap-2">
            <i class="fas fa-times"></i> Annuler la commande
          </button>
        </div>` : ''}
    </div>`;
}

// Fonction d'annulation locale (car plus d'API)
function localCancelOrder(orderId) {
  if (!confirm('Confirmer l\'annulation de cette commande ?')) return;
  let orders = JSON.parse(localStorage.getItem('elixir_orders') || '[]');
  const index = orders.findIndex(o => o.id == orderId);
  if (index !== -1) {
    orders[index].status = 'cancelled';
    localStorage.setItem('elixir_orders', JSON.stringify(orders));
    showToast('Commande annulée', 'success');
    navigate('order', { id: orderId });
  } else {
    showToast('Commande introuvable', 'error');
  }
}

async function cancelOrder(orderId) {
  if (!confirm('Confirmer l\'annulation de cette commande ?')) return;
  const res = await API.post(`/orders/${orderId}/cancel`, {}, true);
  if (res.success) { showToast('Commande annulée', 'success'); navigate('order', { id: orderId }); }
  else showToast(res.error, 'error');
}

/* ─── AUTH PAGES ────────────────────────────────────────── */
async function renderLogin() {
  if (Store.isAuthenticated()) { navigate('home'); return; }
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center py-16 px-4" style="background:var(--bg-warm);">
      <div class="w-full max-w-md">
        <div class="bg-white rounded-3xl shadow-xl border overflow-hidden" style="border-color:var(--border);">
          <div class="p-8 text-white text-center" style="background:linear-gradient(135deg,var(--primary-dk),var(--primary));">
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                 style="background:rgba(212,169,106,0.2);border:1px solid rgba(212,169,106,0.3);">
              <i class="fas fa-gem text-2xl" style="color:var(--accent)"></i>
            </div>
            <h1 class="font-serif text-2xl font-bold">Bon retour !</h1>
            <p class="text-sm mt-1" style="color:rgba(255,255,255,0.7)">Connectez-vous à votre compte Élixir</p>
          </div>
          <div class="p-8">
            <div class="rounded-2xl p-4 mb-6 border" style="background:var(--bg-warm);border-color:var(--border);">
              <p class="text-xs font-bold uppercase tracking-wider mb-3" style="color:var(--text-muted)">Comptes de démonstration</p>
              <div class="space-y-2">
                <button onclick="fillLogin('admin@boutique.com','admin123')"
                        class="w-full text-left text-xs bg-white rounded-xl px-3 py-2.5 transition-colors flex items-center gap-2 border"
                        style="border-color:var(--border);" onmouseover="this.style.background='var(--bg-warm)'" onmouseout="this.style.background='#fff'">
                  <i class="fas fa-shield-alt text-purple-500 w-4 text-xs"></i>
                  <span><strong style="color:var(--text)">Admin:</strong> <span style="color:var(--text-muted)">admin@boutique.com / admin123</span></span>
                </button>
                <button onclick="fillLogin('alice@example.com','user123')"
                        class="w-full text-left text-xs bg-white rounded-xl px-3 py-2.5 transition-colors flex items-center gap-2 border"
                        style="border-color:var(--border);" onmouseover="this.style.background='var(--bg-warm)'" onmouseout="this.style.background='#fff'">
                  <i class="fas fa-user text-xs" style="color:var(--primary);width:1rem;"></i>
                  <span><strong style="color:var(--text)">Utilisateur:</strong> <span style="color:var(--text-muted)">alice@example.com / user123</span></span>
                </button>
              </div>
            </div>
            <form id="loginForm" onsubmit="handleLogin(event)" class="space-y-4">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-2" style="color:var(--text-muted)">Email</label>
                <input id="loginEmail" type="email" placeholder="votre@email.com" required class="form-input" autocomplete="email">
              </div>
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="text-xs font-bold uppercase tracking-wider" style="color:var(--text-muted)">Mot de passe</label>
                  <button type="button" onclick="showForgotPassword()" class="forgot-password-link">Oublié ?</button>
                </div>
                <div class="relative">
                  <input id="loginPassword" type="password" placeholder="••••••••" required class="form-input pr-10" autocomplete="current-password">
                  <button type="button" onclick="togglePassVis('loginPassword','loginPassIcon')" tabindex="-1"
                          class="absolute right-3 top-1/2 -translate-y-1/2" style="color:var(--text-muted)">
                    <i id="loginPassIcon" class="fas fa-eye text-sm"></i>
                  </button>
                </div>
              </div>
              <button type="submit" id="loginBtn" class="btn-luxury btn-luxury-gold w-full py-3.5 text-sm mt-2">
                Se connecter
              </button>
            </form>
            <p class="text-center mt-5 text-sm" style="color:var(--text-muted)">
              Pas de compte ?
              <button onclick="navigate('register')" class="font-semibold hover:underline ml-1" style="color:var(--primary)">
                S'inscrire gratuitement
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>`;
}

function fillLogin(email, password) {
  document.getElementById('loginEmail').value    = email;
  document.getElementById('loginPassword').value = password;
}
async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block" style="animation:spin 0.9s linear infinite;"></div>';
  const res = await API.post('/auth/login', {
    email:    document.getElementById('loginEmail').value,
    password: document.getElementById('loginPassword').value,
  });
  btn.disabled = false;
  btn.innerHTML = 'Se connecter';
  if (res.success) {
    Store.setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
    showToast(res.message || 'Connecté avec succès ✨', 'success');
    navigate('home');
  } else {
    showToast(res.error || 'Email ou mot de passe incorrect', 'error');
  }
}

async function renderRegister() {
  if (Store.isAuthenticated()) { navigate('home'); return; }
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center py-16 px-4" style="background:var(--bg-warm);">
      <div class="w-full max-w-md">
        <div class="bg-white rounded-3xl shadow-xl border overflow-hidden" style="border-color:var(--border);">
          <div class="p-8 text-white text-center" style="background:linear-gradient(135deg,var(--primary-dk),var(--primary));">
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                 style="background:rgba(212,169,106,0.2);border:1px solid rgba(212,169,106,0.3);">
              <i class="fas fa-user-plus text-2xl" style="color:var(--accent)"></i>
            </div>
            <h1 class="font-serif text-2xl font-bold">Créer un compte</h1>
            <p class="text-sm mt-1" style="color:rgba(255,255,255,0.7)">Rejoignez la communauté Élixir Boutique</p>
          </div>
          <div class="p-8">
            <form id="registerForm" onsubmit="handleRegister(event)" class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider mb-2" style="color:var(--text-muted)">Prénom *</label>
                  <input id="regFirstName" type="text" placeholder="Fatima" required class="form-input" autocomplete="given-name">
                </div>
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider mb-2" style="color:var(--text-muted)">Nom *</label>
                  <input id="regLastName" type="text" placeholder="Alami" required class="form-input" autocomplete="family-name">
                </div>
              </div>
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-2" style="color:var(--text-muted)">Email *</label>
                <input id="regEmail" type="email" placeholder="vous@email.ma" required class="form-input" autocomplete="email"
                       oninput="this.classList.toggle('valid', /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(this.value))">
              </div>
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-2" style="color:var(--text-muted)">Mot de passe *</label>
                <div class="relative">
                  <input id="regPassword" type="password" placeholder="Minimum 8 caractères" required minlength="8" class="form-input pr-10" autocomplete="new-password"
                         oninput="updatePasswordStrength(this)">
                  <button type="button" onclick="togglePassVis('regPassword','regPassIcon')" tabindex="-1"
                          class="absolute right-3 top-1/2 -translate-y-1/2" style="color:var(--text-muted)">
                    <i id="regPassIcon" class="fas fa-eye text-sm"></i>
                  </button>
                </div>
                <div class="password-strength mt-2"><div id="gatePassStrengthBar" class="password-strength-bar" style="width:0%"></div></div>
              </div>
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-2" style="color:var(--text-muted)">Confirmer mot de passe *</label>
                <input id="regPassword2" type="password" placeholder="Répétez votre mot de passe" required class="form-input" autocomplete="new-password">
              </div>
              <label class="flex items-start gap-2 text-xs" style="color:var(--text-muted)">
                <input type="checkbox" required class="mt-0.5 rounded" style="accent-color:var(--primary);">
                <span>J'accepte les <a href="#" class="hover:underline font-medium" style="color:var(--primary)">conditions d'utilisation</a> et la 
                <a href="#" class="hover:underline font-medium" style="color:var(--primary)">politique de confidentialité</a></span>
              </label>
              <button type="submit" id="registerBtn" class="btn-luxury btn-luxury-gold w-full py-3.5 text-sm">
                Créer mon compte
              </button>
            </form>
            <p class="text-center mt-5 text-sm" style="color:var(--text-muted)">
              Déjà un compte ?
              <button onclick="navigate('login')" class="font-semibold hover:underline ml-1" style="color:var(--primary)">
                Se connecter
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>`;
}

async function handleRegister(e) {
  e.preventDefault();
  const pwd1 = document.getElementById('regPassword')?.value;
  const pwd2 = document.getElementById('regPassword2')?.value;
  if (pwd1 !== pwd2) { showToast('Les mots de passe ne correspondent pas', 'error'); return; }
  
  const btn = document.getElementById('registerBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block" style="animation:spin 0.9s linear infinite;"></div>';
  const res = await API.post('/auth/register', {
    firstName: document.getElementById('regFirstName').value,
    lastName:  document.getElementById('regLastName').value,
    email:     document.getElementById('regEmail').value,
    password:  pwd1,
  });
  btn.disabled = false;
  btn.innerHTML = 'Créer mon compte';
  if (res.success) {
    Store.setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
    showToast(res.message || 'Compte créé avec succès ! 🎉', 'success');
    navigate('home');
  } else {
    showToast(res.error || "Erreur lors de l'inscription", 'error');
  }
}

/* ─── PROFILE ────────────────────────────────────────────── */
async function renderProfile() {
  if (!Store.isAuthenticated()) { navigate('login'); return; }
  const res  = await API.get('/auth/me', true);
  const user = res.data || Store.state.user;
  const app  = document.getElementById('app');
  app.innerHTML = `
    <div class="max-w-2xl mx-auto px-4 py-10">
      <h1 class="font-serif text-2xl font-bold mb-8" style="color:var(--text)">Mon Profil</h1>
      <div class="bg-white rounded-3xl border shadow-sm overflow-hidden" style="border-color:var(--border);">
        <div class="p-8 text-white text-center" style="background:linear-gradient(135deg,var(--primary-dk),var(--primary));">
          <div class="w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden border-4 border-white/20">
            <div class="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
                 style="background:rgba(255,255,255,0.15);">
              ${user.firstName[0]}${user.lastName[0]}
            </div>
          </div>
          <h2 class="font-serif text-xl font-bold">${user.firstName} ${user.lastName}</h2>
          <p class="text-sm" style="color:rgba(255,255,255,0.7)">${user.email}</p>
          <span class="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold"
                style="background:rgba(212,169,106,0.2);color:var(--accent);">
            ${user.role==='admin'?'👑 Administrateur':'✨ Membre Élixir'}
          </span>
        </div>
        <div class="p-8">
          <form onsubmit="updateProfile(event)" class="space-y-4 mb-6">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-2" style="color:var(--text-muted)">Prénom</label>
                <input id="profFirstName" type="text" value="${user.firstName}" class="form-input">
              </div>
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-2" style="color:var(--text-muted)">Nom</label>
                <input id="profLastName" type="text" value="${user.lastName}" class="form-input">
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider mb-2" style="color:var(--text-muted)">Email</label>
              <input type="email" value="${user.email}" disabled
                     class="form-input" style="background:var(--bg-warm);cursor:not-allowed;opacity:0.6;">
            </div>
            <button type="submit" class="btn-luxury btn-luxury-gold text-sm px-6 py-2.5">
              <i class="fas fa-save mr-2"></i>Mettre à jour
            </button>
          </form>
          <hr class="my-6" style="border-color:var(--border);">
          <div class="flex flex-wrap gap-3">
            <button onclick="navigate('orders')"
                    class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors" style="background:#eff6ff;color:#3b82f6;">
              <i class="fas fa-box"></i> Mes commandes
            </button>
            <button onclick="navigate('favorites')"
                    class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors" style="background:#fff1f2;color:#ef4444;">
              <i class="fas fa-heart"></i> Mes favoris (${Store.state.favorites.length})
            </button>
            <button onclick="navigate('wishlist')"
                    class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors" style="background:var(--bg-warm);color:var(--primary);">
              <i class="fas fa-star"></i> Liste de souhaits
            </button>
            ${user.role==='admin' ? `
              <button onclick="navigate('admin')"
                      class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold" style="background:#f5f3ff;color:#7c3aed;">
                <i class="fas fa-shield-alt"></i> Dashboard Admin
              </button>` : ''}
          </div>
          <hr class="my-6" style="border-color:var(--border);">
          <div class="flex items-center justify-between">
            <span class="text-xs" style="color:var(--text-muted)">Membre depuis le ${formatDate(user.createdAt)}</span>
            <button onclick="logout()"
                    class="flex items-center gap-2 px-4 py-2 text-xs text-red-500 rounded-xl transition-colors hover:bg-red-50">
              <i class="fas fa-sign-out-alt"></i> Déconnexion
            </button>
          </div>
        </div>
      </div>
    </div>`;
}

async function updateProfile(e) {
  e.preventDefault();
  const res = await API.patch('/auth/me', {
    firstName: document.getElementById('profFirstName').value,
    lastName:  document.getElementById('profLastName').value,
  }, true);
  if (res.success) {
    Store.state.user = { ...Store.state.user, ...res.data };
    Store.save();
    updateAuthUI();
    showToast('Profil mis à jour ✅', 'success');
  } else showToast(res.error, 'error');
}

/* ─── WISHLIST ────────────────────────────────────────────── */
async function renderWishlist() {
  if (!Store.isAuthenticated()) { navigate('login'); return; }
  await loadWishlist();
  const wishlist = Store.state.wishlist;
  const app      = document.getElementById('app');
  app.innerHTML = `
    <div class="max-w-5xl mx-auto px-4 py-10">
      <h1 class="font-serif text-2xl font-bold mb-8 flex items-center gap-3" style="color:var(--text)">
        <i class="fas fa-star" style="color:var(--accent)"></i> Liste de souhaits
        <span class="text-sm font-normal" style="color:var(--text-muted)">(${wishlist.length})</span>
      </h1>
      ${wishlist.length===0 ? `
        <div class="favorites-empty">
          <i class="fas fa-star text-4xl mb-4" style="color:var(--border-md)"></i>
          <h3 class="font-semibold mb-2" style="color:var(--text)">Votre liste est vide</h3>
          <p class="text-sm mb-6" style="color:var(--text-muted)">Ajoutez des produits à votre liste de souhaits</p>
          <button onclick="navigate('catalogue')" class="btn-luxury btn-luxury-gold text-sm px-6 py-2.5">
            Explorer le catalogue
          </button>
        </div>` : `
        <div class="catalogue-grid">
          ${wishlist.map(item => item.product ? renderProductCardBoutique(item.product) : '').join('')}
        </div>`}
    </div>`;
}

/* ─── FAVORITES PAGE ─────────────────────────────────────── */
async function renderFavorites() {
  if (!Store.isAuthenticated()) { navigate('login'); return; }
  const app  = document.getElementById('app');
  const favIds = Store.state.favorites;
  
  // Gather all beauty products that are favorited
  const allBeautyProds = Object.values(BEAUTY_CATEGORIES).flatMap(cat => 
    cat.products.map(p => ({ ...p, category: cat }))
  );
  const favProds = allBeautyProds.filter(p => favIds.includes(p.id));

  app.innerHTML = `
    <div class="max-w-5xl mx-auto px-4 py-10">
      <div class="flex items-center justify-between mb-8">
        <h1 class="font-serif text-2xl font-bold flex items-center gap-3" style="color:var(--text)">
          <i class="fas fa-heart text-red-400"></i> Mes Favoris
          <span class="text-sm font-normal" style="color:var(--text-muted)">(${favProds.length})</span>
        </h1>
        ${favProds.length > 0 ? `
          <button onclick="clearAllFavorites()" class="text-sm text-red-500 hover:underline">
            <i class="fas fa-trash-alt mr-1"></i>Tout effacer
          </button>` : ''}
      </div>
      ${favProds.length === 0 ? `
        <div class="favorites-empty">
          <i class="fas fa-heart text-5xl mb-4 text-red-200"></i>
          <h3 class="font-semibold text-xl mb-2" style="color:var(--text)">Aucun favori</h3>
          <p class="text-sm mb-6" style="color:var(--text-muted)">
            Cliquez sur le cœur <i class="fas fa-heart text-red-300"></i> sur les produits pour les ajouter ici.
          </p>
          <button onclick="navigate('catalogue')" class="btn-luxury btn-luxury-gold text-sm px-6 py-2.5">
            <i class="fas fa-gem mr-2"></i>Explorer le catalogue
          </button>
        </div>` : `
        <div class="catalogue-grid">
          ${favProds.map(p => renderBeautyProductCard(p, p.category)).join('')}
        </div>`}
    </div>`;
}

function clearAllFavorites() {
  if (!confirm('Supprimer tous vos favoris ?')) return;
  Store.state.favorites = [];
  Store.save();
  updateFavoritesUI();
  showToast('Favoris effacés', 'info');
  renderFavorites();
}

/* ─── ADMIN ──────────────────────────────────────────────── */
async function renderAdmin() {
  if (!Store.isAdmin()) { navigate('home'); return; }

  // 1. Lire les commandes depuis localStorage
  let orders = [];
  try {
    const saved = localStorage.getItem('elixir_orders');
    if (saved) orders = JSON.parse(saved);
  } catch(e) { console.error(e); }

  // 2. Calculs réels
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // 3. Compter les produits (Beauté)
  let beautyCount = 0;
  for (const cat of Object.values(BEAUTY_CATEGORIES)) {
    beautyCount += cat.products.length;
  }
  // Pour les parfums, soit vous fixez une valeur, soit vous appelez l’API
  let perfumeCount = 0;
  try {
    const res = await fetch('/api/perfumes/categories');
    const data = await res.json();
    if (data.success) {
      perfumeCount = data.data.reduce((sum, cat) => sum + (cat.productCount || 0), 0);
    }
  } catch(e) { perfumeCount = 24; } // valeur par défaut (ajustez)
  const totalProducts = beautyCount + perfumeCount;

  // 4. Utilisateurs uniques
  const emails = new Set();
  orders.forEach(o => {
    if (o.shippingAddress?.email) emails.add(o.shippingAddress.email);
  });
  if (Store.state.user?.email) emails.add(Store.state.user.email);
  const totalUsers = emails.size || 1;

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 py-10">
      <div class="flex items-center justify-between mb-10">
        <div>
          <h1 class="font-serif text-2xl font-bold flex items-center gap-3" style="color:var(--text)">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:linear-gradient(135deg,#7c3aed,#4f46e5);">
              <i class="fas fa-shield-alt text-white text-sm"></i>
            </div>
            Dashboard Admin
          </h1>
          <p class="text-xs mt-1" style="color:var(--text-muted)">Vue d'ensemble de la boutique</p>
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
        ${[
          {l:'Revenus', v: formatPrice(totalRevenue), ic:'fa-euro-sign', color:'#059669', bg:'#ecfdf5'},
          {l:'Commandes', v: totalOrders, ic:'fa-shopping-bag', color:'#2563eb', bg:'#eff6ff'},
          {l:'Produits', v: totalProducts, ic:'fa-box', color:'#7c3aed', bg:'#f5f3ff'},
          {l:'Utilisateurs', v: totalUsers, ic:'fa-users', color:'#d97706', bg:'#fffbeb'},
        ].map(kpi => `
          <div class="bg-white rounded-2xl border shadow-sm p-5" style="border-color:var(--border);">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold uppercase tracking-wider" style="color:var(--text-muted)">${kpi.l}</span>
              <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background:${kpi.bg};">
                <i class="fas ${kpi.ic} text-sm" style="color:${kpi.color};"></i>
              </div>
            </div>
            <p class="text-2xl font-bold" style="color:var(--text)">${kpi.v}</p>
          </div>`).join('')}
      </div>
      <div class="bg-white rounded-2xl border shadow-sm p-6" style="border-color:var(--border);">
        <h2 class="font-semibold mb-4" style="color:var(--text)">Informations</h2>
        <p class="text-sm" style="color:var(--text-muted)">Tableau de bord en temps réel. Les données sont basées sur vos commandes et produits enregistrés.</p>
        <div class="mt-4 flex gap-3 flex-wrap">
          <button onclick="showAPIDoc()" class="btn-luxury btn-luxury-gold text-xs px-4 py-2">
  <i class="fas fa-code mr-1"></i> Documentation API
</button>
<button onclick="checkHealth()" class="px-4 py-2 text-xs font-semibold rounded-xl text-emerald-700 transition-colors" style="background:#ecfdf5;" onmouseover="this.style.background='#dcfce7'" onmouseout="this.style.background='#ecfdf5'">
  <i class="fas fa-heartbeat mr-1"></i> Health Check
</button>
        </div>
      </div>
    </div>
  `;
}



/* ─── 404 ────────────────────────────────────────────────── */
function render404() {
  document.getElementById('app').innerHTML = `
    <div class="max-w-lg mx-auto px-4 py-24 text-center">
      <p class="font-serif text-8xl font-bold mb-4" style="color:var(--border)">404</p>
      <h2 class="font-serif text-2xl font-bold mb-3" style="color:var(--text)">Page introuvable</h2>
      <p class="mb-8" style="color:var(--text-muted)">La page que vous cherchez n'existe pas.</p>
      <button onclick="navigate('home')" class="btn-luxury btn-luxury-gold">
        Retour à l'accueil
      </button>
    </div>`;
}

/* ─── LOGOUT ─────────────────────────────────────────────── */
async function logout() {
  await API.post('/auth/logout', {}, true).catch(()=>{});
  Store.clearAuth();
  showToast('Déconnecté avec succès', 'info');
  navigate('home');
}


/* ─── BEAUTY CATALOGUE ──────────────────────────────────── */
const BEAUTY_CATEGORIES = {
  maquillage: {
    id: 'maquillage', name: 'Maquillage', open: true,
    description: 'Sublimez votre regard et votre teint avec notre collection de maquillage haut de gamme',
    icon: 'fa-palette',
    gradient: 'from-rose-900 to-pink-800',
    imageUrl: 'https://images.pexels.com/photos/2253834/pexels-photo-2253834.jpeg?auto=compress&cs=tinysrgb&w=1200',
    products: [
      { id:'maq-1', sku:'REF-COS-00001', name:'Rouge à Lèvres Velours Ruby', price:280, compareAtPrice:350, volume:'3.5g', desc:'Rouge intense et longue tenue, formule végane enrichie en vitamine E pour des lèvres parfaitement hydratées.', badge:'Bestseller', rating:4.8, reviewCount:234, imageUrl:'https://images.pexels.com/photos/2533266/pexels-photo-2533266.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', stock:28 },
      { id:'maq-2', sku:'REF-COS-00002', name:'Fond de Teint Lumineuse Dorée', price:420, compareAtPrice:520, volume:'30ml', desc:'Fond de teint couvrance modulable avec éclat doré naturel, SPF 15 et formule enrichie en acide hyaluronique.', badge:'Nouveau', rating:4.7, reviewCount:156, imageUrl:'https://images.pexels.com/photos/8981524/pexels-photo-8981524.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', stock:15 },
      { id:'maq-3', sku:'REF-COS-00003', name:'Palette Yeux Or et Bronze', price:350, volume:'12 teintes', desc:'12 teintes fusionnées or, bronze et cuivre pour un regard envoûtant. Pigmentation intense et tenue 16h.', badge:'Exclusif', rating:4.9, reviewCount:312, imageUrl:'https://images.pexels.com/photos/2639947/pexels-photo-2639947.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', stock:20 },
      { id:'maq-4', sku:'REF-COS-00004', name:'Mascara Volume Extrême Noir', price:195, compareAtPrice:240, volume:'8ml', desc:'Mascara volumisant et allongeant jusqu\'à 4x le volume naturel. Tenue 24h, sans paquet, waterproof.', badge:'Bestseller', rating:4.6, reviewCount:445, imageUrl:'https://images.pexels.com/photos/2688992/pexels-photo-2688992.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', stock:50 },
      { id:'maq-5', sku:'REF-COS-00005', name:'Highlighter Nacré Champagne', price:260, volume:'8g', desc:'Enlumineur poudre aux reflets nacrés champagne pour un glow naturel et lunaire parfait en toute saison.', rating:4.5, reviewCount:189, imageUrl:'https://images.pexels.com/photos/36701026/pexels-photo-36701026.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', stock:35 },
      { id:'maq-6', sku:'REF-COS-00006', name:'Blush Pêche Rosée', price:220, compareAtPrice:280, volume:'5g', desc:'Blush satiné aux teintes pêche et rose corail pour bonne mine toute la journée. Formule légère et naturelle.', badge:'Nouveau', rating:4.7, reviewCount:167, imageUrl:'https://images.pexels.com/photos/31251105/pexels-photo-31251105.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', stock:30 },
      { id:'maq-7', sku:'REF-COS-00007', name:'Eyeliner Précision Noir Intense', price:165, volume:'0.5ml', desc:'Eyeliner feutre ultra-précis pour un trait parfait. Séchage instantané, tenue waterproof 24h même par temps chaud.', badge:'Bestseller', rating:4.8, reviewCount:523, imageUrl:'https://images.pexels.com/photos/2697787/pexels-photo-2697787.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', stock:45 },
      { id:'maq-8', sku:'REF-COS-00008', name:'Bronzer Soleil du Maroc', price:290, volume:'10g', desc:'Bronzer satinée aux arômes d\'argan marocain pour un teint hâlé naturel et un effet bonne mine instantané.', badge:'Exclusif', rating:4.6, reviewCount:203, imageUrl:'https://images.pexels.com/photos/354962/pexels-photo-354962.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', stock:18 },
      { id:'maq-9', sku:'REF-COS-00009', name:'Gloss Lips Diamond Rose', price:185, compareAtPrice:230, volume:'5ml', desc:'Gloss brillant effet volumateur avec des particules diamantées pour des lèvres pulpeuses et lumineuses.', rating:4.4, reviewCount:134, imageUrl:'https://images.pexels.com/photos/6867202/pexels-photo-6867202.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', stock:22 },
    ]
  },
  skincare: {
    id: 'skincare', name: 'Skincare', open: true,
    description: 'Révélez l\'éclat naturel de votre peau avec nos soins visage et corps premium certifiés',
    icon: 'fa-leaf',
    gradient: 'from-emerald-900 to-teal-800',
    imageUrl: 'https://images.pexels.com/photos/29745246/pexels-photo-29745246.jpeg?auto=compress&cs=tinysrgb&w=1200',
    products: [
      { id:'skin-1', sku:'REF-COS-00101', name:'Sérum Vitamine C Illuminant', price:590, compareAtPrice:720, volume:'30ml', desc:'Sérum concentré en vitamine C pure à 20% pour éclat et fermeté. Réduit les taches et illumine en 14 jours.', badge:'Bestseller', rating:4.9, reviewCount:389, imageUrl:'https://images.pexels.com/photos/27768597/pexels-photo-27768597.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', stock:12 },
      { id:'skin-2', sku:'REF-COS-00102', name:'Crème Hydratante Argan Premium', price:450, volume:'50ml', desc:'Crème riche à l\'huile d\'argan bio du Maroc, hydratation 48h et protection antioxydante pour toutes peaux.', badge:'Exclusif', rating:4.8, reviewCount:267, imageUrl:'https://images.pexels.com/photos/4850697/pexels-photo-4850697.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', stock:20 },
      { id:'skin-3', sku:'REF-COS-00103', name:'Masque Or 24 Carats Anti-Âge', price:680, compareAtPrice:850, volume:'75ml', desc:'Masque luxueux aux particules d\'or véritable, repulpant et lumineux. Résultats visibles dès la première application.', badge:'Exclusif', rating:4.7, reviewCount:198, imageUrl:'https://images.pexels.com/photos/31552022/pexels-photo-31552022.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', stock:8 },
      { id:'skin-4', sku:'REF-COS-00104', name:'Huile Corps Rose de Damas', price:520, volume:'100ml', desc:'Huile sèche à la rose de Damas 100% pure, peau soyeuse et délicatement parfumée. Non grasse, absorption rapide.', badge:'Nouveau', rating:4.8, reviewCount:312, imageUrl:'https://images.pexels.com/photos/4041235/pexels-photo-4041235.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', stock:25 },
      { id:'skin-5', sku:'REF-COS-00105', name:'Eau Micellaire Pure Douceur', price:180, compareAtPrice:220, volume:'200ml', desc:'Nettoyant doux sans rinçage, démaquille yeux et visage en une seule passe. Formule douce pour peaux sensibles.', badge:'Bestseller', rating:4.6, reviewCount:445, imageUrl:'https://images.pexels.com/photos/27357176/pexels-photo-27357176.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', stock:40 },
      { id:'skin-6', sku:'REF-COS-00106', name:'Tonique Fleur d\'Oranger', price:240, volume:'150ml', desc:'Tonique floral à l\'eau de fleur d\'oranger bio du Maroc, pore-resserrant, équilibrant et hydratant.', rating:4.5, reviewCount:234, imageUrl:'https://images.pexels.com/photos/31552021/pexels-photo-31552021.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', stock:32 },
      { id:'skin-7', sku:'REF-COS-00107', name:'Exfoliant Sucre de Canne Maroc', price:320, compareAtPrice:390, volume:'200g', desc:'Gommage corps au sucre de canne et huile d\'amande douce, peau veloutée et régénérée après chaque utilisation.', badge:'Nouveau', rating:4.7, reviewCount:167, imageUrl:'https://images.pexels.com/photos/7796223/pexels-photo-7796223.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', stock:28 },
      { id:'skin-8', sku:'REF-COS-00108', name:'Crème Contour Yeux Peptides', price:750, volume:'15ml', desc:'Soin contour yeux aux peptides et rétinol, anti-cernes et anti-rides. Résultats visibles en 4 semaines.', badge:'Exclusif', rating:4.9, reviewCount:156, imageUrl:'https://images.pexels.com/photos/13006769/pexels-photo-13006769.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', stock:10 },
      { id:'skin-9', sku:'REF-COS-00109', name:'Beurre de Karité Nourrissant', price:290, volume:'150ml', desc:'Beurre de karité pur et bio du Burkina Faso, nutrition intense pour peaux très sèches et corps entier.', rating:4.4, reviewCount:289, imageUrl:'https://images.pexels.com/photos/36898545/pexels-photo-36898545.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', stock:35 },
    ]
  },
  accessoires: {
    id: 'accessoires', name: 'Accessoires', open: true,
    description: 'Complétez votre look avec nos accessoires de mode et de beauté soigneusement sélectionnés',
    icon: 'fa-gem',
    gradient: 'from-amber-900 to-yellow-800',
    imageUrl: 'https://images.pexels.com/photos/7130023/pexels-photo-7130023.jpeg?auto=compress&cs=tinysrgb&w=1200',
    products: [
      { id:'acc-1', sku:'REF-COS-00201', name:'Sac Vanity Cuir Camel', price:890, compareAtPrice:1100, volume:'25cm', desc:'Sac vanity en cuir véritable camel, compartiments multiples et fermeture dorée. Parfait pour voyage et quotidien.', badge:'Bestseller', rating:4.9, reviewCount:189, imageUrl:'https://images.pexels.com/photos/8154651/pexels-photo-8154651.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', stock:7 },
      { id:'acc-2', sku:'REF-COS-00202', name:'Miroir de Poche Doré', price:280, volume:'10cm', desc:'Miroir compact double face grossissant x5, cadre doré ciselé à la main. Idéal pour retouche maquillage.', badge:'Exclusif', rating:4.7, reviewCount:234, imageUrl:'https://images.pexels.com/photos/11495792/pexels-photo-11495792.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', stock:18 },
      { id:'acc-3', sku:'REF-COS-00203', name:'Pinceau Kabuki Professionnel', price:350, compareAtPrice:430, volume:'1 pièce', desc:'Pinceau kabuki poils synthétiques haute densité pour application fond de teint et poudre comme un pro.', badge:'Bestseller', rating:4.8, reviewCount:312, imageUrl:'https://images.pexels.com/photos/29588090/pexels-photo-29588090.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', stock:22 },
      { id:'acc-4', sku:'REF-COS-00204', name:'Trousse Maquillage Luxe Or', price:520, volume:'30×20cm', desc:'Trousse en simili-cuir or avec organiseur intégré pour pinceaux, produits et accessoires de beauté.', badge:'Nouveau', rating:4.6, reviewCount:167, imageUrl:'https://images.pexels.com/photos/1326716/pexels-photo-1326716.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', stock:15 },
      { id:'acc-5', sku:'REF-COS-00205', name:'Bracelet Argent Charms Beauté', price:680, volume:'19cm', desc:'Bracelet argent 925 avec charms beauté émail, livré dans coffret cadeau luxueux. Taille ajustable.', badge:'Exclusif', rating:4.9, reviewCount:145, imageUrl:'https://images.pexels.com/photos/12026055/pexels-photo-12026055.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', stock:9 },
      { id:'acc-6', sku:'REF-COS-00206', name:'Coffret Cadeau Luxe Premium', price:1200, compareAtPrice:1500, volume:'Set complet', desc:'Coffret cadeau complet incluant rouge à lèvres, crème argan et sérum vitamine C dans un écrin prestige.', badge:'Exclusif', rating:4.8, reviewCount:98, imageUrl:'https://images.pexels.com/photos/29611436/pexels-photo-29611436.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', stock:5 },
      { id:'acc-7', sku:'REF-COS-00207', name:'Pince à Cheveux Nacrée Luxe', price:195, volume:'1 pièce', desc:'Pince claw en acétate nacré large et résistante pour tous types de cheveux. Design élégant et tendance.', badge:'Nouveau', rating:4.5, reviewCount:203, imageUrl:'https://images.pexels.com/photos/29579399/pexels-photo-29579399.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', stock:40 },
      { id:'acc-8', sku:'REF-COS-00208', name:'Bague Ajustable Dorée', price:420, volume:'Taille unique', desc:'Bague ajustable plaqué or 18 carats, motif floral ciselé, hypoallergénique. Idéale comme cadeau de luxe.', rating:4.7, reviewCount:178, imageUrl:'https://images.pexels.com/photos/5737277/pexels-photo-5737277.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', stock:25 },
      { id:'acc-9', sku:'REF-COS-00209', name:'Parfumeur de Sac Fleur d\'Orient', price:150, volume:'10ml', desc:'Roller solide à la fleur d\'oranger marocaine, glisse sans tacher le sac. Parfum délicat et longue tenue.', badge:'Bestseller', rating:4.6, reviewCount:267, imageUrl:'https://images.pexels.com/photos/4938275/pexels-photo-4938275.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop', stock:55 },
    ]
  }
};

async function renderParfumsIfReady(params) {
  if (typeof renderParfums === 'function') {
    await renderParfums(params);
  } else {
    await renderBeautyCatalogue(params);
  }
}

async function renderBeautyCatalogue(params = {}) {
  await showRegisterGate();
  const app = document.getElementById('app');
  const catId = params.category || null;
  const cat = catId && BEAUTY_CATEGORIES[catId] ? BEAUTY_CATEGORIES[catId] : null;

  if (catId && ['signature','femme','homme','unisex'].includes(catId)) {
    await renderParfumsIfReady({ category: catId });
    return;
  }

  const allBeautyCats = Object.values(BEAUTY_CATEGORIES);
  const displayCats = cat ? [cat] : allBeautyCats;

  let parfumCategories = [];
  try {
    const r = await fetch('/api/perfumes/categories').then(r=>r.json());
    if (r.success) parfumCategories = r.data;
  } catch(e){}

  app.innerHTML = `
    <!-- Hero Banner -->
    <section style="background:linear-gradient(135deg,var(--primary-dk),var(--primary));min-height:300px;display:flex;align-items:center;" class="relative overflow-hidden">
      <div class="absolute inset-0 pointer-events-none">
        <div style="position:absolute;top:-50%;right:-10%;width:500px;height:500px;opacity:0.12;background:radial-gradient(circle,var(--accent),transparent);border-radius:50%;"></div>
      </div>
      <div class="relative max-w-7xl mx-auto px-4 py-14 w-full">
        <div class="text-center">
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-5"
               style="background:rgba(212,169,106,0.18);color:var(--accent-lt);border:1px solid rgba(212,169,106,0.3);">
            <i class="fas fa-gem"></i> Catalogue Beauté Luxe
          </div>
          <h1 class="font-serif text-3xl md:text-5xl font-bold text-white mb-4">
            ${cat ? cat.name : 'Toute la Beauté Luxueuse'}
          </h1>
          <p class="text-sm max-w-xl mx-auto" style="color:rgba(255,255,255,0.65)">
            ${cat ? cat.description : 'Parfums, maquillage, skincare et accessoires — une sélection premium pour sublimer votre beauté au Maroc'}
          </p>
          <div class="flex flex-wrap justify-center gap-2 mt-7">
            <button onclick="navigate('catalogue')" class="filter-tag ${!catId ? 'active' : ''}">
              <i class="fas fa-th text-xs"></i> Toutes
            </button>
            <button onclick="navigate('parfums')" class="filter-tag">
              <i class="fas fa-spray-can text-xs"></i> Parfums
            </button>
            ${Object.values(BEAUTY_CATEGORIES).map(c=>`
              <button onclick="navigate('catalogue',{category:'${c.id}'})"
                      class="filter-tag ${catId===c.id?'active':''}">
                <i class="fas ${c.icon} text-xs"></i> ${c.name}
              </button>`).join('')}
          </div>
        </div>
      </div>
    </section>

    ${!cat && parfumCategories.length ? `
    <section class="max-w-7xl mx-auto px-4 py-12">
      <div class="flex items-center justify-between mb-6">
        <div>
          <p class="section-subtitle mb-1">Parfums</p>
          <h2 class="section-title text-2xl" style="color:var(--text)">Collections de Fragrances</h2>
        </div>
        <button onclick="navigate('parfums')" class="btn-underline flex items-center gap-1.5">
          Voir tout <i class="fas fa-arrow-right text-xs"></i>
        </button>
      </div>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        ${parfumCategories.slice(0,4).map(c=>`
          <button onclick="navigate('parfums',{category:'${c.id}'})"
                  class="group relative overflow-hidden rounded-2xl transition-all hover:-translate-y-2 hover:shadow-xl" style="aspect-ratio:1/1;">
            <img src="${c.imageUrl}" alt="${c.name}" loading="lazy"
                 class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                 onerror="this.src='https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=400'">
            <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(92,51,23,0.85),transparent);"></div>
            <div style="position:absolute;bottom:0;left:0;right:0;padding:1rem;">
              <p class="text-white font-semibold text-sm">${c.name}</p>
              <p style="color:rgba(255,255,255,0.55)" class="text-xs">${c.productCount} parfums</p>
            </div>
          </button>`).join('')}
      </div>
    </section>` : ''}

    <div class="max-w-7xl mx-auto px-4 pb-16">
      ${displayCats.map(category => `
        <section class="mb-10" id="bcat-${category.id}">
          <div class="cat-banner mb-0 cursor-pointer" onclick="toggleBeautyCat('${category.id}')">
            <div class="relative overflow-hidden rounded-2xl" style="min-height:160px;">
              <img src="${category.imageUrl}" alt="${category.name}" loading="lazy"
                   class="absolute inset-0 w-full h-full object-cover"
                   onerror="this.style.display='none'">
              <div class="absolute inset-0 bg-gradient-to-r ${category.gradient} opacity-85"></div>
              <div class="relative flex items-center justify-between px-6 sm:px-8 py-8 md:py-10">
                <div class="text-white flex items-center gap-4">
                  <div class="w-12 h-12 rounded-2xl flex items-center justify-center border flex-shrink-0"
                       style="background:rgba(255,255,255,0.12);border-color:rgba(255,255,255,0.2);">
                    <i class="fas ${category.icon} text-lg" style="color:var(--accent-lt)"></i>
                  </div>
                  <div>
                    <p style="color:var(--accent-lt);" class="text-xs font-bold uppercase tracking-widest mb-1">${category.products.length} produits</p>
                    <h2 class="font-serif text-2xl md:text-3xl font-bold">${category.name}</h2>
                    <p class="text-sm mt-1 hidden md:block" style="color:rgba(255,255,255,0.65)">${category.description}</p>
                  </div>
                </div>
                <div class="cat-toggle-btn flex-shrink-0" id="toggle-icon-${category.id}">
                  <i class="fas fa-chevron-up"></i>
                </div>
              </div>
            </div>
          </div>
          <div class="cat-products-wrap" id="catgrid-${category.id}">
            <div class="catalogue-grid pt-6 pb-2">
              ${category.products.slice(0,9).map(p => renderBeautyProductCard(p, category)).join('')}
            </div>
          </div>
        </section>`).join('')}
    </div>
  `;
  initScrollReveal();
  displayCats.forEach(cat => {
    const wrap = document.getElementById('catgrid-' + cat.id);
    if (wrap) {
      if (cat.open) {
        wrap.style.maxHeight = wrap.scrollHeight + 'px';
        wrap.classList.add('open');
      } else {
        wrap.style.maxHeight = '0';
      }
    }
  });
}

function renderBeautyProductCard(product, category) {
  const discount = product.compareAtPrice ? Math.round((1-product.price/product.compareAtPrice)*100) : 0;
  const isFav = Store.isFavorite(product.id);
  const sku = product.sku || `REF-COS-${product.id?.replace(/\D/g,'').padStart(5,'0')}`;
  const stockLabel = product.stock > 10 ? '' : product.stock > 0 ? `<span class="badge badge-edition">${product.stock} restants</span>` : '<span class="badge" style="background:#57534e;color:#fff;">Épuisé</span>';
  const badgeMap = { Bestseller:'badge-bestseller', Exclusif:'badge-exclusif', Nouveau:'badge-nouveau', 'Édition Limitée':'badge-edition' };
  return `
    <article class="product-card group">
      <div class="card-img-wrap">
        <img src="${product.imageUrl}" alt="${product.name}" loading="lazy"
             onerror="this.src='https://images.pexels.com/photos/28752010/pexels-photo-28752010.jpeg?auto=compress&cs=tinysrgb&w=300'">
        <div class="card-overlay">
          <button onclick="event.stopPropagation(); addBeautyToCart('${product.id}', '${category.id}')"
                  class="w-full py-2.5 rounded-xl text-xs font-bold text-white"
                  style="background:linear-gradient(135deg,var(--primary-lt),var(--primary));">
            <i class="fas fa-shopping-bag mr-1.5"></i> Ajouter au panier
          </button>
        </div>
        <div class="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          ${product.badge ? `<span class="badge ${badgeMap[product.badge]||'badge'}">${product.badge}</span>` : ''}
          ${discount > 0 ? `<span class="badge badge-sale">-${discount}%</span>` : ''}
          ${stockLabel}
        </div>
        <div class="absolute top-2.5 right-2.5">
          <span class="bg-white/90 backdrop-blur-sm text-xs font-semibold px-2 py-1 rounded-full shadow-sm" style="color:var(--text-muted)">${product.volume}</span>
        </div>
        <!-- Favorite button -->
        <button onclick="event.stopPropagation(); toggleLocalFavorite('${product.id}', this)"
                class="wishlist-btn ${isFav ? 'active' : ''}" title="Ajouter aux favoris"
                style="${isFav ? 'color:#ef4444;' : ''}">
          <i class="fas fa-heart text-xs"></i>
        </button>
      </div>
      <div class="p-4 flex flex-col flex-1">
        <p class="text-xs font-mono mb-0.5" style="color:var(--text-muted)">${sku}</p>
        <p class="text-xs font-semibold uppercase tracking-wider mb-1" style="color:var(--primary)">${category.name}</p>
        <h3 class="font-semibold text-sm leading-snug mb-1 line-clamp-2" style="color:var(--text)">${product.name}</h3>
        ${product.desc ? `<p class="text-xs leading-relaxed mb-2 line-clamp-2" style="color:var(--text-muted)">${product.desc}</p>` : ''}
        <div class="flex items-center gap-1.5 mb-3">
          <div class="flex gap-0.5">${renderStarsSmall(product.rating)}</div>
          <span class="text-xs" style="color:var(--text-muted)">(${product.reviewCount})</span>
        </div>
        <div class="flex items-center justify-between mt-auto pt-3 border-t" style="border-color:var(--border);">
          <div>
            <span class="price-main text-base font-bold">${formatPrice(product.price)}</span>
            ${product.compareAtPrice ? `<span class="price-strike text-xs ml-1">${formatPrice(product.compareAtPrice)}</span>` : ''}
          </div>
          <button onclick="event.stopPropagation(); addBeautyToCart('${product.id}', '${category.id}')"
                  class="w-9 h-9 rounded-xl text-white flex items-center justify-center transition-all hover:-translate-y-0.5 shadow-sm"
                  style="background:linear-gradient(135deg,var(--primary-lt),var(--primary));">
            <i class="fas fa-plus text-xs"></i>
          </button>
        </div>
      </div>
    </article>`;
}

function addBeautyToCart(productId, categoryId) {
  if (!Store.isAuthenticated()) {
    showToast('Connectez-vous pour ajouter au panier', 'info');
    navigate('login');
    return;
  }
  const cat = BEAUTY_CATEGORIES[categoryId];
  const product = cat ? cat.products.find(p => p.id === productId) : null;
  if (!product) { showToast('Produit introuvable', 'error'); return; }
  
  // Prix par défaut si absent
  const price = product.price ?? 0;
  if (price <= 0) {
    console.warn('Prix manquant pour', product.name);
    showToast('Erreur : prix du produit non défini', 'error');
    return;
  }

  const existingItem = Store.state.cart.items.find(i => i.id === productId);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    Store.state.cart.items.push({
      id: productId,
      quantity: 1,
      priceAtTime: price,
      product: { name: product.name, image: product.imageUrl },
    });
  }
  Store.state.cart.itemCount = Store.state.cart.items.reduce((s, i) => s + i.quantity, 0);
  Store.state.cart.subtotal = Store.state.cart.items.reduce((s, i) => s + i.priceAtTime * i.quantity, 0);
  saveCartToLocal();   // ← bien sauvegarder
  updateCartUI();
  showToast(`✨ ${product.name} ajouté au panier`, 'success');
  toggleCart(true);
}

function toggleBeautyCat(catId) {
  const wrap = document.getElementById('catgrid-' + catId);
  const icon = document.getElementById('toggle-icon-' + catId);
  const cat  = BEAUTY_CATEGORIES[catId];
  if (!wrap) return;

  if (wrap.classList.contains('open')) {
    wrap.style.maxHeight = wrap.scrollHeight + 'px';
    requestAnimationFrame(() => { wrap.style.maxHeight = '0'; });
    wrap.classList.remove('open');
    if (cat) cat.open = false;
    if (icon) icon.innerHTML = '<i class="fas fa-chevron-down"></i>';
  } else {
    wrap.classList.add('open');
    wrap.style.maxHeight = wrap.scrollHeight + 'px';
    if (cat) cat.open = true;
    if (icon) icon.innerHTML = '<i class="fas fa-chevron-up"></i>';
    wrap.addEventListener('transitionend', function handler() {
      if (wrap.classList.contains('open')) wrap.style.maxHeight = 'none';
      wrap.removeEventListener('transitionend', handler);
    });
  }
}

/* ─── SCROLL REVEAL ──────────────────────────────────────── */
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal:not(.revealed)');
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.1 });
  els.forEach(el => obs.observe(el));
}

/* ─── INIT ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  Store.init();
  updateAuthUI();
  navigate('home');
  loadWishlistFromLocal();
});

// ─── MODALE POUR LES INFORMATIONS (FAQ, LIVRAISON, ETC.) ───
function showModal(title, content) {
  // Supprimer une éventuelle modale existante
  const existing = document.getElementById('dynamicModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'dynamicModal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
  modal.style.background = 'rgba(0,0,0,0.5)';
  modal.style.backdropFilter = 'blur(4px)';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" style="max-width: 500px;">
      <div class="flex items-center justify-between px-6 py-4 border-b border-stone-100">
        <h3 class="font-serif text-xl font-semibold text-stone-900">${title}</h3>
        <button onclick="document.getElementById('dynamicModal').remove()"
                class="text-stone-400 hover:text-stone-600 transition">
          <i class="fas fa-times text-lg"></i>
        </button>
      </div>
      <div class="p-6 text-stone-700 space-y-3">
        ${content}
      </div>
      <div class="px-6 py-4 bg-stone-50 flex justify-end">
        <button onclick="document.getElementById('dynamicModal').remove()"
                class="px-5 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg text-sm font-medium transition">
          Fermer ×
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// ─── GESTION DES LIENS DU FOOTER (AFFICHE UNE MODALE) ───
function showFooterInfo(type) {
  const contents = {
    faq: `
      <p><strong>❓ Questions fréquentes</strong></p>
      <ul class="list-disc pl-5 space-y-1 text-sm">
        <li>Livraison : 24–48h au Maroc (gratuite dès 500 MAD).</li>
        <li>Paiement : carte bancaire, paiement à la livraison.</li>
        <li>Retours : acceptés sous 14 jours en état d’origine.</li>
        <li>Service client : contact@elixir-boutique.ma ou formulaire.</li>
      </ul>
    `,
    livraison: `
      <p><strong>🚚 Livraison & Retours</strong></p>
      <p>Livraison offerte dès <strong>500 MAD</strong> (sinon 50 MAD). Délai : 24–48h au Maroc.</p>
      <p>Retours gratuits sous <strong>14 jours</strong> après réception. Remboursement effectué sous 5 jours ouvrés.</p>
      <p>Les marchandises doivent être retournées dans leur emballage d’origine, non utilisées.</p>
    `,
    suivi: `
      <p><strong>📦 Suivi de commande</strong></p>
      <p>Un email de confirmation vous est envoyé après chaque achat. Vous pouvez suivre votre commande directement dans votre espace <strong>“Mes Commandes”</strong> (connectez-vous à votre compte).</p>
      <p>Si vous n’avez pas reçu d’email, vérifiez vos spams ou contactez‑nous.</p>
    `,
    authenticite: `
      <p><strong>🔒 Garantie d’authenticité</strong></p>
      <p>Tous nos produits sont <strong>100% authentiques</strong>, sourcés directement auprès des marques ou de distributeurs agréés.</p>
      <p>Un certificat d’authenticité est disponible sur simple demande par email.</p>
    `,
    mentions: `
      <p><strong>📜 Mentions légales</strong></p>
      <p>Élixir Boutique – SARL au capital de 100 000 MAD<br>
      Siège : 123 Boulevard des Fragrances, Casablanca 20000, Maroc<br>
      RC : 123456 / IF : 987654321 / ICE : 001234567890123</p>
    `,
    confidentialite: `
      <p><strong>🔐 Confidentialité</strong></p>
      <p>Vos données personnelles sont utilisées exclusivement pour le traitement de vos commandes. Conformément à la loi 09-08, vous disposez d’un droit d’accès, de rectification et de suppression.</p>
    `,
    cgv: `
      <p><strong>📄 Conditions Générales de Vente</strong></p>
      <p>En passant commande, vous acceptez nos CGV. Prix en MAD TTC. Paiement exigible à la commande. La propriété des marchandises est conservée jusqu’au paiement complet.</p>
      <p>Les CGV complètes sont disponibles sur demande par email.</p>
    `
  };

  const titleMap = {
    faq: '❓ FAQ – Questions fréquentes',
    livraison: '🚚 Livraison & Retours',
    suivi: '📦 Suivi de commande',
    authenticite: '🔒 Authenticité garantie',
    mentions: '📜 Mentions légales',
    confidentialite: '🔐 Confidentialité',
    cgv: '📄 Conditions Générales de Vente'
  };

  const content = contents[type] || '<p>Information non disponible pour le moment.</p>';
  const title = titleMap[type] || 'Information';
  showModal(title, content);
}

async function submitNewsletter(event) {
  event.preventDefault();
  const email = event.target.querySelector('input[type="email"]')?.value.trim();
  if (!email || !/^[^\s@]+@[^\�@]+\.[^\s@]+$/.test(email)) {
    showToast('Veuillez entrer un email valide', 'error');
    return;
  }
  const formData = new FormData();
  formData.append('email', email);
  formData.append('_subject', 'Nouvel abonné newsletter Élixir');
  formData.append('_captcha', 'false');
  try {
    const response = await fetch('https://formsubmit.co/el/zebano', {
      method: 'POST',
      body: formData
    });
    if (response.ok) {
      showToast('✅ Merci ! Vous êtes inscrit(e) à la newsletter.', 'success');
      event.target.reset();
    } else {
      showToast('Erreur, réessayez plus tard.', 'error');
    }
  } catch (error) {
    showToast('Erreur réseau, réessayez.', 'error');
  }
}

// ─── AFFICHER LA DOCUMENTATION API (MODALE) ───────────────
async function showAPIDoc() {
  const endpoints = [
    { method: 'GET', path: '/api/health', desc: 'Vérifier l’état du serveur' },
    { method: 'GET', path: '/api/perfumes', desc: 'Liste des parfums' },
    { method: 'GET', path: '/api/perfumes/categories', desc: 'Catégories de parfums' },
    { method: 'GET', path: '/api/products', desc: 'Tous les produits (beauté)' },
    { method: 'GET', path: '/api/categories', desc: 'Catégories de produits' },
    { method: 'POST', path: '/api/auth/login', desc: 'Connexion utilisateur' },
    { method: 'POST', path: '/api/auth/register', desc: 'Inscription' },
    { method: 'GET', path: '/api/orders', desc: 'Commandes (auth requise)' },
    { method: 'POST', path: '/api/cart', desc: 'Ajouter au panier' },
  ];
  let html = '<div class="space-y-2 max-h-96 overflow-y-auto"><p class="text-sm font-semibold mb-2">📌 Endpoints disponibles :</p><ul class="list-disc pl-5 text-sm space-y-1">';
  endpoints.forEach(ep => {
    html += `<li><span class="font-mono font-bold">${ep.method}</span> <code class="bg-stone-100 px-1 rounded">${ep.path}</code><br><span class="text-stone-600 text-xs">${ep.desc}</span></li>`;
  });
  html += '</ul><p class="text-xs text-stone-500 mt-3">Tous les endpoints renvoient du JSON. Certains nécessitent un token JWT (Bearer).</p></div>';
  showModal('📘 Documentation API', html);
}

// ─── HEALTH CHECK (VÉRIFICATION DU SERVEUR) ──────────────
async function checkHealth() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    if (res.ok) {
      showModal('✅ Health Check', `
        <p><strong>Statut :</strong> ${data.status || 'OK'}</p>
        <p><strong>Timestamp :</strong> ${data.timestamp || new Date().toLocaleString()}</p>
        <p><strong>Version :</strong> ${data.version || '2.0.0'}</p>
        <p class="text-emerald-600 mt-2">Le serveur répond correctement.</p>
      `);
    } else {
      showModal('⚠️ Health Check', 'Erreur de connexion au serveur.', 'error');
    }
  } catch (err) {
    showModal('❌ Health Check', 'Impossible de joindre le serveur. Vérifiez que l’API est bien démarrée.', 'error');
  }
}