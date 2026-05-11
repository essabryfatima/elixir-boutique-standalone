# Élixir Boutique — Beauté de Luxe v4.0

## Vue d'ensemble
Site e-commerce de beauté de luxe marocain avec palette brune premium.

## 🎨 Identité Visuelle
- **Primary**: `#6B3F2A` (brun luxe)
- **Primary Dark**: `#5C3317` 
- **Accent**: `#D4A96A` (or chaud)
- **Background**: `#FAF7F4`
- **Text**: `#2C1A0E`
- Logo: gem icon avec palette brune, partout (navbar, footer, modal)

## ✅ Fonctionnalités Implémentées

### 🔐 Authentification
- Signup avec validation en temps réel (force mot de passe, email)
- Login avec "Mot de passe oublié" (modal dédié)
- Modal d'inscription obligatoire à la première visite
- Session persistence (localStorage)
- Bouton logout partout
- Routes privées protégées

### 🛒 Panier & Checkout
- Panier latéral avec animation
- **Checkout en 5 étapes** (Panier → Infos → Livraison → Résumé → Paiement)
- Stepper visible avec états actif/complété/à faire
- Total affiché à chaque étape
- Validation empêche progression sans champs requis
- 3 méthodes de paiement: carte, virement, paiement à livraison
- Page confirmation avec numéro commande

### ❤️ Favoris
- Bouton cœur sur chaque carte produit et page détail
- Page "Mes Favoris" accessible depuis le menu et le profil
- Persistance par compte (localStorage)
- Badge compteur sur icône cœur dans la navbar
- "Tout effacer" disponible

### 📦 Produits
- **27 produits** (9 × 3 catégories) avec SKU format REF-COS-XXXXX
- Descriptions détaillées (composition, usage, bénéfices)
- Stock indicator (En stock / Dernières unités / Épuisé)
- Catégorie & sous-catégorie affichées
- 3+ images par produit (galerie thumbnails)

### 🔍 Page Produit (style Flormar)
- Galerie interactive avec miniatures et zoom au clic
- Sélecteur de variantes (couleur/taille)
- Prix, SKU, disponibilité proéminents
- Grands boutons "Ajouter au panier" et "Ajouter aux favoris"
- Tabs: Description / Composition / Utilisation / Avis
- Avis clients avec notation
- Section produits similaires
- Fil d'Ariane

### 🎯 UI/UX
- **Responsive**: mobile (hamburger), tablette, desktop
- Hamburger animé (☰ → ✕)
- Images lazy-load
- Animations subtiles (hover, scroll reveal, fade-in)
- Toast notifications (succès/erreur/info)
- Icônes réseaux sociaux: 44×44px, fond brun, icône dorée, hover inverse

## 🛣️ Routes
- `/` → Home
- `#home` → Page d'accueil avec hero vidéo
- `#catalogue` → Catalogue beauté (Maquillage, Skincare, Accessoires)
- `#parfums` → Collection parfums
- `#product` → Détail produit
- `#cart` → Panier (sidebar)
- `#checkout` → Checkout 5 étapes
- `#favorites` → Mes Favoris *(protégé)*
- `#wishlist` → Liste de souhaits *(protégé)*
- `#orders` → Mes commandes *(protégé)*
- `#profile` → Mon profil *(protégé)*
- `#login` → Connexion
- `#register` → Inscription
- `#contact` → Contact
- `#admin` → Dashboard admin *(admin seulement)*

## 📁 Structure
```
webapp/
├── src/
│   ├── index.tsx          # Hono app + HTML template
│   └── routes/            # API routes
├── public/
│   └── static/
│       ├── app.js         # Frontend JS (3200+ lignes)
│       └── style.css      # CSS variables + styles
├── dist/                  # Build output
└── ecosystem.config.cjs   # PM2 config
```

## 🚀 Commandes
```bash
# Développement
npm run build
pm2 start ecosystem.config.cjs
# Ou: node backend/server.js (port 3001)

# Production
npm run build
wrangler pages deploy dist

# Logs
pm2 logs shopwave --nostream
```

## 🌐 URLs
- **API Health**: /api/health

## 🔑 Comptes de démo
- **Admin**: admin@boutique.com / admin123
- **User**: alice@example.com / user123

## 📊 Données
- 27 produits beauté (SKUs REF-COS-00001 à REF-COS-00209)
- 3 catégories: Maquillage, Skincare, Accessoires
- Images Pexels (IDs uniques, sans doublons)
- Avis clients marocains authentiques

## 📅 Dernière mise à jour
31 mars 2026 — Version 4.0 (Brown & White rebrand + full features)
