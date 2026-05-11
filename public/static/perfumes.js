// ============================================================
// ÉLIXIR BOUTIQUE — Catalogue Parfums
// Design: Clean, elegant, 3x3 grid per category
// ============================================================

// ─── HELPERS ─────────────────────────────────────────────────
function formatPriceMad(price) {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency', currency: 'MAD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(price);
}

function renderStarsPerfume(rating) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) html += '<i class="fas fa-star" style="color:#f59e0b;font-size:0.65rem;"></i>';
    else if (i - 0.5 <= rating)  html += '<i class="fas fa-star-half-alt" style="color:#f59e0b;font-size:0.65rem;"></i>';
    else                          html += '<i class="far fa-star" style="color:#e5e7eb;font-size:0.65rem;"></i>';
  }
  return html;
}

function getBadgeClass(badge) {
  const map = {
    'Bestseller':      'badge-bestseller',
    'Exclusif':        'badge-exclusif',
    'Nouveau':         'badge-nouveau',
    'Édition Limitée': 'badge-edition',
  };
  return map[badge] || 'badge';
}

// ─── PERFUME PRODUCT CARD (3x3 grid) ─────────────────────────
function PerfumeProductCard(product) {
  const discount = product.compareAtPrice
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : 0;
  const notesPreview = [
    ...(product.notes.top.slice(0, 1)),
    ...(product.notes.heart.slice(0, 1)),
    ...(product.notes.base.slice(0, 1)),
  ].join(' · ');

  return `
    <article class="product-card group" onclick="openPerfumeModal('${product.id}')" style="cursor:pointer;">
      <!-- Image Square -->
      <div class="card-img-wrap">
        <img src="${product.imageUrl}"
             alt="${product.name}"
             loading="lazy"
             onerror="this.src='https://images.pexels.com/photos/29255492/pexels-photo-29255492.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop'">

        <!-- Overlay on hover -->
        <div class="card-overlay">
          <p class="text-white/80 text-xs leading-relaxed mb-2.5">${notesPreview}</p>
          <button onclick="event.stopPropagation(); addToCart('${product.id}', 1, { price: ${product.price}, name: '${product.name.replace(/'/g, "\\'")}', image: '${product.imageUrl}' })"
                  class="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all"
                  style="background:linear-gradient(135deg,#b45309,#78350f);">
            <i class="fas fa-shopping-bag mr-1.5"></i> Ajouter au panier
          </button>
        </div>

        <!-- Badges -->
        <div class="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          ${product.badge ? `<span class="badge ${getBadgeClass(product.badge)}">${product.badge}</span>` : ''}
          ${discount > 0 ? `<span class="badge badge-sale">-${discount}%</span>` : ''}
        </div>

        <!-- Volume -->
        <div class="absolute top-2.5 right-2.5">
          <span class="bg-white/90 backdrop-blur-sm text-stone-700 text-xs font-semibold px-2 py-1 rounded-full shadow-sm">${product.volume}</span>
        </div>
      </div>

      <!-- Card Body -->
      <div class="p-4 flex flex-col flex-1">
        <p class="text-xs text-gold-700 font-semibold uppercase tracking-wider mb-1">${product.categoryId}</p>
        <h3 class="font-semibold text-stone-900 text-sm leading-snug mb-2 line-clamp-2" title="${product.name}">${product.name}</h3>

        <!-- Stars -->
        <div class="flex items-center gap-1.5 mb-3">
          <div class="flex gap-0.5">${renderStarsPerfume(product.rating)}</div>
          <span class="text-xs text-stone-400">(${product.reviewCount})</span>
        </div>

        <!-- Price + CTA -->
        <div class="flex items-center justify-between mt-auto pt-3 border-t border-stone-100">
          <div>
            <span class="price-main text-base font-bold">${formatPriceMad(product.price)}</span>
            ${product.compareAtPrice ? `<span class="price-strike text-xs ml-1">${formatPriceMad(product.compareAtPrice)}</span>` : ''}
          </div>
          <button onclick="event.stopPropagation(); addPerfumeToCart('${product.id}')"
                  class="w-9 h-9 rounded-xl text-white flex items-center justify-center transition-all hover:-translate-y-0.5 shadow-sm"
                  style="background:linear-gradient(135deg,#b45309,#78350f);">
            <i class="fas fa-plus text-xs"></i>
          </button>
        </div>
      </div>
    </article>`;
}

// ─── CATEGORY SECTION ────────────────────────────────────────
function PerfumeCategorySection(category, isOpen = false) {
  const gridId   = `pgrid-${category.id}`;
  const iconId   = `ptoggle-${category.id}`;
  const headerBg = {
    signature: 'from-amber-950 to-yellow-900',
    femme:     'from-rose-900 to-pink-700',
    homme:     'from-slate-900 to-indigo-900',
    unisex:    'from-emerald-900 to-teal-700',
  }[category.id] || 'from-stone-900 to-stone-700';

  return `
    <section class="mb-16" id="pcat-${category.id}">

      <!-- Category Banner -->
      <div class="cat-banner mb-8 overflow-hidden"
           onclick="togglePerfumeCat('${category.id}')">
        <div class="relative overflow-hidden rounded-2xl" style="min-height:180px;">
          <img src="${category.imageUrl}"
               alt="${category.name}"
               class="absolute inset-0 w-full h-full object-cover"
               onerror="this.style.display='none'">
          <div class="absolute inset-0 bg-gradient-to-r ${headerBg} opacity-85"></div>

          <div class="relative flex items-center justify-between px-8 py-10 md:py-12">
            <div class="text-white flex-1">
              <div class="flex items-center gap-4 mb-3">
                <div class="w-12 h-12 rounded-2xl flex items-center justify-center border"
                     style="background:rgba(255,255,255,0.12);border-color:rgba(255,255,255,0.2);">
                  <i class="${category.icon} text-amber-300 text-lg"></i>
                </div>
                <div>
                  <p class="text-amber-300/70 text-xs font-semibold uppercase tracking-widest mb-1">
                    ${category.products.length} fragrances
                  </p>
                  <h2 class="font-serif text-2xl md:text-3xl font-bold leading-tight">${category.name}</h2>
                </div>
              </div>
              <p class="text-white/65 text-sm max-w-lg leading-relaxed hidden md:block">
                ${category.description}
              </p>
            </div>

            <!-- Toggle Icon -->
            <div class="flex-shrink-0 ml-6">
              <div id="${iconId}"
                   class="w-12 h-12 rounded-full border flex items-center justify-center transition-transform duration-400 ${isOpen ? 'rotate-180' : ''}"
                   style="background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.2);">
                <i class="fas fa-chevron-down text-white/80 text-sm"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Products Grid 3×3 -->
      <div id="${gridId}" class="${isOpen ? '' : 'hidden'}">
        <div class="catalogue-grid">
          ${category.products.slice(0, 9).map(p => PerfumeProductCard(p)).join('')}
        </div>

        <!-- Category footer note -->
        <div class="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-amber-50 rounded-2xl border border-amber-100">
          <div class="flex items-center gap-2 text-sm text-stone-600">
            <i class="fas fa-certificate text-gold-700 flex-shrink-0"></i>
            <span>Tous nos parfums sont <strong>100% authentiques</strong> et expédiés sous 24–48h au Maroc</span>
          </div>
          <button onclick="scrollToPerfumeCategory(null)"
                  class="flex-shrink-0 btn-underline flex items-center gap-1.5 whitespace-nowrap">
            Voir toutes les collections <i class="fas fa-arrow-right text-xs"></i>
          </button>
        </div>
      </div>
    </section>`;
}

// ─── MAIN PAGE ────────────────────────────────────────────────
async function renderParfums(params = {}) {
  // Afficher modal inscription si pas encore inscrit
  if (typeof showRegisterGate === 'function') {
    await showRegisterGate();
  }

  const app = document.getElementById('app');

  // Loader
  app.innerHTML = `
    <div class="flex items-center justify-center py-32">
      <div class="text-center">
        <div class="w-12 h-12 rounded-full border-4 mx-auto mb-4"
             style="border-color:#b45309;border-top-color:transparent;animation:spin 0.9s linear infinite;"></div>
        <p class="text-sm text-gold-700 font-medium">Chargement du catalogue…</p>
      </div>
    </div>`;

  // Fetch categories
  let categories = [];
  try {
    const catsRes = await fetch('/api/perfumes/categories').then(r => r.json());
    if (catsRes.success) {
      const details = await Promise.all(
        catsRes.data.map(cat =>
          fetch(`/api/perfumes/categories/${cat.slug}`).then(r => r.json())
        )
      );
      categories = details.filter(r => r.success).map(r => r.data);
    }
  } catch (e) {
    console.error('Erreur chargement parfums:', e);
  }

  const activeCategory = params.category || null;
  const totalProducts  = categories.reduce((s, c) => s + (c.products?.length || 0), 0);

  app.innerHTML = `
    <!-- ══════════════════════════════════════════════════
         HERO
    ══════════════════════════════════════════════════ -->
    <section style="background:linear-gradient(135deg,#1c1917 0%,#292524 50%,#3c2a10 100%);min-height:340px;display:flex;align-items:center;" class="relative overflow-hidden">
      <div class="absolute inset-0 pointer-events-none overflow-hidden">
        <div class="absolute top-0 right-0 w-96 h-96 opacity-15 rounded-full"
             style="background:radial-gradient(circle,#b45309,transparent);transform:translate(25%,-25%);"></div>
        <div class="absolute bottom-0 left-0 w-72 h-72 opacity-15 rounded-full"
             style="background:radial-gradient(circle,#78350f,transparent);transform:translate(-25%,25%);"></div>
      </div>

      <div class="relative max-w-7xl mx-auto px-4 py-16 w-full">
        <div class="text-center max-w-3xl mx-auto">
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-6 border"
               style="background:rgba(180,83,9,0.15);color:#fbbf24;border-color:rgba(180,83,9,0.3);">
            <i class="fas fa-spray-can"></i>
            Catalogue Parfums Exclusifs
            <i class="fas fa-gem text-xs"></i>
          </div>
          <h1 class="font-serif text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            L'Art de la <span class="text-gold-gradient">Parfumerie</span>
          </h1>
          <p class="text-stone-400 text-base md:text-lg mb-8 leading-relaxed max-w-2xl mx-auto">
            Explorez nos ${totalProducts} fragrances exclusives réparties en ${categories.length} collections,
            créées par les plus grands maîtres parfumeurs du monde.
          </p>

          <!-- Stats -->
          <div class="flex flex-wrap justify-center gap-10 mb-8">
            ${[
              [totalProducts, 'Fragrances'],
              [categories.length, 'Collections'],
              ['100%', 'Authenticité'],
              ['24h', 'Livraison'],
            ].map(([v,l]) => `
              <div class="text-center">
                <p class="text-2xl font-bold text-amber-400">${v}</p>
                <p class="text-xs text-stone-500 uppercase tracking-wider mt-0.5">${l}</p>
              </div>`).join('')}
          </div>

          <!-- Category Nav Pills -->
          <div class="flex flex-wrap justify-center gap-2">
            <button onclick="scrollToPerfumeCategory(null)"
                    class="filter-tag ${!activeCategory ? 'active' : ''}">
              <i class="fas fa-th text-xs"></i> Toutes
            </button>
            ${categories.map(cat => `
              <button onclick="scrollToPerfumeCategory('${cat.id}')"
                      class="filter-tag ${activeCategory === cat.id ? 'active' : ''}">
                <i class="${cat.icon} text-xs"></i>
                ${cat.name.replace('Collection ', '').replace('Parfum ', '')}
              </button>`).join('')}
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════
         CATEGORY TILES (quick navigation)
    ══════════════════════════════════════════════════ -->
    <section class="max-w-7xl mx-auto px-4 py-10">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        ${categories.map(cat => `
          <button onclick="scrollToPerfumeCategory('${cat.id}')"
                  class="group relative overflow-hidden rounded-2xl cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl"
                  style="aspect-ratio:3/2;">
            <img src="${cat.imageUrl}" alt="${cat.name}"
                 class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                 onerror="this.style.display='none'">
            <div class="absolute inset-0"
                 style="background:linear-gradient(to top,rgba(0,0,0,0.8),rgba(0,0,0,0.25),transparent);"></div>
            <div class="absolute bottom-0 left-0 right-0 p-4 text-left">
              <i class="${cat.icon} text-amber-400 text-xs mb-1 block"></i>
              <p class="text-white font-semibold text-sm leading-tight">${cat.name}</p>
              <p class="text-white/50 text-xs mt-0.5">${cat.products?.length || 0} parfums</p>
            </div>
          </button>`).join('')}
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════
         COLLECTIONS (3×3 grid per category)
    ══════════════════════════════════════════════════ -->
    <div class="max-w-7xl mx-auto px-4 pb-16" id="perfumeCollections">
      ${categories.map((cat, idx) =>
          PerfumeCategorySection(cat, activeCategory === cat.id || (!activeCategory && idx === 0))
        ).join('')}
    </div>

    <!-- ══════════════════════════════════════════════════
         TRUST SECTION
    ══════════════════════════════════════════════════ -->
    <section class="py-14" style="background:linear-gradient(135deg,#1c1917,#292524);">
      <div class="max-w-7xl mx-auto px-4">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6 text-white text-center">
          ${[
            {ic:'fa-certificate',t:'Authenticité Garantie',s:'100% parfums originaux'},
            {ic:'fa-shipping-fast',t:'Livraison Express',s:'24h au Maroc'},
            {ic:'fa-gift',t:'Emballage Luxe',s:'Coffret cadeau offert'},
            {ic:'fa-undo',t:'Retours Faciles',s:'30 jours pour changer d\'avis'},
          ].map(item => `
            <div class="flex flex-col items-center gap-3">
              <div class="w-12 h-12 rounded-full flex items-center justify-center"
                   style="background:rgba(180,83,9,0.25);">
                <i class="fas ${item.ic} text-amber-400 text-lg"></i>
              </div>
              <div>
                <p class="font-semibold text-sm">${item.t}</p>
                <p class="text-stone-400 text-xs mt-0.5">${item.s}</p>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </section>`;

  // Scroll to active category
  if (activeCategory) {
    setTimeout(() => scrollToPerfumeCategory(activeCategory), 120);
  }
}

// ─── TOGGLE CATEGORY ─────────────────────────────────────────
function togglePerfumeCat(catId) {
  const grid = document.getElementById(`pgrid-${catId}`);
  const icon = document.getElementById(`ptoggle-${catId}`);
  if (!grid) return;
  const isHidden = grid.classList.contains('hidden');
  grid.classList.toggle('hidden', !isHidden);
  if (icon) icon.classList.toggle('rotate-180', isHidden);
}

// ─── SCROLL TO CATEGORY ──────────────────────────────────────
function scrollToPerfumeCategory(catId) {
  if (!catId) {
    // Expand all
    document.querySelectorAll('[id^="pgrid-"]').forEach(g => g.classList.remove('hidden'));
    document.querySelectorAll('[id^="ptoggle-"]').forEach(i => i.classList.add('rotate-180'));
    const col = document.getElementById('perfumeCollections');
    if (col) window.scrollTo({ top: col.offsetTop - 90, behavior: 'smooth' });
    return;
  }
  const grid = document.getElementById(`pgrid-${catId}`);
  if (grid) {
    grid.classList.remove('hidden');
    const icon = document.getElementById(`ptoggle-${catId}`);
    if (icon) icon.classList.add('rotate-180');
  }
  const section = document.getElementById(`pcat-${catId}`);
  if (section) {
    window.scrollTo({ top: section.offsetTop - 90, behavior: 'smooth' });
  }
}

// ─── PERFUME MODAL ────────────────────────────────────────────
function PerfumeProductModal(product) {
  const discount = product.compareAtPrice
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : 0;
  const similar = product.similar || [];

  return `
    <div id="perfumeModal"
         class="fixed inset-0 z-50 flex items-center justify-center p-4"
         style="background:rgba(0,0,0,0.6);backdrop-filter:blur(6px);animation:fadeIn 0.2s ease;"
         onclick="if(event.target===this)closePerfumeModal()">
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto modal-box">

        <!-- Modal Header -->
        <div class="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/95 backdrop-blur-sm border-b border-stone-100">
          <div class="flex items-center gap-2">
            <i class="fas fa-spray-can text-gold-700 text-sm"></i>
            <span class="text-sm font-semibold text-stone-600">Fiche Produit</span>
          </div>
          <button onclick="addToCart('${product.id}', 1, { price: ${product.price}, name: '${product.name.replace(/'/g, "\\'")}', image: '${product.imageUrl}' }); closePerfumeModal()"
                  class="w-9 h-9 bg-stone-100 hover:bg-stone-200 rounded-xl flex items-center justify-center transition-colors">
            <i class="fas fa-times text-stone-500 text-sm"></i>
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6">
          <!-- Image + Main Info -->
          <div class="flex flex-col sm:flex-row gap-6 mb-6">
            <div class="relative flex-shrink-0">
              <img src="${product.imageUrl}" alt="${product.name}"
                   onerror="this.src='https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=280'"
                   class="w-full sm:w-64 h-64 object-cover rounded-2xl shadow-lg">
              ${product.badge ? `<span class="badge ${getBadgeClass(product.badge)} absolute top-3 left-3">${product.badge}</span>` : ''}
              <span class="absolute top-3 right-3 bg-white/90 text-stone-700 text-xs font-semibold px-2 py-1 rounded-full shadow-sm">${product.volume}</span>
            </div>
            <div class="flex-1">
              <p class="text-xs text-gold-700 font-semibold uppercase tracking-widest mb-1">${product.categoryId}</p>
              <h3 class="font-serif text-2xl font-bold text-stone-900 mb-3">${product.name}</h3>
              <div class="flex items-center gap-2 mb-3">
                <div class="flex gap-0.5">${renderStarsPerfume(product.rating)}</div>
                <span class="text-sm text-stone-400">${product.rating}/5 · ${product.reviewCount} avis</span>
              </div>
              <p class="text-stone-500 text-sm leading-relaxed mb-4">${product.description}</p>
              <div class="flex items-baseline gap-3 mb-5">
                <span class="text-3xl font-bold price-main">${formatPriceMad(product.price)}</span>
                ${product.compareAtPrice ? `
                  <span class="price-strike text-lg">${formatPriceMad(product.compareAtPrice)}</span>
                  <span class="badge badge-sale">-${discount}%</span>` : ''}
              </div>
              <div class="flex gap-3">
                <button onclick="addPerfumeToCart('${product.id}'); closePerfumeModal()"
                        class="flex-1 py-3 rounded-xl font-bold text-white text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg flex items-center justify-center gap-2"
                        style="background:linear-gradient(135deg,#b45309,#78350f);">
                  <i class="fas fa-shopping-bag"></i> Ajouter au panier
                </button>
                <button onclick="closePerfumeModal()"
                        class="px-4 py-3 border-2 border-stone-200 rounded-xl text-stone-400 hover:border-red-200 hover:text-red-400 transition-all">
                  <i class="fas fa-heart"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Olfactive Pyramid -->
          <div class="bg-amber-50 rounded-2xl p-5 mb-6 border border-amber-100">
            <h4 class="font-semibold text-stone-800 mb-4 flex items-center gap-2 text-sm">
              <i class="fas fa-leaf text-gold-700"></i> Pyramide Olfactive
            </h4>
            <div class="grid grid-cols-3 gap-4">
              ${[
                {label:'Notes de Tête',  notes:product.notes.top,   color:'text-amber-700',  dot:'bg-amber-400'},
                {label:'Notes de Cœur', notes:product.notes.heart, color:'text-rose-600',   dot:'bg-rose-400'},
                {label:'Notes de Fond', notes:product.notes.base,  color:'text-stone-600',  dot:'bg-stone-400'},
              ].map(tier => `
                <div>
                  <p class="text-xs font-bold uppercase tracking-wider ${tier.color} mb-2">${tier.label}</p>
                  <ul class="space-y-1">
                    ${tier.notes.map(n => `
                      <li class="text-xs text-stone-600 flex items-center gap-1.5">
                        <span class="w-1.5 h-1.5 ${tier.dot} rounded-full flex-shrink-0"></span>${n}
                      </li>`).join('')}
                  </ul>
                </div>`).join('')}
            </div>
          </div>

          <!-- Similar products -->
          ${similar.length > 0 ? `
            <div>
              <h4 class="font-semibold text-stone-800 mb-4 text-sm flex items-center gap-2">
                <i class="fas fa-spray-can text-gold-700"></i> Dans la même collection
              </h4>
              <div class="grid grid-cols-3 gap-3">
                ${similar.map(s => `
                  <div class="bg-stone-50 rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-all group border border-stone-100 hover:border-amber-200"
                       onclick="closePerfumeModal(); setTimeout(()=>openPerfumeModal('${s.id}'),150)">
                    <div class="relative overflow-hidden" style="padding-top:100%;">
                      <img src="${s.imageUrl}" alt="${s.name}"
                           onerror="this.src='https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=120'"
                           class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    </div>
                    <div class="p-2.5">
                      <p class="text-xs font-semibold text-stone-800 truncate">${s.name}</p>
                      <p class="text-xs price-main font-bold mt-0.5">${formatPriceMad(s.price)}</p>
                    </div>
                  </div>`).join('')}
              </div>
            </div>` : ''}
        </div>
      </div>
    </div>`;
}

// ─── OPEN / CLOSE MODAL ──────────────────────────────────────
async function openPerfumeModal(productId) {
  try {
    const res = await fetch(`/api/perfumes/products/${productId}`).then(r => r.json());
    if (!res.success) { showToast('Produit non trouvé', 'error'); return; }
    document.getElementById('perfumeModal')?.remove();
    document.body.insertAdjacentHTML('beforeend', PerfumeProductModal(res.data));
    document.body.style.overflow = 'hidden';
  } catch (e) {
    console.error('Erreur modal:', e);
    showToast('Erreur lors du chargement', 'error');
  }
}

function closePerfumeModal() {
  document.getElementById('perfumeModal')?.remove();
  document.body.style.overflow = '';
}

// ─── ADD TO CART ──────────────────────────────────────────────
async function addPerfumeToCart(productId) {
  if (!Store.isAuthenticated()) {
    showToast('Connectez-vous pour ajouter au panier', 'info');
    navigate('login');
    return;
  }
  showToast('🌸 Parfum ajouté au panier avec succès !', 'success');
}

// ─── KEYBOARD ESCAPE ─────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closePerfumeModal();
});

// ─── REGISTER ROUTE ──────────────────────────────────────────
if (typeof routes !== 'undefined') {
  routes.parfums = renderParfums;
}
window._parfumsLoaded = true;
