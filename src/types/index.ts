// ============================================================
// TYPES & INTERFACES - Application E-commerce
// ============================================================

export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  avatar?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  sku: string;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  categoryId: string;
  images: ProductImage[];
  rating: number;
  reviewCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string;
  isPrimary: boolean;
  displayOrder: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId?: string;
  imageUrl?: string;
  displayOrder: number;
  productCount?: number;
}

export interface CartItem {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  priceAtTime: number;
  addedAt: string;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  updatedAt: string;
}

export interface Order {
  id: string;
  userId: string;
  orderNumber: string;
  status: 'pending' | 'processing' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: string;
  paymentIntentId?: string;
  items: OrderItem[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productSku: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Address {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  comment: string;
  isVerifiedPurchase: boolean;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  product?: Product;
  addedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  minOrderAmount?: number;
  maxUses?: number;
  usedCount: number;
  isActive: boolean;
  expiresAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'order_confirmed' | 'order_shipped' | 'order_delivered' | 'price_drop' | 'back_in_stock';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Analytics {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalUsers: number;
  revenueChange: number;
  ordersChange: number;
  recentOrders: Order[];
  topProducts: { product: Product; sales: number; revenue: number }[];
  salesByDay: { date: string; revenue: number; orders: number }[];
  salesByCategory: { category: string; revenue: number; percentage: number }[];
  ordersByStatus: { status: string; count: number }[];
}

// DTO Types
export interface RegisterDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface ProductDTO {
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  sku: string;
  stock: number;
  categoryId: string;
  isActive?: boolean;
  isFeatured?: boolean;
  tags?: string[];
  images?: string[];
}

export interface OrderDTO {
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: string;
  notes?: string;
  couponCode?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// JWT Payload
export interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}
